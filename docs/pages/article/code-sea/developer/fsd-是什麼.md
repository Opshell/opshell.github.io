---
title: 'FSD 是什麼？Feature-Sliced Design 與以功能為主軸的架構'
image: ''
description: '專案變大之後，按技術類型分資料夾會變成義大利麵。拆解 Feature-Sliced Design 的 Layers、Slices、Segments 與 Public API，對比較寬鬆的 Feature-based 結構，最後談 Vue 專案該不該用。'
keywords: ''
author: 'Opshell'
createdAt: 2025-12-24
categories:
  - Project Structure
tags:
  - 架構
  - FSD
  - Vue
  - Project Structure
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把貼上的 AI 回答整理成文章（恢復段落與表格、補上資料夾與 Public API 範例），論點都保留。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
在 `Vue` 的生態圈裡，我們最習慣的是「按技術類型分類」（Technical Splitting）：所有元件放 `components`，所有 Store 放 `stores`。但專案一變大，這種架構就會變成義大利麵，改一個功能要在五個資料夾之間跳來跳去。這時候常會聽到兩個名詞：Feature-Sliced Design（FSD）和以功能為主軸的架構（Feature-based）。這篇用批判性的角度把兩者拆開來看，寫給開始在意架構與可維護性、而不只是「寫出能動的程式碼」的前端。
:::

## 懶人包
- **FSD** 是一套標準化的前端架構方法論，不是套件，而是「嚴格的資料夾結構規範」加上「依賴規則」，目標是專案爆炸性成長時仍然低耦合、高內聚。
- FSD 把專案切成三個維度：**Layers**（層級，單向依賴）→ **Slices**（業務領域）→ **Segments**（技術用途），每個 Slice 只能透過 `index.ts` 對外。
- **Feature-based** 是比較直覺、寬鬆的版本：照功能模組分資料夾，規則靠約定；FSD 則是它的「軍事化管理版」。
- 沒有銀彈：FSD 適合大型、多人協作的專案；十幾頁的小專案用它，會覺得自己在造火箭去買菜。
- 中型 `Vue` 專案可以先試「Loose FSD」：引入層級概念、保持單向依賴，但不強制 Slice 完全隔離。

## 技術拆解

### 一、Feature-Sliced Design（FSD）
想像你在切一塊蛋糕，FSD 把專案切成三個維度。

#### 1. Layers（層級）：最外層
這是 FSD 最嚴格的地方，規定了**單向依賴**：上層可以引用下層，下層絕對不能引用上層。由上到下通常分為七層（有些專案會簡化）：

| Layer | 放什麼 | 例子 |
| :--- | :--- | :--- |
| `app` | 應用程式入口、全域樣式、Provider | `Pinia`、`Router` 的初始化 |
| `processes`（可選） | 跨頁面的複雜流程 | 結帳流程、驗證流程 |
| `pages` | 路由對應的頁面，只負責組裝 Widgets，不寫複雜邏輯 | `ProductPage` |
| `widgets` | 獨立的 UI 區塊，包含業務邏輯與 API 呼叫 | `Header`、`Feed`、`UserProfileCard` |
| `features` | **關鍵層級**，具體的使用者功能，偏互動邏輯 | 按讚、加入購物車、切換主題 |
| `entities` | 業務實體，只放最純粹的展示元件和 Model | `User`、`Product`、`Order` |
| `shared` | 共用基礎建設，不能包含任何業務邏輯 | UI Kit、utils、API client |

::: tip
FSD 官方文件已經把 `processes` 列為不建議使用，跨頁流程多半改放在 `features` 或 `pages` 處理。細節以 FSD 官方文件為準。
:::

#### 2. Slices（切片）：中間層
在每一層裡面，再依「業務領域」切分。例如 `entities` 層裡會有 `user`、`product`、`cart`，每一個資料夾就是一個 Slice。

規則：**同一層的 Slice 之間不能互相引用**（cross-import forbidden）。

::: danger
`user` Slice 不應該去 import `product` Slice 的東西。如果有這種需求，應該在更上層（例如 Widget 或 Page）進行組合。
:::

#### 3. Segments（片段）：最內層
在每個 Slice 裡面，再依技術用途分類：

- `ui`：Vue 元件
- `model`：Pinia store、composables
- `api`：請求函式
- `lib`：工具函式

#### 關鍵概念：Public API
FSD 要求每個 Slice 都要有一個 `index.ts` 當入口。外部只能引用 `index.ts` 暴露出來的東西，不能直接深入內部引用 `user/ui/UserCard.vue`。這就是封裝。

### 二、以 Feature 為主軸（Feature-based／Modular Architecture）
這通常指的是 Feature-Based Structure 或 Modular Architecture。它比 FSD 寬鬆許多，是很多 `Vue` 開發者從義大利麵轉型到模組化的第一步。

核心概念是：不依照技術類型（`components`、`views`）分類，而是依照「功能模組」分類。

```text
src/
  modules/
    user/           <-- 這就是一個 Feature 模組
      components/   <-- 專屬 User 的元件
      composables/  <-- 專屬 User 的邏輯
      api.ts
      store.ts
    cart/
      components/
      store.ts
  shared/           <-- 共用元件
    components/
```

