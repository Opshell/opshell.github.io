---
title: '月曆換月的波浪轉場：用 CSS 變數錯開每一格的動畫'
image: ''
description: '換月份時讓 42 個日期格依序翻過去：JavaScript 只算每一格的延遲，丟進 CSS 變數，動畫本身交給 CSS。順便聊怎麼算總時長、怎麼讓延遲表更好維護。'
keywords: ''
author: Opshell
createdAt: '2025-07-22'
categories:
  - 未分類
tags:
  - CSS
  - animation
  - Vue
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的月曆轉場程式碼寫成全文，補了 CSS 端、總時長計算與延遲表的改寫。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
月曆換月份是很常見的需求，最偷懶的做法是整塊淡出淡入，但 42 格一起閃一下，看起來就像畫面當機重整。這篇整理一個「每一格依序翻過去」的波浪轉場，重點是 JavaScript 跟 CSS 怎麼分工，寫給想讓元件動得比較有質感、又不想引入動畫函式庫的人。
:::

## 懶人包
- 每一格的動畫完全一樣，差別只在「什麼時候開始」，所以 JavaScript 只負責算延遲，用 CSS 變數 `--cell-transition-delay` 傳下去。
- 延遲 = 欄的延遲（依換月方向決定從左到右或從右到左）＋ 行的延遲（讓每一行起跑時間不同，做出波浪感）。
- 轉場結束的計時器要用「最大延遲 + 單格動畫時間」來算，不然會提早把狀態收掉。
- 行延遲用一張表取代一串 `if`，之後要調節奏只改數字。

## 技術拆解

### 先把狀態準備好
轉場需要知道三件事：現在是不是正在轉、往哪個方向轉、轉完要把誰收掉。

```ts
// [M] 過渡效果相關狀態
const isTransitioning = ref(false);
const transitionDirection = ref<'prev' | 'next' | null>('next');
const previousStartDate = ref(startDate);
const transitionEndTimer = ref<ReturnType<typeof setTimeout> | null>(null); // 計時器 ID
// [-] "日"動畫參數
const baseCellDelay = 25; // ms - 每個單元格之間的基礎延遲，可調整速度
const cellAnimationDuration = 350; // ms - 單個單元格遮罩動畫的持續時間 (需與 CSS 匹配)
```

`previousStartDate` 是用來在轉場期間把「舊月份」留在畫面上的，新舊兩層疊在一起，新的一格一格蓋過去，舊的才收掉。

### 每一格的延遲怎麼算
月曆是 7 欄 × 6 行，用 `index % 7` 拿到欄、`Math.floor(index / 7)` 拿到行：

```ts
// 月曆轉場特效
function getCellStyle(index: number): Record<string, string> {
    let delayMs = 0;

    const columnIndex = index % 7;
    const rowIndex = Math.floor(index / 7); // 行索引，備用

    // 計算基於列的延遲
    if (transitionDirection.value === 'next') { // 往右切 (下個月)，從左到右延遲
        delayMs = columnIndex * baseCellDelay;
    } else { // 往左切 (上個月)，從右到左延遲
        delayMs = (6 - columnIndex) * baseCellDelay;
    }

    // (可選) 加入基於行的延遲，製造更複雜的波浪效果
    // 每行啟動時間不一樣
    if (rowIndex === 0) {
        delayMs += 150;
    } else if (rowIndex === 1) {
        delayMs += 50;
    } else if (rowIndex === 3) {
        delayMs += 100;
    } else if (rowIndex === 4) {
        delayMs += 200;
    } else if (rowIndex === 5) {
        delayMs += 250;
    }

    return {
        '--cell-transition-delay': `${delayMs}ms`
    };
}
```

欄的部分很直覺：去下個月，波浪從左邊開始往右推；回上個月就反過來，方向感跟使用者按的箭頭一致。

行的部分比較有趣，仔細看數字：第 3 行（`rowIndex === 2`）是 0，第 2 行 50、第 4 行 100、第 1 行 150、第 5、6 行 200、250。也就是說波浪是-|從中間偏上的那一行先動，再往上下擴散|-，像石頭丟進水裡，而不是單純從左上角掃到右下角。

