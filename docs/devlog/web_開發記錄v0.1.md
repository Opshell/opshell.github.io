# 網站開發記錄 v0.1

網頁 Claude 與使用者的對話記錄。每一輪補一節：日期加主題、起因（使用者的問題原話或大意）、做了什麼、留給之後的、有沒有 commit／上線。
使用者沒把問題寫進來的，由網頁 Claude 補。這個資料夾在 `config.mts` 的 `srcExclude` 裡，不會被建成頁面。

---

# 2026-09-22 晚上：官網倉庫補 CLAUDE.md 與四個 web skill

## 起因

**使用者**：HI 晚安，你是網頁（Web）小精靈，專門管 `DinDon_Web` 這個捷徑目錄的。通常我只會請你做和 DinDon 這個專案有關係的工作，
但是偶爾會處理一下部落格的事宜。這個部落格還沒有 CLAUDE.md 和相關的設定，但是網站的 coding 風格應該可以看出來，
幫我處理一下，寫一下 CLAUDE.md、做一下 skill 好嗎？

## 做了什麼

把整個倉庫摸過一遍（`package.json`、`config.mts`、主題、features、scripts、eslint 與 stylelint 設定、git 歷史），然後寫了：

- `CLAUDE.md`：技術棧、目錄與 alias、分支與部署、指令表、頁面組法、風格摘要、叮咚硬規則、skill 表。
- `.claude/skills/web-page-and-feature`：md 只掛元件、`index.ts` 唯一入口、`layout`／`class` 對到哪個版型、`isPublished` 的意思、結尾斜線、SSR。
- `.claude/skills/web-code-style`：從 lint 設定與既有元件歸納的 TS、Vue、SCSS、class 命名、註解慣例。
- `.claude/skills/web-dindon`：四頁的檔案地圖、`api.md` 為準、`?api=` 覆寫、token 只放記憶體、政策改原稿、cherry-pick 上線步驟、何時開單。
- `.claude/skills/web-blog-post`：`new-post` 後要搬分類、frontmatter 欄位、圖片位置、新分類要加 sidebar key、站台自訂 markdown。

工作區根目錄 `.claude/skills/` 補了四個捷徑，開了溝通板 #0054（僅通知）請目錄小精靈改根目錄 `CLAUDE.md` 那句「官網目前還沒有」。

## 摸倉庫時發現的

- **部署流程**：只有一個工作樹、一直待在 `develop_galaxy_tags`，`main` 的 reflog 全部是 cherry-pick，push `main` 才會上線。
- **`pnpm lint` 跑不起來**：`eslint.config.js` 的 `import/no-restricted-paths` 與 `import/no-cycle` 在 antfu 6.x 換用的 import 外掛裡不存在，
  ESLint 讀設定就報錯；前者指向不存在的 `src/features/UIKit`。沒動，等使用者決定。
- **stylelint** 對叮咚的元件是乾淨的，57 個錯全在主題的舊 SCSS（`_default.scss` 重複的 `:root`、`rgba`）。
- `docs/features/design-system/README.md` 是一份 token 改名的提案（未採用、未進版控）。
- `markdown-it-footnote`、`@mdit/plugin-tasklist` 有裝但沒掛進 `config.mts`。

## commit

- 官網 `develop_galaxy_tags`：`7013307` docs: 加 CLAUDE.md 與四個 web skill
- 工作區：`5f0c7b4` 板：#0054

---

# 2026-09-22 深夜：#0053 後台批次審回報；開始寫這份記錄

## 起因

**使用者**：好，你接著做（#0053）。另外我在 docs 目錄裡開了 devlog，以後我們的對話就記錄進去；如果我沒有把我的問題打在裡面你幫我補，
然後也要記錄你的結果。0053 做完之後 commit、push 到 main。我想要請你到 `develop_galaxy_tags` 分支，試著完成我未完成的功能，完善這個 side project。

**溝通板 #0053（後端 → 網頁）**：使用者問「有人狂送垃圾回報，總不能我一則一則人工審」。後端加了 `POST /v1/admin/feedback/batch`
（勾選的幾則，或某台裝置還在待審的全部，一次改狀態；一次最多 200 則；依裝置的只動 `pending`），計分規則多一條
「同一台裝置在同一個問題裡只有最早那則算分」。請網頁做：勾選多則一鍵不採計、「這台的待審全部不採計」（凍結分開按）、
同一台的相似回報摺起來（純前端）、`FeedbackPanel.vue` 的計分說明更新。後端回覆 1：已部署 revision `dindon-backend-00023-9xz`。

## 做了什麼

- `dashboard/api.ts`：加 `batchReviewFeedback`（`report_ids` 或 `device_id` 擇一，加 `status`，回 `{ updated }`）。
- `FeedbackPanel.vue`：
  - 表格加勾選欄（表頭可勾本頁全部）；勾了才出現批次列：選狀態（預設不採計）→「套用…」→ 確認一次才送。送完重抓列表、統計、問題件數，正在看的那一則也重抓。
  - 「同一台的摺起來」開關，預設開：同一 `device_id` 收成一組（只看本頁 50 則，順序照後端「新的在前」、第一次出現的裝置在前），
    群組列顯示「本頁 N 則，M 則待審」，可整組勾、點了展開；只有一則的不摺。群組列上有「這台的待審全部不採計…」，要確認。
  - 單則側欄多一張「這台裝置」卡：「這台的待審全部不採計…」與「凍結這台裝置…」兩顆分開的按鈕、各自確認。凍結打 `updateDevice`，解凍要到裝置分頁。
  - 檔頭註解與「跟哪一則是同一件事？」的說明補上「同一個人在同一個問題裡只算最早那一則」。
- `DeviceDetail.vue`：凍結那張卡上面加一張「回報」卡，同一顆「這台的待審全部不採計…」，確認後才送。
- `config.mts`：`srcExclude` 加 `devlog/**`，這份記錄不會變成公開頁面。

## 驗證

- `pnpm docs:build` 通過（約 28 秒）、兩個元件 stylelint 乾淨。
- 對正式後端打 `POST /v1/admin/feedback/batch` 不帶身分 → 401，`OPTIONS` 預檢（Origin `opshell.me`）→ 204：路由在、CORS 通。
  這也補上了後端記錄裡「部署後沒驗完」的第 3 項。
- **沒做的**：後台要 Google 登入，無頭瀏覽器進不去，所以實際勾選、批次送出、摺疊展開沒有在畫面上操作過。
  使用者上線後請在後台按一遍；有問題回這裡。

## 留給之後的

- 摺疊只看本頁（50 則）；同一台跨頁的不會合在一起。要跨頁得請後端出「依裝置彙總」的端點。
- 批次列的「改成」目前四種狀態都能選；如果實務上只會用「不採計」，可以收成一顆按鈕。
- 快速審核（`FeedbackTriage.vue`）沒加批次，它本來就是一則一則判的模式。

## commit／上線

- 官網 `develop_galaxy_tags`：`7b3cdff` feat(dindon): 後台回報可以勾選批次審、同一台的摺起來、一鍵把整台的待審不採計
- 這份記錄另外一個 commit。兩個都 cherry-pick 到 `main` 推上，GitHub Actions 建置後上線。

---

# 2026-09-22 清晨：3D 星系頁——完成 Esc 解鎖與鍵盤操作，修好 HUD 沒資料的問題

## 起因

**使用者**（接在 #0053 後面）：我想要請你到 `develop_galaxy_tags` 分支，試著完成我未完成的功能，完善這個 side project。
（`resource/待改事項.md` 只有一條：「Galaxy：esc 跳出鎖定」；commit e21c69e 寫著「相機重置與聚焦（未完成）」。）

**使用者**：我覺得做的很好ㄟ，那可以幫他加鍵盤控制事件嗎？不然鎖定之後要點選資料不是很方便，滑鼠沒進 HUD 之前看不到。

## 發現的問題（都在 galaxyBack.vue，除了運鏡那條）

1. `useSiteData()` 回傳的是 **computed ref**，galaxyBack 直接用 `siteData.tags`／`siteData.posts`（沒 `.value`）。
   模板上 `:siteData="siteData"` 會自動解包所以 3D 正常，但 script 裡的四個 computed 全是空的：右側能量矩陣沒東西、鎖定後 ORBITAL NETWORK 清單沒東西、關聯星球不會亮。
2. 右側分頁的條件 `displayNodeInfo.type === '文章行星'` 永遠不成立（type 是 `'文章行星 (DATA_NODE)'`）。
3. 從右側清單點文章傳的是 `{ id }`，lockedTarget 沒有名稱與座標：HUD 標題空白、`focusOnNode` 找得到 mesh 但 `node.val` 是 undefined。
4. 飛到一半按重置（或點另一顆）：focus 的 GSAP tween 沒被殺掉、跟 reset 的 tween 搶相機；而且 focus 一開始把 OrbitControls `enabled = false`，它的 onComplete 不會再跑，控制器永遠關著。
5. 右側 GALAXY ENERGY MATRIX 有兩份（SvgHudPanel 版與 HudPanel 版，試 SVG 面板時留下的）。

## 做了什麼

- 上面五項都修了；`GalaxyModel` 多 expose `findNode(id)`，並用 `cameraTween` 記住正在跑的運鏡、新運鏡與 reset 先殺掉它、reset 把控制器打開。
- **Esc** 解除鎖定、飛回全景（跟點背景、ABORT 同一件事）。
- **鍵盤操作**：↑↓ 選 ORBITAL NETWORK 的文章、↵ 飛過去、←→ 換標籤（行星才有）、O 開啟文章、C 複製座標、H 收放面板、R 對準（鎖定時）／重置、Esc 解除。
  鎖定後預設選第一篇，所以鎖定完直接按 ↵ 就能一路往下飛；滑鼠移過清單也會同步選中。方向鍵與 ↵ 只在鎖定時攔截，沒鎖定交還瀏覽器。
  提示列在 COMMAND TERMINAL 下面，依狀態只列用得到的鍵。
- 複製座標後按鈕變「COORDINATES COPIED ✓」1.5 秒。
- 沒用站上的 `useKeyBoardControl` hook：它的 removeEventListener 傳的是新的箭頭函式、永遠移不掉，策略表又是模組層級的全域，跨頁會殘留。這一頁自己管監聽。

## 驗證

- `pnpm docs:build` 過；stylelint 錯誤數與改前相同（都是既有的）。
- 無頭 Edge（swiftshader）走 CDP 實際操作：HUD 3 秒出現、能量矩陣 6 列、面板 1 個；點到恆星「composable」進入 LOCKED，清單預設選第一篇，
  按 ↵ 飛到「Day28 - Quick keys」且仍鎖定（HUD 標題正確，證明 findNode 有效），按 Esc 回到 SYSTEM_IDLE、Esc 提示消失。
- 踩到的坑：`vitepress preview` 的靜態伺服器啟動時掃一次檔案，重建之後新 hash 的資產 404、頁面不水合，看起來像整站壞掉；
  `pkill -f 'vitepress preview'` 殺不到（命令列是 `vitepress.js preview`），要用 `lsof -ti :4173`。CDP 模式 `--window-size` 無效，要 `Emulation.setDeviceMetricsOverride`。都寫進 skill 了。
- 沒驗到的：←→ 換標籤（掃到的是恆星，沒有分頁）、O／C／H／R 四個鍵（程式很直接，靠審視）。

## 留給之後的

- 星系的改動**沒有挑到 `main`**：`main` 上的星系頁是二月的舊版，這條線一直留在 `develop_galaxy_tags`，要不要上線由使用者決定（挑的話 `galaxyBack.vue` 會衝突，要手動合）。
- `resource/待改事項.md`（未進版控）那條「esc 跳出鎖定」可以劃掉。
- `docs/pages/article/portfolio/side-project/flowscker/` 是未進版控的另一個專案的文件，裡面有 `CLAUDE.md` 與 `.claude/settings.local.json`；放在 `docs/pages/` 底下建置時會變成公開頁面，要留的話建議搬出 `pages/`。
- 用不到的 `svgHudPanel_back*.vue`、`costomHudPanel.vue` 沒動：設計系統頁拿它們並排比較三個版本。

## commit

- 官網 `develop_galaxy_tags`：`9b7e131` feat(galaxy): 鍵盤操作、Esc 解除鎖定，並修好 HUD 拿不到站台資料的問題
- 這份記錄另外一筆，挑到 `main`。

---

# 2026-09-22 上午：規範文章評估、整理待辦、套件更新建議表

## 起因

**使用者**：待改事項你幫我刪掉吧。所以現在 galaxy posts 已經推到 main 部署了是嗎？另外專案的目錄結構和框架風格的演進應該看 git 可以蠻清晰的認知？
也看看 `zod-schema-型別使用規範.md` 這支檔案他寫的如何，是我前陣子寫專案的架構和想法。現在大神們的架構又是如何？也看看目前專案的架構。我們來把部落格整理的更有規範、開發起來更得心應手？

