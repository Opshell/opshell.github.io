---
title: '路由之間傳物件：history state，以及 Vue Router 的 Data Loaders'
image: ''
description: '不想用 query 或 params 傳資料，想在換頁時帶一整個物件？可以用 history state。順便聊聊 Vue Router 團隊正在做的 Data Loaders：在路由層載入資料、自帶取消。'
keywords: ''
author: Opshell
createdAt: '2024-09-12'
categories:
  - Vue
tags:
  - Vue
  - Vue Router
  - Data Loaders
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的群組筆記寫成全文，補上 Vue Router 4 的 state 寫法、懶人包與結論，並修正範例中 loader 回傳值的取用方式。Data Loaders 仍是實驗功能，發佈前請再對一次官方文件。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
從列表頁點進詳細頁，列表裡明明已經有這筆資料了，常見的情況是：不想把整個物件塞進網址，又不想進到詳細頁再打一次 API。群組裡聊到這件事，一路從 history state 聊到 Vue Router 團隊正在做的 Data Loaders，我把它整理成這篇。寫給在路由之間傳資料傷腦筋的人。
:::

## 懶人包
- 不想用 query string 或 path 傳資料，可以用瀏覽器 history API 的 `state` 帶物件。
- Vue Router 自己也用了 `history.state`，不能直接覆蓋；Vue Router 4 的 `router.push` 有 `state` 選項，讀取用 `history.state`。
- state 重新整理還在、直接開網址就沒有，所以只能當「加速用」，詳細頁還是要能自己打 API。
- Data Loaders 想把「資料載入」搬到路由層：換頁時就開始抓、可以阻塞或不阻塞導航、取消導航會自動取消請求。
- Data Loaders 目前仍屬實驗功能，用在正式專案前請看官方文件。

## 技術拆解

### history state 是什麼
瀏覽器每一筆歷史紀錄都可以掛一個 `state` 物件，`history.pushState(state, '', url)` 時放進去，之後用 `history.state` 讀。它不出現在網址上，可以放結構化的資料（要能被 structured clone）。

不過 Vue Router 已經占用了 `state`，裡面放了它自己要用的東西（例如前後頁、捲動位置），所以不能直接覆蓋。Vue Router 3 時代要自己繞路處理，這在 [vue-router#2243](https://github.com/vuejs/vue-router/issues/2243#issuecomment-591439883) 有討論過寫法。

Vue Router 4 則直接在導航選項提供了 `state`，它會跟 Vue Router 自己的 state 合併：

```ts
router.push({
    name: 'MemberDetail',
    params: { id: member.id },
    state: { member: { ...member } } // 要是可以被複製的純資料
});
```

```ts
// 詳細頁
const cached = history.state?.member as Member | undefined;
```

### state 的限制
- 使用者直接開網址、從書籤進來、分享連結給別人：沒有 state。
- 重新整理頁面：state 還在（瀏覽器會保留）。
- 不能放函式、class 實例、`ref`。

所以 state 只適合當「先顯示、再更新」的快取，詳細頁一定要有自己抓資料的能力。

### Data Loaders：把資料載入搬到路由層
Vue Router 團隊後來把心力放在 [Data Loaders](https://uvr.esm.is/data-loaders/)。我一開始真的看不太懂為什麼需要這個東西 XD，後來想通了：

一般我們都在 `created` 或 `mounted`，也就是現在的 `setup`、`onMounted` 載入資料。這種方式在專案越大的時候，邏輯會越分散，每個頁面各寫一套 loading、錯誤處理、取消。Data Loaders 想讓這件事更簡單：**路由一變化，就先把這一頁需要的資料載入**（prefetch 的概念）。

它的好處：

- **SSR 便利**：loader 層就能把資料處理掉，減少水合問題。
- **可以跟 router guard 結合**：資料載不到，可以直接決定導航要不要繼續。
- **自帶取消**：使用者取消這次導航（例如快速連點別的頁面），loader 裡的非同步請求會透過 [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) 被取消，這點跟 Vue Query 一樣方便。
- **可以選擇要不要阻塞導航**：預設等資料載好才換頁，設定 [`lazy`](https://uvr.esm.is/data-loaders/defining-loaders.html#non-blocking-loaders-with-lazy) 就先換頁、資料晚點到。

它目前需要搭配 `unplugin-vue-router`（檔案路由的部分見 [router type](./router-type)），我原本的打算是裝起來玩玩看才知道。

## 例子與對比

### Data Loader 的寫法
loader 要在頁面元件裡，用一般的 `<script>`（不是 `setup`）export 出去：

```vue
<script lang="ts">
import { defineBasicLoader } from 'unplugin-vue-router/data-loaders/basic';
import { fetchUserData } from '@/service/api';

export const useUserData = defineBasicLoader('/user/[uid]', async (route) => {
    // 假設要回傳一組物件資料
    const userData = await fetchUserData(route.params.uid);

    return {
        userData,
        otherObject: { from: 'loader' }
    };
});
</script>

<script setup lang="ts">
// 到元件調用：loader 回傳的東西放在 data 裡
const { data, isLoading, error, reload } = useUserData();
</script>

<template>
    <p v-if="isLoading">載入中…</p>
    <p v-else-if="error">載入失敗</p>
    <p v-else>{{ data.userData.name }}</p>
</template>
```

原本筆記寫的是 `const { userData, otherObject } = useUserData()`，但 loader 回傳值是包在 `data` 這個 ref 裡的，要從 `data` 取。路徑寫法、`signal` 怎麼拿、回傳欄位的名稱，請以官方文件的最新版本為準。

### 三種傳資料方式比較
| | query／params | history state | Data Loader |
|---|---|---|---|
| 出現在網址 | 是 | 否 | 否 |
| 能放物件 | 要序列化，很醜 | 可以 | 由 loader 自己抓 |
| 直接開網址 | 有 | 沒有 | 有（loader 會抓） |
| 適合 | 篩選條件、頁碼、id | 列表到詳細頁的預覽快取 | 每頁固定要的資料 |

## 結論
想在路由之間帶物件，history state 是最輕的做法，但它只是快取，不是資料來源。真正長期的方向，是像 Data Loaders 這樣把「這頁需要什麼資料」交給路由層統一管理。等它從實驗轉正，我應該會是第一批搬家的人 ~~（前提是我看得懂文件）~~。
