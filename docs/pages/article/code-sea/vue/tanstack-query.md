---
title: tanstack query
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-07-24'
categories:
  - 未分類
tags:
  - null
editLink: true
isPublished: false
---
#

TanStack Query 是非同步狀態管理
axios 和 Tanstack Query 功能不衝突不重疊

Tanstack Query 是狀態管理
axios 是 Http Fetcher

tanstack 控管的是發動查詢的時機和快取，異步行為都可以用它
有類似在寫useasyncdata那種寫法

(useAsyncData 更新的越來越像了 useQuery 了)

Tanstack Query 其實用到很多高超技巧
要花很多時間吸收理解
懂了之後更能理解他節省了多少麻煩

不用太刻意練習沒關係，先弄懂它的useQuery再去看useMutation

把他當成pipeline+狀態管理工具來看就會比較容易進入狀況
google搜useQuery會出現 @Alex Liu 大大的文章，我有存起來XDD

// [-] -------------------------------------------------------

引入 Tanstack Query (也稱為 React Query，但在 Vue 生態中通常稱為 Vue Query 或 Tanstack Query for Vue) 是一個值得考慮的選擇，特別是如果你專案中需要處理大量的非同步資料請求（如 API 呼叫）並希望簡化狀態管理和資料快取。以下是對 Tanstack Query 的解釋以及它是否適合你當前的技術棧 (Vite + Vue 3.5 + TypeScript + Pinia + Axios) 的分析。

Tanstack Query 是什麼？
Tanstack Query 是一個強大的資料獲取與管理庫，主要用於處理非同步資料（如 API 請求）的獲取、快取、同步和更新。它並非專為某個框架設計，而是跨框架的資料層解決方案，支援 Vue、React、Svelte 等。對於 Vue，它提供了 @tanstack/vue-query 套件，與 Vue 3 的 Composition API 高度整合。

Tanstack Query 的核心功能包括：

資料獲取與快取：
自動管理 API 請求的快取，減少不必要的重複請求。
提供快取過期、重新獲取（refetching）和背景資料同步的機制。
狀態管理：
提供即時的資料狀態（如 isLoading, isError, data, error），讓你輕鬆處理非同步狀態。
無需手動管理 loading 或 error 狀態，減少樣板程式碼。
自動重新獲取：
支援在特定條件下自動重新獲取資料，例如視窗重新聚焦（refetch on window focus）或網路重新連線。
查詢鍵（Query Keys）：
使用查詢鍵來唯一識別每個 API 請求，方便快取管理和依賴更新。
突變（Mutations）：
除了查詢資料（GET 請求），也支援資料修改（POST/PUT/DELETE），並能自動觸發相關查詢的更新。
樂觀更新（Optimistic Updates）：
支援在資料更新前先更新 UI，失敗時自動回滾，提升使用者體驗。
Devtools：
提供開發者工具，方便除錯和監控查詢狀態。
Tanstack Query 的優勢
與 Vue 3 和 Pinia 的整合：
Tanstack Query 與 Vue 3 的 Composition API 無縫整合，透過 @tanstack/vue-query 提供 reactive 的查詢結果，與 Vue 的響應式系統相容。
它專注於伺服器端狀態管理，與 Pinia（專注於客戶端狀態）形成互補。Pinia 負責本地狀態（如表單資料、UI 狀態），而 Tanstack Query 負責 API 資料的獲取與快取。
減少 Axios 的樣板程式碼：
目前你使用 Axios 進行 API 請求，可能需要手動處理 loading、error 狀態，並自行實現快取邏輯。Tanstack Query 將這些功能封裝起來，減少重複程式碼。
例如，原本的 Axios 請求可能需要這樣寫：

```ts
async function fetchData() {
    try {
        isLoading.value = true;
        const response = await axios.get('/api/data');
        data.value = response.data;
    } catch (err) {
        error.value = err;
    } finally {
        isLoading.value = false;
    }
}
```
使用 Tanstack Query 後，簡化為：

