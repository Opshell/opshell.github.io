---
title: 'input type="date" 的樣式到底能改到哪裡'
image: ''
description: '原生日期欄位很好用，但樣式各家瀏覽器都不一樣。整理 WebKit 系的偽元素（年、月、日欄位與日曆圖示）能改什麼、改不了什麼，以及 color-scheme、showPicker() 這些比較少人知道的工具。'
keywords: ''
author: Opshell
createdAt: '2024-09-04'
categories:
  - 未分類
tags:
  - CSS
  - HTML
  - form
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的一段 CSS 寫成全文，補了其他偽元素、深色模式與 showPicker()。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
`<input type="date">` 免費送你一個日期選擇器、手機上還是原生滾輪，但設計稿上的日期欄位通常長得很不一樣。常見的情況是：字距、顏色、日曆圖示對不上設計，於是開始在 DevTools 裡挖 `::-webkit-` 開頭的偽元素。這篇整理能挖到什麼、什麼時候該放棄改用元件庫。
:::

## 懶人包
- Chrome、Edge、Safari（WebKit／Blink 系）有一組 `::-webkit-datetime-edit-*` 偽元素，可以分別調年、月、日欄位的樣式。
- 日曆圖示是 `::-webkit-calendar-picker-indicator`，可以換顏色、換圖、甚至整個蓋滿欄位讓「點哪裡都打開日曆」。
- Firefox 不吃這些偽元素，跳出來的日曆面板任何瀏覽器都改不了。
- 深色模式不用自己改圖示顏色，設 `color-scheme: dark` 就好。
- 需要完全客製外觀的話，原生欄位不是對的工具，直接用元件庫的 DatePicker。

## 技術拆解

### 欄位裡的每一段都是偽元素
日期欄位看起來是一串文字，其實是好幾個獨立的小欄位拼起來的：

```css
input[type='date']::-webkit-datetime-edit {}              /* 整段文字的容器 */
input[type='date']::-webkit-datetime-edit-fields-wrapper {}
input[type='date']::-webkit-datetime-edit-year-field {}   /* 年 */
input[type='date']::-webkit-datetime-edit-month-field {}  /* 月 */
input[type='date']::-webkit-datetime-edit-day-field {}    /* 日 */
input[type='date']::-webkit-datetime-edit-text {}         /* 中間的分隔符號 / */
input[type='date']::-webkit-calendar-picker-indicator {}  /* 日曆圖示 */
```

所以可以單獨針對其中一段下樣式，例如只把年份的字距收緊：

```css
form input[type='date']::-webkit-datetime-edit-year-field {
    letter-spacing: -1px;
}
```

常見的使用情境是：欄位寬度有限、西元年四碼佔太多位置，或是字型的數字比較寬，年份看起來跟月日的節奏不一致，收一點字距就順眼多了。

### 被選取時的顏色
用鍵盤或滑鼠點到某一段時，那一段會反白。這個反白顏色也能改：

```css
input[type='date']::-webkit-datetime-edit-year-field:focus,
input[type='date']::-webkit-datetime-edit-month-field:focus,
input[type='date']::-webkit-datetime-edit-day-field:focus {
    background: var(--color-primary);
    color: white;
    border-radius: 4px;
}
```

### 日曆圖示
```css
input[type='date']::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: .6;
}

input[type='date']::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
}
```

要換成自己的圖示，可以用 `background` 放 SVG，再把原本的圖示藏起來：

```css
input[type='date']::-webkit-calendar-picker-indicator {
    background: url('/icons/calendar.svg') center / 16px no-repeat;
    color: transparent;
}
```

## 例子與對比

### 點哪裡都打開日曆
預設只有點那個小圖示才會開日曆，點文字是逐段輸入。很多人想要「點整個欄位就開日曆」，以前的偏方是把圖示放大蓋滿整個欄位：

```css
input[type='date'] {
    position: relative;
}

input[type='date']::-webkit-calendar-picker-indicator {
    position: absolute;
    inset: 0;
    width: auto;
    height: auto;
    opacity: 0;
    cursor: pointer;
}
```

現在有正式的 API：`showPicker()`，主流瀏覽器都支援。

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue';

const dateInput = useTemplateRef<HTMLInputElement>('dateInput');

function openPicker() {
    dateInput.value?.showPicker();
}
</script>

<template>
    <input
        ref="dateInput"
        type="date"
        @click="openPicker"
    >
</template>
```

`showPicker()` 必須由使用者操作觸發（click、keydown），在 `onMounted` 裡直接呼叫會被瀏覽器拒絕。

### 深色模式：別手動改圖示顏色
深色背景上，預設的黑色日曆圖示會看不見。網路上常見的解法是 `filter: invert(1)`，但這是在跟瀏覽器對著幹。正解是告訴瀏覽器「這裡是深色」：

```css
[data-theme='dark'] input[type='date'] {
    color-scheme: dark;
}
```

圖示、跳出來的日曆面板、捲軸全部會一起變成深色版本，而 `invert()` 只改得到圖示。

### 能改與不能改

| 想改的東西 | WebKit／Blink | Firefox |
|---|---|---|
| 欄位外框、背景、字型 | 可以 | 可以 |
| 年／月／日各段樣式 | 可以（偽元素） | 不行 |
| 日曆圖示 | 可以 | 不行 |
| 跳出來的日曆面板 | 不行 | 不行 |
| 顯示格式（年月日順序） | 跟系統語系走，不行 | 跟系統語系走，不行 |

最後兩行是重點：日曆面板和日期格式都是作業系統、瀏覽器決定的。設計稿如果要求「日曆面板要有品牌色、要顯示民國年」，就不是 CSS 的事了，請直接換元件庫。

## 結論
原生日期欄位的優點是無障礙、手機體驗好、零依賴，代價是外觀只能改個七八成。我的判斷標準是：-|只要改字距、顏色、圖示就收工的，用原生的；設計要求改面板或格式的，用元件庫|-。

跟原生元件相處的祕訣，就是知道哪裡該堅持、哪裡該放手 ~~（跟設計師相處也是）~~。
