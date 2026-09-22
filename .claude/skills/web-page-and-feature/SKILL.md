---
name: web-page-and-feature
description: 這個網站怎麼組一個頁面——pages 的 md 只掛元件、features 的 index.ts 是唯一入口、layout 與 class frontmatter 對應哪個版型、isPublished 的意思、結尾斜線、ClientOnly 與 SSR、nav 與 sidebar 在哪改、alias 與自動 import。加頁面、加 feature、改導覽、遇到 SSR 報錯時用。
---

# 加頁面、加 feature

## 一個頁面長什麼樣

`docs/pages/dindon/account/index.md`：

```md
---
title: 刪除叮咚記帳的資料
description: 給搜尋結果與分享卡看的一句話
layout: page
class: dindon-account
sidebar: false
aside: false
# 不設 isPublished：設了會被當成文章，出現在時間軸與標籤列表
---

<script setup>
import { DinDonAccount } from '@features/dindon';
</script>

<!-- Google 登入只能在瀏覽器端跑 -->
<ClientOnly>
    <DinDonAccount />
</ClientOnly>
```

- **md 只掛元件**。文案、邏輯、樣式都在 `docs/features/<名稱>/`。
- 網址＝路徑去掉 `docs/pages/`。`config.mts` 的 `rewrites: { 'pages/(.*)': '(.*)' }`。
- **沒開 `cleanUrls`**：`x/index.md` → `/x/`，`x.md` → `/x.html`（寫連結時 `/x` 也會被補成 `.html`）。
  所以資料夾式的頁面，連結**一定帶結尾斜線**；`nav.ts` 裡每個叮咚連結旁邊都有這句註解。
- 不給搜尋引擎收的頁面（後台）在 frontmatter 加：

  ```yaml
  head:
    - - meta
      - name: robots
        content: noindex, nofollow
  ```

## `layout` 與 `class`（`theme/layout/expandLayout.vue`）

| frontmatter | 用哪個版型 | 什麼時候 |
|---|---|---|
| 不寫 `layout` | `articleLayout.vue`：自製文章版型，有 TOC、系列側欄、meta、留言、專注模式 | 部落格文章 |
| `layout: page` | VitePress 預設 `Layout`，內容區空白全交給元件 | 宣傳頁、後台、刪除頁 |
| `layout: doc` | VitePress 預設，markdown 內容套 `.vp-doc` 樣式，上面會多一列作者／日期 | 隱私權政策 |
| `layout: home` | VitePress 首頁（hero、features） | 只有 `index.md` |
| `layout: design-system` 或 `designSystem: true` | `DesignSystemLayout.vue` | 設計系統頁 |

- `class: xxx` 會掛到 `.Layout` 上，變成 `.Layout.xxx`。**每一頁用它當樣式範圍**，避免影響別頁。
- 這個網站的 `body` 是黑底，只有文章版型自己鋪了背景。用 `layout: doc` 的頁面要自己補 `.Layout.xxx { background: var(--vp-c-bg); }`，
  不然淺色模式是黑底深字（隱私權政策頁的 `<style>` 有現成的）。
- `layout: doc` 頁面不想要作者列：`.xxx .article-meta-header { display: none; }`。
- 部落格把 `<strong>` 畫成醒目標籤，一般頁面要恢復成普通粗體：`.xxx .vp-doc strong { background: none; padding: 0; color: inherit; }`。

## `isPublished` 的意思

`isPublished: true` 是「這是一篇文章」：`useBuildSiteData.ts` 會把它收進 `siteData.posts`，進時間軸、標籤列、右側 Topics、
側欄（`useGetSidebar.ts`）與 sitemap（`config.mts` 的 `transformItems`）。
**不是文章的頁面不要設**，只設 `title`、`description`、`layout`、`class`。

## 一個 feature 長什麼樣

```
docs/features/dindon/
├── index.ts              ← 唯一入口，只 export 要給頁面用的元件（與 hook）
├── constants.ts          ← 文案、網址、數字
├── apiBase.ts            ← 後端網址
├── components/           ← 對外的元件（PascalCase）
├── hooks/useXxx.ts
├── account/  dashboard/  ← 子功能各自有 api.ts、components/
```

- **只能從 `index.ts` 匯入**：`import { DinDonLanding } from '@features/dindon'`。
  `no-restricted-imports` 禁止 `@/features/*/*`。feature 內部之間用相對路徑。
- 重的、只能在瀏覽器跑的元件（three.js、TresJS）在 `index.ts` 用 `defineClientComponent(() => import('./components/xxx.vue'))` 包，
  不要靜態 import——SSR 建置時會執行它而報錯。範例：`features/tags-list/index.ts`。
- 輕的但會碰 `window` 的（Google 登入、`IntersectionObserver`）：元件正常 export，頁面那邊包 `<ClientOnly>`；
  或在元件裡把那些都放 `onMounted` 之後（`useLandingMotion.ts` 的做法：SSR 輸出完整 HTML，動態只在瀏覽器加上）。