**使用者**：那先把這 6 件事記成待辦清單。我們先來釐清另外一件事：我們用的套件已經很久很久沒更新了，底層框架也是，檢查一下，列出更新建議表。

## 結論摘要

- `resource/待改事項.md` 刪了（未進版控）。
- **星系頁沒有上線**：`main` 上完全沒有星系頁（頁面、元件、three／TresJS 相依都沒有），線上 `/galaxy-posts.html` 是 404。之前說「main 上是二月舊版」是錯的。建議把 `develop_galaxy_tags` merge 進 `main` 一次（`develop` 包含 `main` 全部內容，反向差異只有 `resource/` 舊檔），之後只維護一支。
- 目錄演進從 git 看得清楚：2024-08 建站 → 2024-11／12 兩次調目錄 → 2025-12 FBA → 2026-01 FSD 變體＋自製文章版型 → 2026-02 攝影集、標籤熱圖、星系 → 2026-09 叮咚。
- 規範文章：Zod 五後綴的資料流分層、Form／Payload 分離、組件化 BEM、依功能分 region 都是好的；問題是版本混雜（2.0／3.0／3.4.2／4.0）、SFC 結構寫三遍、貼了 AI 對話、筆誤（`z.iutput`、`SearchCategoryFormSchema`、`Servie`）、缺 parse 失敗處理與 query key 歸屬。對照主流：FSD 官方多 `entities`／`widgets` 層與 `steiger` 檢查、Zod 4 的 `z.codec` 可以取代 Parser＋Payload 兩份 schema、TanStack Query v5 用 `queryOptions()` 工廠管 key、`vue-tsc` 進 CI。
- 專案現況對照規範：features 沒有一個有 `schemas/`，叮咚 `api.ts` 手寫 normalize、型別留 snake_case（刻意對照 `api.md`）；`zod` 沒裝但 `shared/utils/zod.ts` 存在；元件檔名 camel／Pascal 混用；`tsconfig` 與 `config.mts` 有不存在的 `widgets/`、`entities/`；死碼與根目錄 build log；ESLint 壞、沒 `vue-tsc`、CI 只 build；cherry-pick 讓「做完」與「上線」脫節。
- 六件整理事項寫進 `docs/devlog/待辦.md`。

## 套件更新建議表（2026-09-22 用 `pnpm outdated` 與 npm dist-tags 查的）

底層：專案的 Vite 是 VitePress 帶進來的 **Vite 5**（VitePress 1.x 綁 `vite ^5.4`）。VitePress 2.0 還在 alpha（`2.0.0-alpha.20`，綁 Vite 8、Vue ≥3.5.41）。Node 24 是 LTS，不用動；Node 26 要到 2026-10 才轉 LTS。

| 套件 | 現在 | 最新 | 建議 | 說明 |
|---|---|---|---|---|
| **vitepress** | 1.3.2 | 1.6.4（2.0 alpha.20） | 升 1.6.4 | 同一個 Vite 5 大版，風險低；1.4～1.6 的 changelog 要掃一遍（sitemap、本機搜尋、`lastUpdated` 有變）。2.0 等 stable |
| **vue** | 3.5.24 | 3.5.43 | 升 | 補丁版 |
| three ＋ @types/three | 0.182 | 0.186 | 升，跑星系頁驗 | three 每個小版都會改 API |
| @tresjs/core、cientos | 5.4／5.3 | 5.9 | 升 | peer `three >=0.133`、`vue >=3.4` |
| @tresjs/post-processing、postprocessing | 3.3／6.38 | 3.8／6.39 | 升 | 小版 |
| gsap、axios、globby、sharp、postcss | 小版落後 | | 一起升 | 小版 |
| sass | 1.94 | 1.104 | 升 | 專案已用 `@use`、`sass:map`，沒有舊語法 |
| @vueuse/core | 14.1 | 15.0 | 升 | 大版但用得少（`useScroll`、auto-import 的 `useMouse`），peer `vue ^3.5` |
| **eslint** | 9.39 | 10.11（9.39.5 維護版） | 配合待辦 1 升 10 | ESLint 10 只剩 flat config（本專案已是）；Node ≥20.19 |
| **@antfu/eslint-config** | 6.2 | 9.5 | 同上一起升 | peer `eslint ^9.10 || ^10`；升的時候順手刪兩條死的 `import/*` 規則、重新對一次 stylistic 設定 |
| **stylelint 全家** | 16.25／16／1／6 | 17.15／17／2／8.1 | 一起升 | stylelint、config-standard-scss、config-standard-vue、stylelint-order、postcss-html 2 要同一批；主題 SCSS 那 57 個既有錯誤會變動 |
| **unplugin-auto-import** | 0.18 | 21.1 | 升 | 版號跳是改成每次發版升大版；peer 只有 `vue ^3`、Node ≥20.19；產生的 `auto-imports.d.ts` 會重生 |
| **unplugin-vue-components** | 0.27 | 32.1 | 升 | 同上 |
| **typescript** | 5.9.3 | 7.0.2（2026-07） | **先留 5.9，或升 6.x** | 7.0 是 Go 原生編譯器；`vue-tsc` 3.3 只宣告 `typescript >=5`，實際支援與 typescript-eslint 的相容要確認再上 |
| vitest、@vitest/ui | 2.1 | 5.0 | **先移除** | 專案沒有任何測試（`__test__/` 不存在），vitest 5 又要 Vite ≥6、跟 VitePress 1.x 的 Vite 5 對不上。要寫測試那天再裝 |
| jsdom、@vue/test-utils、@pinia/testing | | | 一起移除 | 只服務 vitest；`pinia` 本身根本沒裝 |
| markdown-it-footnote、@mdit/plugin-tasklist | | | 移除 | 有裝沒掛進 `config.mts` |
| @types/markdown-it-container | 2.0 | 4.0 | 升 | 對齊 markdown-it-container 4 |
| vite-plugin-svg-icons | 2.0.1 | 2.0.1（2022） | 留，列風險 | 停更；升 VitePress 2／Vite 8 時可能要換（`unplugin-icons` 或自組 sprite） |
| vitepress-plugin-sandpack | 1.1.4 | 1.1.4 | 留，列風險 | 停更；同上 |
| medium-zoom、@giscus/vue、exifr、gray-matter、d3-force-3d | 已最新 | | 不動 | |
| pnpm | 10.28 | 12.5 | 可選 | `packageManager` 與 CI 的 `pnpm/action-setup` 要一起改 |
| Node | 24.13 | 26.9 | 不動 | 24 是 LTS |

**建議分四波**：
0. 先移除沒用到的（vitest 五件、footnote、tasklist），少掉一堆過期警告。
1. 小版與同大版的一次升（vue、vitepress 1.6.4、three／tres、sass、gsap、axios…），`docs:build` 過、星系頁與叮咚後台各看一眼。
2. 工具鏈大版，跟待辦 1 一起做：eslint 10＋antfu 9、stylelint 17 全家、unplugin ×2、TypeScript 留 5.9 或 6.x、加 `vue-tsc`。
3. 等：VitePress 2.0 stable（Vite 8）。到時處理兩個停更外掛。

## commit

- `docs/devlog/待辦.md` 新增、這一節。只在 `develop_galaxy_tags`，分支怎麼收等使用者決定後再一起上 `main`。

---

# 2026-09-22 白天：整理待辦第 1～5 步一路做完

## 起因

**使用者**：那這四波和原本的待辦整合成執行順序。星系頁還是半成品，先上沒關係嗎？
**使用者**：檔名統一 PascalCase，具體是哪種類型的檔案呢？
**使用者**：好，一路做到第五件事做完，每完成一件事就 commit 一次。

## 做了什麼（每步一個 commit，都在 `main`）

| 步 | commit | 內容 |
|---|---|---|
| 1 | `e11a5b9`、`c148388` | 導覽列標 beta；`develop_galaxy_tags` merge 進 `main`（三個衝突檔都取 develop 版），之後只維護 `main`。線上 `/galaxy-posts.html` 從 404 變成有頁 |
| 2a | `4a4b0bf` | 移除 vitest 五件、markdown-it-footnote、@mdit/plugin-tasklist；config.mts 的 test 區塊 |
| 2b | `69869df` | 刪兩個舊版型、三個 HUD 備份、zod.ts、四個 build log；tsconfig／config.mts 拿掉不存在的 widgets、entities；.gitignore 加 .DS_Store；flowscker 搬到 resource/。**保留** api-examples.md、markdown-theme-preview.md（鐵人賽文章連到）與 resource/ 的草稿 |
| 3 | `48e4ff4` | ESLint 10 ＋ antfu 9、stylelint 17、unplugin 21／32、vue-tsc；三個工具全倉庫清零；scripts 加 check／lint／lint:style／typecheck；CI 加 Lint、Typecheck |
| 4 | `e899ec9` | VitePress 1.6.4、Vue 3.5.43、three 0.186、TresJS 5.9、sass、gsap、axios、@vueuse/core 15 等；TresJS 的 position／scale 改 Vector3 常數 |
| 5 | `9ede835` | 44 個 .vue 改 PascalCase，17 個引用檔跟著改 |

## 過程中的判斷

- **antfu 預設 vs 倉庫寫法**：關掉 `antfu/if-newline`、`antfu/top-level-function`、`vue/singleline-html-element-content-newline`、`vue/custom-event-name-casing` 四條；`ts/no-use-before-define` 放寬 variables；`regexp/no-super-linear-backtracking` 關掉（只在建置時跑自己的 markdown）。文章 md 不 lint，免得 `--fix` 改到教學內容。
- **vue-tsc 與 VitePress 內部元件**：文章版型 import 了 `vitepress/dist/client/theme-default/components/*.vue`，那些檔在 node_modules 裡自己的 import 沒型別，報 60 幾條。`declare module` 的 wildcard 擋不住（真檔存在就會去讀），改用 tsconfig `paths` 指到 `docs/types/shims/vp-theme-component.d.ts` 才有效。
- **stylelint 的 inline style 誤判**：`no-invalid-position-declaration` 把模板的 `style="..."` 當成沒有選擇器的 CSS，設 null。
- **順手抓到的真 bug**：`FeedbackTriage.vue` 關閉快速審核時 `entry.shots` 不存在會 TypeError；`articleTOC.vue` 的 `@hooks/useTOC` 路徑指到不存在的位置（type-only import 所以建置沒擋）；`btn.vue` 引用沒裝的 vue-router、`select.vue` 引用沒裝的 quasar。
- **改名腳本改到文章**：更新引用時把四篇鐵人賽教學文章裡的路徑也改了，已 `git checkout` 還原。

## 驗證

每一步都跑 `pnpm docs:build`；第 3 步之後每步 lint、stylelint、typecheck 三個都 0。
第 4、5 步另外用 CDP 跑：星系頁鎖定、↓、↵、Esc；首頁、文章、時間軸、叮咚宣傳頁、後台五頁掛載、無 JS 例外、無橫向溢出。
VitePress 1.6 之後建置從約 30 秒降到 14 秒。

## 踩到的坑（都寫進 skill 了）

`vitepress preview` 重建後要重啟（`pkill -f 'vitepress preview'` 殺不到，命令列是 `vitepress.js preview`，用 `lsof -ti :4173`）；無頭 Edge 兩個實例同時用 swiftshader 會互搶到頁面載不完；CDP 模式的 `--window-size` 無效，要 `Emulation.setDeviceMetricsOverride`；zsh 裡 `echo =====` 會被當成指令。

## 留給之後的

- 待辦第 6 步（規範文章）需要使用者參與；第 7 步（叮咚後台 Zod）先討論。
- `resource/flowscker/`、`docs/features/design-system/README.md`、`zod-schema-型別使用規範拷貝.md`、`DinDonLanding.vue` 那一行都是使用者未提交的東西，沒動。
- `develop_galaxy_tags` 分支還在，內容已全部在 `main`，可以刪。

## 補記：CI 在第 3、4、5 步都紅、第 6 筆才綠

新加的 Lint 步驟在雲端失敗，本機卻乾淨（連 `CI=true` 也乾淨）。抓 log 才看到只有 `DinDonLanding.vue` 四條：
那個檔工作樹裡有使用者未提交的一行文案，全倉庫 `--fix` 時它在工作副本被修了，但我刻意沒把使用者的檔納進 commit，
所以 `main` 上的版本還留著沒修的四條。處理：把使用者的副本放一邊、對 HEAD 版本單獨 `--fix` 提交（`df21727`），再把副本放回，
工作樹的差異只剩那一行文案。**教訓**：全倉庫 `--fix` 之後，凡是刻意不納進 commit 的檔，要另外對 HEAD 版本跑一次 lint。

順帶：GitHub Actions 提醒 `actions/checkout@v4`、`setup-node@v4`、`configure-pages@v4`、`pnpm/action-setup@v4` 還在用 Node 20，之後升 v5／v6。

---

# 2026-09-22 下午：Timeline 收尾、Tags 重做、相簿加文案、藏 404 連結

## 起因

