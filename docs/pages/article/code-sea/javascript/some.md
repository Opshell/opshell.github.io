---
title: 檢索陣列的那些方式
author: Opshell
createdAt: '2025-01-24'
categories:
  - 使用實例
tags:
  - javascript
  - array
editLink: true
isPublished: false
refer:
  - null
image: ''
description: '陣列裡「有沒有」「是不是全部」「是哪一個」「在第幾個」，各有一個最適合的方法。從 some 出發，整理 every、find、findIndex、findLast、includes、filter 的差別與選法。'
keywords: ''
---
::: warning 草稿
Claude 於 2026-10-05 補完：從原本 some 的段落延伸，補完 forEach 對照與其他檢索方法的比較。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
常見的情況是：要檢查列表裡有沒有任何一筆是關閉的，第一個想到的是 `forEach` 加一個旗標變數，寫完一看，五六行只為了回答一個「有或沒有」。

JavaScript 的陣列其實內建了一整排「找東西」的方法，每個回答的問題都不一樣。這篇從 `some` 開始，把它們排在一起比較，寫給還在用 `forEach` 找東西的人。
:::

## 懶人包
- 問「**有沒有**任何一個符合」用 `some`，問「**是不是全部**都符合」用 `every`，都回傳布林，而且找到答案就提早收工。
- 要拿到「**那一個**元素」用 `find`，要「**它在第幾個**」用 `findIndex`；從後面找用 `findLast`／`findLastIndex`。
- 只是比對某個值在不在，用 `includes`，它連 `NaN` 都找得到。
- 要「**所有**符合的」才用 `filter`，它一定跑完整個陣列。
- 用 `forEach` 找東西要自己開旗標、又停不下來，大部分情況都有更好的選擇。

## 技術拆解

### Some
`Some` 是不常用但是用起來超級方便的好東西，最常用的地方就是拿來檢查陣列中是否有符合條件的項目，有的話就直接回傳 `true` 否則回傳 `false`。
來個範例：

```ts
// 檢查是否有任何物件是關閉的狀態，有的話就回傳 true
function checkHasClose() {
    return list.value.some((item) => {
        return !item.isOpen || item.child.some((child) => !child.isOpen);
    });
}
```

`some` 還有一個隱藏優點：-|只要找到一個符合的，就立刻停下來|-，後面的元素不會再跑。用點名比喻：老師問「有沒有人沒帶課本？」，第一個人舉手就有答案了，不用全班問完。

### 如果要達成同樣的效果，用 forEach 會是這樣
```ts
function checkHasClose() {
    let hasClose = false;

    list.value.forEach((item) => {
        if (hasClose) { return; } // forEach 停不下來，只能每一圈自己跳過

        if (!item.isOpen) {
            hasClose = true;
            return;
        }

        item.child.forEach((child) => {
            if (!child.isOpen) {
                hasClose = true;
            }
        });
    });

    return hasClose;
}
```

要多一個旗標變數、要自己判斷提早跳過，而且 `forEach` 沒有 `break`，就算第一筆就找到了，迴圈還是會把整個陣列走完（只是每一圈都 `return` 掉）。同樣的邏輯，`some` 一行就說完了。

### every：some 的好兄弟
`every` 問的是「是不是**全部**都符合」，遇到第一個不符合的就停，回傳 `false`。兩個可以互換：

```ts
// 「有任何一個關閉」等於「不是全部都開著」
const hasClose = list.value.some((item) => !item.isOpen);
const allOpen = list.value.every((item) => item.isOpen);
// hasClose === !allOpen
```

注意空陣列：`[].some(...)` 是 `false`，`[].every(...)` 是 `true`（沒有人違反規則，所以「全部都符合」成立）。拿 `every` 判斷「全部勾選了沒」的時候，記得先檢查陣列是不是空的。

### find 與 findIndex：要拿到那一個
```ts
const firstClosed = list.value.find((item) => !item.isOpen);         // 元素本身，找不到是 undefined
const firstClosedIndex = list.value.findIndex((item) => !item.isOpen); // 索引，找不到是 -1
```

想從後面往前找（例如最新的一筆在陣列尾巴），用 `findLast`／`findLastIndex`，不用先 `reverse()`，也不會動到原陣列。

### includes 與 indexOf：比對值
只是想知道「某個值在不在裡面」，不用寫 callback：

```ts
const tags = ['vue', 'ts', 'vite'];

tags.includes('vue');    // true
tags.indexOf('vite');    // 2

[NaN].includes(NaN);     // true
[NaN].indexOf(NaN);      // -1，indexOf 用 === 比，NaN 不等於自己
```

要注意的是它們用的是值比對，物件要同一個參考才算找到。陣列很大、又要查很多次的時候，轉成 `Set` 用 `has` 會快很多。

### filter：要全部
`filter` 回傳所有符合的元素組成的新陣列，**一定會跑完整個陣列**。拿它來判斷有沒有，寫成 `list.filter(...).length > 0`，等於為了問一個人有沒有帶課本，把全班沒帶的都叫起來站好，有點殘忍。

## 例子與對比

| 想問的問題 | 方法 | 回傳 | 找到就停 |
|---|---|---|---|
| 有沒有任何一個符合？ | `some` | `boolean` | 是 |
| 是不是全部都符合？ | `every` | `boolean` | 是（遇到不符合就停） |
| 第一個符合的是誰？ | `find` | 元素或 `undefined` | 是 |
| 第一個符合的在第幾個？ | `findIndex` | 索引或 `-1` | 是 |
| 從後面找第一個？ | `findLast`／`findLastIndex` | 元素／索引 | 是 |
| 這個值在不在？ | `includes` | `boolean` | 是 |
| 這個值在第幾個？ | `indexOf`／`lastIndexOf` | 索引或 `-1` | 是 |
| 所有符合的有哪些？ | `filter` | 新陣列 | 否 |

### 選法口訣
1. 要布林 → `some`／`every`／`includes`。
2. 要元素 → `find`／`findLast`。
3. 要位置 → `findIndex`／`indexOf`。
4. 要很多個 → `filter`。
5. 都不是，真的要對每個元素做事 → 這時候才輪到 `forEach` 或 `for...of`。

## 結論
陣列的檢索方法不是越多越難記，而是每個都剛好回答一個問題。先想清楚自己要的是「有沒有」「是誰」「在哪」還是「全部」，方法就自己跳出來了。

`some` 這種不常用但超方便的好東西，用過一次就回不去了，~~forEach 表示被冷落了~~。
