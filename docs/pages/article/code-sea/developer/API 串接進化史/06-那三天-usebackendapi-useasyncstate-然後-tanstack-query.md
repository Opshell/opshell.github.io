---
title: 'API 串接進化史（六）：那三天，useBackendApi、useAsyncState，然後 TanStack Query'
image: ''
description: '2025 年秋天的三天：先把 useApi 改成永不回傳 null 的 useBackendApi，手刻一支 useAsyncState 管 loading 與 error，三天後導入 TanStack Query，useAsyncState 變成沒人 import 的化石。API 函式從「回傳結果」變成「成功回傳資料、失敗 throw」，再用 Zod 守住型別邊界。'
keywords: ''
author: Opshell
createdAt: '2026-10-05'
categories:
  - Developer
tags:
  - API
  - TanStack Query
  - Zod
  - TypeScript
  - 心路歷程
editLink: true
isPublished: false
---
::: warning 草稿
這篇是 Claude 照 git 歷史寫的草稿。2026-10-08 脫敏過：程式碼是通用範例（端點、型別名稱都不是原專案的），拿掉了 commit 訊息；專案以 A／B／C 代稱。useBackendApi 的細節（重載、options）前一個系列寫過，這裡只講跟 TanStack Query 接軌的部分。看完改成自己的話再刪掉這個區塊。
:::

::: info 系列：API 串接進化史
從大學的打磚塊一路到 TanStack Query，每一次改寫都是被某個坑推著走的。這個系列不講「最佳實踐」，講的是我為什麼會變成現在這樣。
1. [打磚塊、AJAX 跟 jQuery，我是怎麼被網路通訊啟蒙的](./01-打磚塊-ajax-跟-jquery-我是怎麼被網路通訊啟蒙的)
2. [2023：一支叫 getData 的函式](./02-2023-一支叫-getdata-的函式)
3. [2024：攔截器、token 刷新，以及我把它刪掉](./03-2024-攔截器-token-刷新-以及我把它刪掉)
4. [composable 化的代價：我把攔截器塞進函式裡](./04-composable-化的代價-我把攔截器塞進函式裡)
5. [三個專案，三份一模一樣的 useApi](./05-三個專案-三份一模一樣的-useapi)
6. **那三天：useBackendApi、useAsyncState，然後 TanStack Query**（這篇）
7. [TanStack Query 之後我踩的坑](./07-tanstack-query-之後我踩的坑)
8. [回頭看：兩套並存的 useApi，跟我現在會怎麼起手](./08-回頭看-兩套並存的-useapi-跟我現在會怎麼起手)

**這篇的脈絡**：C 專案 2025 年夏天開案，入秋時功能還不多，是最好動刀的時候。三天、三次改動，把 API 層整個翻掉。這篇講那三天做了什麼、為什麼手刻的 `useAsyncState` 只活了三天，以及 TanStack Query 進來之後，API 函式的契約為什麼非改不可。
:::

## 第一天：useBackendApi
第一刀砍的是 `useApi.ts` 本身。這部分在[前一個系列](../串%20API%20的那些事/03-用-typescript-收起你的碼腳)寫得很細，這裡只列結論：

- 改名 `useBackendApi`。這個專案只有一個後端，但名字要回答「哪個 API」。
- `sendRequest` 用**函式重載**分成兩個簽名：`GET | DELETE` 的 `data` 是可選的 params，`POST | PUT | PATCH` 的 `data` 是必填的 body。傳錯 TypeScript 直接報錯。
- 第四個參數從散裝的 `headers, onUploadProgress` 改成一個 `options` 物件：`{ auth, headers, responseType, onUploadProgress }`。
- **永遠回傳 `iResult<R>`，不再回傳 `null`。** 網路錯誤也包成 `{ status: false, messages: ['...'] }`。
- 攔截器的全域旗標換成 `QDialog.isActive`，多一個「沒有 response（斷網）」的分支。
- `getImage` 變成 `sendRequest` 的語法糖，新增 `downloadFile`。

這一刀砍完，呼叫端從兩層 `if` 變一層：
```ts
const res = await sendRequest<UserList>('/api/users', 'GET', params);
if (!res.status) { /* 錯誤，messages 裡有原因 */ }
// res.data 的型別是 UserList
```

## 同一天：手刻 useAsyncState
第二刀是為了「每個 API 呼叫都伴隨 `loading`、`error`、`data` 三兄弟」這件事。

每個頁面都在寫：
```ts
const isLoading = ref(false);
const users = ref<User[]>([]);
const error = ref<string | null>(null);

async function fetchUsers() {
    isLoading.value = true;
    error.value = null;
    const res = await getUserList(params);
    if (res.status) { users.value = res.data; } else { error.value = res.messages[0]; }
    isLoading.value = false;
}
```
一個頁面三四個 API，就是十幾個 `ref` 加三四段這種東西。

