---
title: zod schema 型別使用規範
image: ''
description: ''
keywords: ''
author: Opshell
version: 2.0.0
createdAt: '2025-09-22'
categories:
  - 開發手冊
tags:
  - TypeScript
  - Zod
  - 型別管理
  - 開發規範
editLink: true
isPublished: false
---
* **Version**: 3.4.2
* **Authors**: Opshell, Vuer

# 開發目錄結構
專案採用微調後的 **FSD** 架構，強調業務邏輯的封裝。

```text
src/
 ├─ asset
 │   ├─ fonts/
 │   ├─ icons/
 │   └─ scss/
 ├─ features/{featureName}/         # 業務模組
 │   ├─ apis/                       # Repository (API 呼叫)
 │   ├─ components/                 # 模組專用 UI 組件
 │   ├─ hooks/                      # 模組專用 Composables
 │   ├─ services/                   # Servie 複雜業務邏輯抽離
 │   ├─ schemas/                    # Zod 資料層 (SSoT 核心)
 │   │   └─ {featureName}.schema.ts
 │   ├─ constants.ts                # 常數 (如 Enum, UI Object、Array)
 │   └─ index.ts                    # 模組匯出點 (只從這邊匯出) 外面要引用只能通過這邊
 ├─ layout/                         # 不同版面大框的進入點
 ├─ pages/                          # 全域共用型別 (非 Zod)
 ├─ router/
 ├─ shared/                         # 共用模組
 │   ├─ apis/                       # Repository (API 呼叫)
 │   ├─ components/                 # 共用 Composables (useBackendApi)
 │   ├─ hooks/                      # 全域共用 Composables (useDialog, useCommonData)
 │   ├─ store/                      # Pinia 狀態管理
 │   └─ utils/                      # 工具函式 (zod.ts, object.ts)
 └─ types/
```

## 檔案命名規範
1. 以 **小駝峰式命名** (camelCase) 為主。
2. /page 下檔案採用 **大駝峰式命名** (PascalCase)

# 程式碼風格規範

# CSS & SCSS 規範

## class 命名規範 — 組件化 BEM
在 **Vue**{.vue} 開發環境中，純血 BEM 往往會導致模板中的 `:class` 綁定過於冗長。
本規範採用 **「組件化 BEM」** 模式，區分靜態變體與動態狀態，平衡可讀性與開發效率。
* **Principle**: BEM 結構 + 語意化狀態控制 (State Helpers)

---

## 一、 命名組成結構

命名由 **Block**、**Element**、**Modifier** 以及 **State** 四個部分組成：

| 組成 | 語法 | 描述 | 範例 |
| :--- | :--- | :--- | :--- |
| **Block** | `.block` | 組件最外層容器。 | `.audit-btn` |
| **Element** | `__element` | 區塊內的子元素。 | `.audit-btn__icon` |
| **Modifier** | `--modifier` | 靜態變體（由 Props 決定）。 | `.audit-btn--primary` |
| **State** | `.is-state` | 動態狀態（由 UI 互動決定）。 | `.is-loading`, `.is-active` |

---

## 二、 變體 (Modifier) vs 狀態 (State)

這是解決 BEM 冗長問題的核心邏輯，我們將樣式切分為「預設屬性」與「臨時狀態」：

### 1. Modifier (`--`) — 靜態變體
用於定義組件在設計系統中的**固定規格**。通常在組件初始化時透過 **Props**{.brand} 傳入，且在生命週期中不常變動。
* **場景**：顏色 (`--red`)、尺寸 (`--sm`)、形狀 (`--round`)。
* **優點**：結構嚴謹，符合 BEM 原生規範。

### 2. State (`is-`) — 動態狀態
用於定義組件的**當前互動行為**。語意上代表「這組件現在『是...』什麼狀態」。
* **場景**：`is-open`, `is-error`, `is-disabled`, `is-fetching`。
* **優點**：極大化簡化 **Vue**{.vue} 模板中的 `:class` 綁定長度。

::: tip 範例對比
**❌ 純血 BEM (冗長難維護)**
`<div class="btn btn--primary" :class="{ 'btn--open': isOpen }">`

**✅ 組件化 BEM (清爽且語意化)**
`<div class="btn btn--primary" :class="{ 'is-open': isOpen }">`
```scss
.btn {
    ...
    &--primary { ... } // Modifier
    &.is-open { ... } // State
}
```

:::

---

## 三、 SCSS 結構化撰寫規範

