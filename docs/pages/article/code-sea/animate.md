---
title: animate
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-07-22'
categories:
tags:
editLink: true
isPublished: false
---
```ts
// [M] 過渡效果相關狀態
const isTransitioning = ref(false);
const transitionDirection = ref<'prev' | 'next' | null>('next');
const previousStartDate = ref(startDate);
const transitionEndTimer = ref<ReturnType<typeof setTimeout> | null>(null); // 計時器 ID
// [-] "日"動畫參數
const baseCellDelay = 25; // ms - 每個單元格之間的基礎延遲，可調整速度
const cellAnimationDuration = 350; // ms - 單個單元格遮罩動畫的持續時間 (需與 CSS 匹配)

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
