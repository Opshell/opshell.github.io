---
title: 'Flex 用了好幾年，還是會踩的那幾個坑'
image: ''
description: 'flex: 1 到底是什麼意思、為什麼文字省略號在 flex 裡失效、flex-basis 跟 width 誰說了算、最後一行怎麼靠左。整理 Flexbox 最常踩的坑和解法。'
keywords: ''
author: Opshell
createdAt: '2024-10-17'
categories:
  - 未分類
tags:
  - CSS
  - flex
  - layout
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有一支影片連結，依標題寫成「常見的坑」全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
Flex 是每個前端第一天就會學的東西，`display: flex` 加 `justify-content: center` 打天下。但用久了會發現，常常遇到「明明照著寫卻不對」的狀況：省略號不出現、元素被擠扁、該等寬的不等寬。這篇不從頭教 flex，只整理那些用了好幾年還是會踩的坑。

參考影片：<https://www.youtube.com/watch?v=wsTv9y931o8>
:::

## 懶人包
- `flex: 1` 是 `flex: 1 1 0%` 的縮寫，重點在 basis 是 0，所以才會等分；`flex: auto` 的 basis 是 auto，會先看內容大小再分。
- flex 子元素的 `min-width` 預設是 `auto`（內容最小寬度），所以文字省略號、長網址常常撐爆版面，加 `min-width: 0` 解決。
- 寬度由 `flex-basis` 優先決定，`width` 只在 basis 是 `auto` 時才有作用。
- 要把某個元素推到最右邊，用 `margin-left: auto`，不用多包一層。
- `flex-wrap` 的最後一行對不齊時，與其跟 flex 硬拗，不如換 grid。

## 技術拆解

### flex: 1 到底是什麼
`flex` 是三個屬性的縮寫：`flex-grow`（有多的空間怎麼分）、`flex-shrink`（空間不夠怎麼縮）、`flex-basis`（分之前的起始大小）。

| 寫法 | 展開 | 行為 |
|---|---|---|
| `flex: 1` | `1 1 0%` | 起始大小當 0，全部空間照比例分，-|真正等分|- |
| `flex: auto` | `1 1 auto` | 先給內容需要的大小，剩下的再分 |
| `flex: none` | `0 0 auto` | 不長也不縮，內容多大就多大 |

所以三個 `flex: 1` 的按鈕不管字多字少都一樣寬；換成 `flex: auto`，字多的那顆就會比較寬。像分披薩：`flex: 1` 是先切好平均分，`flex: auto` 是先讓每個人拿自己點的配料，剩下的再平分。

### 省略號為什麼不出現
最經典的坑：

```html
<div class="row">
    <img class="row__avatar" src="/avatar.png" alt="">
    <p class="row__title">一段非常非常非常長、長到應該要被省略的標題文字</p>
</div>
```

```css
.row {
    display: flex;
    gap: 8px;
}

.row__title {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
```

看起來沒問題，但標題會直接把容器撐爆。原因是 flex 子元素的 `min-width` 預設是 `auto`，意思是「我最小不能比我的內容還窄」，而 `nowrap` 的內容就是整行字那麼寬。

解法就是一行：

```css
.row__title {
    min-width: 0;
}
```

告訴它「你可以縮到 0」，`overflow: hidden` 才有機會發揮作用。直向的 flex 也一樣，換成 `min-height: 0`。這個坑在 grid 的 `1fr` 也會遇到，原理相同。

### flex-basis 和 width 誰說了算
```css
.item {
    width: 200px;
    flex-basis: 100px;
}
```

答案是 `flex-basis` 贏，`width` 被無視。只有 `flex-basis: auto`（預設值）時，才會回頭去看 `width`。所以在 flex 子元素上，與其寫 `width`，不如直接寫 `flex: 0 0 200px`，意圖比較清楚。

## 例子與對比

### 把東西推到最右邊
導覽列常見的「Logo 在左、選單在中、登入按鈕在最右」：

```css
.nav {
    display: flex;
    align-items: center;
    gap: 16px;
}

.nav__login {
    margin-left: auto;
}
```

`margin-left: auto` 在 flex 裡會吃掉所有剩餘空間，把自己推到最右邊。比起為了排版多包一個 `<div>` 再 `justify-content: space-between`，乾淨很多。

### gap vs margin
以前做間距要用 `margin`，然後再用 `:last-child { margin-right: 0 }` 把最後一個的多餘間距扣掉。現在 flex 的 `gap` 所有主流瀏覽器都支援，只放在元素之間，不用再扣：

```css
/* 以前 */
.list > * {
    margin-right: 8px;
}

.list > *:last-child {
    margin-right: 0;
}

/* 現在 */
.list {
    display: flex;
    gap: 8px;
}
```

### flex-wrap 的最後一行
卡片列表用 `flex-wrap: wrap` 加 `justify-content: space-between`，最後一行只有兩張時，會一張在最左、一張在最右，中間空一大塊。網路上有各種補空元素的偏方，但這其實是在叫 flex 做它不擅長的事。

一維排列（一行或一列）用 flex；要對齊成格子的二維排列，換 grid：

```css
.cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
}
```

最後一行自動靠左，欄寬一致，什麼偏方都不用。

## 結論
Flex 的坑幾乎都來自同一個原因：它的預設值是為了「內容優先」設計的。`min-width: auto` 保護內容不被擠壞、`flex-basis` 優先於 `width`，理解了這個出發點，那些「怎麼不照我寫的走」就都說得通了。

用了好幾年還會踩坑不丟臉，丟臉的是每次踩完都忘記 `min-width: 0` ~~（每次都覺得這次一定記得）~~。
