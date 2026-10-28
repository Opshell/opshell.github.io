---
layout: resume
title: Resume
description: Opshell 的履歷：Senior Front-End Engineer，十年前端為主的全端工程師；2026 年起一個人帶多個 AI 代理做產品，叮咚記帳與 Flowsker 都已上線。

portrait: /images/resume/portrait.webp
name: Opshell
jobTitle: Senior Front-End Engineer
tagline: 帶著 AI 團隊交付產品的全端工程師。十年前端，擅長把混亂的專案收斂成所有人都能接手的架構。
contact:
  - icon: mail
    text: phenomx9990@gmail.com
    href: mailto:phenomx9990@gmail.com
  - icon: call
    text: +886 938-643-321
    href: tel:+886938643321
  - icon: language
    text: github.com/Opshell
    href: https://github.com/Opshell
  - icon: language
    text: linkedin.com/in/opshell
    href: https://www.linkedin.com/in/opshell
  - icon: location_on
    text: Tainan, Taiwan
    href: https://maps.app.goo.gl/9q1aF5LEaEihmDh37
skills:
  - type: Front-End · 10y
    items:
      - { icon: colorful-typescript, text: TypeScript, color: 3178C6 }
      - { icon: colorful-vue, text: Vue 3, color: 4da986 }
      - { icon: colorful-vite, text: Vite, color: 9B5FFC }
      - { text: Pinia, color: FFD859 }
      - { text: Zod, color: 3E67B1 }
      - { text: TanStack Query, color: FF4154 }
      - { icon: colorful-scss, text: SCSS, color: CC6699 }
      - { text: VitePress, color: 5C73E7 }
      - { text: FSD }
      - { text: Schema-First }
      - { text: WCAG 2.0 AA }
  - type: Back-End
    items:
      - { text: Go · 2026, color: 00ADD8 }
      - { text: Gin / GORM, color: 00ADD8 }
      - { icon: colorful-php, text: PHP / Laravel, color: 8993BE }
      - { text: PostgreSQL, color: 336791 }
      - { icon: colorful-sql, text: SQLite, color: 003B57 }
      - { text: RESTful API }
  - type: Mobile · 2026
    items:
      - { text: Kotlin, color: 7F52FF }
      - { text: Jetpack Compose, color: 4285F4 }
      - { text: Room / Hilt, color: 3DDC84 }
      - { text: Play Billing, color: 3DDC84 }
  - type: Cloud & Deploy
    items:
      - { text: Cloud Run, color: 4285F4 }
      - { text: Neon Postgres, color: 00E599 }
      - { text: Cloudflare R2, color: F38020 }
      - { text: GitHub Actions, color: 2088FF }
      - { text: Docker, color: 2496ED }
  - type: Integration
    items:
      - { text: Google OAuth 2.0, color: 4285F4 }
      - { text: Google Calendar API, color: 4285F4 }
      - { text: Gemini API, color: 8E75B2 }
      - { text: Web Bluetooth, color: 0082FC }
      - { text: 藍新 / 2C2P 金流 }
      - { text: 電子發票 }
  - type: AI Collaboration
    items:
      - { text: Claude Code 多代理分工, color: D97757 }
      - { text: Agent Skills, color: D97757 }
      - { text: hooks / statusLine }
      - { text: MCP }
      - { text: 規範與提示的版本管理 }
      - { text: AI 開發的資安邊界 }
  - type: Tools
    items:
      - { text: Git, color: F05032 }
      - { text: Vitest, color: 6E9F18 }
      - { text: Postman, color: FF6C37 }
      - { icon: colorful-figma, text: Figma, color: A259FF }
      - { icon: colorful-photoshop, text: Photoshop, color: 31A8FF }
      - { icon: colorful-illustrator, text: Illustrator, color: FF9A00 }
---

<script setup lang="ts">
import { computed, ref } from 'vue';
import { data as works, formatMonths, monthsOf, projects, WorkExperience } from '@features/resume';

const total = computed(() => formatMonths(works.reduce((sum, work) => sum + monthsOf(work.period), 0)));
const allOpen = ref(true);
</script>

## About

十年前端為主的全端工程師，擅長把混亂的專案收斂成所有人都能接手的架構。
2026 年起把同一套方法用在 AI 上，重新規劃 AI 時代的開發流程：一個人帶多個 AI 代理分工，一個月內讓一款 Android App 從開專案走到 Google Play 封測，第二個產品 Flowsker 一天立起骨架、三天上線。
Android 與 Go 是 2026 年才開始用的，兩個都有上線的產品；我拿這個證明學習能力，不宣稱多年經驗。

