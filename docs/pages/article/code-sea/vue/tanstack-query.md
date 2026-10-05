---
title: TanStack Query 是非同步狀態管理，不是 axios 的替代品
image: ''
description: 'axios 負責把請求送出去，TanStack Query 負責管理「這份伺服器資料現在是什麼狀態」。從 useQuery 不再有 onSuccess 講起，整理 useQuery 是同步機不是請求機、表單初始值怎麼接、樂觀更新與 queryOptions 封裝。'
keywords: ''
author: Opshell
createdAt: '2025-07-24'
categories:
  - vue
tags:
  - vue
  - tanstack-query
  - vue-query
  - axios
  - 狀態管理
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把群組討論與 AI 回答整理成全文，補上懶人包、脈絡、Vue 版範例與結論，並修正 v5 已改名或移除的 API。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
常見的情況是：專案已經是 `Vite` + `Vue 3.5` + `TypeScript` + `Pinia` + `axios`，聽說 `TanStack Query` 很香，第一個反應卻是「我都有 `axios` 了，為什麼還要再裝一個打 API 的東西？」接著真的用下去，又會撞到「`useQuery` 怎麼沒有 `onSuccess` 了」「表單初始值要怎麼塞」這種問題。

這篇是群組裡一串討論的整理，寫給已經會用 `axios`、想知道 `TanStack Query` 到底在管什麼的人。姊妹篇 [伺服器狀態 vs 客戶端狀態](./store/論%20pinia%20vuex%20與%20vue-query) 講的是「那 `Pinia` 還要放什麼」，可以一起看。
:::

## 懶人包
- `axios` 是 Http Fetcher，`TanStack Query` 是-|非同步狀態管理|-，兩個不衝突、也不重疊，`axios` 照用，丟進 `queryFn` 就好。
- `useQuery` 不是請求機，是-|同步機|-：你不該關心資料「什麼時候回來」，只關心它「同步到了沒」，所以 v5 把 `useQuery` 的 `onSuccess` 拿掉了。
- 需要在「成功的那一刻」做事的，通常是寫入，那是 `useMutation` 的工作。
- 表單的狀態不要依賴 query 的狀態：資料到之前先畫骨架，拿到資料再渲染表單，初始值就不會需要「更新」。
- 不是每個專案都要上：資料要跨元件共用、要快取、要背景重抓、要樂觀更新，才值得付這個學習成本；封裝的單位也從「包一個 `useXxx`」改成 `queryOptions`。

## 技術拆解

### 它管的是狀態，不是請求
先把分工講清楚：

| | 負責什麼 |
|---|---|
| `axios`／`fetch` | 把 HTTP 請求送出去、把回應拿回來（Http Fetcher） |
| `TanStack Query` | 什麼時候發查詢、結果快取多久、什麼時候算過期、載入中／錯誤這些狀態 |

`TanStack Query` 控管的是-|發動查詢的時機和快取|-，只要是非同步行為都可以交給它，不一定是 HTTP。寫起來有點像 `Nuxt` 的 `useAsyncData`，而且 `useAsyncData` 這幾版更新下來，是越來越像 `useQuery` 了。

如果要給它一個比較好入門的心智模型：把它當成 -|pipeline + 狀態管理工具|- 來看，就比較容易進入狀況。它用到很多高超的技巧，要花時間吸收，但懂了之後才會發現它幫你省了多少麻煩。不用太刻意練習，先把 `useQuery` 弄懂，再去看 `useMutation`。（Google 搜 `useQuery` 會看到 Alex Liu 大大的文章，我有存起來 XDD）

### 它幫你做掉了哪些事
官方叫它跨框架的資料層，`Vue` 用的是 `@tanstack/vue-query`，跟 Composition API 整合得很好。核心功能大概是這些：

