---
title: 'Custom Directives：自己做一個 v-xxx'
image: ''
description: '需要直接碰 DOM 的小功能，例如自動聚焦、點外面關閉，與其每個元件寫一次，不如做成自訂指令。生命週期、binding 參數、TypeScript 型別與全域註冊一次講完。'
keywords: ''
author: Opshell
createdAt: '2024-09-13'
categories:
  - Vue
tags:
  - Vue
  - Directive
  - TypeScript
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有一個參考連結，依主題從頭寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
Vue 鼓勵我們用資料驅動畫面，大部分時候不需要碰 DOM。但總有些事情一定要碰：輸入框自動聚焦、點擊元素外面就關閉選單、圖片進入畫面才載入。常見的情況是每個元件各自在 `onMounted` 裡寫一份，複製到第五份的時候就該想想：是不是做成自訂指令比較好？這篇寫給會用 `v-if`、`v-model`，但還沒自己做過指令的人。
:::

## 懶人包
- 自訂指令是「可重複使用的 DOM 操作」，邏輯跟狀態有關的話請用 composable，跟 DOM 本身有關才用指令。
- 在 `<script setup>` 裡，任何以 `v` 開頭的駝峰變數（`vFocus`）都可以直接在 template 用成 `v-focus`。
- 生命週期和元件很像：`created`、`beforeMount`、`mounted`、`beforeUpdate`、`updated`、`beforeUnmount`、`unmounted`。
- `binding` 裡有 `value`、`oldValue`、`arg`、`modifiers`，對應 `v-xxx:arg.modifier="value"`。
- 有綁事件或計時器，一定要在 `unmounted` 清掉。

## 技術拆解

### 指令長什麼樣子
指令就是一個物件，裡面放你想用的生命週期鉤子：

```ts
import type { Directive } from 'vue';

const vFocus: Directive<HTMLInputElement> = {
    mounted: (el) => {
        el.focus();
    }
};
```

如果只需要 `mounted` 和 `updated`，而且兩邊做的事一樣，可以直接寫成函式：

```ts
const vColor: Directive<HTMLElement, string> = (el, binding) => {
    el.style.color = binding.value;
};
```

### binding 物件
以 `v-tooltip:top.delay="'刪除這筆資料'"` 為例：

| 屬性 | 值 | 說明 |
|---|---|---|
| `binding.value` | `'刪除這筆資料'` | 等號後面的運算結果 |
| `binding.oldValue` | 上一次的值 | 只在 `beforeUpdate`、`updated` 有 |
| `binding.arg` | `'top'` | 冒號後面的參數 |
| `binding.modifiers` | `{ delay: true }` | 點後面的修飾符 |
| `binding.instance` | 使用指令的元件實例 | 盡量不要依賴它 |

### 註冊方式
- **區域**：`<script setup>` 裡宣告 `vXxx` 就能用，或從別的檔案 import 進來（名字一樣要 `v` 開頭）。
- **全域**：在 `main.ts` 用 `app.directive('focus', vFocus)`，整個 App 都能用。

我的習慣是少用全域：全域指令在 template 裡看不出它從哪來，接手的人要翻 `main.ts` 才找得到。

### 用在元件上要小心
指令通常用在原生元素上。用在元件上時，它會套到元件的根元素；如果元件有多個根節點，Vue 會跳警告並忽略它。所以要做給「任何元件都能用」的指令，請先想清楚這件事。

### 什麼時候不要用指令
如果你的邏輯主要在處理資料或狀態（例如「抓 API 然後顯示」），那是 composable 的工作。指令的專長只有一個：直接操作它所在的那個 DOM 元素。

## 例子與對比

### 範例一：v-focus
```vue
<script setup lang="ts">
import type { Directive } from 'vue';

const vFocus: Directive<HTMLInputElement> = {
    mounted: (el) => el.focus()
};
</script>

<template>
    <input v-focus type="text" placeholder="打開就能直接打字">
</template>
```

### 範例二：v-click-outside（含清理）
```ts
// directives/clickOutside.ts
import type { Directive } from 'vue';

type ClickOutsideElement = HTMLElement & { __clickOutside__?: (event: MouseEvent) => void };

export const vClickOutside: Directive<ClickOutsideElement, (event: MouseEvent) => void> = {
    mounted: (el, binding) => {
        el.__clickOutside__ = (event: MouseEvent) => {
            if (!el.contains(event.target as Node)) {
                binding.value(event);
            }
        };
        document.addEventListener('click', el.__clickOutside__);
    },
    unmounted: (el) => {
        if (el.__clickOutside__) {
            document.removeEventListener('click', el.__clickOutside__);
            delete el.__clickOutside__;
        }
    }
};
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { vClickOutside } from '@/directives/clickOutside';

const isMenuOpen = ref(false);
</script>

<template>
    <div v-if="isMenuOpen" v-click-outside="() => (isMenuOpen = false)" class="menu">
        選單內容
    </div>
    <button type="button" @click.stop="isMenuOpen = true">打開選單</button>
</template>
```

按鈕加 `.stop` 是因為：打開選單的那次點擊也會冒泡到 `document`，不擋掉的話選單剛打開就被關掉，你會以為按鈕壞了。

### 指令 vs composable vs 每個元件自己寫
| | 每個元件寫 `onMounted` | 自訂指令 | composable |
|---|---|---|---|
| 適合 | 只有一個地方用 | 重複的 DOM 操作 | 重複的狀態與邏輯 |
| 在 template 裡 | 看不出來 | `v-xxx` 一眼就知道 | 要看 script |
| 清理 | 自己記得 | 寫在 `unmounted` | 寫在 `onScopeDispose` |

如果你已經在用 VueUse，`onClickOutside` 這類 composable 也有現成的，可以先查查再決定要不要自己做。

## 結論
自訂指令是 Vue 留給我們「真的需要碰 DOM」時的後門，好用但別濫用。判斷標準很簡單：它是在操作某個元素，還是在管理資料？前者用指令，後者用 composable。

延伸閱讀：[Vue 筆記：Custom Directives 自定義指令](https://medium.com/@egg8833/vue-%E7%AD%86%E8%A8%98-custom-directives-%E8%87%AA%E5%AE%9A%E7%BE%A9%E6%8C%87%E4%BB%A4-727a3cb0389b)
