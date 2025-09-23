---
title: any、unknown 與 TS 工程師的掙扎
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-08-21'
categories:
  - TypeScript
tags:
  - TypeScript
  - 型別管理
editLink: true
isPublished: false
---
## 緣起

any 這個型別，幾乎是所有人寫 TypeScript 的第一個捷徑。
它能讓編譯器閉嘴，能讓代碼立刻通過，甚至能救急。

但隨著專案變大，any 帶來的副作用就像癌細胞一樣蔓延：你再也不知道傳進來的是不是期望的格式，錯誤永遠出現在最遠的地方。

這時候，有些人會說：「那就用 unknown 吧！」

any vs unknown

- any：編譯器直接放棄檢查，等於沒寫。
- unknown：需要顯式檢查或斷言，才能使用。

例子：
```ts
function print(value: unknown) {
  // console.log(value.toUpperCase()); // ❌ 報錯
  if (typeof value === "string") {
    console.log(value.toUpperCase()); // ✅
  }
}
```

而 any 則會默默允許一切，直到你在 runtime 崩潰。

## AI 亂用 any

有趣的是，我們群組裡聊到，AI（包括 ChatGPT、Claude）其實也很愛亂寫 any 或 as any。
所以很多團隊直接在 linter 禁止 any，每次存檔就跑 tsc。

當然，如果真的要放寬，還是可以用 unknown 搭配驗證，例如 Zod，才算健康。

## 結語

程式裡的「不確定性」永遠存在。
問題不在於你能不能偷懶，而是 偷懶的代價 是不是你願意承擔的。
在這點上，unknown 至少逼迫你「面對現實」，而 any 只是把垃圾掃到地毯下。