- **快取**：同一個查詢不會重複打，可以設定多久算過期（`staleTime`）、多久沒人用就清掉（`gcTime`，v4 叫 `cacheTime`）。
- **狀態**：`data`、`error`、`isPending`、`isFetching`、`isError` 直接給你，不用自己宣告一堆 `isLoading`。
- **自動重抓**：視窗重新聚焦、網路重新連線時自動同步。
- **Query Key**：用一組 key 唯一識別一份資料，快取、失效、預抓都靠它。
- **Mutation**：修改資料（POST／PUT／DELETE），完成後可以讓相關查詢失效重抓。
- **樂觀更新**：先改畫面，失敗再回滾。
- **進階場景**：無限捲動（infinite queries）、依賴查詢（dependent queries）、Devtools。
- **TypeScript**：查詢資料的型別可以靠泛型或 `queryFn` 的回傳推導出來。

### 為什麼 useQuery 沒有 onSuccess 了
這是最多人卡住的地方。v5 把 `useQuery` 的 `onSuccess`／`onError`／`onSettled` 拿掉了（討論在 [TanStack/query#5279](https://github.com/TanStack/query/discussions/5279)），理由是 -|UI 狀態與 API 狀態混在一起|- 一直被詬病。

群組裡幾種說法放在一起看就很清楚：

- 會想要用 `useQuery` 去抓 `onSuccess`，代表還沒懂 `useQuery`。這也是 `TanStack` 難學的地方，它要大家突然轉換思維。
- 把 `useQuery` 當成類似 `useEffect + fetch` 的組合，本來就不符合它的核心，他們認為這違反框架的響應式原則。
- `useQuery` 和 `useMutation` 已經是再一層抽象，它不對應 HTTP Method。`useQuery` 很像 `Vue` 的響應式資料：定義好之後資料流會自動處理，資料自己會來，是很純粹的狀態機；`useMutation` 則是有副作用、要你主動呼叫才會執行的操作，所以才需要關注成功或失敗的當下。
- `useQuery` 的功能是讓你跟某個資料源-|進行同步|-。因為是同步，所以你不關心什麼時候做完，只關心同步到了沒。你在回應上交雜邏輯的時候，就已經扭曲了「同步」這件事：`queryFn` 是一支 sync function，不是 get function。
- 就像你用 store 的時候，不會沒事去監聽「`setStoreState` 這個函式有沒有人呼叫」，你只關心狀態有沒有改變。

換句話說：

- `queryKey` = 訂閱這個資料來源的聲明。
- Query = 把 Server State 帶進來，只讀、負責快取同步。
- Mutation = 修改 Server State。

`useQuery` 看起來就像是：「我對這份資料有需求，但我要指定什麼時候抓、要不要抓，然後把結果推回來給我」。純讀取機，只在你給的條件成立時去重新訂閱。

基本上，我覺得 `useQuery` 絕對不需要 `onSuccess`；你覺得需要，八成是心智模型錯了，這個非常抽象。~~（我自己就是被點醒的那個）~~

### 用了它，還要 store 嗎
這段討論的結論是：-|server state 交給 `TanStack Query` 之後，就不該再存一份到 store|-，不然等於把資料存到兩個 store。

- 想對資料顆粒度做更細的控制？可以在 `queryFn` 裡面組，沒人規定一支 `queryFn` 只能有一個 API 來源。
- 分清楚什麼是 client state、什麼是 server state，就不會有顆粒度的阻礙。client state 與 server state 都只該有一個 single source of truth。

`Pinia` 還是有用，它負責的是本地狀態（表單輸入、UI 設定、登入後的 userInfo、WebSocket 連線這類），細節寫在 [伺服器狀態 vs 客戶端狀態](./store/論%20pinia%20vuex%20與%20vue-query)。

### 樂觀更新是什麼
「樂觀更新」其實是後端比較常用的詞，後端把資料庫當成狀態機，才會有這種說法。它就是為了即時更新 UI：先拿快取改好給你看，等 server 回應了再修正。代價是有資料不一致的風險，就像 Redis 咬著你一部分的狀態，你怎麼刷就是看不到入帳了沒。

如果把整個前後端當成一個 observable system，所有「畫面顯示」表現的都是「資料庫狀態」，改變狀態就等於要先改資料庫：

```txt
Mutation => API => DB => Response => Query => State => UI
```

這是很標準的 Flux（單向資料流）。

### 什麼時候才值得用
有人會覺得「一般進入頁面 GET 資料、編輯欄位、送出更新，這種根本不需要 vue query」。比較保守的判斷標準是，有下面這些需求才用：

1. 會被多個元件／頁面重複讀取，需要共享。
2. 要考慮 `staleTime`、背景 refetch、視窗重新聚焦後打一次 API。
3. retry／error 邏輯要統一。
4. 離線／重新連線要自動恢復。
5. 需要樂觀更新（`onMutate`／rollback）。

但也有反方意見：其實不一定要共享才用 `useQuery`。使用者在兩個畫面切來切去，API 就瘋狂打打打，多浪費；`staleTime` 幫你管快取、減少請求次數，這個商業價值多高啊～～說它是 QPS 優化神器也不為過。

它比 `AbortController` 好的地方在於：Abort 以後你在 Network 看到 status 是 canceled，但部分封包其實早就跑到後端去了；`TanStack Query` 則是在事件內直接取用快取，根本沒發出去。`useQuery` 連同元件掛載、卸載的生命週期都幫你想好了，手動打 API 還得自己 Abort。

::: tip 小補充
`TanStack Query` 預設不會幫你中斷已經發出去的請求。它會把 `signal` 傳進 `queryFn`，你把它接給 `axios`（`axios.get(url, { signal })`），元件卸載、沒人訂閱時才會真的取消。
:::

真要講缺點，就是-|概念太抽象，不好學|-。另外也要老實面對 AI 回答裡提到的幾個成本：

- 學習曲線：查詢鍵、快取策略、突變這些概念，團隊要花時間熟悉。
- 重構成本：專案已經有大量 `axios` 邏輯的話，要一支一支搬。好在 `axios` 可以直接當 `queryFn` 用，遷移成本可控。
- 殺雞用牛刀：API 很單純、只有少量 GET 的話，短期內看不到收益。
- 多一個依賴：體積不算大，但還是要維護。

所以遇到使用上的問題，可以先排解一下：是不是真的有必要用到 vue query？

### 怎麼降低導入門檻
- **從最常被取用的資料下手**：例如 meta options、site config、進入後台以後一定要的那些資料，先掛在 vue query 上快取，小部分實作。
- **用 `ts-rest` 逐步採用**：它的 client 同時提供普通 client（fetch）與 vue query，一般情況用普通 client，有效能需求的地方再換成 vue query，就不怕複雜度一下子太高。有一些網頁真的很單純，硬加 Vue Query 只會徒增團隊協作的困擾 XD
- **以 `queryOptions` 為單位封裝**：下面細講。

### 封裝：從包 useXxx 到 queryOptions
以前很經典的做法是自己包一層 `useUserProfile()`，官方也曾經推薦過（[Cosden Solutions 的影片](https://www.youtube.com/watch?v=0NU9aCTLopo) 是 React 版的經典示範，用了 react-query 就不需要 zustand）。但-|封裝 `useQuery` 已經是舊做法|-，官方現在推薦以 [`queryOptions`](https://tanstack.com/query/v5/docs/framework/react/guides/query-options) 為單位來封裝。

一開始我以為 `queryOptions` 只是個 type helper，但 type helper 只是順帶的好處，真正有價值的有兩個：

1. **options 不是 hook／composable**，所以重用的邏輯就從框架中解耦了：可以在純 JS 裡拿 `queryClient` 做各種操作（操作特定 key group、prefetch），也可以在元件裡交給 `useQuery`、`useMutation`。
2. **客製化變得很自由**：以往封裝 `useQuery`，想客製化某些規則（像 `enabled`）就要額外開參數傳進去；現在直接展開 options 再加客製化參數就好。

這確實是有客製化需求時很好的做法，可以少很多樣板程式碼。不過我自己的偏好是：資料層封多一點，最好使用的人不用管 query 要改什麼參數。

## 例子與對比

### 從 axios 手刻到 useQuery
手刻版，每支 API 都要自己顧三個狀態：

```ts
const data = ref<Data>();
const error = ref<unknown>();
const isLoading = ref(false);

async function fetchData() {
    try {
        isLoading.value = true;
        const response = await axios.get<Data>('/api/data');
        data.value = response.data;
    } catch (err) {
        error.value = err;
    } finally {
        isLoading.value = false;
    }
}
```

`useQuery` 版，`axios` 還在，只是被放進 `queryFn`：

```ts
import { useQuery } from '@tanstack/vue-query';

const { data, isPending, error } = useQuery({
    queryKey: ['data'],
    queryFn: () => axios.get<Data>('/api/data').then(res => res.data)
});
```

### 從 Pinia action 到 queryOptions
以前很流行「拉 API 都進 store」：

```ts
// stores/user.ts（舊做法）
import { defineStore } from 'pinia';
import axios from 'axios';

export const useUserStore = defineStore('user', {
    state: () => ({
        users: [] as User[],
        isLoading: false,
        error: null as unknown
    }),
    actions: {
        async fetchUsers() {
            this.isLoading = true;
            try {
                const response = await axios.get<User[]>('/api/users');
                this.users = response.data;
            } catch (err) {
                this.error = err;
            } finally {
                this.isLoading = false;
            }
        }
    }
});
```

改用 `queryOptions`，store 裡就不用放這包 server state 了：

```ts
// queries/user.ts
import { queryOptions } from '@tanstack/vue-query';
import axios from 'axios';

export const userQueries = {
    list: () => queryOptions({
        queryKey: ['users'],
        queryFn: ({ signal }) => axios.get<User[]>('/api/users', { signal }).then(res => res.data)
    }),
    profile: () => queryOptions({
        queryKey: ['userProfile'],
        queryFn: ({ signal }) => axios.get<User>('/user/profile', { signal }).then(res => res.data),
        staleTime: 5 * 60 * 1000, // 5 分鐘內都算新鮮，不重抓
        gcTime: 30 * 60 * 1000 // 30 分鐘沒人用就清掉快取（v4 叫 cacheTime）
    })
};
```

```vue
<script setup lang="ts">
    import { useQuery } from '@tanstack/vue-query';
    import { userQueries } from '@/queries/user';

    const { data: users, isPending, error } = useQuery(userQueries.list());
</script>

<template>
    <div v-if="isPending">Loading...</div>
    <div v-else-if="error">{{ error.message }}</div>
    <ul v-else>
        <li v-for="user in users" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

要客製化就展開再加，例如只在登入後才抓：

```ts
const { data } = useQuery({
    ...userQueries.profile(),
    enabled: computed(() => isLoggedIn.value)
});
```

在元件外面也能用同一份 options 預抓：

```ts
await queryClient.prefetchQuery(userQueries.list());
```

### 表單初始值：從 useQuery 拿資料給 VeeValidate
問題是這樣：「一般怎麼把 `useQuery` 取得的資料塞給 `vee-validate` 當初始值？」第一個直覺是 `onSuccess`，但它在 `useQuery` 上已經被拿掉了，只剩 mutation 有。

討論中出現過幾種做法，由差到好排：

**1. `watchEffect` 或在 `select` 裡 `setValues`**：最直覺，也比較旁門。`select` 是拿來轉換資料格式的，在裡面改表單等於在同步機裡塞副作用。`watchEffect` 自動收集依賴，不推薦的原因是你很難一眼看出它到底在追誰。

```ts
const { data } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser
});