**使用者**：1. timeline 這個頁面整體上差不多了，但是應該還有一些細節可以優化，幫我做完？ 2. tags list 這個頁面差蠻多的，幫我把他做完？要符合 design system 的風格。
3. portfolio 裡面 Flosker 先隱藏，畢竟那個頁面還沒做。 4. photography 應該也是要符合 design system 的風格，但是要記得這裡是相簿，照片呈現的方式我還是蠻喜歡的，另外我想要幫照片、相簿集可以加文案，你想想怎麼做好。 5. 把目前 404 的 nav 連結先隱藏。

## 做了什麼

| 項 | commit | 內容 |
|---|---|---|
| 3、5 | `4b66053` | nav 藏起 Flosker、Front-End Basic 三個索引頁、活動&賽事（都是 404），留 `[+]` 註解 |
| 1 | `7c1a78d` | Timeline：主線改成 `__wrap::before` 版面內定位（原本 `position: fixed` 加一串 calc，視窗一窄就跟圓點對不上）、漸層頁首、年份篇數、分類徽章、沒摘要就不放假句、手機版；`useBuildSiteData` 濾掉 `- null` 標籤 |
| 2 | `9e7d2c5` | Tags：整頁重做。原本分類陣列印成 `[ "使用實例" ]`、`tagSummaries` 沒顯示、沒有分頁按鈕、搜尋框沒樣式；現在有標籤介紹卡、Activity 卡、分頁、網址同步、手機版；熱圖預設跳到最近有文章的一年 |
| 4 | `c72240d` | Gallery：照片呈現不動；相簿卡加資訊列、頁首、內頁標題列；文案機制見下 |

## 相簿文案怎麼做的

- `photos/data.json` 是 `generate-gallery.mjs` 產生的，重跑會蓋掉，文案不能放那裡。
- 改放 `photos/albums/<相簿資料夾名>.md`：frontmatter 的 `title`、`subtitle`、`cover`（檔名）、`captions`（檔名 → 圖說），內文是相簿介紹（markdown）。
- `docs/shared/data/albums.data.ts` 用 VitePress 的 `defineLoader` 在建置時讀進來，內文用 `createMarkdownRenderer` 轉 HTML；`Gallery.vue` 依 id 合併。
- 圖說顯示在拍立得的白邊上（EXIF 上面）和燈箱的資訊列；介紹顯示在內頁標題列下面。
- `_範例.md` 是格式說明，底線開頭的檔不會被讀；複製改名成相簿名就能用。目前沒有任何一本有文案，等使用者寫。

## 驗證

`pnpm check` 全綠。CDP：三頁桌面與 390px 手機都沒有橫向溢出、沒有 JS 例外；tags 頁點標籤與換頁網址跟著變、直接開 `?tag=VitePress&page=2` 還原正確；相簿內頁打得開、拍立得數量對；兩頁的空「#」標籤消失。

## 留給之後的

- `tagSummaries` 只有四個標籤有介紹（TypeScript、vue、vitepress、developer），其他標籤的介紹卡只顯示篇數；要補的話改 `docs/shared/data/tagSummeries.ts`。
- Front-End Basic 的 HTML／CSS／JavaScript 索引頁、活動&賽事、Flosker 做好後把 nav 的註解放回來。
- `docs/public/icons/` 沒有 `search.svg`，搜尋框用 `pageview`；要一致的話補一個。

---

# 2026-09-22 傍晚：Design System 的 Components 分頁展示基本元件

## 起因

**使用者**：可以在 design system 裡面 components 裡面展示基本元件的設計嗎？

## 做了什麼（`168a76f`）

要展示得先讓元件能用：`shared/components/el/` 那批大多是 Quasar 專案的殘留（`q-checkbox`、`q-input`、`router-link`、綁後端的 `Img`），
只有 SvgIcon、Tag、Card、SectionBlock、InputBox、Divider 真的能畫出來。全部改成原生實作、照設計系統的 token，
新增 `Select`，新增 `DemoBlock` 展示框（示範區、props 表、可收合的程式碼），`Components.vue` 排了九塊：Button、Tag、Input／Select、
Checkbox／Radio／Toggle、Card、Divider、Image、SvgIcon、HUD Panel。示範區可以直接操作。
`ElCheckbox` 有一篇文章在用（陣列 v-model 加 val），原生版相容這種用法。

## 驗證

lint、stylelint、typecheck 全綠；CDP 操作各元件，狀態都正確，頁面沒有未解析的 `q-*`。

## 留給之後的

- `WidgetPagination` 的連結寫死 `?page=N` 會丟掉其他參數，標籤頁自己做了分頁沒用它；要嘛改成 emit，要嘛刪。
- 站上各處自己畫的按鈕（叮咚後台的 `dd-admin__btn`、星系頁的 `.hud-btn`、標籤頁分頁鈕、相簿返回鈕）可以逐步換成 `ElBtn`。

---

# 2026-09-22 晚上：非 side project 頁面統一用 El 元件、刪死碼；履歷改版

## 起因

**使用者**：1. 先統一風格封裝元件，然後把除了像是 galaxy、dindon、gallery、履歷這種 side project 以外的地方先用統一的元件，統一視覺與排版；
side project 外沒用到或壞的元件刪掉也沒關係。 2. 履歷的部分可以和 cake（https://www.cake.me/senior-front-end）偏比較新版的履歷做比較，更新我們部落格上面的履歷。
你覺得要直接顯示公司名稱嗎？如果好你就直接更換，然後讓排版優雅一點，現在整個滿版很大有點醜。

## 做了什麼

| 項 | commit | 內容 |
|---|---|---|
| 2 履歷 | `e966789` | 公司用真名；內容照 cake 更新（Senior Front-End、有數字的條列、技能四組）；兩欄 1080px、左欄 sticky、字級收到 token；WorkExperience 重做；手機順序頭像 → 內容 → 技能 |
| 1 統一與清理 | `ad5c398` | TagsList 的搜尋、篩選、分頁與 TypeScale 的切換鈕換成 ElInput／ElBtn；刪 13 個沒人用的共用檔；文件的分支說明更新 |

## 公司名稱的決定

改成真名。理由：cake 與 LinkedIn 本來就公開，招募方會交叉比對；履歷頁掛「不正常人類研究中心」這種玩笑名稱，看的人第一眼會懷疑是不是假的。
留 `companyAlt` 放英文簡稱（NCKU AI4DT、iWare）。

## 一個藏很久的 bug

markdown 頁面裡的 `<ElXxx>` 從來沒被 unplugin-vue-components 解析到：resume.md 的按鈕在 DOM 裡是 `<elbtn>`（未知標籤），
舊履歷 md 裡的 `ElSvgIcon` 也一直沒圖示。`.vue` 裡正常，只有 md 不行。沒去追外掛在 VitePress 裡的執行順序，直接在 `theme/index.ts` 的
`enhanceApp` 用 `import.meta.glob` 把 `el/` 全域註冊，SSR 與瀏覽器都驗過。

## 驗證

`pnpm check` 全綠。CDP：履歷桌面與 390px 都沒有橫向溢出、四家公司名稱正確、總年資 9y 9m、「全部收合」按下去四段都收、單段可以再展開；
標籤頁的 ElInput 與 9 顆分頁 ElBtn 都在；Typography 分頁的 ElBtn 在。

## 留給之後的

- 履歷左欄的技能顏色是我猜的品牌色（Pinia 黃、Zod 藍、TanStack 紅…），沒有圖示的用純文字 chip；要圖示的話補到 `public/icons/colorful/`。
- side project 頁（星系、叮咚後台、相簿）自己畫的按鈕沒動，之後要換 ElBtn 是各自一次。
- `useKeyBoardControl` 的 removeEventListener 移不掉（每次傳新函式）、策略表是全域的，ExpandLayout 還在用；要修的話另開一輪。

---

# 2026-09-22 晚上：/dindon/ 分享預覽圖是 Opshell 的 logo

## 起因

**使用者**：現在 https://opshell.me/dindon 的預覽圖是 Opshell 的 logo，但是應該要是叮咚記帳的 logo 才對，修正一下。

## 原因與做法（`2f729b3` 與後一筆）

整站原本連一個 `og:` 標籤都沒有，分享時預覽服務撿頁面第一張圖，就是導覽列的 Opshell logo。
`config.mts` 加 `transformPageData`，每一頁產 `og:title／description／url／image` 與 `twitter:card`；圖用 frontmatter 的 `ogImage`，沒有就站台預設
（首頁那張裁成 1200×630 的 `og-default.jpg`）。叮咚四頁指定 `/images/dindon/og.png`（Sicily 黃底、圓角 App 圖示、淡陰影，1200×630）；
隱私權政策頁由同步腳本產生，範本一起改。

**注意**：LINE、Facebook、Threads 會快取舊的預覽，部署後要用各家的分享除錯工具重抓一次（Facebook Sharing Debugger、LINE 的 Page Poker）。

## 補記：Facebook 抓到的還是方角版、以及 Cloudflare 快取住的 404

**使用者**：我用 Facebook 的工具了，中間的 logo 可以有圓角嗎？然後加點陰影。Facebook 除錯工具有順便更新 Threads 嗎？
**使用者**（附截圖）：我意思是叮咚的 APP LOGO 白色的四個角落要圓角，然後整塊白色要有陰影。然後你沒回答我 Facebook 和 Threads 的預覽圖相通嗎？

- 圓角加陰影在 `47dc670` 就做了。Facebook 抓到方角版，是因為它抓圖時上線的還是第一版（`2f729b3`）。
- 更糟的是：我在 `47dc670` 部署完成前 curl 了一次 `og.png`，Cloudflare 把那次的 404 快取 4 小時，之後誰抓都是 404。
  沒有 Cloudflare 權限清快取，改檔名成 `og-share.png`（`fca011b`），部署完成後才驗證：線上 200、內容跟倉庫一致。
- 這兩個坑寫進 `web-page-and-feature` skill：換圖一定換檔名、部署完成前不要碰新圖片網址。
- LINE 的 Page Poker（poker.line.naver.jp）DNS 已經解析不到，停用了。Facebook Sharing Debugger 要登入，只能使用者自己按。
- Threads 與 Facebook：兩者都用 Meta 的爬蟲，但 Meta 沒有公開說明兩邊共用同一份預覽快取，這點沒辦法確認。Threads 本身沒有除錯工具；
  最可靠的驗證是在 Threads 開一則草稿貼網址看預覽。因為這次圖片網址換新了，任何一邊只要重新抓頁面就一定拿到新圖。

---

# 2026-09-24：未發佈文章盤點、補脈絡、AI 專區、每天發一篇的工具

## 起因

**使用者**：看一下目前有哪些未發佈文章，幫我依照價值和系列整理一下好嗎？也可以在有意義的文章裡補充一點脈絡。之後可能每天都會嘗試發佈一篇文章。
另外幫我新增 AI 文章專區，畢竟這個議題很紅。之後也會想試試看發佈心得。

## 盤點

未發佈 183 篇。依中文字數、程式碼量、結構分四級，完整清單在 `docs/devlog/發文排程.md`：
一、佇列 13 篇（已整理，可直接發）；二、有料的半成品約 20 篇（多是群組對話或 AI 回答直接貼上）；三、筆記與空殼約 130 篇；四、不發或要你決定。

## 做了什麼

| commit | 內容 |
|---|---|
| `b913b5c` | 刪四份完全重複的草稿；串 API 系列、Windows 轉 Mac 系列歸進資料夾；macOS 三篇拆好（day-3＝day-1、day-2 後半才是第三篇）並修好貼上時壞掉的圍欄；根目錄其他草稿歸位 |
| `9681771` | 佇列前 12 篇補「這篇的脈絡」、系列導覽，刪 AI 對話殘留（「哈哈哈，這個問題問得太好了！」「做得非常好！」、韓文「제거」、泰文、SEO 關鍵字清單），補 frontmatter |
| 下一筆 | 串 API 系列的 `{.vue}` 接在純文字後面會原樣印出，改包在粗體上 |
| `eb53c92` | AI 專區：導覽列頂層入口、專區首頁（全部／技術／心得）、第一篇草稿 |
| 這一筆 | `pnpm publish-next`／`publish-post`、`new-post` 可指定資料夾與分類、發文排程、skill |

## 判斷

- **文字保留作者原話**，只補脈絡、刪殘留、修結構。改寫是作者的事。
- **發佈日改成當天**：時間軸依 `createdAt` 排，不改的話 2025 年寫的稿子發佈後沉到很後面；原稿日期留在 `draftedAt`。
- **AI 放導覽列頂層**：議題熱，值得一眼看得到的入口；心得用分類區分，不另開資料夾。
- **第一篇 AI 文章由 Claude 起草**，因為叮咚記帳的多 Claude 協作有完整第一手記錄；標成草稿，工具會擋，要作者改完才能發。

## 要使用者決定的

- 「Opshell 的哲學意義」**線上有兩篇同時發佈**（根目錄 `copy` 新版、`life-murmurs` 舊版）。沒動。
- 作品集四篇的客戶名稱能不能公開。
- 規範三篇（待辦第 6 步）。