在編寫 **SCSS** 時，應善用父選擇器引用符號 (`&`)。**State** 類名必須嵌套在 **Block** 之下，以確保權重正確且不污染全域樣式。

```scss
.audit-card {
    display: flex;
    padding: 1rem;

    // Element: 子元素
    &__title {
        font-weight: bold;
    }

    // Modifier: 規格變體 (靜態)
    &--highlight {
        background-color: yellow;
    }

    // State: 互動狀態 (動態) [!code focus]
    &.is-active {
        border: 2px solid blue;
    }

    &.is-error {
        border-color: red;
        .audit-card__title { color: red; } // 狀態連動子元素
    }
}
```

## 四、 複雜 Class 的管理 (ViewModel 模式)
當一個組件同時具備多個 Props 與多個 UI State 時，應避免在模板寫邏輯。請在 script 區塊中使用 Computed 統一封裝。

```vue
<script setup lang="ts">
    const props = defineProps<{
        type: 'main' | 'sub'
        size: 'sm' | 'md'
    }>();

    const isOpen = ref(false);
    const hasError = ref(false);

    // [-] Display Mapping (ViewModel)
    const containerClasses = computed(() => [
        `audit-card--${props.type}`,
        `audit-card--${props.size}`,
        {
            'is-open': isOpen.value,
            'is-error': hasError.value
        }
    ]);
</script>

<template>
    <div class="audit-card" :class="containerClasses">
        <h2 class="audit-card__title">
            標題
        </h2>
    </div>
</template>
```

## 五、 注意事項與批判性提醒
除非遇到套件樣式覆蓋等不可抗力
盡量不使用 !important 來強制覆蓋樣式，這會破壞 CSS 的自然繼承與權重機制，導致後續維護困難。

::: danger
嚴禁全域狀態污染 嚴禁在 CSS/SCSS 檔案的頂層定義 .is-open 等狀態類名。這會導致樣式在整個專案中產生不可預期的衝突。所有的狀態必須限定在特定的 Block 內。
:::

::: info 權重優勢
使用 .block.is-active 的寫法會讓 CSS 權重增加，這能確保狀態樣式能精確地覆蓋掉基礎樣式，而不需要使用 !important。
:::

# 標準化 SFC Script 結構
## 功能導向 (Feature-Oriented)
解決 Vue 開發中最常見的「狀態散亂」問題。

透過 #region 將邏輯拆分為：
[P] UI / Constants：管理單純的介面狀態（如 Modal 開關）。
[P] 頁面資料 (URL-First)：處理最核心的列表驅動邏輯。
[P] Form Data Binding：處理表單驗證與初始化。
[P] Mutations：封裝對後端的副作用操作。
[P] Trigger Handlers：介面與邏輯的橋樑。

2. URL-First{.brand} 策略的批判性思考
::: tip 為什麼這很重要？
瀏覽器行為一致性：使用者按「上一頁」或「重新整理」時，搜尋結果不會消失。
可分享性：PM 只要複製網址給開發者，就能看到一模一樣的搜尋結果（含分頁）。
邏輯解耦：useQuery 不再監聽一堆 ref，而是只聽 searchParams。

## 核心設計原則

1. **高內聚 (High Cohesion)**{.brand}：將與特定業務邏輯相關的狀態、計算屬性與處理函式（Handlers）封裝在同一個 `region` 中。
2. **單一事實來源 (SSoT)**{.brand}：明確以 **URL Query** 作為列表頁面的最高狀態準則。
3. **區塊化掃描 (Block Scannability)**：利用 `// #region` 與明確的標註順序，讓協作者能透過 **VS Code** 麵包屑導航快速理解組件結構。

---

## 結構排序標準

組件內部的代碼應遵循以下由上而下的排列順序：

| 順序 | 區塊名稱 | 內容說明 |
| :--- | :--- | :--- |
| **01** | **Imports** | 套件、外部組件、型別 (`import type`) 匯入。 |
| **02** | **Initializations** | 路由、QueryClient、Store、Dialog 等基礎依賴初始化。 |
| **03** | **Global UI States** | 跨功能或簡單的全域 UI 狀態（如 `isModalShow`、`isLoading`）。 |
| **04** | **Core Data (SSoT)** | **核心資料驅動層**：從 URL 衍生的 `searchParams` 與核心 `useQuery`。 |
| **05** | **Feature Regions** | **業務功能塊**：按行為拆分（搜尋、批次操作、彈窗維護）。 |
| **06** | **Display Mapping** | 用於渲染 UI 的 `computed` 資料加工 (**ViewModel**{.brand} 層)。 |
| **07** | **Lifecycle** | `onMounted`、`onUnmounted` 等生命週期 Hook。 |

