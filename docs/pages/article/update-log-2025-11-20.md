---
title: 專案更新紀錄 2025-11-20
date: 2025-11-20
tags: [專案維護, 更新紀錄]
category: 專案日誌
---

# 專案更新紀錄 2025-11-20

這篇筆記記錄了本次專案維護的內容，包含套件更新、程式碼審查 (Code Review) 以及 Bug 修復。

## 1. 套件更新 (Package Updates)

專案相依套件已更新至最新版本 (部分套件因 Node.js 版本相容性問題保留在舊版)。

主要更新內容：

- **TypeScript**: 更新至 `5.9.3`
- **ESLint**: 更新至 `9.39.1`
- **Stylelint**: 更新至 `16.25.0`
- **Vue**: 更新至 `^3.5.24`
- **PostCSS**: 更新至 `8.5.6`
- **Sass**: 更新至 `1.94.2`
- **其他工具**: `globby`, `gray-matter`, `markdown-it-footnote` 等皆已更新。

**保留舊版套件 (因 Node.js 20.11.1 相容性):**

- **VitePress**: 保持 `1.3.2` (新版需要 Node >= 20.19.0)
- **Vitest**: 保持 `^2.1.2`
- **jsdom**: 保持 `^25.0.1`
- **stylelint-order**: 保持 `6.0.4`
- **unplugin-auto-import**: 保持 `0.18.2`
- **unplugin-vue-components**: 保持 `0.27.4`

## 2. 程式碼審查與 Bug 修復 (Code Review & Bug Fixes)

在更新過程中，透過 ESLint 靜態分析發現並修復了以下問題：

### 2.1. 類型安全與潛在錯誤 (Type Safety & Potential Bugs)

- **`docs/hooks/useKeyRouter.ts`**:
  - 修復了 `u.page.getter()` 的錯誤呼叫，改為正確的 `u.page.value`。
  - 修復了 `watchEffect` 中 `router.go` 返回 Promise 未被處理的問題 (加上 `void`)。
  - 修正了正規表達式中未使用的捕獲群組。

- **`docs/.vitepress/config.mts`**:
  - 解決了 `Top-level await` 的 ESLint 警告。
  - 修復了 `frontmatter` 物件屬性 (`changefreq`, `priority`) 的不安全存取問題，增加了適當的類型斷言。

- **`docs/hooks/useSiteData.ts`**:
  - 修復了 `theme.value.siteData` 的不安全存取問題，增加了類型斷言。

- **`docs/.vitepress/theme/configs/search.ts`**:
  - 修復了 `env.frontmatter.title` 的不安全存取問題。

- **`docs/.vitepress/theme/index.ts`**:
  - 修復了 `nextTick` 返回 Promise 未被處理的問題。

### 2.2. Vue 元件規範 (Vue Component Best Practices)

修復了多個 Vue 元件中 `defineProps` 的定義問題，解決了 "Prop should be optional" 的警告：

- **`docs/components/el/img.vue`**: `src` 屬性改為可選。
- **`docs/components/el/radio.vue`**: `label` 和 `val` 屬性改為可選。
- **`docs/components/el/select.vue`**: `options` 屬性改為可選。
- **`docs/components/el/svgIcon.vue`**: 移除 `name` 屬性的 `required: true` (因已有預設值)。
- **`docs/components/orga/pagination.vue`**: 分頁相關屬性改為可選。
- **`docs/components/orga/giscusComment.vue`**: 調整了屬性順序，將 `:key` 移至 `category` 之前。
- **`docs/components/el/inputBox.vue`**: 將 `!=` 比較運算子改為更嚴謹的 `!==`。

## 3. 總結

本次維護提升了專案的依賴版本，並解決了潛在的程式碼品質問題。雖然部分開發工具因 Node.js 環境限制無法升級到絕對最新版，但核心依賴已盡量保持最新，且程式碼庫通過了嚴格的 Lint 檢查 (Markdown 檔案中的程式碼片段除外)。

## 4. 建置問題修復 (Build Issues Fixes)

在執行 `yarn docs:build` 時發現並修復了以下問題：

- **SSR 錯誤 (`window is not defined`)**:
  - 修復了 `docs/components/template/tagsList.vue` 中直接在 setup 階段存取 `window` 物件的問題。將 `URLSearchParams` 的初始化移至 `onMounted` 生命週期鉤子中，確保僅在客戶端執行。

- **建置輸出雜訊 (Build Output Noise)**:
  - 移除了 `docs/.vitepress/theme/layout/expandLayout.vue` 中遺留的 `console.log(siteData)`，解決了建置過程中大量印出 `ComputedRefImpl` 物件的問題。

- **已知警告 (Known Warnings)**:
  - **Sass Deprecation**: 由於專案中使用 `@import` 語法，Dart Sass 3.0.0 將不再支援。目前顯示棄用警告，建議未來遷移至 `@use` 模組系統。
  - **Large Chunks**: 部分編譯後的檔案超過 500kB，這是 Vite 的效能提示，不影響功能。