watchEffect(() => {
    if (data.value) {
        setValues(data.value);
    }
});
```

**2. 依 `isSuccess` 用 `computed` 處理**：也沒什麼好困惑的，你還是得針對 `isSuccess` 給的狀態處理。但注意 `useForm` 是 composable，要在 `setup` 同步呼叫，不能放進 `computed` 裡面建。

**3. 不要讓表單去追 data 的更新**：-|表單的狀態不應該依賴 query 的狀態|-。你依賴那個資料更新，等於 API state 跟 UI state 是同步的，只有簡單情境適用。要重設表單，最簡單的方式是準備一包同樣結構的預設值整包覆蓋；需要最新資料時，`await queryClient.invalidateQueries(...)` 或 `await queryClient.fetchQuery(...)` 之後再更新。

**4. 拆元件：資料到之前不渲染表單**：這是最乾淨的。拿到 query 資料之前先把子表單渲染成 skeleton，拿到資料才真正渲染，這時子表單一出生就有初始值，不用在 `onSuccess` 或 `useEffect` 裡再去操作一次。

這裡有一個坑：很多人想要去「更新」initValue，但既然叫 initValue，就不應該改變。所以邏輯是-|資料拿到前不應該渲染畫面，或是用 `key` 強迫重新掛載|-。比較多問題其實是大家習慣一個元件裡同時做完 form 跟 `useQuery`，拆開之後會單純很多。

討論時用的是 React 範例：

```jsx
// BadForm.jsx：在元件內部用 useEffect 處理初始化，耦合性高
import React, { useEffect } from 'react';

