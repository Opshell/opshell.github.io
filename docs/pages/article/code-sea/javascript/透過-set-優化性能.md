---
title: 日期全選的兩個坑：用 Set 加速過濾，也別只比長度
image: ''
description: '行事曆的「全選」按鈕：可選日期用 Array.includes 過濾是 O(n × m)，換成 Set 變 O(n + m)；判斷「是否已全選」只比長度會誤判，改成用 Set 逐一確認。最後順手修掉直接共用 computed 陣列的 reference 坑。'
keywords: ''
author: Opshell
createdAt: '2025-08-25'
categories:
  - JavaScript
tags:
  - JavaScript
  - TypeScript
  - Vue
  - 效能
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的筆記與程式碼寫成全文，補上全選判斷的誤判原因、reference 共用的坑與效率比較。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
`Set` 系列的第三集。前兩集是 [Object.keys 偷偷幫你轉型了](./object-keys-偷偷幫你轉型了) 和 [修好型別錯誤，再用 Set 把查找變 O(1)](./透過-set-優化性能-2)，處理的是勾選清單；這集換一個常見的情境：行事曆上的「全選日期」按鈕。

需求很普通：月曆上有一堆日期，其中某些日子不能選（假日、已額滿之類的 `excludeDays`），旁邊有一顆「全選」，按一下全選、再按一下全部取消。寫起來不難，但有兩個地方很容易在資料一多、或資料一髒的時候出事。
:::

## 懶人包
- 在 `filter` 裡用 `excludeDays.includes()` 是 O(n × m)，先把 `excludeDays` 轉成 `Set` 再 `has()`，整體降到 O(n + m)。
- 「是否已全選」只比長度會誤判：長度剛好一樣、內容卻不一樣的時候，它會說你全選了。
- 正確的判斷是「每一個可選日期都在已選裡面」，用 `Set` 逐一確認。
- 全選時別把 computed 的陣列直接塞給 `selectedDates`，給一份複本，不然兩邊共用同一個 reference。

## 技術拆解

### 原本的寫法
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

能動，但有兩個問題。

### 問題一：過濾操作的效率
`canSelectDates` 中的 `excludeDays.value.includes(day.date)` 使用的是 `Array.includes`，它是從頭一個一個找，時間複雜度為 O(m)，其中 m 是 `excludeDays.value` 的長度。外面又包了一層跑 n 次的 `filter`，總時間複雜度就是 O(n × m)。

在一般情況下（`calendarData` 和 `excludeDays` 只有數十到數百個日期），性能是足夠的，`computed` 的快取機制也能有效減少重複計算。但如果資料量很大（例如一次載入好幾年、數千個日期），或 `excludeDays` 較長，`Array.includes` 的線性查找就可能成為瓶頸，這時候建議用 `Set` 優化：

```ts
const canSelectDates = computed(() => {
    const excludeDaysSet = new Set(excludeDays.value); // O(m)
    return Object.values(calendarData.value) // O(n)
        .filter(day => !excludeDaysSet.has(day.date)) // O(n)，每次 has 是 O(1)
        .map(day => day.date); // O(n)
});
```

這將 `canSelectDates` 的時間複雜度從 O(n × m) 降到 O(n + m)。

`Array.includes` 像拿著名單從第一行唸到最後一行，`Set.has` 像櫃檯直接查索引，報名字就知道在不在。

::: tip
這招成立的前提是日期是字串（例如 `'2025-08-25'`）。`Set` 比對物件是看 reference，如果你的日期是 `Date` 物件，兩個同一天的 `new Date()` 在 `Set` 眼裡是兩個不同的東西，要先轉成字串或時間戳。
:::

### 問題二：嚴格的全選檢查
`isSelectAlled` 只比較長度。原本筆記裡擔心的是「`selectedDates` 跟 `canSelectDates` 日期相同但順序不同」會誤判，不過只比長度的話，順序其實不影響結果；-|真正會誤判的是長度剛好一樣、內容卻不一樣|-，例如：

- 上個月勾的某天，這個月被加進 `excludeDays`，但還留在 `selectedDates` 裡。
- 某段程式不小心把同一天 push 了兩次。

這兩種情況長度都可能剛好對上，`isSelectAlled` 就會說「已全選」，按鈕狀態跟畫面上的勾勾對不起來。

筆記裡的第一版修正是用 `Set` 嚴格比較：

```ts
const isSelectAlled = computed(() => {
    if (Object.keys(calendarData.value).length === 0) { return false; }

    const selectableDatesSet = new Set(canSelectDates.value);
    return selectedDates.value.length === canSelectDates.value.length
        && selectedDates.value.every(date => selectableDatesSet.has(date));
});
```

