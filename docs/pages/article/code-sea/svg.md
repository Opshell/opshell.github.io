---
title: 關於 Svg 的兩三事
author: Opshell
createdAt: '2024-09-05'
categories:
  - Project Structure
tags:
  - structure
  - pattern
  - SVG
editLink: true
isPublished: false
refer:
  - >-
    https://www.zhangxinxu.com/wordpress/2014/07/svg-sprites-fill-color-currentcolor/
image: ''
description: 'SVG 圖示的四種用法（img、inline、sprite、mask）怎麼選，為什麼 sprite 的圖示改不了顏色，以及用 currentColor 讓圖示跟著文字變色、用 CSS 變數做雙色圖示。'
keywords: ''
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有參考連結，依標題與連結主題（sprite 與 currentColor）寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
專案裡的圖示幾乎都是 SVG，但「怎麼放進頁面」有好幾種做法，選錯了就會遇到經典問題：hover 想變色卻改不動、深色模式下圖示一片黑。TypeScript 鐵人賽的 [Day29 - svg sprite](/article/code-sea/typescript/2022鐵人賽/day29-svg-sprite) 講了怎麼把圖示打包成 sprite，這篇補上另一半：放進來之後，顏色怎麼控制。

參考：<https://www.zhangxinxu.com/wordpress/2014/07/svg-sprites-fill-color-currentcolor/>
:::

## 懶人包
- SVG 圖示四種放法：`<img>`、inline、sprite（`<use>`）、CSS `mask`，能不能用 CSS 改色是最大差別。
- `<img>` 引入的 SVG 是一張「圖片」，外面的 CSS 碰不到它裡面，改不了顏色。
- sprite 改不了色，通常是因為 SVG 檔裡把 `fill="#333"` 寫死了，把它改成 `fill="currentColor"` 就好。
- `currentColor` 會拿元素的 `color`，所以圖示會跟著文字顏色走，hover、深色模式都免費。
- 需要雙色圖示的話，用 CSS 變數穿過 `<use>` 的邊界。

## 技術拆解

### 四種放法
**1. `<img>`**

```html
<img src="/icons/search.svg" alt="" width="20" height="20">
```

最簡單、可以被快取，但它對頁面來說就是一張圖片，跟 PNG 沒兩樣，CSS 改不到裡面的顏色。

**2. inline**

```html
<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2Z" />
</svg>
```

直接把 SVG 原始碼貼進 HTML，CSS 想改哪條線都行。缺點是同一個圖示出現 50 次就貼 50 份，HTML 變得又長又重複。

**3. sprite（`<symbol>` + `<use>`）**

所有圖示收進一個隱藏的 `<svg>`，每個圖示是一個 `<symbol>`，用的地方只寫一行 `<use>`：

```html
<!-- 頁面某處，通常由打包工具自動插入 -->
<svg style="display: none">
    <symbol id="icon-search" viewBox="0 0 24 24">
        <path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2Z" />
    </symbol>
</svg>

<!-- 使用的地方 -->
<svg class="icon" aria-hidden="true">
    <use href="#icon-search" />
</svg>
```

兼顧 inline 的可控制性和 `<img>` 的不重複，是元件庫最常見的做法。Day29 的 `vite-plugin-svg-icons` 就是自動幫你產生這個 sprite。

**4. CSS mask**

```css
.icon-search {
    width: 20px;
    height: 20px;
    background-color: currentColor;
    mask: url('/icons/search.svg') center / contain no-repeat;
}
```

把 SVG 當遮罩，顏色由 `background-color` 決定。不用動 HTML 結構，但只能是單色。

### sprite 為什麼改不了顏色
很多人用了 sprite，寫了 `.icon { fill: red; }` 卻沒反應。原因有兩層：

1. `<use>` 引用的內容在一個類似 shadow DOM 的獨立空間裡，外面的選擇器選不到裡面的 `<path>`。
2. 但 `fill`、`color` 這些屬性是會繼承的，所以 `.icon { fill: red; }` 理論上會傳進去。真正擋住它的，是 SVG 檔案裡 `<path fill="#333">` 這種寫死的屬性：繼承來的值永遠輸給元素自己身上的設定。

解法就是把寫死的顏色拿掉，或改成 `currentColor`。

### currentColor：跟著文字走
`currentColor` 是 CSS 的一個關鍵字，意思是「目前這個元素的 `color` 值」。

```xml
<symbol id="icon-search" viewBox="0 0 24 24">
    <path fill="currentColor" d="..." />
</symbol>
```

```css
.icon {
    width: 1em;
    height: 1em;
}

.btn {
    color: var(--color-text);
}

.btn:hover {
    color: var(--color-primary); /* 文字和圖示一起變色 */
}
```

圖示從此跟文字綁在一起：按鈕 hover 變色、深色模式換顏色、disabled 變灰，圖示全部自動跟上，不用另外寫任何規則。寬高用 `1em`，連大小都跟著字級走。

## 例子與對比

### 批次清掉寫死的顏色
設計師從 Figma 匯出的 SVG 幾乎都帶著 `fill="#xxxxxx"`。與其一個個手改，用 SVGO 在打包時統一處理：

```js
// svgo.config.js
export default {
    plugins: [
        'preset-default',
        {
            name: 'convertColors',
            params: {
                currentColor: true
            }
        }
    ]
};
```

`convertColors` 的 `currentColor: true` 會把顏色值轉成 `currentColor`。多色的插圖不要套這個設定，它會把所有顏色都變成同一個。

### 雙色圖示：CSS 變數穿牆
`currentColor` 只有一個，雙色圖示怎麼辦？CSS 變數也會繼承，而且能穿過 `<use>` 的邊界：

```xml
<symbol id="icon-badge" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="var(--icon-secondary, currentColor)" />
    <path fill="currentColor" d="..." />
</symbol>
```

```css
.badge-icon {
    color: var(--color-primary);
    --icon-secondary: color-mix(in oklch, var(--color-primary) 20%, white);
}
```

主色用 `currentColor`，第二色用變數，沒設變數時退回主色。

### 四種放法比較

| 放法 | CSS 改色 | 多色 | 重複使用 | 適合 |
|---|---|---|---|---|
| `<img>` | 不行 | 原檔有幾色就幾色 | 可快取 | 插圖、Logo |
| inline | 完全可以 | 可以 | 每次都貼一份 | 要做動畫的單一圖示 |
| sprite | 靠 `currentColor`、變數 | 用變數 | 一份定義 | 圖示系統 |
| CSS mask | 可以 | 只能單色 | 可快取 | 不想動 HTML 的單色圖示 |

## 結論
SVG 圖示的顏色問題，十之八九是那個寫死的 `fill`。把它換成 `currentColor`，圖示就從「一張圖片」變成「跟著文字走的字」，hover、主題、狀態全部一次解決。

插圖用 `<img>`，圖示用 sprite 加 `currentColor`，這兩條記住，SVG 就不會再跟你鬧脾氣了。
