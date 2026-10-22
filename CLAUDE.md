# opshell.github.io（Opshell's Blog ＋ 叮咚記帳官網）

VitePress 1.6 的部落格：Vue 3.5、TypeScript、SCSS、pnpm。網址 `https://opshell.github.io`，
設了自訂網域，實際一律轉到 `https://opshell.me`。叮咚記帳（DinDon）的宣傳頁、後台、隱私權政策、
刪除帳號頁都掛在 `/dindon/` 底下。

這個倉庫有兩個小精靈，**各在自己的 Flowsker AI 辦公室，不混在一起**。新對話的第一句話講清楚是哪一個；沒講就是 Blog 部落格小精靈。

| 角色 | 負責 | 辦公室 | 權杖 | 開發記錄 |
|---|---|---|---|---|
| **Blog 部落格小精靈** | 部落格本身：文章、主題、攝影集、履歷、星系、`/dindon/` 以外的頁面 | 「Blog」 | `~/WWW/opshell.github.io/secrets/flowsker_token.env` 的 `Blog=` | 這個倉庫的 `docs/devlog/` |
| DinDon 網頁小精靈 | `/dindon/` 底下五頁（skill `web-dindon`） | 「DinDon」（`office_id: 2`） | `~/WWW/DinDon/secrets/flowsker_token.env` 的 `Web=` | 叮咚工作區 `docs/devlog/web/web_開發記錄.md` |

Blog 部落格小精靈不接叮咚的單；部落格的事要叮咚的人做（或反過來），開空橋單（`"office_id": null`，`to` 寫對方名字）。
小精靈之間的規矩照 skill `flowsker` 第 5 節。所有說明、進度更新一律用繁體中文。

## 1. 開工先做

1. 用 skill `flowsker` 查你那間辦公室：權杖照上表讀進變數（只用 `sed`，值不能出現在對話裡），`GET /v1/me` 的 `agent_token.office_id` 就是你的辦公室。
   寫給你、或寫給整間辦公室（`to` 是 `null`）還沒結的單，照 skill 第 5 節處理，並回報你現在在做的事，連同角色名當對話名稱 `title`
   （「Blog 部落格小精靈」或「DinDon 網頁小精靈」）。叮咚的 `board.md` 2026-10-14 起停用，不要再寫。
2. 查完照 skill 的 `收單.md` 用背景 Bash 跑 `watch.py --once`：有新單、新回覆（含 Gemini 查驗的），或使用者在網頁上按了
   「合」「部署」「退回」，它就結束並叫醒你，處理完再開下一個；閒置超過使用者在 Flowsker 設的時間（預設 30 分鐘）它自己停並印
   「已自動停止收單」，**看到這行不要自己重開**，使用者說「開始收單」再開；使用者說「停止收單」就不再開。
3. `git status`：工作樹常有使用者未提交的草稿，**只 add 自己改的檔案**。

**使用者在對話裡交代要動手的事**，先把原話一字不改貼進你那份開發記錄（上表），再開一張寫給自己的單
（帶 `"user_requested": true`，skill 第 5 節）：跟使用者在網頁上開的一樣有階段，「合」「退回」由使用者在網頁上按；
開完先分流（skill 的 `大方向.md`），一次好幾件的拆細項、開子代理。只是問答、不會 commit 的不用開。
碰到 skill 沒寫到的情況，照 skill 第 5 節回 `## 工作流缺口` 並開單給「Workspace 小精靈」（在 Flowsker 辦公室，送 `"office_id": null` 走空橋）。

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

- **每件工作從 `main` 開自己的分支**，在 worktree 裡做，worktree 一律放 `~/WWW/opshell-wt/<名稱>`
  （`git worktree add ~/WWW/opshell-wt/<名稱> -b <分支> main`）：辦公室靠路徑認人，「Blog」登記的是這個倉庫與 `~/WWW/opshell-wt`，
  放別的地方收集程式就認不出你在哪間。主目錄停在哪條分支不一定。合完就 `git worktree remove` 收掉、刪分支。做完回 `## 驗收摘要`（附分支），**等使用者在網頁上按「合」才併進 `main`、push**，照 skill `flowsker` 的 `驗收.md`。
  `main` 是會上線的分支，不直接在上面 commit（2026-10-22 起，取代 09-22 的「只有 `main` 一支」）。
- 部署是 GitHub Actions（`.github/workflows/deploy.yml`）：push 到 `main` 就跑 lint → typecheck → build → 上線，紅了不會部署。
- commit 訊息 `type(scope): 中文一句話`。叮咚的 scope 是 `dindon`（`feat(dindon):`、`fix(dindon):`、`chore(dindon):`），
  文章是 `docs(article):`，主題是 `fix(theme):`、`feat(gallery):`、`feat(galaxy):`。
- 提交前 `git status`，**只 add 自己改的檔案**，不要 `git add -A`。

## 4. 指令

