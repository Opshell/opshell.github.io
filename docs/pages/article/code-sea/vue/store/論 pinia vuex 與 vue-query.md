---
title: 伺服器狀態 vs 客戶端狀態：Pinia、Vuex 與 Vue Query 各管什麼
image: ''
description: '以前流行「打 API 都進 store」，有了 Vue Query 之後，store 只該放真正屬於前端的狀態。整理一串群組討論：Pinia 與 Vuex 的取捨、什麼東西才該進 store、以及 AI 時代為什麼宣告清楚比少打幾個字重要。'
keywords: ''
author: Opshell
createdAt: '2024-11-01'
categories:
  - vue
tags:
  - vue
  - pinia
  - vuex
  - vue-query
  - 狀態管理
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把群組對話整理成觀點文，補上脈絡、懶人包、分工表、範例與結論。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
某天想回頭精煉 `Pinia` 的技能，看到一篇講「[Pinia 全域註冊與按需載入](https://cloud.tencent.com/developer/article/1945421)」的文章，就拿去群組問各位大大：現在的 `Pinia` 還需要這樣搞嗎？結果話題一路從 `Pinia` vs `Vuex`，聊到「到底什麼東西該進 store」，最後聊到 AI 寫 code 的時代程式碼該長什麼樣。

這篇整理那串討論，寫給「專案裡 store 越長越胖、每支 API 都塞進 action」的人。姊妹篇 [TanStack Query 是非同步狀態管理，不是 axios 的替代品](../tanstack-query) 講的是 server state 那一半怎麼管。
:::

## 懶人包
- 狀態分兩種：-|伺服器狀態|-（API 回來的資料，真正的主人在後端）和-|客戶端狀態|-（只活在前端的 UI 狀態、連線、登入資訊）。
- 伺服器狀態交給 `Vue Query`（`TanStack Query`），它是 api state manager，不是 api fetcher；store 不要再存一份。
- 真正該進 store 的，是 feature module 之間需要溝通的 context，像 userInfo、WebSocket 連線。
- `Pinia` 彈性高、小專案好用；大型多人專案要注意它的彈性會被拿去偷懶，`Vuex` 的嚴格反而有好處，但 `Vuex` 已經進入維護模式，選型時要一起考慮。
- 少封裝、少共用、global 越少越好、宣告越清楚越好，因為 AI 和人都靠清楚的脈絡在找 bug。

## 觀點拆解

### 那篇「全域註冊與按需載入」還需要嗎
群組的第一個回應是：發文者功底不錯，但看過去只是-|為了共用而共用|-。

我自己的理解是，`Pinia` 的 store 本來就是第一次呼叫 `useXxxStore()` 時才註冊，沒有被 import 的 store 自然會被 tree shaking 掉，「按需載入」是它天生的，不太需要再自己包一層全域註冊。

### Pinia 還是 Vuex
這段意見比較分歧，兩邊都有道理：

- **偏 Vuex 的說法**：大型專案回歸 `Vuex` 的設計理念反而有更多好處，`Pinia` 的設計理念在小專案比較凸顯好處。要搞大型專案，技術選型可以再琢磨一下。我也覺得大型的多人專案用 `Vuex`，的確可以避免很多人為的懶癌問題，因為它逼你走 mutation、逼你分模組。
- **偏 Pinia 的說法**：它就是彈性高，讓複雜度下降很多。也有人直接用 setup 寫法的 `Pinia`，跟寫 composable 一樣自然。
- **另一個角度**：這時候該思考的是，即便專案很大，有必要什麼都往 store 塞嗎？

::: tip 2026 年的現況
`Vue` 官方現在推薦的是 `Pinia`，`Vuex` 已經進入維護模式，不會再有新功能。所以「大型專案用 `Vuex`」在今天比較像是借用它的紀律（模組分清楚、改狀態走固定入口），而不是真的開新專案裝 `Vuex`。
:::

### 「打 API 都進 store」是前幾年的流行
以前的寫法是把 API 都封裝進 store：每支 API 一個 action，action 裡 `try/catch`，回來的資料存進 state，再自己顧 `isLoading`、`error`。前幾年很流行，但 call API 的事件全往裡面塞是很痛苦的。

有了 `vue-query` 之後，這一層可以省掉：

- `vue-query` 可以指定 cache key，會自動幫你合併重複的請求，或者直接取用快取。
- 它可以搭著 `axios` 用，`axios` 還是負責送請求。
- 所以 -|`vue-query` 的定位不是 api fetcher，是 api state manager|-。它底下的 `@tanstack/query-core` 這包很精華，完全把框架邏輯抽象掉了，`Vue`、`React` 只是外面套一層。

但也不用神化它：主要用 `vue-query` 是為了 cache 和 api status，用不到的話，繼續用 `axios` 或 `fetch` 寫 `try/catch` 都沒差。判斷標準很簡單：-|只要是需要狀態管理、又需要 cache 的資料，才用它|-。

### 那 store 還剩什麼
有人說得更直接：目前只有做複雜的應用程式才需要 store，一般網頁完全不需要了。真正需要進 store 的，是 -|feature module 之間需要溝通的 context|-，例如：

- 登入後的 userInfo（很多模組都要讀，但不是每次都要打 API 拿）
- WebSocket 連線與它推來的即時狀態
- 跨頁面的 UI 偏好（主題、語系、側欄收合）

這些東西的共通點是：它們的「主人」就在前端，沒有一個後端資料庫可以當 single source of truth。反過來說，API 回來的資料主人在後端，前端那份只是快取，交給 `vue-query` 管同步就好，store 再存一份就等於有兩個 source of truth。

### DI 跟 auto import 是兩回事
討論中有一段岔題很有意思。有人說：如果遇到需要寫 DI，他絕對反對 auto import，反而覺得 `Vuex` 的設計更合適，搭配 `Vuex` 的 dynamic register（`store.registerModule`）完全可以 tree shaking，所以那篇文章的理解不夠深。

但也有人指出 DI 跟 auto import 好像沒有直接關係：

- **DX（Developer Experience）**：auto import 只是讓你不用手動寫 `import` 那一行，屬於開發體驗的部分。
- **DI（Dependency Injection）**：不要在內部依賴實例，在約定好介面的前提下，從外部注入需要用到的實例，屬於實際執行的部分。

原本想講的其實是「依賴注入這個使用概念」：依賴要看得見、要能追。這就接到下一段。

### AI 時代，宣告清楚比少打字重要
這串最後的共識，我覺得是最有價值的：

- 越來越偏好-|少封裝、少共用|-，global 的東西越少越好，宣告越清楚越好。
- 蛤？很麻煩？現在都 AI 在寫 code 了，又不是讓你手寫，Tab 兩下就寫完了。
- 好不好做依賴反查，是大型專案更關切的事。
- 現在能清楚找到脈絡更重要，所以程式碼可讀性的重要性比以前高不少。
- 因為 AI debug 很弱，它會無限鬼打牆 XD 宣告清楚可以幫助 AI 和人找出問題，所以不喜歡任何「偷懶型設計」。

## 例子與對比

### 該放哪裡：一張表

| 資料 | 主人在哪 | 放哪裡 |
|---|---|---|
| 商品列表、訂單詳情 | 後端 | `Vue Query` |
| 下拉選單的選項（從 API 來） | 後端 | `Vue Query`（設長一點的 `staleTime`） |
| 登入後的 userInfo | 後端有，但前端要跨模組讀 | store，或 `Vue Query` 加長快取，二選一，不要兩邊都存 |
| WebSocket 連線、即時通知 | 前端 | store |
| 主題、語系、側欄收合 | 前端 | store（需要的話加持久化） |
| 正在編輯的表單 | 前端 | 元件自己的 `ref`／`reactive` |

### 舊做法：store 包辦一切

```ts
// stores/order.ts
export const useOrderStore = defineStore('order', () => {
    const orders = ref<Order[]>([]);
    const isLoading = ref(false);
    const error = ref<unknown>(null);
    const theme = ref<'light' | 'dark'>('light'); // 客戶端狀態混在同一包

    async function fetchOrders() {
        isLoading.value = true;
        try {
            const { data } = await axios.get<Order[]>('/api/orders');
            orders.value = data;
        } catch (err) {
            error.value = err;
        } finally {
            isLoading.value = false;
        }
    }

    return { orders, isLoading, error, theme, fetchOrders };
});
```

問題：兩個頁面都呼叫 `fetchOrders()` 就打兩次；什麼時候算過期要自己判斷；server state 和 UI 狀態綁在同一包。

### 新做法：各管各的

```ts
// queries/order.ts：server state
export const orderQueries = {
    list: () => queryOptions({
        queryKey: ['orders'],
        queryFn: ({ signal }) => axios.get<Order[]>('/api/orders', { signal }).then(res => res.data),
        staleTime: 60 * 1000
    })
};
```

```ts
// stores/ui.ts：client state，只放前端自己的東西
export const useUiStore = defineStore('ui', () => {
    const theme = ref<'light' | 'dark'>('light');

    function toggleTheme() {
        theme.value = theme.value === 'light' ? 'dark' : 'light';
    }

    return { theme, toggleTheme };
});
```

```vue
<script setup lang="ts">
    import { useQuery } from '@tanstack/vue-query';
    import { orderQueries } from '@/queries/order';
    import { useUiStore } from '@/stores/ui';

    const { data: orders, isPending } = useQuery(orderQueries.list());
    const uiStore = useUiStore();
</script>
```

每一行依賴都有明確的 `import`，要反查「誰在用訂單資料」，搜 `orderQueries` 就找到了，人和 AI 都不用猜。

## 結論
store 不是倉庫，不用什麼都往裡面堆。先問一句「這份資料的主人是誰」：主人在後端，就交給 `Vue Query` 去同步；主人在前端，才輪到 store。選 `Pinia` 還是借用 `Vuex` 的紀律，比不上「宣告清楚、global 越少越好」這條原則重要。

畢竟 AI 再會寫，遇到滿地 global 的專案，也只會陪你一起鬼打牆。
