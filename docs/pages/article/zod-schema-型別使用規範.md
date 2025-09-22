---
title: zod schema 型別使用規範
image:
description:
keywords:
author: 'Opshell'
version: 1.0.0
createdAt: 2025-09-22
categories:
  - '開發守則'
tags:
  - TypeScript
editLink: true
isPublished: false
---

# TypeScript 型別規範

本規範旨在建立一套以 `Zod` Schema 為核心的、清晰、可維護且易於團隊協作的 `TypeScript` 資料層撰寫標準。
核心思想是：**從 SSoT Schema 衍生出一切**
基本情況是，當資料到達 UI層要使用時，已經是經過嚴格驗證且符合 UI 需求的狀態。
不額外花成本處理他的欄位狀態。

目標是，任何開發者看到一個 Schema 的名稱，就能立刻回答以下問題：
1. 它的核心職責是什麼？（是核心模型、API Payload？）
2. 它的資料流向是怎樣的？（是流向後端，還是來自後端？）
3. 它的資料狀態是原始的還是處理過的？
---

## 設計原則
1.  ### **以 Zod 核心 Schema 為單一事實來源 (SSoT)**
    `前端`內部使用的所有業務邏輯、驗證規則和資料模型，都應定義在一份核心 Zod Schema 中。
    核心 Schema 是一切 API 型別（Parsers, Payloads）的衍生來源。

2.  ### **由內而外 (Bottom-Up)**
    巢狀 Schema 先定義最深層，逐層組合。

3.  ### **語意化命名**
    Schema 與其衍生型別的命名應能清楚表達業務實體與責任。

4.  ### **避免魔法數字**
    使用 `z.number()` 定義寫死在前端或UI使用的有意義數字時，使用 `z.enum()` 或 `z.nativeEnum()` 取代單純的數字，賦予業務語意。

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
1. ### **統一使用 PascalCase**
    - Schema：`CategorySchema`
    - 型別：`type Category = z.infer<typeof CategorySchema>`

2. ### **後綴規則**
    - `...`：該 Schema.infer 的核心型別結構
    - `...Schema`：核心實體 (SSoT)
    - `...Payload`：API 請求（送出給後端，通常轉換成 `snake_case`）
    - `...Parser`：API 回應解析器（從 Raw → camelCase → 驗證 → 核心 Schema）
    - `...RawSchema`：後端原始回應結構（snake_case，允許 optional/nullable) 通常只用來衍生 `...Parser`
    - `...Input`：該 Schema.input 的輸入型別，通常是Payload 的輸入狀態
    - `...Output`：該 Schema.output 的輸出型別，通常是Parser 的輸出狀態

## 檔案結構
```
src/
  ├─ features/{featureName}/
  │   ├─ {featureName}.schema.ts
  │   └─ {context}{featureName}.schema.ts
  ├─ types/
  │   ├─ common.ts // 共用 interface 或 type（非 Zod）。
  │   └─ globals.d.ts // 全域環境變數與型別工具。
  └─ utils/
      └─ zod.ts //Zod 相關工具。
```
1.  **`src/features/{featureName}/{featureName}.schema.ts`**
    * **用途**：**最重要的檔案**。定義與特定功能模組相關的所有 Zod Schema，包括核心 Schema (SSoT)、Parsers 和 Payloads。
    * **原則**：每個功能模組都應該有自己的 `schema.ts` 檔案來管理其資料契約。
    * **衍生**：根據模組需求，衍生出來的Schema，需另開檔案管理，請參考下方範例的 `AnswerCategory.Schema.ts`。

2.  **`src/types/common.ts`**
    * **用途**：定義**可被多個功能模組共用**的、**非 Zod**{.info} 的 `interface`{.info} 或 `type`{.info}。
    * **放置內容範例**：`ImageData` (圖片資訊), `Pagination` (分頁結構)。

3.  **`src/utils/zod.ts`**
    * **用途**：放置與 Zod 相關的全域輔助函式。
    * **放置內容**：`parseWithSchema`, `snakeToCamel`, `camelToSnake`。

4.  **`src/types/globals.d.ts`**
    * **用途**：定義**無需 `import`** 的全域環境變數或擴充型別。
    * **放置內容**：Vite 環境變數 (`__TITLE__`)，泛用工具型別 (`PartialBy`)。

## 衍生與組合原則
流程
1. ### 核心 Schema (SSoT)
    定義 camelCase + 嚴格驗證規則。
2. ### Payload
    .pick() / .omit() → .transform(camelToSnake)
3. ### Parser
    定義 RawSchema → .transform(snakeToCamel) → .pipe(CoreSchema)
4. ### 型別輸出
    z.input / z.output
5. ### 單一職責
    不同情境需求 → 新 Schema，而不是在同一個 Schema 加過多條件。

## 注意事項
- RawSchema 可寬鬆，但 Parser 必須嚴格。
- Schema 命名用 PascalCase，欄位用 camelCase。