---

## 撰寫規範細則

### 1. #region 標記規範
每個獨立的業務功能必須使用 `// #region [P] 名稱` 與 `// #endregion` 包裹。
* `[P]`：代表 **Process** (處理邏輯) 或 **Private** (組件私有)。
* 區塊內應包含該功能專用的 `ref`、`useMutation`{.vue} 與相關的 `handler`。

### 2. 標準化緩衝搜尋 (Buffered Search)
為防止 **TypeScript**{.info} 轉型與路由頻繁跳轉造成的 **Throttling** 錯誤，搜尋列應遵循以下結構：
* **`localSearch`**：UI 雙向綁定用的緩衝區。
* **`searchParams`**：唯讀、反映 URL 真實狀態的 SSoT。
* **`searchHandler`**：將 `localSearch` 寫入網址並重置 `page`。

::: tip 程式碼整潔小技巧
如果一個 `Region` 內部的程式碼超過 150 行，強烈建議將其抽離為獨立的 **Composable**{.brand} (`useXxx.ts`)。
:::

---

## 標準結構範本 (Template)

::: details 點擊展開範本程式碼
```vue
<script setup lang="ts">
    import { getListApi, updateItemApi } from '@/apis/example';
    import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
    import { deepCopy } from '@utils/object';
    /** [01] Imports
     */
    import { useRoute, useRouter } from 'vue-router';

    /** [02] Initializations (Dependencies)
     */
    const route = useRoute();
    const router = useRouter();
    const queryClient = useQueryClient();

    /** [03] Global UI States
     */
    const isModalShow = ref(false);
    const selectIds = ref<number[]>([]);

    /** [04] Core Data (SSoT - URL Driven)
     */
    const searchParams = computed(() => ({
        type: route.query.type ? Number(route.query.type) : null,
        search: String(route.query.search || ''),
        page: Number(route.query.page || 1)
    }));

    const { data: listData, isLoading } = useQuery({
        queryKey: ['example', 'list', searchParams],
        queryFn: () => getListApi(searchParams.value)
    });

    // #region [P] 搜尋與分頁邏輯 (Search & Pagination)

    const localSearch = ref({
        type: searchParams.value.type,
        search: searchParams.value.search
    });

    // 同步回流：當 URL 變動（如上一頁）時，強制更新本地緩衝區
    watch(() => route.query, () => {
        localSearch.value = {
            type: searchParams.value.type,
            search: searchParams.value.search
        };
        selectIds.value = []; // 搜尋條件改變時重置選取狀態
    }, { deep: true });

    function searchHandler() {
        router.replace({
            query: {
                ...route.query,
                ...localSearch.value,
                page: undefined // 搜尋必重置頁碼
            }
        });
    }

    function pageChangeHandler(page: number) {
        router.replace({ query: { ...route.query, page: page > 1 ? page : undefined } });
    }

    // #endregion

    // #region [P] 批次操作 (Batch Action)

    const { mutate: executeBatchDelete } = useMutation({
        mutationFn: (ids: number[]) => console.log('Deleting', ids),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['example'] })
    });

    function batchDeleteHandler() {
        if (!selectIds.value.length) { return; }
        executeBatchDelete(selectIds.value);
    }

    // #endregion

    /** [06] Data Mapping (ViewModel)
     */
    const formattedList = computed(() => {
        return listData.value?.items.map(item => ({
            ...item,
            displayDate: new Date(item.createdAt).toLocaleDateString()
        })) ?? [];
    });

    /** [07] Lifecycle
     */
    onMounted(() => {
    // Analytics or Initial logs
    });
</script>
```
:::

Version:3.0.0
你觀察到的「模糊感」其實非常準確，這正是從「技術導向分層」轉向「業務導向分層」時必經的思考過程。

業界在大型 Vue 專案中，主要流行的組織方式有三種：技術層級化 (Technical Layering)、功能模組化 (Feature-based) 以及目前最推薦的 混合同步模式 (Hybrid Pattern)。

針對你的疑問，我將重新梳理出一套更清晰、能應對「簡單列表」到「複雜 CRUD」的結構規範。
---
🚀 業界主流組織方式分析
1. 按技術類型 (Technical Layering):
    - 早期 Options API 的思維：所有的 ref 放在一起，所有的 computed 放在一起。
    - 優點: 整齊，找變數很快。
    - 缺點: 邏輯碎片化。改一個功能要跳轉程式碼五個地方，這叫「彈簧床式開發」。