## 驗證

`pnpm check` 全綠；發佈工具實跑三種情況（正常發佈並打勾、重複發佈被擋、草稿被擋）後還原；CDP 截圖 AI 專區首頁（暫時發佈草稿看列表、切分類、空狀態）與串 API 第一篇。

---

# 2026-09-25：AI 移進 Article、時間軸 hover 框、熱圖空方塊

**使用者**：1. AI 篇章放在 Article 裡面 2. timeline 文章的 hover 那個偽元素做的 border 右邊噴出去了 3. tags list 的熱圖沒發佈文章的時候方塊也要看的到才對吧

- AI 從導覽列頂層移進 Article 選單第一項。
- 時間軸：`::before` 從卡片左緣開始畫，寬度卻是整列 100%，右邊凸出「圓點加間距」。寬度扣掉偏移；CDP 量 1440 與 900px 都只比卡片左右各寬 2px。
- 熱圖：空方塊跟卡片同色（都是 `--vp-c-bg-soft`），改成 18% 的文字色。
- **驗證時多抓到一個真 bug**：`/tags-list.html?tag=Belief` 整頁空白。「哲學意義」根目錄那篇的 `createdAt` 沒加引號，YAML 讀成 Date 物件，
  進瀏覽器後壞掉，我在 9-22 寫的 `toDay()` 碰到就丟例外。源頭正規化日期，標籤頁也改成跳過壞日期。線上原本就是壞的。
- 順手：自動摘要會印出 `{.vue}`，拿掉。

---

# 2026-09-25：功能演示頁（板 #0055）

**使用者**：看看有沒有指派的工作

溝通板上有一張指名給網頁的單：#0055，前端要官網做一頁「功能演示」，素材（模擬器錄影、`index.json` 的步驟）前端已經錄完 32 支。直接接下來做。

## 做了什麼

| commit | 內容 |
|---|---|
| `9b20ccf` | `/dindon/demo/`：目錄（41 項、8 類）＋播放對話框＋三張圖解；`pnpm dindon:demos` 同步腳本；導覽列加入口；skill `web-dindon` 補第五頁 |

- **目錄**：卡片左邊是手機形狀的縮圖（封面 540 寬一張 80 KB，同步腳本縮成 240 寬 webp，32 張共 248 KB）；三星的標「必看」；`phone` 的虛線框寫「準備中：要用真的手機錄」。
- **播放器**：影片上疊手指（黃色半透明圓＋實心點，平面風格）、滑動與拖曳畫軌跡、說明泡泡；控制列有暫停、0.5 倍速、重播，進度條上一步一個刻度。右側步驟清單會跟著亮，點了跳過去。
- **圖解**：第 4 項的前後對照是把 App 的 `NotificationParser.deIdentify` 正規表示式拿來真的跑出結果；第 10 項照 `ReceiptDraft.resolveOccurredAt`；第 39 項照 `data_extraction_rules.xml` 與隱私權政策。
- 通知那幾支（2、3、5、6、7）畫面上的金流來源是「Shell」，對話框裡加一句說明（前端 README 列的已知瑕疵）。

## 判斷

- **網址 `/dindon/demo/`**（單上建議的）。對話框用原生 `<dialog>`，Esc、焦點都是瀏覽器處理；網址同步 `#16-record-fan`，可以直接分享某一支。
- **沿用宣傳頁的色票**：根元素同時掛 `.dindon-landing`，吃同一組 `--dd-*` 與深色模式，外框、footer 也共用，不複製一份。
- **拖曳的時間**：步驟只給按住多久，沒給移動多久。用瀏覽器逐格暫停截圖對照第 17 支，畫面上的東西比 `holdMs` 晚約 0.25 秒才動、每段約 0.2 秒，參數照這個調。
- **泡泡位置**：會移動的放在移動方向的反側（不然會蓋住被拖的那一筆），靠上下緣的往內放。

## 踩到的坑

- **第 10、39 張圖解打開是空的**（第 4 張正常）。VitePress 第一次載入用「精簡版」頁面程式，會把元件裡整塊靜態的 HTML 換成空字串，
  因為它假設伺服器已經渲染過。圖解在對話框裡、只在瀏覽器端渲染，伺服器的 HTML 沒有它；第 4 張有 `v-for` 所以不是靜態的，逃過一劫。
  改成 `defineAsyncComponent` 拆成獨立檔案就不會被精簡。這個坑寫進 skill 了，附檢查指令。
- 第 10 張圖解把對話框左欄撐到 800px：左欄是 auto 寬，圖解寬度用 `min(380px, 100%)`，百分比在這裡被當成 auto，被註解的長句子撐開。改成固定 380px。
- 深色模式下對話框和遮罩幾乎同色，加一條邊框和遮罩模糊。

## 驗證

`pnpm check` 全綠。無頭 Edge 實測：41 張卡片（35 張可點）、1440 與 390px 都沒有橫向捲動；點開自動播放、網址同步；
拖曳（17）、滑動（18）、點擊（3）、輸入（13）四種在指定秒數截圖，手指、軌跡、泡泡都在對的位置；三張圖解淺色、深色都看過；
手機版對話框滿版、手機寬 280px；Esc 關閉後網址的 # 拿掉、頁面恢復捲動、焦點回到剛剛那張卡片。

## 留給之後

- 宣傳頁 `/dindon/` 還沒有連到演示頁：宣傳頁的元件裡有使用者還沒提交的一行文案修改，我沒動它。
- `phone` 的 6 支等使用者用手機錄，前端剪好回單後重跑 `pnpm dindon:demos`。

---

# 2026-09-25：重播鈕、演示紅框、封測兩步驟引導

**使用者**：1. 播放器重複播放的按鈕 icon 是歪的 2. 看一下工單，有功能要處理 3. 審核過了 https://play.google.com/apps/testing/me.opshell.dindon 處理一下官網，並要引導他們兩步驟，要加進群組才能進行測試，這件事要讓他們知道，如果有個 Demo 動畫更好

## 做了什麼

| commit | 內容 |
|---|---|
| `bdac5a8` | 重播鈕；演示的紅框與拖曳時間；素材整批重錄 |
| `b13b258` | 宣傳頁：測試連結、兩步驟引導＋示意動畫、演示頁入口 |

- **重播鈕歪掉**：兩個原因疊在一起。影片中間的大圓鈕沒有把圖示置中（播放三角形也一樣歪，只是比較不明顯）；
  重播圖示本身的圓心在 (12, 13)，不在 24×24 的正中間。補上置中、換成圓心在正中間的線條圖示。
- **工單 #0055 回覆 4**：前端整批重錄，`index.json` 多了 `box`（被點的元件範圍，使用者要求畫紅框）與 drag 的 `pathMs`。
  紅框在手指落下前 0.7 秒出現；放開後 0.12 秒就收掉，因為點下去常常馬上換頁，第一版留 0.35 秒時框會停在新畫面不相干的地方（逐格截圖看到的）。
  拖曳改照實測時間走：實際每段約 0.4 秒，我先前估的 0.2 秒差了一倍。金流來源不再是 Shell，那句說明拿掉。
- **封測審查通過**：`PLAY_OPTIN_URL` 填上。加入方式從左半欄拉到整個寬度：兩張步驟卡（申請加入群組 → 核准後打開測試連結），
  右邊一支小手機循環播 14 秒的示意：群組頁按「申請加入」→ 核准信 → 按「成為測試人員」→ Play 安裝，播到哪一步那張卡就亮。
  上面一條黃色提示寫「要兩個步驟，只做第一步 Play 還找不到測試版」。
- 開頭的「加入封閉測試」原本直接連群組，改成捲到封測區塊，不然會漏看第二步。
- 宣傳頁補上演示頁入口（上一輪留下的），你那行「上面有資料」的文案一起提交了。

## 判斷

- **示意動畫用 CSS 畫，不錄 Google 的真實畫面**：真實畫面要登入才截得到、Google 改版就過期，也不該在我們的頁面上模仿 Google 的介面。
  畫面只寫「Google 群組」「Play 商店」這種文字標題，不用標誌與配色，下面註明「示意動畫」。
- 手指的位置用瀏覽器量三顆按鈕的中心再寫進 keyframes，第一版目測的位置點到了下一行字。
- 群組是「申請、核准」制（照 `docs/ops/google-group-setup.md`），所以第 2 步寫「收到核准信之後」，並提醒沒被核准就打開會加入不了。

## 驗證

`pnpm check` 全綠。無頭 Edge：第 3 支點擊前後四格（紅框出現 → 按下 → 換頁時已消失）、第 17 支拖曳四格手指都在被拖的那一筆上；
影片播完的大重播鈕置中；宣傳頁四個動畫時間點截圖手指都落在按鈕上；1440 與 390px 沒有橫向捲動，手機版示意手機在步驟卡上面。

---

# 2026-09-27：演示同步 0.6.6（板 #0060）

**使用者**：有工作，幫我處理一下

溝通板上指名給網頁的有兩張：

- **#0060**（做了，`8edc06e`）：`pnpm dindon:demos` 整批同步，36 支 ready、共 45 項。新分類「預算與小精靈」（42～44）照 `index.json` 的順序自動排在「記帳的細節」與「成就感」之間，
  45 分區清除進「資料與隱私」；17、18、40 換成重錄的版本。頁面程式不用改，只改了 md 裡寫死的「一共 41 項」。
- **#0057**（等）：隱私權政策改版，前端要求 **0.6.6 上架後**才同步（線上 App 還是 0.6.5，先改會對不上），前端上架時會回單。

驗證：`pnpm check` 全綠；無頭 Edge 看目錄 45 張卡片、分類導覽 9 項、沒有橫向捲動，42 點開自動播放、紅框與步驟清單正常。

留給使用者決定：0.6.6 還沒上架，但演示頁開頭已經寫「App 0.6.6」，也看得到預算、小精靈這些新功能（前端要求現在同步）。宣傳頁要不要介紹「每日預算＋小精靈」「存錢目標」，等上架再說。

---

# 2026-09-27～28：評估報告、開發規則、前端開發規範 v5 與部落格跟進

**使用者**（依序）：
1. `/claude-api prompt-audit`，code review 整個部落格專案，給一份評估報告
2. 報告先存進 devlog，之後再討論；先談開發規則
3. scoped 保留規則；顏色新式寫法、舊的也改；想談的是待辦第 6 步的規範，剩下的加進待辦並註明 web
4. 規範只留一份……之後工作或專案都以它為通用準則，這樣的前提來設計，開始吧
5. 開始寫
6. 手寫 interface 統一成 Zod 衍生的型別（不加前綴）；Pinia 只放客戶端狀態
7. OK（照 ② → ④ → ⑤ 繼續）

## 做了什麼

| commit | 內容 |
|---|---|
| `88b4514` | `docs/devlog/評估報告-2026-09-27.md`：skill 與 CLAUDE.md 的 9 處事實過期、專案評分與 8 個問題 |
| `fade09b` | 全倉庫拿掉 scoped（17 支）；刪掉 ExpandLayout 197 行從沒生效的規則、沒人用的 ArticleMate.vue；修兩組撞名、兩處會被丟掉的 `::v-deep`／`:deep` |
| `8473aed` | 顏色全部改新式寫法，stylelint 開 `color-function-notation: modern` |
| `266a979` | `docs/devlog/規範討論.md`：四輪討論（地基、資料層、伺服端資料、落地）的決定 |
| `d6230e7` | 前端開發規範 v5.0.0 定稿（`developer/前端開發規範.md`）；深色模式表格偶數列看不見的全站 bug |
| `c5cca58` | 兩項待定定案，舊的兩份刪掉，放進發文排程，CLAUDE.md 與 skill 指向規範 |
| `2aaaa1e`、`6ef5940`、`9a3efbb`、`9969f6b`、`6601816`、`41cbe2e`、`8609c3e` | 部落格照規範跟進五批（細節與驗證方式在 `規範討論.md` 最後一節） |

## 判斷

- **規範定位**：使用者定為跨專案通用準則，所以衝突時在規範裡定一個答案。結構拆成核心章＋條件章：部落格有 Zod 資料層，沒有 TanStack／router／Pinia。
- **範例一定要實際跑過**：在暫存專案裝 Zod 4、TanStack v5、vee-validate、type-fest，寫完整範例、16 個測試，文章嵌入的程式碼跟原始檔逐字一致。
- **後台沒辦法登入也要驗**：複製後端倉庫（不動原倉庫）加測試產生真實回應，再用假登入＋請求攔截在瀏覽器渲染。

## 踩到的坑（都寫進規範或 skill）

