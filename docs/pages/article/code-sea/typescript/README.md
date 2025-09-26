# TypeScript 型別規範

* **Version**: 2.1.0
* **Authors**: Opshell, Vuer

本規範旨在建立一套以 `Zod` Schema 為核心的、清晰、可維護且易於團隊協作的 `TypeScript` 資料層撰寫標準。
核心思想是：**從 SSoT Schema 衍生出一切**。
基本情況是，當資料到達 UI 層要使用時，已經是經過嚴格驗證且符合 UI 需求的狀態，不額外花成本處理他的欄位狀態。

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

    -   `...Schema`：核心實體 (SSoT)，例如 `CategorySchema`，當後綴帶 `Schema` 代表這個實體是純粹的資料形狀與驗證規則，沒有 `.transfrom` 等 改變格式的操作。

    #### UI 表單層
    -   `...FormSchema`： UI 表單驗證用的 `Schema`，沒有 .transform，例如 `CreateUserFormSchema`，常在後面用 `.transfrom` 衍生 `Payload`。
    #### API 請求 (Outgoing)
    -   `...Params`：**`GET`** API 請求參數（Query or Path params），例如 `GetCategoryListParams`。
    -   `...Payload`：**`POST`/`PUT`/`PATCH`** API 請求體 (Body)，例如 `UpdateCategoryPayload`。

    #### API 回應 (Incoming)
    -   `...RawSchema`：後端原始回應結構（snake\_case，允許 optional/nullable），通常只用來衍生 `...Parser`。
    -   `...Parser`：API 回應解析器（從 Raw → camelCase → 驗證 → 核心 Schema），例如 `UpdateCategoryParser`。

    #### 衍生型別
    -   `...`：該 `Schema.infer` 的核心型別結構，例如 `Category`。
    -   `...Input`：該 `z.input` 的輸入型別， **代表輸入 `Repository` 或 Call API 時帶入的資料格式** ，通常是 `Params` 或 `Payload` 的輸入狀態。
    -   `...Output`：該 `z.output` 的輸出型別， **代表輸出 `Repository` 或 API 回傳時的資料格式** ，通常是 `Parser` 的輸出狀態。

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

1.  **`src/features/{featureName}/schemas/{featureName}.schema.ts`**
    * **用途**：**最重要的檔案**。定義與特定功能模組相關的所有 Zod Schema，包括核心 Schema (SSoT)、Params, Payloads 和 Parsers。
    * **原則**：**總是為 schema 建立一個 `schemas` 資料夾**，即使初期只有一個檔案。這確保了專案結構的一致性和可預測性。

2.  **`src/utils/zod.ts`**
    * **用途**：放置與 Zod 相關的全域輔助函式。
    * **放置內容**：`snakeToCamel`, `camelToSnake`, `createParser` 工廠函式等。

## 檔案內部結構與排序

為了提升 `*.schema.ts` 檔案的可讀性和可維護性，應遵循「**SSoT先行，Action分明**」的原則進行排序。

1.  **核心 SSoT Schema 置頂**：檔案中最重要的核心 `...Schema` 和其 `infer` 型別應放在檔案的最上方。
2.  **以 API Action 為單位分組**：其餘的 schema 應按照 API 端點/功能（例如：Get List, Update Item）進行分組，並使用註解明確標示。
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

5.  ### **單一職責**
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
    此層專門處理來自後端 API 的原始資料結構，通常是 `snake_case`，並允許 `optional` 和 `nullable` 欄位，以反映後端可能的資料不完整性。

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
    當使用 `vee-validate`{.vue} 這類表單管理庫時，若 `Zod Schema` 包含 `.transform`{.info} (例如：`camelToSnake` 或欄位重命名)，會產生表單內部狀態 (camelCase) 與提交結果 (snake_case) 不一致的「大腦分裂」現象，雖然直接使用 `payload` 也不會發生問題，但為了系統的可預測與維護性並保持職責清晰，我們規定採用分離 Schema的模式 將驗證用的 `Schema` 與 `payload` 分離：

    `...FormSchema`：一個純粹的、沒有 .transform 的 schema，專門用於 useForm 的 validationSchema 選項，負責 UI 層的即時驗證。

    `...Payload`：一個基於 FormSchema 並帶有 .transform 的 schema，專門用於在 handleSubmit 回呼函式中，將表單值轉換為最終發送到 API 的格式。