## 三件最值得問我的事

- **叮咚記帳**：為什麼進記帳 App 這個血流成河的賽道？差異在「零操作」：付款通知一跳，帳就記好。從零獨立完成 Android App（Kotlin／Compose）、Go 後端、官網與後台，2026-09 通過 Google Play 封閉測試審查，付費方案與 Play Billing 已接好。
- **Flowsker**：給人與 AI 團隊用的專注力工具。反向番茄鐘，Vue 3 ＋ Go，自己做 Google 登入與 Calendar 授權；AI 代理拿一把有範圍的權杖，就能把「要你親手做的事」開成任務給你，網站上有「AI 辦公室」看它們在做什麼。2026-10-10 開工、10-12 上線。
- **多代理開發流程**：讓 AI 的產出可見、可控、可重複的一套方法。工作區分層的 `CLAUDE.md`、一件事一張單的溝通板（叮咚三週近百張單）、各倉庫的專案 skill、API 文件當唯一介面、檢查過才 commit、開發記錄保留原話。這套流程讓第二個產品一天就立起骨架。

<section class="resume__works">

<header class="resume__works-header">

## Projects <span class="resume__total">2026</span>

</header>

<WorkExperience :work="projects[0]" :open="allOpen">

AI 代理接走了大部分的手工，工程師剩下的是源源不絕的決策與待辦，注意力反而更碎。
Flowsker 把這些收成一條線：專注到想停為止，休息按比例給；AI 代理把「要你親手做的事」開成任務排進來，每一段心流記在任務上並寫進 Google Calendar。不是一個人的番茄鐘，是整個團隊的心流。

- **前端**：Vue 3、Vite、TypeScript、SCSS、Pinia、Zod 4、TanStack Query；FSD 目錄；畫面深淺不靠開關，跟著計時器以 `color-mix` 連續過渡。
- **後端**：Go／Gin，Cloud Run。自己實作 Google OAuth（登入與 Calendar 授權同一次同意）、自簽 session、refresh token 加密存放、資料庫閃斷回 503 不登出使用者、記憶體兩層限流。
- **給 AI 用的 API**：個人存取權杖只存雜湊、帶範圍；不認得的欄位回 400、權杖越權回 403；溝通串、認領用條件式更新防多個代理搶單。
- **AI 辦公室**：人與 AI 團隊共用的工作現場。用 Claude Code 的 Mods（hooks、statusLine）掛進去，各代理在做什麼、花多少、額度剩多少一目了然，隨時介入；只送數字與遮過機密的摘要，不送對話內容。
- 從叮咚後端抽出骨架（設定、migration、限流、測試 helper），第二個產品一天立起來；10-10 開工、10-12 上線；將以 AGPL-3.0 開源。

</WorkExperience>

<WorkExperience :work="projects[1]" :open="allOpen">

付款通知一跳，帳就記好。台灣的「無腦全自動記帳」App：攔截銀行與行動支付推播自動入帳，拍收據、說一句話、截帳單都能記，帳目只存在手機上。
原則只有一句：懶、無腦，但有小精靈幫忙。

- **App**：Kotlin、Jetpack Compose、Room、Navigation Compose；domain → data → ui 三層，MVVM 加 StateFlow；**800 個以上**單元測試。
- **後端**：Go／Gin／GORM，Cloud Run ＋ Neon Postgres。App 不帶任何 AI 金鑰，所有 Gemini 呼叫經後端轉送並設每日成本上限；裝置 key 只存雜湊；**80 個以上**端點含訂閱驗證、活動、公告、後台。
- **官網與後台**：VitePress 宣傳頁、封測報名、隱私權政策由 App 原稿產生、Google Play 要求的自助刪帳號頁、管理後台（裝置、回報、版本、公告）。
- **上架與營運**：2026-09-25 通過 Google Play 封閉測試審查，封測活動（排行榜、打卡、回報）；四階方案與 Play Billing 後端完成；隱私權政策逐條對過程式碼，過程中修掉三個與說法不符的資料保存行為。

</WorkExperience>

</section>

<section class="resume__works">

<header class="resume__works-header">

