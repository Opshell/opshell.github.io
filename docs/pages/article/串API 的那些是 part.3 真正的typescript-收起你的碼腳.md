---
title: 串API 的那些是 part.3 用 Typescript-收起你的碼腳
image:
description:
keywords:
author: 'Opshell'
createdAt: 2025-09-11
categories:
  - '未分類'
tags:
  -
editLink: true
isPublished: false
---

# 用 Typescript-收起你的碼腳
## 問題
```ts
import router from '@/router';

import notifyComponent from '@components/popup/notify.vue';

import useUserStore from '@store/userStore';

import axios, { AxiosProgressEvent, AxiosRequestConfig, AxiosResponse, Method } from 'axios';

import { Dialog, QDialog } from 'quasar';

// --- 型別定義 (保持不變) ---

export interface iPaginator {

    current_page: number // 目前頁面

    last_page: number // 最後頁

}

export interface iResult<R = unknown> { // R = 回傳格式

    status: boolean

    data: R

    messages: string[]

    paginator?: iPaginator

    httpCode?: number

}

// [M] axios 回應攔截器

axios.interceptors.response.use(

    (response: AxiosResponse<iResult>) => response, // 直接回傳 response

    async (error) => {

        const userStore = useUserStore();

        if (!error.response) {

            // 處理網路斷線等沒有 response 的情況

            if (!QDialog.isActive) { // 使用 QDialog.isActive 來避免重複開啟 Dialog

                Dialog.create({

                    component: notifyComponent,

                    componentProps: {

                        type: 'error',

                        title: '網路錯誤',

                        message: '連線異常，請通知管理員！'

                    }

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

                        componentProps: {

                            type: 'error',

                            title: '連線異常',

                            message: '伺服器發生錯誤，請通知管理員！'

                        }

                    });

                }

                break;

            case 401:

                if (!QDialog.isActive) {

                    Dialog.create({

                        component: notifyComponent,

                        componentProps: {

                            type: 'error',

                            title: '登入憑證逾時',

                            message: '您的登入已過期，請重新登入！'

                        }

                    }).onDismiss(() => { // onCancel 也可以，onDismiss 更通用

                        userStore.signOut();

                        router.push('/');

                    });

                }

                break;

            // 400, 404 在業務邏輯層處理的錯誤，直接 resolve

            case 400:

            case 404:

                return Promise.resolve(error.response);

        }

        return Promise.reject(error); // 對於其他未處理的錯誤，保持 reject

    }

);

// --- 優化後的 Composable ---

interface IApiOptions {

    auth?: boolean // 是否需要驗證

    responseType?: 'json' | 'blob' // Response Type

    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void

}

// [M] useApi

export default function useApi() {

    const userStore = useUserStore();

    // [M] 發送請求 (核心函式)

    async function sendRequest<I = unknown, R = unknown>( // I = 輸入的請求參數格式 R = 回傳的資料格式

        url: string,

        method: Method = 'GET',

        data: I = [] as I,

        options: IApiOptions = {}

    ): Promise<iResult<R>> {

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

            // 針對 400 驗證錯誤的特殊處理

            if (axiosResponse.status === 400 && responseData.messages) {

                return {

                    httpCode: 400,

                    status: false,

                    data: responseData.data ?? null,

                    messages: Object.values(responseData.messages).flat()

                };

            }

            // 針對 Blob 的成功回傳

            if (responseType === 'blob') {

                return {

                    httpCode: axiosResponse.status,

                    status: axiosResponse.status === 200,

                    data: responseData, // data 此時是 Blob

                    messages: ['圖片取得成功！']

                };

            }

            // 統一的成功回傳格式

            return {

                httpCode: axiosResponse.status,

                status: axiosResponse.status >= 200 && axiosResponse.status < 300,

                data: responseData.data ?? [],

                messages: responseData.messages ?? [],

                paginator: responseData.paginator

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

        postForm

    };

}
```
目前是這樣 想說使用 unknown 來收束 any 的問題

但是好像還是有一點型別問題 教教我該怎麼做

