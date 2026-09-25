---
name: web-dindon
description: 叮咚記帳在官網上的五頁（宣傳頁、功能演示、後台、隱私權政策、刪除帳號）怎麼維護——檔案在哪、api.md 是唯一規格、apiBase 與 ?api= 本機覆寫、Google 登入的 token 只放記憶體、隱私權政策與演示素材由腳本從 App 倉庫同步、後台 noindex 且不載第三方腳本、push main 就上線、什麼時候要開單給前端／後端／上架。碰 /dindon/ 底下任何東西時用。
---

# 叮咚記帳的五頁

| 網址 | 頁面 md | 元件 | 給誰看 |
|---|---|---|---|
| `/dindon/` | `docs/pages/dindon/index.md` | `features/dindon/components/DinDonLanding.vue` | 大眾、招募封測 |
| `/dindon/demo/` | `docs/pages/dindon/demo/index.md` | `features/dindon/demo/components/DemoPage.vue` | 大眾：41 項功能的錄影演示（溝通板 #0055） |
| `/dindon/privacy/` | `docs/pages/dindon/privacy/index.md`（**產生的**） | 純 markdown，`layout: doc` | Play Console 要交出去的網址 |
| `/dindon/account/` | `docs/pages/dindon/account/index.md` | `features/dindon/account/components/AccountDeletion.vue` | Play 要求「不用裝 App 也能刪帳號」的網址 |
| `/dindon/dashboard/` | `docs/pages/dindon/dashboard/index.md`（`noindex`） | `features/dindon/dashboard/components/DashboardApp.vue` | 只有管理員 |

入口 `features/dindon/index.ts` 只 export 這四個元件。

## 開工先做

1. 讀工作區 `coordination/board.md`，有沒有指名給網頁 Claude 的單（skill `cross-repo-handoff`）。
2. 要接新端點或欄位，先讀 `DinDon_BackEnd/docs/api.md` 對應那一節。**規格只有這一份，只有後端改**；後端常常已經做好了，不要自己猜格式。
3. `git status`，只 add 自己改的檔案。

## 檔案地圖

```
features/dindon/
├── constants.ts            ← 宣傳頁全部文案與數字：BETA_SEATS、GROUP_URL、PLAY_OPTIN_URL、betaRewards…
├── apiBase.ts              ← 後端網址；localhost 時可用 ?api= 覆寫
├── useGoogleAuth.ts        ← Google 登入，後台與刪除頁共用；client ID 在這（公開的）
├── components/
│   ├── DinDonLanding.vue   ← 宣傳頁；配色是 App 的 Sicily 色票（--dd-* 變數）
│   ├── BetaJoinGuide.vue   ← 加入封測的兩步（群組 → 測試連結）＋示意小手機；文案是 constants.ts 的 joinSteps。
│   │                         手指的 top 是量出來的按鈕位置，改了示意畫面的排版要重量
│   └── DinDonBell.vue      ← 鈴鐺動畫，讀 --dd-story-duration / --dd-story-delay
├── hooks/useLandingMotion.ts ← data-reveal 進場、data-parallax 視差；reduced-motion 時不動
├── account/
│   ├── api.ts  content.ts  components/AccountDeletion.vue
├── demo/                   ← 功能演示頁
│   ├── demos.json          ← **產生的**（pnpm dindon:demos），App 倉庫 store/demos/index.json 的副本
│   ├── catalog.ts  types.ts
│   ├── hooks/useDemoOverlay.ts ← 依影片秒數算手指位置與說明泡泡（步驟格式見 App 倉庫 store/demos/README.md）
│   └── components/         ← DemoPage（目錄＋對話框）、DemoPlayer（外框、影片、疊圖、控制列）、diagrams/（第 4、10、39 項的圖解）
└── dashboard/
    ├── api.ts              ← /v1/admin/*，型別註明 api.md 第幾節；AdminApiError(status, message).needsLogin
    ├── useAdminCall.ts     ← 帶 token 呼叫；401 就 markExpired 回登入畫面；errorMessage()
    ├── useMergeCandidates.ts  format.ts（formatInt、formatDateTime、PLAN_LABELS）
    ├── charts/             ← BarChart、ColumnChart、ticks.ts（自己畫的 SVG，沒用圖表套件）
    └── components/         ← DashboardApp（分頁殼）、OverviewPanel、DeviceManager、DeviceDetail、
                               FeedbackPanel、FeedbackTriage、MergePicker、PromoPanel、UsageReport、UsageWatch
```

截圖在 `docs/public/images/dindon/*.webp`（icon、home、stats、badges、items、voice、statement、event）。
App 出新版要換圖時，從模擬器拍、轉 webp、檔名沿用。

## 硬規則

- **沒有祕密**：這是公開的靜態站，程式碼任何人看得到。Google client ID 本來就是公開的，權限全部由後端驗 ID token
  （後台驗管理員名單、刪除頁驗帳號本人）。看到有人想把 key、密碼、白名單放進來，擋下來。
