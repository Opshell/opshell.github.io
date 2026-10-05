---
title: 'setup 的那些事：在 script setup 裡直接 await 會發生什麼'
image: ''
description: '在 <script setup> 最上層寫 await，元件就變成非同步元件，沒有 Suspense 包著的話畫面會直接空白。整理 top-level await 的行為、錯誤處理，以及不擋住 setup 的寫法。'
keywords: ''
author: Opshell
createdAt: '2024-11-26'
categories:
  - vue
tags:
  - vue
  - script-setup
  - async
  - Suspense
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本「await 遇到問題」的筆記與程式碼寫成全文（top-level await、Suspense、錯誤處理、改用 then/catch 的理由）。原標題「setup 的那些事」看起來想寫成系列，這篇先只寫 await 這一題。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
常見的情況是：進到某個病患、訂單、商品的詳細頁，第一件事就是拿網址上的 id 去打 API。`<script setup>` 支援直接 `await`，寫起來超順手，一存檔——畫面整個空白，console 只留一句看不太懂的警告。

這篇記錄 `setup` 裡用 `await` 會遇到的問題，寫給剛從 Options API 或 `setup()` 函式轉到 `<script setup>` 的人。延伸閱讀：[iThome 這篇](https://ithelp.ithome.com.tw/articles/10304992)。
:::

## 懶人包
- 在 `<script setup>` 最上層寫 `await`，元件會自動變成-|非同步元件|-，必須有 `<Suspense>` 包著才會渲染，不然就是一片空白。
- `await` 的 Promise 一旦 reject，整個元件的 setup 就失敗了，錯誤要往上用 `onErrorCaptured` 或自己 `try/catch` 處理。
- 大多數「進頁面抓資料」的情境，不需要擋住 setup：用 `then/catch` 或在 composable 裡管 loading 狀態，畫面先出來、資料後到。
- 真的要用 top-level await，就連 `<Suspense>`、錯誤處理、loading 畫面一起設計好。

## 技術拆解

### await 遇到問題
直覺的寫法是這樣：

```vue
<script setup lang="ts">
    const route = useRoute();
    const patientId = route.params.id as string;

    const res = await sendRequest(`/api/present_pat/simpledata/${patientId}`);
    patientStore.updatePatient(res.data);
</script>
```

看起來很乾淨，但只要 `<script setup>` 的最上層出現 `await`，編譯出來的 `setup()` 就會變成 `async setup()`，回傳的是一個 Promise。`Vue` 對這種元件的規定是：-|它必須被 `<Suspense>` 包著|-，由 `<Suspense>` 等 Promise 完成再渲染。

沒有 `<Suspense>` 的話，這個元件就不會被渲染出來，開發模式下 console 會有警告說元件的 setup 回傳了 Promise，但父層沒有 `<Suspense>`。如果它剛好是 `<RouterView>` 裡的頁面元件，你看到的就是整頁空白。

### 錯誤也會跟著卡住
就算包了 `<Suspense>`，還有第二個問題：`await` 的請求失敗時，錯誤會從 setup 裡丟出去，這個元件就掛了。你得在父層用 `onErrorCaptured` 接住，或在 `await` 外面自己包 `try/catch`。

而「抓不到病患資料」這種情況，常見的需求其實很單純：印個錯誤、把使用者帶回列表頁。為了這件事把整個頁面變成非同步元件，有點殺雞用牛刀。

### 改用 then/catch：不擋住 setup
所以最後改成這樣，`setup` 照常同步跑完，畫面先出來，資料回來再更新 store，失敗就導回列表：

```ts
sendRequest(`/api/present_pat/simpledata/${patientId}`).then((res) => {
    if (!res?.status) { throw new Error('取得病患資料錯誤!'); }

    patientStore.updatePatient(res.data);
}).catch((error) => {
    console.error('取得病患資料錯誤', error);
    router.push({ name: 'PatientList' });
});
```

幾個細節：

- `router` 要在 setup 最上層先用 `useRouter()` 拿好，不能在 `.then()`／`.catch()` 的 callback 裡才呼叫 `useRouter()`，那時候已經不在 setup 的同步流程裡了。
- 回應的 `status` 不對就主動 `throw`，讓「API 成功但資料不對」和「網路錯誤」走同一條 `catch`，處理邏輯只寫一次。
- 資料到之前，畫面要能處理「還沒有病患資料」的狀態（骨架、loading 或 `v-if`）。

### 補充：`setup()` 函式裡的 await 更危險
如果你寫的不是 `<script setup>`，而是傳統的 `setup()` 函式，`await` 之後還有一個坑：`Vue` 靠「目前正在 setup 的元件實例」來註冊 `onMounted`、`inject` 這些東西，`await` 之後這個實例就不見了，寫在 `await` 後面的生命週期鉤子會註冊失敗（會有警告）。

`<script setup>` 的編譯器有幫你在 `await` 前後把實例接回來，所以在 `<script setup>` 裡這個問題比較少見；但自己寫的 composable 如果內部有 `await`，後面再呼叫生命週期鉤子，一樣會出事。原則是：-|生命週期鉤子、`inject`、`useRouter()` 這類東西，都放在第一個 `await` 之前|-。

## 例子與對比

### 做法 A：top-level await + Suspense
真的想用 `await` 的話，父層要這樣接：

```vue
<!-- App.vue -->
<template>
    <RouterView v-slot="{ Component }">
        <Suspense>
            <component :is="Component" />
            <template #fallback>
                <p>載入中...</p>
            </template>
        </Suspense>
    </RouterView>
</template>
```

```vue
<!-- PatientDetail.vue -->
<script setup lang="ts">
    const router = useRouter();
    const route = useRoute();

    const res = await sendRequest(`/api/present_pat/simpledata/${route.params.id}`)
        .catch(() => null);

    if (!res?.status) {
        router.push({ name: 'PatientList' });
    } else {
        patientStore.updatePatient(res.data);
    }
</script>
```

::: tip
`<Suspense>` 在 `Vue` 官方文件上還標示為實驗性功能，API 可能還會調整，用之前以官方文件為準。
:::

### 做法 B：不擋 setup，自己管狀態

```vue
<script setup lang="ts">
    const router = useRouter();
    const route = useRoute();
    const isLoading = ref(true);

    sendRequest(`/api/present_pat/simpledata/${route.params.id}`).then((res) => {
        if (!res?.status) { throw new Error('取得病患資料錯誤!'); }

        patientStore.updatePatient(res.data);
    }).catch((error) => {
        console.error('取得病患資料錯誤', error);
        router.push({ name: 'PatientList' });
    }).finally(() => {
        isLoading.value = false;
    });
</script>

<template>
    <PatientSkeleton v-if="isLoading" />
    <PatientInfo v-else />
</template>
```

| | A：top-level await | B：then/catch |
|---|---|---|
| 父層要求 | 一定要 `<Suspense>` | 不需要 |
| loading 畫面 | `<Suspense>` 的 `#fallback` | 自己用 `isLoading` 處理 |
| 錯誤處理 | 父層 `onErrorCaptured` 或自己 `catch` | 就地 `catch` |
| 適合 | 整個頁面沒資料就沒意義、要統一 loading | 大部分「進頁面抓資料」的情境 |

如果專案已經在用 `TanStack Query`，這類「進頁面抓資料」直接交給 `useQuery` 會更省事，可以看 [TanStack Query 是非同步狀態管理](./tanstack-query)。

## 結論
`<script setup>` 讓 `await` 變得太好寫，好寫到讓人忘了它背後其實是「把整個元件變成 Promise」。大部分時候，你要的只是資料晚點到、失敗時帶使用者回家，用 `then/catch` 就夠了。

`await` 很好用，但它會讓整個元件陪它一起等，別讓使用者對著一片空白發呆。