```ts
import { useQuery } from '@tanstack/vue-query';
const { data, isLoading, error } = useQuery({
    queryKey: ['data'],
    queryFn: () => axios.get('/api/data').then(res => res.data)
});
```
TypeScript 支援：
Tanstack Query 對 TypeScript 有良好的支援，查詢鍵和資料類型可以透過泛型嚴格定義，與你當前的 TypeScript 技術棧契合。
靈活性和擴展性：
支援進階場景，如分頁查詢（infinite queries）、依賴查詢（dependent queries）、樂觀更新等，適合中大型專案。
與 Vite 的快速開發體驗相容，無需額外配置。
是否適合你的專案？
根據你的技術棧 (Vite + Vue 3.5 + TypeScript + Pinia + Axios)，以下是引入 Tanstack Query 的考量：

引入的理由
簡化非同步邏輯：
如果你的專案涉及大量 API 請求（特別是需要快取或頻繁更新的場景），Tanstack Query 可以大幅減少樣板程式碼，提升開發效率。
例如，當使用者在不同頁面間切換時，Tanstack Query 可以自動從快取提供資料，無需重複請求。
與 Pinia 的分工：
Pinia 適合管理本地的應用狀態（如表單輸入、UI 設定），而 Tanstack Query 專注於伺服器端資料的獲取與同步。兩者可以很好地共存，互不衝突。
例如，Pinia 管理表單資料，Tanstack Query 負責從後端獲取選項資料或提交表單。
提升使用者體驗：
Tanstack Query 的自動重新獲取和樂觀更新功能可以讓 UI 更流暢。例如，當使用者提交表單後，UI 可以立即反映更新，無需等待伺服器回應。
TypeScript 友好：
你的專案使用 TypeScript，而 Tanstack Query 提供強類型支援，確保查詢和突變的資料類型安全。
潛在挑戰
學習曲線：
雖然 Tanstack Query 的 API 相對直觀，但需要一些時間熟悉其概念（如查詢鍵、快取策略、突變等）。
如果團隊成員不熟悉，可能需要額外的學習成本。
初期重構成本：
如果你的專案已經有大量基於 Axios 的邏輯，遷移到 Tanstack Query 需要重構部分程式碼，尤其是 API 請求的處理方式。
不過，由於你已經使用 Axios，Tanstack Query 可以直接與 Axios 整合，遷移成本相對可控。
功能重疊：
如果你的專案目前對 API 請求的需求較簡單（例如，僅有少量 GET 請求，無需複雜快取或自動更新），Tanstack Query 的強大功能可能顯得過於重量級，短期內收益可能不明顯。
額外依賴：
引入 @tanstack/vue-query 會增加專案的依賴，雖然它的 bundle 大小相對較小（約 20-30KB minified），但仍需考慮維護成本。
建議
評估專案需求：
如果你的專案有以下需求，強烈建議引入 Tanstack Query：
頻繁的 API 請求，需要快取以提升性能。
複雜的非同步狀態管理（loading、error、data）。
需要自動重新獲取資料（例如，當使用者重新聚焦視窗或資料過期時）。
需要支援分頁查詢、樂觀更新或依賴查詢。
如果目前 API 請求簡單，且 Pinia + Axios 已足夠應對，則可以暫緩引入，待需求增加時再考慮。
逐步引入：
可以先在專案的某個模組（例如，資料列表或表單）試用 Tanstack Query，評估其效果。
例如，將某個 Axios 請求改為使用 useQuery，並觀察是否顯著減少程式碼量或提升性能。
與現有技術棧整合：
繼續使用 Axios 作為底層 HTTP 客戶端，將其傳入 Tanstack Query 的 queryFn。
Pinia 負責本地狀態，Tanstack Query 負責伺服器端資料，保持清晰的分工。
學習資源：
參考官方文件：https://tanstack.com/query/latest/docs/framework/vue/overview
學習查詢鍵、快取策略和突變的使用方式。
使用 Tanstack Query Devtools 來除錯，方便監控查詢狀態。
簡單範例
假設你有一個 API 請求用於獲取用戶列表，原本使用 Axios 和 Pinia 的程式碼可能是：