## 範例

::: code-group
```ts [category.schema.ts]
import { camelToSnake, snakeToCamel } from '@/utils/zod';
import { z } from 'zod';

// =================================================================
// 1. 核心 SSoT (Core SSoT)
// =================================================================
export const CategorySchema = z.object({
    id: z.number().int().positive(),
    title: z.string().min(1, '分類標題為必填'),
    sort: z.number().int(),
    parentId: z.number().int().default(0),
    isEnabled: z.boolean().default(true)
});

export type Category = z.infer<typeof CategorySchema>;

// =================================================================
// API: Get Category List
// =================================================================

// [-] Outgoing: 請求參數
export const GetCategoryListParams = z
    .object({
        isEnabled: z.coerce.boolean().optional(),
        search: z.string().optional(),
        page: z.coerce.number().int().positive().default(1)
    })
    .transform(camelToSnake);

// [-] Incoming: API 回應
const CategoryListItemRawSchema = z.object({
    id: z.number(),
    title: z.string(),
    sort: z.number(),
    parent_id: z.number(),
    is_enabled: z.boolean()
});

export const GetCategoryListParser = z.array(CategoryListItemRawSchema)
    .transform(snakeToCamel)
    .pipe(z.array(CategorySchema));

// [-] Types
export type GetCategoryListInput = z.input<typeof GetCategoryListParams>;
export type GetCategoryListOutput = z.output<typeof GetCategoryListParser>;

// =================================================================
// API: Update Category
// =================================================================

// [-] Outgoing: 請求體
export const UpdateCategoryPayload = CategorySchema.pick({
    id: true,
    title: true,
    sort: true,
    isEnabled: true
}).transform(camelToSnake);

// [-] Incoming: API 回應
const UpdateCategoryRawSchema = CategoryListItemRawSchema; // 假設更新後回傳的 Raw 結構與列表項相同
export const UpdateCategoryParser = UpdateCategoryRawSchema
    .transform(snakeToCamel)
    .pipe(CategorySchema);

// [-] Types
export type UpdateCategoryInput = z.input<typeof UpdateCategoryPayload>;
export type UpdateCategoryOutput = z.output<typeof UpdateCategoryParser>;
```
```ts [answerCategory.schema.ts]
import { z } from 'zod';
import { CategorySchema } from './category.schema';

// [P] 核心 Schema (SSoT)
// 衍生自 CategorySchema，並擴充 UI 相關狀態
export const AnswerCategorySchema = CategorySchema
    .pick({ id: true, title: true })
    .extend({
        isChecked: z.boolean().default(false)
    });

export type AnswerCategory = z.infer<typeof AnswerCategorySchema>;

// 如果 AnswerCategory 需要獨立的 API 進行 CRUD，
// 則可依此類推建立其 Params, Payload, Parser。
// 命名規則為：{Action}AnswerCategory{Suffix}
```
:::

## 總結

| 層級 | 職責 | 命名範例 | TS 型別範例 |
| :--- | :--- | :--- | :--- |
| **Entity** | **核心 SSoT** | `CategorySchema` | `Category` |
| **API** | **`GET` 請求參數** | `GetCategoryListParams` | `GetCategoryListInput`|
| **API** | **`POST`/`PUT` 請求體** | `UpdateCategoryPayload` | `UpdateCategoryInput`|
| **API** | **解析後端的回應** | `GetCategoryListParser` | `GetCategoryListOutput` |
