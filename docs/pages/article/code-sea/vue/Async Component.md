---
title: 'Async Component：用 defineAsyncComponent 讓元件晚點再來'
image: ''
description: '不是馬上要用的元件，就不要塞進第一包 JS。defineAsyncComponent 的基本用法、載入中與錯誤狀態、搭配動態元件，以及 Vue 3.5 的延遲水合。'
keywords: ''
author: Opshell
createdAt: '2024-10-22'
categories:
  - Vue
tags:
  - Vue
  - 效能
  - Code Splitting
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有一個參考連結，依主題從頭寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
專案越長越大，首頁的 JS 也跟著越長越胖。常見的情況是：一個很少人點開的「進階設定」對話框、一個只有管理員看得到的圖表，全部都被打包進第一包，讓所有人一起等。Async Component 就是用來處理這件事的。這篇寫給知道 `import` 但還沒拆過元件的人。
:::

## 懶人包
- `defineAsyncComponent(() => import('./Foo.vue'))` 會讓元件**第一次要渲染時**才去下載，打包工具會自動把它拆成獨立的 chunk。
- 可以設定 `loadingComponent`、`errorComponent`、`delay`、`timeout`，載入中與載入失敗都有交代。
- 適合：對話框、分頁內容、權限才看得到的區塊、很重的圖表或編輯器。不適合：首屏一定會出現的東西。
- Vue 3.5 之後，SSR 專案還能搭配 `hydrateOnVisible` 等策略，連水合都延後。

## 技術拆解

### 它到底做了什麼
平常的 `import Foo from './Foo.vue'` 是靜態的，打包工具會把 `Foo` 跟引用它的檔案放在同一包。

`import('./Foo.vue')` 是動態 import，回傳一個 Promise。`Vite` 看到它就知道「這個可以晚點載」，自動拆成另一個檔案。`defineAsyncComponent` 則是把這個 Promise 包成一個 Vue 元件：還沒載好時什麼都不渲染（或渲染你給的 loading 元件），載好之後換成真正的元件。

就像餐廳的套餐：前菜先上，甜點等你吃到那邊再做，不用一次把整桌擺滿~~（擺滿你也吃不完）~~。

### 進階選項
```ts
import { defineAsyncComponent } from 'vue';
import LoadingBlock from '@/components/LoadingBlock.vue';
import ErrorBlock from '@/components/ErrorBlock.vue';

const HeavyChart = defineAsyncComponent({
    loader: () => import('@/components/HeavyChart.vue'),
    loadingComponent: LoadingBlock, // 載入中顯示
    delay: 200, // 200ms 內載好就不顯示 loading，避免畫面閃一下
    errorComponent: ErrorBlock, // 載入失敗顯示
    timeout: 10000 // 超過 10 秒當作失敗
});
```

`delay` 很常被忽略：網路快的時候，loading 只出現 50ms 就消失，反而像畫面在抖。設個 200ms，快的人根本看不到 loading。

### 和 Suspense 的關係
如果 async component 的外層有 `<Suspense>`，它的載入狀態預設會交給 `Suspense` 管，自己的 `loadingComponent` 不會生效；要自己管就加 `suspensible: false`。`Suspense` 在官方文件上仍標示為實驗性功能，用之前以官方文件為準。

### Vue 3.5 的延遲水合
SSR 的頁面（例如 Nuxt），元件的 HTML 已經由伺服器產好了，但瀏覽器還是要下載 JS 來「水合」它才能互動。Vue 3.5 加入了延遲水合策略，可以等元件進入畫面才水合：

```ts
import { defineAsyncComponent, hydrateOnVisible } from 'vue';

const Comments = defineAsyncComponent({
    loader: () => import('@/components/Comments.vue'),
    hydrate: hydrateOnVisible()
});
```

另外還有 `hydrateOnIdle`、`hydrateOnInteraction`、`hydrateOnMediaQuery` 可以選。純前端（SPA）專案用不到這個選項。

## 例子與對比

### 對話框：點了才載
```vue
<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';

const AdvancedSettingsDialog = defineAsyncComponent(() => import('@/components/AdvancedSettingsDialog.vue'));

const isDialogOpen = ref(false);
</script>

<template>
    <button type="button" @click="isDialogOpen = true">進階設定</button>
    <AdvancedSettingsDialog v-if="isDialogOpen" @close="isDialogOpen = false" />
</template>
```

重點是 `v-if`：沒打開就不渲染，不渲染就不下載。換成 `v-show` 的話，元件一開始就會被渲染，等於白拆了。

### 分頁切換：搭配動態元件
```vue
<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';

const tabs = {
    profile: defineAsyncComponent(() => import('@/views/tabs/ProfileTab.vue')),
    billing: defineAsyncComponent(() => import('@/views/tabs/BillingTab.vue')),
    security: defineAsyncComponent(() => import('@/views/tabs/SecurityTab.vue'))
};
type TabKey = keyof typeof tabs;

const currentTab = ref<TabKey>('profile');
</script>

<template>
    <nav>
        <button v-for="(_, key) in tabs" :key="key" type="button" @click="currentTab = key">
            {{ key }}
        </button>
    </nav>
    <component :is="tabs[currentTab]" />
</template>
```

| | 靜態 import | `defineAsyncComponent` |
|---|---|---|
| 什麼時候下載 | 跟著父元件一起 | 第一次渲染時 |
| 首次載入大小 | 大 | 小 |
| 第一次打開 | 立刻出現 | 要等網路（可以給 loading） |
| 適合 | 首屏必定出現的元件 | 對話框、分頁、權限區塊、重型套件 |

### 路由不用包
Vue Router 的路由元件直接寫 `component: () => import('./views/Foo.vue')` 就會自動延遲載入，**不要**再包一層 `defineAsyncComponent`，官方文件也明講路由這裡不需要。

## 結論
Async Component 不是什麼都拆，而是把「不一定會被看到」的東西挪出第一包。先挑最重、最少人用的元件下手，打開 devtools 的 Network 看看第一包瘦了多少，你會很有成就感。

延伸閱讀：[認識 Vue Async Component](https://medium.com/unalai/%E8%AA%8D%E8%AD%98-vue-async-component-d3a5b882d5a9)
