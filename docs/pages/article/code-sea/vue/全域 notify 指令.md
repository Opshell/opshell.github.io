---
title: 在 Vue 3 做一個全域 notify：從元件到一行呼叫
image: ''
description: '每個頁面都要自己放一個通知元件、自己管開關？把 notify 做成全域 API：一個 Pinia store 管佇列、一個掛在 App 的容器負責畫面，任何地方一行 notify.success() 就叫得出來。'
keywords: ''
author: Opshell
createdAt: '2024-10-15'
categories:
  - vue
tags:
  - vue
  - notify
  - pinia
  - Teleport
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有一個參考連結，依標題從頭寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
通知（toast、notify）幾乎每個專案都有，常見的情況是一開始每個頁面各放一個通知元件、各自用 `ref` 管開關，等到 API 錯誤、表單送出、權限不足都要跳通知時，就變成到處複製貼上。這篇整理把它做成「全域呼叫」的做法，寫給想自己做、不想為了一個通知裝整套 UI 框架的人。

參考：https://blog.csdn.net/m0_68110835/article/details/135014333
:::

## 懶人包

- 需求是「任何地方一行就能叫出通知」，包含元件外面（axios 攔截器、router guard）。
- 推薦做法：Pinia store 管通知佇列，`App.vue` 放一個用 `Teleport` 的容器負責畫面，兩邊用資料溝通。
- 另一條路是用 `render()` 在 `body` 底下動態掛元件，像 `ElNotification` 那樣，但會跟 App 的 context 脫鉤，要自己補。
- 不要做成 `app.config.globalProperties.$notify`，`<script setup>` 裡拿不到，型別也麻煩。

## 技術拆解

### 先講需求

一個好用的全域 notify 大概要做到：

1. 元件裡、composable 裡、`axios` 攔截器裡，都能 `notify.error('...')` 一行叫出來。
2. 同時可以有好幾則，會自動消失，也能手動關。
3. 樣式跟著專案走，不想被 UI 框架綁住。

難的是第 1 點的「元件外面」。在元件裡大家都會，在攔截器裡就沒有 `setup` 可以用了。

### 做法 A：store 管資料，容器管畫面

把通知拆成兩半：「現在有哪些通知」是資料，放進 Pinia；「通知長什麼樣」是畫面，交給一個掛在 `App.vue` 的容器元件。要跳通知的人只要改資料，不用碰畫面。

這個做法的好處是它就是普通的 Vue 元件：吃得到 i18n、主題、`provide` 進來的東西，也能用 `<TransitionGroup>` 做進出場動畫。

### 做法 B：render() 動態掛載

`ElNotification` 這類函式式 API 的做法是在呼叫時 `createVNode` 一個元件，再用 `render()` 掛到 `document.body` 底下的新節點。好處是不用在 `App.vue` 放任何東西；壞處是這個元件跟主 App 是分開的，`app.use()` 裝的東西（i18n、Pinia、全域元件）預設都拿不到，要手動把 `appContext` 接過去。

自己專案用的話，我會選 A，少一層魔法，出問題也好查。

## 例子與對比

### store：管佇列

```ts
// stores/notify.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export type NotifyType = 'success' | 'error' | 'info';

export interface NotifyItem {
    id: number;
    type: NotifyType;
    message: string;
}

export const useNotifyStore = defineStore('notify', () => {
    const items = ref<NotifyItem[]>([]);
    let seed = 0;

    function remove(id: number) {
        items.value = items.value.filter(item => item.id !== id);
    }

    function push(type: NotifyType, message: string, duration = 3000) {
        const id = ++seed;
        items.value.push({ id, type, message });

        if (duration > 0) {
            setTimeout(() => remove(id), duration);
        }

        return id;
    }

    return {
        items,
        remove,
        success: (message: string) => push('success', message),
        error: (message: string) => push('error', message, 5000),
        info: (message: string) => push('info', message)
    };
});
```

### 容器：負責畫面

```vue
<!-- components/NotifyContainer.vue -->
<script setup lang="ts">
import { useNotifyStore } from '@/stores/notify';

const notify = useNotifyStore();
</script>

<template>
    <Teleport to="body">
        <TransitionGroup tag="ul" name="notify" class="notify">
            <li
                v-for="item in notify.items"
                :key="item.id"
                :class="['notify__item', `notify__item--${item.type}`]"
                @click="notify.remove(item.id)"
            >
                {{ item.message }}
            </li>
        </TransitionGroup>
    </Teleport>
</template>
```

`App.vue` 放一次就好：

```vue
<template>
    <RouterView />
    <NotifyContainer />
</template>
```

### 使用：元件裡、元件外都一樣

```ts
// 元件裡
const notify = useNotifyStore();
notify.success('儲存成功');
```

```ts
// axios 攔截器裡
import { pinia } from '@/stores';
import { useNotifyStore } from '@/stores/notify';

http.interceptors.response.use(
    response => response,
    (error) => {
        useNotifyStore(pinia).error('連線失敗，請稍後再試');
        return Promise.reject(error);
    }
);
```

在元件外面呼叫 `useNotifyStore()` 時，把建立好的 `pinia` 實體傳進去，就不用擔心「Pinia 還沒 `app.use()`」的錯誤。

### 對比

| | store + 容器 | `render()` 動態掛載 | `globalProperties.$notify` |
|---|---|---|---|
| 元件外能呼叫 | 可以 | 可以 | 不行 |
| `<script setup>` 好用 | 好用 | 好用 | 要繞 `getCurrentInstance` |
| 吃得到 i18n、主題 | 直接吃 | 要接 `appContext` | 可以 |
| 型別 | 自動推導 | 自己寫 | 要擴充 `ComponentCustomProperties` |
| 要在 App 放東西 | 要放一次 | 不用 | 不用 |

## 結論

全域 notify 說穿了就是把「有哪些通知」變成全域資料，畫面只是照著資料畫。資料放 store、畫面放一個容器，任何地方改資料就好，元件外面也一樣叫得到。

通知這種東西，最好的狀態是大家都忘記它的存在，只記得 `notify.success()` 這一行。
