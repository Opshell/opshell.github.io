---
title: '關於 RESTful API 的那些事：資源、動詞與狀態碼'
image: ''
description: 'RESTful 不是「網址長得好看」而已：用名詞表示資源、用 HTTP 方法表示動作、用狀態碼表示結果。整理設計原則、冪等性，以及前端最常踩到的幾個反模式。'
keywords: ''
author: Opshell
createdAt: '2025-02-12'
categories:
  - Web Application
tags:
  - RESTful API
  - API
  - HTTP
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有標題「關於 RESTful API 的那些事」，從頭寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
幾乎每個專案都說自己的 API 是 `RESTful`，但實際打開一看，常見的是 `POST /api/getUserList`、`POST /api/deleteUser`，錯誤一律回 `200` 再塞 `status: false`。這篇寫給天天在串 API 的前端（還有幫忙開 API 的後端），把 `REST` 的幾個核心約定講清楚，下次跟後端討論規格的時候，大家有同一套詞彙。
:::

## 懶人包
- `REST` 的核心是「資源」：網址用**名詞**表示東西，動作交給 HTTP 方法（`GET`、`POST`、`PUT`、`PATCH`、`DELETE`）。
- 同一個網址搭配不同方法就是不同操作，所以「一支 API 吃所有 method」本來就是 `REST` 的正常做法。
- 結果用 HTTP 狀態碼表達，不要全部回 `200` 再自己包一層 `status`。
- 搞懂「冪等」：`GET`、`PUT`、`DELETE` 打幾次結果都一樣，`POST` 不是，重送機制要看這個。
- `REST` 是風格不是法律，團隊有共識、文件寫清楚，比追求百分之百純正重要。

## 技術拆解

### REST 是什麼
`REST`（Representational State Transfer）是 Roy Fielding 在 2000 年的博士論文提出的一種**架構風格**，不是協定、也不是套件。符合這個風格的 API，就叫 `RESTful API`。

用點餐來比喻：餐廳裡的每一道菜都是一個「資源」，菜單上的編號就是網址；你要「看」、「點」、「換」、「退」哪道菜，用的是固定幾種動作（HTTP 方法），店員回你的結果也有固定的說法（狀態碼）。不會有人走進餐廳說「我要執行取得牛肉麵的動作」，對吧？

### 原則一：網址是名詞，代表資源
```text
GET    /api/users          取得使用者列表
GET    /api/users/7        取得 id 為 7 的使用者
POST   /api/users          新增一個使用者
PUT    /api/users/7        整筆取代 id 為 7 的使用者
PATCH  /api/users/7        修改 id 為 7 的部分欄位
DELETE /api/users/7        刪除 id 為 7 的使用者
GET    /api/users/7/orders 取得 id 為 7 的使用者的訂單
```

幾個常見約定：
- 集合用**複數**（`/users`），單筆用 `/users/{id}`。
- 關聯資源用巢狀表示（`/users/7/orders`），但巢狀不要超過兩層，不然網址會長到像繞口令。
- 篩選、排序、分頁放 query string：`/api/users?role=admin&sort=-createdAt&page=2`。
- 網址用小寫加連字號（`/order-items`），不要混大小寫。

### 原則二：動作交給 HTTP 方法

| 方法 | 用途 | 安全（不改資料） | 冪等 |
| :--- | :--- | :---: | :---: |
| `GET` | 讀取 | ✓ | ✓ |
| `POST` | 新增、或不屬於其他方法的動作 | ✗ | ✗ |
| `PUT` | 整筆取代 | ✗ | ✓ |
| `PATCH` | 部分修改 | ✗ | 不保證 |
| `DELETE` | 刪除 | ✗ | ✓ |

**冪等（idempotent）** 的意思是：同一個請求打一次跟打十次，伺服器上的結果一樣。`DELETE /users/7` 打十次，7 號還是只被刪掉一次；`POST /users` 打十次，就多了十個使用者。

這跟前端很有關係：網路斷線、使用者狂點按鈕時，冪等的請求可以放心重送，不冪等的就要做防連點、或請後端支援 idempotency key。

### 原則三：結果用狀態碼說話

| 狀態碼 | 意思 | 常見情境 |
| :--- | :--- | :--- |
| `200 OK` | 成功 | 一般讀取、修改成功 |
| `201 Created` | 新增成功 | `POST` 建立資源，可以順便回傳新資料或 `Location` |
| `204 No Content` | 成功但沒有內容 | `DELETE` 成功 |
| `400 Bad Request` | 請求格式錯 | 少欄位、型別不對 |
| `401 Unauthorized` | 沒登入／token 失效 | 前端導去登入、或用 refresh token 換新的 |
| `403 Forbidden` | 有登入但沒權限 | 一般使用者想進後台 |
| `404 Not Found` | 資源不存在 | 查不到這筆 |
| `409 Conflict` | 狀態衝突 | 帳號重複、資料已被別人改過 |
| `422 Unprocessable Content` | 格式對但驗證沒過 | 表單驗證錯誤（Laravel 的預設就是這個） |
| `500 Internal Server Error` | 後端炸了 | ~~不是我的錯~~ 前端顯示通用錯誤訊息 |

### 原則四：無狀態
每個請求都要帶齊伺服器需要的資訊（例如 `Authorization` header），伺服器不靠「上一個請求」記住你是誰。這也是為什麼 token、cookie 這些認證機制，每一次請求都要帶。

## 例子與對比

### 動詞塞在網址裡 vs 交給 HTTP 方法
```text
❌ 動詞網址                       ✅ RESTful
POST /api/getUserList            GET    /api/users
POST /api/getUserDetail?id=7     GET    /api/users/7
POST /api/createUser             POST   /api/users
POST /api/updateUser             PATCH  /api/users/7
POST /api/deleteUser             DELETE /api/users/7
```

左邊全部都是 `POST`，瀏覽器跟 CDN 沒辦法快取任何讀取請求，看 log 也分不出誰在讀、誰在寫。

### 錯誤全部回 200 vs 用狀態碼
```ts
// ❌ 永遠 200，前端要自己拆
const res = await fetch('/api/users/7').then((response) => response.json());
if (!res.status) {
    // 到底是找不到？沒權限？還是後端炸了？只能看 message 猜
    showError(res.message);
}

// ✅ 用狀態碼分流
const response = await fetch('/api/users/7');

if (response.status === 401) {
    redirectToLogin();
} else if (response.status === 404) {
    showError('這個使用者不存在');
} else if (!response.ok) {
    showError('伺服器忙線中，請稍後再試');
} else {
    const user = await response.json();
    renderUser(user);
}
```

狀態碼分好，前端的攔截器就能統一處理 `401`、`403`、`500`，元件裡只需要管「成功時要做什麼」。

### 不是每個動作都長得像 CRUD
「寄送驗證信」、「結帳」、「把訂單標記為已出貨」這類動作，硬塞進 `PUT`、`PATCH` 會很彆扭。常見的折衷是把動作也當成一種資源：

```text
POST /api/users/7/verification-emails   寄一封驗證信
POST /api/orders/42/shipments           幫訂單建立一筆出貨
```

這不是犯規，`REST` 本來就允許這樣表達。

## 結論
`RESTful` 說穿了就三句話：網址是名詞、方法是動詞、狀態碼是結果。剩下的複數單數、巢狀幾層、分頁參數叫什麼，都是團隊之間的約定。

規則可以有彈性，但請不要讓所有 API 都是 `POST` 加 `200`，那就像餐廳的每一道菜都叫「餐點」，每一種結果都回「好的」，點餐的人會很想哭的。
