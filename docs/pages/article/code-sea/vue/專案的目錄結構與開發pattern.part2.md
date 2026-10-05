---
title: 專案的目錄結構與開發 pattern（二）：照 feature 切，feature 之間怎麼溝通
image: ''
description: '專案大了改照 feature 切資料夾，最難的不是怎麼切，而是 feature 之間要溝通時怎麼辦。整理 event bus、services registry、components registry 三種解耦方式，以及「feature 之間的耦合要像前後端之間只靠一組 URL」這個心法。'
keywords: ''
author: Opshell
createdAt: '2024-11-06'
categories:
  - Project Structure
tags:
  - structure
  - pattern
  - feature
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的筆記寫成全文，論點都保留，補了資料夾範例與三種溝通方式的程式碼（`resoveCompoennt` 修正為 `resolveComponent`）。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
上一篇講的是中小型專案照技術類型分資料夾。專案再長大，常見的情況是改一個功能要在 `components/`、`stores/`、`services/`、`views/` 之間來回跳，於是改成照 feature（功能）切。切完之後馬上會遇到下一個問題：A 功能就是要用到 B 功能的東西，怎麼辦？這篇整理我對這件事的看法，寫給正在把專案拆成 feature 的人。

參考：
- [有意义的前端应用程序文件夹结构](https://www.51cto.com/article/764883.html)
- https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md
:::

## 懶人包

- 照 feature 切的時候，-|feature 和 feature 之間避免溝通，最好是在 application 層級溝通|-。
- 真的要溝通，就用 event bus、services registry、components registry 三種方式做 context 解耦。
- 不能互相溝通的真正目的不是「不能耦合」，而是迴避依賴循環、把耦合點減到只剩一個字串，就像前後端之間只靠一組 URL。
- 一但外部耦合就要做防錯處理，就像不信任後端資料來源一樣。
- 把每個 feature 當成一個可以拆出去的小型專案，共用的東西（例如 fetcher 的 interceptor）在 application 層注入。

## 技術拆解

### 照 feature 切長什麼樣

```sh
src/
├── app/                  # application 層：組裝、全域設定
│   ├── main.ts
│   ├── router.ts
│   └── http.ts           # fetcher 實體與 interceptor
│
├── features/
│   ├── orders/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── api.ts
│   │   ├── store.ts
│   │   └── index.ts      # 對外只開這個出口
│   └── users/
│       ├── components/
│       ├── api.ts
│       └── index.ts
│
└── shared/               # 跟業務無關的共用元件、工具
    ├── components/
    └── utils/
```

每個 feature 自己有元件、邏輯、API、狀態，改「訂單」就只看 `features/orders/`。這種做法也有人叫它垂直切割。

### 規則：feature 之間避免溝通

特別注意：feature 和 feature 之間避免溝通，最好是在 application 層級溝通。

以 features 來做切分開發，跨 feature 的溝通應該盡可能的避免。理想情況下，這樣也不太會把 Pinia 搞得很亂：每個 feature 的 store 只管自己的事，不會出現 A store 引用 B store、B store 又引用 A store 的循環。

### 但你一定會說：就是有要溝通的怎麼辦？

那就只有幾個方案：

1. **event bus**：發一個事件，誰要聽誰去聽。
2. **services registry**：就是透過類似 Vuex 的 `dispatch` 這樣的方法溝通，用全域的 Pinia 作抽象註冊也行。
3. **components registry**：Vue 自帶有，就是 `app.component()` 方法。

基本上採用這三種方式進行 context 解耦。

### 真正的目的：把耦合點縮成一個字串

feature 和 feature 互相不能溝通，真正目的不是不能耦合，是一但你想依賴，可以迴避依賴循環和減少耦合點。

耦合點通常就是一個字串：

```ts
// event bus
emit('EVENT_TYPE');

// services registry
dispatch('METHOD_TYPE');

// components registry
resolveComponent('COMPONENT_TYPE');
```

feature 和 feature 的耦合關係要像是前端和後端之間的耦合。前端和後端之間的耦合靠一組 URL，那 feature 和 feature 之間很類似，差不多就是這回事。

然後一但外部耦合就要做防錯處理。就像我們不信任後端資料來源，有可能會失敗、有可能 404，一樣意思：你 `dispatch` 的那個方法可能根本沒人註冊，`resolveComponent` 可能找不到元件，呼叫端要有退路。

很麻煩，但大型架構是不嫌麻煩的，只嫌宣告不清楚導致難以維護。~~(麻煩是一次性的，看不懂是永久性的。)~~

### 共用的東西在 application 層注入

功能之間不互相連結，但有些東西大家都要用，例如 fetcher。你的 fetcher 實體可能會有 interceptor，這個可以在 application layer 去注入。對，我就是在講該死的 refresh token。

feature 只管「呼叫 API」，token 過期怎麼換、換失敗要不要踢回登入頁，是 application 層的事，不要讓每個 feature 各寫一份。

## 例子與對比

### event bus：用 mitt

Vue 3 拿掉了 `$on` / `$off`，event bus 通常用 `mitt` 這類小套件，事件名稱和參數型別集中定義：

```ts
// shared/eventBus.ts
import mitt from 'mitt';

type Events = {
    'order:created': { orderId: number };
};

export const bus = mitt<Events>();
```

```ts
// features/orders：建立訂單後發事件，不知道也不在乎誰會聽
bus.emit('order:created', { orderId: 42 });

// features/users：自己決定要不要聽
bus.on('order:created', ({ orderId }) => {
    refreshPoints(orderId);
});
```

元件裡 `on` 了記得在 `onUnmounted` 裡 `off`，不然就是 memory leak。

### services registry：註冊 + dispatch

```ts
// shared/registry.ts
type Handler = (payload?: unknown) => unknown;

const services = new Map<string, Handler>();

export function register(type: string, handler: Handler) {
    services.set(type, handler);
}

export function dispatch(type: string, payload?: unknown) {
    const handler = services.get(type);

    if (!handler) {
        // 就像打到 404：沒人註冊就要有退路
        console.warn(`[registry] 找不到服務：${type}`);
        return undefined;
    }

    return handler(payload);
}
```

```ts
// app/main.ts：在 application 層把各 feature 的服務接起來
import { register } from '@/shared/registry';
import { openUserProfile } from '@/features/users';

register('user:openProfile', userId => openUserProfile(userId as number));
```

`orders` 要打開使用者資料，只要 `dispatch('user:openProfile', id)`，完全不用 import `users` 的任何東西。

### components registry：app.component + resolveComponent

```ts
// app/main.ts
import { UserBadge } from '@/features/users';

app.component('UserBadge', UserBadge);
```

```vue
<!-- features/orders/components/OrderRow.vue -->
<script setup lang="ts">
import { resolveComponent } from 'vue';

const UserBadge = resolveComponent('UserBadge');
</script>

<template>
    <component :is="UserBadge" :user-id="1" />
</template>
```

`resolveComponent` 找不到時會回傳原本的字串並在開發模式警告，要嚴謹的話自己判斷回傳值是不是字串，再給一個替代畫面。

### 三種方式對比

| | event bus | services registry | components registry |
|---|---|---|---|
| 耦合點 | 事件名稱 | 方法名稱 | 元件名稱 |
| 方向 | 一對多，發了不管 | 一對一，要回應 | 一對一，要畫面 |
| 適合 | 「發生了某件事」的通知 | 「請幫我做某件事」 | 「借我一塊畫面」 |
| 防錯 | 沒人聽也不會壞 | 要處理沒註冊 | 要處理找不到元件 |

## 結論

未來每個 feature 完全是可以拆出來變成 npm package 或 micro frontend 的。把每個功能都當作一個小型專案，用這種心態在開發大概就不會錯：功能之間不互相連結，真的要連就只靠一個字串，並且像不信任後端一樣做好防錯。

這樣做其實新人也比較好找東西，可以讓新人專注在他的職責區塊。最近開發 API 也是用這種方式開發，我們叫垂直切割。如果想要更嚴格、連層級都規定好的版本，可以接著看 FSD（Feature-Sliced Design）。

feature 之間最好的關係，就是像好鄰居一樣：知道彼此的門牌，但不會直接翻牆過去。