function BadForm() {
    const { data } = useSomeQuery();

    useEffect(() => {
        if (data) {
            // some form init value
        }
    }, [data]);

    return (
        <div>
            <form action="">
                some form
            </form>
        </div>
    );
}

export default BadForm;
```

```jsx
// GoodForm.jsx：表單與資料解耦，父層傳 initData 與 onSubmit，好維護也好測試
function SkeletonForm() {
    return 'skeleton form';
}

function GoodForm({ initData, onSubmit }) {
    return (
        <div>
            <form action="" initData={initData} onSubmit={onSubmit}>
                some form
            </form>
        </div>
    );
}

function FormWithQuery() {
    const { data } = useSomeQuery();
    const mutation = useSomeMutation();

    if (!data) {
        return <SkeletonForm />;
    }

    return <GoodForm initData={data} onSubmit={mutation.mutate} />;
}

export default FormWithQuery;
```

換成 `Vue` 是同一個道理：

```vue
<!-- UserFormWithQuery.vue -->
<script setup lang="ts">
    import { useQuery } from '@tanstack/vue-query';
    import { userQueries } from '@/queries/user';
    import UserForm from './UserForm.vue';
    import UserFormSkeleton from './UserFormSkeleton.vue';

    const { data: user } = useQuery(userQueries.profile());
    const { mutate: updateUser } = useUpdateUser();
