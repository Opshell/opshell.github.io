# opshell.github.io（Opshell's Blog ＋ 叮咚記帳官網）

VitePress 1.3 的部落格：Vue 3.5、TypeScript、SCSS、pnpm。網址 `https://opshell.github.io`，
設了自訂網域，實際一律轉到 `https://opshell.me`。叮咚記帳（DinDon）的宣傳頁、後台、隱私權政策、
刪除帳號頁都掛在 `/dindon/` 底下。

網頁 Claude 負責這個倉庫。叮咚的部分要跟前端、後端、上架三個小精靈協作，溝通板在工作區根目錄的
`coordination/board.md`（規則見 `coordination/README.md`，skill `cross-repo-handoff`）。
所有說明、進度更新一律用繁體中文。

## 1. 開工先做

1. 讀 `coordination/board.md`（工作區 `DinDon/` 根目錄），有沒有指名給「網頁 Claude」的單。
2. `git status`、`git branch --show-current`：工作樹常有別人的半成品，分支通常是 `develop_galaxy_tags`（第 3 節）。

## 2. 目錄

| 路徑 | 內容 |
|---|---|
| `docs/pages/` | 頁面。`rewrites` 把 `pages/` 這段拿掉，所以 `docs/pages/dindon/index.md` 的網址是 `/dindon/`。文章在 `pages/article/<分類>/…` |
| `docs/features/<名稱>/` | 功能模組：`components/`、`hooks/`、`constants.ts`、`api.ts`、`index.ts`。**只能從 `index.ts` 匯入**（`@features/dindon`），直接引用內部檔案是 ESLint 錯誤 |
| `docs/shared/` | 跨功能共用：`components/el/`（自動註冊成 `<ElBtn>`、`<ElSvgIcon>`）、`hooks/`、`utils/`（兩個都自動 import）、`data/` |
| `docs/.vitepress/config.mts` | 站台設定：sidebar、alias、markdown 外掛、`siteData`（文章索引） |
| `docs/.vitepress/theme/` | 主題：`index.ts`、`layout/`、`configs/nav.ts`、`scss/`（`_variable.scss` 是設計 token，`mixin.scss` 全域自動 `@use`） |
| `docs/public/` | 靜態檔：`images/dindon/*.webp`、`images/article/`、`icons/*.svg`（svg sprite） |
| `docs/types/` | 自動產生的 `.d.ts`，不手改 |
| `scripts/` | Node 腳本，對應 `package.json` 的 scripts |
| `photos/` | 攝影集。照片放 R2，只有 `data.json` 進版控 |

alias：`@`＝`docs/`、`@features`、`@shared`、`@components`、`@hooks`、`@utils`、`@data`、`@theme`、`@vitepress`、`@pages`、`@photos`。

## 3. 分支與部署

- 只有一個工作樹，長期待在 **`develop_galaxy_tags`**（3D 星系文章頁、HUD 這些長期開發都在這裡）。
- 部署是 GitHub Actions（`.github/workflows/deploy.yml`），**push 到 `main` 才會建置上線**。
- 做法：在 `develop_galaxy_tags` commit，要上線的 commit **cherry-pick 到 `main`** 再 push。`main` 的 reflog 全部是 cherry-pick，
  兩邊叮咚的檔案內容完全一致、只有 hash 不同。**不要 merge、不要 rebase** 這兩支分支。步驟在 [[web-dindon]]。
- commit 訊息 `type(scope): 中文一句話`。叮咚的 scope 是 `dindon`（`feat(dindon):`、`fix(dindon):`、`chore(dindon):`），
  文章是 `docs(article):`，主題是 `fix(theme):`、`feat(gallery):`、`feat(galaxy):`。
- 提交前 `git status`，**只 add 自己改的檔案**，不要 `git add -A`。

## 4. 指令

| 指令 | 做什麼 |
|---|---|
| `pnpm docs:dev` | 開發伺服器，port 8086，會自動開瀏覽器。叮咚頁面加 `?api=http://localhost:8090` 改打本機後端 |
| `pnpm docs:build` | 正式建置，約 30 秒。**改完必跑**，CI 也只跑這個 |
| `pnpm docs:preview` | 用建置結果起伺服器。要看網址行為（結尾斜線、404、SSR 輸出）用這個，dev 模式在無頭瀏覽器裡是空白的 |
| `pnpm dindon:privacy` | 從 App 的 `privacy_policy.md` 重新產生 `/dindon/privacy/`（[[web-dindon]]） |
| `pnpm new-post "標題"` | 新文章骨架（[[web-blog-post]]） |
| `pnpm exec stylelint <改到的檔案>` | 樣式檢查。**不要跑 `pnpm lint:style`**：它會 `--fix` 整個倉庫，主題 SCSS 有 57 個舊問題會一起混進你的 commit |
| `pnpm lint` | **目前壞掉**（2026-09-22 確認）：`eslint.config.js` 的 `import/no-restricted-paths` 與 `import/no-cycle` 在 antfu 6.x 換用的 import 外掛裡不存在，ESLint 讀設定就報錯。修法是拿掉那兩條（前者指向不存在的 `src/features/UIKit`，本來就沒作用）。修好前照 [[web-code-style]] 自己對 |