2. 按業務功能 (Domain/Feature Layering):
    - 將相關的 ref, computed, api, handler 全部鎖在一個區塊。
    - 優點: 高內聚（Separation of Concerns）。
    - 缺點: 區塊間的邊界容易模糊（例如：列表的載入狀態和彈窗的提交狀態是否共用？）。
-----
🎯 最終標準建議：混合式「三層結構」規範
我建議將規範定為：「頂層初始化 + 業務功能塊 + 底層生命週期」。

針對你提到的 CRUD 彈窗，我的答案是：它絕對應該算一個獨立的功能塊（Feature Block）。 因為「列表展示」和「資料維護（彈窗）」雖然操作同一份 SSoT，但它們的 UI 狀態、驗證邏輯、副作用（Mutations）是完全不同的。
序號	區塊類別	包含內容	備註
01	Imports	所有的外部依賴與型別
02	Initializations	route, router, queryClient, dialog	組件基礎設施
03	Core SSoT Context	searchParams, listQuery, mainData	頁面的靈魂（資料源）
04	Feature Blocks	核心區域：搜尋、分頁、維護彈窗、批次操作	每個功能一個 #region
05	Display Mapping	專為 Template 輸出的 computed	ViewModel 層
06	Lifecycle	onMounted, onUnmounted

---
💻 實作示範：列表帶有 CRUD 彈窗
這份範例展示了如何把 維護彈窗 (Maintain Modal) 視為獨立 Feature，同時與 核心資料 (Core Data) 互動。

```vue
<script setup lang="ts">
/** [01] Imports
 */
    import { usePostApi } from '@/features/post/apis';
    import { PostFormSchema } from '@/features/post/schemas';

    /** [02] Initializations
     */
    const route = useRoute();
    const queryClient = useQueryClient();
    const { postApi } = usePostApi();

    /** [03] Core SSoT Context (頁面主資料)
     * 這裡只放所有功能都會用到的「源頭」
     */
    const searchParams = computed(() => ({
        page: Number(route.query.page || 1),
        keyword: String(route.query.keyword || '')
    }));

    const { data: listData, isLoading } = useQuery({
        queryKey: ['posts', 'list', searchParams],
        queryFn: () => postApi.getList(searchParams.value)
    });

    // #region [P] 搜尋功能 Feature
    const localSearch = ref({ keyword: searchParams.value.keyword });
    function handleSearch() { /* router.replace... */ }
    // #endregion

    // #region [P] 維護彈窗 (Maintain Modal) Feature [!code focus]
    /** 彈窗是一個完整的 Sub-Feature，持有自己的 UI 狀態與副作用
     */
    const isModalShow = ref(false);
    const activeId = ref<number | null>(null);

    const { mutate: submitForm } = useMutation({
        mutationFn: payload => activeId.value ? postApi.update(payload) : postApi.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            isModalShow.value = false;
        }
    });

    function openEditModal(id: number) {
        activeId.value = id;
        isModalShow.value = true;
    }
    // #endregion

    /** [05] Display Mapping (ViewModel)
     */
    const displayList = computed(() => listData.value?.items ?? []);

    /** [06] Lifecycle
     */
    onMounted(() => { /* ... */ });
</script>
```

# 標準化 SFC Script 組織規範 (v4.0)

為了提高組件的可掃描性與維護性，所有組件應遵循「**三層式結構**」。

## 1. 結構階層
1. **依賴層 (Deps)**: Imports 與基礎設施初始化。
2. **資料層 (Data)**: 定義 SSoT (Single Source of Truth)，通常是 URL 驅動的參數。
3. **功能塊 (Feature Blocks)**:
   - 使用 `// #region [P] 功能名稱` 進行物理隔離。
   - 每個區塊應自帶 `ref`, `computed`, `mutation`, `handler`。
   - **彈窗維護 (Modal)**、**批次操作 (Batch Action)** 視為獨立功能塊。
4. **展現層 (Display)**: 專屬 Template 的 ViewModel 與生命週期。

## 2. 核心原則：高內聚
一個 `#region` 塊應該盡可能做到「移除該區塊，組件仍能正常渲染其餘部分」。

## 3. 命名慣例
- `...Handler`: 介面觸發的互動函式。
- `...Execute`: 真正發送 API 或處理複雜邏輯的函式。

