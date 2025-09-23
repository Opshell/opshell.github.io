---
title: 串API 的那些事 part.1 Axios 封裝，從「能用」到「好用」
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2025-09-11'
categories:
  - 未分類
tags:
  - null
editLink: true
isPublished: false
---
# Axios 封裝，從「能用」到「好用」
今天在群組看到有位大大貼了他專案中封裝 axios 的 useApi composable，想問問大家的看法。這是一個非常經典的議題，幾乎每個專案都會有類似的檔案。把 API 請求的邏輯抽離出來，統一管理，絕對是正確的方向。

這份程式碼寫得不錯，涵蓋了 TypeScript 型別、攔截器、統一的回傳格式等。但身為一個追求程式效能、可讀性、多人協作的前端工程師{.vue}，總覺得有些地方「怪怪的」，好像可以更完美。

就讓我們用批判性思考，來看看這份程式碼的優缺點，以及可以如何優化它。

::: details 點我展開原始程式碼
```ts
import router from '@/router';
import notifyComponent from '@components/popup/notify.vue';
import useUserStore from '@store/userStore';
import { Dialog } from 'quasar';

// 從Axios 拉型別出來用
import { AxiosProgressEvent, AxiosRequestConfig, AxiosRequestHeaders, Method } from 'axios';

export interface iPaginator {
    current_page: number // 目前頁面
    total: number // 資料筆數
    per_page: number // 每頁幾筆
    last_page: number // 最後頁
}
// [-]固定的回傳格式(axios 的 data 內層)
export interface iResult<T = any> {
    status: boolean
    data: T
    messages: string[]
    paginator?: iPaginator
    httpCode?: number
}
export interface iAxiosProgressEvent extends AxiosProgressEvent {
    lengthComputable: boolean // [#] 是否開始上傳
    total: number // 上傳總量
}

let showNetErrorDialog = false; // 500 NetErrorDialog
let showPermissionsErrorDialog = false; // 401 錯誤

// [M] axios 回應攔截器
axios.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const userStore = useUserStore();
        if (error.response) {
            if (error.response.status === 500) {
                if (showNetErrorDialog) { return; }
                showNetErrorDialog = true;
                Dialog.create({
                    component: notifyComponent,
                    componentProps: {
                        type: 'error',
                        title: '連線異常',
                        message: '連線異常，請通知管理員！'
                    }
                }).onCancel(() => {
                    showNetErrorDialog = false;
                });
            }

            if (error.response.status === 400) { return Promise.resolve(error.response); }

            if (error.response.status === 401) {
                // 不能使用 useQuasar
                // https://github.com/quasarframework/quasar/discussions/12194
                if (showPermissionsErrorDialog) { return; }
                showPermissionsErrorDialog = true;
                Dialog.create({
                    component: notifyComponent,
                    componentProps: {
                        type: 'error',
                        title: '登入逾時',
                        message: '登入逾時，請重新登入！'
                    }
                }).onCancel(() => {
                    showPermissionsErrorDialog = false;
                    userStore.signOut();
                    router.push('/');
                });
            }

            if (error.response.status === 404) { return Promise.resolve(error.response); }
        }
        return Promise.reject(error);
    }
);

export default function useApi() {
    const userStore = useUserStore();

    // [M] 發送請求
    async function sendRequest<T = Record<string, unknown>>(
        url: string,
        method: Method = 'GET',
        data: T = {} as T,
        headers?: AxiosRequestHeaders,
        onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
    ): Promise<iResult | null> {
        // [-] header 處理
        if (!headers) { headers = {} as AxiosRequestHeaders; }
        if (!headers.Authorization) {
            headers.Authorization = `Bearer ${userStore.getToken()}`;
        }

        const config: AxiosRequestConfig = {
            url,
            method,
            headers,
            ...(method === 'GET' ? { params: data } : { data })
        };

        if (method === 'POST' && onUploadProgress) {
            config.onUploadProgress = onUploadProgress;
        }

        return axios(config)
            .then((axiosResponse) => {
                let result: iResult = {
                    status: false,
                    data: null,
                    messages: ['請求失敗，請聯繫管理員！']
                };

                const response = axiosResponse.data;
                const messages = axiosResponse.status === 400
                    ? Object.values(response.messages).flat() as string[] // 錯誤資料時的處理
                    : response.messages; // 正常資料的處理

                result = {
                    httpCode: axiosResponse.status,
                    status: axiosResponse.status === 200,
                    data: response.data ?? [],
                    messages
                };

                return result;
            })
            .catch((error) => {
                if (import.meta.env.DEV) {
                    console.error('Axios Error');
                    console.error('--Summary：', error.response.data.message);
                    console.error('--Detail：', error);
                }

                return null;
            });
    }

    // [M] 取得圖片
    async function getImage(url: string): Promise<iResult | null> {
        const headers = {
            Authorization: `Bearer ${userStore.getToken()}`
        };

        const config: AxiosRequestConfig = {
            responseType: 'blob',
            headers
        };

        return axios.get(url, config)
            .then((axiosResponse) => {
                let result: iResult = {
                    status: false,
                    messages: ['圖片取得失敗！'],
                    data: null
                };

                if (axiosResponse.status === 200) {
                    result = {
                        status: true,
                        messages: ['圖片取得成功！'],
                        data: axiosResponse.data
                    };
                }

                return result;
            })
            .catch((error) => {
                if (import.meta.env.DEV) { console.error('Axios Image Error：', error); }

                return null;
            });
    };

    return {
        sendRequest,
        getImage
    };
}
```
:::

