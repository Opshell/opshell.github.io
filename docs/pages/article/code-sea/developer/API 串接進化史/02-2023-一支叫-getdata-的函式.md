---
title: 'API 串接進化史（二）：2023，一支叫 getData 的函式'
image: ''
description: '2023 年底第一次封裝 axios：一支裸函式、token 自己從 localStorage 撈、錯誤一律 return null、錯誤訊息攤成 <br> 字串。還有一個試寫的 class 版 ApiClient，半年後被我默默刪掉。'
keywords: ''
author: Opshell
createdAt: '2026-10-05'
categories:
  - Developer
tags:
  - API
  - Axios
  - TypeScript
  - 心路歷程
editLink: true
isPublished: false
---
::: warning 草稿
這篇是 Claude 照 git 歷史寫的草稿。程式碼片段都是從當時的 commit 抄出來改寫的，專案名稱我用「醫療後台」代替，要不要寫真名由你決定。看完改成自己的話再刪掉這個區塊。
:::

::: info 系列：API 串接進化史
從大學的打磚塊一路到 TanStack Query，每一次改寫都是被某個坑推著走的。這個系列不講「最佳實踐」，講的是我為什麼會變成現在這樣。
1. [打磚塊、AJAX 跟 jQuery，我是怎麼被網路通訊啟蒙的](./01-打磚塊-ajax-跟-jquery-我是怎麼被網路通訊啟蒙的)
2. **2023：一支叫 getData 的函式**（這篇）
3. [2024：攔截器、token 刷新，以及我把它刪掉](./03-2024-攔截器-token-刷新-以及我把它刪掉)
4. [composable 化的代價：我把攔截器塞進函式裡](./04-composable-化的代價-我把攔截器塞進函式裡)
5. [三個專案，三份一模一樣的 useApi](./05-三個專案-三份一模一樣的-useapi)
6. [那三天：useBackendApi、useAsyncState，然後 TanStack Query](./06-那三天-usebackendapi-useasyncstate-然後-tanstack-query)
7. [TanStack Query 之後我踩的坑](./07-tanstack-query-之後我踩的坑)
8. [回頭看：兩套並存的 useApi，跟我現在會怎麼起手](./08-回頭看-兩套並存的-useapi-跟我現在會怎麼起手)

**這篇的脈絡**：2023 年 11 月開了一個醫療後台的專案，Vite + Vue 3 + TypeScript + Pinia。這是我第一次認真封裝 axios，也是後來兩年所有專案的 `useApi.ts` 的祖先。翻 git 歷史回去看它第一天的樣子，有些地方現在看會笑出來。
:::

## 第一天的 getData
2023 年 11 月 9 日，專案建立。`src/hooks/useApi.ts` 從第一個 commit 就在了，裡面只有一支函式：
```ts
export const getData = async function (
    url: string,
    method: Method = 'GET',
    data: any = {},
    headers?: AxiosRequestHeaders,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
): Promise<iResult | null> {
    const userStore = piniaStore.useUserStore;
    const { userState } = storeToRefs(userStore);

    let token: string | null = userState.value.jwtToken;
    if (!token) { // [!]正式上線可能會拿掉
        token = localStorage.getItem('jwtToken');
        if (!token) { // 有東西的話 把token存到store裡面
            userState.value.jwtToken = token as string;
        }
    }
    if (!headers) headers = {} as AxiosRequestHeaders;
    headers.Authorization = `Bearer ${token}`;

    const config: AxiosRequestConfig = { url, method, data, headers };
    if (method === 'POST' && onUploadProgress) {
        config.onUploadProgress = onUploadProgress;
    }

    return await axios(config)
        .then((axiosResponse) => {
            let result: iResult = { status: false, msg: '網路問題！', data: null };
            if (axiosResponse.status == 200) {
                const response = axiosResponse.data;
                if (url == '/oauth/token') { // 目前登入、刷新驗證 未調整，先用舊的
                    result = { /* ...OAuth 的特例... */ };
                } else {
                    result = {
                        status: response.status === 0 ? true : false,
                        msg: response.message,
                        data: response.data,
                        paginator: response.paginator ? response.paginator : undefined
                    };
                }
            }
            return result;
        })
        .catch((error) => {
            console.error(error);
            return null;
        });
};
```
先說它做對的事，因為它真的做對了幾件事，不然後面也不會活兩年：