```ts
// store/users.ts
import { defineStore } from 'pinia';
import axios from 'axios';

export const useUserStore = defineStore('user', {
    state: () => ({
        users: [],
        isLoading: false,
        error: null
    }),
    actions: {
        async fetchUsers() {
            this.isLoading = true;
            try {
                const response = await axios.get('/api/users');
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
改用 Tanstack Query 後：

```ts
// composables/useUsers.ts
import { useQuery } from '@tanstack/vue-query';
import axios from 'axios';

export function useUsers() {
    return useQuery({
        queryKey: ['users'],
        queryFn: () => axios.get('/api/users').then(res => res.data)
    });
}
```

```ts
// 在組件中使用
<script setup>
import { useUsers } from '@/composables/useUsers';

const { data: users, isLoading, error } = useUsers();
</script>

<template>
  <div>
    <div v-if="isLoading">Loading...</div>
    <div v-else-if="error">{{ error.message }}</div>
    <ul v-else>
      <li v-for="user in users" :key="user.id">{{ user.name }}</li>
    </ul>
  </div>
</template>
```
這種方式減少了手動管理狀態的程式碼，且自動提供快取和重新獲取功能。

結論
Tanstack Query 是一個強大的工具，特別適合需要高效管理非同步資料的專案。它與你的技術棧 (Vue 3.5 + TypeScript + Pinia + Axios) 高度相容，能顯著簡化 API 請求的處理並提升使用者體驗。如果你的專案有複雜的資料獲取需求（例如快取、分頁、樂觀更新），引入 Tanstack Query 是一個明智的選擇。建議從小規模試用開始，逐步遷移，並充分利用其 TypeScript 支援和 Devtools 來提升開發效率。

如果你有更具體的場景或問題（例如，某個特定的 API 請求場景），可以提供更多細節，我可以幫你設計更精確的整合方案！

## 取得資料
想問問一般怎麼塞給 vee validate 初始值從 useQuery 取得的資料？

> 等資料取得後再重設表單值

onSuccess?
> mutation才是onSuccess
> useQuery 要棄用 onSuccess 所以我才困擾
> 他改用reactive effects

所以是直接 setup 裡判斷 ！data?
> 不是
> computed
> 你可以computed 或 watchEffect自動收集 (不推薦watchEffect 請參閱文章)
```ts
const { data, isSuccess } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser
});

const formConfig = computed(() => {
    if (isSuccess.value && data.value) {
        return useForm({
            initialValues: data.value
        });
    }
    return null;
});
```
> 也沒什麼好困惑，你還是得針對isSuccess給的狀態處理

當然watchEffect相對簡單啦：
```ts
const { data } = useQuery({
  queryKey: ['user'],
  queryFn: fetchUser,
  select: (data) => {
    // 處理資料格式或etc...
    return data
  }
})

const { data, isSuccess } = useQuery({
  queryKey: ['user'],
  queryFn: fetchUser,
  enabled: computed(() => someCondition.value)
})