# 伺服端資料管理規範
採用 Tanstanck Vue Query 作為主要的伺服端資料管理工具，並結合 Zod 進行資料驗證與轉換。

# TypeScript 型別規範

本規範旨在建立一套以 `Zod` Schema 為核心的、清晰、可維護且易於團隊協作的 `TypeScript` 資料層撰寫標準。
核心思想是：**從 SSoT Schema 衍生出一切**。

目標是，任何開發者看到一個 Schema 的名稱，就能立刻回答以下問題：

1.  它的核心職責是什麼？（是核心模型、API Payload？）
2.  它的資料流向是怎樣的？（是流向後端，還是來自後端？）
3.  它的資料狀態是原始的還是處理過的？

---

## 設計原則

1.  ### **以 Zod 核心 Schema 為單一事實來源 (SSoT)**
    `前端`內部使用的所有業務邏輯、驗證規則和資料模型，都應定義在一份核心 Zod Schema 中。
    核心 Schema 是一切 API 型別（Parsers, Payloads, Params）的衍生來源。

2.  ### **由內而外 (Bottom-Up)**
    巢狀 Schema 先定義最深層，逐層組合。

3.  ### **語意化命名**
    Schema 與其衍生型別的命名應能清楚表達業務實體與責任。

4.  ### **避免魔法數字**
    使用 `z.number()` 定義寫死在前端或 UI 使用的有意義數字時，使用 `z.enum()` 或 `z.nativeEnum()` 取代單純的數字，賦予業務語意。

    ```ts
    export const CategorySchema = z.object({
        id: z.number(),
        parentId: z.number(),
        title: z.string().min(1, '題目為必填'),
        type: z.enum(['color', 'material']), // 取代 type: z.string()
        enable: z.boolean().default(true)
    });
    ```

## Schema 與型別命名規則

1.  ### **統一使用 PascalCase**
    -   Schema：`CategorySchema`
    -   型別：`type Category = z.infer<typeof CategorySchema>`

2.  ### **後綴規則**
    #### 核心 SSoT

    -   `...Schema`：核心實體 (SSoT)，例如 `CategorySchema`，當後綴帶 `Schema` 代表這個實體是純粹的資料形狀與驗證規則，沒有 `.transfrom` 等 改變格式的操作，避免用來繼承或驗證時造成的隱性轉型錯誤，也不在純SSoT中添加`純控制UI的`欄位，到元件中再處理，以降低耦合並提高通用性。

    #### UI 表單層
    -   `...FormSchema`： UI 表單驗證用的 `Schema`，沒有 .transform，例如 `CreateUserFormSchema`，後續常用 `.transfrom` 衍生 `Payload`。
    #### API 請求 (Outgoing)
    -   `...Params`：**`GET`** API 請求參數（Query or Path params），例如 `GetCategoryListParams`。
    -   `...Payload`：**`POST`/`PUT`/`PATCH`** API 請求體 (Body)，例如 `UpdateCategoryPayload`。

    #### API 回應 (Incoming)
    -   `...RawSchema`：後端原始回應結構（snake\_case，允許 optional/nullable），回復格式不夠確認時可盡量寬鬆定義，通常只用來衍生 `...Parser`。
    -   `...Parser`：API 回應解析器（從 Raw → camelCase → 驗證 → 核心 Schema），例如 `UpdateCategoryParser`。

    #### 衍生型別
    -   `...`：該 `Schema.infer` 的核心型別結構，例如 `Category`。
    -   `...Input`：通常是 `Params` 或 `Payload` 的輸入狀態，用 `z.input` 產生， **代表 `Repository` 中 Call API 時帶入的資料格式** ，。
    -   `...Output`：通常是 `Parser` 的輸入狀態，用 `z.input` 產生， **代表輸出 `Repository` 或 API 回傳時的資料格式** ，通常是 `Parser` 的輸入狀態。

## 檔案結構

檔案結構應遵循 **feature-sliced** 的原則，將與特定功能相關的檔案放在一起。

```
src/
 ├─ features/{featureName}/
 │   ├─ apis/
 │   ├─ components/
 │   ├─ hooks/
 │   ├─ services/
 │   └─ schemas/                // [!code focus]
 │      ├─ {featureName}.schema.ts
 │      └─ {subContext}.schema.ts
 ├─ types/
 │   ├─ common.ts               // 共用 interface 或 type（非 Zod）。
 │   └─ globals.d.ts            // 全域環境變數與型別工具。
 └─ utils/
     └─ zod.ts                  // Zod 相關工具。
```

