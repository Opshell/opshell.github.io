---
title: 'Web Observer：瀏覽器內建的四個觀察者'
image: ''
description: '進入畫面、尺寸改變、DOM 被改、效能指標，這四件事瀏覽器都有內建的觀察者幫你盯。整理 IntersectionObserver、ResizeObserver、MutationObserver、PerformanceObserver 的用途，以及它們取代了哪些舊做法。'
keywords: ''
author: Opshell
createdAt: '2025-07-18'
categories:
  - JavaScript
tags:
  - JavaScript
  - DOM
  - 效能
  - Vue
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有參考連結，依主題寫成四個觀察者的整理與對比。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
做圖片懶載入、無限捲動、圖表跟著容器縮放的時候，很多人的第一反應是監聽 `scroll` 或 `resize` 事件，然後在裡面一直算位置。能動，但捲一捲畫面就開始卡。

瀏覽器其實內建了四個「觀察者」，專門幫你盯這些事，有變化才通知你。這篇參考 [這篇四種觀察者的整理](https://xiaotianxia.github.io/blog/vuepress/js/four_kinds_of_observers.html)，用 2026 年的角度重新整理一次，寫給還在 `scroll` 事件裡算 `getBoundingClientRect` 的人。
:::

## 懶人包
- `IntersectionObserver`：元素**進出畫面**（或某個容器）時通知你，懶載入、無限捲動、曝光追蹤都靠它。
- `ResizeObserver`：**元素本身**的尺寸改變時通知你，不只是視窗；圖表、自適應元件必備。
- `MutationObserver`：**DOM 被改**（新增節點、改屬性、改文字）時通知你，盯第三方套件塞進來的東西最好用。
- `PerformanceObserver`：**效能指標**（LCP、長任務、資源載入）產生時通知你。
- 四個用法幾乎一樣：`new` 一個、`observe` 目標、在 callback 處理，**不用的時候一定要 `disconnect`**。

## 技術拆解

### 為什麼需要觀察者
舊做法是「一直問」：每次捲動就問一次「那個元素進畫面了沒？」，捲動事件一秒可以觸發幾十次，每次還要讀版面位置，瀏覽器被迫一直重算，畫面就卡了。

觀察者是「有事再叫我」：你跟瀏覽器說要盯哪個元素，瀏覽器在自己方便的時候檢查，真的有變化才呼叫你的 callback。用保全比喻：舊做法是你每五秒親自去門口看一次，觀察者是裝一個門鈴。

### 共通的用法
```ts
const observer = new XxxObserver((entries) => {
    entries.forEach((entry) => {
        // 處理每一筆變化
    });
}, options);

observer.observe(target);    // 開始盯
observer.unobserve(target);  // 不盯這一個（Mutation 和 Performance 沒有這個方法）
observer.disconnect();       // 全部收工
```

### IntersectionObserver：進出畫面
```ts
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) { return; }

        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src ?? '';
        observer.unobserve(img); // 載入過就不用再盯了
    });
}, {
    rootMargin: '200px', // 還差 200px 進畫面就先開始載
    threshold: 0
});

document.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((img) => observer.observe(img));
```

- `root`：要以哪個容器當「畫面」，預設是視窗。
- `rootMargin`：把判定範圍往外擴，提早觸發。
- `threshold`：露出多少比例才算進入，`0` 是露出一點點就算，`1` 是要完整露出。

純圖片的懶載入，現在直接寫 `<img loading="lazy">` 就好；`IntersectionObserver` 留給無限捲動、進場動畫、曝光追蹤這些需要自己寫邏輯的情境。

### ResizeObserver：元素自己的尺寸
`window` 的 `resize` 只知道視窗變了，但元素尺寸會變的原因很多：側欄收合、內容變多、父層是 flex。`ResizeObserver` 直接盯元素本身：

```ts
const observer = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
        const { width, height } = entry.contentRect;
        chart.resize(width, height);
    });
});

observer.observe(chartContainer);
```

只是要依容器寬度切換**樣式**的話，CSS 的 container queries（`@container`）已經可以做，不用寫 JavaScript；要呼叫 JS 的東西（像圖表的 `resize()`）才需要 `ResizeObserver`。

### MutationObserver：DOM 被改了
```ts
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement && node.matches('.third-party-banner')) {
                node.remove();
            }
        });
    });
});

observer.observe(document.body, {
    childList: true, // 子節點的新增與移除
    subtree: true,   // 包含所有後代
    attributes: false
});
```

它取代的是舊的 Mutation Events（`DOMSubtreeModified` 那一系列），那些舊事件每次改動都同步觸發、拖慢效能，已經被棄用，主流瀏覽器也陸續移除了。

在 Vue 裡，自己的資料變化用 `watch` 就好，**不需要**用 `MutationObserver` 盯自己渲染出來的 DOM；它適合盯「不歸 Vue 管」的 DOM，例如第三方套件或廣告腳本塞進來的東西。`subtree: true` 盯整個 `body` 很耗效能，範圍能縮就縮。

### PerformanceObserver：效能指標
```ts
const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
        console.log(entry.entryType, entry.name, entry.startTime);
    });
});

observer.observe({ type: 'largest-contentful-paint', buffered: true });
```

`buffered: true` 會把觀察開始之前就已經發生的紀錄也補給你。支援哪些 `type` 各瀏覽器不太一樣，以 MDN 的相容表為準；要量 Core Web Vitals，直接用 Google 的 `web-vitals` 套件會省事很多。

## 例子與對比

### 舊做法 vs 觀察者

| 需求 | 舊做法 | 觀察者 | 好在哪 |
|---|---|---|---|
| 進入畫面 | `scroll` 事件 + `getBoundingClientRect` | `IntersectionObserver` | 不用每次捲動都重算版面 |
| 尺寸改變 | `window` 的 `resize` 事件 | `ResizeObserver` | 抓得到非視窗造成的尺寸變化 |
| DOM 改變 | Mutation Events、`setInterval` 輪詢 | `MutationObserver` | 批次通知，不拖慢每次修改 |
| 效能指標 | `performance.getEntries()` 自己輪詢 | `PerformanceObserver` | 有新紀錄才通知 |

### 在 Vue 裡用：記得收拾
```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';

const sentinel = useTemplateRef<HTMLElement>('sentinel');
const items = ref<number[]>(Array.from({ length: 20 }, (_, i) => i));

let observer: IntersectionObserver | null = null;

function loadMore() {
    const start = items.value.length;
    items.value.push(...Array.from({ length: 20 }, (_, i) => start + i));
}

onMounted(() => {
    observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) { loadMore(); }
    });

    if (sentinel.value) {
        observer.observe(sentinel.value);
    }
});

onBeforeUnmount(() => {
    observer?.disconnect();
});
</script>

<template>
    <ul>
        <li v-for="item in items" :key="item">第 {{ item }} 筆</li>
    </ul>
    <!-- 捲到這個哨兵出現，就載入下一批 -->
    <div ref="sentinel" />
</template>
```

不想自己管生命週期的話，`VueUse` 的 `useIntersectionObserver`、`useResizeObserver`、`useMutationObserver` 都幫你在元件卸載時自動 `disconnect`。

## 結論
四個觀察者分工很清楚：**看得到嗎、多大、被改了嗎、跑多快**。共通的原則只有一個，從「一直去問」換成「有事再叫我」，畫面自然就順了。

最後再提醒一次：觀察者是門鈴，搬家的時候記得拆走，~~不然半夜還會一直響~~。
