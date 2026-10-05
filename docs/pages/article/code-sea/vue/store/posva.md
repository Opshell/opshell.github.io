---
title: Pinia Colada：Pinia 作者做的 Vue 版 TanStack Query
image: ''
description: '在 Pinia 文件裡看到 posva 的 Pinia Colada，看起來像是 Pinia 直接整合了 Vue Query 的功能。整理它是什麼、跟 TanStack Query 差在哪、什麼情況可以考慮。'
keywords: ''
author: Opshell
createdAt: '2024-09-12'
categories:
  - vue
tags:
  - vue
  - pinia
  - pinia-colada
  - 狀態管理
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的兩行筆記寫成介紹文（Pinia Colada 的定位、基本用法、與 TanStack Query 的比較）。Pinia Colada 版本更新快，API 細節請再對一次官方文件。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
某天在翻 `Pinia` 的文件，看到這個東西：[posva/pinia-colada](https://github.com/posva/pinia-colada)。`posva` 是 `Pinia`（也是 `Vue Router`）的作者，第一眼的感想是：看起來是 `Pinia` 升級，直接整合 `Vue Query` 等效的功能了。

這篇寫給已經在用 `Pinia`、聽過 `TanStack Query` 但還沒決定要不要裝的人，看看還有沒有第三條路。
:::

## 懶人包
- `Pinia Colada` 是 `posva` 做的資料抓取層，跟 `TanStack Query` 管的是同一件事：-|伺服器狀態的快取與同步|-。
- 它不是 `Pinia` 本身升級，而是-|建在 `Pinia` 上的獨立套件|-，快取存在 `Pinia` 的 store 裡，所以 `Pinia` 的 devtools、SSR 都能直接沿用。
- 心智模型跟 `TanStack Query` 一樣：`useQuery` 讀、`useMutation` 寫、用 key 讓快取失效。
- 只寫 `Vue`、已經有 `Pinia`、想要輕一點的選它；團隊跨框架、需要成熟的生態系與進階功能，選 `TanStack Query`。

## 技術拆解

### 它是什麼
`Pinia` 本身只管「客戶端狀態」，API 回來的資料要放哪、什麼時候過期、怎麼避免重複打，`Pinia` 不管。以前的做法是把 API 包進 action，結果 store 越長越胖（這段在 [伺服器狀態 vs 客戶端狀態](./論%20pinia%20vuex%20與%20vue-query) 有聊）。

`Pinia Colada` 就是補這個洞的：它提供 `useQuery`、`useMutation`，幫你處理快取、去重複請求、過期重抓、loading／error 狀態。所以我當初「`Pinia` 直接整合 `Vue Query` 的功能」這個感覺，方向是對的，只是它是另外裝的一包 `@pinia/colada`，不是 `Pinia` 改版。

### 跟 TanStack Query 的差別
概念幾乎一樣，差別在出身：

- **只為 Vue 設計**：`TanStack Query` 的核心是跨框架的 `query-core`，`Vue` 只是其中一個轉接層；`Pinia Colada` 直接用 `Vue` 的響應式寫，API 比較貼近 `Vue` 的習慣。
- **快取放在 Pinia 裡**：不用另外一套 devtools，也比較容易跟 `Pinia` 的外掛、SSR 狀態搬運接在一起。
- **體積比較小、功能比較精簡**：核心刻意保持小，進階功能用外掛補。
- **生態系**：`TanStack Query` 歷史長、文章多、遇到問題比較容易找到答案；`Pinia Colada` 相對年輕，版本更新也比較快。

### 心智模型不變
不管選哪一個，最重要的觀念都一樣（細節寫在 [TanStack Query 是非同步狀態管理](../tanstack-query)）：

- query 是-|同步機|-，不是請求機，你關心的是資料的狀態，不是請求什麼時候回來。
- 寫入走 mutation，寫完讓相關的 key 失效，讀的那邊自己會重新同步。
- 伺服器狀態交給它，就不要再存一份到自己的 store。

## 例子與對比

### 安裝
`Pinia Colada` 要裝在 `Pinia` 之後：

```ts
// main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { PiniaColada } from '@pinia/colada';
import App from './App.vue';

const app = createApp(App);

app.use(createPinia());
app.use(PiniaColada);
app.mount('#app');
```

### 讀與寫

```vue
<script setup lang="ts">
    import { useQuery, useMutation, useQueryCache } from '@pinia/colada';

    type Todo = { id: number; text: string };

    const queryCache = useQueryCache();

    const { data: todos, status } = useQuery({
        key: ['todos'],
        query: () => fetch('/api/todos').then(res => res.json() as Promise<Todo[]>)
    });

    const { mutate: addTodo } = useMutation({
        mutation: (text: string) => fetch('/api/todos', {
            method: 'POST',
            body: JSON.stringify({ text })
        }),
        onSettled: () => {
            // 寫完讓列表失效，useQuery 那邊會自己重新同步
            queryCache.invalidateQueries({ key: ['todos'] });
        }
    });
</script>

<template>
    <p v-if="status === 'pending'">載入中...</p>
    <ul v-else-if="status === 'success'">
        <li v-for="todo in todos" :key="todo.id">{{ todo.text }}</li>
    </ul>
    <button type="button" @click="addTodo('買牛奶')">新增</button>
</template>
```

同一段如果用 `TanStack Query` 寫，差不多是把 `key` 換成 `queryKey`、`query` 換成 `queryFn`、`useQueryCache` 換成 `useQueryClient`，結構幾乎一模一樣。

### 怎麼選

| | `Pinia Colada` | `TanStack Query` |
|---|---|---|
| 支援框架 | 只有 `Vue` | `Vue`、`React`、`Svelte`、`Solid`… |
| 依賴 | 需要 `Pinia` | 不需要 |
| 快取存放 | `Pinia` store | 自己的 `QueryClient` |
| 生態與文件 | 較新，成長中 | 成熟，資源多 |
| 適合 | 純 `Vue` 專案、已用 `Pinia`、想輕量 | 跨框架團隊、需要進階功能（無限捲動、離線、持久化等） |

::: tip
`Pinia Colada` 的 API 還在演進，選項名稱與外掛清單請以 [官方文件](https://pinia-colada.esm.dev/) 為準。
:::

## 結論
`Pinia Colada` 不是要取代 `Pinia`，而是幫 `Pinia` 補上「伺服器狀態」那一塊。心智模型跟 `TanStack Query` 一樣，學會其中一個，另一個大概半小時就上手。

選哪個沒有標準答案，重點是-|不要兩個都裝，然後又把 API 資料塞回 store|-。~~（那就真的是三個 source of truth 了。）~~
