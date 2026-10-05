---
title: 'Event Bus 退場之後：Vue 3 的跨元件溝通該怎麼選'
image: ''
description: 'Vue 2 時代用 new Vue() 當全域事件匯流排，Vue 3 拿掉了 $on／$off。舊做法為什麼被淘汰、真的需要事件時用 mitt，以及大多數情況下更好的選擇：props／emit、provide／inject、Pinia。'
keywords: ''
author: Opshell
createdAt: '2024-09-23'
categories:
  - Vue
tags:
  - Vue
  - Event Bus
  - mitt
  - Pinia
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有一個 Vue 2 event bus 教學的連結，改寫成「舊做法 → 新做法」的對比文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
網路上搜「Vue 跨元件溝通」，還是很容易搜到 Vue 2 時代的 global event bus 教學：`export const EventBus = new Vue()`，然後到處 `$emit`、`$on`。照抄到 Vue 3 專案會直接報錯，因為這些 API 已經被拿掉了。這篇講為什麼它退場、真的要用事件時怎麼做，以及大部分時候其實有更好的選擇。寫給從 Vue 2 搬家，或是照著舊教學卡住的人。
:::

## 懶人包
- Vue 3 移除了實例上的 `$on`、`$off`、`$once`，`new Vue()` 當 event bus 的做法已經不能用。
- 真的需要「發事件、不在乎誰聽」的場景，用 `mitt` 這類小型事件庫。
- 但大部分 event bus 的用途，其實是在**共享狀態**，那應該交給 Pinia。
- 父子用 props／emit、祖孫用 provide／inject，事件流向才看得出來。
- event bus 最大的問題不是 API，而是「誰發的、誰聽的」在程式碼裡完全看不出來。

## 技術拆解

### 舊做法長怎樣
```js
// Vue 2
// eventBus.js
import Vue from 'vue';
export const EventBus = new Vue();

// A 元件
EventBus.$emit('cart-updated', count);

// B 元件
EventBus.$on('cart-updated', (count) => {
    this.cartCount = count;
});
```

當年它很受歡迎，因為不用設定 Vuex，三行就能讓兩個毫不相干的元件講話。

### 為什麼被淘汰
1. **Vue 3 拿掉了 API**：官方遷移指南說明 `$on`、`$off`、`$once` 已移除，建議改用外部函式庫。
2. **事件流向看不到**：event bus 就像在大樓廣播「三樓的那位請下樓」，誰聽到、誰會動、動了幾個人，廣播的人完全不知道。專案一大，追一個事件要全域搜尋字串。
3. **忘記 `$off` 就記憶體洩漏**：元件卸載了，監聽器還掛著，下次進頁面又多掛一個，同一個事件觸發兩次、三次。~~（然後你開始懷疑人生）~~
4. **狀態沒有家**：用事件傳「購物車數量」，新掛上的元件錯過之前的事件，就不知道現在是多少，只好再發一個「請告訴我數量」的事件。

## 例子與對比

### 如果真的需要事件：mitt
```ts
// utils/emitter.ts
import mitt from 'mitt';

type Events = {
    'toast': { message: string; type: 'success' | 'error' };
    'session-expired': void;
};

export const emitter = mitt<Events>();
```

```vue
<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import { emitter } from '@/utils/emitter';

const onSessionExpired = () => {
    // 跳出登入對話框
};

emitter.on('session-expired', onSessionExpired);

// 一定要記得拿掉
onBeforeUnmount(() => emitter.off('session-expired', onSessionExpired));
</script>
```

至少有型別，事件名打錯會報錯。適合真正「一次性、發完就算」的通知，例如 toast、session 過期。

### 大部分情況：其實是共享狀態，交給 Pinia
```ts
// stores/cart.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useCartStore = defineStore('cart', () => {
    const items = ref<{ id: number; quantity: number }[]>([]);
    const count = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));

    const add = (id: number) => {
        const found = items.value.find((item) => item.id === id);
        if (found) {
            found.quantity++;
        } else {
            items.value.push({ id, quantity: 1 });
        }
    };

    return { items, count, add };
});
```

任何元件 `useCartStore().count` 就拿到最新數量，晚掛上的元件也不會錯過，devtools 還看得到是誰改的。

### 怎麼選
| 情境 | 建議 |
|---|---|
| 父子之間 | props 往下、emit 往上 |
| 祖先傳給深層子孫 | provide／inject |
| 多個不相干的元件要讀寫同一份資料 | Pinia |
| 一次性的全域通知（toast、登出） | mitt 這類事件庫 |
| 只是兩個元件剛好要同步一下 | 先想想是不是該提到共同的父層 |

## 結論
event bus 不是被 Vue 3 「殺掉」的，是大家發現它擅長製造謎團才讓它退休的。下次想發一個全域事件之前，先問自己：我是要**通知**一件事，還是要**共享**一份資料？答案通常是後者，那就交給 Pinia 吧。

延伸閱讀：[Creating a global event bus with Vue.js](https://www.pilishen.com/posts/creating-a-global-event-bus-with-vuejs)（Vue 2 時代的做法，可以對照著看）
