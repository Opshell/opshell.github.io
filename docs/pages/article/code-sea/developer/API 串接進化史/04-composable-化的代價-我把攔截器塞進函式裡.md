---
title: 'API 串接進化史（四）：composable 化的代價，我把攔截器塞進函式裡'
image: ''
description: '為了在攔截器裡拿到 useRouter，把 sendRequest 改成 useApi() composable。結果攔截器跟著搬進函式裡，每個元件呼叫一次就多註冊一個。B 專案兩週後搬回去，A 專案一年半後才加 flag。'
keywords: ''
author: Opshell
createdAt: '2026-10-05'
categories:
  - Developer
tags:
  - API
  - Axios
  - Composables
  - Vue
  - 心路歷程
editLink: true
isPublished: false
---
::: warning 草稿
這篇是 Claude 照 git 歷史寫的草稿。2026-10-08 脫敏過：程式碼改寫成通用範例（store、業務碼都不是原專案的），拿掉了 commit 訊息與確切檔案數；專案以 A／B／C 代稱。看完改成自己的話再刪掉這個區塊。
:::

::: info 系列：API 串接進化史
從大學的打磚塊一路到 TanStack Query，每一次改寫都是被某個坑推著走的。這個系列不講「最佳實踐」，講的是我為什麼會變成現在這樣。
1. [打磚塊、AJAX 跟 jQuery，我是怎麼被網路通訊啟蒙的](./01-打磚塊-ajax-跟-jquery-我是怎麼被網路通訊啟蒙的)
2. [2023：一支叫 getData 的函式](./02-2023-一支叫-getdata-的函式)
3. [2024：攔截器、token 刷新，以及我把它刪掉](./03-2024-攔截器-token-刷新-以及我把它刪掉)
4. **composable 化的代價：我把攔截器塞進函式裡**（這篇）
5. [三個專案，三份一模一樣的 useApi](./05-三個專案-三份一模一樣的-useapi)
6. [那三天：useBackendApi、useAsyncState，然後 TanStack Query](./06-那三天-usebackendapi-useasyncstate-然後-tanstack-query)
7. [TanStack Query 之後我踩的坑](./07-tanstack-query-之後我踩的坑)
8. [回頭看：兩套並存的 useApi，跟我現在會怎麼起手](./08-回頭看-兩套並存的-useapi-跟我現在會怎麼起手)

**這篇的脈絡**：2024 年年底，兩個專案在兩天內各自把 `export const sendRequest` 改成 `export default function useApi()`。改的動機不一樣，但犯的錯一模一樣。這篇講那個錯，以及兩個專案花了多久才爬出來。
:::

## 動機：攔截器裡拿不到 router
2024 年年底，A 專案的需求：token 完全過期、連刷新都不行的時候，要跳通知、登出、導回登入頁。

跳通知跟登出都好辦，`$notify` 跟 `authStore` 都是全域的。導回登入頁要 router。我在攔截器裡寫：
```ts
if (error.response.data.message === '登入已逾時，請重新登入。') {
    const router = useRouter();
    authStore.signOut();
    router.push({ name: 'Login' });
}
```
`useRouter()` 回傳 `undefined`。

因為 `useRouter` 跟所有 `useXxx` 一樣，靠的是 `inject`，而 `inject` 只在元件的 `setup()` 裡有效。攔截器是在模組載入的時候註冊的，那時候根本沒有元件。

解法有兩個。一個是 `import router from '@/router'` 直接用 router 實例，不要用 `useRouter`——這是對的做法，後來的專案都這樣寫。另一個是把攔截器搬進一個會在 `setup()` 裡被呼叫的函式——這是我當時選的。

## 改成 useApi()
一週後，順便配合後端「業務錯誤一律回 422」的改動（一樣是改寫過的通用範例）：
```ts
export default function useApi() {
    const router = useRouter();
    const proxy = useGlobalProperties();
    const authStore = useAuthStore();

    axios.interceptors.response.use(
        (response) => response,
        async (error) => {
            // ...401、422 的處理，裡面可以用 router 了
        }
    );

    async function sendRequest(/* ... */) { /* ... */ }
    async function getImage(/* ... */) { /* ... */ }

    function authorizedChecker(code: string) {
        if (code !== 'UNAUTHORIZED') { return true; }
        proxy.$notify('error', '登入憑證錯誤', '您可能閒置太久了，<br/>請試試看重新登入！', 3500);
        authStore.signOut();
        router.push({ name: 'Login' });
        return false;
    }

    return { sendRequest, getImage };
}
```
全站二十幾個檔從 `import { sendRequest }` 改成 `const { sendRequest } = useApi()`。改完很滿意：現在它是一個「真正的」composable 了，跟 `useRouter`、`useStore` 長得一樣，在 `setup()` 裡呼叫，拿到 router，可以導頁。

兩天後，B 專案做了一樣的事，紀錄裡還特別註明：這是要修成「正確的」composables 結構。

正確的。

## 每呼叫一次，多一個攔截器
問題在這一行：
```ts
export default function useApi() {
    axios.interceptors.response.use(/* ... */);
```
`axios.interceptors.response.use` 是**註冊**，不是設定。每呼叫一次，axios 的攔截器陣列就多一個元素。而 `useApi()` 現在在每個元件的 `setup()` 裡被呼叫——二十幾個檔，每個頁面進去一次就呼叫一次，切頁再回來又一次。

