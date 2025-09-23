---
title: as const 與 satisfies —— 型別的微妙邊界
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
#
## 緣起

TypeScript 世界裡最微妙的體驗之一，就是 as const 與 satisfies。
兩者看似相似，但實際用起來差很多。
我們群組裡就花了一早上，才把這件事講清楚。

- as const

把值標記為 不可變 (readonly)。

推斷為最小範圍的字面量型別。

const theme = "dark" as const;
// type: "dark" (字面值)

- satisfies

檢查物件是否滿足某個型別，但保留原始推斷。

type Config = { theme: "light" | "dark"; size: "small" | "large" };

const config = {
  theme: "dark",
  size: "large",
  extra: "value",
} satisfies Config; // ✅ 不會報錯


與強制指定的差異：

const config1: Config = {
  theme: "dark",
  size: "large",
  extra: "value", // ❌ 報錯
};

- as const satisfies

當兩者結合時，就能既保留字面量，又能滿足約束：

const config = {
  theme: "dark",
  size: "large",
} as const satisfies Config;


這招甚至可以避免函式呼叫時的推斷錯誤：

function onlyDark(t: "dark") {}
onlyDark(config.theme); // ✅ 正常

## Record 的補充

有些情況下 satisfies 還會觸發 excess property checking。
Astolfo 的修正做法是：

const config2 = {
  theme: "dark",
  size: "large",
  extra: "value",
} satisfies (Config & Record<string, unknown>);


代表型別本身允許額外屬性，但仍保有檢查能力。

## 結語

TypeScript 給了我們很多工具，讓我們在「靈活」與「嚴格」之間找平衡。
as const 與 satisfies 就是這條平衡線上的兩個端點。
懂得何時該「鎖死」，何時該「寬容」，這就是工程師的日常哲學。
