---
title: 'JWT 是什麼？Token 放哪裡、過期了怎麼換'
author: Opshell
createdAt: '2024-08-27'
categories:
  - Web Application
tags:
  - Web Application
  - JWT
  - Authentication
  - Axios
editLink: true
isPublished: false
image: ''
description: 'JWT 的結構與它不能做什麼、Access Token 和 Refresh Token 該放哪裡，以及「過期了才拿 Refresh Token 換」這個流程用 Axios 攔截器怎麼寫。'
keywords: ''
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的參考連結與 Refresh Token 流程筆記寫成全文，攔截器範例是新寫的。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
認證系列的第二篇。[上一篇](./01-session-cookie)講的是 `Session` + `Cookie`，狀態存在伺服器；這篇換成 `JWT`，狀態存在 token 本身。前後端分離之後幾乎每個專案都會碰到它，而最常吵的永遠是那兩題：token 到底放哪裡？過期了要怎麼換？
:::

## 懶人包
- `JWT` 是一張「有簽名的通行證」：內容任何人都看得到，但改了簽名就對不上，所以**不要放機密資料**。
- `JWT` 發出去就收不回來，所以 Access Token 要短命，再搭配長命的 Refresh Token 續命。
- Access Token 放記憶體、Refresh Token 放 `HttpOnly` Cookie，是目前比較平衡的做法。
- Refresh Token **只在 Access Token 過期時才拿出來用**，不要每支請求都帶著它跑。
- 前端用一個攔截器統一處理：收到過期 → 換新 token → 重送原本的請求，同時過期的多支請求只換一次。

## 技術拆解

### JWT 長什麼樣子
`JWT`（JSON Web Token）是三段用 `.` 串起來的字串：

```text
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI3Iiwicm9sZSI6InVzZXIiLCJleHAiOjE3OTk5OTk5OTl9.簽名
└──── Header ────┘ └──────────────── Payload ─────────────────┘ └ Signature ┘
```

- **Header**：用什麼演算法簽名。
- **Payload**：放使用者 id、角色、過期時間（`exp`）這類「聲明」。
- **Signature**：後端用密鑰把前兩段簽一次。

前兩段只是 Base64URL 編碼，**不是加密**，丟進任何一個解碼工具都看得到內容。它的安全感來自簽名：內容被改了，後端一驗簽名就知道。

用生活比喻，`JWT` 就像演唱會的手環：工作人員看一眼就知道你能不能進場（不用回去查名單，這就是「無狀態」），但手環一旦發出去，就算你被列入黑名單，手環本身還是有效的，除非等它過期。

### 為什麼需要 Refresh Token
這就是 `JWT` 最大的痛：**發出去收不回來**。
- token 效期設很長 → 被偷了，小偷可以用很久。
- token 效期設很短 → 使用者每 15 分鐘就要重新登入，會被罵到臭頭。

解法是拆成兩張票：

| | Access Token | Refresh Token |
| :--- | :--- | :--- |
| 用途 | 每支 API 都帶，證明「我是誰」 | 只用來換新的 Access Token |
| 效期 | 短（幾分鐘到一小時） | 長（幾天到幾週） |
| 後端要不要查資料庫 | 通常不用，驗簽名就好 | 要，才能做撤銷、黑名單、輪替 |

Refresh Token 因為每次使用都會經過後端查詢，所以可以做到「登出就作廢」「換一次就失效、發一張新的（Refresh Token Rotation）」，把 `JWT` 收不回來的缺點補回來。

### Token 要放哪裡

| 位置 | 被 XSS 偷走 | 被 CSRF 利用 | 重新整理後還在 |
| :--- | :---: | :---: | :---: |
| `localStorage` | 會，JS 讀得到 | 不會 | 在 |
| `sessionStorage` | 會，JS 讀得到 | 不會 | 同分頁在 |
| 記憶體（變數、Pinia） | 很難 | 不會 | 不在 |
| `HttpOnly` Cookie | 讀不到 | 會，要靠 `SameSite` 擋 | 在 |

常見的組合是：
- **Access Token 放記憶體**：XSS 很難直接偷，重新整理就不見，反正用 Refresh Token 換一張就好。
- **Refresh Token 放 `HttpOnly` + `Secure` + `SameSite=Strict` 的 Cookie**，`Path` 限定在換 token 的那支 API（例如 `/api/auth/refresh`），讓它只會出現在那一支請求裡。