我參考 VueUse 的 `useAsyncState`，寫了一個自己的版本：
```ts
export function useAsyncState<T, A extends any[] = []>(
    asyncFunction: (...args: A) => Promise<iResult<T>>,
    initialState: T,
    options?: { onStart?, onSuccess?, onError?, onFinish? }
) {
    const data = shallowRef<T>(initialState);
    const error = ref<Errors | null>(null);
    const isLoading = ref(false);

    const execute = async (...args: A) => {
        options?.onStart?.();
        isLoading.value = true;
        error.value = null;
        try {
            const apiResult = await asyncFunction(...args);
            if (!apiResult.status) { throw new Errors(apiResult.messages); }
            data.value = apiResult.data;
            options?.onSuccess?.(apiResult);
            return apiResult;
        } catch (err) {
            error.value = normalizeError(err);
            options?.onError?.(err);
            throw err;
        } finally {
            isLoading.value = false;
            options?.onFinish?.();
        }
    };

    return { data, error, isLoading, execute };
}
```
呼叫端變成：
```ts
const { data: users, isLoading, execute: fetchUsers } = useAsyncState(getUserList, []);
```
三個 `ref` 變一行。而且注意裡面那行 `throw new Errors(apiResult.messages)`——這是 API 層第一次出現 **throw**。`sendRequest` 還是不會 throw，但 `useAsyncState` 把 `status: false` 翻譯成了例外。

寫完的時候很滿意。它乾淨、有型別、有生命週期 hook。

然後我開始想下一步：這個頁面跟那個頁面都要「縣市列表」，要不要快取？使用者切出去再切回來，要不要重抓？表單送出之後，列表要怎麼知道要更新？

每一個問題，`useAsyncState` 都要再加東西。加一個 `cache` 參數、加一個 `staleTime`、加一個全域的 event bus 通知其他頁面……

我在加第二個東西的時候停下來，去看了一下 TanStack Query 的文件。

## 三天後：TanStack Query
三天後，TanStack Query 進了整個框架。

那陣子群組裡有人點過一個觀念，大意是：TanStack Query 管的是非同步狀態，axios 只負責發 HTTP 請求，兩者分工不同，不會互相取代。

這個觀念把我之前想錯的地方點出來了。我一直把 TanStack Query 當成「另一種 axios」在評估，想說我已經有 `useBackendApi` 了幹嘛再裝一個。但它不是 fetcher，它管的是**什麼時候要抓、抓回來放哪、放多久、誰在用**。這些事 `useAsyncState` 想做但做不好，而 axios 根本不管。

裝上去的設定很簡單：
```ts
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000
        }
    }
});
app.use(VueQueryPlugin, { queryClient });
```
第一個 `useQuery` 是縣市列表，一個最典型的「全站共用、幾乎不會變」的資料：
```ts
export function useCommonData() {
    const { data: cityOptions, isLoading } = useQuery({
        queryKey: ['common', 'cities'],
        queryFn: getCityOptions,
        staleTime: Infinity,
        gcTime: Infinity,
        retry: 2
    });
    return { cityOptions, isLoading };
}
```
哪個頁面要縣市就呼叫 `useCommonData()`，第一次會抓，之後都從快取拿，永遠不過期。三個 `ref` 跟 `useAsyncState` 都不用了。

## 化石
`useAsyncState.ts` 沒有被刪。

它還在 `shared/hooks/` 裡，到 2026 年春天都還在。但從導入 TanStack Query 那天之後，整個專案沒有任何一個檔 `import` 它。它是一支寫了三天、用了三天、然後被遺忘的 composable。

為什麼不刪？一開始是想說「說不定有些地方不適合用 Query 會用到」。後來是忘了。再後來是看到它會想起那三天，就留著當紀念。~~其實就是懶。~~

::: tip 回頭看
手刻 `useAsyncState` 不是浪費。它讓我親手碰到了「非同步狀態管理」的每一個問題——loading、error、快取、過期、依賴——然後才看懂 TanStack Query 的每個選項是在解哪一個。沒有那三天，`staleTime` 跟 `gcTime` 對我來說只是兩個數字。
:::

## 契約要改：成功回傳資料，失敗 throw
TanStack Query 進來之後，有一件事非改不可。

`useQuery` 的 `queryFn` 有一個契約：**成功就 return 資料，失敗就 throw**。它靠這個判斷 `isError`、決定要不要 `retry`、把錯誤放進 `error`。

但我的 API 函式長這樣：
```ts
export async function getUserList(params) {
    return sendRequest<UserList>('/api/users', 'GET', params);
    // 回傳 iResult<UserList>，永遠不 throw
}
```
把它塞進 `queryFn`，`data` 會是整個 `iResult`，`status: false` 的時候 Query 以為成功了，`isError` 永遠是 `false`。

