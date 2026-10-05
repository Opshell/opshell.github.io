---
title: 'OAuth 2.0 是什麼？「用 Google 登入」背後發生的事'
image: ''
description: 'OAuth 2.0 是授權不是登入：拆解 Authorization Code + PKCE 的流程、每個角色在做什麼、為什麼 Implicit Flow 被淘汰，以及 OAuth 和 OpenID Connect 的差別。'
keywords: ''
author: Opshell
createdAt: '2024-08-29'
categories:
  - Web Application
tags:
  - Web Application
  - OAuth
  - Authentication
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本是空白檔，依認證系列的脈絡從頭寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
認證系列的第三篇。[第一篇](./01-session-cookie)講 `Session` + `Cookie`，[第二篇](./02-jwt)講 `JWT` 與 Refresh Token。這篇講幾乎每個網站都有的「用 Google 登入」「用 GitHub 登入」，背後的 `OAuth 2.0` 到底在交換什麼，寫給要串第三方登入的前端。
:::

## 懶人包
- `OAuth 2.0` 是**授權**協定：讓 A 網站在你同意下，拿到存取你 B 帳號資料的權限，而且不用把 B 的密碼交給 A。
- 「用 Google 登入」其實是 `OAuth 2.0` 上面再加一層 `OpenID Connect`（OIDC），多發一張證明「你是誰」的 ID Token。
- 2026 年的標準做法是 **Authorization Code Flow + PKCE**，SPA 和 App 都一樣；Implicit Flow 已經不建議再用。
- Client Secret 不能放前端；拿到 code 之後換 token 的那一步，最好交給自己的後端做。
- `state` 參數防 CSRF、PKCE 防 code 被攔截，兩個都不要省。

## 技術拆解

### 先搞懂：授權不是登入
用飯店房卡來比喻：
- 你（**Resource Owner**）住進飯店，想讓清潔人員進房打掃。
- 你不會把自己的房卡借給他，而是請櫃檯（**Authorization Server**）發一張**只能開這間房、只能用今天**的臨時卡給清潔人員（**Client**）。
- 房間（**Resource Server**）只認卡，不管拿卡的人是誰。

這張臨時卡就是 **Access Token**，而「只能開這間房、只能用今天」就是 **scope** 和效期。`OAuth` 解決的是「怎麼安全地發這張臨時卡」，它本身並沒有規定「清潔人員是誰」，這就是為什麼後來又多了 `OpenID Connect`。

| 角色 | 「用 Google 登入」的情境 |
| :--- | :--- |
| Resource Owner | 使用者本人 |
| Client | 你的網站 |
| Authorization Server | Google 的登入、同意畫面 |
| Resource Server | Google 的 API（例如取得大頭貼、Email） |

### OAuth 2.0 vs OpenID Connect
- `OAuth 2.0`：發 **Access Token**，拿去打 API，回答「你可以做什麼」。
- `OpenID Connect`：在 `OAuth 2.0` 上加了 **ID Token**（一張 `JWT`），回答「你是誰」。

所以你在 Google 的登入設定裡看到 `scope=openid email profile`，那個 `openid` 就是在說「我要的是登入，請順便給我 ID Token」。

### Authorization Code Flow + PKCE
這是現在 Web、SPA、手機 App 都通用的流程：

```text
1. 前端產生一組隨機的 code_verifier，算出 code_challenge = SHA256(code_verifier)
2. 前端把使用者導去 Google：
   /authorize?response_type=code&client_id=...&redirect_uri=...
             &scope=openid email&state=隨機值&code_challenge=...&code_challenge_method=S256
3. 使用者在 Google 登入、按「同意」
4. Google 導回 redirect_uri?code=一次性授權碼&state=剛剛的隨機值
5. 檢查 state 一樣，拿 code + code_verifier 去 /token 換 token
6. Google 驗證 SHA256(code_verifier) === code_challenge，發 Access Token（和 ID Token）
```

兩個保險：
- **`state`**：導回來時比對，確認這次回來的是自己發出去的請求，不是別人塞給你的（防 CSRF）。
- **PKCE**：就算授權碼在導回的過程被攔截，攔截的人沒有 `code_verifier`，一樣換不到 token。

### 被淘汰的 Implicit Flow
早期 SPA 沒有後端可以保管 Client Secret，所以有一種流程是授權伺服器直接把 Access Token 放在網址的 `#` 後面丟回來。問題是 token 會留在瀏覽器歷史、可能經由 Referer 外洩，也沒辦法發 Refresh Token。有了 PKCE 之後，SPA 也能安全地走 Authorization Code Flow，Implicit Flow 就被 OAuth 2.0 的安全最佳實務列為不建議使用，草案中的 OAuth 2.1 也直接拿掉了它。

## 例子與對比

### 前端產生 PKCE 與 state
瀏覽器原生的 `crypto` 就做得到，不用裝套件：

```ts
function base64UrlEncode(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function createRandomString(length = 32): string {
    return base64UrlEncode(crypto.getRandomValues(new Uint8Array(length)));
}

async function createCodeChallenge(codeVerifier: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));

    return base64UrlEncode(new Uint8Array(digest));
}

export async function redirectToGoogleLogin(): Promise<void> {
    const codeVerifier = createRandomString();
    const state = createRandomString(16);

    // 導回來之後要用，先放 sessionStorage
    sessionStorage.setItem('pkce_verifier', codeVerifier);
    sessionStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        redirect_uri: `${location.origin}/auth/callback`,
        scope: 'openid email profile',
        state,
        code_challenge: await createCodeChallenge(codeVerifier),
        code_challenge_method: 'S256'
    });

    location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
```

導回 `/auth/callback` 之後，比對 `state`，再把 `code` 和 `code_verifier` 交給**自己的後端**去換 token。

::: tip 為什麼換 token 要交給後端
很多授權伺服器對 Web 應用還是會要求 Client Secret，而 Secret 放在前端等於公開。更重要的是，後端換到 token 之後，可以發自己系統的 Session 或 Refresh Token（放 `HttpOnly` Cookie），接回[上一篇](./02-jwt)的那套機制，Google 的 token 就不用在瀏覽器裡跑來跑去。這種「後端幫前端保管 token」的做法常被叫做 BFF（Backend for Frontend）。
:::

### 自己做帳密登入 vs 串 OAuth

| | 自己做帳號密碼 | 串 OAuth／OIDC |
| :--- | :--- | :--- |
| 密碼保管 | 自己雜湊、自己防外洩 | 不碰使用者的密碼 |
| 忘記密碼、雙因素驗證 | 自己做 | 交給 Google、GitHub |
| 註冊流程 | 表單、驗證信 | 點一下同意 |
| 依賴性 | 不依賴第三方 | 第三方改規則、掛掉，你也跟著受影響 |
| 使用者資料 | 想收什麼收什麼 | 只拿得到對方給的 scope |

## 結論
`OAuth` 的流程看起來繞，其實每一步都在防一件事：`state` 防偽造、PKCE 防攔截、授權碼只能用一次、token 有 scope 和效期。記住它是「發臨時房卡」而不是「借你鑰匙」，整個流程就順了。

至於實作細節，各家的端點與參數略有不同，請以 Google、GitHub 等官方文件為準 ~~（每家都說自己是標準，但每家都有一點點不一樣）~~。