Node 24、pnpm 10.28（`packageManager` 鎖住）。`ignoreDeadLinks: true`，壞連結不會讓建置失敗，要自己點。
沒有測試：`vitest` 裝了但 `__test__/` 不存在，不要建議加測試框架。

## 5. 頁面怎麼組

一個 `.md` 只負責掛元件；邏輯、樣式、文案都在 `features/`。細節見 [[web-page-and-feature]]。

- `layout` frontmatter：不寫＝文章版型（`articleLayout.vue`，有 TOC、系列側欄、留言）；`page`／`doc`／`home`＝VitePress 預設版型；
  `design-system` 是設計系統專用。`class:` 會掛到 `.Layout` 上，每一頁用它當樣式範圍。
- `isPublished: true` 是「這是一篇文章」的定義：會進時間軸、標籤列、側欄、sitemap。宣傳頁、政策頁這種**不是文章**的頁面不要設。
- 沒開 `cleanUrls`：`dindon/index.md` 的網址是 `/dindon/`，**連結一定帶結尾斜線**，`/dindon` 會 404。
- 會碰 `window`、Google 登入、three.js 的元件包 `<ClientOnly>` 或用 `defineClientComponent`；SSR 會執行 `<script setup>`。

## 6. 程式風格

從 `eslint.config.js`、`.stylelintrc.mjs` 與既有程式歸納，全文在 [[web-code-style]]。最常踩的：
4 空格、`.vue` 的 `<script>` 與 `<style>` 內容再多縮一層、單引號、有分號、**沒有尾逗號**、
interface 用 `i` 前綴（`iProps`、`iPoint`）、class 用 `區塊__元素` 加 `is-狀態`、
`<style lang="scss">` 不加 `scoped` 而是整段包在頂層 class 裡、CSS 屬性照 stylelint-order 的順序、註解用中文寫「為什麼」。

## 7. 叮咚記帳的部分

全部細節在 [[web-dindon]]。硬規則：

- 介面以 `DinDon_BackEnd/docs/api.md` 為準，只有後端改。`features/dindon/dashboard/api.ts` 是照著接的，型別旁邊註明第幾節。
- 這是公開的靜態網站，**沒有也不能有任何祕密**。Google client ID 本來就是公開的；權限全靠後端驗 token。
- 隱私權政策頁是產生出來的：改內容要改 App 的原稿再跑 `pnpm dindon:privacy`，**不能直接改 `docs/pages/dindon/privacy/index.md`**。
- 後台 `/dindon/dashboard/` 設 `noindex`、不進 nav、不載入第三方腳本（`theme/index.ts` 的 `NO_THIRD_PARTY_PATHS`）。
- 宣傳頁配色照 App 的 Sicily 色票，平面風格：沒有描邊、高光、漣漪。
- 文案裡的數字（封測名額、獎勵）在 `features/dindon/constants.ts`，要跟 App 與 Play 對得上；改了要開單通知前端／上架。

## 8. 部落格的部分

寫文章、改主題見 [[web-blog-post]]。`docs/features/design-system/README.md` 是一份 token 改名的**提案**（未採用、未進版控），
現行 token 以 `_variable.scss` 為準。

## 9. Skill

`.claude/skills/` 四個都是這個倉庫自己的做法，碰到對應的事就載（工作區根目錄有捷徑，開場就在）：

| skill | 什麼時候 |
|---|---|
| `web-page-and-feature` | 加頁面、加 feature、改 nav 或 sidebar、版型、alias、SSR 報錯 |
| `web-code-style` | 寫或改任何 `.vue`、`.ts`、`.scss` |
| `web-dindon` | 碰 `/dindon/` 底下任何東西、接後端、同步政策、cherry-pick 上線 |
| `web-blog-post` | 寫新文章、改 frontmatter、設公開、文章圖片、側欄分類 |
