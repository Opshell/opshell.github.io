---
title: 透過 set 優化性能
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-08-25'
categories:
  - 未分類
tags:
  - null
editLink: true
isPublished: false
---
#
```ts
const canSelectDates = computed(() => {
    return Object.values(calendarData.value)
        .filter(day => !excludeDays.value.includes(day.date))
        .map(day => day.date);
});

// 是否已全選
const isSelectAlled = computed(() => {
    if (Object.keys(calendarData.value).length === 0) { return false; }

    const diff = canSelectDates.value.length - selectedDates.value.length;
    return diff === 0;
});

function selectAllHandler() {
    if (Object.keys(calendarData.value).length === 0) { return; }

    if (isSelectAlled.value) {
        selectedDates.value = [];
    } else { // 有可選擇的日期
        selectedDates.value = canSelectDates.value;
    }
}
```

過濾操作的效率：canSelectDates 中的 excludeDays.value.includes(day.date) 仍然使用 Array.includes，其時間複雜度為 O(m)，其中 m 是 excludeDays.value 的長度。如果 calendarData.value 包含大量日期（例如，數千個），且 excludeDays.value 也很長（例如，數百個），則 filter 操作的總時間複雜度為 O(n * m)，可能成為性能瓶頸。

在一般情況下（calendarData 和 excludeDays 的資料量不大，例如數十到數百個日期），性能是足夠的，computed 屬性的快取機制能有效減少重複計算。
如果資料量很大（例如，數千個日期）或 excludeDays 較長，Array.includes 的線性查找可能導致性能問題，建議使用 Set 優化。

```ts
const canSelectDates = computed(() => {
    const excludeDaysSet = new Set(excludeDays.value); // O(m)
    return Object.values(calendarData.value) // O(n)
        .filter(day => !excludeDaysSet.has(day.date)) // O(n)
        .map(day => day.date); // O(n)
});
```

這將 canSelectDates 的時間複雜度從 O(n * m) 降到 O(n + m)。

## 嚴格的全選檢查：

isSelectAlled 僅比較長度，對於 selectedDates.value 包含與 canSelectDates.value 相同日期但順序不同的情況，可能誤判。可以使用 Set 進行嚴格比較。
示例：
```ts
javascriptconst isSelectAlled = computed(() => {
    if (Object.keys(calendarData.value).length === 0) return false;

    const selectableDatesSet = new Set(canSelectDates.value);
    return selectedDates.value.length === canSelectDates.value.length &&
           selectedDates.value.every(date => selectableDatesSet.has(date));
});
```

這確保 selectedDates.value 包含且僅包含 canSelectDates.value 中的所有日期。

## 最終結果
```ts
const canSelectDates = computed(() => {
    const excludeDaysSet = new Set(excludeDays.value);// 使用 Set 最佳化查找
    return Object.values(calendarData.value)
        .filter(day => !excludeDaysSet.has(day.date)) // O(n) 查詢
        .map(day => day.date);
});

// 是否已全選
const isAllSelected = computed(() => {
    if (Object.keys(calendarData.value).length === 0) { return false; }

    const selectableDatesSet = new Set(canSelectDates.value);
    return selectedDates.value.length === canSelectDates.value.length
        && selectedDates.value.every(date => selectableDatesSet.has(date));
});

function selectAllHandler() {
    if (Object.keys(calendarData.value).length === 0) { return; }

    // 已全選
    if (isAllSelected.value) {
        if (selectedDates.value.length === 0) { return; }
        selectedDates.value = [];
    } else {
        if (canSelectDates.value === selectedDates.value) { return; }
        selectedDates.value = canSelectDates.value;
    }
}
```

## 執行效率比較
