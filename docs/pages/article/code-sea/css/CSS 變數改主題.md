---
title: CSS 變數改主題：一套變數撐起深淺色與多品牌
image: ''
description: '主題切換不用準備兩份 CSS：把顏色抽成 CSS 變數，切換時只換一個屬性。從 SCSS 變數為什麼辦不到講起，到 data-theme、prefers-color-scheme、light-dark() 與避免閃白。'
keywords: ''
author: Opshell
createdAt: '2024-12-02'
categories:
  - 未分類
tags:
  - CSS
  - CSS 變數
  - theme
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有一個參考連結，依標題從頭寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
深色模式幾乎是現在網站的標配，常見的需求還會再多一層：同一套系統要給不同客戶換品牌色。很多專案一開始用 SCSS 變數管顏色，等到要「在執行時切換」才發現 SCSS 變數編譯完就消失了。這篇寫給正卡在這一步的人。

參考：<https://ithelp.ithome.com.tw/articles/10349032>
:::

## 懶人包
- SCSS 變數在編譯時就被換成固定值，執行時改不了；要能切換主題，顏色一定要落在 CSS 變數上。
- 做法是兩層：元件只用語意變數（`--color-bg`），主題只負責改語意變數的值。
- 切換時在 `<html>` 上換一個 `data-theme`，整頁一起變，JavaScript 只動一個屬性。
- 跟隨系統用 `prefers-color-scheme`；只有深淺兩種時，`light-dark()` 可以少寫一半。
- 記住使用者選擇的主題要在畫面出現前套上，不然會閃一下白。

## 技術拆解

### SCSS 變數為什麼不行
SCSS 的 `$primary` 就像印刷廠：印好之後紙上的顏色就固定了，想換色只能重印（重新編譯）。CSS 變數比較像電子看板，內容可以隨時換，所有引用它的地方立刻跟著變。

```scss
$primary: #6a675d;

.button {
    background: $primary; // 編譯後變成 background: #6a675d; 從此跟 $primary 無關
}
```

所以 SCSS 依然很好用（拿來產生變數、跑迴圈），但「最後一哩」一定要交給 CSS 變數。

### 兩層變數：語意層與主題層
元件不要直接用 `--blue-500` 這種色票，而是用「這個顏色拿來做什麼」的名字：

```css
:root {
    /* 主題層：預設（淺色） */
    --color-bg: #ffffff;
    --color-text: #1f1f1f;
    --color-primary: #3b6fd8;
    --color-border: #e3e3e3;
}

[data-theme='dark'] {
    --color-bg: #16171a;
    --color-text: #e8e8e8;
    --color-primary: #7aa2ff;
    --color-border: #2c2e33;
}

/* 元件層：只認語意變數 */
.card {
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
}
```

元件完全不知道現在是什麼主題，換主題的時候不用改任何一個元件。多品牌也是一樣的道理，`[data-brand='a']`、`[data-brand='b']` 各自覆蓋 `--color-primary` 就好。

### 跟隨系統設定
使用者沒選過的時候，最貼心的預設是跟作業系統走：

```css
@media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
        --color-bg: #16171a;
        --color-text: #e8e8e8;
    }
}
```

`:not([data-theme='light'])` 的意思是：系統是深色，但使用者手動選了淺色，就聽使用者的。

### light-dark()：只有兩種主題時的捷徑
如果真的只有深淺兩種，可以用 `light-dark()`，搭配 `color-scheme` 決定要取哪一邊：

```css
:root {
    color-scheme: light dark;
    --color-bg: light-dark(#ffffff, #16171a);
    --color-text: light-dark(#1f1f1f, #e8e8e8);
}

[data-theme='light'] {
    color-scheme: light;
}

[data-theme='dark'] {
    color-scheme: dark;
}
```

`color-scheme` 還有個附加好處：捲軸、表單元件這些瀏覽器原生的東西也會一起變深色。不過要做三種以上的主題（例如品牌色），還是乖乖回到 `data-theme` 那一套。

## 例子與對比

### 用 Vue 切換主題
```ts
// useTheme.ts
import { ref, watchEffect } from 'vue';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const theme = ref<Theme>(
    (localStorage.getItem(STORAGE_KEY) as Theme | null)
    ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
);

watchEffect(() => {
    document.documentElement.dataset.theme = theme.value;
    localStorage.setItem(STORAGE_KEY, theme.value);
});

export function useTheme() {
    function toggleTheme() {
        theme.value = theme.value === 'dark' ? 'light' : 'dark';
    }

    return { theme, toggleTheme };
}
```

```vue
<script setup lang="ts">
import { useTheme } from './useTheme';

const { theme, toggleTheme } = useTheme();
</script>

<template>
    <button type="button" @click="toggleTheme">
        {{ theme === 'dark' ? '切到淺色' : '切到深色' }}
    </button>
</template>
```

::: warning SSR 要注意
`localStorage`、`matchMedia` 只存在瀏覽器裡，VitePress、Nuxt 這類有 SSR 的框架要放在 `onMounted` 或確定在客戶端才執行。
:::

### 避免閃白
Vue 掛載完才套主題，使用者會先看到一瞬間的淺色。解法是在 `<head>` 裡放一小段同步的 script，在畫面畫出來之前就把 `data-theme` 設好：

```html
<script>
    (function () {
        var saved = localStorage.getItem('theme');
        var dark = matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.dataset.theme = saved || (dark ? 'dark' : 'light');
    })();
</script>
```

這段故意不用模組、不等任何東西，越早執行越好。

### 做法比較

| 做法 | 執行時切換 | 寫法 | 適合 |
|---|---|---|---|
| 兩份 CSS 檔換 `<link>` | 可以，但會重新下載、可能閃爍 | 每個主題一份 | 早期做法，不推薦 |
| SCSS 變數 | 不行 | 最熟悉 | 只有一種主題 |
| CSS 變數 + `data-theme` | 可以，瞬間生效 | 兩層變數 | 深淺色、多品牌 |
| `light-dark()` | 可以 | 最短 | 只有深淺兩種 |

## 結論
主題切換的核心就一句話：-|元件只認語意變數，主題只改變數的值|-。把這兩層分清楚，之後要加第三、第四種主題都只是多寫一個區塊。

SCSS 變數是寫死的承諾，CSS 變數才是可以商量的那種。
