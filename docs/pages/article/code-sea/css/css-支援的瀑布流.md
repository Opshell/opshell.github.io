---
title: CSS 支援的瀑布流：Masonry 從吵架到定案
image: ''
description: '瀑布流以前只能靠 JavaScript 或 column 硬湊，CSS 原生的 Masonry 吵了好幾年要怎麼寫。整理舊做法的毛病、規格之爭的來龍去脈，以及現在可以怎麼漸進增強。'
keywords: ''
author: Opshell
createdAt: '2025-08-01'
categories:
  - 未分類
tags:
  - masonry
  - CSS
  - grid
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有 Chrome 部落格的連結，依標題寫成全文，規格現況請發佈前再查一次。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
作品集、圖片牆、Pinterest 那種高低不一的卡片排版，俗稱瀑布流（Masonry）。這個需求存在超過十年，CSS 卻一直沒有原生支援，大家只能靠 JavaScript 套件或 `column` 湊。這幾年規格終於動起來了，中間還吵了一架，這篇整理來龍去脈。

參考：<https://developer.chrome.com/blog/masonry-update?hl=zh-tw>
:::

## 懶人包
- 瀑布流的難點：每張卡片高度不同，要「塞進目前最短的那一欄」，而 grid 一定要對齊行，`column` 又是由上往下排。
- 舊做法：`column-count` 簡單但閱讀順序變成直的；JavaScript 套件順序對，但要算位置、圖片載入後要重排。
- 規格之爭：要做成 grid 的一種模式，還是獨立的新 display？吵了幾年，最後往「grid 的變體、獨立的 display 值」收斂，名稱以最新規格為準。
- 現在能做的：用 `@supports` 漸進增強，不支援的瀏覽器退回普通 grid 或 `column`。

## 技術拆解

### 為什麼 grid 排不出來
grid 的本質是表格：每一行的高度由那一行最高的格子決定。卡片高低不一，短的卡片下面就會留一塊空白，像是排隊時前面那位特別高，整排都要等他。

瀑布流要的是「每一欄各自往下疊」，下一張卡片放到目前最矮的那一欄。這種「欄獨立、行不對齊」的邏輯，grid 和 flex 都沒有。

### 舊做法一：column
```css
.gallery {
    column-count: 3;
    column-gap: 16px;
}

.gallery__item {
    break-inside: avoid;
    margin-bottom: 16px;
}
```

長相完全是瀑布流，但順序是「第一欄由上往下排完，才換第二欄」。卡片 1、2、3 會疊在左邊，而不是排在第一行。照時間排序的內容（最新的在最前面）用這招，最新的三篇會全部擠在左邊那欄。

### 舊做法二：JavaScript
Masonry.js 之類的套件，量每張卡片的高度，用 `position: absolute` 一張張擺。順序正確，但是：

- 圖片載入完高度才會確定，要等載入或監聽變化後重排。
- 視窗大小變了要重算。
- 第一次渲染前排版是亂的，容易閃一下。

### 規格之爭
CSS 原生的 Masonry 在規格上吵了很久，主要兩派：

| 派別 | 寫法的樣子 | 主張 |
|---|---|---|
| 放進 grid | `grid-template-rows: masonry` | 共用 grid 的欄定義、`gap`、對齊，學一次就會 |
| 獨立出來 | 一個新的 `display` 值 | 瀑布流的演算法跟 grid 不同，混在一起會讓 grid 的規則變複雜 |

Chrome 部落格那篇就是在說明他們傾向獨立出來的理由，並徵求開發者意見。後來的討論往「沿用 grid 的欄定義語法、但用獨立的 `display` 值」收斂，目前看到的名稱是 `display: grid-lanes`。不過規格和名稱在定案前都可能再變，-|實際寫法請以 MDN 與各瀏覽器的官方文件為準|-。

## 例子與對比

### 漸進增強的寫法
不管最後語法長怎樣，結構大概是這樣：欄的定義跟 grid 一樣寫，換掉 `display` 的值。

```css
/* 不支援的瀏覽器：普通 grid，卡片之間會有空白，但順序正確 */
.gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
}

/* 支援原生瀑布流的瀏覽器 */
@supports (display: grid-lanes) {
    .gallery {
        display: grid-lanes;
    }
}
```

不支援時退回普通 grid：空白多一點，但功能、順序都對。對大部分圖片牆來說，這個退場方案完全可以接受。

### 三種做法比較

| 做法 | 閱讀順序 | 要 JavaScript | 圖片載入後 | 現況 |
|---|---|---|---|---|
| `column` | 直的，不對 | 不用 | 自動 | 全部支援 |
| JS 套件 | 正確 | 要 | 要重排 | 全部支援 |
| 原生 Masonry | 正確 | 不用 | 自動 | 逐步支援中，查 caniuse |

如果內容順序不重要（純圖片展示），`column` 依然是最省事的；順序重要又要今天就上線，JavaScript 套件還是最穩；可以接受部分瀏覽器退回普通 grid 的，就直接用原生寫法加 `@supports`。

## 結論
瀑布流是少數「需求明確、做法大家都知道、但 CSS 就是不給」的老問題。規格吵了這麼久，其實是好事：吵清楚再定案，總比定了一個大家都不愛用的語法好。

等它全面支援的那天，Masonry.js 大概會是最開心退休的那一個。
