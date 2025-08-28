---
title: 重構 Vue Typescript 非同步Composable 實現真正的型別安全
image:
description:
keywords:
author: 'Opshell'
createdAt: 2025-08-26
categories:
  - 'TypeScript'
tags:
  - TypeScript
  - Vue
  - Composables
editLink: true
isPublished: false
---

# TypeScript 開發實戰：如何優雅地設計可預測的非同步 API Hook
別再讓 TypeScript 猜測：打造健壯的 useApi Composable
Vue + TypeScript: 優化非同步 Composable，告別 ! 非空斷言

## TypeScript 關鍵字 (TypeScript Concepts)
- Type Safety (型別安全)
- Type Inference (型別推斷)
- Non-null Assertion (非空斷言 !)
- Generics (泛型 <T>)
- Control Flow Analysis (控制流分析)
- Custom Error Types (自定義錯誤型別)

## 非同步與錯誤處理 (Async & Error Handling)
- Async/Await
- Promise
- try...catch
- Error Handling (錯誤處理模式)
- Throwing Errors (拋出錯誤)

## 設計模式與概念 (Design Patterns & Concepts)
- Refactoring (程式碼重構)
- State Management (狀態管理)
- Separation of Concerns (關注點分離)
- Reusable Code (程式碼複用)
- API Abstraction (API 抽象化)

## 範例
目前 useSendApi 做成這

```ts

export function useSendApi() {

const result = ref(null); // 用於存儲 API 返回的結果

const data = ref(null); // 用於存儲 API 返回的資料

const errors = ref([]);

async function getMealDayTypeOptions() {

resetOutput();

return getSchedule().then((res) => {

if (!res) { throw new Error('取得供餐日類別失敗，請檢查網路狀況或通知管理員！'); }

if (!res.status) { throw new Errors(res.messages); }

result.value = res;

data.value = res.data as T;

return true;

}).catch((error) => {

errors.value = error.messages ? [...error.messages] : [error.message];

return false;

});

}

return {

result,

data,

errors,

getMealDayTypeOptions

}

}
```
那我的問題是

就規劃的邏輯來說

只要我 function 回傳值是 true 就一定有 data 跟 result

但是還是需要像這樣判段
```ts
const {

result,

errors,

getMealDayTypeOptions

} = useSendApi();

const apiResult = await getMealDayTypeOptions();

if (apiResult) {

responseActions(result.value!);

emit('finishAction');

} else {

errorDialog(errors.value);

}
```

在 result.value 後面加! 明確告訴他一定不會是null 否則都會報錯
就算我前面檢查了 apiResult 請問我該怎麼處理這個問題呢?
有更好的型別宣告方式 或更好的規劃嗎?

## 好的，這是一個在 Vue + TypeScript 開發中非常經典且值得探討的問題！
你遇到的狀況完全正確，而且你「感覺這樣寫不夠好，需要用 ! 來斷言」的這個直覺，正是寫出更健壯、型別更安全程式碼的關鍵。

問題的核心在於：TypeScript 的靜態分析無法理解你函式內部的邏輯。

它只看到：

result 被宣告為 const result = ref(null)，所以它的型別是 Ref<ApiResponse | null>。

getMealDayTypeOptions 的回傳值是 Promise<boolean>。

TypeScript 不知道當 getMealDayTypeOptions 回傳 true 的時候，result.value 就「一定」不是 null。這兩者之間的關聯性只存在於你的程式碼邏輯中，而不在型別系統的定義裡。

因此，你需要透過改變 `設計模式`，讓這個邏輯關聯性體現在「型別」上。這裡提供兩種循序漸進的優化方案。

## 方法一：改變回傳值的結構，讓成功與失敗的路徑更清晰 (最推薦)
這是最符合 async/await 語法糖設計初衷的作法。核心思想是：

成功時：直接回傳你需要的資料。

失敗時：拋出一個錯誤 (Throw an Error)。

這樣，你就可以用 try...catch 語法來清晰地分離成功和失敗的處理邏輯，TypeScript 也能完美地理解。

1. 修改 useSendApi.ts
我們讓 getMealDayTypeOptions 在成功時回傳資料，失敗時拋出錯誤。這樣就不再需要回傳 boolean 了。

