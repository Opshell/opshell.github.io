---
name: web-blog-post
description: 在這個部落格寫文章——pnpm new-post 產骨架後搬到對的分類、frontmatter 每個欄位的意思、isPublished 才會出現在時間軸／標籤／側欄／sitemap、categories 只放一個、圖片放 public/images/article、新分類要在 config.mts 加側欄 key、站台自訂的 markdown 語法。寫新文章、改 frontmatter、設公開、整理標籤時用。
---

# 寫文章

## 新文章

```bash
pnpm new-post "文章標題"
```

會在 `docs/pages/article/` 根目錄建 `<slug>.md`（標題轉小寫、非英數中文的字元換成 `-`）。
**建好要搬到對的分類資料夾**，因為側欄是按資料夾掃的：

```
docs/pages/article/
├── code-sea/          ← 技術：css/ developer/ git/ html/ javascript/ typescript/ vitepress/ vue/
├── design/            ← 設計系統、token
├── life-murmurs/      ← 生活雜記（搜尋排除）
├── poe/               ← 遊戲
└── portfolio/         ← 作品、competition/
```

系列文用檔名排序：`stage-0-前言.md`、`stage.1 …`、`day01-preface.md`。檔名可以有中文與空格（既有的很多），但新的建議用 `-`。

## frontmatter

```yaml
---
title: 文章標題                 # 側欄、分頁標籤、時間軸都用這個；不寫會退回檔名
image: /images/article/xxx.jpg  # 文章頂部的橫幅與卡片縮圖；沒有就 ''
description: 一兩句摘要          # 卡片摘要與 <meta>；不寫會自動從內文截 108 字
keywords: ''
author: Opshell
createdAt: '2026-09-22'         # 引號、YYYY-MM-DD；時間軸按它排序
categories:
  - TypeScript                  # 只放一個（add-frontmatter.mjs 會截成一個）
tags:
  - TypeScript                  # 可以多個；標籤列與右側 Topics 用它
  - 鐵人賽
editLink: true
isPublished: false              # true 才是「已發布」
---
```

- **`isPublished: true` 的效果**：進 `siteData.posts`（時間軸、標籤列、右側「已發布文章」計數）、進側欄、進 sitemap（`changefreq` 預設 yearly、`priority` 0.6，可在 frontmatter `sitemap:` 覆寫）。
  `false` 的文章直接打網址還是看得到，只是沒有入口，計數在「填坑中」。
- `tags:` 不要留 `- null` 或空項（既有的有一些是 `add-frontmatter` 補的殘留）；沒有標籤就整個欄位留空。
- `categories` 目前用得最多的是 `未分類`、`typescript-thirty-days`、`vitepress-thirty-days`、`使用實例`、`Git`、`portfolio`。新文章盡量對到既有的，不要再生新分類。
- 沒有 `layout`：文章一律用自製的文章版型（`articleLayout.vue`），不要設 `layout: doc`。
- 整批修 frontmatter 有腳本：`pnpm add-frontmatter`（補齊欄位）、`pnpm fix-tags`、`pnpm fix-empty-frontmatter`、`pnpm fix-createdAt`。
  `add-frontmatter.mjs` 裡的 `ROOT` 寫死成 Windows 路徑，在 Mac 跑之前要先改。

## 圖片

- 放 `docs/public/images/article/`，內文 `![說明](/images/article/檔名.jpg)`。橫幅也是同一個位置。
- 大圖轉 webp；內文圖片點了會放大（`medium-zoom`，`theme/index.ts`）。
- 不要放進 `docs/pages/` 底下的資料夾，那裡只有 md。

## 站台自訂的 markdown（`config.mts` 的 `markdown.config`）

| 寫法 | 效果 |
|---|---|
| `-\|文字\|-` | `<span class="mark">` 螢光標記 |
| `[ ] 事項`、`[x] 事項` 開頭的行 | 可勾選的清單（`.task-list`） |
| `::: quote 作者` … `:::` | 引言區塊，作者在上方 |
| `::: sandbox` … `:::` | Sandpack 可執行範例（`vitepress-plugin-sandpack`） |
| `::: info`／`tip`／`warning`／`danger`／`details` | 標籤已中文化：細節、💡 錦囊、⚡ 注意、⛔ 錯誤、詳細資料 |
| `{.class}` 在元素後 | `markdown-it-attrs` 加屬性 |
| 程式碼區塊 | 主題 `one-dark-pro`、有行號；語言標 `vue-ts` 不支援，會退回純文字 |

`markdown-it-footnote` 與 `@mdit/plugin-tasklist` 有裝但**沒有掛進 `config.mts`**，`[^1]` 腳註不會渲染；清單是上面那條手寫的規則在處理。
全形空格在 md 裡不會被 lint 擋。`.vue` 元件可以直接在 md 裡用（`<script setup>` import 之後）。

## 新分類要做的事

1. `docs/pages/article/<分類>/` 建資料夾。
2. `config.mts` 的 `themeConfig.sidebar` 加一個 key：`'/article/<分類>/': [{ text: '顯示名', items: await getSidebar('/article/<分類>') }]`。
3. 要進頂部選單的話改 `theme/configs/nav.ts`（連結指到該分類的第一篇）。
4. 不想被搜尋到的加進 `configs/search.ts` 的 `ignorePath`。

## 發布

1. `isPublished: true`。
2. `pnpm docs:build`，再 `pnpm docs:preview` 看文章頁、時間軸、側欄有沒有出現。
3. commit：`docs(article): 標題設為公開` 或 `docs(article): 新增〈標題〉`。
4. 要上線就 cherry-pick 到 `main` 再 push（`CLAUDE.md` 第 3 節）。

## 主題與設計 token

- 全站 token 在 `docs/.vitepress/theme/scss/_variable.scss`（顏色 `--color-*`、字級 `--font-size-*`、曲線 `--cubic-*`、斷點）。
  `_vitepress.scss` 覆蓋 VitePress 的 `--vp-c-*`，`_basic.scss` 是全站基礎樣式，`_md.scss` 目前沒有 `@use` 進來。
- `docs/features/design-system/README.md` 是一份把 token 改成語意化命名的**提案**，未採用也未進版控；現行以 `_variable.scss` 為準，不要照提案的名稱寫。
- `/design-system` 頁面（`features/design-system/`）展示色票、字級、圖示、曲線；加了新 token 記得補上去。
- 改主題 SCSS 前先 `pnpm exec stylelint <檔案>` 看一下現況，`_default.scss` 有幾十個既有的 `no-duplicate-selectors`、`rgba` 問題，別在自己的 commit 裡順手全修。