</script>

<template>
    <UserFormSkeleton v-if="!user" />
    <UserForm v-else :key="user.id" :init-data="user" @submit="updateUser" />
</template>
```

```vue
<!-- UserForm.vue：只管表單，一出生就有初始值 -->
<script setup lang="ts">
    import { useForm } from 'vee-validate';

    const props = defineProps<{ initData: User }>();
    const emit = defineEmits<{ submit: [payload: User] }>();

    const { handleSubmit } = useForm<User>({ initialValues: props.initData });
    const onSubmit = handleSubmit(values => emit('submit', values));
</script>
```

至於「我會看 API 回來的某個值決定要不要保護特定欄位」這種需求，就拉到 mutation 或 query 以外的地方處理 UI，把 UI 變化在業務邏輯層先處理完，不要塞回 `useQuery` 的上下文裡。

### 樂觀更新完整範例
這段是討論裡貼的範例，整理成 `<script setup>` 版本，並補上 context 的型別（`useMutation` 第四個泛型），不然 `ctx?.prev` 在 TypeScript 會是 `unknown`：

```vue
<script setup lang="ts">
    import { computed, reactive, toRef } from 'vue';
    import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';

    type User = { id: string; name: string; email: string; role: number };
    type UpdateUser = Partial<Pick<User, 'name' | 'email' | 'role'>> & { id: string };

    const props = defineProps<{ userId: string }>();
    const qc = useQueryClient();
    const userId = toRef(props, 'userId');

    // server state 訂閱：只讀、負責同步
    const userQuery = useQuery({
        queryKey: ['user', userId], // key 裡放 ref，id 變了就自動換一份資料
        queryFn: () => api.user.get(userId.value),
        enabled: computed(() => !!userId.value),
        staleTime: 5 * 60 * 1000
    });

    // 表單：自己的 client state，不去追 userQuery.data
    const form = reactive<UpdateUser>({ id: '', name: '', email: '', role: 0 });

    const updateUser = useMutation<User, Error, UpdateUser, { prev?: User }>({
        mutationKey: ['updateUser'],
        mutationFn: payload => api.user.update(payload),

        onMutate: async (payload) => {
            await qc.cancelQueries({ queryKey: ['user', payload.id] });
            const prev = qc.getQueryData<User>(['user', payload.id]);

            // 先 patch 快取，UI 馬上更新
            qc.setQueryData<User>(['user', payload.id], old => (old ? { ...old, ...payload } : old));

            // 回傳 context 給 onError 回滾用
            return { prev };
        },

        onError: (_err, vars, ctx) => {
            if (ctx?.prev) {
                qc.setQueryData(['user', vars.id], ctx.prev); // 回滾
            }
        },

        onSuccess: (updated) => {
            // 以最終狀態覆蓋快取，避免跟實際資料不一致
            qc.setQueryData(['user', updated.id], updated);
            // 依賴這份 user 的列表一起失效重抓
            qc.invalidateQueries({ queryKey: ['users'] });
        },

        onSettled: (_res, _err, vars) => {
            qc.invalidateQueries({ queryKey: ['user', vars.id] });
        }
    });

    const submit = () => updateUser.mutate(form);
    const submitAsync = () => updateUser.mutateAsync(form);
