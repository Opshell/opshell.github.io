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
  - Composables
editLink: true
isPublished: false
---

# TypeScript 開發實戰：如何優雅地設計可預測的非同步 API Hook
別再讓 TypeScript 猜測：打造健壯的 useApi Composable
Vue + TypeScript: 優化非同步 Composable，告別 ! 非空斷言

好的，身為 Vuer，這個問題簡直是每天都會遇到的經典場景！你那「感覺不太對勁」的直覺，正是區分「會寫 Code」跟「寫好 Code」的關鍵。用 `!` 處理，就像是眼睛業障重，假裝看不到，但它總有一天會在你意想不到的地方 `runtime error` 給你看。

這篇筆記就來聊聊，我們如何從根本上解決這個問題，讓 TypeScript 成為我們的神隊友，而不是那個只會บ่นบ่นบ่น的編譯器。

-----

# 告別 `!`，我如何重構我的 `useApi` Hook

身為一個追求程式碼優雅的 Vue 開發者，我跟 TypeScript 的關係就像一對情侶，大部分時間我們相處融洽，它總是能在我犯錯前提醒我。但偶爾，它也會過於嘮叨，尤其是在處理非同步 API 的時候。

你是不是也遇過這種場景？

```typescript
// Component.vue
const { result, errors, getMealDayTypeOptions } = useSendApi();

const apiResult = await getMealDayTypeOptions();

if (apiResult) { // 我明明就判斷 apiResult 是 true 了啊！
  // TypeScript: 「不行，我還是覺得 result.value 可能是 null」
  // 我：「...好，你說的都對」
  responseActions(result.value!); // 只好使出最終手段：非空斷言 !
  emit('finishAction');
} else {
  errorDialog(errors.value);
}
```

每次打出 `!` 的時候，我心裡都在吶喊：「相信我啊！我比你更懂我自己的程式碼邏輯！」

但冷靜下來，身為一個有批判性思考的工程師，我會反問自己：**「真的是 TypeScript 太笨，還是我的設計模式讓它無法理解？」**

答案通常是後者。今天，我們就來一場 `useApi` Composable 的重構之旅。

## 案發現場：一個回傳布林值的 `useApi`

我們先來看看最初的設計。

```typescript
// composables/useSendApi.ts (舊版)
export function useSendApi() {
  const result = ref(null);
  const data = ref(null);
  const errors = ref([]);

  async function getMealDayTypeOptions() {
    // ...
    return getSchedule().then((res) => {
      // 成功邏輯
      result.value = res;
      data.value = res.data;
      return true; // <--- 成功的路徑回傳 true
    }).catch((error) => {
      // 失敗邏輯
      errors.value = [...];
      return false; // <--- 失敗的路徑回傳 false
    });
  }

  return { result, data, errors, getMealDayTypeOptions }
}
```

這個設計的核心問題在於：**`getMealDayTypeOptions` 的回傳值 `Promise<boolean>` 與 `result`、`data` 的狀態變更，這兩者之間的關聯性只存在於我們的腦中，並不存在於 TypeScript 的型別系統中。**

TypeScript 的**控制流分析 (Control Flow Analysis)** 很強大，但它無法跨越函式的邊界去理解：「哦，當這個函式回傳 `true` 時，另一個在它作用域內的 `ref` 就一定會有值」。

所以，我們需要改變設計，讓這個「關聯性」直接體現在型別上。

## 方案一：讓成功回傳資料，讓失敗拋出錯誤 (最推薦)

這是最符合現代 JavaScript `async/await` 語義的作法，也是我個人最推薦的起手式。

**核心思想：**

1.  **成功路徑**: `async` 函式應該直接 `return` 我們需要的資料。
2.  **失敗路徑**: 任何不符合預期的情況，都應該 `throw` 一個 `Error`。

這樣，我們就能用 `try...catch` 語法來清晰地處理這兩種完全不同的流程。

### 1. 重構 `useSendApi.ts`

我們來改造一下 `useSendApi`，並順手讓它變得更強大：

  - 使用**泛型 `<T>`**，讓 `data` 的型別可以由外部傳入，提高複用性。
  - 建立一個**自定義錯誤型別 `ApiError`**，可以攜帶更豐富的錯誤資訊。
  - 函式不再回傳 `Promise<boolean>`，而是 `Promise<ApiResult<T>>`。