1. **後端格式只在這裡認一次。** 後端回的是 `{ status: 0, message, data, paginator }`，`getData` 把它翻成前端自己的 `iResult`。頁面不用知道後端長什麼樣。
2. **token 只在這裡帶一次。** 頁面不用自己塞 header。
3. **回傳格式固定。** 不管成功失敗，拿到的都是 `iResult`，頁面只看 `status`。

這三件事就是「封裝」的全部意義。jQuery 時代的我沒做到，2023 年的我做到了。

然後我們來看它做錯的事。

## 寫反的 if
```ts
if (!token) {
    token = localStorage.getItem('jwtToken');
    if (!token) { // 有東西的話 把token存到store裡面
        userState.value.jwtToken = token as string;
    }
}
```
註解寫「有東西的話」，條件寫 `!token`。這段的意思是：store 裡沒有 token，就去 localStorage 撈，撈到的話寫回 store。但第二個 `if` 判斷反了，所以撈到的時候什麼都不做，撈不到的時候把 `null` 寫進 store。

這個 bug 活了將近一年，到 2024 年 10 月把 token 邏輯抽成 `getToken()` 才順便修掉。為什麼能活這麼久？因為它沒有症狀。store 本來就空、localStorage 也空的時候，寫 `null` 進去跟不寫一樣；store 空、localStorage 有東西的時候，雖然沒寫回 store，但 `token` 這個區域變數已經拿到值了，header 還是帶得出去。下一次呼叫再撈一次 localStorage 就好。

**沒有症狀的 bug 最危險，因為它會跟著你複製到下一個專案。** 這件事第五篇會講。

## 錯誤一律 return null
```ts
.catch((error) => {
    console.error(error);
    return null;
});
```
這是整支函式裡影響最深遠的一個決定。網路斷線、500、timeout，通通 `return null`。

當時的想法很單純：頁面不要炸掉。拿到 `null` 就知道失敗了，顯示個錯誤就好。但這帶來兩個問題，一個馬上就遇到，一個要等到 2025 年才真正痛：

**馬上遇到的**：每個呼叫端都要先判 `null` 再判 `status`。
```ts
getData('/api/patients').then((res) => {
    if (!res) { /* 網路錯誤 */ return; }
    if (!res.status) { /* 業務錯誤 */ return; }
    // 終於可以用 res.data 了
});
```
兩層 `if`，每一處都要寫。而且 `null` 什麼資訊都沒有——為什麼失敗？不知道，去看 console。

**要等到 2025 年才痛的**：`return null` 代表這支函式**永遠不會 throw**。這在 Promise 鏈的時代還好，等到後來要接 TanStack Query，`queryFn` 的契約是「成功就回傳資料，失敗就 throw」，這個設計整個對不上。第六篇會講我怎麼翻掉它。

## 錯誤訊息攤成 \<br\>
兩個禮拜後的 commit，後端開始回 Laravel 式的驗證錯誤：
```json
{ "message": { "name": ["名稱不可為空"], "phone": ["電話格式錯誤", "電話不可為空"] } }
```
`message` 有時候是字串，有時候是物件。我的解法：
```ts
if (typeof resMsg === 'object') {
    const messageArray = Object.values(resMsg).map((item) => {
        if (Array.isArray(item)) {
            return item.join('<br>');
        }
        return item;
    });
    resMsg = messageArray.join('<br>');
}
```
攤平成一個字串，用 `<br>` 隔開，丟給 `v-html`。

