---
title: 關於 DOM 尺寸的兩三式
image: ''
description: 'width、min-width、max-width 誰說了算，fit-content 為什麼一個值就能同時當寬度和上限，min()、max()、clamp() 怎麼取代 media query，還有用 inset 靠定位撐出尺寸。'
keywords: ''
author: Opshell
createdAt: '2025-02-12'
categories:
  - 未分類
tags:
  - CSS
  - layout
  - RWD
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的大綱與筆記寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
設定元素尺寸是 CSS 最基本的事，但「我明明寫了 `width: 500px`，為什麼它只有 300px」這種問題天天都有人問。原因通常是好幾個屬性在打架。這篇把決定尺寸的幾招放在一起：基本三兄弟、`fit-content`、數學函式，還有靠定位撐出大小的 `inset`。
:::

## 懶人包
- `width`、`min-width`、`max-width` 打架時的優先順序：`min-width` > `max-width` > `width`。
- `width: fit-content` 讓元素跟著內容大小，但不會超過可用空間，一個值就做到「寬度 + 上限」。
- `min()`、`max()`、`clamp()` 讓尺寸在一行內就有上下限，很多 media query 可以省掉。
- 絕對定位的元素用 `inset` 決定四邊位置，尺寸就自然被撐出來，不用寫 `width`／`height`。

## 技術拆解

### width
設定元素的寬度。百分比是相對於包含塊（通常是父元素）的寬度。單獨使用時最直覺，但 RWD 的情況下，寫死的 `width` 很容易在小螢幕上爆出去。

### min-width
最小寬度，「再怎麼縮也不能比這個窄」。

### max-width
最大寬度，「再怎麼撐也不能比這個寬」。最經典的用法就是文章容器：

```css
.article {
    width: 100%;
    max-width: 720px;
    margin-inline: auto;
}
```

螢幕寬的時候最多 720px 置中，螢幕窄的時候跟著縮。

三個一起寫的時候，規則是：`min-width` 最大，然後是 `max-width`，最後才輪到 `width`。

```css
.box {
    width: 500px;
    max-width: 300px; /* 實際 300px，max 贏過 width */
    min-width: 400px; /* 實際 400px，min 又贏過 max */
}
```

像是三個人在吵架：`width` 提議、`max-width` 說太多了、`min-width` 說不能更少，最後聽 `min-width` 的。

### fit-content
在 CSS 中，`fit-content` 這個關鍵字（flex 和 grid 版面裡也常用到）可以同時具備寬度和最大寬度的行為。

設定 `width: fit-content` 時，元素的寬度會根據內容自動調整，但又不會超過父元素或可用空間的限制，效果類似同時設了 `max-width: 100%`。

```css
.tag {
    width: fit-content;
}
```

拿來做標籤、按鈕、聊天泡泡這種「內容多長就多長，但不能超出容器」的元素剛剛好。以前常用 `display: inline-block` 達到類似效果，但 `inline-block` 會讓元素變成行內排列；`fit-content` 可以保持 `block`，還能搭配 `margin-inline: auto` 置中。

它其實是一個數學式的簡寫：取內容的最大寬度（max-content），但不超過可用空間，也不小於內容的最小寬度（min-content）。

### max、min、clamp、calc
這幾個數學函式讓尺寸不用只寫一個死數字：

```css
.container {
    /* 兩者取小：最多 1200px，螢幕窄就是 90% */
    width: min(90%, 1200px);
}

.sidebar {
    /* 兩者取大：至少 240px */
    width: max(240px, 20%);
}

.title {
    /* 最小 1.25rem、理想 4vw、最大 2.5rem */
    font-size: clamp(1.25rem, 4vw, 2.5rem);
}

.content {
    /* 扣掉固定高度的 header */
    height: calc(100dvh - 64px);
}
```

`width: min(90%, 1200px)` 一行就等於上面 `width` 加 `max-width` 兩行。`clamp()` 更是讓字級、間距可以隨螢幕平滑縮放，不用在每個斷點各寫一次。更完整的說明可以看 [深入理解 CSS 的 max、min、clamp、calc](https://www.oxxostudio.tw/articles/202011/css-max-min-clamp-calc.html)。

### inset 透過定位決定大小
絕對定位的元素，如果同時指定了左右（或上下），尺寸就由這兩邊的位置決定：

```css
.overlay {
    position: absolute;
    inset: 0; /* 等於 top: 0; right: 0; bottom: 0; left: 0; */
}

.drawer {
    position: fixed;
    inset: 0 0 0 auto; /* 貼齊右邊、上下撐滿 */
    width: 320px;
}
```

`inset: 0` 是最常見的「蓋滿父層」寫法。比起 `top: 0; left: 0; width: 100%; height: 100%` 四行，它一行就交代清楚，而且元素自己有 `padding`、`border` 時也不用再煩惱 `box-sizing` 會不會讓它多出來一截。

## 例子與對比

### 同一個需求，三種寫法
需求：卡片容器寬度 90%，但最寬 1200px、最窄 320px。

```css
/* 寫法 A：三兄弟 */
.wrap-a {
    width: 90%;
    max-width: 1200px;
    min-width: 320px;
}

/* 寫法 B：clamp 一行 */
.wrap-b {
    width: clamp(320px, 90%, 1200px);
}
```

| | 三兄弟 | `clamp()` |
|---|---|---|
| 行數 | 3 | 1 |
| 可讀性 | 每個值的角色很明確 | 習慣後一眼看懂「最小、理想、最大」 |
| 之後要單獨覆寫上限 | 改 `max-width` 就好 | 要整行重寫 |

兩個都對，團隊習慣哪個就用哪個。我個人比較常用 `min()` 處理最常見的「寬度加上限」，`clamp()` 留給字級和間距。

### 什麼時候用 fit-content、什麼時候用 inline-block

| 需求 | 選擇 |
|---|---|
| 一排並列、會自動換行的標籤 | `inline-block` 或 flex 的 `flex-wrap` |
| 獨佔一行、但寬度跟著內容的元素 | `width: fit-content` |
| 獨佔一行、寬度跟著內容、還要置中 | `width: fit-content` + `margin-inline: auto` |

## 結論
決定尺寸的屬性很多，但大部分問題都可以歸納成兩句：-|吵架時 min 最大|-，以及「能用函式一行解決的，就別寫三行」。`fit-content`、`clamp()`、`inset` 這幾個不算新東西了，該讓它們上場了。

尺寸這種事，跟人生一樣，有底線也有上限，中間的就隨內容彈性一點吧。
