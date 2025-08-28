---
title: Object.Keys 偷偷幫你轉型了！
image:
description:
keywords:
author: 'Opshell'
createdAt: 2025-08-28
categories:
  - TypeScript
  - JavaScript
  - Vue
tags:
  - TypeScript
  - Vue

editLink: true
isPublished: false
---

# [Vue/TS] 為何 v-for 物件的數字 key，在 v-model 中卻變成了 string？

今天在開發時遇到一個有趣的狀況。我有一個響應式物件，其型別定義如下：

```typescript
const mealDataGroup = ref<Record<number, {
    mealData: iMealNumberData[];
    total: number;
}>>({});
```

我用 `v-for` 來渲染這個物件的內容，並搭配 `ElCheckbox` (或 Quasar 的 `q-checkbox`) 來做多選操作。

```html
<div
  v-for="(item, key) in mealDataGroup"
  :key="`meal-type-${key}`"
>
  <ElCheckbox v-model="coverMealNumberKeys" :val="key" />
  </div>
```

```typescript
// <script setup lang="ts">
const coverMealNumberKeys = ref<number[]>([]);
// 期望 coverMealNumberKeys 是一個數字陣列 number[]
// </script>
```

我**預期** `coverMealNumberKeys` 中收集到的值會是 `number[]`，但實際 `console.log` 出來的結果卻是 `string[]`。為什麼？

## 深入探討：JavaScript 的核心機制

這個問題的根源不在 Vue 或 TypeScript，而在於 **JavaScript 物件的底層運作方式**。

1.  **物件鍵 (Object Keys) 永遠是字串 (或 Symbol)**：在 JavaScript 中，物件的鍵會被隱性地轉換為字串。就算你這樣定義物件：`const obj = { 1: 'a' }`，當你試圖取得它的鍵時，例如 `Object.keys(obj)`，你會得到 `['1']`，一個包含字串的陣列。

2.  **`v-for` 的行為**：Vue 的 `v-for="(value, key) in object"` 語法，本質上是在遍歷 JavaScript 的物件。因此，它從物件中取出的 `key` 自然也是**字串**類型。

3.  **TypeScript 的角色**：TypeScript 在這裡的角色是**靜態類型檢查**。`Record<number, ...>` 這個類型告訴 TypeScript 編譯器：「嘿，請你把這個物件的 key 當作 number 來對待，如果我試圖用非數字的字串去賦值或取值，請跳出錯誤提醒我。」這在 `<script setup>` 區塊內寫邏輯時非常有用，可以提供優秀的型別提示和錯誤檢查。**然而，它並不會改變 JavaScript 在運行時的實際行為**。

簡單來說，TypeScript 是開發時的**君子協定**，而 JavaScript 運行時才是最終的**法律**。

## ElCheckbox 與 v-model 的資料流

現在我們來看看模板中發生了什麼事：

1.  `v-for` 開始遍歷 `mealDataGroup`。假設 `mealDataGroup` 的內容是 `{ 1: { ... }, 2: { ... } }`。
2.  在第一輪迴圈中，`key` 的值是 `'1'` (字串)。
3.  `<ElCheckbox :val="key" />` 這行程式碼，等同於把字串 `'1'` 傳給了 `ElCheckbox` 元件的 `val` prop。
4.  當使用者勾選這個 checkbox 時，`v-model` 指令會將這個 checkbox 的 `val` 值 (也就是字串 `'1'`) `push` 到 `coverMealNumberKeys` 陣列中。
5.  最終，`coverMealNumberKeys.value` 就變成了 `['1']`，一個 `string[]`。

## 解決方案

了解了問題根源後，解決方案就很簡單了。我們需要在資料傳遞的過程中，明確地將類型轉回來。

### 方案一：在模板中直接轉換 (推薦)

這是最直接、最清晰的方法。在綁定 `val` 時，手動將 `key` 轉換成 `number`。

```html
<div
    v-for="(item, key) in mealDataGroup"
    :key="`meal-type-${key}`"
>
    <ElCheckbox v-model="coverMealNumberKeys" :val="Number(key)" />

    <span class="meal-type">
      {{ receiverMealTypeOptions.find(option => option.id === Number(key))?.name || '未知餐別' }}
    </span>
    <span class="number">{{ item.total }}人</span>
</div>
```

**優點**：

  * **問題在源頭解決**：確保進入 `v-model` 陣列的資料型別從一開始就是正確的。
  * **程式碼可讀性高**：其他協作者能一眼看出這裡進行了型別轉換。
  * **維護資料模型純淨**：`coverMealNumberKeys` 的型別始終是我們期望的 `number[]`，不需要在其他地方做額外處理。

### 方案二：提交或使用資料時再轉換 (不推薦)

你也可以讓 `coverMealNumberKeys` 保持 `string[]`，然後在需要使用這些資料（例如發送 API請求）時再進行轉換。

```typescript
// 在 script 中
function submitData() {
    const numericKeys = coverMealNumberKeys.value.map(key => Number(key));
    // 使用 numericKeys 去發送請求
    api.post({ mealTypes: numericKeys });
}
```

**缺點**：

  * **資料型別不一致**：在應用程式的生命週期中，同一份資料卻是 `string[]` 型別，增加了心智負擔。
  * **容易遺漏**：你必須在所有用到此資料的地方都記得進行轉換，非常容易出錯，不利於多人協作。

## 總結

這次的經驗再次提醒了我，身為一個同時使用 TypeScript 和 Vue 的開發者，必須時刻清楚兩件事：

1.  **TypeScript 的靜態分析範圍**：它主要作用於開發和編譯階段。
2.  **JavaScript 的運行時行為**：這是程式最終執行的邏輯。

當模板 (`.vue` file) 和腳本 (`<script setup>`) 互動時，尤其是在處理原生 HTML 特性或像 `v-for` 這樣的底層機制時，JavaScript 的運行時行為往往佔據主導地位。將 `key` 明確轉換為 `Number(key)` 是最符合**效能**、**多人協作**和**程式可讀性**原則的最佳實踐。
