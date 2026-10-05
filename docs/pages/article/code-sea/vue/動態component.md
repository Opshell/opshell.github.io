---
title: 動態元件：用 component :is 加 defineAsyncComponent 做按需載入
image: ''
description: '分頁、儀表板小工具這種「不是馬上要用」的元件，不用一開始全部載進來：用元件對照表搭配 <component :is> 決定要畫誰，再用 defineAsyncComponent 讓它用到才下載。'
keywords: ''
author: Opshell
createdAt: '2024-10-04'
categories:
  - vue
tags:
  - vue
  - 動態元件
  - defineAsyncComponent
  - 效能
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的筆記與程式碼寫成全文（程式碼整理成完整的 SFC，補了 shallowRef、載入／錯誤狀態與 KeepAlive）。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
常見的情況是：一個頁面有五個分頁，每個分頁都是一個肥肥的元件，結果一進頁面五個全部一起下載，使用者其實只看第一個。或者後台的儀表板，依權限顯示不同的小工具，`template` 裡一排 `v-if`。這篇講怎麼用動態元件把「畫哪一個」交給資料決定，順便讓沒用到的元件不要先載進來。
:::

## 懶人包

- 假如你的元件不是那麼馬上需要被使用，就 `<component :is="xxx">`，用一張「key → 元件」的對照表決定要畫誰。
- 對照表裡的元件用 `defineAsyncComponent(() => import(...))` 包起來，打包時會被切成獨立的 chunk，用到才下載。
- 元件不要放進 `ref` / `reactive`，用 `shallowRef` 或直接放普通物件，不然 Vue 會警告而且白白做響應式。
- 要保留切換前的狀態再包一層 `<KeepAlive>`，但那是最後手段，先想想狀態該不該放外面。

## 技術拆解

### component :is 在做什麼

`<component :is="...">` 是 Vue 內建的「看資料決定要畫哪個元件」。`:is` 可以給元件物件，也可以給已經全域註冊的元件名稱字串。我建議給元件物件，型別看得到、打包工具也追得到。

搭配一張對照表，`template` 就不用再寫一排 `v-if`：

```vue
<template>
    <!-- 使用 Vue 的動態元件語法 :is -->
    <component :is="componentMap[componentKey]" />
</template>
```

### defineAsyncComponent：用到才載

```ts
import { defineAsyncComponent } from 'vue';

const ComponentA = defineAsyncComponent(() => import('@/components/ComponentA.vue'));
```

`import()` 是動態 import，`Vite` 打包時會把 `ComponentA` 切成獨立的檔案。`defineAsyncComponent` 回傳的是一個「外殼元件」，第一次真的被畫出來時才去下載裡面的東西，下載完就快取起來，第二次切回來不會再下載。

所以 `componentMap` 裡就算列了十個元件，使用者只點開兩個，就只下載兩個。

### 載入中、載入失敗

網路慢的時候，非同步元件會有一段空白。`defineAsyncComponent` 也可以給完整的設定：

```ts
import { defineAsyncComponent } from 'vue';
import LoadingBlock from '@/components/LoadingBlock.vue';
import ErrorBlock from '@/components/ErrorBlock.vue';

const ReportPanel = defineAsyncComponent({
    loader: () => import('@/components/ReportPanel.vue'),
    loadingComponent: LoadingBlock,
    errorComponent: ErrorBlock,
    delay: 200, // 200ms 內載完就不顯示 loading，避免閃一下
    timeout: 10000
});
```

### 不要把元件放進 ref

很多人會這樣寫：`const current = ref(ComponentA)`。Vue 會在 console 警告你把元件變成了響應式物件，因為 `ref` 會把整個元件物件深層包成 Proxy，沒有意義又浪費效能。要存「目前是哪個元件」，存 key 就好；真的要存元件本身，用 `shallowRef` 或 `markRaw`。

## 例子與對比

### 完整範例：分頁按需載入

```vue
<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';
import type { Component } from 'vue';

type TabKey = 'componentA' | 'componentB';

const componentMap: Record<TabKey, Component> = {
    componentA: defineAsyncComponent(() => import('@/components/ComponentA.vue')),
    componentB: defineAsyncComponent(() => import('@/components/ComponentB.vue'))
};

// 這裡 componentKey 可以是根據 router params 或 tab 的值來決定的
const componentKey = ref<TabKey>('componentA'); // 動態決定使用哪個元件
</script>

<template>
    <nav>
        <button type="button" @click="componentKey = 'componentA'">A</button>
        <button type="button" @click="componentKey = 'componentB'">B</button>
    </nav>

    <component :is="componentMap[componentKey]" />
</template>
```

`componentMap` 是普通物件，不是響應式的，所以不會有上面講的警告；真正會變的只有 `componentKey` 這個字串。

### 要保留狀態：KeepAlive

```vue
<template>
    <KeepAlive :max="3">
        <component :is="componentMap[componentKey]" />
    </KeepAlive>
</template>
```

切走再切回來，表單填到一半的內容還在。不過 `KeepAlive` 會把整個元件留在記憶體，`watch`、計時器也會繼續跑，`max` 記得設。

### 對比

| 寫法 | 首次載入 | `template` | 適合 |
|---|---|---|---|
| 一排 `v-if` + 一般 import | 全部一起下載 | 越寫越長 | 兩三個、而且都很小 |
| 對照表 + `:is` + 一般 import | 全部一起下載 | 乾淨 | 元件小、切換頻繁 |
| 對照表 + `:is` + `defineAsyncComponent` | 用到才下載 | 乾淨 | 元件肥、不一定會被看到 |

如果切換的依據本來就是網址（例如 `/report/:type`），也可以直接交給 `vue-router` 的子路由，路由元件的 `() => import()` 本身就是按需載入。

## 結論

動態元件的重點就兩件事：「畫誰」交給資料決定，「什麼時候載」交給 `defineAsyncComponent`。對照表一張、`:is` 一行，`template` 清爽，首屏也輕了。

用不到的元件就讓它在伺服器上多睡一會兒，等使用者點了再叫醒它。