所以導入 TanStack Query 的同一天，所有 API 函式改成：
```ts
export async function getUserList(params: GetUserListParams) {
    const res = await sendRequest<UserList>('/api/users', 'GET', params);
    if (!res.status) { throw new Errors(res.messages); }
    return res.data;
}
```
三行。`sendRequest` 還是不 throw——它是 HTTP 層，它的工作是把任何結果都包成 `iResult`。throw 的責任往上搬一層，到 API 函式：**它知道這個 endpoint 的 `status: false` 代表什麼，所以由它決定要不要變成例外。**

這就是第四篇末尾說的「`sendRequest` 根本不需要每個元件各自一份」的答案：它變成了純粹的 HTTP 工具，API 函式在模組層呼叫一次 `useBackendApi()` 拿到它，之後整個模組共用。

`Errors` 是一個帶 `messages: string[]` 的自訂 Error：
```ts
export class Errors extends Error {
    public messages: string[];
    constructor(messages: string[]) {
        super(messages.join(', '));
        this.messages = messages;
        this.name = 'Errors';
    }
}
```
為什麼要自訂？因為後端的驗證錯誤是一個陣列，`Error.message` 只能放一個字串。Dialog 要顯示多行，就得把陣列留著。這個類別後來還加了一個 `_tag`，原因很離奇，下一篇講。

## API 搬家：從 shared/apis 到 features/*/apis
同一天還做了一件事：`shared/apis/user.ts`、`shared/apis/order.ts` 刪掉，搬成 `features/user/apis/user.ts`、`features/order/apis/order.ts`。

這跟 TanStack Query 沒有直接關係，但有間接關係。改成「失敗 throw」之後，API 函式變得**只跟一個 endpoint 有關**：它知道這個 endpoint 的 URL、參數型別、回傳型別、以及 `status: false` 時要丟什麼。這種東西不該放在 `shared/`——它不是共用的，它是某個 feature 專屬的。

於是目錄變成：
```
features/user/
├── apis/user.ts          ← endpoint、參數、回傳、throw
├── schema/user.schema.ts ← Zod schema（兩週後加的）
├── services/authService.ts ← 多支 API 組合的流程
├── hooks/useCommonData.ts  ← 這個 feature 的 useQuery
└── index.ts
```
`services/` 就是第五篇 flowmodoro 那層的正式版。登入流程要 reCAPTCHA → login → 存 token → 取使用者資料，四步，塞進一個 `loginUseCase`，元件只管 `useMutation({ mutationFn: loginUseCase })`。

## 兩週後：Zod 守住邊界
導入 TanStack Query 大約兩週後，`shared/utils/zod.ts` 進來。

TanStack Query 解決了「什麼時候抓」，`Errors` 解決了「失敗怎麼辦」，剩下一個問題：**後端回來的東西，真的是我 interface 裡寫的那樣嗎？**

`sendRequest<UserList>` 的 `<UserList>` 只是告訴 TypeScript「相信我」。後端多了一個欄位、少了一個欄位、把 `is_active: 1` 改成 `is_active: true`，TypeScript 不會知道，`data.isActive === true` 就默默變 `false`。

Zod 的用法是在 API 函式裡加一道驗證：
```ts
export async function getOrderList(input: GetOrderListInput) {
    const params = GetOrderListParams.parse(input);   // 驗證 + camelCase → snake_case
    const res = await sendRequest<GetOrderListOutput>('/api/orders', 'GET', params);
    if (!res.status) { throw new Errors(res.messages); }
    return parseWithSchema(GetOrderListParser, res.data); // 驗證 + snake_case → camelCase
}
```
`Params` 驗進去的、`Parser` 驗回來的。型別不再手寫 interface，用 `z.input<typeof Params>` 跟 `z.output<typeof Parser>` 推出來。後端改了格式，`parseWithSchema` 會在 DEV 環境的 console 印出「哪個欄位、期望什麼、拿到什麼」，然後 throw——Query 會接到，`isError` 變 `true`，頁面跳錯誤。

不再默默變 `false`。

::: tip 這三層各管一件事
- `sendRequest`：HTTP。把任何結果包成 `iResult`，不 throw。
- API 函式：endpoint。驗參數、呼叫、判 `status`、驗回傳、throw。
- `useQuery` / `useMutation`：時機與狀態。什麼時候抓、放多久、誰在等。

2023 年那支 `getData` 三件事全部混在一起做。拆開花了兩年。
:::

## 那三天之後
C 專案從那三天之後，所有新功能都照這個結構長。那年秋冬陸續加了好幾個大功能，到了年底 `QueryClient` 多了 `refetchOnWindowFocus: false` 跟 `retry: 1`——因為使用者切回視窗時整頁重抓太煩，而且預設重試 3 次對一個會回 422 的後端來說只是多等三倍時間。

B 專案晚了兩個月跟進：先換上 `useBackendApi`，大約一個月後 TanStack Query 進來。但 B 專案已經有 40 個檔在用舊的 `useApi`，沒辦法像 C 專案那樣一刀換掉。這件事第八篇講。

下一篇先講 TanStack Query 進來之後踩的坑。有幾個坑的形狀我到現在都覺得很怪。