### CSS 只管「怎麼動」
JavaScript 算完的延遲用 CSS 變數掛上去，動畫本身寫在 CSS：

```vue
<template>
    <div
        v-for="(day, index) in days"
        :key="day.key"
        class="calendar__cell"
        :class="{ 'is-transitioning': isTransitioning }"
        :style="getCellStyle(index)"
    >
        {{ day.label }}
    </div>
</template>
```

```scss
.calendar__cell {
    clip-path: inset(0 0 0 0);
    transition: clip-path 350ms cubic-bezier(.4, 0, .2, 1);
    transition-delay: var(--cell-transition-delay, 0ms);

    &.is-transitioning {
        clip-path: inset(0 100% 0 0);
    }
}

@media (prefers-reduced-motion: reduce) {
    .calendar__cell {
        transition: none;
    }
}
```

為什麼不在 JavaScript 裡直接設 `transitionDelay`？因為用變數的話，CSS 那邊想拿延遲去做別的事（例如透明度晚一點點才開始）都可以自己 `calc()`，JavaScript 不用知道動畫長什麼樣子。分工清楚，誰的鍋誰揹。

::: tip
`cellAnimationDuration` 跟 CSS 裡的 `350ms` 是同一個數字寫兩次，註解也提醒了「需與 CSS 匹配」。如果想只寫一次，可以反過來由 JavaScript 也塞一個 `--cell-duration` 變數下去。
:::

## 例子與對比

### 收尾的計時器要等最慢的那一格
`transitionEndTimer` 收掉舊月份的時機，不能用 `cellAnimationDuration` 就好，要等最後一格做完：

```ts
const maxColumnDelay = 6 * baseCellDelay; // 150ms
const maxRowDelay = 250;
const totalDuration = maxColumnDelay + maxRowDelay + cellAnimationDuration; // 750ms

function startTransition(direction: 'prev' | 'next') {
    if (transitionEndTimer.value) {
        clearTimeout(transitionEndTimer.value);
    }

    transitionDirection.value = direction;
    isTransitioning.value = true;

    transitionEndTimer.value = setTimeout(() => {
        isTransitioning.value = false;
        transitionEndTimer.value = null;
    }, totalDuration);
}
```

先 `clearTimeout` 是為了使用者連點箭頭的情況，不清的話，上一次的計時器會在這次轉到一半的時候把狀態收掉。元件卸載時也記得在 `onBeforeUnmount` 清一次。

### 一串 if vs 一張表
原本的行延遲用 `if / else if`，能動，但想調節奏的時候要在一堆條件裡找數字。改成一張表：

```ts
// 索引就是行數，數字就是那一行晚多久起跑
const rowDelays = [150, 50, 0, 100, 200, 250];

function getCellStyle(index: number): Record<string, string> {
    const columnIndex = index % 7;
    const rowIndex = Math.floor(index / 7);

    const columnOrder = transitionDirection.value === 'next' ? columnIndex : 6 - columnIndex;
    const delayMs = columnOrder * baseCellDelay + (rowDelays[rowIndex] ?? 0);

    return {
        '--cell-transition-delay': `${delayMs}ms`
    };
}
```

| | 一串 if | 一張表 |
|---|---|---|
| 看出節奏 | 要逐行讀 | 一眼看完 `[150, 50, 0, 100, 200, 250]` |
| 改成從上往下掃 | 改五個數字、小心漏掉 | 換成 `[0, 50, 100, 150, 200, 250]` |
| 算最大延遲 | 手動找 | `Math.max(...rowDelays)` |

順便 `totalDuration` 裡的 `maxRowDelay` 也能改成 `Math.max(...rowDelays)`，以後調表就不用再回頭改計時器。

## 結論
這種錯開的動畫，關鍵是想清楚「每一格的差別只有起跑時間」，JavaScript 算時間、CSS 負責動，各管各的。剩下的就是調數字調到自己滿意為止 ~~（然後花在調數字的時間比寫程式還久）~~。

波浪轉場做得好，使用者不會注意到它；做不好，大家都會注意到月曆在抽筋。