```ts
import { ref } from 'vue';

// 假設 getSchedule 回來的 res 型別
interface ApiResult<T> {
    status: boolean;
    data: T;
    messages: string[];
}

// 自定義一個錯誤類別，可以攜帶多個錯誤訊息
class ApiError extends Error {
    messages: string[];

    constructor(messages: string[]) {
        super(messages.join(', ')); // 父類別的 message
        this.name = 'ApiError';
        this.messages = messages;
    }
}


// <T> 讓這個 composable 更有彈性，可以傳入 data 的具體型別
export function useSendApi<T>() {
    const result = ref<ApiResult<T> | null>(null);
    const data = ref<T | null>(null);
    const error = ref<ApiError | null>(null); // 將 errors 改為單一 error 物件，更符合 try-catch 結構
    const isLoading = ref(false); // 加上 loading 狀態會更完整

    // reset 函式可以獨立出來
    function reset() {
        result.value = null;
        data.value = null;
        error.value = null;
    }

    async function getMealDayTypeOptions(): Promise<ApiResult<T>> { // <--- 回傳值改為 Promise<ApiResult<T>>
        reset();
        isLoading.value = true;
        try {
            const res: ApiResult<T> = await getSchedule(); // 假設 getSchedule 是一個 async 函式

            if (!res) {
                // 網路層級的錯誤
                throw new ApiError(['取得供餐日類別失敗，請檢查網路狀況！']);
            }

            if (!res.status) {
                // API 回傳的業務邏輯錯誤
                throw new ApiError(res.messages || ['發生未知錯誤']);
            }

            // --- 執行到這裡，代表絕對成功 ---
            result.value = res;
            data.value = res.data;
            return res; // <--- 成功時直接回傳整個結果

        } catch (err: any) {
            // 捕捉所有可能的錯誤 (網路、業務邏輯)
            const apiError = err instanceof ApiError ? err : new ApiError([err.message || '未知執行錯誤']);
            error.value = apiError;
            // 將錯誤繼續拋出，讓呼叫端可以 catch
            throw apiError;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        result,
        data,
        error,
        isLoading,
        getMealDayTypeOptions
    };
}
```

2. 修改你的 Vue 元件
現在你的元件呼叫方式會變得非常直觀且型別安全。
```ts
import { defineComponent } from 'vue';
import { useSendApi } from './useSendApi';

// 假設你的 data 是這種格式
interface MealDayType {
    id: number;
    name: string;
}

export default defineComponent({
    emits: ['finishAction'],
    setup(props, { emit }) {
        // 傳入 MealDayType[] 作為 T 的具體型別
        const { error, getMealDayTypeOptions } = useSendApi<MealDayType[]>();

        async function handleFetch() {
            try {
                // apiResult 現在就是 getSchedule() 回傳的完整結果
                // 如果 getMealDayTypeOptions 拋出錯誤，程式碼會直接跳到 catch 區塊
                const apiResult = await getMealDayTypeOptions();

                // --- 執行到這裡，TypeScript 100% 確定 apiResult 是存在的 ---
                // 不需要 if (apiResult), 也不需要 !
                responseActions(apiResult);
                emit('finishAction');

            } catch (err: any) {
                // err 就是我們在 useSendApi 中拋出的 ApiError
                // error.value 也會被設定好，你可以選擇用其一
                const errorMessages = err.messages || ['發生錯誤'];
                errorDialog(errorMessages);
            }
        }

        // ...
    }
});
```

這個方法的好處：

型別安全：在 try 區塊內，apiResult 的型別被 TypeScript 正確推斷為 ApiResult<T>，不再是 ApiResult<T> | null。你再也不需要 !。

語意清晰：try...catch 語法明確地將「成功路徑」和「失敗路徑」分開，程式碼更容易閱讀和維護。

遵循慣例：在現代 JavaScript/TypeScript 中，異步操作失敗時拋出錯誤是標準作法。


## 方法二：打造一個更通用的非同步狀態管理 Composable
好的，這是一個在 Vue + TypeScript 開發中非常經典且值得探討的問題！你遇到的狀況完全正確，而且你「感覺這樣寫不夠好，需要用 ! 來斷言」的這個直覺，正是寫出更健壯、型別更安全程式碼的關鍵。

問題的核心在於：TypeScript 的靜態分析無法理解你函式內部的邏輯。