::: info 跟 FSD 的差異
Feature-based 是一種「直覺」的分類方式，把相關的東西放一起。FSD 則是 Feature-based 的「軍事化管理版本」，加上了嚴格的層級和依賴規則。
:::

### 三、批判性思考：身為 Vuer，你需要 FSD 嗎？
**批判性思考**{.brand} 告訴我們：沒有銀彈（Silver Bullet）。

**FSD 的優點**
- **重構安全**：依賴是單向的，改 `shared` 或 `entities` 你知道影響範圍；改 `pages`，你知道不會搞壞其他頁面。
- **新人上手**：新來的工程師不用讀完整個專案，只要看他負責的 Slice。
- **解決循環依賴**：大型 `Vue` 專案最頭痛的問題之一（Store A 引用 Store B，Store B 又引用 Store A），FSD 的層級結構從物理上杜絕了這件事。

**FSD 的缺點**
- **檔案碎片化**：一個簡單的「顯示使用者頭像」，可能要拆成 `entities/user/ui/Avatar`（展示）、`features/update-avatar`（上傳邏輯）、`widgets/header/UserMenu`（組合）。
- **過度設計**：只有 10～20 頁的專案，FSD 的資料夾結構會讓你覺得自己在造火箭去買菜。
- **跟 Vue 的習慣衝突**：`Vue`（特別是 `Nuxt`）習慣 auto-import 和彈性的結構，FSD 強調顯式引用和 `index.ts` 封裝，開發體驗上有時候會卡卡的。

## 例子與對比

### 一個 FSD 的 Vue 專案長這樣
```text
src/
  app/
    main.ts
    router.ts
    styles/
  pages/
    product-detail/
      ui/ProductDetailPage.vue
      index.ts
  widgets/
    product-card-list/
      ui/ProductCardList.vue
      index.ts
  features/
    add-to-cart/
      ui/AddToCartButton.vue
      model/useAddToCart.ts
      index.ts
  entities/
    product/
      ui/ProductCard.vue
      model/types.ts
      api/getProducts.ts
      index.ts
  shared/
    ui/BaseButton.vue
    api/httpClient.ts
```

### Public API 的寫法
```ts
// entities/product/index.ts：只暴露外面需要的東西
export { default as ProductCard } from './ui/ProductCard.vue';
export type { Product } from './model/types';
export { getProducts } from './api/getProducts';
```

```ts
// widgets/product-card-list/ui/ProductCardList.vue 的 <script setup lang="ts"> 裡
// ✅ 從 Public API 引用
import { getProducts, ProductCard } from '@/entities/product';
// ❌ 不要直接伸手進別人的內部：
// import ProductCard from '@/entities/product/ui/ProductCard.vue';
```

規則光靠口頭約定很容易破功，可以用 `ESLint` 的 `no-restricted-imports`，或是 FSD 社群的 `Steiger` 這類檢查工具，把「不准深層引用」「不准往上引用」變成紅線。

### 比一比

| 特性 | Feature-based（一般模組化） | Feature-Sliced Design（FSD） |
| :--- | :--- | :--- |
| 結構 | 只有 Feature 一層，內部自由 | Layers → Slices → Segments |
| 依賴規則 | 通常沒有強制，靠約定 | 嚴格單向依賴，禁止循環引用 |
| 複雜度 | 低，容易上手 | 高，樣板程式碼（Boilerplate）多 |
| 適用專案 | 中小型專案 | 大型、超大型、多人協作專案 |
| 學習曲線 | 平緩 | 陡峭（新人會不知道程式碼該放哪層） |

### 我的建議：先試 Loose FSD
如果你的專案符合下面幾點：

- `Vue 3` + `Vite` + `Pinia`（加上 `Quasar` 之類的 UI 框架）
- 多人協作（3 人以上）
- 頁面超過 30 頁
- 常常覺得「改一個東西會壞另一個地方」

可以先嘗試 **Loose FSD**（鬆散的 FSD）：

1. **引入 Layers 概念**：先區分 `shared`（共用）、`entities`（業務資料）、`features`（業務操作）、`pages`（頁面）四層就好。
2. **不強制 Slice 隔離**：允許一些 cross-import，但保持大方向的單向依賴。
3. **用路徑別名強化層級感**：設定 `@shared`、`@entities` 這類 alias，一看 import 就知道是從哪一層來的。

```ts
// vite.config.ts
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
            '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
            '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
            '@pages': fileURLToPath(new URL('./src/pages', import.meta.url))
        }
    }
});
```

記得 `tsconfig.json` 的 `paths` 也要設一樣的別名，型別提示才跟得上。

## 結論
FSD 不是什麼神奇的魔法，它只是把「好的架構該有的規矩」寫成一本手冊：分層、單向依賴、封裝。專案夠大、人夠多，這本手冊能救命；專案很小，它就是一本很厚的說明書。

所以先問自己：現在的痛點是什麼？如果答案是「改一個地方壞三個地方」，那就從 Loose FSD 開始；如果答案是「沒什麼痛」，那就先別急著搬家 ~~（搬家很累的，相信我）~~。
