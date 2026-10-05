---
title: 'Grid 的 1fr 關不住子元素？順便讓欄寬動起來'
image: ''
description: '子元素設了 width: 100% 還是把 1fr 的欄撐爆，原因是 1fr 其實是 minmax(auto, 1fr)。整理 fr 的計算方式、minmax(0, 1fr) 的解法，以及用 CSS 變數切換 grid-template-columns 做出面板滑入的動畫。'
keywords: ''
author: Opshell
createdAt: '2025-02-12'
categories:
  - 未分類
tags:
  - CSS
  - grid
  - animation
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的筆記與 SCSS 程式碼寫成全文，修正了 1fr 撐開的原因說明，補了 grid 動畫的段落。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
Grid 排版用 `fr` 分配欄寬很直覺，但常見的情況是：子元素放了一張寬表格或一串不換行的文字，明明設了 `width: 100%`，欄位還是被撐開，整個版面歪掉。另一個需求是多個設定面板依狀態切換、要有滑入的動畫。這兩件事剛好都跟 `grid-template-columns` 有關，就寫在一起。
:::

## 懶人包
- `fr` 分的是「扣掉固定寬度和 `gap` 之後的可用空間」，不是整個容器寬度。
- `1fr` 其實是 `minmax(auto, 1fr)`，最小值是內容的最小寬度，所以內容太寬時欄位會被撐開，子元素的 `width: 100%` 擋不住。
- 解法是改成 `minmax(0, 1fr)`，或在子元素加 `min-width: 0`。
- `grid-template-columns` 可以做 transition，只要軌道數量不變；用 CSS 變數切換欄寬，就能做出面板滑入的效果。

## 技術拆解

### fr 是怎麼分的
`fr` 是比例單位。`grid-template-columns: 1fr 2fr;` 就是把寬度分成 3 份，第一欄 1 份、第二欄 2 份。

但要注意分的是 **可用空間**：容器寬度先扣掉固定寬度的欄（`px`、`em`）和 `gap`，剩下的才拿來照比例分。

```css
.layout {
    display: grid;
    grid-template-columns: 200px 1fr 2fr;
    gap: 16px;
    width: 1000px;
}
/* 可用空間 = 1000 - 200 - 16 × 2 = 768px，再分成 3 份：256px、512px */
```

### width: 100% 參照誰
子元素設 `width: 100%` 時，參照的是它的包含塊（containing block），在 grid 裡就是它所在的格子（grid area），不是整個 grid 容器。

所以 `width: 100%` 的意思是「跟格子一樣寬」。問題在於：格子本身已經被撐開了。

### 問題所在：1fr 的最小值是 auto
這是最容易誤會的地方。`1fr` 不是「1 份可用空間」這麼單純，它完整的寫法是：

```css
grid-template-columns: minmax(auto, 1fr);
```

最小值 `auto` 在這裡的意思接近「內容的最小寬度」（min-content）。當子元素裡有一張很寬的表格、一串不會換行的長網址，內容的最小寬度大於分到的比例時，這一欄就會被撐到內容那麼寬。

格子先被撐開，子元素再用 `width: 100%` 跟著格子一樣寬，所以 `width: 100%` 完全幫不上忙，它只是忠實地跟著一個已經被撐大的格子。像是一個人說「我穿的衣服跟櫃子一樣大」，但櫃子已經被他的行李撐變形了。

### 解法
**解法一：把最小值改成 0（推薦）**

```css
.layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
}
```

明確告訴瀏覽器「這一欄最小可以縮到 0」，就會乖乖照比例分，內容太寬的話由子元素自己處理（`overflow: auto` 出現捲軸、文字換行或省略）。

**解法二：在子元素加 min-width: 0**

```css
.layout > * {
    min-width: 0;
}
```

效果類似，適合不方便改 `grid-template-columns` 的時候。這跟 flex 裡省略號不出現是同一個坑：預設的最小寬度是內容大小。

**解法三：子元素自己處理溢出**

只加 `overflow: hidden` 或 `overflow: auto` 在子元素上，也會讓它的最小寬度不再是內容大小。但比較隱晦，看程式碼的人不一定知道是為了這個原因，建議還是用前兩種，意圖清楚。

## 例子與對比

### 用 grid 做面板切換的動畫
`grid-template-columns` 是可以做 transition 的，只要前後的軌道數量一樣、值能互相插值。搭配 CSS 變數，就能做出「依狀態切換哪幾個面板展開」的效果。下面是一個設定頁的實際寫法：五個欄位，前四個預設寬度 0，依狀態把對應的欄打開。

```scss
.info-box {
    display: grid;
    grid-template-areas: "datepicker schoolpicker meal-provider grade-setting status";
    grid-template-columns: var(--col1, 0) var(--col2, 0) var(--col3, 0) var(--col4, 0) minmax(0, 1fr);
    grid-auto-rows: 1fr;
    @include setSize(100%, calc(100% - 63px));
    transition: .25s $cubic-FiSo;

    &.datepicker {
        --col1: 440px;
        --col2: 0;
        .meal-date-setting-block {
            transform: translate3d(0, 0, 0);
        }
    }
    &.schoolpicker {
        --col1: 0;
        --col2: 440px;
        .school-picker-block {
            transform: translate3d(0, 0, 0);
        }
    }
    &.meal-provider {
        --col3: 50%;
        .meal-provider-setting-block {
            transform: translate3d(0, 0, 0);
        }
    }
    &.grade-setting {
        --col3: 50%;
        --col4: 50%;
        .meal-provider-setting-block,
        .grade-setting-block {
            transform: translate3d(0, 0, 0);
        }
    }
}
```

幾個重點：

- 最後一欄是 `minmax(0, 1fr)`，就是上面那個坑的解法，主內容區才不會被裡面的表格撐開、把旁邊的面板擠掉。
- 每個狀態只改 `--col1`～`--col4` 這幾個變數，`grid-template-columns` 的計算值跟著改變，`transition` 就會讓欄寬滑動。
- 面板本身再搭配 `transform` 從外面滑進來，欄寬變化加上內容位移，兩層動畫疊起來比單純改寬度自然。
- 五個欄位的數量從頭到尾不變，只是寬度在 0 和實際值之間變化，這是能插值的前提。

### 欄寬動畫 vs 其他做法

| 做法 | 主內容會不會跟著讓位 | 寫法 |
|---|---|---|
| 面板 `position: absolute` 滑入 | 不會，面板蓋在內容上 | 簡單 |
| flex 子元素動 `width` | 會 | 每個面板各自管寬度 |
| grid 動 `grid-template-columns` | 會 | 一個地方管所有欄寬，狀態一目了然 |

需要「面板打開時主內容跟著縮」的版面，grid 這招最好管理，所有欄寬的規則都集中在一個屬性裡。

## 參考
- [Animating CSS Grid (How To + Examples)](https://css-tricks.com/animating-css-grid-how-to-examples/)

## 結論
`1fr` 撐開的問題，說穿了就是 `minmax(auto, 1fr)` 那個看不見的 `auto` 在作怪。記得-|要比例就寫 `minmax(0, 1fr)`|-，內容太寬交給子元素自己捲動。

至於欄寬動畫，grid 一個屬性管全部，比到處改 `width` 好維護太多了。fr 很大方，但它的最小值很固執。