這確保 `selectedDates` 裡的每一天都是可選的日期，擋掉了第一種情況。但重複的那種還是會漏：`canSelectDates` 是 `['08-01', '08-02']`、`selectedDates` 是 `['08-01', '08-01']`，長度相同、每個都在 `Set` 裡，結果還是 `true`。

換個方向想會更簡單：「全選」的定義是-|每一個可選日期都已經被選了|-，那就從可選日期出發去檢查：

```ts
const isAllSelected = computed(() => {
    if (canSelectDates.value.length === 0) { return false; }

    const selectedSet = new Set(selectedDates.value);
    return canSelectDates.value.every(date => selectedSet.has(date));
});
```

重複、多出來的舊資料都不影響判斷。順便注意開頭的檢查改成看 `canSelectDates`：如果整個月都被排除，`calendarData` 有資料但沒有任何可選日期，`every` 對空陣列會回傳 `true`，全選鈕就會莫名其妙亮起來。

### 問題三：共用了同一個陣列
筆記裡的最終版在 `selectAllHandler` 加了幾個提早 return 的檢查：

```ts
if (canSelectDates.value === selectedDates.value) { return; }
selectedDates.value = canSelectDates.value;
```

這裡的 `===` 比的是 reference，不是內容，它會成立正是因為下一行把 `canSelectDates.value` 這個陣列本身塞給了 `selectedDates`。兩個變數從此指向同一個陣列，如果別的地方用 `push`、`splice` 去改 `selectedDates.value`，改到的其實是 `computed` 快取起來的那份結果。~~computed：我只是個快取，為什麼要承受這些。~~

全選時給一份複本就好，那個 reference 檢查也就不需要了：

```ts
selectedDates.value = [...canSelectDates.value];
```

## 例子與對比

### 最終結果
```ts
const canSelectDates = computed(() => {
    const excludeDaysSet = new Set(excludeDays.value); // 使用 Set 最佳化查找
    return Object.values(calendarData.value)
        .filter(day => !excludeDaysSet.has(day.date)) // O(1) 查詢
        .map(day => day.date);
});

// 是否已全選：每個可選日期都已經在已選裡面
const isAllSelected = computed(() => {
    if (canSelectDates.value.length === 0) { return false; }

    const selectedSet = new Set(selectedDates.value);
    return canSelectDates.value.every(date => selectedSet.has(date));
});

function selectAllHandler() {
    if (canSelectDates.value.length === 0) { return; }

    // 已全選就全部取消，否則全選
    selectedDates.value = isAllSelected.value ? [] : [...canSelectDates.value];
}
```

### 執行效率比較

| 操作 | 原本 | 改用 Set |
| :--- | :--- | :--- |
| 過濾可選日期 | O(n × m) | O(n + m) |
| 判斷是否全選 | O(1)，但會誤判 | O(n + k)，k 是已選數量 |
| 全選 | O(1)，共用 reference | O(n)，複製一份 |

全選判斷和全選動作看起來變「慢」了，但 O(1) 的那個答案是錯的，快也沒用；而且 n 是一個畫面上的日期數，複製幾百個字串對瀏覽器來說連眼睛都不用眨。

真正會差很多的是第一列。想自己感受一下可以在 DevTools 貼這段：

```ts
const days = Array.from({ length: 5000 }, (_, i) => `day-${i}`);
const excludeDays = days.filter((_, i) => i % 3 === 0);

let start = performance.now();
days.filter(day => !excludeDays.includes(day));
console.log('Array.includes', performance.now() - start);

start = performance.now();
const excludeDaysSet = new Set(excludeDays);
days.filter(day => !excludeDaysSet.has(day));
console.log('Set.has', performance.now() - start);
```

實際數字看機器，但兩者的差距會隨著 n 和 m 一起放大，資料量翻倍，`includes` 版本大約慢四倍。

::: tip
比較新的執行環境（Node 22+、近期的主流瀏覽器）已經有 `Set` 的集合方法，全選判斷可以直接寫成 `new Set(canSelectDates.value).isSubsetOf(new Set(selectedDates.value))`。在 `TypeScript` 裡要把 `tsconfig` 的 `lib` 調到有包含它的版本，支援度以官方文件為準。
:::

## 結論
全選這顆按鈕很小，但它同時考了效率（查找用 `Set`）、正確性（判斷「全選」要看內容不是長度）和 reference（別讓兩個變數抱著同一個陣列）。

`Set` 在這集又出場了兩次，一次為了快、一次為了對。~~這系列再寫下去，可能要改名叫「Set 的一百種用法」了。~~