- `features/**/*.md` 不會被當成頁面（`srcExclude`），可以放開發說明。

## 共用的東西在哪、怎麼用

| 東西 | 在哪 | 怎麼用 |
|---|---|---|
| 基本元件 | `docs/shared/components/el/*.vue` | 自動註冊，直接寫 `<ElBtn>`、`<ElTag>`、`<ElInput>`、`<ElSvgIcon name="tag" />`；不用 import。全部的示範、props 與用法在 `/design-system#components`（`features/design-system/components/Components.vue`），**加新元件要補一塊 `<DemoBlock>`** |
| SVG 圖示 | `docs/public/icons/<name>.svg` | `<ElSvgIcon name="<name>" />`（`vite-plugin-svg-icons`，symbolId 就是檔名） |
| 共用 hook／util | `docs/shared/hooks/`、`docs/shared/utils/` | 自動 import（`unplugin-auto-import`），直接用；`vue` 的 API 也自動 import，但既有程式習慣還是明寫 `import { ref } from 'vue'` |
| 文章索引 | `useSiteData()`（`@shared/hooks/useSiteData`） | 拿 `posts`、`tags`、`counts` |
| 圖片 | `docs/public/images/<功能>/` | 網址 `/images/<功能>/x.webp`，用 webp |
| 字型 | `theme/fonts/`：Roboto、NotoSansTC、FiraCode | 不加新字型 |

alias（`config.mts` 與 `tsconfig.json` 兩邊都要有）：`@`＝`docs/`、`@features`、`@shared`、`@components`、`@hooks`、`@utils`、`@data`、`@theme`、`@vitepress`、`@pages`、`@photos`。

## 分享預覽圖（Open Graph）

`config.mts` 的 `transformPageData` 給每一頁產 `og:*` 與 `twitter:*`。要指定圖就在 frontmatter 寫 `ogImage: /images/xxx.png`（1200×630），
沒寫用 `/images/og-default.jpg`。叮咚四頁用 `/images/dindon/og-share.png`。

- **換圖一定換檔名**，不要覆蓋舊檔：`opshell.me` 前面有 Cloudflare，圖片快取 4 小時，Facebook、LINE、Threads 也各自快取圖片網址。
- **部署完成前不要去 curl 新的圖片網址**：Cloudflare 會把那次的 404 快取 4 小時，之後誰抓都是 404（2026-09-22 踩過，只好改檔名）。
- 部署後到 Facebook Sharing Debugger 按「重新抓取」；LINE 的 Page Poker 網域已經停用。

## 導覽與側欄

- 頂部選單：`docs/.vitepress/theme/configs/nav.ts`。叮咚有自己一個大項（關於、隱私權政策、刪除資料與帳號），Portfolio → Side Projects 也有一項。
- 側欄：`config.mts` 的 `themeConfig.sidebar`，**每個文章分類一個 key**（`'/article/code-sea/css/'`），值用 `getSidebar('/article/code-sea/css')` 自動掃資料夾，
  只列 `isPublished: true` 的。新的文章分類要在這裡加一個 key，不然沒有側欄。
- 搜尋是本機 miniSearch（`configs/search.ts`），`ignorePath` 排除了 `life-murmurs`。
- 社群連結 `configs/socialLinks.ts`。

## 深淺色

VitePress 用 `html.dark`。元件裡用 `.dark .頂層class { … }` 覆蓋變數（`DinDonLanding.vue` 最後那段）；顏色一律用 `--vp-c-*` 或 `_variable.scss` 的 token，深淺色會自己對。
切換主題有 View Transition 動畫（`expandLayout.vue` 的 `toggle-appearance`）。

## 驗證

1. `pnpm docs:build` 要過（唯一的 CI 檢查）。
2. `pnpm docs:preview` 開建置結果看實際網址（dev 模式在無頭瀏覽器裡是空白的，別用它截圖）。
   **重建之後要重啟 preview**：它的靜態伺服器啟動時掃一次檔案清單，新 hash 的 CSS／JS 會 404、頁面就不會水合，看起來像整站壞掉（2026-09-22 踩過）。
   無頭瀏覽器用 Edge／Brave 的 `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader`（WebGL 頁要軟體算圖）；
   `--screenshot` 模式對 WebGL 頁有時不會退出，用 `--remote-debugging-port` 加一支 Node 腳本（內建 WebSocket）走 CDP 比較穩，一次只開一個實例。
3. 桌面 1440px 與手機 390px、淺色與深色各看一次；手機寬度量 `document.documentElement.scrollWidth` 不能超過視窗。
4. `ignoreDeadLinks: true`，壞連結建置不會擋，nav 與頁面裡的連結要自己點。
