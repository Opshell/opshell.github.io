---
title: 'defineModel：v-model 不用再寫 props + emit 了'
image: ''
description: 'Vue 3.4 起穩定的 defineModel，把自訂元件 v-model 需要的 props 與 emit 縮成一行。基本用法、多個 v-model、修飾符，以及它跟手寫版本的差別。'
keywords: ''
author: Opshell
createdAt: '2025-02-12'
categories:
  - Vue
tags:
  - Vue
  - defineModel
  - v-model
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有一個參考連結，依主題從頭寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
做自訂輸入元件的時候，以前要寫一個 `modelValue` prop、一個 `update:modelValue` emit，再用 `computed` 的 get／set 把兩者接起來，每做一個元件就重複一次。Vue 3.4 把 `defineModel` 轉正之後，這些都可以收成一行。這篇寫給還在手寫 props + emit 接 `v-model` 的人。
:::

## 懶人包
- `const model = defineModel<string>()` 一行就取代 `modelValue` prop + `update:modelValue` emit。
- 它回傳一個 `ref`，讀取就是 prop 的值，寫入就會自動 emit 給父層。
- 多個 `v-model` 用名字區分：`defineModel('title')` 對應父層的 `v-model:title`。
- 修飾符可以用 `const [model, modifiers] = defineModel()` 拿到，並用 `set` 轉換。
- 要注意：父層沒有綁 `v-model` 時，它會變成元件內部的 local ref。

## 技術拆解

### 以前的寫法
```vue
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const value = computed({
    get: () => props.modelValue,
    set: (newValue) => emit('update:modelValue', newValue)
});
</script>

<template>
    <input v-model="value">
</template>
```

能用，但三段程式碼只做一件事。

### defineModel 的寫法
```vue
<script setup lang="ts">
const model = defineModel<string>({ required: true });
</script>

<template>
    <input v-model="model">
</template>
```

`defineModel` 是編譯器巨集，編譯後其實就是幫你產生了 `modelValue` prop 和 `update:modelValue` 事件，父層的用法完全不變：

```vue
<MyInput v-model="keyword" />
```

### 多個 v-model
```vue
<!-- UserForm.vue -->
<script setup lang="ts">
const firstName = defineModel<string>('firstName', { default: '' });
const lastName = defineModel<string>('lastName', { default: '' });
</script>

<template>
    <input v-model="firstName">
    <input v-model="lastName">
</template>
```

```vue
<UserForm v-model:first-name="first" v-model:last-name="last" />
```

### 修飾符
父層寫 `v-model.trim`，子層可以拿到修飾符並自己處理：

```vue
<script setup lang="ts">
const [model, modifiers] = defineModel<string, 'trim'>({
    set: (value) => (modifiers.trim ? value.trim() : value)
});
</script>
```

### 要注意的兩件事
1. **沒有綁 v-model 時是 local ref**：父層沒傳值也沒聽事件，子層改 `model` 仍然會在元件內生效，只是父層不知道。通常很方便，但如果你期待「沒綁就不能改」，要自己處理。
2. **default 要跟父層一致**：子層設了 `default`，父層卻傳 `undefined`，兩邊可能會不同步。官方文件也特別提醒過這點，以官方文件為準。

## 例子與對比

### 一個數量選擇器
```vue
<!-- QuantityPicker.vue -->
<script setup lang="ts">
const quantity = defineModel<number>({ default: 1 });

defineProps<{ max: number }>();
</script>

<template>
    <div class="quantity">
        <button type="button" :disabled="quantity <= 1" @click="quantity--">-</button>
        <span>{{ quantity }}</span>
        <button type="button" :disabled="quantity >= max" @click="quantity++">+</button>
    </div>
</template>
```

```vue
<QuantityPicker v-model="cartItem.quantity" :max="10" />
```

子層直接 `quantity++`，就會 emit 給父層更新，不用自己寫 `emit('update:modelValue', quantity + 1)`。

| | props + emit + computed | `defineModel` |
|---|---|---|
| 程式碼 | 三段 | 一行 |
| 父層用法 | `v-model` | 一樣是 `v-model` |
| 多個 v-model | 每個都要一組 prop + emit | 每個一行 |
| 修飾符 | 要自己讀 `modelModifiers` prop | 解構第二個值 |
| 版本需求 | 所有 Vue 3 | Vue 3.4+ |

### 什麼時候還是用 props + emit
`defineModel` 只適合「雙向綁定」的語意。如果子層只是要通知父層「某件事發生了」（例如送出、刪除），那是事件，請用 `defineEmits`；如果資料只往下傳，就用 `defineProps`。關於 props 與 emit 的型別寫法，可以參考 [props、emit](./props、emit)。

## 結論
`defineModel` 沒有發明新東西，它只是把我們每個元件都在重複的那三段收成一行。專案已經在 Vue 3.4 以上的話，新元件直接用它，舊元件改到的時候順手換掉就好。

延伸閱讀：[Vue3 如何用 defineModel 實作 props / emit 的父子元件傳值，讓傳值變得更方便簡單](https://muki.tw/vmodel-definemodel-props-emit/)
