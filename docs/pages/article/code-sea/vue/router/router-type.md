---
title: '讓路由有型別：unplugin-vue-router 的檔案路由'
image: ''
description: '純 Vue 專案也能像 Nuxt 一樣用資料夾決定路由，而且 router.push 的路徑、params 都有型別提示。unplugin-vue-router 是什麼、怎麼裝、跟手寫 routes 差在哪。'
keywords: ''
author: Opshell
createdAt: '2024-09-12'
categories:
  - Vue
tags:
  - Vue
  - Vue Router
  - TypeScript
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本是一小段群組對話，依此寫成全文。安裝設定以 unplugin-vue-router 與 Vue Router 官方文件為準，發佈前請再對一次。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
群組裡聊到純 Vue 專案的 router，有人分享他們用的是 [unplugin-vue-router](https://github.com/posva/unplugin-vue-router)。有人問：「是不是跟 Vue Router 一樣的東西？」答案是：一樣的東西沒錯，只是變成 page route 那套，而且 path 都會有型別提示。這篇把它講清楚，寫給手寫 `routes` 陣列寫到煩、又常打錯路由名稱的人。
:::

## 懶人包
- `unplugin-vue-router` 本身就是 Vue Router，只是整合 Vite，自動從 `src/pages` 產生路由和型別定義。
- 好處一：不用再手寫 `routes` 陣列，檔案放對位置就有路由。
- 好處二：`router.push('/users/123')`、`route.params.id` 都有型別檢查，路徑打錯編譯就報錯。
- 寫法跟 Nuxt 的 `pages/` 很像，用過 Nuxt 的人幾乎沒有學習成本。
- 它的功能正陸續併入 Vue Router 本體，新專案的安裝方式以官方文件為準。

## 技術拆解

### 它做了什麼
手寫 Vue Router 時，路由表和頁面檔案是兩份東西：新增頁面要記得去 `router/index.ts` 加一筆、改檔名要記得改 import，`name` 和 `path` 都是字串，打錯也不會報錯，到執行期才發現。

`unplugin-vue-router` 在 Vite 編譯時掃 `src/pages`，做兩件事：

1. 依資料夾結構產生 `routes`。
2. 產生一份型別定義檔（例如 `typed-router.d.ts`），列出所有路由名稱、路徑和 params。

所以 `useRoute('/users/[id]')` 回來的 `params.id` 會被推論成 `string`，`router.push` 給了不存在的路徑會直接標紅線。

### 檔名對應
```
src/pages/
├─ index.vue            → /
├─ about.vue            → /about
├─ users/
│  ├─ index.vue         → /users
│  └─ [id].vue          → /users/:id
└─ [...path].vue        → 404 全部接住
```

### 設定
```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue';
import VueRouter from 'unplugin-vue-router/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        VueRouter(), // 要放在 vue() 前面
        vue()
    ]
});
```

```ts
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from 'vue-router/auto-routes';

export const router = createRouter({
    history: createWebHistory(),
    routes
});
```

import 路徑與型別檔的設定方式在不同版本有調整過，請以官方文件為準。

## 例子與對比

### 手寫 routes vs 檔案路由
```ts
// 手寫：兩份東西要自己對齊
const routes = [
    { path: '/users/:id', name: 'UserDetail', component: () => import('@/views/UserDetail.vue') }
];

router.push({ name: 'UserDetial', params: { id: 1 } }); // 打錯字，執行時才知道
```

```vue
<!-- src/pages/users/[id].vue：檔案路由 -->
<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';

const route = useRoute('/users/[id]');
const router = useRouter();

const userId = route.params.id; // 型別是 string

const goBack = () => {
    router.push('/users'); // 打成 '/user' 會報型別錯誤
};
</script>
```

| | 手寫 `routes` | `unplugin-vue-router` |
|---|---|---|
| 新增頁面 | 建檔 + 改路由表 | 建檔就好 |
| 路徑打錯 | 執行期才發現 | 編譯期報錯 |
| params 型別 | `string \| string[]`，要自己轉 | 依路徑推論 |
| 路由結構 | 看路由表 | 看資料夾 |
| 自訂彈性 | 完全自由 | 用 `definePage` 補 meta 等設定 |

### 要不要換
- 新專案：直接用，沒有理由不用。
- 舊專案路由很多：可以先在新功能試，兩者可以並存，再慢慢搬。
- 路由規則很特別（同一個元件掛多條路徑、大量動態註冊）：手寫可能還是比較直覺。

## 結論
它不是要取代 Vue Router，而是幫你把「檔案」和「路由表」這兩份必須對齊的東西合成一份，順便送你型別。用過一次型別提示，就回不去對著字串猜路由名稱的日子了。

想在路由層載入資料，可以接著看 [路由之間傳物件：history state，以及 Vue Router 的 Data Loaders](./router-status)。