然後 語法糖的部分 添加
```ts
import useDialog from '@hooks/useDialog.ts';

import useUserStore from '@store/userStore.ts';

const userStore = useUserStore();

const { toastNotify } = useDialog();

export async function useFileDownload(url: string, params: Record<string, any> = {}) {

    try {

        const response = await axios.get(url, {

            params,

            responseType: 'blob',

            headers: {

                Authorization: `Bearer ${userStore.getToken()}`

            }

        });

        if (response.status !== 200) {

            toastNotify('error', '下載失敗。');

            return;

        }

        // 預設檔案名稱

        let fileName = 'download.xlsx';

        // 從 Content-Disposition 抓取檔案名稱

        const contentDisposition = response.headers['content-disposition'];

        const fileNameMatch = contentDisposition?.match(/filename\*=utf-8''([^;]+)/);

        if (fileNameMatch && fileNameMatch[1]) {

            fileName = decodeURIComponent(fileNameMatch[1]);

        }

        // 創建 Blob 下載

        const blob = response.data;

        const link = document.createElement('a');

        const urlBlob = window.URL.createObjectURL(blob);

        link.href = urlBlob;

        link.setAttribute('download', fileName);

        document.body.appendChild(link);

        link.click();

        // 清理

        link.remove();

        window.URL.revokeObjectURL(urlBlob);

    } catch (err) {

        toastNotify('error', '下載失敗。');

    }

}

匯出檔案的下載?
```

好的，看到你基於上次的討論做了這麼棒的重構，而且還開始思考如何用 unknown 來收束 any，這代表你對 TypeScript 的理解又更深一層了！這非常好！

你遇到的「感覺還是有一點型別問題」，是非常敏銳的直覺。的確有幾個地方，我們可以透過更進階的 TypeScript 技巧，讓它變得無懈可擊。

同時，關於 useFileDownload 如何整合進來，這也是個好問題。它不單純只是語法糖，還涉及到 sendRequest 目前設計的回傳格式。

讓我們來一一拆解，這篇筆記可能會稍微硬核一點，但絕對值得！

## TypeScript 進階技巧：用「函式重載」精準定義你的 Axios 封裝
在上次重構了 useBackendApi 之後，我們得到了一個更健壯、可讀性更高的版本。這次，我們來挑戰最後一哩路：用更精準的型別定義，徹底消滅潛在的型別風險，並優雅地整合檔案下載功能。

批判性思考：unknown 很好，但我們能做得更好

```ts
async function sendRequest<I = unknown, R = unknown>(
    url: string,
    method: Method = 'GET',
    data: I = [] as I, // <--- 問題點 1
    options: IApiOptions = {}
): Promise<iResult<R>> {
    // ...
    try {
        const axiosResponse = await axios<iResult>(config); // <--- 問題點 2
        // ...
    } catch (error: any) {
        // ...
    }
}
```

這裡有兩個值得深入探討的「怪怪的地方」：
1. data 的預設值 [] as I
data 的型別 I 是個泛型，它可以是 object、FormData、undefined... 任何東西。但我們卻給了它一個 [] 的預設值，並用 as I 強行斷言「它就是 I 型別」。這就像拿著一把螺絲起子，然後跟 TypeScript 說：「相信我，它在任何情況下都是一把好用的槌子」。

當 method 是 POST，且我們忘記傳 data 時，API 就會收到一個空的陣列 []，這很可能不是後端{.info}預期的格式，進而導致非預期的錯誤。

2. axios<iResult>(config) 的假設
這個寫法假設了 axios 的回傳 data 永遠是 iResult 格式。但我們在 options 裡明明就支援了 responseType: 'blob'。當請求圖片或檔案時，axiosResponse.data 會是一個 Blob 物件，而不是 { status, data, messages } 這種結構。這會導致型別上的衝突和誤判。

## TypeScript 的「精準打擊」：函式重載 (Function Overloading)
為了解決第一個問題，並讓我們的函式定義更貼近真實使用情境，我們要來用一個高階技巧：函式重載。

簡單來說，就是為同一個函式提供多個不同的「型別簽名 (Type Signature)」，然後提供一個通用的「實作 (Implementation)」。

::: tip
函式重載可以讓我們根據傳入參數的不同，約束輸入和輸出的型別，提供無與倫比的開發體驗和型別安全。
:::