| 指令 | 做什麼 |
|---|---|
| `pnpm docs:dev` | 開發伺服器，port 8086，會自動開瀏覽器。叮咚頁面加 `?api=http://localhost:8090` 改打本機後端 |
| `pnpm docs:build` | 正式建置，約 30 秒 |
| `pnpm docs:preview` | 用建置結果起伺服器。要看網址行為（結尾斜線、404、SSR 輸出）用這個，dev 模式在無頭瀏覽器裡是空白的 |
| `pnpm dindon:privacy` | 從 App 的 `privacy_policy.md` 重新產生 `/dindon/privacy/`（[[web-dindon]]） |
| `pnpm new-post "標題"` | 新文章骨架（[[web-blog-post]]） |
| `pnpm check` | **改完必跑**：lint → stylelint → typecheck → test → build，CI 跑的就是這五個 |
| `pnpm lint`／`pnpm lint:fix` | ESLint 10 ＋ antfu 9，全倉庫要 0 error 0 warning。文章的 md 不 lint（`ignores`） |
| `pnpm lint:style`／`pnpm lint:style:fix` | stylelint 17，`docs/**/*.{scss,vue}` |
| `pnpm typecheck` | `vue-tsc --noEmit`。VitePress 內部元件的 import 由 `tsconfig` 的 `paths` 指到 `docs/types/shims/`，不進去檢查 |
| `pnpm test`／`pnpm test:watch` | Vitest 3（不是 5：5 要 Vite 6，VitePress 1.6 還在 Vite 5）。只測純邏輯，`*.test.ts` 放在被測檔案旁邊 |

Node 24、pnpm 10.28（`packageManager` 鎖住）。`ignoreDeadLinks: true`，壞連結不會讓建置失敗，要自己點。
測試只寫純邏輯：Zod 解析（`utils/zod.ts`、文章 frontmatter、叮咚後台）與演示疊層的時間計算。
新寫的測試先把被測的程式故意改壞，確認測試會紅，再改回來。

## 5. 頁面怎麼組

一個 `.md` 只負責掛元件；邏輯、樣式、文案都在 `features/`。細節見 [[web-page-and-feature]]。

- `layout` frontmatter：不寫＝文章版型（`articleLayout.vue`，有 TOC、系列側欄、留言）；`page`／`doc`／`home`＝VitePress 預設版型；
  `design-system` 是設計系統專用。`class:` 會掛到 `.Layout` 上，每一頁用它當樣式範圍。
- `isPublished: true` 是「這是一篇文章」的定義：會進時間軸、標籤列、側欄、sitemap。宣傳頁、政策頁這種**不是文章**的頁面不要設。
- 沒開 `cleanUrls`：`dindon/index.md` 的網址是 `/dindon/`，**連結一定帶結尾斜線**，`/dindon` 會 404。
- 會碰 `window`、Google 登入、three.js 的元件包 `<ClientOnly>` 或用 `defineClientComponent`；SSR 會執行 `<script setup>`。

## 6. 程式風格

**通用規則以〈前端開發規範〉為準**：`docs/pages/article/code-sea/developer/前端開發規範.md`（公開網址 `/article/code-sea/developer/前端開發規範.html`）。
這個倉庫適用核心四章＋條件章「五、Zod 資料層」，沒有 TanStack、router、Pinia、vee-validate。規則只寫在那裡，這裡不抄；
本倉庫的做法與例外在 [[web-code-style]]。最常踩的：4 空格、`.vue` 的 `<script>` 與 `<style>` 內容再多縮一層、單引號、有分號、
**沒有尾逗號**、型別不加前綴、`.vue` 檔名 PascalCase、BEM 的 `__元素`／`--規格`／`is-狀態`、不加 `scoped`、註解用中文寫「為什麼」。

## 7. 叮咚記帳的部分

全部細節在 [[web-dindon]]。硬規則：

- 介面以 `DinDon_BackEnd/docs/api.md` 為準，只有後端改。`features/dindon/dashboard/api.ts` 是照著接的，型別旁邊註明第幾節。
- 這是公開的靜態網站，**沒有也不能有任何祕密**。Google client ID 本來就是公開的；權限全靠後端驗 token。
- 隱私權政策頁是產生出來的：改內容要改 App 的原稿再跑 `pnpm dindon:privacy`，**不能直接改 `docs/pages/dindon/privacy/index.md`**。
- 後台 `/dindon/dashboard/` 設 `noindex`、不進 nav、不載入第三方腳本。瀏覽計數（自家後端，`features/visitor/`）也不記後台與帳號頁（`path.ts` 的 `SKIP_PREFIXES`）。
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
| `web-dindon` | 碰 `/dindon/` 底下任何東西、接後端、同步政策、上線 |
| `web-blog-post` | 寫新文章、改 frontmatter、設公開、文章圖片、側欄分類 |

`flowsker`（辦公室、收單、分流、驗收）與 Matt Pocock 的 engineering skill（`to-spec`、`to-tickets`、`code-review`、`tdd`…）裝在家目錄
`~/.claude/skills/`，每個對話都有。後者用到 issue tracker 與領域文件時，讀叮咚工作區的 `docs/agents/issue-tracker.md` 與 `docs/agents/domain.md`。
