---
title: Zod 與 TS 型別管理的心智負擔
image: ''
description: ''
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
#
## 緣起

第一次接觸 Zod 大概是一年前。那時候我正痛苦於 API 型別對不上的窘境：
後端改了一個欄位，前端完全沒警告，直到畫面壞掉才知道。

當時專案中滿天飛的 any，再加上幾個「型別 = 註解」的心態，讓人 Debug 的時候心累。
直到遇到 Zod，才算找到了一個比較「心智負擔小」的做法。

## Zod 的價值

為什麼要用 Zod？
因為它同時能做「型別推導」與「執行期驗證」。這意味著前端不必被動等待後端文件，而是能自己定義出 schema，並且：

前端寫 API 時，可以直接用 schema 驗證回傳。

若網路塞車或服務掛掉，至少能知道「API 傳了什麼」。

前後端可以同時作業，減少卡死。

簡單範例：
```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  isAdmin: z.boolean().default(false),
});

// TypeScript 型別自動導出
type User = z.infer<typeof UserSchema>;

async function fetchUser(): Promise<User> {
  const res = await fetch("/api/user");
  return UserSchema.parse(await res.json());
}
```
## 心智負擔的降低

比起在腦袋裡維護一堆泛型，Zod 幫我們「把該寫死的東西寫死」，反而讓思緒更清晰。
這也是為什麼我們群裡推廣了很久，卻還是有人不上車 —— 因為一開始 Zod 確實顯得「麻煩」。
但回頭看，這麻煩其實是對「未來自己」的保護。

## 結語

在工程的世界裡，最可怕的不是 bug，而是 模糊不清的界線。
Zod 就像是一個嚴格的保母，剛開始覺得囉嗦，但後來發現，正因為他囉嗦，你才能放心把東西交給他。