watchEffect(() => {
  if (data.value) {
    setValues(data.value)
  }
})
```

我是有用一個比較可能旁門的做法是在 useQuery 的 select 去 setValue

我是建議如果要重設表單值的話不要依賴那個 data 更新

表單的重設最簡單的方式就是建立一包預設直的同樣結構資料覆蓋

你可以 await queryClient.invalidQuery或 await queryClient.fetchQuery 再更新

你依賴那個資料更新等於 你 api state 跟 ui state 是同步的 只有簡單的情境適用

為什麼要棄用onSuccess?
> https://github.com/TanStack/query/discussions/5279 ?
> useQuery 不應該有 onSuccess

UI 狀態與 API 狀態混在一起這點被詬病
那我也要改成上下文以外的地方處理了
看起來我需要把UI變化在業務邏輯層先處理完

然而有時候商業邏輯需求
=> [竹]
會想要用 useQuery 去抓 onSuccess ， 代表沒有懂 useQuery

=> [福]
我記得有個說法
useQuery 當作類似 useEffect + fetch 的組合本來就不符合他們的核心
他們認為這違反框架的響應式原則

=> [竹]
沒錯，這也是 tanstack 難學的地方
要大家突然轉換思維
使用 useQuery 你就不該關心資料什麼時候回來
你要回頭關心的是「狀態」
useQuery 不是請求機，是同步機
所以不關心什麼時候 onSuccess
當你需要 onSuccess。你可能需要的是 useMutaion

=> [福]
useQuery看起來像是，我對這個請求的資料有需求，但我要指定什麼時候抓、要不要抓、以及把結果推回來
queryKey = 訂閱這個資料來源的聲明
他看著就是query純讀，mutation才是寫

=> [竹]
你用了 tanstack 就不需要 store
等於你把資料存到兩個 store

我想對資料顆粒度做更細微的控制
> 所以用了 tanstack + store 但這樣等於把資料存到兩個 store(X)
=> [竹]
可以在 queryFn 做顆粒化，沒人規定一隻 queryFn 只有一個 api 來源
=> [竹]
基本上我覺得 useQuery 絕對不需要 onSuccess 你需要肯定是心智模型錯了，讓你誤以為需要 這非常抽象

=> [Ethan 高傑]
分清楚什麼client state/server state就應該不會有細微度的阻礙
client state與server state都該只有一個single source of truth

=> [鱈]
我的理解是 useQuery 與 useMutation 已經是再一層抽象，他不對應 HTTP Method
useQuery 和 Vue 的響應式資料很像，當你定義好後，資料流會自動處理，資料會自己來，就是很純粹的狀態機
useMutation 就是各種有副作用的被動操作，就像 Method 那樣需要主動呼叫才會執行，所以才需要關注成功或失敗的當下

=> [竹]
useQuery 的功能是讓你跟某個目標的資料源進行資料同步
因為是同步，所以不關心什麼時候做完同步，你只關心他同步到了沒。
所以你需要交雜一些邏輯在回應上時，你就已經扭曲「同步這件事」，因為 queryFn 是一個 sync function，不是 get function
useQuery 是狀態機，不是請求用的方法。
就像你使用 store 不會去沒事監聽「setStoreState」這個 function 有沒有人去使用，你只關心他的狀態有沒有改變。

=> [福]
```ts
import { computed, reactive, Ref } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';

type User = { id: string; name: string; email: string; role: number };
type UpdateUser = Partial<Pick<User, 'name' | 'email' | 'role'>> & { id: string };

const qc = useQueryClient();

// server state 訂閱
const userQuery = useQuery<User>({
  queryKey: computed(() => ['user', userId.value]),
  queryFn: () => api.user.get(userId.value!), // enabled = true 時執行
  enabled: computed(() => !!userId.value),
  // select 需要讓給 form 的輸位 / 型別
  select: (userData) => ({ ...userData }),
  staleTime: 5 * 60 * 1000,
});

// 表單
const form = reactive<UpdateUser>({
  id: '',
  name: '',
  email: '',
  role: 0,
});