<!-- end list -->

```typescript
// composables/useSendApi.ts (新版)
import { ref } from 'vue';

// 假設這是後端 API 的通用回傳格式
interface ApiResult<T> {
    status: boolean;
    data: T;
    messages: string[];
}

// 自定義錯誤類別，可以攜帶完整的錯誤訊息陣列
class ApiError extends Error {
    messages: string[];

    constructor(messages: string[]) {
        super(messages.join(', ')); // 父類別的 message
        this.name = 'ApiError';
        this.messages = messages;
    }
}

// 使用泛型 <T> 讓這個 composable 更有彈性
export function useSendApi<T>() {
    const result = ref<ApiResult<T> | null>(null);
    const data = ref<T | null>(null);
    const error = ref<ApiError | null>(null); // 改為單一 error 物件，更符合 try-catch
    const isLoading = ref(false);

    // ... 其他 reset 等輔助函式

    // <--- 關鍵改動：回傳值從 Promise<boolean> 改為 Promise<ApiResult<T>>
    async function getMealDayTypeOptions(): Promise<ApiResult<T>> {
        isLoading.value = true;
        error.value = null; // 重置錯誤狀態
        try {
            const res: ApiResult<T> = await getSchedule(); // 假設 getSchedule 是一個發起請求的函式

            if (!res) {
                // 處理網路層級或 fetch 失敗的錯誤
                throw new ApiError(['取得供餐日類別失敗，請檢查網路狀況！']);
            }

            if (!res.status) {
                // 處理 API 回傳的業務邏輯錯誤 (e.g. status: false)
                throw new ApiError(res.messages || ['發生未知錯誤']);
            }

            // --- 執行到這裡，代表 100% 成功 ---
            result.value = res;
            data.value = res.data;
            return res; // <--- 成功時直接回傳整個結果！

        } catch (err: any) {
            const apiError = err instanceof ApiError ? err : new ApiError([err.message || '未知執行錯誤']);
            error.value = apiError;

            // <--- 將錯誤繼續拋出，這樣呼叫端才能 catch 到！
            throw apiError;
        } finally {
            isLoading.value = false;
        }
    }

    return { result, data, error, isLoading, getMealDayTypeOptions };
}
```

### 2. 修改 Vue 元件的呼叫方式

現在，元件內的邏輯變得極度清晰且 100% 型別安全。

```typescript
// Component.vue (新版)
import { useSendApi } from './useSendApi';

interface MealDayType {
    id: number;
    name: string;
}

// ...
setup(props, { emit }) {
    // 傳入 MealDayType[] 作為 T 的具體型別，TypeScript 就知道 data 的型別了
    const { error, getMealDayTypeOptions } = useSendApi<MealDayType[]>();

    async function handleFetch() {
        try {
            // 如果 getMealDayTypeOptions 拋出錯誤，程式會直接跳到 catch 區塊
            const apiResult = await getMealDayTypeOptions();

            // --- 執行到這裡，TypeScript 100% 確定 apiResult 是存在的 ---
            // 它知道 apiResult 的型別是 ApiResult<MealDayType[]>
            // 再也不需要 if 判斷，更不需要可惡的 !
            responseActions(apiResult);
            emit('finishAction');

        } catch (err: any) {
            // err 就是我們在 useSendApi 中拋出的 ApiError 實例
            const errorMessages = err.messages || ['發生錯誤'];
            errorDialog(errorMessages);
        }
    }
    // ...
}
```

**這個方法的好處：**
  - **型別安全 (Type Safety):** 在 `try` 區塊內，`apiResult` 的型別被 TypeScript 精準推斷，`!` 從此消失。
  - **語意清晰:** `try...catch` 語法完美分離了「成功」與「失敗」的處理路徑，程式碼的可讀性大幅提升。
  - **遵循慣例:** 這是 `Promise` 和 `async/await` 被設計出來的初衷，也是社群的標準作法。

## 方案二：終極進化，打造通用的 `useAsyncState`