</script>
```

看到沒，`onSuccess` 還在，只是活在 `useMutation` 身上，因為「寫入成功的那一刻」才是真的需要你做事的時間點。

### 不要把整包 query 物件丟來丟去
另一個建議：`useQuery` 回傳的那個物件，不要整包拿去傳 props，要精確地取用你需要的欄位，它才會精準地觸發元件更新。

舉例，三個元件都用同一個 `['user']` 的查詢：A 只用 `data`、B 只用 `isPending`、C 只用 `isFetching`。

- 初始化、資料回來：A、B、C 都會更新。
- 在 B 呼叫 `refetch`，請求發出去時：只有 C 更新（背景重抓，`isPending` 不會變回 true）。
- 回來的資料有變化：A、C 更新；沒變化：只有 C 更新。

::: tip Vue 的版本
原本討論裡的例子 C 用的是 `isPending`，但在 v5 裡 `isPending` 的意思是「還沒有任何資料」，背景重抓時變的是 `isFetching`，所以這裡改成 `isFetching`。另外在 `@tanstack/vue-query` 裡解構出來的每個欄位都是 ref，`const { data, isPending } = useQuery(...)` 是官方範例的寫法，沒問題；要避免的是把它們 `.value` 拆成普通值再傳出去，或整包物件塞進 props，這樣誰動到什麼就看不清楚了。
:::

### ts-rest：普通 client 與 query client 並存

```ts
import { initClient } from '@ts-rest/core';
import { initQueryClient } from '@ts-rest/vue-query';
import { userContract } from '@/contracts/user';

export const api = initClient(userContract, {
    baseUrl: '/api',
    baseHeaders: {}
});

export const apiQ = initQueryClient(userContract, {
    baseUrl: '/api',
    baseHeaders: {}
});
```

就算用的是 `initQueryClient`，上面也同時有 `query`（一般 client）和 `useQuery` 可以用，單純的頁面就用一般的，不用為了一致而硬上。

## 結論
亂世將至，請先忘掉你以前打 API 的邏輯，該做的還是得做。很多情況直接拿 `ts-rest` 內建的 query 就搞定，但只要牽涉到要 keep 狀態、同一支 API 硬要撐四個不同 tab 畫面，就得好好處理。

最後收一句：`axios` 是送信的郵差，`TanStack Query` 是幫你管信箱的管理員，你不會因為請了管理員就把郵差開除。~~（但你會發現自己再也不用每天站在信箱前面等信。）~~