它只看到：

result 被宣告為 const result = ref(null)，所以它的型別是 Ref<ApiResponse | null>。

getMealDayTypeOptions 的回傳值是 Promise<boolean>。

TypeScript 不知道當 getMealDayTypeOptions 回傳 true 的時候，result.value 就「一定」不是 null。這兩者之間的關聯性只存在於你的程式碼邏輯中，而不在型別系統的定義裡。

因此，你需要透過改變設計模式，讓這個邏輯關聯性體現在「型別」上。這裡提供兩種循序漸進的優化方案。

方法一：改變回傳值的結構，讓成功與失敗的路徑更清晰 (最推薦)
這是最符合 async/await 語法糖設計初衷的作法。核心思想是：

成功時：直接回傳你需要的資料。

失敗時：拋出一個錯誤 (Throw an Error)。

這樣，你就可以用 try...catch 語法來清晰地分離成功和失敗的處理邏輯，TypeScript 也能完美地理解。

1. 修改 useSendApi.ts
我們讓 getMealDayTypeOptions 在成功時回傳資料，失敗時拋出錯誤。這樣就不再需要回傳 boolean 了。

TypeScript

import { ref } from 'vue';

// 假設 getSchedule 回來的 res 型別
interface ApiResult<T> {
    status: boolean;
    data: T;
    messages: string[];
}

// 自定義一個錯誤類別，可以攜帶多個錯誤訊息
class ApiError extends Error {
    messages: string[];

    constructor(messages: string[]) {
        super(messages.join(', ')); // 父類別的 message
        this.name = 'ApiError';
        this.messages = messages;
    }
}


