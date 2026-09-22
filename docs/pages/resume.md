---
layout: resume
title: Resume
description: Opshell 的履歷：Senior Front-End Developer，前端架構、開發流程與 AI 協作。

portrait: /images/resume/portrait.webp
name: Opshell
jobTitle: Senior Front-End Developer
tagline: 具備全端視野的前端工程師，熱衷於「解決混亂」與「提升團隊產能」。
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
  - type: Languages
    items:
      - { icon: colorful/typescript, text: TypeScript, color: 3178C6 }
      - { icon: colorful/javascript, text: JavaScript (ES6+), color: FFBB00 }
      - { icon: colorful/html, text: HTML, color: E24B2A }
      - { icon: colorful/css, text: CSS, color: 1872B7 }
      - { icon: colorful/scss, text: SCSS, color: CC6699 }
      - { icon: colorful/php, text: PHP, color: 8993BE }
      - { icon: colorful/sql, text: SQL, color: F16529 }
  - type: Frameworks
    items:
      - { icon: colorful/vue, text: Vue 3, color: 4da986 }
      - { icon: colorful/vite, text: Vite, color: 9B5FFC }
      - { text: Pinia, color: FFD859 }
      - { text: Zod, color: 3E67B1 }
      - { text: TanStack Query, color: FF4154 }
      - { text: Quasar, color: 00B4FF }
      - { icon: colorful/laravel, text: Laravel, color: F35045 }
  - type: Tools
    items:
      - { text: Git, color: F05032 }
      - { text: Docker, color: 2496ED }
      - { text: Vitest, color: 6E9F18 }
      - { text: CI/CD }
      - { text: Postman }
      - { text: JIRA / Trello }
      - { icon: colorful/figma, text: Figma, color: A259FF }
      - { icon: colorful/photoshop, text: Photoshop, color: 31A8FF }
      - { icon: colorful/illustrator, text: Illustrator, color: FF9A00 }
  - type: Others
    items:
      - { text: RESTful API }
      - { text: Web Bluetooth }
      - { text: WCAG 2.0 AA }
      - { text: Agentic Workflow }
---

<script setup lang="ts">
import { computed, ref } from 'vue';
import { data as works, formatMonths, monthsOf, WorkExperience } from '@features/resume';

const total = computed(() => formatMonths(works.reduce((sum, work) => sum + monthsOf(work.period), 0)));
const allOpen = ref(true);
</script>

## About

面對盤根錯節的技術債，習慣以清晰的邏輯解構問題，在複雜的商業需求與技術重構之間找到最佳平衡。
相信優秀的架構不僅服務於產品，更服務於共同奮鬥的團隊。

前端工程師是 **UI/UX 設計師**、**後端**、**PM** 與 **客戶** 之間的潤滑油：擅長把需求拆成可以協作的介面，把混亂的專案收斂成一套所有人都能接手的架構。

<section class="resume__works">

<header class="resume__works-header">

## Work Experience <span class="resume__total">{{ total }}</span>

<ElBtn size="sm" class="resume__works-toggle" @click="allOpen = !allOpen">{{ allOpen ? '全部收合' : '全部展開' }}</ElBtn>

</header>

<WorkExperience :work="works[0]" :open="allOpen">

#### 架構與流程
- 導入 **FSD** 架構，多人協作效率提升 **54%**
- 建構 **Zod Schema-First** 開發流程，實現 100% Runtime Type Safety
- 以 Axios Interceptors 與 Adapter Pattern 封裝 API 層；導入 **TanStack Query**，開發成本降低 **43%**
- 設計 Code Splitting 策略，首屏體積縮減 **43%**
- 建立 Postman + Mock Server 的合約優先模式，API 串接工時縮短 **52%**
- 運用 **Web Bluetooth API** 解決特規設備整合需求

#### AI 協作
- 結合 FSD 與 Zod 打造 AI 友善環境，消除 **64%** AI 幻覺
- 導入 Agentic 工作流與《前端開發手冊》系統 Prompt
- 制定 AI 輔助開發的安全邊界與資料去識別化 SOP

</WorkExperience>

<WorkExperience :work="works[1]" :open="allOpen">

#### 架構收斂
- 主導 **10 套**異質 Legacy 系統收斂至統一架構（Vue.js + Laravel）
- 推動 jQuery → Vue (ES6+) 現代化轉型，維護效率提升 **63%**
- 廢除 FTP 部署，導入 **Git** 版本控制，開發效率提升 **168%**

#### 整合與金流
- 主導 **23 位**工程師的 API 整合（App、機臺、外包三個團隊）
- 開發高複雜度金流架構：**藍新**、**電子發票**、**2C2P** 跨國支付與定期定額
- 開發符合 **WCAG 2.0 AA** 的無障礙系統

#### 團隊
- 進行 ChatGPT 與 GitHub Copilot 的早期概念驗證
- 主辦內部技術研討會，推動人機協作的開發文化

</WorkExperience>

<WorkExperience :work="works[2]" :open="allOpen">

- 運用 HTML5 Canvas 與 CSS3 實現 Pixel Perfect 的設計還原
- 開發模組化 Slide 輪播演算法，效能提升 **67%**
- 開發 **Trello** 同步模組，輪班支援效率提升 **78%**
- 導入 VS Code 協作規範與 SCSS、Flex／Grid 現代切版

</WorkExperience>

<WorkExperience :work="works[3]" :open="allOpen">

- 參與「高速公路遠距車辨系統」開發，軟硬體整合
- 將 PC 端核心演算法移植至 Embedded System
- 開發軟體保護金鑰（Dongle）加密機制與韌體化

</WorkExperience>

</section>

<style lang="scss">
  .resume__works {
    margin-top: 2.5rem;

    &-header {
      @include setFlex(space-between, baseline, 1rem);

      h2 { flex: 1; }
    }
  }
  .resume__total {
    margin-left: .5rem;
    color: var(--vp-c-text-3);
    font-family: var(--vp-font-family-mono);
    font-size: var(--font-size-s);
    font-weight: 400;
  }
</style>
