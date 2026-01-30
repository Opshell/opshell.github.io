---
title: FSD 是什麼?
image:
description:
keywords:
author: 'Opshell'
createdAt: 2025-12-24
categories:
  - '未分類'
tags:
  -
editLink: true
isPublished: false
---

#
這是一個非常好的問題，這代表你開始關注架構設計與可維護性，而不僅僅是寫出能動的程式碼。在 Vue 的生態圈中，我們最習慣的是「Technical Splitting (按技術類型分類)」，也就是把所有的 Component 放 components 資料夾，所有的 Store 放 stores 資料夾。但隨著專案變大，這種架構會變成「義大利麵」，你改一個功能要在五個資料夾之間跳來跳去。這時候，Feature-Sliced Design (FSD) 和 Feature-Driven Architecture (以功能為主軸) 就派上用場了。讓我們用批判性的角度來拆解這兩者。1. Feature-Sliced Design (FSD)Feature-Sliced Design (FSD) 是一套標準化的前端架構方法論。它的核心目的是讓專案在面對「爆炸性增長」時，依然保持低耦合、高內聚。它不是一個 Library，而是一套「嚴格的資料夾結構規範」與「依賴規則」。FSD 的三層結構 (Hierarchy)想像你在切一塊蛋糕，FSD 把專案切成三個維度：1. Layers (層級) - 最外層這是 FSD 最嚴格的地方，規定了單向依賴流。上層可以引用下層，但下層絕對不能引用上層。由上到下通常分為七層（有些專案會簡化）：app: 應用程式的入口，包含全域樣式、Provider (Pinia, Router setup) 等。能引用所有下層。processes (可選): 跨頁面的複雜流程（如：結帳流程、驗證流程）。pages: 路由對應的頁面 (Route View)。這裡只負責組裝 Widgets，不寫複雜邏輯。widgets: 獨立的 UI 區塊 (例如：Header, Feed, UserProfileCard)。包含業務邏輯與 API 呼叫的完整區塊。features: 關鍵層級。具體的使用者功能 (例如：按讚、加入購物車、切換主題)。為了重用性，Feature 不應該包含太多 UI，更多是互動邏輯。entities: 業務實體 (例如：User, Product, Order)。這裡只放該實體最純粹的 UI (展示型元件) 和 Model (Interface)。shared: 共用的基礎建設 (UI Kit, utils, api client)。這裡不能包含任何業務邏輯。2. Slices (切片) - 中間層在每一層 (Layer) 裡面，我們會根據「業務領域」來切分。例如在 entities 層裡面，會有 user、product、cart 這些資料夾。每一個資料夾就是一個 Slice。規則：Slice 之間不能互相引用 (Cross-import forbidden)。::: dangerUser Slice 不應該去 import Product Slice 的東西。如果有這種需求，應該要在更上層 (如 Widget 或 Page) 進行組合。:::3. Segments (片段) - 最內層在每個 Slice 裡面，根據技術用途分類：ui (Vue components)model (Pinia stores, composables)api (Axios requests)lib (Utils)關鍵概念：Public APIFSD 強制要求每個 Slice 必須有一個 index.ts 作為入口。外部只能引用 index.ts 暴露出來的東西，不能直接深入內部引用 user/ui/UserCard.vue。這就是封裝。2. 以 Feature 為主軸 (Feature-Driven / Modular Architecture)這通常指的是 Feature-Based Structure 或 Modular Architecture。它比 FSD 寬鬆許多，是許多 Vue 開發者從「義大利麵」轉型到「模組化」的第一步。核心概念它不依照技術類型 (components/views) 分類，而是依照「功能模組」分類。檔案結構範例：src/
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
與 FSD 的差異::: infoFeature-based 是一種「直覺」的分類方式，想把相關的東西放一起。FSD 則是 Feature-based 的「軍事化管理版本」，加上了嚴格的層級 (Layers) 和依賴規則。:::特性Feature-based (一般模組化)Feature-Sliced Design (FSD)結構只有 Feature 一層，內部自由Layers -> Slices -> Segments依賴規則通常沒有強制，靠約定嚴格單向依賴，禁止循環引用複雜度低，容易上手高，Boilerplate (樣板代碼) 多適用專案中小型專案大型、超大型、多人協作專案學習曲線平緩陡峭 (新進人員會不知道程式碼該放哪層)3. 批判性思考：身為 Vuer，你需要用 FSD 嗎？批判性思考{.brand} 告訴我們，沒有銀彈 (Silver Bullet)。FSD 的優點 (Why you might want it)Refactoring Safety：因為依賴是單向的，更改 shared 或 entities 層的東西，你知道影響範圍；更改 pages 層，你知道這不會搞壞其他頁面。Onboarding：新來的工程師不需要讀完整個專案，只需要看他負責的 Slice。解決循環依賴：這是大型 Vue 專案最頭痛的問題 (Store A 引用 Store B，Store B 又引用 Store A)。FSD 的層級結構從物理上杜絕了這件事。FSD 的缺點 (Why you might hate it)檔案碎片化：一個簡單的「顯示使用者頭像」，在 FSD 可能要拆成 entities/user/ui/Avatar (展示)、features/user/update-avatar (上傳邏輯)、widgets/header/UserMenu (組合)。過度設計：對於只有 10-20 個頁面的專案，FSD 的資料夾結構會讓你覺得自己在造火箭去買菜。Vue 的特性衝突：Vue (特別是 Nuxt) 習慣 Auto-import 和靈活的結構，FSD 強調顯式引用 (Explicit Import) 和 index.ts 封裝，這有時候在開發體驗上會有點卡。我的建議如果你現在的專案：Vue3 + Vite + Pinia + Quasar多人協作 (3人以上)頁面超過 30 頁感覺改一個東西會壞另一個地方你可以先嘗試 "Loose FSD" (鬆散的 FSD)：引入 Layers 概念：區分 shared (共用)、entities (業務資料)、features (業務操作)、pages (頁面)。不強制 Slices 隔離：允許一些 cross-import，但保持大方向的單向依賴。利用 Quasar/Vite 的 Alias：設定 @shared, @entities 等路徑別名，強化層級感。接下來我可以為你做的如果你對這種架構有興趣，我可以幫你規劃一個 基於 Quasar + TypeScript 的 FSD 初始資料夾結構範例，包含 tsconfig.json 的路徑別名設定，讓你看看如果在你的技術堆疊中實作會長什麼樣子。你需要嗎？