- Zod 4 的 `.pipe()` 要求後者的輸入型別能被前者輸出滿足：核心 Schema 放 `.default()` 會型別錯誤（舊版規範範例在 Zod 4 編譯不過）。
- Raw 的列舉寫 `z.string()`，pipe 到核心 Schema 會型別錯誤。
- `@vee-validate/zod` 只支援 Zod 3；vee-validate 5 還在 beta → 自寫 `toFormSchema()`。
- type-fest 與執行層的 key 轉換在 `userID`、`ai_calls_30d` 上結果不同 → 執行層改成一致、camelCase 設 `splitOnNumbers: false`。
- `scoped` 拿掉時：`fade` 轉場名稱全站共用、兩個元件同名 `.hud-container`、`@keyframes scan` 重名、`::v-deep` 失效。
- 變體改 `--` 時腳本把 `is-reverse` 掛到錯的基底（`__container--reverse`），計算後樣式比對抓到。
- frontmatter：`categories: demo`（字串）原本被默默歸成「雜談」；`image: ''` 跟 `null` 語意不同，改寫時差點改到行為，站台資料比對抓到。
- 後台：方案型別少了 `lite`；後端沒資料時送 `models: null`，舊版「用量報表」整頁空白。
- `git add -A docs/features` 又把使用者沒進版控的 `design-system/README.md` 帶進暫存區，提交前發現移出。

## 留給使用者

- `拷貝` 那份 v4.0 規範（未進版控）要不要刪。
- 評估報告剩下的：主題 JS 1.6 MB（Tres、Sandpack 全站載入）、演示影片搬 R2、草稿加 noindex、測試、Windows 路徑。
- 後台已上線：登入後六個分頁各點一次；若看到「回應格式不符」，訊息會寫是哪支 API、哪個欄位。

# 2026-09-28：評估報告剩下的五項（效能、noindex、Windows 路徑、測試、演示影片搬 R2）

**使用者**：每頁都載入 1.6 MB 的主題 JS、演示影片搬到 R2、草稿頁加 noindex、測試、腳本裡的 Windows 路徑，這些問題你都能處理嗎？可以的話一起處理，需要開單可以直接開。

## 做了什麼

| commit | 內容 | 驗證 |
|---|---|---|
| `268d52f` | 主題 JS 1,665 KB → 135 KB：拿掉全域 `app.use(Tres)`（只註冊 TresCanvas，GalaxyBack 自己 import）；Sandbox 改 `defineAsyncComponent` | 首頁、星系頁、標籤頁、兩篇沙盒文章在瀏覽器實測；沙盒照常編譯出 Hello world |
| `f471b7e` | `article/` 底下沒發佈的頁面加 `robots noindex, nofollow` | 262 頁文章＝82 發佈＋180 未發佈；加到 179 頁（AI 專區首頁是 `layout: page`，照常收錄），已發佈 0 頁 |
| `96608a1` | 四支 frontmatter 腳本的根目錄改成相對於腳本；`add-frontmatter` 跳過專區首頁 | 在暫存 worktree 實跑四支 |
| `14dd78b` | Vitest 3、31 個測試（`utils/zod`、文章 frontmatter、叮咚後台、演示疊層），`pnpm check` 與 CI 都跑 | 故意改壞三處，對應的測試都紅 |
| `8407876` | `pnpm dindon:demos` 改傳 R2（檔名帶雜湊、傳完才寫 demos.json、`--dry`、`--prune`），網頁讀 `mediaBase` | 假的 S3 伺服器：首次傳 108 個、再跑全跳過、`--prune` 只刪舊檔、請求都有簽章 |
| 工作區 `cdab8d1` | 開單 #0063 問前端：App 倉庫的演示素材要不要繼續進 git | |

## 判斷

- **Sandbox 不用 `defineClientComponent`**：VitePress 那個包裝不把插槽傳下去，而 `::: sandbox` 的程式碼就在插槽裡。
- **noindex 的條件是「沒發佈，而且不是 `layout: page`」**：只看 `isPublished` 會把 AI 專區首頁擋掉；只看「明確寫 false」又會漏掉兩篇沒寫的草稿（其中一篇是從別的網站複製的參考筆記）。
- **Vitest 用 3 不用 5**：5 要 Vite 6，VitePress 1.6 還在 Vite 5。
- **演示檔名加內容雜湊**：重錄後網址就變，可以快取一年，不會有人看到舊影片；R2 上同名就是同內容，不用重傳。
- **切換分兩步**：腳本先上線，但 `demos.json` 沒有 `mediaBase` 時照舊讀 `docs/public`；使用者上傳後再刪倉庫裡的副本，網站不會有空窗。

## 踩到的坑

- `add-frontmatter` 在 Mac 上從來沒跑成功過（寫死 `c:/wamp64`）；修好路徑之後才發現它會把 `article/ai/index.md` 當文章，補上 `isPublished: false`、刪掉註解。
- 想把上次產生的後端回應複製進倉庫當測試資料，被權限擋下（來源是後端倉庫的複本）。改成依 `admin.schema.ts` 手寫最小資料。
- vitest 5 裝得起來，一跑就 `ERR_PACKAGE_PATH_NOT_EXPORTED`（`vite/module-runner`），原因是被解析到 VitePress 的 Vite 5。

## 留給使用者

- **R2 金鑰**：Cloudflare → R2 → Manage R2 API Tokens 建一把 Object Read & Write（限 `opshell-gallery`），
  在官網倉庫根目錄建 `.env` 放 `R2_ENDPOINT`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`，跑 `pnpm dindon:demos`。
  跑完告訴網頁 Claude，會檢查網址、刪 `docs/public/images/dindon/demos/`、在 #0063 回覆。
- 已在 git 歷史裡的 50 MB 要改寫歷史（force push）才會消失，要不要做另外決定。
- 新單：#0061（後台管理新功能投票的候選，後端 → 網頁）、#0062（Play 加入測試頁是英文，第二步說明與動畫改「Become a tester」，上架 → 網頁）。

# 2026-09-28：演示影片切換到 R2（`dindon-demo`）；相簿上傳方式查核

**使用者**：`.env` 裡面有資料了，網域是 dindon-demo.opshell.me。（另開了獨立儲體 `dindon-demo`，問放這裡是不是更好。）
題外話：相簿目前是不是沒有上傳照片的功能？沒看到 token，也不確定當初是不是整包拖拉上傳。

## 做了什麼

- `b61db3c`：腳本改用儲體 `dindon-demo`、檔案放根目錄、讀 `.env.local` 的 `R2_DINDON_*`；實際上傳 108 個檔案；刪掉倉庫的 44.7 MB 副本；`catalog.ts` 不再退回 public。
- `.gitignore` 補 `.env.*`：使用者建的是 `.env.local`，原本只排除 `.env`，差點會被 `git add` 帶進去（沒有提交過）。
- 工作區 `8ddbf88`：#0063 回覆並結案（前端已停止提交素材、清掉 App 倉庫歷史）。

## 驗證

- 108 個檔案經公開網域都 200、大小與原檔一致、Range 回 206、CDN 快取命中。
- 本機建置後在瀏覽器：36 張縮圖從 R2 載入，點開影片從 R2 播放，時間會走，疊層正常。正式站也確認指向 R2。

## 踩到的坑

- 本機 `vitepress preview` 在建置途中啟動，記住的是舊檔案清單，新的 JS 一律 404，看起來像「頁面沒 hydrate」。重啟預覽就好，不是網站的問題。

## 相簿怎麼上傳（查核結果）

倉庫裡**沒有**上傳照片的程式，歷史裡也從來沒有過（`package.json` 從沒裝過 S3 相關套件）。現有流程：

1. 照片放 `photos/raw/<相簿>/`，跑 `pnpm gallery-thumb`（`generate-gallery.mjs`）：產生 `photos/thumbs/` 與 `photos/data.json`
2. `raw/`、`thumbs/` **手動**傳到 R2 的 `opshell-gallery`（Cloudflare 後台拖拉，或 S3 Browser）；只有 `data.json` 進 git

`Upload-Script` 權杖發行於 2026-01-21，跟相簿的第一個 commit（01-20）同一天，`.env` 也是那時加進 `.gitignore` 的：當時打算寫上傳腳本，最後沒寫。
這台 Mac 上沒有 `photos/raw`、`photos/thumbs`，原圖可能只剩 R2 上那份（或在舊的 Windows 電腦上）。

# 2026-09-28：改寫 git 歷史，清掉演示影片（force push）

**使用者**：先把相簿的事情記到待辦.md，然後開新的文件記錄剛剛整個 R2 的儲體建置步驟和流程，接著動手處理 force push。

## 做了什麼

- 相簿自動上傳列進工作區 `docs/ops/待辦.md` 第 10 項（使用者的檔案，沒有 commit）。
- `docs/devlog/R2-儲體建置與流程.md`：儲體、網域、權杖、腳本運作、日常流程、驗證、搬家順序、踩過的坑。
- 改寫 `main` 的歷史，從 2026-09-25 以後的 30 個 commit 裡拿掉 `docs/public/images/dindon/demos/`，force push（`57eebca` → `a44f1af`）。

## 做法與驗證

1. 完整鏡像備份：`~/WWW/DinDon-backups/2026-09-28-web-before-filter/opshell.github.io.git`（所有分支），對照表 `commit-map.txt`（舊 → 新，完整 40 碼）。
2. 在暫存區另外 clone 一份鏡像來改寫，不動工作目錄。
3. **先試了 `git filter-repo`，放棄**：它會拿掉 GPG 簽章，GitHub 網頁上產生的 commit 都有簽章，所以從第一個 commit 開始 382 個編號**全部**會變，
   連不含演示的 4 個舊分支也變。改用 `git filter-branch --index-filter … -- 5e99747^..main`，只改寫範圍內的 30 個；
   範圍內沒有帶簽章的 commit，訊息裡也沒有互相引用編號。
4. 驗證：最後一個 commit 的樹跟改寫前**完全相同**（網站內容不變）；30 個 commit 逐一比對，除了演示資料夾以外沒有任何差異；
   其他 4 個分支編號不變；整個倉庫找不到演示的檔案。
5. `--force-with-lease=main:57eebca`：遠端如果不是預期的版本就拒絕，不會蓋掉別人推的東西。
6. 工作目錄 `fetch` 後 `reset --hard origin/main`（使用者沒進版控的三個檔案不受影響），清掉 reflog 並 gc。
7. 文件裡引用到的舊編號照對照表替換 45 處：官網 4 個開發記錄，工作區是網頁 Claude 自己寫的段落與共用的 `beta-todo.md`。
   替換後的編號都查得到。

## 結果

- 只 clone `main`：**136 MB → 75 MB**。剩下的大多是字型（Noto Sans TC 的 ttf 與 woff2）和 `resource/opshell-OK.ai`（18 MB）。
- CI 綠燈，網站內容不變。

## 踩到的坑

- zsh 會把 `$NEW:refs/...` 的 `:r` 當成變數修飾符，推送的參數被吃掉一截（沒推出任何東西）。變數後面接冒號要寫成 `${NEW}:`。

## 留給使用者

- 別台電腦上如果有這個倉庫的 clone，要重新 clone，或 `git fetch && git reset --hard origin/main`，**不能直接 pull**。
- GitHub 上舊的 commit 用舊網址可能還打得開一陣子，要等 GitHub 自己清理。
- 其他小精靈寫的內容裡如果有官網的舊編號，查 `commit-map.txt`（工作區開了通知單）。

# 2026-09-28：三張單（#0057 隱私權政策、#0062 Become a tester、#0061 後台功能投票）

**使用者**：好，接著處理（溝通板上指名給網頁的 #0057、#0061、#0062）。

## 做了什麼

| commit | 單 | 內容 |
|---|---|---|
| `1b07b70` | #0057 | `pnpm dindon:privacy`：9/27 版、適用 v0.6.6（備份內容與分區清除、通知統計不隨系統備份、小精靈提醒與新功能投票） |
| `45385b6` | #0062 | 封測第二步改成按「Become a tester」、加一段「英文頁面是 Google 固定的，不是連錯」的提示（`JoinStep.note`）；示意動畫第 3 幕改英文 |
| `3cf5aa4` | #0061 | 後台新分頁「功能投票」（`FeatureVotePanel.vue`）：列表、新增、修改、改狀態前確認；schema 與 5 個測試 |

三張單都回覆、狀態改成已處理（工作區 `a288993`），結案由開單的人做。

## 判斷

- **字數照字元算**：後端用 `utf8.RuneCountInString`，JS 的 `.length` 會把 emoji 算成 2。`countChars = [...value].length`，Schema 用 `refine`。
- **控制字元不在前端擋**：後端的錯誤訊息本來就是中文、可以直接顯示，規則只維護一份。
- **改狀態的確認用行內確認**：跟裝置詳情的凍結一樣，不用瀏覽器的 `confirm()`。
- **只送改過的欄位**：後端的操作紀錄只記真的變了的欄位，前端也不要送沒改的。
- **狀態 class 用 `--`**：資料決定的分類不是互動狀態；`in_progress` 轉成 `in-progress` 才符合 BEM 檢查。

## 驗證

- 後台：後端**暫存複本**的測試用 `SERVE_PORT` 開真的 gin 伺服器（記憶體 SQLite、種子 3 個候選 3 票），預覽站 `?api=` 接它，假登入後實際操作：
  列表、41 字前端擋、新增（emoji＋換行）、2 票的候選改開發中（確認出現、確定後仍 2 票）、零寬字元後端 400 且訊息顯示；沒有 JS 錯誤。
- 宣傳頁：用 Web Animations API 把動畫停在第 3 幕按下前／後，桌機與手機寬度截圖。
- 正式站：隱私權政策是 v0.6.6 版、宣傳頁有「Become a tester」；CI 綠燈。

## 踩到的坑

- 動畫凍結：改 `animation-delay` 再暫停，停的位置會受之前已經跑的時間影響；改用 `getAnimations().forEach(a => { a.pause(); a.currentTime = … })` 才準。
- `.small` 為了長 email 設了 `word-break: break-all`，英文連結會斷在字中間（「Google Pl / ay」），連結另外設回 `normal`。
- 模板裡中文句子分兩行寫，瀏覽器會在中間補一個空格，要寫成同一行。
- 預覽伺服器跟 `pkill` 放在同一個指令裡啟動會跟著被收掉；用背景工作單獨啟動，而且要在建置之後。
- 無頭瀏覽器會快取舊的 HTML，截圖前 `Network.setCacheDisabled`。

# 2026-09-28：官網導航修正、beta 開放前檢查、後台改版

**使用者**：檢查一下官網頁面，有的按鈕的導航位置不太對。目前已經正式開放給 beta 群組使用了，接下來也會開始海巡 Threads，讓其他人透過官網一起加入使用，檢查一下官網。然後優化一下 dashboard，讓它更現代、更方便檢視目前的狀態和資料。

## 做了什麼

| commit | 內容 |
|---|---|
| `f86f833` | 宣傳頁錨點停錯位置（截圖補寬高）；手機上加入步驟排在動畫前；`dindon/` 的 og:title 不掛部落格名 |
| `56b3860` | 後台：獨立側欄外框、側欄待辦數字、總覽第一排「需要處理」（`usePulse.ts`） |

## 導航問題的原因

宣傳頁 8 張截圖沒寫 `width`／`height`、又是 `loading="lazy"`。點「加入封閉測試↓」時平滑捲動一開始就算好終點，
捲動途中經過的圖片才載入、把版面撐長，`#beta` 被往下推：桌機差 646px、手機差 1,676px（停在功能介紹中間）。
補上實際寬高後，頁面高度載入前後不變，兩個錨點都停在導覽列下方。

