---
title: any 外更好的選擇：用泛型包 API 回應
image: ''
description: 'API 回應的 data 寫成 any 最省事，也最容易出事。把回應介面改成泛型 iResult<T>，呼叫端說清楚 data 長什麼樣；預設值給 unknown 而不是 any，忘了指定的人會被編譯器提醒。'
keywords: ''
author: Opshell
createdAt: '2024-09-26'
categories:
  - TypeScript
tags:
  - TypeScript
  - 泛型
  - API
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的兩段介面與 AI 的說明寫成全文，修正 `data: T | Record<string, any>` 讓泛型失效的問題，補上預設 `unknown` 與呼叫端用法。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
幾乎每個專案都有一個「API 回應長這樣」的共用介面：`status`、`msg`、`data`，有分頁的再加個 `paginator`。常見的情況是 `data` 直接寫 `any`，因為每支 API 回來的東西都不一樣。這篇寫給已經會寫 `interface`、但還在用 `any` 收尾的人：同一個介面，加一個泛型就能讓每支 API 各自有型別。
:::

## 懶人包
- `data: any` 等於告訴編譯器「這裡你不用管」，型別檢查在最需要它的地方斷掉。
- 把介面改成泛型 `iResult<T>`，呼叫 API 的時候指定 `data` 的型別，提示和檢查就都回來了。
- 不要寫 `data: T | Record<string, any>`，聯集裡混一個 `any` 的成員，泛型等於白加。
- 泛型的預設值給 `unknown` 比 `any` 安全：忘了指定的人會被逼著先檢查再使用。

## 技術拆解

### 起點：data 是 any
```ts
export interface iResult {
    status: boolean
    msg: string
    data: any
    paginator?: iPaginator
}
```

這個介面的 `status`、`msg` 都很清楚，偏偏最重要的 `data` 是 `any`。拿到回應後打 `res.data.` 不會有任何提示，`res.data.usrName` 這種錯字也會安靜通過，一路錯到畫面上顯示 `undefined` 才被發現。

`any` 就像一張萬用通行證，拿著它哪裡都能進，但保全也從此不認得你是誰。

### 第一步：加上泛型
接著改成這樣：

```ts
export interface iResult<T = any> {
    status: boolean
    msg: string
    data: T | Record<string, any>
    paginator?: iPaginator
}
```

逐個欄位來看：

1. **泛型 `T`**：`T = any` 表示 `iResult` 是一個泛型介面，預設型別為 `any`。使用這個介面時可以指定 `data` 的具體型別，例如 `iResult<number>` 表示 `data` 是一個數字。
2. **`status: boolean`**：布林值，表示操作是否成功。
3. **`msg: string`**：字串，存放訊息，通常是錯誤訊息或成功訊息。
4. **`data: T | Record<string, any>`**：可以是你指定的 `T`，或是一個鍵是字串、值是任何型別的物件。
5. **`paginator?: iPaginator`**：可選屬性，有分頁時才會出現。

`iPaginator` 介面則是分頁資訊：

```ts
export interface iPaginator {
    current_page: number // 目前的頁碼
    total: number // 總資料筆數
    per_page: number // 每頁顯示的資料筆數
    last_page: number // 最後一頁的頁碼
}
```

這些型別宣告的目的，是在 `TypeScript` 中提供更強的型別檢查和自動補全。`iResult` 讓你靈活地定義 `data` 的型別，同時也能帶著分頁資訊，程式碼的可讀性和可維護性都會更好。

### 第二步：把聯集拿掉
第一步有個藏得很深的問題：`data: T | Record<string, any>`。

就算你寫了 `iResult<iUser>`，`data` 的型別還是 `iUser | Record<string, any>`。後面那個成員什麼屬性都接受，`TypeScript` 沒辦法確定你拿到的是 `iUser`，要用 `data.name` 之前還得先自己縮小型別，-|泛型加了，卻沒有真的換到型別安全|-。

「`data` 有時候是空物件」這種情況，應該由呼叫端在 `T` 裡說清楚，而不是在共用介面裡開一個後門：

```ts
export interface iResult<T = unknown> {
    status: boolean
    msg: string
    data: T
    paginator?: iPaginator
}
```

### 第三步：預設值用 unknown
`T = any` 的意思是「沒指定就當 `any`」，等於忘記寫泛型的人又回到了起點，而且編譯器不會提醒他。

改成 `T = unknown` 之後，沒指定型別的人拿到的是 `unknown`，不先檢查就不能用。這不是故意刁難，而是把「你忘了告訴我這是什麼」從執行期的 bug，提早成編輯器裡的紅色蚯蚓。`any` 跟 `unknown` 的差別，在 [any、unknown 與 TS 工程師的掙扎](./any-unknown-與-ts-工程師的掙扎) 有更完整的比較。

## 例子與對比

### 在請求函式裡用
```ts
interface iUser {
    id: number
    name: string
}

async function request<T>(url: string): Promise<iResult<T>> {
    const res = await fetch(url);
    return res.json() as Promise<iResult<T>>;
}

const userRes = await request<iUser[]>('/api/users');
userRes.data.forEach((user) => {
    console.log(user.name); // 有提示，打錯字會報錯
});

const unknownRes = await request('/api/whatever');
unknownRes.data.name; // 報錯：'unknownRes.data' is of type 'unknown'
```

### 三種寫法比一比

| 寫法 | 指定了 `T` 的時候 | 沒指定的時候 |
| :--- | :--- | :--- |
| `data: any` | 沒得指定 | 什麼都放行 |
| `data: T \| Record<string, any>`，`T = any` | 還是要自己縮小型別 | 什麼都放行 |
| `data: T`，`T = unknown` | 型別完整 | 逼你先檢查 |

::: tip
`res.json() as Promise<iResult<T>>` 只是你跟編譯器說「相信我」，並沒有真的檢查後端回了什麼。想連執行期一起把關，可以再往前一步，用 `Zod` 之類的 schema 驗證回應，見 [Zod 與 TS 型別管理的心智負擔](./zod-與-ts-型別管理的心智負擔)。
:::

## 結論
`any` 不是不能用，而是它太好用了，好用到你會忘記自己用過。共用的回應介面是整個專案的入口，入口寫 `any`，後面每一頁都在裸奔。

加一個泛型、預設值換成 `unknown`，成本是每支 API 多寫幾個字，換到的是每一個 `.` 後面都有人幫你看著。~~這筆交易怎麼看都划算，除非你喜歡半夜被叫起來查 `undefined`。~~