## Work Experience <span class="resume__total">{{ total }}</span>

<ElBtn size="sm" class="resume__works-toggle" @click="allOpen = !allOpen">{{ allOpen ? '全部收合' : '全部展開' }}</ElBtn>

</header>

<WorkExperience :work="works[0]" :open="allOpen">

- 全職做自己的產品（叮咚記帳、Flowsker，見上），用它們重新規劃 AI 時代的開發流程。一個人帶多個 AI 代理分工，重點是讓產出穩定：每個代理只改自己的倉庫、介面只認 API 文件、檢查過才能 commit、UI 要在畫面上看過才算完成、每個決定留原話。流程可見、可控、可複製，第二個產品直接套用。

</WorkExperience>

<WorkExperience :work="works[1]" :open="allOpen">

- 導入 **FSD** 架構與 **Zod Schema-First** 資料層，改善大型專案的耦合與執行期型別問題；以 Axios 攔截器與 Adapter Pattern 統一 API 錯誤處理與 OAuth 2.0 驗證。
- 導入 **TanStack Query** 管理伺服端狀態；設計 Code Splitting 與 Vendor Chunking 策略縮減首屏體積。
- 建立 Postman ＋ Mock Server 的合約優先流程，前後端平行開發。
- 以 **Web Bluetooth API** 做免驅動的硬體連線，封裝為跨平台 App。
- 推動 AI 輔助開發：把 FSD 與 Zod 的結構當成 AI 友善環境，制定《前端開發手冊》當系統提示、AI 開發的安全邊界與資料去識別化 SOP。

</WorkExperience>

<WorkExperience :work="works[2]" :open="allOpen">

- 主導 **10 套**以上異質 Legacy 系統收斂至 Vue.js ＋ Laravel 統一架構；推動 jQuery 遷移至 Vue（ES6+）、模組化與 SCSS。
- 協調 App、機台、外包三個團隊共 **23 位**工程師的 API 整合。
- 開發金流架構：**藍新**、**電子發票**、**2C2P** 跨國支付與定期定額扣款。
- 廢除 FTP 部署，導入 **Git** 與標準化 SOP。
- 主導政府外包案，交付符合 **WCAG 2.0 AA** 的無障礙系統。
- 2022–2023 進行 ChatGPT 與 GitHub Copilot 的概念驗證，主辦內部技術分享。

</WorkExperience>

<WorkExperience :work="works[3]" :open="allOpen">

- 以 HTML5 Canvas 與 CSS3 做高還原度的設計稿實作與特效；自製模組化輪播取代第三方套件。
- 開發 **Trello** 同步模組；導入 VS Code 協作規範與 SCSS、Flex／Grid 切版。

</WorkExperience>

<WorkExperience :work="works[4]" :open="allOpen">

- 參與「高速公路遠距車辨系統」，將 PC 端核心演算法移植至嵌入式系統；開發軟體保護金鑰（Dongle）加密機制。

</WorkExperience>

</section>

## Writing & Community

- **iT 邦幫忙鐵人賽 2024**：《VitePress 三十天》完賽，從零建部落格到工程化配置與主題改造。[系列](https://ithelp.ithome.com.tw/users/20109918/ironman/7545)
- **iT 邦幫忙鐵人賽 2022**：《TypeScript 三十天》完賽，把 Vue 專案重構為 Vite ＋ TypeScript 的實戰紀錄。[系列](https://ithelp.ithome.com.tw/users/20109918/ironman/5363)
- 部落格 [opshell.me](/)：72 篇公開文章；〈API 串接進化史〉八篇、〈Git〉系列七篇撰寫中。
- 下一屆鐵人賽預定題目：一個人帶多個 AI 代理做產品（Flowsker 的開發記錄）。

## Education

- **台灣首府大學** 數位娛樂與遊戲設計學系 學士　2011 – 2015

<style lang="scss">
  .resume__works {
    margin-top: 2.5rem;

    &-header {
      @include setFlex(space-between, baseline, 1rem);

      h2 { flex: 1; }
    }

    + .resume__works { margin-top: 3rem; }
  }
  .resume__total {
    margin-left: .5rem;
    color: var(--vp-c-text-3);
    font-family: var(--vp-font-family-mono);
    font-size: var(--font-size-s);
    font-weight: 400;
  }
  .resume__works + h2,
  .resume__main ul + h2 { margin-top: 3rem; }
</style>
