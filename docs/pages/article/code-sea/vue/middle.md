---
title: '中階 Vue 前端面試題：九題，我會怎麼回答'
image: ''
description: '首次渲染、Vite 分包、響應式原理、Nuxt 的 SSR 與水合、Open Graph、composable 與 Pinia、對話框的資源釋放……整理一份中階前端常被問的題目，以及回答的方向。'
keywords: ''
author: Opshell
createdAt: '2024-09-11'
categories:
  - Vue
tags:
  - Vue
  - 面試
  - Nuxt
  - Vite
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本是兩份題目清單（五個考察面向、九道題），補上每題的回答方向、懶人包與結論。題目來源與情境我不知道，請確認脈絡區塊的說法。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
中階前端的面試，已經不太問「`v-if` 和 `v-show` 差在哪」，而是會往效能、架構、協作去挖。這篇整理一份中階 Vue 職缺常見的題目，加上我會怎麼回答的方向。不是標準答案，是讓你知道面試官大概想聽到什麼。寫給準備從初階往中階跳的人。
:::

## 懶人包
- 中階面試在看五件事：打包工具底層、大量即時資料的效能、大量 DOM 的效能、權限與路由選單的架構、跨部門協作與時程壓力下的心態。
- 回答技術題時，先講**原理**，再講**做法**，最後講**取捨**，比背一堆名詞有說服力。
- 響應式、SSR 水合、資源釋放這幾題，背後都是同一件事：-|你知不知道東西什麼時候被建立、什麼時候該被清掉|-。
- composable 與 Pinia 不是二選一：狀態要不要共享、要不要跨頁存活，決定用哪個。

## 觀點拆解

### 中階在看的五個面向
1. 打包工具底層
2. 持續更新數據的 websocket 和圖表工具效能問題
3. DOM 增多時的效能處理
4. 權限表與路由、選單在後台架構設計上的問題
5. 不同部門協作和時程壓力下的心態

前四個是技術深度，第五個是成熟度。題目就是從這幾個方向展開的，以下逐題講回答方向。

### 1. 如何縮短網頁首次渲染時間？
分三層講：

- **少載一點**：路由與重型元件延遲載入（`() => import()`、`defineAsyncComponent`）、tree-shaking、移除沒用到的套件、圖片用現代格式並設定 `loading="lazy"`。
- **早一點載**：關鍵資源 `preload`、字型 `font-display: swap`、CDN 與 HTTP 快取。
- **換個地方渲染**：SSR 或 SSG，讓使用者先看到 HTML。

最後補一句「我會先用 Lighthouse 或 Performance 面板量 LCP，確認瓶頸在哪再動手」，這句很加分。

### 2. 使用過 Vite 的 Rollup 功能嗎？Chunk 分包怎麼做？
Vite 正式打包時（Vite 6/7）用的是 Rollup，可以透過 `build.rollupOptions.output.manualChunks` 自訂分包：

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules/echarts')) { return 'vendor-echarts'; }
                    if (id.includes('node_modules')) { return 'vendor'; }
                }
            }
        }
    }
});
```

重點是講**為什麼要分**：把很少變動的第三方套件拆出來，改業務程式碼時使用者不用重新下載它，快取命中率高。新版 Vite 逐步改用 Rolldown，設定名稱可能不同，以官方文件為準。

### 3. ref／reactive 的響應式原理？什麼情況會失去響應？
- `reactive` 用 `Proxy` 攔截物件的讀寫：讀的時候記錄「誰依賴我」（track），寫的時候通知它們（trigger）。
- `ref` 是包一層有 `.value` getter／setter 的物件，所以基本型別也能響應；給它物件時，內部會轉成 `reactive`。

失去響應、只剩值的常見情況：

- 解構 `reactive` 物件：`const { count } = state` 拿到的是當下的數字。要用 `toRefs`。
- 把 `ref.value` 傳出去：傳的是值不是 ref。
- 整個替換 `reactive` 物件：`state = { ... }` 換掉的是變數，不是 Proxy。
- Vue 3.5 以前解構 props（3.5 起編譯器會處理）。

### 4. 發現巢狀迴圈導致嵌套，怎麼避免耦合？
先把資料轉成查找表，把 O(n²) 變 O(n)：

```ts
// 巢狀：每筆訂單都去整個使用者陣列找
const rows = orders.map((order) => ({
    ...order,
    user: users.find((user) => user.id === order.userId)
}));