開一陣子之後，一個 401 回來，攔截器跑 20 次。每一次都去 `refreshToken()`，每一次都 `router.push`。

為什麼當時沒發現？因為 `router.push` 到同一個頁面不會有事，`refreshToken` 的鎖雖然沒有、但後端拿舊 token 換新 token 本來就允許重複，`$notify` 多跳幾次使用者以為是動畫。**所有症狀都被別的東西吸收了。**

這跟第二篇寫反的 `if` 是同一種 bug：沒有症狀，所以活很久。

## B 專案：兩週後搬回去
B 專案比較幸運，因為它的攔截器有跳 Dialog。

幾天後團隊裡有人加了「401 跳 Dialog 登出」，一週後就發現 Dialog 會疊好幾層。追下去，攔截器被註冊了 N 次。同一天搬回模組層，並且加了一個旗標防止 Dialog 重複：
```ts
let showNetErrorDialog = false;
let showPermissionsErrorDialog = false;

axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response.status === 500) {
            if (showNetErrorDialog) { return; }
            showNetErrorDialog = true;
            Dialog.create({ /* 連線異常 */ }).onCancel(() => { showNetErrorDialog = false; });
        }
        if (error.response.status === 401) {
            if (showPermissionsErrorDialog) { return; }
            showPermissionsErrorDialog = true;
            Dialog.create({ /* 登入逾時 */ }).onCancel(() => {
                showPermissionsErrorDialog = false;
                authStore.signOut();
                router.push('/');
            });
        }
        return Promise.reject(error);
    }
);

export default function useApi() {
    const authStore = useAuthStore();
    async function sendRequest(/* ... */) { /* ... */ }
    return { sendRequest, getImage };
}
```
攔截器在外面，`useApi()` 裡面只剩 `sendRequest`。router 用 `import router from '@/router'` 拿。

注意那兩個旗標。它們是為了「Dialog 不要疊」加的，但它們本身又是一個新的坑：兩個請求同時 500，第二個會 `return`，連 `Promise.reject` 都沒有，請求就這樣以 `undefined` 結束。這個坑在[另一個系列的第一篇](../串%20API%20的那些事/01-axios-封裝-從能用到好用)拆過，這裡不重講。

重點是：B 專案搬回去之後的 `useApi.ts`，就是後來被複製到所有新專案的「祖本」。下一篇會講這件事。

## A 專案：一年半後才加 flag
A 專案沒有跳 Dialog，它用的是 `$notify`，一個會自己消失的 toast。多跳幾次沒人注意。

所以它的攔截器一直在函式裡，從 2024 年年底到 2026 年春天。一年半。

2026 年春天，在一次做列表篩選的改動裡，順手加了這個：
```ts
// 防止攔截器被重複註冊
let isInterceptorSetup = false;

export default function useApi() {
    const router = useRouter();
    // ...
    if (!isInterceptorSetup) {
        axios.interceptors.response.use(/* ... */);
        isInterceptorSetup = true; // 註冊完畢，鎖上
    }
    // ...
}
```
加一個模組層級的 flag，第一次呼叫才註冊。

這個解法能用，但它有一個很微妙的副作用：攔截器的閉包裡用到的 `router`、`refreshToken`、`sendRequest`，**永遠是第一個呼叫 `useApi()` 的那個元件的那一份**。那個元件卸載之後，閉包還活著，抓著一個已經不存在的元件的 `router`。Vue Router 的 router 實例是全域單例所以沒差，但如果哪天在閉包裡用了元件的 `ref`，就會抓到死掉的那個。

正確的做法還是 B 專案那條路：攔截器搬出去，router 用 import。但這個 flag 到那時候都還只在開發中的版本裡；線上跑的 `useApi.ts` 連 flag 都沒有，停在 2025 年初。

::: tip 兩個專案的分岔
同一個錯，B 專案花了 15 天修好，A 專案花了 16 個月修到一半。差別不在誰比較厲害，在於**有沒有症狀**。B 專案的 Dialog 疊起來很難看，所以馬上有人追；A 專案的 toast 多跳幾次沒人在意，所以沒人追。

你的 bug 有多快被修，取決於它有多醜，不取決於它有多嚴重。
:::

## composable 到底該包什麼
回頭想，「把 `sendRequest` 改成 `useApi()`」這件事本身沒錯。composable 的好處是能在 `setup()` 裡拿到 context，而 `sendRequest` 確實需要 store。

錯的是把**模組層級的副作用**（註冊攔截器）放進**每次呼叫都會執行的函式**裡。`useApi()` 應該回傳的是「這個元件要用的工具」，不是「幫整個 app 做一次設定」。設定只做一次的東西，就該在模組層做一次。

這個分界線後來變成我判斷「什麼該放 composable 裡」的標準：

- 每個使用者（元件）都要各自一份的 → 放函式裡
- 整個 app 只要一份的 → 放模組層

攔截器是後者。QueryClient 是後者。store 的初始化是後者。`sendRequest` 其實也可以是後者——它根本不需要每個元件各自一份——但這要等到 2025 年秋天才想通。

下一篇先講一件更尷尬的事：2025 年我開了第三個專案，第一件事又是把 `useApi.ts` 複製過去。