我們可以將 sendRequest 的情境拆成兩種：
1. GET / DELETE 等不需要 body 的請求：data 參數應該不存在。
2. POST / PUT / PATCH 等需要 body 的請求：data 參數應該是必須的。

前提是後端可以配合好，不要再幹出把資料塞進GET body 然後跟我說 可以讀的到阿 這種事了= =
::: details 點我展開重載後的 sendRequest
```ts
export default function useApi() {
    const userStore = useUserStore();

    // [M] 發送請求 (核心函式)

    // 重載簽名 1: 用於 GET, DELETE 等沒有 request body 的請求
    function sendRequest<R = unknown>(
        url: string,
        method: 'GET' | 'DELETE',
        data?: undefined,
        options?: IApiOptions
    ): Promise<iResult<R>>;

    // 重載簽名 2: 用於 POST, PUT, PATCH 等需要 request body 的請求
    function sendRequest<I = unknown, R = unknown>(
        url: string,
        method: 'POST' | 'PUT' | 'PATCH',
        data: I,
        options?: IApiOptions
    ): Promise<iResult<R>>;

    // 唯一的函式實作
    async function sendRequest<I = unknown, R = unknown>(
        url: string,
        method: Method,
        data?: I,
        options: IApiOptions = {}
    ): Promise<iResult<R>> {
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
            ...(method.toUpperCase() === 'GET' || method.toUpperCase() === 'DELETE'
                ? { params: data }
                : { data })
        };

        if (method.toUpperCase() === 'POST' && onUploadProgress) {
            config.onUploadProgress = onUploadProgress;
        }

        try {
            // 問題點2 修正：移除 axios<iResult>，讓回傳型別由底下邏輯判斷
            const axiosResponse = await axios(config);

            // 針對 Blob 的成功回傳 (優先處理)
            if (responseType === 'blob') {
                return {
                    httpCode: axiosResponse.status,
                    status: axiosResponse.status === 200,
                    // 此時 axiosResponse.data 是 Blob，我們斷言 R 是 Blob
                    data: axiosResponse.data as R,
                    messages: ['Blob data retrieved successfully!']
                };
            }

            // --- 底下都是處理 responseType === 'json' 的情況 ---
            const responseData = axiosResponse.data as iResult<R>; // 安全斷言

            // 針對 400 驗證錯誤的特殊處理
            if (axiosResponse.status === 400 && responseData.messages) {
                return {
                    httpCode: 400,
                    status: false,
                    data: (responseData.data ?? null) as R,
                    messages: Object.values(responseData.messages).flat()
                };
            }

            // 統一的成功回傳格式
            return {
                httpCode: axiosResponse.status,
                status: axiosResponse.status >= 200 && axiosResponse.status < 300,
                data: (responseData.data ?? []) as R,
                messages: responseData.messages ?? [],
                paginator: responseData.paginator
            };
        } catch (error: any) {
            if (import.meta.env.DEV) {
                console.error('Axios Request Failed:', error);
            }
            // 統一的失敗回傳格式
            return {
                httpCode: error.response?.status || 500,
                status: false,
                data: null as R,
                messages: [error.response?.data?.message || '發生未知錯誤，請聯繫管理員！']
            };
        }
    }

    // ... 其他函式 ...
    return { sendRequest, /* ... */ }
}
```
:::

## 重構亮點分析
1. 精準的函式簽名：現在當你輸入 sendRequest('/users', 'GET', ...) 時，VS Code 會提示你第三個參數 data 是 undefined，如果你硬要傳遞，TypeScript 會直接報錯！反之，當你輸入 sendRequest('/users', 'POST', ...)，TypeScript 會告訴你必須傳遞 data，不能省略。這就是型別驅動開發 (Type-Driven Development) 的威力！

2. 安全的型別處理：我們移除了 axios<iResult> 這個不總是正確的假設。改為在 try 區塊內部，根據 responseType 的值，來做條件式的安全斷言 (Safe Assertion)。這樣 blob 和 json 兩種不同的回傳格式就能在型別系統中和平共存。

## 整合檔案下載：不只是語法糖
你提供的 useFileDownload 寫得很好，但它獨立於 useApi 之外，重複了 axios.get 和 headers 的設定，違反了 DRY 原則。我們的目標是把它整合進 useApi，成為一個方便的工具函式。