量測方法：CDP 點錨點，記錄捲動前後的 `scrollHeight` 與目標的位置（0.3、0.8、1.5、3 秒各一次），高度有變就是版面在動。

另外試了 `scroll-margin-top`，沒有作用又拿掉：VitePress 自己處理錨點點擊，用 `scrollOffset`（134）扣掉目標的 `padding-top`。

## beta 開放前的檢查（從 Threads 點進來的角度）

- 文案：「封閉測試招募中」「即將在 Google Play 上架」「限額 100 名」都符合現況；兩步驟、Become a tester 的說明都在。
- 分享卡片：og 圖 1200×630 正常；標題原本是「叮咚記帳 DinDon Ledger | Opshell's Blog」，改成只有產品名。
- 手機：按「加入封閉測試」之後，原本先看到一整支示意動畫手機，按鈕在下一個畫面；改成步驟在前。
- 功能演示頁 9 個分類錨點、隱私權政策 18 個目錄錨點都準。
- **沒做、留給使用者決定**：宣傳頁沒提 0.6.6 的新功能（預算與小精靈、新功能投票）。

## 後台改版

- 部落格的導覽列、頁尾、大標題占掉首屏三分之一 → frontmatter `navbar: false`、`footer: false`，改成左側選單（手機是頂端橫滑分頁）。
- 「現在要處理什麼」要一頁頁點進去看 → 總覽第一排五張卡、側欄數字。三個來源（回報統計、近 7 天逐台用量、投票候選）用 `Promise.allSettled` 各自抓。
- 顏色：待辦用黃不用紅（紅留給錯誤），處理完綠、純資訊中性灰；每張都有文字（「都審完了」），不只靠顏色。

## 踩到的坑

- 後端 `by_status` 只放數量不是 0 的狀態：沒有 `pending` 就是 0，一開始當成「還沒載入」顯示「—」。
- 窄螢幕時 VitePress 的 VPLocalNav（Return to top）是固定定位，蓋住後台自己的頂端分頁列。
- 預覽伺服器每次建置後都要重啟，不然新檔案 404（這次又踩到一次，已經寫進 skill）。

# 2026-09-29：後台總覽可點進去；LINE 回報匯入開單給後端

**使用者**：在叮咚後台添加功能：1. 使用者會在 LINE 回報，我想要後台幫我串 AI，讓我可以整包丟（文字或圖片），讓 AI 幫我判斷要合併還是怎樣。2. 總覽那邊點了可以直接去相關畫面，像點了裝置總數會直接跳裝置頁。

## 做了什麼

- `69fc09e`：總覽 6 張數字卡、5 張圖表的「詳細 →」都能點。「已凍結」跳到裝置頁並先篩好凍結。
  新增 `dashboard/navigation.ts`（分頁型別＋跳轉時的篩選，取一次就清）。
- 工作區 `b82c45b`：開單 #0068 給後端——AI 整理 LINE 內容（不寫入）＋後台建立回報（來源 LINE、可帶 LINE 上的時間）。

## 判斷

- **AI 一定要經過後端**：官網是公開靜態網站，不能有 AI 金鑰。後端現在也沒有「後台替某台裝置建回報」的 API，只有 bonus 件數（不能掛問題）。
- 使用者決定（AskUserQuestion）：LINE 回報**建成正式回報**（能合併、照權重計分）；截圖**只給 AI 看、不存**。
- 單裡特別提了**時間**：同一個問題最早那則拿全額權重，只用匯入時間的話，LINE 上先講的人會因為管理員晚匯入而吃虧。
- 隱私權政策可能要補一句「透過 LINE 等管道提供的回報」，請前端判斷。

## 等後端

#0068 的 api.md 寫好之後做「回報」頁的「LINE 匯入」：貼文字與圖片 → AI 拆出的每一則與建議 → 逐則選裝置、改內容、決定合併 → 建立。

# 2026-09-29：後台「匯入 LINE 回報」上線（#0068）、封測第二步補排查（#0069）

**使用者**：繼續（後端 #0068 做好並部署了）。

## 做了什麼

| commit | 內容 |
|---|---|
| `0193c07` | 回報頁「匯入 LINE 回報」（`LineImport.vue`、純邏輯 `lineImport.ts` 10 個測試）；回報多 `source`、列表來源標記與篩選；回報頁統計卡點了就篩列表 |
| `5a3b8f3` | 宣傳頁第二步加收起來的「裝不起來？」：帳號要一致、人在國外寫信開通 |
| 工作區 `879693f` | #0068 結案、#0069 回覆 |

## 判斷

- **名字只在剛好一台對得上時預選**：猜錯的話分數會算給別人，比不猜糟。
- **同標題的新問題只開一個**，開好後同組都改成「併到它」：有一則建失敗、改了再按一次時，才不會又開一個同名的問題（寫完自己檢查時發現的）。
- **截圖在瀏覽器先縮**：手機截圖常超過 1 MB 或是 webp，後端只收 1 MB 以內的 JPEG／PNG。畫到 canvas 轉 JPEG，縮到 1 MB 以內。
- **AI 整理的文字只用 `{{ }}` 顯示**：那是別人在 LINE 上打的字，後端也特別提醒。測試裡放了 `<script>`，頁面上沒有多出 script。

## 驗證

後端暫存複本開真的 handler（列裝置、問題、回報、建立問題、triage、建立回報），只把 Gemini 換成回固定結果的假伺服器（照後端自己的 `fakeTriage`）。
瀏覽器走完整流程：7.9 MB 的 PNG 縮完送出；阿明、小美自動選到，Ken 沒選前建立鈕擋住；沒時間的那則有提醒；
建立後查後端：4 則 `source=line`、`created_at` 是 LINE 上的時間（21:03 +08:00）、「匯出 CSV」只有一個問題掛 2 則。

## 踩到的坑

- **上一版把總覽數字卡的外框從 `li` 搬到 `button`，回報頁共用同一組 class、卡片裡還是 `<p>`，外框就不見了**，已經上線才在截圖裡發現。
  這次改成：點得進去的是 `button`、純數字的是 `.tile`，兩個共用外框。
- CDP 導到「同一個網址只差 `#`」不會重新載入頁面，拿到的是舊的建置；先導到 `about:blank` 再進來。
- 網站有 `scroll-behavior: smooth`，截圖前捲動要用 `behavior: 'instant'`。
- 宣傳頁的次要文字色是 `--dd-muted`，沒有 `--dd-text-2`。

# 2026-09-29：裝置備註開單（#0070）；LINE 匯入選人的快選

**使用者**：在裝置那邊添加我可以幫他加備註，讓我明確知道是誰的功能。／誰回報的那個也給一點基礎人選，比如常回覆的，讓我可以快選。

- 裝置備註：後端沒有欄位，也不能只存瀏覽器（換電腦就不見、LINE 匯入要靠它找人）→ 工作區 `d182ed4` 開 #0070：
  `admin_note` 只給後台、App 回應不帶、PATCH 可改、清除身分時一起清。搜尋在瀏覽器做（後端只收 id 與完整 email）。
- `f237b7b` 快選：這批其他幾則選好的 → 這個瀏覽器最近選過的（localStorage，記 10 台）→ 採計件數多的；不列凍結的、最多 8 個。
  驗證：本機後端（假 Gemini）＋瀏覽器，兩輪匯入的順序都對。
- 測試腳本的坑：等待迴圈用 `evalJs` 的回傳當條件，出錯時回的是「EXC …」字串（truthy），會提早結束。

# 2026-09-29：裝置的管理員備註上線（#0070）

**使用者**：看一下工作（後端 #0070 做好並部署了 revision 00027）。

- `24463d4`：裝置列表多一欄備註；搜尋框 id／email 走後端、其他字在瀏覽器比對（`deviceSearch.ts`，LINE 匯入共用）；
  詳情頁「備註」按儲存才送；LINE 匯入名字對不上時看備註（兩字以上、剛好一台）。
- 驗證：後端最新版暫存複本＋瀏覽器。後端去掉前後空白、零寬字元回 400；操作紀錄只記「有備註：否 → 是」。
- 工作區：#0070 回覆並結案。
- 測試腳本的坑：導航後沒等假登入的 callback 準備好就呼叫；搜尋後等 1.2 秒讀列表，讀到上一次的結果。都改成等到條件成立。

# 2026-09-29：宣傳頁放宣傳短片（R2）；宣傳頁動畫效能

**使用者**：行銷小精靈有產出短片，看哪個適合、能不能放進官網，順便優化官網的動畫；適合放的話檔案放 R2，不要硬塞進倉庫。

## 選哪一版

工作區 `docs/marketing/promo-video/` 有兩版，都是 18.5 秒、60fps、有「叮咚」音效：9:16（1080x1920，4.4 MB）與 4:5（1080x1350，3.7 MB）。
網頁用 **4:5**：桌機放在文字旁邊不會比畫面還高，手機（390 寬）一個畫面看得完；9:16 在手機上會佔滿整個螢幕，留給限動與 Reels。

## 做了什麼

- `c641711`：`pnpm dindon:promo` 把短片傳到 `dindon-demo` 的 `promo/`（雜湊檔名、快取一年），寫 `promo.json`。
  R2 共用部分抽成 `scripts/lib/dindon-r2.mjs`；**演示的 `--prune` 會刪掉清單外的所有檔案，改成跳過 `promo/`**，不然下次清演示會把短片刪掉。
  演示腳本重構後 dry run 產生的檔名與現有 `demos.json` 一致。
- `3720e6d`：開頭區塊後面加「18 秒看懂」（`PromoVideo.vue`）。
  - `preload="none"`，捲到一半以上才載入、靜音自動播；離開畫面就停；自己按了暫停的，捲回來不會又自己播。
  - 左邊四段章節跟著影片亮，點了跳到那一段；「開聲音」從頭播（叮咚在付款那段，半路開只聽到一半）。
  - 減少動態效果、省流量模式不自動播，停在封面等人按。章節文字也是看不到影片的人的文字版。
  - 手機上的順序是標題 → 影片 → 章節（一開始章節排在影片前面，影片被擠出第一屏）。

## 動畫效能

先量再改（無頭 Edge，`Performance.getMetrics`，捲完整頁、停 3 秒）：

| | 改之前 | 改之後 |
|---|---|---|
| 捲動時每格重算樣式 | 8.5 次 | 1.9 次 |
| 停在開頭 3 秒：重算樣式／重排 | 180／138 次 | 1／1 次 |
| 停在頁尾 3 秒：重算樣式／重排 | 180／46 次 | 21／6 次 |
| 停在開頭時在跑的動畫 | 21 個 | 5 個（只有開頭的鈴鐺與通知卡） |

