---
title: 'SCSS 的高階用法：用 map 和迴圈排出六顆骰子'
image: ''
description: 'SCSS 的高階用法說穿了就是「運算 + map 管理」，很多 UI 框架的底層就是這樣產生樣式的。用排出六顆骰子點數這個小練習，示範 map、@each、@for 和插值怎麼一起用。'
keywords: ''
author: Opshell
createdAt: '2024-09-20'
categories:
  - 未分類
tags:
  - SCSS
  - Sass
  - CSS
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的幾段觀點寫成全文，補了骰子點數的完整範例。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
這幾年原子化 CSS（Tailwind、UnoCSS）當道，很多人覺得 SCSS 已經沒什麼好學的，頂多拿來寫巢狀和變數。但 SASS 真正有趣的地方在後面：它是一個能做運算、能管資料的語言，一整個系列的作品都能靠它變出來。這篇用一個簡單的練習來展示：用 SCSS 排出六顆骰子的點數。
:::

## 懶人包
- SASS 的高階用法其實就是那樣：-|運算和 map 管理|-。把規則寫成資料，再用迴圈產生 CSS。
- 蠻多 UI 框架底層實踐的方式就是這種運算和 map 管理，例如 Bootstrap 的 utilities 就是一張大 map 產生出整套 class。
- 現在大家都愛原子化 CSS，不是特別需要客製的就不會用到這些；但要做主題系統、元件庫，這套還是很好用。
- 骰子的練習：九宮格的位置寫成一張 map、六個面各自要用哪幾格寫成另一張 map，兩層迴圈就把 6 種樣式全部產出來。

## 觀點拆解

### 高階用法說穿了就是兩件事
寫 SCSS 寫久了會發現，所謂「進階」的寫法，核心只有兩個：

1. **運算**：數字可以加減乘除、可以判斷、可以跑迴圈。
2. **map 管理**：把一堆相關的值收成一張 key-value 表，用的時候查表。

兩個合起來，就是「把規則寫成資料，讓程式產生 CSS」。手寫 CSS 像一磚一瓦地蓋房子；用 map 加迴圈，比較像先畫好設計圖，再交給工廠量產。

### UI 框架就是這樣做的
打開大部分 CSS 框架的原始碼，會看到一模一樣的模式：一張顏色 map、一張間距 map、一張斷點 map，然後一堆 `@each` 把它們展開成 `.text-primary`、`.mt-3`、`.d-md-flex` 這種 class。Bootstrap 的 utilities API 甚至讓你直接改那張 map 來增減 class。

### 那為什麼現在很少人寫
因為原子化 CSS 把這件事做得更徹底：工具直接掃你用了哪些 class，按需產生，連 map 都不用自己寫。所以不是特別需要客製的專案，確實就用不到 SCSS 的這一面。

但只要需求是「這套樣式規則是我們自己定的」（自家設計系統、多主題、元件庫），把規則收進 map、用迴圈產生，依然是最好維護的做法。

## 例子與對比

### 練習：六顆骰子的點數
先想清楚資料長什麼樣子。骰子的點都落在一個 3 × 3 的九宮格上：

```
tl  tc  tr
ml  mc  mr
bl  bc  br
```

每一面只是「用了九宮格裡的哪幾格」而已。那就寫兩張 map：

```scss
@use 'sass:map';
@use 'sass:list';

// 九宮格的位置：(第幾行, 第幾欄)
$positions: (
    'tl': (1, 1), 'tc': (1, 2), 'tr': (1, 3),
    'ml': (2, 1), 'mc': (2, 2), 'mr': (2, 3),
    'bl': (3, 1), 'bc': (3, 2), 'br': (3, 3)
);

// 每一面要用哪幾格
$faces: (
    1: ('mc',),
    2: ('tl', 'br'),
    3: ('tl', 'mc', 'br'),
    4: ('tl', 'tr', 'bl', 'br'),
    5: ('tl', 'tr', 'mc', 'bl', 'br'),
    6: ('tl', 'tr', 'ml', 'mr', 'bl', 'br')
);
```

`('mc',)` 後面那個逗號是為了讓 Sass 知道這是「只有一個元素的 list」，不是一個字串。

接著是骰子本體和兩層迴圈：

```scss
.dice {
    display: grid;
    grid-template: repeat(3, 1fr) / repeat(3, 1fr);
    gap: 4px;
    width: 80px;
    padding: 10px;
    aspect-ratio: 1;
    background: #ffffff;
    border-radius: 12px;
}

.dice__dot {
    aspect-ratio: 1;
    background: #333333;
    border-radius: 50%;
}

@each $face, $dots in $faces {
    .dice--#{$face} {
        @for $i from 1 through list.length($dots) {
            $position: map.get($positions, list.nth($dots, $i));

            .dice__dot:nth-child(#{$i}) {
                grid-row: list.nth($position, 1);
                grid-column: list.nth($position, 2);
            }
        }
    }
}

// 一點是紅的，這是骰子的規矩
.dice--1 .dice__dot {
    background: #d33a2c;
}
```

元件端只要產生對應數量的點：

```vue
<script setup lang="ts">
defineProps<{
    face: 1 | 2 | 3 | 4 | 5 | 6;
}>();
</script>

<template>
    <div class="dice" :class="`dice--${face}`">
        <span
            v-for="n in face"
            :key="n"
            class="dice__dot"
        />
    </div>
</template>
```

編譯出來的 CSS 會是 `.dice--3 .dice__dot:nth-child(2) { grid-row: 2; grid-column: 2; }` 這樣的規則，6 面加起來 21 條，手寫的話光對位置就會對到眼花。

### 小細節：插值和 nth-child
`:nth-child(#{$i})` 這裡用了插值 `#{}`，把 Sass 的變數變成選擇器裡的文字。要注意 CSS 變數（`var(--i)`）不能放進 `:nth-child()`，選擇器裡只能是編譯時就確定的值，所以這類「依序號產生選擇器」的事，只能交給 Sass 這種預處理器。

### 手寫 vs map 產生

| | 手寫 21 條規則 | map + 迴圈 |
|---|---|---|
| 想把骰子改成 4 × 4 | 全部重寫 | 改 `$positions` |
| 想加一個 7 點的面 | 再寫 7 條 | `$faces` 加一行 |
| 一眼看懂每一面的排法 | 要對照 grid 座標 | 直接讀 `('tl', 'mc', 'br')` |

另外一提，現在的 Dart Sass 建議用 `@use 'sass:map'` 搭配 `map.get()`，舊的全域函式 `map-get()` 已經被標示為棄用，新程式碼就直接用模組的寫法吧。

## 結論
SASS 真的很有趣。原子化 CSS 讓大部分人不需要再寫這些，但「把規則寫成資料、讓程式產生樣式」這個思路，不管換到哪個工具都用得上。

骰子排出來之後，下一步要不要用 SCSS 寫個擲骰動畫？~~（好啦，那就真的是在玩了）~~
