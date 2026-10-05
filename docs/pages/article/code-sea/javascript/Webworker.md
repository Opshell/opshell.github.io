---
title: 'Web Worker：把粗活丟到背景，畫面才不會卡'
image: ''
description: 'JavaScript 只有一條主執行緒，算重一點畫面就凍住。Web Worker 讓你把運算丟到另一條執行緒，用 postMessage 傳資料。整理用法、Vite 的寫法、能做跟不能做的事。'
keywords: ''
author: Opshell
createdAt: '2024-09-05'
categories:
  - JavaScript
tags:
  - JavaScript
  - Web Worker
  - 效能
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有標題，從頭寫成全文。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
常見的情況是：前端要處理一大包資料，例如解析幾萬筆的 CSV、算報表、壓縮圖片，按下按鈕之後整個畫面凍住，loading 動畫也不轉了，使用者開始狂點。

問題不在你的程式寫得慢，而是它跟畫面搶同一條執行緒。這篇整理 `Web Worker` 怎麼把粗活搬走，寫給第一次遇到「算一算畫面就卡」的前端。
:::

## 懶人包
- 瀏覽器的 JavaScript 跟畫面渲染共用**一條主執行緒**，長時間的運算會讓畫面完全卡住。
- `Web Worker` 是另一條執行緒，把重運算丟過去，主執行緒繼續顧畫面。
- 兩邊不共用變數，只能用 `postMessage` 互傳資料，資料會被複製一份（大的 `ArrayBuffer` 可以用轉移避免複製）。
- Worker 裡**不能碰 DOM**，適合純運算；在 Vite 裡用 `new Worker(new URL('./x.ts', import.meta.url), { type: 'module' })` 建立。
- 慢在等 API 的不用 Worker，`async/await` 就夠了；慢在 CPU 算不完的才需要。

## 技術拆解

### 主執行緒只有一條
把主執行緒想成餐廳裡唯一的服務生：點餐、上菜、結帳都是他。如果他跑去後面切一百顆洋蔥，外場就沒人顧了，客人舉手也沒人理，這就是「畫面卡住」。

`Web Worker` 等於多請一個廚房助手：洋蔥丟給他切，服務生繼續顧外場，切好了助手再把洋蔥端出來。

### 兩邊怎麼溝通
主執行緒跟 Worker **不共用記憶體裡的變數**，只能互相傳訊息：

- `worker.postMessage(data)`：主執行緒 → Worker。
- Worker 裡的 `self.postMessage(data)`：Worker → 主執行緒。
- 兩邊都用 `message` 事件接。

傳過去的資料會用「結構化複製」複製一份，所以物件、陣列、`Map`、`Date` 都能傳，但**函式、DOM 元素、class 的方法傳不過去**。資料很大的時候複製本身也要時間，`ArrayBuffer` 這類可以用「轉移（transfer）」直接把所有權交出去，不用複製，代價是原本那邊就不能再用了。

### Worker 裡能做跟不能做的

| 可以 | 不行 |
|---|---|
| 一般運算、`JSON.parse`、正規表示式 | 讀寫 DOM、`document` |
| `fetch`、`setTimeout`、`IndexedDB` | `window`、`localStorage` |
| `import` 其他模組（module worker） | 直接改 Vue 的響應式資料 |
| `OffscreenCanvas` 畫圖 | 跟主執行緒共用變數 |

## 例子與對比

### 卡住的版本
算 1 到 3000 萬之間有幾個質數，直接在主執行緒跑：

```ts
function countPrimes(limit: number) {
    let count = 0;

    for (let n = 2; n <= limit; n++) {
        let isPrime = true;

        for (let d = 2; d * d <= n; d++) {
            if (n % d === 0) {
                isPrime = false;
                break;
            }
        }

        if (isPrime) { count++; }
    }

    return count;
}

// 按下去之後，畫面會凍住好幾秒
const result = countPrimes(30_000_000);
```

### 搬進 Worker 的版本
```ts
// workers/prime.worker.ts
self.addEventListener('message', (event: MessageEvent<number>) => {
    const limit = event.data;
    let count = 0;

    for (let n = 2; n <= limit; n++) {
        let isPrime = true;

        for (let d = 2; d * d <= n; d++) {
            if (n % d === 0) {
                isPrime = false;
                break;
            }
        }

        if (isPrime) { count++; }
    }

    self.postMessage(count);
});
```

```vue
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';

const result = ref<number | null>(null);
const isLoading = ref(false);

// Vite 看到 new URL(..., import.meta.url) 會幫你把 Worker 一起打包
const worker = new Worker(new URL('../workers/prime.worker.ts', import.meta.url), { type: 'module' });

worker.addEventListener('message', (event: MessageEvent<number>) => {
    result.value = event.data;
    isLoading.value = false;
});

function start() {
    isLoading.value = true;
    worker.postMessage(30_000_000);
}

onBeforeUnmount(() => {
    // 元件不在了，助手也該下班，不然它會一直佔著資源
    worker.terminate();
});
</script>

<template>
    <button :disabled="isLoading" @click="start">開始算</button>
    <p v-if="isLoading">計算中…（畫面還能動喔）</p>
    <p v-else-if="result !== null">共有 {{ result }} 個質數</p>
</template>
```

運算時間沒有變短，-|變的是這段時間畫面還活著|-：loading 會轉、按鈕會有反應、使用者可以去做別的事。

### 什麼時候不用 Worker

| 情況 | 卡在哪 | 解法 |
|---|---|---|
| 等 API 回應 | 網路 | `async/await`，主執行緒本來就沒在忙 |
| 渲染一萬筆列表 | DOM 太多 | 虛擬捲動、分頁，Worker 碰不到 DOM 幫不上忙 |
| 解析大檔、壓縮、加解密、複雜計算 | CPU | **Worker** |
| 只是一個稍慢的迴圈 | CPU，但只有幾十毫秒 | 先優化演算法，Worker 的傳資料成本可能比省下的還多 |

`postMessage` 一來一回寫多了會很像在寫 callback 地獄，覺得麻煩的話可以看 `Comlink` 這類套件，讓呼叫 Worker 像呼叫一般的 async 函式。

## 結論
`Web Worker` 不會讓程式變快，它讓**畫面不用陪你一起等**。判斷要不要用只看一件事：卡住的時候，是在等網路，還是 CPU 在拚命算？後者才請助手。

~~畢竟請助手也要付薪水~~，傳資料的成本記得一起算進去。