- **加入封測的示意手機一直在重排整頁**：步驟卡動 `border-color`、進度條動 `width`、手指動 `top/left`，每一格都要重算。
  改成疊一層黃框動透明度、進度條 `scaleX`、手指外面包一層和畫面一樣大的 track 用 `translate(%)` 移動。量過三次點擊，手指中心和按鈕中心差 3px 以內。
- **循環動畫在看不到的地方照跑**：加 `data-loop`，出畫面加 `is-paused`（`animation-play-state: paused`）。
  整塊一起停，鈴響和通知卡片不會錯開。
- **視差量一個寫一個**：每量一次都要等上一個寫入重新排版。改成先全部量完再一起寫，值沒變不寫；開頭區塊捲出去就不再算。

## 踩到的坑

- 無頭 Edge 開太多分頁，量測的分頁在背景，`requestAnimationFrame` 和計時器被節流、Promise 永遠不回來。重開一個乾淨的瀏覽器（關掉背景節流）。
- `ffmpeg` 沒裝：用暫存區的 venv 裝 `imageio-ffmpeg` 拿執行檔來抽影格、找分段時間（0、3.6、9.4、12.9 秒）。上傳腳本本身不需要 ffmpeg。

# 2026-09-29：後台 API 控制台（#0074）

**使用者**：在後台加一個 API 的視覺化檢視，現有的 API 都做上去，可以測試、每支都有說明，介面和操作方便度起碼要超越 Postman。

## 先卡住的三件事（都要後端配合，開 #0074）

1. **說明不能寫死在官網**：`api.md` 在私有的後端倉庫，後台卻是公開網站（打包出去的 JS 誰都下載得到）；裡面有限流怎麼算、金鑰牆、`ADMIN_TOKEN` 放哪。
   → 請後端出**管理員才拿得到**的目錄 `GET /v1/admin/api-catalog`，最好從路由表產生、有測試保證每條路由都列到。
2. **App 的端點瀏覽器打不到**：CORS 只開在 `/v1/admin/*`、`/v1/account/*`，`/v1/me`、`/v1/ai/*` 在預檢就被擋。→ 請評估開到全部 `/v1/*`。
3. **測 App 端點要一把裝置 key**，從控制台領新的會在正式資料庫多一台、混進統計與排行榜。→ 請做不計入統計的測試裝置。

## 做了什麼（`b4c7e01`）

- 後台多一個「API」分頁（`dashboard/console/`），點進去才載入（markdown-it 在這包裡，146 KB）。
- 左邊：搜尋（`/` 跳過去、上下鍵、Enter）、依影響（唯讀／寫入／不可逆／呼叫 AI）與認證篩選、依章節分組、歷史。
- 右邊：說明（後端給的 markdown，html 關掉）＋試打：路徑參數、query（有列舉的變下拉）、JSON 編輯器（Tab 縮排、指出第幾行第幾字錯、整理格式、還原範例）、
  選檔案轉 base64（不放進編輯器）、`⌘/Ctrl+Enter` 送出、可以取消。
- 回應：狀態碼的意思（端點自己的錯誤說明優先）、時間、大小、標頭、JSON 樹（收合、點 key 複製路徑）、圖片。
- **契約檢查**：後台畫面在用的 23 支，拿後台自己的 Parser 驗一次回應；後端改了格式，這裡會比哪個分頁壞掉先看到。
- 安全：正式環境寫入與呼叫 AI 先問、不可逆的要打字確認；管理 API 快撞到每分鐘 30 次先提醒。
  複製成 curl／fetch 時憑證用環境變數。歷史只記路徑與狀態碼（localStorage 部落格頁面讀得到），body 與回應只留在分頁記憶體；測試裝置的 key 存 sessionStorage。
- 每支端點有自己的網址 `#api/<id>`。目錄還沒上線時顯示「等 #0074」，「自訂請求」照樣能打管理 API。

## 驗證

假後端（有目錄、會回錯格式的一支、會回圖片的一支、不開 CORS 的 `/v1/me`）＋無頭 Edge 走完整流程：
搜尋與鍵盤、送出、契約檢查抓到 `device.tokens` 是字串、404 顯示後端的訊息、空的路徑參數擋住、圖片顯示、不可逆要打「POST」、
沒有 key 擋住、`/v1/me` 顯示 CORS 說明、附加檔案後端收到 108 字的 base64、歷史不含 email／token／base64、點歷史帶回 body、`#api/<id>` 直接打開、
說明裡的 `<script>` 只顯示成文字。單元測試 +14（共 65）。

## 踩到的坑

- 新開的無頭瀏覽器要先 `Page.enable`，`addScriptToEvaluateOnNewDocument` 才會生效；假的 `window.google` 要設成不能覆寫，不然真的登入腳本載入後會蓋掉。
- 測試直接改 `input.value` 再丟 `input` 事件不可靠，改成真的打字（`Input.insertText`）。
- V8 新版的 `JSON.parse` 錯誤不一定附位置，自己寫了一個只找位置的小掃描器。
- zod 4 的 `z.unknown()` 放在物件裡，缺欄位會報 nonoptional，要加 `.optional()`。

# 2026-09-29：隱私權政策同步 v0.6.7、刪除頁（#0073）；開 #0075 重錄演示

**使用者**：檢查工作。（溝通板上指名給網頁的是 #0073。）

- `3000b37`：`pnpm dindon:privacy` 同步到「2026-09-29（適用 v0.6.7 起）」。沒等 0.6.7 上架：新寫進去的常態打卡、LINE 回報交給 Gemini、管理員備註，後端都已經在正式環境跑了。
- 刪除頁 `account/content.ts`：
  - 「會刪掉」補每日打卡（只留全勤達成）、管理員備註；回報含 LINE、Email 整理的
  - 單獨刪打卡：原本寫「從 Beta 活動排除」，打卡改成常態之後不對了，改成寫信或刪除帳戶
  - 手機資料的按鈕名稱改成 App 現在的「一鍵全清」（原本寫的「刪除所有資料」是舊的），並註明連續天數清不掉
- 宣傳頁的文字沒有「從選單進帳單」；演示 14、16、38 是 0.6.6 的畫面 → 工作區開 #0075 請前端 0.6.7 後重錄，我再傳 R2。
- 同一天另外做的：Gemini 帳單匯出 BigQuery、Play 報表授權的教學文件（工作區 `docs/ops/`），陪使用者設定到一半（帳單資料還在補、Play 報表還沒產生）。

# 2026-09-29：API 控制台接上後端（#0074 結案）

**使用者**：看工作。（後端做完 #0074 並部署 revision 00029：目錄、CORS 開到全部、測試裝置。）

- `3e9397b`：
  - 測試裝置：控制台沒有 key 時先找 `is_test` 的裝置，有就「重發 key 並使用」、沒有才「建立測試裝置」（後端沒有刪除，要重用）。
    key 只顯示一次，當下可以複製去 curl；存 sessionStorage（連同是哪一台）。
  - 共用同一段 `doc_md` 的端點（10 組）互相連結。
  - 裝置 `is_test`：裝置頁與詳情標「測試機」；總覽的數字、LINE 匯入的快選與猜人都排除。
  - 說明表格裡的欄位名稱不再被拆成兩行（整篇設了 `overflow-wrap: anywhere`，表格裡改回 normal）。
- 驗證：後端 `9128ded` 的暫存複本，在 main 套件裡寫一個只在本機跑的測試，直接用真的 `newRouter`（SQLite、`ADMIN_TOKEN` 設成假登入的那串憑證）；
  網頁預覽開在 **8086**（後端 CORS 放行的本機埠），CORS 也是真的。目錄 71 支解析通過、`/v1/me` 用測試裝置 200、重發後舊 key 401。
- 工作區：#0074 回覆並結案。
- 坑：`pnpm test` 單獨跑某個檔案時卡住一次，改用 `perl -e 'alarm N'` 包著跑；macOS 沒有 `timeout` 指令。

# 2026-09-30：視覺翻新實驗（分支 redesign-2026-10，還沒併進 main）

**使用者**：做視覺翻新實驗：從 main 開分支 redesign-2026-10、不推 main。範圍是部落格（首頁、文章版型、文章列表與側欄）和叮咚後台；
叮咚的宣傳頁、演示頁、隱私權政策、刪除帳號頁不動。先用 frontend-design、ui-ux-pro-max 給兩三個方向問我，照 web-code-style 落地，設計系統頁跟著更新，
在本機 8086 給我看、pnpm check 要過。

## 方向

提了三個：A「對抗健忘的筆記本」（閱讀優先）、B「man page」（鍵盤優先）、C「星圖」（首頁大膽）。使用者選**混搭：部落格 A、後台 B**。
ui-ux-pro-max 的資料庫給的是通用建議（桃紅強調色、毛玻璃），只拿它的無障礙與密度規則當底線；方向是從部落格自己的東西來的：
首頁那句「對抗我的健忘」、名字裡的 shell、鐵人賽系列、現有的品牌黃。

## 做了什麼（分支上 7 個 commit）

- **token**（`_variable.scss`）：`--nb-*` 的紙、墨、藍墨水、紅筆、螢光筆，字級照古典比例（12／14／16／18／21／24／36／48），間距 8 的倍數；
  蓋掉 VitePress 的顏色。叮咚那四頁用 `:root:not(:has(.dindon-page, .dindon-privacy, .dindon-account))` 排除，**截圖確認隱私權政策頁完全沒變**。
  對比度都算過：淺色 ink 13.5、ink-2 6.7、ink-3 4.8、link 6.1 : 1；ink-3 一開始對凹下去的底只有 4.17，調深了。
- **字型**：內文 Noto Serif TC 走 Google Fonts（切片，一頁只下載用到的字）。現有的 Noto Sans TC 是自己放的整套，一個字重 2.9 MB，之後可以考慮也改切片。
- **文章版型**：拿掉卡片，中間一欄 38 字、左系列、右頁邊批註（本頁、數字、常用標籤）；粗體改螢光筆畫線、行內程式碼改墨色。
  內文排版寫在 `_notebook.scss`，只套在 `.article-layout .vp-doc`（全域的 `.vp-doc` 還有政策頁在用）。
- **首頁**：改成目錄頁（`features/home/`）：書名、介紹、「最近寫的」、一個分類一章，標題與日期之間用書本目錄的點線。
- **時間軸、標籤頁、專區列表**：同一套條目，細線分開；標籤頁左欄像書後的索引；英文字改中文。
- **後台**：同一組色票＋man page 的皮（等寬標題、方角、密表格、指令提示那一行）＋鍵盤（1～8 切分頁、r 更新、? 快捷鍵表）。
- **設計系統頁**：四條原則、新色票（附對比度）、排版示範改用 `.nb-prose`（跟文章頁同一份樣式），舊色票標明誰還在用。

## 順手修掉的既有問題

- 文章版型的手機規則寫到不存在的 `.blog-grid-container`，窄螢幕三欄擠在一起。
- `_basic.scss` 的舊文章排版會蓋掉新的顏色（`.article-layout__article a`），拿掉。
- 時間軸與標籤頁的 `DateBadge` 都叫 `.date-badge` 而且是全域樣式，會互相蓋；各自包在頁面 class 底下。
- 後台深色模式的主要按鈕是淺藍底白字，看不清楚，字改紙色。

## 踩到的坑

- `.nb-home h2 { margin: 0 }` 這種元件開頭的重設，權重比 `&__heading` 高，把間距歸零；改用 `:where(h1, h2, p)`。
- 一次跑 `lint:style && … ; git add` 時 stylelint 失敗了 commit 照樣跑，補了一個排版 commit；之後檢查要全部過才 add。

# 2026-10-01：翻新第二輪——後台外殼、部落格改走「稜鏡」

**使用者**：後台樣式 OK，但部落格視覺還沒有我原本的好，感覺不太到創意和優勢，再試試別的。
後台左邊側欄要能縮成只剩 icon；內容區要有 header 放操作按鈕；上面那個黃色游標能不能真的輸入，做成偽終端機讓純鍵盤操作更簡單；
要有白天黑夜切換；表格表頭要吸頂；還要有 footer 顯示一些資訊。

## 後台（`bf3e32c`）

- **外殼**：整個後台固定一個畫面高，只有內容區會捲；由上到下是終端機列、頁首、內容、頁尾。
- **側欄收合**：`[` 或側欄底下的按鈕，記在這台瀏覽器（localStorage，只是個人偏好）。收起來時字留給螢幕閱讀器，待辦數字變成圖示右上角的小標。
- **終端機**（`terminal.ts` 解析＋測試、`AdminTerminal.vue` 畫面）：`cd`／`dev <字> [-f]`／`fb [pending|bug|idea|no|all]`／`triage`／`api <字>`／
  `r`／`reload`／`theme [dark|light]`／`side`／`clear`／`help`／`logout`，直接打分頁名稱、中文或數字也行。
  Tab 補完（先補到共同開頭、再按輪流換）、↑↓ 歷史（只放記憶體：裡面可能有搜尋過的 email）；`:` 或 ⌘K 叫出來。
  指令做完就把鍵盤還給頁面（像指令面板），列的右邊留著最後一句回應。終端機列兩種模式都是深底（`--term-*` token），黃色游標才亮。