::: warning
沒有一種放法是絕對安全的。XSS 一旦成功，攻擊者就算讀不到 token，也能直接用你的頁面發請求。放對位置只是降低損失，該做的輸入過濾、CSP 還是要做。
:::

### 換 Token 的流程：過期了才拿出來
這是我最常看到被搞錯的地方，兩種流程比一比：

```text
⭕ 正確：
請求 → 後端回「Access Token 過期」 → 前端拿 Refresh Token 換新的 Access Token
     → 更新 token → 重送原本的請求 → 拿到資料

❌ 不建議：
每支請求都順便帶 Refresh Token → 後端發現過期就順便發新的 Token 並給資料
```

第二種看起來省了一次來回，但 Refresh Token 變成每支請求都在網路上跑，暴露面整個放大，等於把備用鑰匙跟家門鑰匙綁在同一個鑰匙圈上。

所以前端應該有一個**專門處理 Access Token 過期**的地方：每次請求回來都先過這個判斷，看是不是回傳過期；是的話就拿 Refresh Token 去換，換回來之後更新 token，再把原本的請求送一次。

## 例子與對比

### 用 Axios 攔截器實作
```ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

interface RetryableConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const api = axios.create({ baseURL: '/api', withCredentials: true });

// Access Token 只放記憶體
let accessToken = '';
// 同時有多支請求過期時，共用同一個換 token 的請求
let refreshPromise: Promise<string> | null = null;

api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
});

async function refreshAccessToken(): Promise<string> {
    // Refresh Token 在 HttpOnly Cookie 裡，瀏覽器會自己帶，JS 碰不到
    const { data } = await axios.post<{ accessToken: string }>('/api/auth/refresh', null, {
        withCredentials: true
    });

    accessToken = data.accessToken;

    return accessToken;
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as RetryableConfig | undefined;

        // 不是過期、或已經重試過一次，就照常拋出
        if (error.response?.status !== 401 || !config || config._retry) {
            throw error;
        }

        config._retry = true;

        refreshPromise ??= refreshAccessToken().finally(() => {
            refreshPromise = null;
        });

        try {
            await refreshPromise;
        } catch (refreshError) {
            // Refresh Token 也過期了，只能請使用者重新登入
            accessToken = '';
            window.location.assign('/login');
            throw refreshError;
        }

        // 重送原本的請求，request 攔截器會幫它換上新的 token
        return api(config);
    }
);

export default api;
```

幾個重點：
1. `_retry` 旗標避免無限迴圈：重送之後還是 `401`，就不要再換了。
2. `refreshPromise` 讓同時過期的五支請求只打一次 `/auth/refresh`，其他四支等同一個結果。
3. 換 token 用的是原生 `axios` 而不是 `api`，不然換 token 的請求自己失敗又會進攔截器。
4. 這裡假設後端用 `401` 表示過期，實際的狀態碼或錯誤碼要跟後端講好。

### 延伸閱讀
- [什麼是 JWT？](https://5xcampus.com/posts/what-is-jwt)
- [Token 放 localStorage？sessionStorage？還是 Cookie？](https://israynotarray.com/information-security/20230516/18406287/)
- [token 放哪裡](https://wenku.csdn.net/answer/c5e02568044b4bd5a190d3d3e66ec6bc?ydreferer=aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS8%3D)
- [結合 JWT 與 Refresh Token 達到黑名單失效機制](https://tec.xenby.com/44-%E7%B5%90%E5%90%88-jwt-%E8%88%87-refresh-token-%E9%81%94%E5%88%B0%E9%BB%91%E5%90%8D%E5%96%AE%E5%A4%B1%E6%95%88%E6%A9%9F%E5%88%B6)
- [OAuth 2.0 筆記 (7) 安全性問題](https://blog.yorkxin.org/posts/oauth2-7-security-considerations/)
- [討論 OAuth 2 的 token 更新策略](https://editor.leonh.space/2022/oauth-token/)

## 結論
`JWT` 好用在「後端不用記住你」，難用也在「後端記不住你」。把它拆成短命的 Access Token 加上長命、放在 `HttpOnly` Cookie 裡的 Refresh Token，再讓前端只在過期的時候才去換，大部分的坑就避開了。

下一篇會接著講 `OAuth`：當「誰是你」這件事交給 Google、GitHub 來證明的時候，這兩張 token 又會怎麼出現。