## 已經做到了：
在深入探討之前，必須先肯定這份程式碼的優點，它確實解決了許多開發痛點。

1. 邏輯集中化：所有 API 的請求都透過 useApi，Authorization header 的添加、錯誤處理都集中管理，符合 DRY (Don't Repeat Yourself) 原則。

2. 統一的回傳格式 (iResult)：這點超棒！前端不用再猜這次 API 回傳的資料結構是 res.data 還是 res.data.data。統一的 iResult 介面讓資料處理更可預測，可讀性大增。

3. 全域錯誤攔截：透過 axios.interceptors.response 統一處理 401 (登入逾時)、500 (伺服器錯誤) 等通用錯誤，讓頁面端的商業邏輯可以更專注於自身，不用每個 .catch 都寫一次重複的錯誤處理。

4. TypeScript 整合：完整的型別定義，從 iResult 到 sendRequest 的泛型 `<T>`，都讓程式碼的健壯性 (Robustness) 和可維護性提升了一個檔次。

## 還可以再：
雖然優點很多，但從多人協作和極端情況 (Edge Case) 的角度來看，有幾個地方值得我們深入探討。

1. 全域狀態旗標 (Global Flag) 的風險
::: warning
showNetErrorDialog 和 showPermissionsErrorDialog 是潛在的 Race Condition (競爭條件) 風險來源。
:::

這兩個變數被定義在模組的最頂層，它們的生命週期是跟著整個應用程式的。

想像一個情境：

  1. 使用者快速切換頁面，同時觸發了 A、B 兩個 API 請求。

  2. 不幸地，兩個 API 都在差不多時間點回傳了 500 錯誤。

  3. 請求 A 先回來，檢查 showNetErrorDialog 是 false，於是把它設為 true，並跳出錯誤視窗。

  4. 幾乎在同時，請求 B 也回來了，它檢查 showNetErrorDialog 發現是 true，於是直接 return，什麼也沒做。

  5. 使用者關閉了由請求 A 觸發的視窗，onCancel 回呼將 showNetErrorDialog 設回 false。

結果：使用者只看到一個錯誤視窗，但其實有兩個 API 請求都失敗了。他可能永遠不會知道請求 B 也出錯了。這種不穩定的行為在複雜的應用中很難除錯。

2. getImage 和 sendRequest 的功能重疊
getImage 函式本質上就是一個特殊設定的 sendRequest (指定 responseType: 'blob')。但目前的寫法卻是完全獨立的兩套邏輯，包括 header 的設定、.then 和 .catch 的處理都重複了。

這違反了 DRY 原則。如果未來 Authorization 的取得方式改變了 (例如從 userStore 換到另一個地方)，我們就必須同時修改 sendRequest 和 getImage 兩個地方，增加了維護成本和出錯的風險。

3. 回傳 null 可能導致的麻煩
在 sendRequest 和 getImage 的 .catch 區塊中，最終都 return null。這代表呼叫端的程式碼必須這樣寫：
```ts
const result = await api.sendRequest(...);
if (result) {
  // 業務邏輯...
  // result 的型別是 iResult
} else {
  // 處理 null 的情況
}
```

每次呼叫都需要做一次 if 判斷，有點繁瑣。更重要的是，當請求失敗時，我們失去了錯誤的詳細資訊。呼叫端只知道「失敗了 (拿到 null)」，但不知道為什麼失敗。如果我們總是回傳一個 iResult 物件，只是 status 為 false，並在 messages 裡帶上錯誤訊息，這樣呼叫端的處理會更統一。

4. sendRequest 的 .then 區塊邏輯可以更清晰
目前的寫法在 .then 裡面處理 status === 400 的情況。
```ts
// ... in .then()
const messages = axiosResponse.status === 400
    ? Object.values(response.messages).flat() as string[]
    : response.messages;
```
雖然攔截器裡 Promise.resolve(error.response) 讓 400 錯誤能進到 .then 裡，但這會讓 .then 的職責不夠單純。.then 理應只處理「成功」的邏輯。我們可以把這個判斷移到攔截器裡，或者在回傳前做一次性的整理就好。

## 動手重構吧
綜合以上幾點，我們可以來動手優化這份程式碼。目標是：提高可讀性、降低維護成本、增強穩定性。

::: tip
我們的重構核心思想：

1. 제거全域旗標，讓錯誤處理更可靠。

2. 抽象化 sendRequest，讓 getImage 成為它的一個應用。

3. 確保函式永遠回傳 `Promise<iResult>`，避免 `null` 檢查。

4. 增加可選參數，讓函式更具彈性。
:::

::: details 點我展開重構後的程式碼
```ts
import router from '@/router';
import notifyComponent from '@components/popup/notify.vue';
import useUserStore from '@store/userStore';
import { Dialog, QDialog } from 'quasar';
import axios, { AxiosProgressEvent, AxiosRequestConfig, AxiosResponse, Method } from 'axios';

// --- 型別定義 (保持不變) ---
export interface iPaginator { /* ... */ }
export interface iResult<T = any> { /* ... */ }

// --- 優化後的攔截器 ---
// 使用 QDialog.isActive 來避免重複開啟 Dialog
axios.interceptors.response.use(
    (response: AxiosResponse<iResult>) => response, // 直接回傳 response
    (error) => {
        const userStore = useUserStore();

        if (!error.response) {
            // 處理網路斷線等沒有 response 的情況
            if (!QDialog.isActive) {
                Dialog.create({
                    component: notifyComponent,
                    componentProps: { /* ... 網路錯誤 ... */ }
                });
            }
            return Promise.reject(error);
        }

        const status = error.response.status;
        switch (status) {
            case 500:
                if (!QDialog.isActive) {
                    Dialog.create({
                        component: notifyComponent,
                        componentProps: { type: 'error', title: '連線異常', message: '伺服器發生錯誤，請通知管理員！' }
                    });
                }
                break;
            case 401:
                if (!QDialog.isActive) {
                    Dialog.create({
                        component: notifyComponent,
                        componentProps: { type: 'error', title: '登入逾時', message: '您的登入已過期，請重新登入！' }
                    }).onDismiss(() => { // onCancel 也可以，onDismiss 更通用
                        userStore.signOut();
                        router.push('/');
                    });
                }
                break;
            // 400, 404 等我們希望在業務邏輯層處理的錯誤，直接 resolve
            case 400:
            case 404:
                return Promise.resolve(error.response);
        }

        return Promise.reject(error); // 對於其他未處理的錯誤，保持 reject
    }
);

// --- 優化後的 Composable ---
interface IApiOptions {
    auth?: boolean; // 是否需要驗證
    responseType?: 'json' | 'blob'; // Response Type
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
}

export default function useApi() {
    const userStore = useUserStore();

    // [M] 發送請求 (核心函式)
    async function sendRequest<T = any>(
        url: string,
        method: Method = 'GET',
        data: T = {} as T,
        options: IApiOptions = {}
    ): Promise<iResult> {
        // 解構 options 並設定預設值
        const { auth = true, responseType = 'json', onUploadProgress } = options;

        const headers: AxiosRequestConfig['headers'] = {};
        if (auth) {
            headers.Authorization = `Bearer ${userStore.getToken()}`;
        }

        const config: AxiosRequestConfig = {
            url,
            method,
            headers,
            responseType,
            ...(method.toUpperCase() === 'GET' ? { params: data } : { data })
        };

        if (method.toUpperCase() === 'POST' && onUploadProgress) {
            config.onUploadProgress = onUploadProgress;
        }

        try {
            const axiosResponse = await axios<iResult>(config);
            const responseData = axiosResponse.data;

            // 針對 Laravel 400 驗證錯誤的特殊處理
            if (axiosResponse.status === 400 && responseData.messages) {
                return {
                    httpCode: 400,
                    status: false,
                    data: responseData.data ?? null,
                    messages: Object.values(responseData.messages).flat() as string[],
                };
            }

            // 針對 Blob 的成功回傳
            if (responseType === 'blob') {
                return {
                    httpCode: axiosResponse.status,
                    status: axiosResponse.status === 200,
                    data: responseData, // data 此時是 Blob
                    messages: ['圖片取得成功！'],
                }
            }

            // 統一的成功回傳格式
            return {
                httpCode: axiosResponse.status,
                status: axiosResponse.status >= 200 && axiosResponse.status < 300,
                data: responseData.data ?? [],
                messages: responseData.messages ?? [],
                paginator: responseData.paginator,
            };

        } catch (error: any) {
            if (import.meta.env.DEV) {
                console.error('Axios Request Failed:', error);
            }
            // 統一的失敗回傳格式
            return {
                httpCode: error.response?.status || 500,
                status: false,
                data: null,
                messages: [error.response?.data?.message || '發生未知錯誤，請聯繫管理員！']
            };
        }
    }

    // [M] 取得圖片 (sendRequest 的語法糖)
    async function getImage(url: string): Promise<iResult> {
        return sendRequest(url, 'GET', {}, { responseType: 'blob' });
    }

    // 你還可以擴充更多語法糖
    async function postForm<T>(url: string, data: T, onUploadProgress?: (e: AxiosProgressEvent) => void) {
        return sendRequest(url, 'POST', data, { onUploadProgress });
    }

    return {
        sendRequest,
        getImage,
        postForm,
    };
}
```

## 重構亮點分析
1. 消除全域旗標：我們移除了 showNetErrorDialog 和 showPermissionsErrorDialog。改用 QDialog.isActive (假設 Quasar 提供類似的 API，如果沒有，也可以自己實作一個簡單的 service 來管理)，來判斷當前是否有 Dialog 存在，這能更有效地防止 Dialog 重複彈出。

2. sendRequest 成為唯一核心：現在 getImage 只是呼叫 sendRequest 並傳入特定 options 的一個「語法糖 (Syntactic sugar)」。未來任何底層邏輯的修改，都只需要在 sendRequest 中進行。我們甚至可以輕鬆擴充出 postForm、downloadFile 等更多便捷的函式。

3. 穩定的回傳型別：sendRequest 的回傳型別變成了 `Promise<iResult>`，不再是 `Promise<iResult | null>`。無論成功或失敗，我們都回傳一個符合 iResult 結構的物件。這讓呼叫端的程式碼可以更簡潔、更一致。
```ts
// 不再需要 if (result)
const result = await api.sendRequest(...);
if (result.status) {
    // 成功邏輯
} else {
    // 失敗邏輯，還可以從 result.messages 拿到錯誤訊息
    showErrorMessage(result.messages.join(', '));
}
```
4. try...catch 讓流程更清晰：使用 async/await 搭配 try...catch，取代了 .then().catch() 的鏈式呼叫。這使得程式碼的執行流程更像同步程式碼，可讀性更高。成功的邏輯放在 try 區塊，所有可能的失敗（包括網路錯誤、伺服器錯誤）都由 catch 區塊統一兜底，並回傳格式化的失敗物件。

5. 靈活的 options 參數：新增的 options 物件讓 sendRequest 變得更有彈性。未來如果需要支援不需要 Authorization 的公開 API，只需傳入 { auth: false } 即可，擴充性大增。

## 總結與展望
這份原始的 useApi 封裝已經是一個很好的起點，它展現了作者對於程式碼組織和架構的思考。透過這次的批判性思考與重構，我們進一步提升了它的健壯性、可讀性和可維護性，讓它從「能用」的階段，邁向了「好用」的階段。

這就是我身為一個前端工程師{.vue}的日常思考。不斷地對現有程式碼提出疑問，思考潛在的風險和更優雅的寫法，才能在多人協作的專案中，打造出更穩固、更易於維護的產品。

當然，這個重構版本也還有可以再優化的地方，例如：

- 請求取消 (Request Cancellation)：對於搜尋建議這類高頻觸發的請求，可以整合 AbortController 來取消上一次未完成的請求。
- 快取 (Caching)：對於不常變動的 GET 請求，可以加入快取機制，減少不必要的伺服器負擔。
- 全域 Loading 狀態：可以再整合 Pinia，做一個全域的 isLoading 狀態，讓 UI/UX 體驗更好。

不知道大家有沒有更好的想法？歡迎一起交流！
