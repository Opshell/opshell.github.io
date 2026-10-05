---
title: 'color-mix()：在 CSS 裡調色，不用再為了 hover 色開一個變數'
image: ''
description: 'color-mix() 讓瀏覽器在執行時混色：hover 深一點、背景淡一點、半透明，都從同一個主色算出來。跟 SCSS 的 darken()、mix() 差在哪，色彩空間怎麼選，順便聊相對顏色語法。'
keywords: ''
author: Opshell
createdAt: '2025-02-12'
categories:
  - 未分類
tags:
  - CSS
  - color-mix
  - theme
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有標題，依標題從頭寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
一個按鈕至少要有正常、hover、active、disabled 四種顏色，再加上淡色背景、邊框，一個主色就能長出七八個變數。以前靠 SCSS 的 `darken()`、`lighten()` 在編譯時算好，但遇到要執行時換主題（主色變成 CSS 變數）就算不了。`color-mix()` 就是來補這個洞的。
:::

## 懶人包
- `color-mix(in 色彩空間, 顏色A 比例, 顏色B)` 讓瀏覽器在執行時把兩個顏色混在一起。
- 它吃 CSS 變數，所以主題換了主色，hover、淡色背景會自動跟著變，不用每個狀態都開變數。
- 跟 `transparent` 混就是調透明度；跟 `white`／`black` 混就是調淡、調深。
- 色彩空間建議用 `oklch` 或 `oklab`，混出來的顏色比 `srgb` 自然，不會發灰。
- SCSS 的 `darken()`、`mix()` 只能處理編譯時就知道的顏色，遇到 CSS 變數就沒轍。

## 技術拆解

### 基本語法
```css
.box {
    /* 主色 70% + 白色 30% */
    background: color-mix(in oklch, var(--color-primary) 70%, white);
}
```

就像調顏料：兩種顏料、各放多少、在哪種調色盤上調。比例只寫一邊的話，另一邊就是剩下的百分比；兩邊都不寫就是各一半。

### 三種最常用的配方
```css
:root {
    --color-primary: #3b6fd8;

    /* 深一點：hover、active */
    --color-primary-hover: color-mix(in oklch, var(--color-primary), black 15%);

    /* 淡一點：淺色背景、標籤底色 */
    --color-primary-soft: color-mix(in oklch, var(--color-primary) 15%, white);

    /* 半透明：focus 外框、遮罩 */
    --color-primary-ring: color-mix(in oklch, var(--color-primary) 40%, transparent);
}
```

跟 `transparent` 混等於直接調透明度，比用 `rgba()` 好的地方是：不用知道主色的 RGB 數字，主色是什麼格式都行。

### 色彩空間是什麼、為什麼選 oklch
同樣是「藍混黃」，在不同的色彩空間混出來的結果不一樣。`srgb` 是螢幕的原生空間，但它的「中間值」不符合人眼感覺，混出來常常偏灰、偏暗。

`oklab`、`oklch` 是依照人眼感知設計的空間，混出來的漸變比較均勻，亮度也比較符合預期。沒有特別理由的話，選 `oklch` 就對了。

| 色彩空間 | 混出來的感覺 | 適合 |
|---|---|---|
| `srgb` | 中間容易發灰 | 要跟舊設計稿對色 |
| `oklab` | 自然、均勻 | 調淡、調深、透明度 |
| `oklch` | 自然，色相過渡更鮮明 | 大部分情況的預設選擇 |

## 例子與對比

### SCSS 函式 vs color-mix()
```scss
// SCSS：編譯時算好，結果寫死在 CSS 裡
$primary: #3b6fd8;

.button:hover {
    background: darken($primary, 10%);
}
```

```css
/* color-mix：執行時算，跟著變數走 */
.button:hover {
    background: color-mix(in oklch, var(--color-primary), black 10%);
}
```

如果主色是寫死的，兩種結果差不多。但只要主色變成 CSS 變數（例如多品牌、使用者自訂主題色），SCSS 那邊就直接報錯：`darken()` 不知道 `var(--color-primary)` 是什麼顏色，它只是一串字。

### 一個主色撐起整個按鈕
```vue
<script setup lang="ts">
defineProps<{
    color?: string;
}>();
</script>

<template>
    <button
        type="button"
        class="btn"
        :style="color ? { '--btn-color': color } : undefined"
    >
        <slot />
    </button>
</template>

<style lang="scss">
.btn {
    --btn-color: var(--color-primary);
    background: var(--btn-color);
    color: white;
    border: 1px solid color-mix(in oklch, var(--btn-color), black 20%);
    transition: background .2s ease;

    &:hover {
        background: color-mix(in oklch, var(--btn-color), black 12%);
    }

    &:focus-visible {
        outline: 3px solid color-mix(in oklch, var(--btn-color) 40%, transparent);
    }

    &:disabled {
        background: color-mix(in oklch, var(--btn-color) 40%, white);
    }
}
</style>
```

外面傳 `color="#e0533d"` 進來，hover、邊框、focus、disabled 全部自己長出來，一個變數都不用多開。

### 再進一步：相對顏色語法
如果需求是「同一個顏色，只改亮度」，相對顏色語法（relative color syntax）更直接：

```css
.badge {
    /* 拿主色的 l c h，亮度改成 0.9，其他不變 */
    background: oklch(from var(--color-primary) 0.9 c h);
}
```

`color-mix()` 是「兩個顏色混」，相對顏色語法是「拆開一個顏色改其中一個值」。兩個都是 2024 年後主流瀏覽器都有的東西，細節以 MDN 為準。

## 結論
`color-mix()` 讓顏色從「一個個寫死的色票」變成「從主色推算出來的關係」。主色換了，整套跟著換，這才是主題該有的樣子。

以前我們是調色師，一格一格填色票；現在只要當配方師，寫好比例就好 ~~（設計師給的色票還是要照對就是了）~~。
