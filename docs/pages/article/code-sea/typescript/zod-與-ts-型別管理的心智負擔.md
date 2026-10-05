---
title: Zod 與 TS 型別管理的心智負擔
image: ''
description: 'TypeScript 只管編譯期，API 回來的資料它管不到。Zod 一份 schema 同時給你型別推導與執行期驗證，前端不用被動等後端文件；代價是一開始比較麻煩，換到的是少在腦袋裡維護一堆泛型。'
keywords: ''
author: Opshell
createdAt: '2025-08-21'
categories:
  - TypeScript
tags:
  - TypeScript
  - Zod
  - 型別管理
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：保留原本的緣起、價值與結語，補上懶人包、safeParse 的用法、Zod 與泛型的分工、對照表，範例以 Zod 4 實際跑過。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
這篇是「型別管理」系列的一篇，跟 [any、unknown 與 TS 工程師的掙扎](./any-unknown-與-ts-工程師的掙扎)、[as const 與 satisfies](./as-const-與-satisfies-型別的微妙邊界) 來自同一場群組討論。那天的起點是有人問：前後端資料格式老是對不上，型別到底要怎麼管才不累？群組裡給的答案很一致：善用 `Zod` 去管理你的 type，這樣心智負擔最小。
:::

## 懶人包
- `TypeScript` 的型別只活在編譯期，API 回來的東西長怎樣，它其實不知道，只能相信你。
- `Zod` 用一份 schema 同時做「型別推導」與「執行期驗證」，型別和檢查不會各寫一份然後漸漸對不上。
- 前端可以自己定義 schema，不用被動等後端文件；後端改了欄位，在進門的那一刻就會被抓到，不是等畫面壞掉。
- 業務邏輯用 schema 把資料形狀寫死，泛型留給底層元件；腦袋裡要記的東西少很多。
- 一開始確實比較麻煩，但這麻煩其實是對「未來自己」的保護。

## 觀點拆解

### 緣起
第一次接觸 `Zod` 大概是一年前。那時候我正痛苦於 API 型別對不上的窘境：後端改了一個欄位，前端完全沒警告，直到畫面壞掉才知道。

當時專案中滿天飛的 `any`，再加上幾個「型別 = 註解」的心態，讓人 Debug 的時候心累。直到遇到 `Zod`，才算找到了一個比較「心智負擔小」的做法。

### TypeScript 管不到的那一段
先講清楚問題在哪。下面這段程式碼，`TypeScript` 一點意見都沒有：

```ts
interface User {
    id: number;
    name: string;
}

const res = await fetch('/api/user');
const user: User = await res.json(); // res.json() 是 any，想標什麼都可以
```

`user` 被標成 `User`，但那只是你說的。後端如果回了 `{ id: '1', userName: 'Opshell' }`，`TypeScript` 照樣放行，錯誤會在某個 `user.name.trim()` 爆出來，離真正的原因十萬八千里。

型別標註像是在門口貼一張「本店只收新台幣」，但沒有派人站櫃台。`Zod` 就是那個站櫃台的人。

### Zod 的價值
為什麼要用 `Zod`？因為它同時能做「型別推導」與「執行期驗證」。這意味著前端不必被動等待後端文件，而是能自己定義出 schema，並且：

- 前端寫 API 時，可以直接用 schema 驗證回傳。
- 若網路塞車或服務掛掉，至少能知道「API 傳了什麼」。
- 前後端可以同時作業，減少卡死。

簡單範例：

```ts
import { z } from 'zod';

const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    isAdmin: z.boolean().default(false)
});

// TypeScript 型別自動導出
type User = z.infer<typeof UserSchema>;

async function fetchUser(): Promise<User> {
    const res = await fetch('/api/user');
    return UserSchema.parse(await res.json());
}
```

`User` 型別是從 schema 推導出來的，schema 改了，型別跟著改，不會有「型別寫一份、驗證寫一份，三個月後兩份對不上」的問題。`parse` 不通過會直接丟錯，錯誤就停在資料進門的地方。

不想丟錯、想自己決定怎麼處理的話，用 `safeParse`：

```ts
async function fetchUserSafe(): Promise<User | null> {
    const res = await fetch('/api/user');
    const result = UserSchema.safeParse(await res.json());

    if (!result.success) {
        console.error(z.prettifyError(result.error));
        return null;
    }
    return result.data;
}
```

後端如果把 `id` 改成字串，console 會直接告訴你：

```
✖ Invalid input: expected number, received string
  → at id
```

哪個欄位、期待什麼、收到什麼，一目了然。比起在畫面上看到 `NaN` 再一路往回追，這個訊息簡直是天使。

### 心智負擔的降低
比起在腦袋裡維護一堆泛型，`Zod` 幫我們「把該寫死的東西寫死」，反而讓思緒更清晰。

群組裡有個說法我很認同：業務邏輯上只推薦寫 `Zod`，泛型應該只使用在底層元件。每隻 API 都用 schema 訂好好的，就很少需要在業務層寫泛型；用 `Zod` 帶泛型的時候，心智負擔其實也會小很多。另一個重點是：-|把 schema 集成以後才丟出去外露|-，讓整個專案只認一個入口，不要每個頁面各自 parse。

至於外來套件，不清楚它會傳遞的格式時，一樣先當成 `unknown`，驗過才能限縮；套件有曝露 `interface` 的，就在全域層再做一次 `declare` 封裝，把我們需要但它沒有的加進去。這樣一路下來，根本不需要 `any`。

這也是為什麼我們群裡推廣了很久，卻還是有人不上車：因為一開始 `Zod` 確實顯得「麻煩」，大部分的專案就是原本長那樣，要改需要決心。但回頭看，這麻煩其實是對「未來自己」的保護。

## 例子與對比

### 三種管型別的方式

| | 手寫 `interface` | 手寫 `interface` + 型別守衛 | `Zod` schema |
| :--- | :--- | :--- | :--- |
| 編譯期型別 | 有 | 有 | 有（推導出來的） |
| 執行期檢查 | 沒有 | 有，但要自己寫 | 有 |
| 型別與檢查會不會不同步 | 沒有檢查，無從不同步 | 很容易 | 不會，同一份來源 |
| 錯誤訊息 | 爆在使用的地方 | 看你寫得多細 | 指出欄位與原因 |
| 前期成本 | 低 | 高 | 中 |

### 要注意的地方
- `Zod` 4 跟 3 的 API 有些差異，例如錯誤格式化改用 `z.prettifyError`，網路上的舊範例要看版本，以官方文件為準。
- 驗證不是免費的，資料量非常大的列表每筆都 parse 會有成本。常見的折衷是在 API 層 parse 一次，進到元件之後就相信型別。
- 想更進一步把「API 路徑、參數、回應」整個用 schema 綁起來，可以看看 `ts-rest` 這類工具，前後端共用同一份契約。

## 結論
在工程的世界裡，最可怕的不是 bug，而是模糊不清的界線。

`Zod` 就像是一個嚴格的保母，剛開始覺得囉嗦，但後來發現，正因為他囉嗦，你才能放心把東西交給他。~~至少他從來不會說「相信我」。~~
