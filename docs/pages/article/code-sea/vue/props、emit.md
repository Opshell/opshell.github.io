---
title: 'props 與 emit 的型別寫法：從 withDefaults 到 3.5 的響應式解構'
image: ''
description: '在 script setup 裡用 TypeScript 宣告 props 與 emit：型別式宣告、預設值的兩種寫法（withDefaults 與 Vue 3.5 的解構預設值）、解構後怎麼保持響應，以及 emit 的具名元組語法。'
keywords: ''
author: Opshell
createdAt: '2024-09-30'
categories:
  - Vue
tags:
  - Vue
  - TypeScript
  - props
  - emit
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有三個參考連結（官方 TypeScript props、響應式解構、雙向綁定），依主題寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
props 與 emit 是元件溝通最基本的兩條路，但寫法這幾年一直在變：從 `props: { ... }` 物件、到 `defineProps<{...}>()` 型別宣告、到 `withDefaults`，再到 Vue 3.5 讓解構也能保持響應。常見的情況是一個專案裡三種寫法並存，新人看了很困惑。這篇用 2026 年的現況整理一次，寫給在 Vue 3 + TypeScript 專案裡寫元件的人。
:::

## 懶人包
- 用型別宣告：`defineProps<{ title: string; count?: number }>()`，型別就是文件。
- Vue 3.5 起，可以直接解構並給預設值：`const { count = 0 } = defineProps<...>()`，解構出來的值**仍然是響應式的**。
- 解構後的 prop 傳給 `watch` 或 composable 時，要包成 getter：`watch(() => count, ...)`。
- emit 用具名元組：`defineEmits<{ change: [id: number] }>()`，參數名字會出現在型別提示裡。
- 要雙向綁定就用 `defineModel`，不要自己拼 prop + emit。

## 技術拆解

### 型別式宣告
```ts
const props = defineProps<{
    title: string;
    count?: number;
    tags?: string[];
}>();
```

`?` 就是選填，不用再寫 `required: true`。編譯器會從型別產生執行期的 props 定義。

### 預設值：兩種寫法
**Vue 3.5 以前：`withDefaults`**

```ts
const props = withDefaults(defineProps<{
    count?: number;
    tags?: string[];
}>(), {
    count: 0,
    tags: () => [] // 物件、陣列要用函式回傳
});
```

**Vue 3.5 起：解構預設值**

```ts
const { count = 0, tags = [] } = defineProps<{
    count?: number;
    tags?: string[];
}>();
```

以前解構 props 會失去響應性，這是新手很常踩的坑。3.5 之後編譯器會把 `count` 自動改寫成 `props.count`，所以解構出來的值還是會跟著父層更新，陣列預設值也不用再包函式。

### 解構後的陷阱
```ts
const { count } = defineProps<{ count: number }>();

watch(count, () => {}); // 錯：等於 watch 一個數字，編譯時會報錯
watch(() => count, () => {}); // 對：包成 getter
```

傳給 composable 也一樣：`useSomething(() => count)`，composable 那邊用 `toValue()` 取值。

### emit 的型別
```ts
const emit = defineEmits<{
    change: [id: number];
    'update-filter': [key: string, value: string | null];
    close: [];
}>();

emit('change', 42);
emit('update-filter', 'status', null);
```

具名元組 `[id: number]` 比舊的呼叫簽章寫法（`(e: 'change', id: number): void`）短，而且滑鼠移上去就看得到參數名字。

## 例子與對比

### 一個完整的元件
```vue
<!-- ProductCard.vue -->
<script setup lang="ts">
import { computed } from 'vue';

const { name, price, discount = 0, tags = [] } = defineProps<{
    name: string;
    price: number;
    discount?: number;
    tags?: string[];
}>();

const emit = defineEmits<{
    'add-to-cart': [name: string, finalPrice: number];
}>();

const finalPrice = computed(() => Math.round(price * (1 - discount)));
</script>

<template>
    <article class="product">
        <h3>{{ name }}</h3>
        <p>{{ finalPrice }} 元</p>
        <ul>
            <li v-for="tag in tags" :key="tag">{{ tag }}</li>
        </ul>
        <button type="button" @click="emit('add-to-cart', name, finalPrice)">加入購物車</button>
    </article>
</template>
```

`computed` 裡直接用 `price`、`discount`，父層改了價格，`finalPrice` 也會跟著變。

### 三個世代的寫法對照
| | 物件式 `props: {}` | `withDefaults` | 3.5 解構 |
|---|---|---|---|
| 型別 | 用 `PropType` 轉 | 型別宣告 | 型別宣告 |
| 預設值 | `default:` | 第二個參數 | `=` 直接寫 |
| 陣列預設值 | 要函式 | 要函式 | 直接 `[]` |
| 取值 | `props.count` | `props.count` | `count` |
| 傳給 watch | `() => props.count` | `() => props.count` | `() => count` |

專案升到 3.5 之後，新元件用解構寫法最清爽；舊的 `withDefaults` 不用急著改，能跑就讓它跑。

### 雙向綁定交給 defineModel
如果你的 prop + emit 只是為了做 `v-model`，請直接看 [defineModel](./defineModel)，一行解決。

## 結論
props 往下、emit 往上，這條規則十年沒變，變的只是寫起來越來越省力。把型別當成元件的說明書寫清楚，接手的人連文件都不用翻 ~~（雖然他本來也不會翻）~~。

延伸閱讀：
- [Vue 官方：Typing Component Props](https://vuejs.org/guide/typescript/composition-api#typing-component-props)
- [Vue 官方：Reactive Props Destructure](https://vuejs.org/guide/components/props.html#reactive-props-destructure)
- [原本參考的雙向綁定文章](https://vocus.cc/article/6659ef25fd89780001f95e3e)