1.  **`src/features/{featureName}/schema/{featureName}.schema.ts`**
    * **用途**：**最重要的檔案**。定義與特定功能模組相關的所有 Zod Schema，包括核心 Schema (SSoT)、Params, Payloads 和 Parsers。
    * **原則**：**總是為 schema 建立一個 `schema` 資料夾**，即使初期只有一個檔案。這確保了專案結構的一致性和可預測性。

2.  **`src/utils/zod.ts`**
    * **用途**：放置與 Zod 相關的全域輔助函式。
    * **放置內容**：`snakeToCamel`, `camelToSnake`, `createParser` 工廠函式等。

## 檔案內部結構與排序

為了提升 `*.schema.ts` 檔案的可讀性和可維護性，應遵循「**SSoT先行，Action分明**」的原則進行排序。

1.  **核心 SSoT Schema 置頂**：檔案中最重要的核心 `...Schema` 和其 `infer` 型別應放在檔案的最上方。
2.  **共用資料與常數或基底Schema**：在 SSoT 和 API Action 之間，若有共用的驗證用Schema、RawSchema、常數宣告等，應置於此處。
2.  **以 API Action 為單位分組**：其餘的 schema 應按照 API 端點/功能（例如：Get List, Update Item）進行分組，使用 `// #region [P] 功能名稱 API Method  API url(如果有的話) + // #endregion 夾起來`，且註解明確標示。
3.  **組內遵循「請求 → 回應」順序**：在每個 Action 群組內部，先定義請求相關的 `...FormSchema`/`...Params`/`...Payload`，再定義回應相關的 `...RawSchema`/`...Parser`，最後集中導出 `...Input`/`...Output` 等型別。

## 衍生與組合原則

1.  ### **核心 Schema (SSoT)** / **RawSchema(後端回傳)** / **FormSchema(表單驗證規則)**
    定義 `camelCase` + 驗證規則(`RawSchema` 可寬鬆，以兼容後端高度可能為 `null`{.info} 的情況)，保持純粹，無副作用。

2.  ### **Params / Payload (請求)**
    獨立定義或從 `CoreSchema`/`FormSchema` 中 `.pick()` / `.omit()` → `z.coerce` 處理型別 → `.transform(camelToSnake)`而產生的請求介面。

3.  ### **Parser (回應)**
    定義 `RawSchema` → `.transform(snakeToCamel)` → `.pipe(CoreSchema)`，確保輸出純淨的回應校驗介面。

4.  ### **型別輸出**
    使用 `z.input` 獲取轉換前的型別，用於函式參數；使用 `z.output` 獲取轉換後的型別，用於 API 回應。

5.  ### **格式轉型要點**
    Parser 內 transform 順序統一
    ```ts
    GetUserListParser: ...RawSchema
    .transform((data)=> {
        return {
            ...data,
            enable: Boolean(data.enable)
        }
    }))
    .transform(snakeToCamel)
    .pipe(...)
    ```
    API 回傳 永遠優先處理邏輯，在轉換為駝峰，反之 輸入 API 前，永遠先轉蛇型在處理資料邏輯，`永遠在 snake_case 上做髒活，然後一次性清洗乾淨`

    5-1. 可讀性：snakeToCamel 作為進入 pipe 前的最後一道「標準化」程序，讓整個流程像一條清晰的流水線。
    5-2. 心智模型統一：當我們規定所有業務邏輯轉換 (enable: Boolean(data.enable)) 都是在 snake_case 的原始資料上進行時，我們在寫 transform 時就不用去想「嗯...這個欄位現在是 snake_case 還是 camelCase？」。也不會因為 先轉 camelCase 再做邏輯，造成轉換後TS 不好判斷型別要額外處理的問題 。

6.  ### **單一職責**
    不同情境需求應建立新的 `Schema`，而不是在同一個 `Schema` 上附加過多條件邏輯。

## 注意事項

-   `RawSchema` 可寬鬆（`nullable`, `optional`），但 `Parser` 經 `CoreSchema` `.pipe()` 後必須嚴格。
-   Schema 命名用 `PascalCase`，欄位用 `camelCase`。
-   `.schema.ts` 檔案內應保持純粹，不應 `import` **Vue**{.vue} 的 `ref`、`composable` 等。如有處理與 UI 狀態耦合的驗證需求，應透過工廠函式模式處理。
    ```ts
    // Base schema (static rules)
    export const LoginFormSchema = z.object({ /* ... */ });

    /**
     * Factory function for dynamic rules
     * @param captcha - The correct captcha string from UI state
     */
    export function createLoginSchema(captcha: string) {
        return LoginFormSchema.refine(
            data => data.captcha.toUpperCase() === captcha.toUpperCase(),
            {
                message: '驗證碼錯誤！',
                path: ['captcha']
            }
        );
    }
    ```

