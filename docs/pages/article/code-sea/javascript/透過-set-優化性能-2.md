---
title: 透過 set 優化性能 2
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-08-27'
categories:
  - 未分類
tags:
  - null
editLink: true
isPublished: false
---
# TypeScript 程式碼分析與優化：從型別錯誤到性能提升

本文檔旨在分析一段常見的 TypeScript 程式碼片段，解決其型別錯誤，並提供兩種優化方案以提高程式碼的可讀性與執行性能。

## 1. 原始程式碼與問題

開發者在處理物件資料時，遇到了以下 TypeScript 型別錯誤。

**原始程式碼：**

```typescript
const selectedIds = Object.keys(mealDataGroup.value)
      .filter(key => coverMealNumberKeys.value.includes(key)) // <- 錯誤發生於此行
      .map((key) => {
          return mealDataGroup.value[Number(key)]?.mealData.map((item: iMealNumberData) => {
              if (item.grades.length > 0) {
                  return item.grades.map(grade => grade.id);
              }
              return [];
          }).flat();
      })
      .filter(Boolean)
      .flat();
```

**錯誤訊息：**

> 類型 'string' 的引數不可指派給類型 'number' 的參數。
> (Argument of type 'string' is not assignable to parameter of type 'number'.)

---

## 2. 錯誤原因分析

這個錯誤的根本原因在於 JavaScript/TypeScript 對物件鍵（Object Keys）的處理機制：

1.  **`Object.keys()` 的回傳型別**：無論物件的鍵看起來是數字還是字串，`Object.keys()` 方法的回傳值**永遠是一個字串陣列 (`string[]`)**。例如，`Object.keys({ 101: 'a', 102: 'b' })` 會得到 `['101', '102']`。

2.  **`Array.prototype.includes()` 的嚴格型別檢查**：假設 `coverMealNumberKeys.value` 是一個數字陣列 (`number[]`)，TypeScript 會在編譯時期進行嚴格的型別檢查。當你試圖在一個 `number[]` 中搜尋一個 `string` 型別的 `key` 時，TypeScript 會因為型別不匹配而報錯，以防止潛在的執行期 bug。

簡單來說，程式碼試圖在一個**數字陣列**中尋找一個**字串**，導致了型別錯誤。

---

## 3. 程式碼重構與優化方案

原始程式碼的目標是：從 `mealDataGroup` 中篩選出 key 存在於 `coverMealNumberKeys` 的項目，然後將這些項目中所有 `grades` 的 `id` 收集並扁平化成一個陣列。

以下提供兩種優化方案。

### 方案一：優化可讀性 (使用 `flatMap`)

此方案修正了型別錯誤，並使用 `flatMap` 來簡化 `map` 後再 `flat` 的巢狀結構，讓程式碼更簡潔易懂。

```typescript
// 假設的資料結構
interface iGrade { id: number; }
interface iMealNumberData { grades: iGrade[]; }
const mealDataGroup = { value: { 101: { mealData: [{ grades: [{ id: 1 }, { id: 2 }] }] }, 102: { mealData: [{ grades: [] }, { grades: [{ id: 3 }] }] }, 201: { mealData: [{ grades: [{ id: 4 }] }] } } };
const coverMealNumberKeys = { value: [101, 102] };

// 優化後的寫法
const selectedIds = Object.keys(mealDataGroup.value)
  // 1. 先將所有 string keys 轉成 number
  .map(Number)
  // 2. 現在型別正確，可以正常篩選
  .filter(keyAsNumber => coverMealNumberKeys.value.includes(keyAsNumber))
  // 3. 使用 flatMap 處理第一層扁平化
  .flatMap(key => {
    const mealGroup = mealDataGroup.value[key];
    if (!mealGroup?.mealData) {
      return [];
    }
    // 4. 再次使用 flatMap 處理內層，直接取出所有 id
    return mealGroup.mealData.flatMap(item => item.grades.map(grade => grade.id));
  });

console.log(selectedIds); // 輸出: [1, 2, 3]
```

**優點：**
- **型別安全**：透過 `map(Number)` 確保了型別的一致性。
- **可讀性高**：`flatMap` 明確表達了「遍歷並展開」的意圖，取代了原本複雜的鏈式呼叫。
- **程式碼更簡潔**：減少了 `.flat()` 和 `.filter(Boolean)` 的使用。

### 方案二：兼顧性能的優化 (使用 `Set`)

當資料量龐大時，在迴圈中重複呼叫 `Array.prototype.includes()`（時間複雜度 $O(n)$）會造成性能瓶頸。我們可以將 `coverMealNumberKeys` 轉換成 `Set`，讓查詢操作的時間複雜度降至 $O(1)$。

```typescript
// (接續上面的型別定義)

// 性能優化後的寫法
// 1. 創建一個 Set 以便進行 O(1) 的快速查找
const coverKeysSet = new Set(coverMealNumberKeys.value);

const selectedIdsPerf = Object.keys(mealDataGroup.value)
    .flatMap((key) => {
        const keyAsNumber = Number(key);

        // 2. 使用 Set.has() 進行高效篩選
        if (!coverKeysSet.has(keyAsNumber)) {
            return []; // 若 key 不匹配，flatMap 會自動移除此空陣列
        }

        const mealGroup = mealDataGroup.value[keyAsNumber];
        if (!mealGroup?.mealData) {
            return [];
        }

        // 3. 同樣使用 flatMap 提取所有 grade id
        return mealGroup.mealData.flatMap(item => item.grades.map(grade => grade.id));
    });

console.log(selectedIdsPerf); // 輸出: [1, 2, 3]
```

**優點：**
- **性能極佳**：對於大型資料集，使用 `Set` 進行查找遠比 `Array.includes` 高效。
- **邏輯清晰**：將篩選邏輯 `if (!coverKeysSet.has(...))` 直接整合在 `flatMap` 中，保持了鏈式呼叫的流暢性。

---

## 4. 總結與建議

| 特性 | 原始碼 | 方案一 (可讀性優化) | 方案二 (性能優化) |
| :--- | :--- | :--- | :--- |
| **型別問題** | 存在錯誤 | 已修正 | 已修正 |
| **可讀性** | 較差 | **優** | **優** |
| **性能** | 差 (尤其在資料量大時) | 中等 | **極佳** |
| **核心技術** | `filter`, `map`, `flat` | `map(Number)`, `filter`, `flatMap` | `Set`, `flatMap` |

### 建議

- **一般情況**：對於中小型資料集，**方案一** 是最佳選擇。它在修正錯誤的同時，極大地提升了程式碼的可讀性和簡潔性。
- **性能敏感場景**：如果 `coverMealNumberKeys` 或 `mealDataGroup` 的資料量可能很大（例如超過千筆），強烈建議採用**方案二**，以避免潛在的性能問題。