## 操作細則&說明
1. ### **核心實體層 (Entity Layer) - *Schema**
    這是我們系統的基石，前端世界裡的 **單一事實來源 (SSoT)**{.brand}。

    * **職責：**
        定義應用程式中最核心、最純粹的資料模型(bluePrint)。它應該是 名稱為 `PascalCase`，欄位用 `camelCase`。
        且符合前端最理想(帶有UIUX 控制)的使用形態，檢驗條件應該是最嚴苛的，在不同情境下會有其他衍生態，到時候在調整檢驗條件。

    * **命名：{EntityName}Schema**

    * **範例：**
        - TopicOptionSchema
        - TopicSchema
        - CategorySchema
        - AuditFormTypeSchema
        - AuditFormSchema

2. ### **API 互動層 (API Layer) - *Payload & *Parser**
    這一層專門處理與後端 API 溝通時的資料形狀。職責非常明確：將前端資料校驗、打包 與 將後端資料校驗、解包，用於 POST, PUT, PATCH等情況，並產生API 使用時的 input 與 output type。

    * **Payload**
        前往後端的酬載 (Outgoing Payloads)
        * **職責：**
            定義發送給後端（POST, PUT, PATCH）的請求體的形狀。從核心實體中 pick 欄位，並 transform 成 snake_case。

        * **命名：** {Action}{EntityName}Payload
        * **範例：**
            - CreateCategoryPayload
            - UpdateCategoryPayload
            - SaveCategoryTopicsPayload

        * **型別：**
            命名：{Action}{EntityName}Input (在repository、Service 或 業務層 使用時 輸入參數的型別)
        * **範例：**
            ```ts
            export type CreateCategoryInput = z.input<typeof CreateCategoryPayload>;
            ```

    * **Parser**
        來自後端的回應 (RawSchema & Parser)
        * **職責：**
            驗證並解析從後端 請求回來的原始資料(`RawSchema`)，並將其轉換(`Parser`)成符合我們核心實體 (*Schema) 的形狀。

        * **命名：**
            - {Action}{EntityName}RawSchema
            - {Action}{EntityName}Parser
        * **範例：**
            - CreateCategoryRawSchema
            - CreateCategoryParser
            ```ts
            // [-] Category 的原始 API 資料形狀
            const CategoryRawSchema = z.object({
                id: z.number(),
                title: z.string(),
                sort: z.number().nullable()
            });
            // CategoryParser 的內部實現
            export const CreateCategoryParser = CreateCategoryRawSchema
                .transform(snakeToCamel())
                .pipe(CategorySchema); // 核心已經定義了 CategorySchema 這個 SSoT
            ```
        * **型別：**
            命名：{Action}{EntityName}Input (在repository、Service 或 業務層 使用時 輸入參數的型別)
        * **範例：**
            ```ts
            export type CreateCategoryInput = z.input<typeof CreateCategoryPayload>;
            ```

## 範例
::: code-group
```ts [Category.Schema.ts]
import { camelToSnake, snakeToCamel } from '@utils/zod';
import { z } from 'zod';

// [P] 核心 Schema (SSoT)
export const CategorySchema = z.object({
    id: z.number(),
    title: z.string().min(1, '分類標題為必填'),
    sort: z.number(),
    parentId: z.number().optional().default(0)
});
export type Category = z.infer<typeof CategorySchema>;

// [P] Payload (送出 API 請求)
export const UpdateCategoryPayload = CategorySchema
    .pick({ id: true, title: true, sort: true })
    .transform(camelToSnake);
export type UpdateCategoryInput = z.input<typeof UpdateCategoryPayload>;

// [P] Parser (解析 API 回應)
const UpdateCategoryRawSchema = z.object({
    id: z.number(),
    title: z.string().nullable(),
    sort: z.number(),
    parentId: z.number().optional()
});

export const UpdateCategoryParser = CategoryRawSchema
    .transform(snakeToCamel)
    .pipe(CategorySchema);
export type CategoryOuput = z.output<typeof CategoryParser>;
```
```ts [AnswerCategory.Schema.ts]
// [P] 核心 Schema (SSoT)
export const AnswerCategorySchema = CategorySchema
    .pick({ id: true, title: true })
    .extend({
        isChecked: z.boolean().default(false)
    });
export type AnswerCategory = z.infer<typeof AnswerCategorySchema>;

// AnswerCategory 的Payload 與 Parser 也可以依此類推建立
// 命名規則為：{Action}{context}{EntityName}Payload / {Action}{context}{EntityName}Parser 同基礎規則
```
:::

## 總結
| 層級 | 職責 | 命名範例 | TS 型別範例 |
| :--- | :--- | :--- | :--- |
| Entity | 核心 SSoT | CategorySchema | Category |
| API | 送往後端的酬載 | UpateCategoryPayload | UpateCategoryInput|
| API | 解析後端的回應 | UpateCategoryParser | UpateCategoryOutput |