當你的專案越來越大，你會發現到處都在重複「發請求 -\> 管理 loading -\> 管理 error -\> 管理 data」這套邏輯。身為一個有追求的工程師，我們應該把它抽象出來。

這個模式將\*\*「關注點分離 (Separation of Concerns)」\*\*做得更徹底：

1.  **API 函式**: 只負責定義如何發送請求、處理原始回傳並回傳乾淨的資料（或拋出錯誤）。
2.  **Composable (`useAsyncState`)**: 只負責管理任何非同步操作的通用狀態（`isLoading`, `error`, `state`）。

### 1. 建立 `useAsyncState.ts`

這是一個高度可複用的 Composable，靈感來自於 `VueUse` 的 `useAsyncState`。

```typescript
// composables/useAsyncState.ts
import { ref, shallowRef, type Ref } from 'vue';

// T 是成功時 data 的型別, E 是錯誤的型別
export function useAsyncState<T, E = Error>(
    asyncFunction: () => Promise<T>, // <--- 接收一個回傳 Promise 的函式
    initialState: T // 提供一個初始狀態，避免 data 為 null
) {
    const state: Ref<T> = shallowRef<T>(initialState); // shallowRef 對於深層物件效能更好
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

    return { state, error, isLoading, execute };
}
```

### 2. 如何在元件中使用

API 的邏輯可以獨立成一個 service 函式，然後用 `useAsyncState` 來包裝它。

```typescript
// services/mealService.ts
async function getMealDayTypeOptionsAPI(): Promise<MealDayType[]> {
    const res = await getSchedule(); // 假設這是你的 api client
    if (!res || !res.status) {
        throw new ApiError(res?.messages || ['取得資料失敗']);
    }
    return res.data; // 只回傳最重要的 data
}

// Component.vue (終極版)
import { useAsyncState } from './useAsyncState';
import { getMealDayTypeOptionsAPI } from '@/services/mealService';

// ...
setup() {
    const {
        state: mealDayTypes,
        error,
        isLoading,
        execute: fetchMealDayTypes // 可以解構時重新命名
    } = useAsyncState(
        getMealDayTypeOptionsAPI, // <--- 把 API 函式當作參數傳入
        [] // <--- 提供初始狀態，型別自動推斷為 MealDayType[]
    );

    onMounted(async () => {
        try {
            await fetchMealDayTypes();
            // 成功了！資料就在 mealDayTypes.value
            console.log('資料載入成功:', mealDayTypes.value);
        } catch (e) {
            // 失敗了！
            errorDialog(error.value?.messages || ['未知錯誤']);
        }
    });

    // 你可以輕易地將 mealDayTypes, isLoading, error 綁定到模板上
    return { mealDayTypes, isLoading, error };
}
```

**這個方法的好處：**

  - **高度可複用 (Reusable Code):** `useAsyncState` 可以用來包裝任何非同步函式，不只是 API 請求。
  - **關注點分離 (Separation of Concerns):** API Service 只管資料，Composable 只管狀態，元件只管呈現與觸發，職責分明，多人協作時更不容易出錯。
  - **UI 綁定友好:** 你可以直接在 template 中使用 `v-if="isLoading"` 或 `v-if="error"`，寫起來非常直觀。
## 總結
| 方案 | 優點 | 適用場景 |
| :--- | :--- | :--- |
| **方案一：`try...catch`** | 直觀、易於理解、快速解決 `!` 問題、符合 `async/await` 語義 | 大部分情況下的首選。特別是當 Composable 與特定 API 邏輯強相關時。 |
| **方案二：通用 `useAsyncState`** | 高度抽象、可複用、關注點分離得最徹底 | 專案規模較大，有多個類似的非同步狀態需要管理時，能大幅減少重複程式碼。 |

別再跟 TypeScript 吵架了。當它對你提出質疑時，先停下來思考一下，是不是我們的程式碼設計有機會變得更好。

從今天起，讓我們和 `!` 說分手，擁抱 `try...catch`，寫出讓自己和 TypeScript 都滿意的程式碼吧！

## TypeScript 關鍵字 (TypeScript Concepts)
- Type Safety (型別安全)
- Type Inference (型別推斷)
- Non-null Assertion (非空斷言 !)
- Generics (泛型 T)
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
