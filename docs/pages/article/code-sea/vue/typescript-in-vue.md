---
title: 在 Vue 元件裡好好寫 TypeScript
image: ''
description: 'Vue 3.5 的 script setup 已經把 TypeScript 支援做得很完整：props、emits、v-model、slots、泛型元件、template ref、provide/inject 都能有型別。整理每一個該怎麼寫，以及常見的偷懶寫法。'
keywords: ''
author: Opshell
createdAt: '2024-09-26'
categories:
  - vue
tags:
  - vue
  - typescript
  - script-setup
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有一個參考連結，依主題從頭寫成全文（props、emits、defineModel、defineSlots、泛型元件、template ref、provide/inject）。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
常見的情況是：專案明明開了 `TypeScript`，打開元件一看，`defineProps` 還是 runtime 寫法、emit 沒型別、template ref 是 `ref<any>()`，`TypeScript` 在 `.vue` 檔裡只是個裝飾品。

這篇整理 `Vue 3.5` 的 `<script setup>` 裡，每一個常用的地方該怎麼把型別寫好，寫給已經會 `Vue` 也會 `TypeScript`，但兩個還沒好好合體的人。靈感來自 [Better Vue Components with TypeScript](https://fadamakis.com/better-vue-components-with-typescript-12-examples-3bf141d39784) 這篇。
:::

## 懶人包
- `defineProps`、`defineEmits` 都用-|型別參數|-寫法，型別就是唯一的規格，不用再寫一份 runtime 宣告。
- `Vue 3.5` 起 props 可以直接解構並給預設值，大多數情況不用再寫 `withDefaults`。
- `v-model` 用 `defineModel<T>()`，slot 用 `defineSlots`，template ref 用 `useTemplateRef`，provide/inject 用 `InjectionKey`。
- 一個元件要服務多種資料型別時，用 `generic="T"` 寫泛型元件，不要用 `any` 糊過去。

## 技術拆解

### Props：型別參數 + 解構預設值
以前會寫成 runtime 宣告，型別要另外推：

```ts
const props = defineProps({
    title: { type: String, required: true },
    size: { type: String, default: 'md' }
});
```

現在直接寫型別，`Vue` 的編譯器會幫你產生 runtime 的部分：

```ts
type Props = {
    title: string;
    size?: 'sm' | 'md' | 'lg';
    tags?: string[];
};

const { title, size = 'md', tags = [] } = defineProps<Props>();
```

`Vue 3.5` 起，從 `defineProps` 解構出來的變數-|仍然是響應式的|-（編譯器會自動改寫成 `props.title`），所以預設值直接寫在解構上就好。要注意的是，解構出來的值要傳給 `watch` 或 composable 時，要包成 getter：`watch(() => title, ...)`。

### Emits：具名 tuple 寫法

```ts
const emit = defineEmits<{
    change: [id: number];
    update: [value: string, oldValue: string];
    close: [];
}>();

emit('change', 1);
emit('update', 'new', 'old');
```

每個事件的參數用具名 tuple 寫，滑鼠移上去就看得到參數名稱，比舊的 call signature 寫法好讀很多。

### v-model：defineModel

```ts
const modelValue = defineModel<string>({ required: true });
const visible = defineModel<boolean>('visible', { default: false });
```

`defineModel` 從 `Vue 3.4` 開始穩定，等於幫你把「props + emit `update:xxx`」包成一個可以直接改的 `ref`。從 `VueUse` 的 `useVModel` 搬過來的細節，可以看 [Vue 3.3 升 3.5 疑難錦囊](./version-upgrade)。

### Slots：defineSlots

```ts
defineSlots<{
    default(props: { item: Item; index: number }): any;
    empty(): any;
}>();
```

寫了之後，父層用 `<template #default="{ item }">` 時，`item` 就有型別，打錯欄位會直接報錯。

### 泛型元件：generic="T"
做列表、下拉選單、表格這種「資料型別由使用者決定」的元件時，最常見的偷懶是 `items: any[]`。正確的做法是泛型元件：

```vue
<script setup lang="ts" generic="T extends { id: string | number }">
    const { items } = defineProps<{
        items: T[];
        labelKey: keyof T;
    }>();

    const selected = defineModel<T | null>({ default: null });
</script>

<template>
    <ul>
        <li
            v-for="item in items"
            :key="item.id"
            :class="{ 'is-active': selected?.id === item.id }"
            @click="selected = item"
        >
            {{ item[labelKey] }}
        </li>
    </ul>
</template>
```

使用的人傳 `User[]` 進來，`labelKey` 就只能填 `User` 的欄位，`v-model` 拿到的也是 `User | null`。

### Template ref：useTemplateRef
`Vue 3.5` 起用 `useTemplateRef` 取代「宣告一個同名 `ref`」的寫法：

```ts
import { useTemplateRef } from 'vue';
import MyDialog from './MyDialog.vue';

const inputRef = useTemplateRef<HTMLInputElement>('input');
const dialogRef = useTemplateRef<InstanceType<typeof MyDialog>>('dialog');

onMounted(() => {
    inputRef.value?.focus();
});
```

子元件要讓父層呼叫的方法，記得用 `defineExpose` 開出來，`InstanceType<typeof MyDialog>` 才看得到。（搭配 `v-for` 時有些坑，寫在 [useTemplateRef 與 v-for](./useTemplateRef)。）

### provide/inject：InjectionKey

```ts
// keys.ts
import type { InjectionKey, Ref } from 'vue';

export type Theme = 'light' | 'dark';
export const themeKey: InjectionKey<Ref<Theme>> = Symbol('theme');
```

```ts
// 父層
provide(themeKey, ref<Theme>('light'));

// 子孫
const theme = inject(themeKey); // Ref<Theme> | undefined
```

用字串當 key 的話，`inject` 拿到的永遠是 `unknown`，要自己斷言；用 `InjectionKey`，型別就跟著 key 走。

## 例子與對比

| 地方 | 偷懶寫法 | 建議寫法 |
|---|---|---|
| props | runtime 物件宣告、`withDefaults` | `defineProps<Props>()` + 解構預設值 |
| emits | `defineEmits(['change'])` | `defineEmits<{ change: [id: number] }>()` |
| v-model | props + emit 手刻 | `defineModel<T>()` |
| 共用元件的資料 | `items: any[]` | `generic="T"` |
| template ref | `ref<any>()` | `useTemplateRef<HTMLInputElement>('input')` |
| provide/inject | 字串 key + `as` 斷言 | `InjectionKey<T>` |

::: tip
型別寫在 `.vue` 裡，`tsc` 看不到，記得用 `vue-tsc --noEmit` 做型別檢查，並把它放進 CI 或 `build` 前面。
:::

## 結論
`TypeScript` 在 `Vue` 裡最大的價值，不是讓編輯器多跳幾個紅線，而是讓元件的「使用說明」變成編譯器會檢查的規格。props、emits、slots 寫清楚了，用的人不用打開元件原始碼也知道怎麼用。

型別寫一次，少問同事十次，划算。