// <T> 讓這個 composable 更有彈性，可以傳入 data 的具體型別
export function useSendApi<T>() {
    const result = ref<ApiResult<T> | null>(null);
    const data = ref<T | null>(null);
    const error = ref<ApiError | null>(null); // 將 errors 改為單一 error 物件，更符合 try-catch 結構
    const isLoading = ref(false); // 加上 loading 狀態會更完整

    // reset 函式可以獨立出來
    function reset() {
        result.value = null;
        data.value = null;
        error.value = null;
    }

    async function getMealDayTypeOptions(): Promise<ApiResult<T>> { // <--- 回傳值改為 Promise<ApiResult<T>>
        reset();
        isLoading.value = true;
        try {
            const res: ApiResult<T> = await getSchedule(); // 假設 getSchedule 是一個 async 函式

            if (!res) {
                // 網路層級的錯誤
                throw new ApiError(['取得供餐日類別失敗，請檢查網路狀況！']);
            }

            if (!res.status) {
                // API 回傳的業務邏輯錯誤
                throw new ApiError(res.messages || ['發生未知錯誤']);
            }

            // --- 執行到這裡，代表絕對成功 ---
            result.value = res;
            data.value = res.data;
            return res; // <--- 成功時直接回傳整個結果

        } catch (err: any) {
            // 捕捉所有可能的錯誤 (網路、業務邏輯)
            const apiError = err instanceof ApiError ? err : new ApiError([err.message || '未知執行錯誤']);
            error.value = apiError;
            // 將錯誤繼續拋出，讓呼叫端可以 catch
            throw apiError;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        result,
        data,
        error,
        isLoading,
        getMealDayTypeOptions
    };
}
2. 修改你的 Vue 元件
現在你的元件呼叫方式會變得非常直觀且型別安全。

TypeScript

import { defineComponent } from 'vue';
import { useSendApi } from './useSendApi';

// 假設你的 data 是這種格式
interface MealDayType {
    id: number;
    name: string;
}

export default defineComponent({
    emits: ['finishAction'],
    setup(props, { emit }) {
        // 傳入 MealDayType[] 作為 T 的具體型別
        const { error, getMealDayTypeOptions } = useSendApi<MealDayType[]>();

        async function handleFetch() {
            try {
                // apiResult 現在就是 getSchedule() 回傳的完整結果
                // 如果 getMealDayTypeOptions 拋出錯誤，程式碼會直接跳到 catch 區塊
                const apiResult = await getMealDayTypeOptions();

                // --- 執行到這裡，TypeScript 100% 確定 apiResult 是存在的 ---
                // 不需要 if (apiResult), 也不需要 !
                responseActions(apiResult);
                emit('finishAction');

            } catch (err: any) {
                // err 就是我們在 useSendApi 中拋出的 ApiError
                // error.value 也會被設定好，你可以選擇用其一
                const errorMessages = err.messages || ['發生錯誤'];
                errorDialog(errorMessages);
            }
        }

        // ...
    }
});
這個方法的好處：

型別安全：在 try 區塊內，apiResult 的型別被 TypeScript 正確推斷為 ApiResult<T>，不再是 ApiResult<T> | null。你再也不需要 !。

語意清晰：try...catch 語法明確地將「成功路徑」和「失敗路徑」分開，程式碼更容易閱讀和維護。

遵循慣例：在現代 JavaScript/TypeScript 中，異步操作失敗時拋出錯誤是標準作法。

方法二：打造一個更通用的非同步狀態管理 Composable
你的 useSendApi 其實可以變得更通用，不只為 getMealDayTypeOptions 服務。我們可以將「要執行的非同步函式」當作參數傳入。

這個模式非常強大，很多流行的 Vue 工具庫（如 VueUse 的 useAsyncState）就是這樣設計的。

1. 建立通用的 useAsyncState.ts
```ts
import { ref, shallowRef } from 'vue';

// T 是成功時 data 的型別, E 是錯誤的型別
export function useAsyncState<T, E = Error>(
    asyncFunction: () => Promise<T>, // 接收一個回傳 Promise 的函式
    initialState: T // 提供一個初始狀態
) {
    const state = shallowRef<T>(initialState); // shallowRef 效能更好
    const error = ref<E | null>(null);
    const isLoading = ref(false);

    async function execute() {
        isLoading.value = true;
        error.value = null;
        try {
            const result = await asyncFunction();
            state.value = result;
            return result;
        } catch (err: any) {
            error.value = err;
            throw err; // 繼續拋出，讓呼叫者也能 catch
        } finally {
            isLoading.value = false;
        }
    }

    return {
        state,
        error,
        isLoading,
        execute
    };
}
```

2. 在元件中使用
你的 API 呼叫邏輯可以保持原樣，然後用這個通用的 Composable 來包裝它。
```ts
import { defineComponent, onMounted } from 'vue';
import { useAsyncState } from './useAsyncState';

// 假設你的 API Service
async function getMealDayTypeOptionsAPI(): Promise<MealDayType[]> {
    const res = await getSchedule();
    if (!res || !res.status) {
        throw new Error(res?.messages?.join(', ') || '取得資料失敗');
    }
    return res.data;
}

export default defineComponent({
    setup() {
        const { state: mealDayTypes, error, isLoading, execute } = useAsyncState(
            getMealDayTypeOptionsAPI, // 傳入要執行的 API 函式
            [] // 初始狀態是一個空陣列
        );

        onMounted(async () => {
            try {
                await execute();
                // 成功了！
                console.log('資料載入成功:', mealDayTypes.value);
            } catch (e) {
                // 失敗了！
                errorDialog(error.value?.message || '未知錯誤');
            }
        });

        return {
            mealDayTypes,
            isLoading,
            error
        };
    }
});
```

這個方法的好處：

高度可複用：你可以用 useAsyncState 來包裝任何非同步請求，管理它們的 data, loading, error 狀態。

關注點分離：API 函式 (getMealDayTypeOptionsAPI) 只專注於請求和回傳資料，而 useAsyncState 則專注於管理非同步操作的整個生命週期狀態。

UI 綁定友好：你可以輕易地將 isLoading, error, 和 state 綁定到你的模板上，來顯示載入指示器、錯誤訊息或最終資料。

## 總結
首選方案是「方法一」，它直接解決了你目前程式碼結構的問題，讓型別和邏輯保持同步，是邁向更健壯程式碼的重要一步。

「方法二」 則是一個更進階、更具擴展性的架構模式。當你發現專案中有很多類似的「發起請求 -> 等待 -> 處理結果/錯誤」的邏輯時，就可以考慮將其抽象成一個通用的 useAsyncState Composable。

無論選擇哪種，核心都是利用 async/await 搭配 try...catch，並讓函式在成功時回傳資料、失敗時拋出錯誤，這樣 TypeScript 就能發揮最大作用，幫助你寫出更安全、更可靠的程式碼。