但這裡有個挑戰：下載檔案不只需要 blob 資料，還需要從 response.headers['content-disposition'] 來解析檔案名稱。而我們重構的 sendRequest 為了保持回傳格式的純粹，只回傳了 iResult，並沒有包含 headers。

怎麼辦？硬要修改 sendRequest 的回傳格式會影響到所有其他 API 呼叫，得不償失。

::: info
一個務實的作法是：在 useApi 內部新增一個專門的 downloadFile 函式。這個函式雖然也直接使用 axios，但它被視為 useApi 這個工具箱的一部分，可以共用 userStore 等內部狀態，同時又能處理自己特殊的邏輯（如讀取 headers）。
:::

整合後的檔案下載函式
我們可以把你的 useFileDownload 邏輯，變成 useApi 回傳的一個方法：

::: details 點我展開新增 downloadFile 後的完整程式碼
```ts
// ... (imports, interceptors, IApiOptions interface)

export default function useApi() {
    const userStore = useUserStore();
    const { toastNotify } = useDialog(); // 假設 useDialog 也在這個 scope

    // ... (sendRequest 的重載與實作)

    // [M] 取得圖片 (sendRequest 的語法糖)
    async function getImage(url: string): Promise<iResult<Blob>> {
        // 透過泛型明確告知回傳的 data 是 Blob
        return sendRequest<Blob>(url, 'GET', undefined, { responseType: 'blob' });
    }

    // [M] POST 表單 (sendRequest 的語法糖)
    async function postForm<I, R>(url: string, data: I, onUploadProgress?: (e: AxiosProgressEvent) => void) {
        return sendRequest<I, R>(url, 'POST', data, { onUploadProgress });
    }

    // [M] 專門處理檔案下載的函式
    async function downloadFile(url: string, params: Record<string, any> = {}, defaultFileName = 'download.xlsx') {
        try {
            const response = await axios.get(url, {
                params,
                responseType: 'blob',
                headers: {
                    Authorization: `Bearer ${userStore.getToken()}`
                }
            });

            if (response.status !== 200) {
                toastNotify('error', '下載失敗：伺服器回應錯誤。');
                return;
            }

            // 從 Content-Disposition 抓取檔案名稱
            const contentDisposition = response.headers['content-disposition'];
            const fileNameMatch = contentDisposition?.match(/filename\*=utf-8''([^;]+)/);

            let fileName = defaultFileName;
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = decodeURIComponent(fileNameMatch[1]);
            }

            // 創建 Blob 並觸發下載
            const blob = response.data as Blob;
            const link = document.createElement('a');
            const urlBlob = window.URL.createObjectURL(blob);

            link.href = urlBlob;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();

            // 清理 DOM 和記憶體
            document.body.removeChild(link);
            window.URL.revokeObjectURL(urlBlob);

        } catch (err) {
            toastNotify('error', '下載失敗，請檢查網路連線或聯繫管理員。');
        }
    }

    return {
        sendRequest,
        getImage,
        postForm,
        downloadFile, // 將新函式匯出
    };
}
```
:::

現在，在你的 Vue 元件中，就可以這樣優雅地使用了：
```ts
<script setup lang="ts">
import useApi from '@/composables/useApi'; // 或 useBackendApi

const { downloadFile } = useApi();

const handleDownloadReport = () => {
    const params = { year: 2025, month: 9 };
    downloadFile('/api/reports/export', params, '2025年9月報表.xlsx');
}
</script>
```

## 總結
這次我們透過兩個核心升級，讓 useApi 變得更為專業和可靠：

1. 函式重載：讓我們對 sendRequest 的輸入和輸出有了像素級的精準控制，為團隊協作提供了堅實的型別地基。

2. 務實的整合：我們沒有為了 downloadFile 而污染 sendRequest 的純粹性，而是將其作為一個獨立但歸屬在同一個 Composable 下的專用工具，達成了程式碼組織和功能實現的平衡。

這就是從「能用」到「好用」，再到「可靠」的演進過程。對細節的雕琢，正是前端工程師{.vue}價值的體現。做得非常好！
