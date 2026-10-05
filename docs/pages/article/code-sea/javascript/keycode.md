---
title: 'keyCode 退休了：改用 event.key 與 event.code'
image: ''
description: '還在寫 if (event.keyCode === 37) 判斷方向鍵嗎？keyCode 早就被棄用了。整理 key 和 code 的差別、方向鍵的新寫法，以及中文輸入法按 Enter 會誤送出的坑。'
keywords: ''
author: Opshell
createdAt: '2024-09-13'
categories:
  - JavaScript
tags:
  - JavaScript
  - DOM
  - Vue
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有參考連結，寫成 keyCode → key／code 的新舊對比。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
要偵測方向鍵，搜尋一下會找到 [Stack Overflow 這題](https://stackoverflow.com/questions/5597060/detecting-arrow-key-presses-in-javascript)，排在前面的舊答案寫的是 `keyCode === 37`，往下翻才會看到 Gibolt 的答案提醒：`keyCode` 已經被棄用，該改用 `event.key`。

網路上的舊範例很多，複製貼上很容易又把 `keyCode` 帶回專案。這篇把新舊寫法對照整理一次，寫給還在背 37、38、39、40 的人。
:::

## 懶人包
- `event.keyCode`、`event.which` 已經被棄用，新程式不要再用。
- `event.key` 是「這個鍵代表的字」：`'ArrowLeft'`、`'Enter'`、`'a'`，會跟著鍵盤配置和 Shift 變。
- `event.code` 是「實體按鍵的位置」：`'KeyA'`、`'ArrowLeft'`，不管配置與輸入法都一樣，適合遊戲 WASD。
- 中文輸入法選字時按 Enter 也會觸發 `keydown`，要用 `event.isComposing` 擋掉，不然注音選字就送出了。
- Vue 的 `@keydown.enter`、`@keydown.left` 修飾符底層就是用 `key` 判斷。

## 技術拆解

### keyCode 為什麼退休
`keyCode` 是一個數字，問題是這個數字從來沒有被好好標準化：不同瀏覽器、不同鍵盤配置、不同事件（`keydown` 和 `keypress`）給的值都可能不一樣，所以才會出現網路上那些「瀏覽器相容對照表」。再加上 `37` 這種數字本身就是魔術數字，讀程式的人得去查表才知道是左鍵。

規格後來給了兩個用字串表示的新屬性，`key` 和 `code`，各管一件事。

### key 和 code 的差別
用鋼琴比喻：`code` 是「你按了第幾個琴鍵」，`key` 是「這個琴鍵彈出來是什麼音」。換了調（鍵盤配置），同一個琴鍵彈出來的音就不一樣。

| 按下 | `event.key` | `event.code` |
|---|---|---|
| A 鍵 | `'a'` | `'KeyA'` |
| Shift + A | `'A'` | `'KeyA'` |
| 左方向鍵 | `'ArrowLeft'` | `'ArrowLeft'` |
| Enter | `'Enter'` | `'Enter'`（數字鍵盤的是 `'NumpadEnter'`） |
| 空白鍵 | `' '`（一個空白字元） | `'Space'` |
| 法文 AZERTY 鍵盤上 Q 的位置 | `'a'` | `'KeyQ'` |

怎麼選：

- 在意「使用者想輸入什麼」：快捷鍵 `Ctrl + S`、搜尋框按 Enter → 用 `key`。
- 在意「手指按在哪個位置」：遊戲的 WASD 移動 → 用 `code`，換成任何配置手感都一樣。

### 中文使用者一定會遇到的坑：輸入法
用注音或倉頡打字時，按 Enter 是在「確認選字」，但瀏覽器一樣會發出 `keydown` 事件，`key` 也是 `'Enter'`。如果你寫了「按 Enter 送出」，使用者選個字訊息就被送出去了，-|聊天室、留言框、搜尋框最常中招|-。

解法是檢查 `event.isComposing`，輸入法還在組字的時候它是 `true`：

```ts
function onKeydown(event: KeyboardEvent) {
    if (event.isComposing) { return; }

    if (event.key === 'Enter') {
        submit();
    }
}
```

部分瀏覽器在組字的那一下，`keyCode` 會是 `229`，所以舊程式裡會看到 `keyCode !== 229` 這種判斷，現在用 `isComposing` 就好。

## 例子與對比

### 方向鍵：舊寫法 vs 新寫法
```ts
// 舊：要查表才知道 37 是什麼
document.addEventListener('keydown', (event) => {
    if (event.keyCode === 37) { moveLeft(); }
    if (event.keyCode === 38) { moveUp(); }
    if (event.keyCode === 39) { moveRight(); }
    if (event.keyCode === 40) { moveDown(); }
});

// 新：一看就懂，再用物件映射收乾淨
const moves: Record<string, () => void> = {
    ArrowLeft: moveLeft,
    ArrowUp: moveUp,
    ArrowRight: moveRight,
    ArrowDown: moveDown
};

document.addEventListener('keydown', (event) => {
    const move = moves[event.key];
    if (!move) { return; }

    event.preventDefault(); // 避免方向鍵順便捲動頁面
    move();
});
```

### Vue 的按鍵修飾符
Vue 已經幫你包好了，修飾符就是 `key` 的 kebab-case 版本：

```vue
<script setup lang="ts">
function submit() {
    console.log('送出');
}

function moveLeft() {
    console.log('往左');
}

function moveRight() {
    console.log('往右');
}

function nextPage() {
    console.log('下一頁');
}

function save() {
    console.log('存檔');
}
</script>

<template>
    <!-- 按 Enter 送出 -->
    <input @keydown.enter="submit">

    <!-- 方向鍵，left / up / right / down 是內建的別名 -->
    <div tabindex="0" @keydown.left="moveLeft" @keydown.right="moveRight" />

    <!-- 其他鍵直接用 key 的 kebab-case，例如 PageDown -->
    <div tabindex="0" @keydown.page-down="nextPage" />

    <!-- 組合鍵：Ctrl + S，.exact 代表不能多按其他修飾鍵 -->
    <div tabindex="0" @keydown.ctrl.s.exact.prevent="save" />
</template>
```

`@keydown.enter` 一樣會被輸入法選字觸發，有輸入中文的欄位，建議改成自己寫 handler 檢查 `isComposing`，或試試 `@keydown.enter` 搭配 `@compositionstart`／`@compositionend` 自己記狀態。

### 新舊屬性一張表

| 屬性 | 狀態 | 型別 | 用途 |
|---|---|---|---|
| `keyCode` | 棄用 | 數字 | 不要用 |
| `which` | 棄用 | 數字 | 不要用 |
| `charCode` | 棄用 | 數字 | 不要用 |
| `key` | 標準 | 字串 | 這個鍵代表的值 |
| `code` | 標準 | 字串 | 實體按鍵的位置 |
| `isComposing` | 標準 | 布林 | 輸入法是否在組字 |

## 結論
`keyCode` 是上一個時代的產物，數字難讀、各家不一致，現在有 `key` 管「意思」、`code` 管「位置」，分工清楚多了。順便把 `isComposing` 加上，你的中文使用者會少罵你幾句。

下次在 Stack Overflow 看到 `keyCode === 37`，記得往下多滑幾個答案，~~新答案通常都在被埋沒的那一頁~~。