- **token 只放記憶體**（`useGoogleAuth.ts` 的模組層級 `ref`），不進 `localStorage`：這個網站每一頁都會載入第三方腳本。
- 後台與刪除頁**不載入第三方腳本**：`theme/index.ts` 的 `NO_THIRD_PARTY_PATHS`。加新的需要登入的頁面時要一起加進去。
- 後台 `noindex, nofollow`、不進 nav、不設 `isPublished`。
- 錯誤訊息是給使用者看的中文；後端回的 `error` 欄位也是中文，可以直接顯示。
- 表單送出前先在前端擋一遍（上限、必填），但**後端才是真正的把關**，前端的規則要跟 api.md 一致。
- 宣傳頁的動態：只有位移、透明度、淡淡陰影；沒有描邊、高光、漣漪圈（跟 App 的平面風格一致）。
  `useLandingMotion` 全部在 `onMounted` 之後才動，SSR 的 HTML 內容完整，`prefers-reduced-motion` 時什麼都不做。

## 本機開發

```bash
pnpm docs:dev                       # port 8086
# 瀏覽器開 http://localhost:8086/dindon/dashboard/?api=http://localhost:8090
```

`apiBase()` 只在 hostname 是 `localhost` 時才認 `?api=`，正式網站一律打 Cloud Run。
Google 登入在 `localhost:8086` 能用是因為 GCP 那個網頁 OAuth client 的「已授權的 JavaScript 來源」有登記它；
換 port 就登不進去。正式站登記的是 `https://opshell.me`（不是 `opshell.github.io`，因為會轉址）。

## 隱私權政策：改原稿，不改產物

```bash
pnpm dindon:privacy                 # 預設讀 ../DinDon/DinDon_Android/app/src/main/assets/privacy_policy.md
pnpm dindon:privacy /別的路徑.md    # 原稿在別處
```

- 原稿只有一份，在 App 倉庫，App 內頁讀的也是它。政策內容有問題→開單給前端 Claude 改原稿，改完再跑腳本。
- 網頁專屬的部分（標題、刪除入口的提示框、樣式）在 `scripts/sync-dindon-privacy.mjs` 裡，要改這些就改腳本。
- 產出要 commit（CI 拿不到另一個倉庫）。commit 訊息 `chore(dindon): 隱私權政策同步到 M/D 版`。

## 功能演示：素材從 App 倉庫複製

```bash
pnpm dindon:demos                   # 預設讀 ../DinDon/DinDon_Android/store/demos
```

- 前端 Claude 錄影、產 `index.json`（規格在那邊的 `README.md`），錄好會在溝通板回覆。網頁只要重跑腳本、commit：
  影片與封面進 `docs/public/images/dindon/demos/`、順便縮出 `*.thumb.webp` 給目錄用、舊檔自動刪掉，`index.json` 複製成 `demo/demos.json`。
- 手指、紅框、泡泡的時間參數在 `useDemoOverlay.ts` 頂端。drag 照 `pathMs` 走、紅框照 `box` 畫（兩者都是錄影時實測的）；泡泡的位置規則在 `bubbleAbove()`。
- 圖解要跟 App 實際行為一致：第 4 項的前後對照是拿 `NotificationParser.deIdentify` 真的跑出來的，App 改規則要跟著改。
- **對話框裡的元件要用 `defineAsyncComponent` 載入**：VitePress 第一次載入用「精簡版」頁面程式，會把靜態 HTML 清成空字串
  （假設伺服器已經渲染過）。只在瀏覽器端才渲染的東西（對話框、`v-if` 打開的內容）如果整塊是靜態的，打開會是空的；
  拆成獨立檔案就不會被精簡。檢查方法：`grep -o 've("",[0-9]*)' docs/.vitepress/dist/assets/<頁面>.lean.js`。

## 文案數字要對得上

`constants.ts` 裡的封測名額（`BETA_SEATS`）、獎勵（`betaRewards`）、群組網址、Play 測試連結（`PLAY_OPTIN_URL`，2026-09-25 審查通過後填上，兩步驟引導的第 2 步用它）
都是對外承諾，要跟 App 的「獎勵說明」、`docs/roadmap/beta-todo.md`、Play Console 一致。
改了要開單通知前端（App 內文案）與上架小精靈（Play 的商店資訊）。

## 上線

只有 `main` 一支（2026-09-22 起）。commit 後 `git push origin main`，GitHub Actions 跑 lint → typecheck → build → 部署，
紅了不會上線。本機先 `pnpm check` 過再推。推完到 Actions 看綠了，再開 `https://opshell.me/dindon/` 確認。

## 什麼時候要開單

| 情況 | 開給誰 |
|---|---|
| 需要新端點、欄位、錯誤碼；後端回的格式跟 api.md 不一樣 | 後端 Claude |
| 隱私權政策原稿要改；App 內文案要跟網頁一致；要新截圖 | 前端 Claude |
| 政策網址、刪除帳號網址、商店文案有變 | 上架 Claude |
| 網頁上線了、網址變了（只是通知） | 相關的人，狀態 `僅通知` |

溝通板上**不抄介面定義**，只寫「api.md 第幾節」。