## 操作細則 & 說明
1.  ### **核心實體層 (Entity Layer) - `*Schema`**
    這是我們系統的基石，前端世界裡的 **單一事實來源 (SSoT)**{.brand}。它定義了應用程式中最核心、最純粹的資料模型，並應符合前端最理想的使用形態。

2.  ### **原始資料層 (Raw Layer) - `*RawSchema`**
    此層專門處理來自後端 API 的原始資料結構，通常是 `snake_case`，並允許 `optional` 和 `nullable` 欄位，以反映後端可能的資料不完整性。API Action 的 Raw 就算一樣也是會`型別別名`一個變數(值可以相等、pick、omit、extend 等，讓後續更好維護。

2.  ### **API 互動層 (API Layer) - `*Params`, `*Payload`, `*Parser`**
    此層專門處理與後端 API 溝通時的資料轉換與驗證。
    * **`...RawSchema`**
        此層專門處理來自後端 API 的原始資料結構，通常是 `snake_case`，並允許 `optional` 和 `nullable` 欄位，以反映後端可能的資料不完整性。

    * **`...Params`** (GET 請求參數)
        * **職責**：定義 `GET` 請求的 URL 查詢參數或路徑參數。
        * **要點**：大量使用 `z.coerce` 進行型別轉換，並善用 `.optional()` 和 `.default()`。
        * **命名**：`Get{EntityName}ListParams`, `Get{EntityName}Params`

    * **`...Payload`** (POST/PUT/PATCH 請求體)
        * **職責**：定義發送給後端的請求體（Body）形狀。
        * **命名**：`{Action}{EntityName}Payload`

    * **`...Parser`** (API 回應)
        * **職責**：驗證並解析從後端請求回來的原始資料 (`RawSchema`)，並將其轉換成符合我們核心實體 (`*Schema`) 的形狀。
        * **命名**：`{Action}{EntityName}Parser`

## 進階實踐：
1. ### UI 表單驗證與 API Payload 的分離
    當使用 `vee-validate`{.vue} 這類表單管理庫時，若 `Zod Schema` 包含 `.transform`{.info} (例如：`camelToSnake` 或欄位重命名)，會產生表單內部狀態 (camelCase) 與提交結果 (snake_case) 不一致的「大腦分裂」現象(也就是前面提到的 `隱性轉型`)，雖然直接使用 `payload` 也不會發生問題，但為了系統的可預測與維護性並保持職責清晰，我們規定採用分離 Schema的模式 將驗證用的 `Schema` 與 `payload` 分離：

    `...FormSchema`：一個純粹的、沒有 .transform 的 schema，專門用於 useForm 的 validationSchema 選項，負責 UI 層的即時驗證。

    `...Payload`：一個基於 FormSchema 並帶有 .transform 的 schema，專門用於在 handleSubmit 回呼函式中，將表單值轉換為最終發送到 API 的格式。

## 範例

::: code-group
```ts [category.schema.ts]
import { camelToSnake, snakeToCamel } from '@/utils/zod';
import { z } from 'zod';

// #region [P] 核心 SSoT (Core SSoT)

export const CategorySchema = z.object({
    id: z.number().int().positive(),
    title: z.string().min(1, '分類標題為必填'),
    sort: z.number().int(),
    parentId: z.number().int().default(0),
    isEnabled: z.boolean().default(true)
});

export type Category = z.infer<typeof CategorySchema>;
// #endregion

// #region [P] 取得分類列表 (Get /api/getCategoryList)

export const GetCategoryListFormSchema = z.object({
    isEnabled: z.coerce.boolean().optional(),
    search: z.string().optional()
});

export const GetCategoryListParams = GetCategoryListFormSchema.extend({
    page: z.coerce.number().int().positive().default(1)
}).transform(camelToSnake);

const GetCategoryListItemRawSchema = z.object({
    id: z.number(),
    title: z.string(),
    sort: z.number(),
    parent_id: z.number(),
    is_enabled: z.number() // 0 | 1
    // 假設後端回傳 snake_case
});

export const GetCategoryListParser = z.array(GetCategoryListItemRawSchema)
    .transform(data =>
        data.map(item => ({
            ...item,
            is_enabled: Boolean(item.is_enabled) // 在 snake_case 上做髒活
        }))
    )
    .transform(snakeToCamel)
    .pipe(z.array(CategorySchema));

// [-] Types
export type GetCategoryListForm = z.infer<typeof SearchCategoryFormSchema>;
export type GetCategoryListInput = z.input<typeof GetCategoryListParams>;
export type GetCategoryListOutput = z.iutput<typeof GetCategoryListParser>;
export type CategoryList = z.output<typeof GetCategoryListParser>;
// #endregion

// #region [P] 更新分類 (Update Category)

export const UpdateCategoryFormSchema = CategorySchema.pick({
    id: true,
    title: true,
    sort: true,
    isEnabled: true
});

export const UpdateCategoryPayload = UpdateCategoryFormSchema
    .transform(camelToSnake)
    .transform(data => ({
        ...data,
        // 永遠在 snake_case 上做髒活
        is_enabled: data.is_enabled ? 1 : 0
    }));

// 獨立宣告自己，但可以連結之前的 Schema
// 不使用像是 export const UpdateCategoryParser = GetCategoryListItemRawSchema ... 這樣的寫法;
const UpdateCategoryRawSchema = GetCategoryListItemRawSchema;
export const UpdateCategoryParser = UpdateCategoryRawSchema
    .transform(data => ({
        ...data,
        is_enabled: Boolean(data.is_enabled)
    }))
    .transform(snakeToCamel)
    .pipe(CategorySchema);

// [-] Types
export type UpdateCategoryForm = z.infer<typeof UpdateCategoryFormSchema>;
export type UpdateCategoryInput = z.input<typeof UpdateCategoryPayload>;
export type UpdateCategoryOutput = z.iutput<typeof UpdateCategoryParser>;
// #endregion
```
:::

## 總結

| 層級 | 職責 | 命名範例 | TS 型別範例 |
| :--- | :--- | :--- | :--- |
| **Entity** | **核心 SSoT** | `CategorySchema` | `Category` |
| **API** | **`GET` 請求參數** | `GetCategoryListParams` | `GetCategoryListInput`|
| **API** | **`POST`/`PUT` 請求體** | `UpdateCategoryPayload` | `UpdateCategoryInput`|
| **API** | **解析後端的回應** | `GetCategoryListParser` | `GetCategoryListOutput` |

## 下一版本更新內容：
1. 「型別別名」是更好的預設做法。
    「獨立宣告」應該是當「別名」或「extend」無法滿足需求時的最後手段。
    這個「Base Raw + Alias/Extend」的策略，更新到我們的規範裡

2. 每個 SSoT 一律使用 JSDoc 來描述用途與說明

3. 在關注點分離 (Separation of Concerns){.brand} 架構下非常典型的問題：表單資料 (Form Data) 與 傳輸資料 (DTO - Data Transfer Object) 的不一致。的狀況產生時

你的問題在於試圖用「同一個 Schema」同時描述「使用者輸入的介面」和「送給後端的最終結構」。但在這個場景下，這兩者是不一樣的。

我們應該將 Schema 拆解為三個層次：

Input：使用者填寫的。

Raw Request：程式邏輯補完資料後的 (加上 Token)。

Payload：經過變形 (Transform) 要送給後端的。

假設你使用的是 Zod{.brand} (根據語法判斷)，以下是我的優化建議與實作方式。
```ts
// 1. 定義純粹的使用者輸入 (View Model)
// 這是給 UI 綁定用的，或是 component props
export const LoginInputSchema = LoginFormSchema.pick({
    account: true,
    password: true
});

// 2. 定義尚未轉換 key 的完整請求資料 (Domain Model)
// 這裡使用 .extend 來擴充 googleToken
// 這是我們在 Service 層組合完資料當下的狀態
export const LoginRequestSchema = LoginInputSchema.extend({
    googleToken: z.string().min(1, "Google Token is required")
});

// 3. 定義要發送給後端的最終 Payload (Data Model / DTO)
// 這裡才進行 transform，確保 googleToken 也會被轉成 google_token (如果後端需要)
export const LoginPayloadSchema = LoginRequestSchema.transform(camelToSnake);

// --- 匯出型別供 TypeScript 使用 ---
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
// 注意：Transform 後的型別推斷通常需要小心，Zod 會推斷出 output type
export type LoginPayload = z.output<typeof LoginPayloadSchema>;
```