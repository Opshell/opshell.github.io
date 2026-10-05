---
title: useTemplateRef 搭 v-for：陣列 ref 為什麼不會觸發 watch
image: ''
description: 'Vue 3.5 的 useTemplateRef 搭配 v-for 會拿到一個元素陣列，但這個陣列不適合拿來 watch，順序也不保證跟資料一樣。整理原因與比較穩的寫法：watch 資料本身、nextTick 後再讀，或改用函式 ref。'
keywords: ''
author: Opshell
createdAt: '2025-07-22'
categories:
  - vue
tags:
  - vue
  - useTemplateRef
  - v-for
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有一個 Stack Overflow 連結，依主題寫成全文（useTemplateRef 基本用法、v-for 陣列的兩個坑、三種替代寫法）。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
`Vue 3.5` 推出 `useTemplateRef` 之後，順手把專案裡的 template ref 都換掉。單一元素沒問題，直到遇到 `v-for`：想在列表變動時拿到所有項目的 DOM 做點事，`watch` 了那個陣列 ref，結果怎麼加資料都不會觸發。

查了一下，[Stack Overflow 上有人問一模一樣的問題](https://stackoverflow.com/questions/79031309/usetemplateref-is-not-reactive-for-arrays)。這篇整理原因和比較穩的寫法，寫給剛換到 `useTemplateRef` 的人。
:::

## 懶人包
- `useTemplateRef` 搭 `v-for` 會拿到一個元素陣列，但-|不要拿這個陣列當 `watch` 的來源|-，它不保證每次內容變動都會通知你。
- 陣列的順序-|不保證跟原始資料一樣|-，要對應資料請用 key 或 `data-*` 屬性，不要靠 index。
- 想在列表變動後操作 DOM：`watch` 資料本身，再 `await nextTick()` 去讀 ref。
- 需要「每個元素各自對應一筆資料」時，改用函式 ref，自己存進 `Map`。

## 技術拆解

### useTemplateRef 是什麼
以前取得 template ref，要宣告一個跟 `ref="xxx"` 同名的變數，`Vue` 靠名字幫你配對：

```vue
<script setup lang="ts">
    const input = ref<HTMLInputElement | null>(null);
</script>

<template>
    <input ref="input">
</template>
```

`Vue 3.5` 起改用 `useTemplateRef`，用字串 key 明確對應，變數名稱可以自己取：

```vue
<script setup lang="ts">
    import { useTemplateRef, onMounted } from 'vue';

    const inputRef = useTemplateRef<HTMLInputElement>('input');

    onMounted(() => {
        inputRef.value?.focus();
    });
</script>

<template>
    <input ref="input">
</template>
```

它回傳的是一個唯讀的 `ShallowRef`，元素掛上去、拆下來的時候 `.value` 會跟著換。

### 坑一：陣列內容變了，watch 不一定知道
在 `v-for` 上寫 `ref`，拿到的會是陣列：

```vue
<script setup lang="ts">
    const list = ref([1, 2, 3]);
    const itemRefs = useTemplateRef<HTMLLIElement[]>('items');

    watch(itemRefs, (els) => {
        console.log('元素數量', els?.length); // 列表變長了，這裡卻沒反應
    });
</script>

<template>
    <ul>
        <li v-for="item in list" :key="item" ref="items">{{ item }}</li>
    </ul>
</template>
```

問題出在 `ShallowRef`：它只在 `.value` 被換成另一個值時才觸發。如果 `Vue` 更新列表時是在原本那個陣列上增減元素，而不是給一個新陣列，`ShallowRef` 就看不到變化，`watch` 自然不會跑。這個行為在不同的小版本之間可能有差異，-|但不管哪一版，都不建議把畫面渲染的副產品當成資料來源|-。

### 坑二：順序不保證
官方文件有特別寫：ref 陣列的順序-|不保證|-跟來源陣列一樣。排序、插入之後，`itemRefs.value[2]` 不一定是 `list.value[2]` 的那個元素。要用 index 去對資料，遲早會對錯人。

## 例子與對比

### 做法一：watch 資料，nextTick 後再讀 ref
資料才是真正的來源，ref 只是「渲染完的結果」，所以去 `watch` 資料，等 DOM 更新完再讀：

```ts
const list = ref([1, 2, 3]);
const itemRefs = useTemplateRef<HTMLLIElement[]>('items');

watch(list, async () => {
    await nextTick();
    console.log('元素數量', itemRefs.value?.length);
}, { deep: true });
```

也可以用 `watch` 的 `flush: 'post'`，讓 callback 在 DOM 更新後才執行，就不用自己 `nextTick`。

### 做法二：用 data 屬性對應資料
順序不可靠，就讓每個元素自己帶身分證：

```vue
<li v-for="item in list" :key="item.id" ref="items" :data-id="item.id">
    {{ item.name }}
</li>
```

```ts
function findEl(id: number) {
    return itemRefs.value?.find(el => el.dataset.id === String(id));
}
```

### 做法三：函式 ref + Map
需要「這筆資料 ↔ 這個元素」穩定對應時，用函式 ref 自己管：

```vue
<script setup lang="ts">
    type Item = { id: number; name: string };

    const list = ref<Item[]>([]);
    const elMap = new Map<number, HTMLLIElement>();

    function setItemRef(id: number, el: unknown) {
        if (el) {
            elMap.set(id, el as HTMLLIElement);
        } else {
            elMap.delete(id); // 元素卸載時 el 會是 null
        }
    }

    function scrollToItem(id: number) {
        elMap.get(id)?.scrollIntoView({ behavior: 'smooth' });
    }
</script>

<template>
    <ul>
        <li
            v-for="item in list"
            :key="item.id"
            :ref="el => setItemRef(item.id, el)"
        >
            {{ item.name }}
        </li>
    </ul>
</template>
```

| 需求 | 建議做法 |
|---|---|
| 列表變動後量尺寸、捲動到底 | watch 資料 + `nextTick`／`flush: 'post'` |
| 用 id 找某個元素 | `data-id` 或函式 ref + `Map` |
| 想知道「元素陣列變了」 | 別這樣想，去看資料變了沒 |

## 結論
`useTemplateRef` 讓 template ref 變得清楚很多，但它管的是「渲染完的元素」，不是資料。要知道列表變了，問資料；要知道元素在哪，等渲染完再問 ref。

把 ref 陣列當成 store 來 watch，就像盯著影印機出紙口等原稿改版，方向反了。