// update事件更新
const updateUser = useMutation<User, unknown, UpdateUser>({
  mutationKey: ['updateUser'],
  mutationFn: (payload) => api.user.update(payload),

  onMutate: async (payload) => {
    await qc.cancelQueries({ queryKey: ['user', payload.id] });
    const prev = qc.getQueryData<User>(['user', payload.id]);

    // 把快取 patch UI 馬上更新
    qc.setQueryData<User>(['user', payload.id], (old) =>
      old ? { ...old, ...payload } as User : (payload as unknown as User)
    );

    // 回傳 context 給下面的 err fallback
    return { prev };
  },

  onError: (_err, vars, ctx) => {
    if (ctx?.prev) {
      qc.setQueryData(['user', vars.id], ctx.prev); // fallback
    }
  },

  onSuccess: (updated) => {
    // 以最終狀態覆蓋快取避免資料與實際不一致
    qc.setQueryData(['user', updated.id], updated);
    // 若有依賴此user資料的查詢，一起失效重抓
    qc.invalidateQueries({ queryKey: ['users'] });
  },

  onSettled: (_res, _err, vars) => {
    qc.invalidateQueries({ queryKey: ['user', vars.id] });
  },
});

const submit = () => updateUser.mutate(form);
const submitAsync = () => updateUser.mutateAsync(form);
```
Query = 把 Server State 帶進來，只讀和快取同步
Mutation = 修改 Server State
所以表單的狀態其實不應該依賴query狀態是這意思嗎?
=> [竹]
對啊，這就是精華ＸＤ

=> [福]
我會看他API回來的某個值決定要不要保護特定欄位
這樣的話我最好拉到mutation或者以外的地方去處理UI
結論就是把useQuery看成單純的讀取機
他只在你提供的特定條件才去重取訂閱
同一份資料要在不同路由間共享，或者一個頁面有不同tabs對欄位做設定那種情況才去用比較好
一般進入頁面取回GET資料，然後編輯欄位更新送出，這種根本不需要vue query

1. 會被多個元件/頁面做重複讀取，需要共享
2. 考慮staleTime / 背景 refetch / 視窗重新聚焦後打一次API
3. retry / error 邏輯統一
4. 離線/重新連線自動恢復
5. 樂觀更新（onMutate/rollback）機制
有這些需要的話才用

=> [竹]
另外，大家得到的 useQuery 回傳的那個物件不要拿去傳 props
更不要去解構它
{ ...query }

精確地去取得並使用它
他會正確的去響應更新你的 component

舉例
A 元件只有使用 data
B 元件只有使用 isLoading
C 元件只有使用 isPending
當使用了一個 queryKey 為 getUser 的 useQuery

當你初始化後，資料回來，A,B,C 都會響應
接著你在 B 元件呼叫 refetch
當發出請求時，只有 C 元件會響應更新
回來的資料如果有變化，A, C 元件響應更新
回來的資料如果沒變化，只有 C 元件響應更新

所以 useQuery 會根據你使用的情況去觸發元件響應的

=> [福]
`樂觀更新`
後端比較常用這詞彙
後端把資料庫當作狀態機
那就會有 「樂觀更新」這種詞彙出現

這種狀態管理會有資料不一致的風險
他就是為了即時更新UI
先把快取拿來給你顯示server那邊回應了以後再去修正
這就是樂觀更新

跟redis咬著你部分狀態一樣，你怎麼刷就是看不到入帳了沒

=> [竹]
如果把整個前後端都當作一個 observable system
那所有的「畫面顯示」表現的是「資料庫狀態」
改變狀態等於你要先去修改資料庫
所以
Mutaion => API => DB => Response => Query => State => UI

這是一個很標準的 Flux (單向資料流)

總的說，會遇到使用上的問題可能要先排解一下是不是有必要用到vue query

=> [竹]
其實不一定要共享才去用 useQuery
你使用者會在那兩個地方切來切去，API 就瘋狂打打打，多浪費。
useQuery staleTime 幫你管理快取，減少請求次數。這個商業價值多高啊～～
=> [福]
ＱＰＳ優化 神器
他比Abort Controller好的地方就在於，Abort以後你看到http status雖然是canceled
但部分封包其實早就跑到後端去了
這個tanstack是直接在事件內就取用快取

=> [竹]
useQuery 連同 onMount, onUnmount 的生命週期他都幫你想好了，根本不需要 Abort
手動打你還要手動 Abort
真要講 useQuery 缺點就是概念太抽象了...
不好學

=> [福]
我在思考怎麼降低門檻，但我自己的舊寫法都是依賴query那個壞習慣
所以我打算從最常被取用的meta options、site config下手
小部分實作
進入後台以後必要的那些資料先掛在vue query上快取

=> [鱈]
ts-rest 的 client 同時提供普通的 client(fetch) 與 vue query，一般情況用普通 client 即可，有需要性能改進的部分再替換成 vue query，逐步採用就不怕複雜度過高了
ts-rest 讚讚
=> [福]
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
initQueryClient本身就是了
=> [鱈]
就算你是用 initQueryClient，也有 query 與 useQuery 可以用，query 就是一般的 client
我覺得 ts-rest 這個設計滿不錯的，因為有一些網頁真的就很單純，加上 Vue Query 真的很不必要，徒增團隊協作的困擾 XD

=> [竹]
https://www.youtube.com/watch?v=0NU9aCTLopo&ab_channel=CosdenSolutions
這是很經典的封裝方式
用了 react-query 就不需要 zustand
封裝 useQuery是舊的做法，官方也不推薦了
雖然曾經官方推薦過就是了:p
最新的作法就是以 queryOption 為單位來封裝

## 亂世將至

請先蛋雕你以前打 API 的邏輯
該做的就得做
雖然看起來對我們目前來講直接拿ts-rest內建的query可以搞定
但有些牽涉到keep狀態，同一隻API硬要設計四個不同tab畫面
這時候就得處理

=> [竹]
如果是 useQuery 那我的做法比較輕像是在取得資料之前，把 ChidlForm 渲染成 skelton，拿到 query 資料，才去真正渲染 ChildForm ，這時 ChildForm 就有初始直可以渲染，而不是在 onSuccess 或 useEffect 再去操作一次 ChildForm 的 init values
這裡有一個坑
就是很多人想要去更新 initValue
但既然是 initValue 就不應該改變
所以邏輯是，資料拿到前不應該渲染畫面，或是用 key 強迫重新掛載/

我覺得比較多問題是，大家習慣直接一個元件做完 form 跟 useQuery ，但其實拆開之後會比較單純
// BadForm.jsx
```jsx
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
// GoodForm.jsx
```jsx
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
這裡展示了兩種常見表單處理方式的差異：
BadForm: 直接在元件內部 useEffect 處理初始化邏輯，耦合性高。
GoodForm: 將表單與資料解耦，透過父層傳遞 initData 與 onSubmit，更容易維護與測試。
如需幫你改寫 BadForm 成類似 GoodForm 的寫法，也可以告訴我

https://tanstack.com/query/v5/docs/framework/react/guides/query-options
看起來 queryOptions 是比較偏向 type helper 的功能
> type helper 只是順帶的好處

> 我個人覺得特別有價值的有兩個部分
> options 不是 hook、composable，所以復用的邏輯就從框架中解耦，可以在 vanillaJS 用 queryClient進行各種操作（像操作特定 key group，或是prefetch），也可以在框架中透過 useQuery、useMutation使用

> 另外以往對於 useQuery 的封裝，你想客製化某些規則（像是enable、onsucsess)，你就要額外寫 params 傳進去
> 現在直接解構options再添加客製化參數就可以了，自由度拉伸很多

> 還有其他的礙於篇幅就不提

> btw useQuery沒有onsuccess了，隨意成別的參數，我只是隨意舉例，意思到就好
確實是在有客製化參數需求時，滿好的做法，可以少很多樣板代碼，但我希望可以不要客製化（Ｘ，資料層封多點，最好不要管 query 要改什麼參數