// 先建 Map，查找變成 O(1)
const userMap = new Map(users.map((user) => [user.id, user]));
const rowsFast = orders.map((order) => ({
    ...order,
    user: userMap.get(order.userId)
}));
```

結構上的嵌套則是把每一層的工作拆成小函式，資料先整理好再往下傳，不要在內層迴圈裡讀外層的狀態。這在 [遍歷迴圈組資料效能優化](/article/code-sea/javascript/optimize-array-loop-performance) 有更完整的例子。

### 5. 用過 Nuxt 3 嗎？SSR 怎麼做、怎麼避免水合錯誤？
SSR 是伺服器先跑一次元件產出 HTML，瀏覽器拿到 HTML 後再下載 JS 把它「水合」成可互動的頁面。水合錯誤（hydration mismatch）就是兩邊渲染出來的東西不一樣。

常見原因與解法：

- 用了只有瀏覽器有的東西（`window`、`localStorage`）：放到 `onMounted`，或包在 `<ClientOnly>`。
- 每次結果不同的值（`Date.now()`、`Math.random()`）：在伺服器算好，用 `useState` 或 `useAsyncData` 帶到前端。
- 自己產的 id：用 Vue 3.5 的 `useId()`。
- 不合法的 HTML 巢狀（`<p>` 裡放 `<div>`）：瀏覽器會自動修正，結構就對不上了。

### 6. Nuxt 3 怎麼配置動態路由？
檔案路由用中括號：

```
pages/
├─ users/
│  └─ [id].vue        → /users/:id
├─ blog/
│  └─ [...slug].vue   → /blog/任意層
└─ [[lang]]/about.vue → 選填參數
```

頁面裡用 `useRoute().params.id` 取值，參數驗證可以用 `definePageMeta` 的 `validate`。細節以 Nuxt 官方文件為準。

### 7. Open Graph 對 SEO 的好處與實作
Open Graph 是 `og:title`、`og:description`、`og:image` 這類 meta，決定網址被貼到社群、通訊軟體時的預覽卡片長什麼樣。它不直接影響搜尋排名，但會影響點擊率與分享意願，間接帶流量。

實作重點是**爬蟲不跑 JS**，所以 meta 一定要在 HTML 裡：SPA 要靠 SSR／SSG 或預渲染；Nuxt 可以用 `useSeoMeta`：

```ts
useSeoMeta({
    title: '商品名稱',
    ogTitle: '商品名稱',
    ogDescription: '一句話介紹',
    ogImage: 'https://example.com/og/product.png'
});
```

### 8. composable 做業務邏輯？和 Pinia 差在哪？
composable 是「可重用的邏輯」，每次呼叫一份新的狀態（除非你把 ref 放在模組頂層，詳見 [兩個頁面共用同一個 composable，ref 會不會互相污染？](./composable/資料共用性)）。Pinia 是「全域共享的狀態」，跨頁存活、有 devtools、SSR 安全。

我的判斷方式：

- 只有這個頁面或元件在用、離開就該消失：composable。
- 多個頁面要讀寫同一份、要跨頁保留：Pinia。
- 兩者可以疊：Pinia store 裡用 composable 組邏輯。

### 9. 對話框裡有計算邏輯與 API，關閉時怎麼釋放資源？
- 對話框用 `v-if` 而不是 `v-show`，關閉時元件真的卸載。
- 進行中的請求用 `AbortController` 取消，在 `onBeforeUnmount` 或 `onScopeDispose` 裡呼叫 `abort()`。
- 計時器、全域事件、websocket 訂閱都在卸載時清掉。
- 如果邏輯寫在 composable 裡，清理也寫在 composable 的 `onScopeDispose`，呼叫的人就不用記。

```ts
const controller = new AbortController();

const loadDetail = async (id: number) => {
    const response = await fetch(`/api/detail/${id}`, { signal: controller.signal });
    return response.json();
};

onScopeDispose(() => controller.abort());
```

## 例子與對比

### 同一題，兩種回答
以「如何縮短首次渲染時間」為例：

| | 初階回答 | 中階回答 |
|---|---|---|
| 內容 | 「用 lazy loading、壓縮圖片」 | 先量 LCP，再分「少載、早載、換地方渲染」三層講 |
| 取捨 | 沒提 | 「SSR 會增加伺服器成本與水合問題，所以後台我不會用」 |
| 驗證 | 沒提 | 「改完再量一次，確認真的有變快」 |

面試官要的不是你知道多少名詞，而是你**怎麼思考**。

### 第五個面向：心態
協作與時程壓力沒有標準答案，但有幾個方向可以準備：怎麼跟 PM 談範圍而不是只談時間、技術債怎麼記錄與排進後續迭代、需求不清楚時先確認什麼。準備一兩個你自己真實遇過的例子，比任何漂亮的理論都有用。

## 結論
這九題看起來五花八門，其實都在問同一件事：你寫的程式，你知道它在背後發生了什麼嗎？從「會用」到「知道為什麼」，就是初階到中階的那一步。

祝面試順利，記得面試官也是人，~~他可能也答不出全部~~。