- **頁首**：左邊標題與說明，右邊是這一頁的操作。各分頁用 `AdminActions.vue`（`<Teleport defer>`）把重新整理、新增、快速審核、匯入 LINE 送進來；篩選條件留在內容裡。
- **深淺色**：終端機列右邊的按鈕、或 `theme` 指令（用 VitePress 的 `isDark`，跟部落格同一個設定）。
- **頁尾狀態列**：打哪個後端（本機是黃底，一眼分得出來）、誰登入、登入還剩幾分、待辦數字幾點更新的、抓失敗幾項、快捷鍵提示、登出。
- **表頭吸頂**：表格外面原本是 `overflow-x: auto`，它讓表頭吸不住（吸頂看的是最近的捲動容器）。改成 `.dd-table-scroll` 自己捲兩個方向，
  最高到內容區那麼高——內容區設成 `container-type: size`，框用 `100cqh` 算高度。API 控制台左欄原本的 `100vh` 也改成 `100cqh`。
- **修掉一個上一輪留下的 bug**：快速審核的判定鍵是 1、2、3，全域的 1～8 切分頁先接到，按 1 會直接跳回總覽。
  審核開著時設 `shortcutsPaused`，全域快捷鍵讓開；終端機的 Esc 也不往外傳（快速審核的 Esc 是「關掉」）。
- 驗證：本機真後端（多塞 60 台裝置）＋無頭 Edge：`: → dev 測試者 → Enter` 到裝置頁搜尋、捲表格表頭停在框頂、`[` 收合、`theme dark`、
  `triage` 後按 1 不會跳頁、`api feedback` 搜尋、手機寬度。

## 部落格：「稜鏡」（`151fb9c`）

**為什麼換**：筆記本太安靜，原版的個性（深色、琥珀→紫的漸層、那張「筆記本裡的宇宙」插畫）都不見了，變成誰的部落格都可以用的樣子。
這一版從原版出發往上加，只在首頁大膽一次。

**從哪裡來**：〈Opshell 的哲學意義〉——O 是「全」（奇點、禪宗的圓相），P 是指標，「像光經過三稜鏡，你就是其中一抹獨特的顏色」，Shell 是介面。
原版的琥珀→紫漸層本來就是光譜的一段。

- **退回原版**：文章版型、時間軸、標籤頁、文章列表、側欄、`Tag`、設計系統頁都從 main 拿回來；筆記本的配色（`--nb-*`）改成只套在後台（`:root:has(.dindon-dashboard)`），後台長相不變。
- **首頁**（`features/home/`）：舊首頁的三句話與入口按鈕原樣留著；右邊的插畫變成**稜鏡**（`PrismHero.vue`）：一道光從左下射進 O（插畫裡的宇宙圓裁成圓形），
  從右邊散成各分類的光，光的寬度照篇數開根號（31 篇跟 2 篇差 15 倍，直接比例小的會看不見），點了從那一類的第一篇讀起；滑過一道光其他的變暗。
  少於兩篇的分類併成「其他」，連到時間軸。幾何在 `prism.ts`（`buildRays`，有測試）。進場只有一次：光射進來、再往右散開；關閉動態時直接是畫好的樣子。
  底下是「最近寫的」六張卡片（頂端一條分類色），最後一段「為什麼叫 Opshell」摘三句話連到那篇文章。
- **光譜**（`--pr-*`、`shared/utils/spectrum.ts`）：琥珀、橘、珊瑚、洋紅、紫、靛六色，一個分類一色（文章多的先指定，免得撞色；新分類用雜湊）。
  首頁的光、卡片、時間軸的圓點（滑過時填滿）、文章標題下那一小段都用同一個顏色。光譜色只畫線、點、光，不當小字。
- **文章頁**：導覽列底下一條光譜當閱讀進度（`scaleX`，不動寬度）；標題下一小段分類色。
- **夜空**：深色模式的底色帶一點紫（`#17151E`），只套部落格。
- **淺色模式的品牌橘加深到 `#B4600A`**：原本的 `#dc8419` 當字在白底只有 2.9 : 1，現在 4.6 : 1；深色模式不變。
- **設計系統頁**：加「Spectrum（稜鏡）」與「Night Sky」兩組色票與用法說明。
- 叮咚的四個公開頁：截圖確認隱私權政策頁的配色沒變。

**保留的修正**（退回原版時重新補上）：文章頁 RWD 規則寫錯 class（手機三欄硬擠）、時間軸與標籤頁 `.date-badge` 互相蓋、資料小工具的點改成 `button`。
另外修掉色票頁的樣式從來沒套到（寫在 `.color-palette` 底下，但頁面上的 class 是 `.color-palette__container`）。

## 踩到的坑

- 閱讀進度一直是 0：computed 第一次算的時候文章還沒撐開，`max` 是 0 就直接回傳，**沒讀到 `y`**，之後就不會重算。先讀 `y` 再判斷。
- 稜鏡的光暈用 SVG 濾鏡，預設的濾鏡範圍會把模糊切成方形邊（淺色模式看得到）；改成 `userSpaceOnUse` 給夠大的範圍。
- 本機驗證用的 `go test` 後端，預設 10 分鐘就被砍掉；要長時間開著得加 `-timeout 0`。
- 手機上稜鏡整張縮到一半以下，標籤只剩 9px；在 SVG 座標裡把字放大（26／20），縮完約 12px。

## 補：裝置頁兩個捲軸

**使用者**：裝置那一頁因為有兩個捲軸，有一部分的 content 被藏在下面了。理論上應該只有 content 會有捲軸，content 的高度是不是沒有扣掉 header 和 footer？

- 量過：內容區的高度有扣（900 − 終端機列 44 − 頁首約 84 − 頁尾 30 = 742）。錯在表格框：我讓它自己捲、最高到「內容區那麼高」，
  但框上面還有搜尋列與提示，加起來超過內容區，內容區也跟著要捲——兩個捲軸，下一頁按鈕被擠到下面。
- 改成只有內容區會捲（`5b2eff6`）：寬螢幕的表格框不再是捲動容器（量過 1440 寬時每一頁的表格都放得下，含裝置詳情打開時），表頭直接吸在內容區頂端。
  窄螢幕（≤ 900px）表格可能比畫面寬，框只橫向捲、不限高度，這時表頭不吸。各分頁自己的 `__scroll { overflow-x: auto }` 拿掉。
- 內容區上方的留白從 `__content` 移到 `__page`：吸頂的東西會停在捲動容器的 padding 底下，原本表頭上面露出 24px 捲過去的列。
- 驗證：本機真後端，捲 400px 後表頭距內容區頂端 0、捲到底下一頁按鈕在畫面內；手機寬度只有一個直向捲軸。
- 坑（第二次）：`檢查 && … && 寫記錄` 跟 `git add` 分在兩行，stylelint 失敗了 commit 照樣跑、推上去了，補一個排版 commit。
  之後檢查與 commit 串在同一條 `&&` 裡。

## 補：首頁再發揮、標籤頁的光譜索引

**使用者**：先改部落格。方向抓得很好，但首頁可以更好，再發揮看看；tags-list 也是，一直對左邊的標籤列表感到粗糙和不滿意。

**首頁**
- **稜鏡變成篩選**：每道光是切換鈕（`role="button"`、`aria-pressed`，Enter／空白鍵也能按）。點一道光，底下的文章換成那一類、
  標題線變成那一類的顏色，旁邊有「看全部分類」「從第一篇讀起」；點入射的白光或 O 回到全部——白光就是所有顏色加在一起。
  選了一道光，其他的暗下去，白光也變淡，提示「按這裡回到全部」。「其他」那道光包含哪些分類記在 `Ray.members`。
- **兩個三十天**（`SeriesTracks.vue`）：TypeScript 與 VitePress 鐵人賽一天一格排成一條，滑過一格顯示「08 Day08 - Array Type」，點了直接讀。
  格子不進 Tab 順序（一次多 61 個停留點），鍵盤走每條底下的「從第一天讀起／最後一天」。
- **hero 多一句**「寫了 83 篇，還有 196 篇在坑裡」：舊側欄的 Posts／Drafts。
- 換一類時卡片淡入（回應點擊的動態；關閉動態時沒有）。

**標籤頁左欄：光譜索引**（`tagSpectrum.ts`，有測試）
- 原本 31 個標籤一樣大、一樣灰，一長串在小框裡捲。現在 3 篇以上的一個一列，底下一條光：**長度是篇數、顏色照它底下文章的分類比例分段**
  （#鐵人賽 一半 TypeScript 的靛、一半 VitePress 的琥珀）。選到的那一列光變粗。
- 1～2 篇的 21 個收成「零星的」一段文字：分類色小點＋名字＋篇數，不加框，一行三四個。
- 排序切換：篇數／最近寫的。打字篩選時全部一列一列列出來。
- 右邊的標籤介紹多一條同比例的光與分類圖例。
- 分類的中文名稱搬到 `shared/utils/spectrum.ts`（首頁、標籤頁共用）。
- 左欄不再有自己的捲軸：1440×900 剛好放得下（量過 805／805）；畫面更矮時整個左欄一起捲。
  坑：可以捲的 flex 欄會把子元素壓扁，篩選框被壓成一半高，加 `flex-shrink: 0`。窄螢幕排成兩欄。
# 2026-10-01：後台看得到使用者有沒有開 App（打卡月曆）

**使用者**：後台可以看到使用者近期有沒有開過 App 嗎？（聽完現況後）都加。

- 現況：App 0.6.7 起每天第一次打開就是當天的打卡（台灣時間），後端 9/29 就有 `GET /v1/admin/devices/:id/checkins` 與給／收回（#0067），
  但網站沒接；裝置列表的「最近使用」是最近一次用 **AI**，只記帳不用 AI 的人永遠是「從未」。
- **裝置詳情多一張「打開 App」**（`DeviceCheckins.vue`，放在基本資料下面）：
  - 最近一次（幾天前）、今天開了沒、連續與最長、總共幾天、活動的連續（鐵人看的）、補送額度。
  - 最近 12 週的月曆，一格一天、顏色分來源（當天連線、事後補送、後台給的、從手機匯入），今天加框。
  - 還沒匯入舊紀錄的裝置（多半還在 0.6.6 以前）提示：那之前只有活動期間的打卡。
  - 手動給／收回：點月曆選開始、再點選結束（或直接填日期），按一次變「確定給 9/20～9/26（7 天）」再按才送；
    前端先擋顛倒、未來、早於 9/6、超過 366 天。給的算進獎勵、收回不收回鐵人，都寫在按鈕下面。改完重讀裝置（給了可能剛好湊滿鐵人）。
  - 操作紀錄的 `checkin-grant`／`checkin-revoke` 與欄位（從、到、新增、收回…）顯示中文。
- 資料層：`GetDeviceCheckinsParser`（`days`、`rejected` 是 Go 的 slice，可能是 null）；來源用字串不用列舉，後端多一種來源時畫面照樣顯示。
  月曆與範圍檢查是純函式（`checkins.ts`），有測試。
- 列表的「最近打開」欄與總覽「近 N 天有開 App 的裝置」要後端在裝置列表多給欄位，開單給後端。
- 驗證：本機真後端，給 9/20～9/26 → 7 天、最長 7；收回 9/23 → 6 天、最長 3；操作紀錄兩筆。
  翻新分支的預覽佔著 8086，這次在另一個 worktree 從 main 開 8087；暫存後端的 CORS 另外放行 8087（只改暫存複本）。
- 坑：CDP 導向跟目前一樣的網址（只差 #）不會重新載入，畫面停在上一次的錯誤，要先導到 about:blank。

# 2026-10-01：後台翻新上線（部落格的翻新留在分支）

**使用者**：後台的部分沒問題，直接幫我上到 main；部落格風格先不要。

- 從 `redesign-2026-10` 只拿 `docs/features/dindon/dashboard/` 的 15 個檔案（外殼、終端機、頁首操作、頁尾、表頭吸頂、快速審核的快捷鍵修正），
  加上 `_variable.scss` 裡後台用的兩組 token：man page 配色（`--nb-*`，只套在 `:root:has(.dindon-dashboard)`）與終端機列的 `--term-*`。
  部落格的稜鏡（`--pr-*`、夜空、首頁、標籤頁、文章頁）都沒帶，正式站的部落格不變。
- 跟上一節的打卡月曆（`4b468be`）一起上。兩邊改的檔案沒有重疊。
- 驗證（main 的 worktree 開 8087 ＋ 本機真後端）：只有內容區一個捲軸、表頭吸頂、`[` 收合、`theme dark`、`: dev 測試者`、
  `triage` 後按 1 不跳頁、`api feedback` 找到 15 支、打卡給／收回與操作紀錄；`pnpm check` 全過。
- 翻新分支的說明見前面「視覺翻新實驗」「翻新第二輪」兩節；部落格的部分等使用者決定。