這在當時完全合理，因為通知元件就是吃字串的。但這等於是在 API 層決定了「錯誤訊息要怎麼顯示」——HTML 標籤跑進了資料層。後來改成 `messages: string[]`，讓顯示的地方自己決定要用換行還是列表，是 2024 年 11 月的事。

## __DOCKING__：一個全域常數的小聰明
開專案的第一週，後端還沒好，所以用 `vite-plugin-mock` 假資料。問題是切換很煩：每個頁面的 URL 都要改。

我的解法是在 `vite.config.ts` 定義一個全域常數：
```ts
define: {
    __DOCKING__: false, // API 串接的目標位置 (true: Docker Container, false: mockjs)
},
```
然後頁面裡這樣寫：
```ts
const url = (import.meta.env.__DOCKING__) ? '/oauth/token' : '/mapi/user/login';
```
commit 訊息是「Add：全域常數 控制api 端點(才不用每次測試都要改一堆)」，括號裡那句很誠實。

兩週後後端接上了，`__DOCKING__` 改成 `true`，從此再也沒變回去。但這個常數跟那些三元運算式一直留在程式碼裡，到 2026 年都還在。每個專案都有這種東西：為了某個兩週的過渡期寫的，然後活了三年。

## 夭折的 ApiClient
12 月初，專案一個月，我做了一次「架構開發」。commit 訊息寫「hooks & composable 權責切分、useApi.ts 重構 & 規則化命名」。

`getData` 改名成 `sendRequest`——這個名字後來用了兩年。同一個 commit 還新增了一支 `apiClient.ts`：
```ts
export class ApiClient {
    private userStore = piniaStore.useUserStore;

    private getToken(): string | null { /* ... */ }
    private getHeaders(token: string | null): AxiosRequestHeaders { /* ... */ }
    private async handleResponse(axiosResponse: any): Promise<iResult> { /* ... */ }

    public async sendRequest(url: string, method: Method = 'GET', data: any = {}, ...): Promise<iResult | null> {
        const token = this.getToken();
        const mergedHeaders = this.getHeaders(token);
        // ...
        try {
            const axiosResponse = await axios(config);
            return await this.handleResponse(axiosResponse);
        } catch (error) {
            console.error(error);
            return null;
        }
    }
}
```
物件導向版的 `sendRequest`。把 token、header、response 處理拆成 private method，看起來很有架構。

它從來沒有被任何地方引用過。

而且 `handleResponse` 裡面還引用了 `url` 跟 `data` 這兩個在它的 scope 裡根本不存在的變數——它是從 `sendRequest` 的 `.then` 直接剪過去的，剪完沒跑過。2024 年 3 月改了個方法名，7 月整支刪掉。

為什麼寫了又不用？老實說我不記得了。我猜是寫完發現，在 Vue 3 的世界裡，一個 export 出去的 function 跟一個要 `new` 的 class 相比，前者好 import、好測、好跟 composable 搭。class 在這裡沒有帶來任何好處，只是看起來比較「工程」。

::: tip 回頭看
這是我第一次在這個專案裡「為了架構而架構」。不會是最後一次。
:::

## 這一年結束的時候
2023 年底，`useApi.ts` 長這樣：

- 一支 `sendRequest`，一支 `getImage`（blob 取圖，裡面把 token 邏輯整段複製了一份）
- 沒有攔截器
- 錯誤 `return null`
- 回傳 `iResult`，`msg` 是字串
- token 從 store 或 localStorage 撈，寫反的 `if` 還在

全站 29 個檔 `import { sendRequest } from '@/hooks/useApi'`，API 路徑散寫在每個頁面裡。

它能用。它比 jQuery 時代好太多了。而且接下來半年它幾乎沒動，因為專案在趕功能，沒人有空回頭看一支「能用」的函式。

直到 2024 年 10 月，後端說：token 會過期，你們要自己刷新。
