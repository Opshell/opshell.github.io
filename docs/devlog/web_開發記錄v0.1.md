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
