---
title: script setup 裡的函式：function 宣告還是箭頭函式？
image: ''
description: '在 <script setup> 裡宣告函式，const 加箭頭函式和 function 關鍵字都能用。整理兩者的實際差異，以及為什麼我跟 antfu 的 top-level-function 規則站同一邊：頂層用 function，callback 才用箭頭。'
keywords: ''
author: Opshell
createdAt: '2024-09-25'
categories:
  - vue
tags:
  - vue
  - typescript
  - ESLint
  - code-style
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有一句規則與兩個參考連結，依這個主題寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
Vue 3 的 `<script setup>` 沒有 `methods` 了，函式想怎麼宣告都可以，結果同一個專案裡常見的情況是：有人寫 `const handleSubmit = () => {}`，有人寫 `function handleSubmit() {}`，review 時還會為此吵一輪。這篇整理兩者真正的差別，以及我選邊的理由。

參考：
- https://github.com/antfu/eslint-plugin-antfu/blob/main/src/rules/top-level-function.md
- https://fadamakis.com/vue-3-function-expression-vs-function-declaration-inside-script-setup-7efc4ca05af0
:::

## 懶人包

- Top-level functions should be declared with function keyword：`<script setup>` 頂層的函式，用 `function` 宣告。
- 在 `<script setup>` 裡沒有 `this` 的問題，箭頭函式「綁定 this」這個最大的優點在這裡用不到。
- `function` 宣告有提升（hoisting）、可以寫 TypeScript 多載，掃程式碼時一眼就看得出「這是一個函式」。
- 箭頭函式留給 callback：`map`、`watch`、`computed` 裡面那種一次性的小函式。
- 規則交給 `ESLint` 的 `antfu/top-level-function` 自動修，不要靠 review 吵。

## 觀點拆解

### 為什麼會有兩派

Vue 2 的 Options API 時代，函式都寫在 `methods` 裡，沒得選。到了 Vue 3 的 `<script setup>`，頂層宣告的東西都會自動給 `template` 用，函式就只是一般的 JavaScript 函式，於是兩種寫法都合法：

```ts
// 寫法 A：const + 箭頭函式
const handleSubmit = async () => {
    await save();
};

// 寫法 B：function 宣告
async function handleSubmit() {
    await save();
}
```

`template` 裡 `@click="handleSubmit"` 兩個都能用，功能上完全一樣。那差別在哪？

### 差別一：this 在這裡根本不存在

箭頭函式最大的賣點是「不綁自己的 `this`」，在 class、Options API、事件 callback 裡很好用。但 `<script setup>` 裡你根本不會用到 `this`，所有東西都是閉包裡的變數。所以箭頭函式在這裡最重要的優點，是用不到的。

### 差別二：提升（hoisting）

`function` 宣告會被提升，可以先用後宣告；`const` 宣告的箭頭函式在宣告那一行之前碰到它，會丟 `ReferenceError`（暫時性死區）。

這讓 `function` 可以照「閱讀順序」排程式碼：上面先放主要流程，下面再放細節函式。

```ts
const list = ref<Item[]>([]);

onMounted(fetchList); // fetchList 宣告在下面也沒問題

async function fetchList() {
    const { data } = await http.get<Item[]>('/list');
    list.value = data;
}
```

換成 `const fetchList = async () => {}`，`onMounted(fetchList)` 那行就會因為暫時性死區直接爆掉。

### 差別三：TypeScript 多載

同一個函式依參數回傳不同型別時，多載只能用 `function` 宣告寫：

```ts
function format(value: number): string;
function format(value: Date): string;
function format(value: number | Date): string {
    return typeof value === 'number'
        ? value.toLocaleString('zh-TW')
        : value.toLocaleDateString('zh-TW');
}
```

箭頭函式要做到一樣的事，得先另外宣告一個多載型別再標上去，繞一大圈。

### 差別四：一眼看出是函式

`<script setup>` 的頂層通常混著 `ref`、`computed`、`watch`、函式。全部都是 `const xxx = ...` 的時候，要讀到 `=` 後面才知道它是狀態還是函式；`function` 開頭的就不用猜，編輯器的大綱、搜尋 `function ` 也都比較好找。

這點是習慣問題，但習慣就是讀程式碼的速度。

### 那箭頭函式什麼時候用

頂層以外。`map`、`filter` 的 callback、`watch` 和 `computed` 的 getter、傳給子元件的一次性函式，這些地方箭頭函式短又清楚，沒理由換。

```ts
const total = computed(() => items.value.reduce((sum, item) => sum + item.price, 0));

watch(keyword, (value) => {
    search(value);
});
```

## 例子與對比

| | `const fn = () => {}` | `function fn() {}` |
|---|---|---|
| `template` 能不能用 | 能 | 能 |
| 綁定 `this` | 不綁（但這裡用不到） | 會綁（但這裡也用不到） |
| 提升 | 沒有，宣告前用會報錯 | 有 |
| TypeScript 多載 | 要繞路 | 直接寫 |
| 掃程式碼時的辨識度 | 跟 `ref`、`computed` 長得一樣 | 一眼看出 |
| 適合 | callback、一行小函式 | 頂層函式 |

### 交給 ESLint

規則講好之後，不要靠人腦執行。`@antfu/eslint-config` 預設就開了 `antfu/top-level-function`，沒用整套設定的話也可以單獨裝 `eslint-plugin-antfu`，在 flat config 裡打開：

```js
// eslint.config.js
import antfu from 'eslint-plugin-antfu';

export default [
    {
        plugins: { antfu },
        rules: {
            'antfu/top-level-function': 'error'
        }
    }
];
```

這條規則可以自動修正，存檔就把頂層的 `const fn = () => {}` 改成 `function fn() {}`，`.vue` 檔有接上 `vue-eslint-parser` 的話也一樣有效。詳細的例外情況以規則文件為準。

## 結論

在 `<script setup>` 裡，箭頭函式的招牌優點用不到，`function` 宣告的提升、多載和辨識度倒是天天用得到。所以我的規則很簡單：頂層用 `function`，callback 用箭頭，剩下的交給 `ESLint`。

寫法統一之後，review 就可以把力氣花在邏輯上，不用再為了一個等號吵架。~~(省下來的時間可以拿去吵 tab 跟空白。)~~
