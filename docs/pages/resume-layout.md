---
layout: resume

name: Opshell
jobTitle: Front-End Developer
mbti: INTP-A
summary:
skills:
  - type: Front-End Skills
    items:
      - icon: vue
        text: Vue
        color: 4da986
      - icon: vite
        text: Vite
        color: 9B5FFC
      - icon: typescript
        text: Typescript
        color: 3178C6
      - icon: css
        text: CSS
        color: 1872B7
      - icon: javascript
        text: Javascript
        color: FFBB00
      - icon: scss
        text: SCSS
        color: CC6699
      - icon: html
        text: HTML
        color: E24B2A
  - type: Back-End Skills
    items:
      - icon: php
        text: php
        color: 8993BE
      - icon: sql
        text: SQL
        color: F16529
      - icon: laravel
        text: Laravel
        color: F35045
  - type: Design Skills
    items:
      - icon: figma
        text: Figma
        color: A259FF
      - icon: photoshop
        text: Photoshop
        color: 86caf7
      - icon: illustrator
        text: illustrator
        color: febd39
contact:
  - icon: call
    text: +886 938-643-321
    href: tel:+886 938643321
  - icon: mail
    text: phenomx9990@gmail.com
    href: mailto:phenomx9990@gmail.com
  - icon: language
    text: Opshell's Website
    href: https://www.opshell.info
  - icon: language
    text: Opshell's Github
    href: https://github.com/Opshell
  - icon: location_on
    text: Tainan, Taiwan
    href: https://maps.app.goo.gl/9q1aF5LEaEihmDh37
---

## About Opshell
擅長UX調整、新技術研究，撰寫工程文件及專案架構開發。

前端工程師，要成為UIUX設計師、後端、PM及客戶之間的潤滑油，
協同處理問題，讓產品順利產出。

學習與成長，面對新的挑戰，一步步超越自己。
在時代與技術的洪流中，不想被沖走就逆流而上吧。

---

<script setup lang="ts">
  import {  withBase } from 'vitepress';
  import { data as workExperienceData } from '@/data/works.data';

  import MoleWorkExperienceMD from '@components/mole/workExperienceMD.vue';

  const workMonths: Ref<{[key: number]}> = ref({});

  const calcMonths = (index, months) => {
    workMonths.value[index] = months + 1;
  }

  const workExperienceTotal = computed(() => {
      const count = Object.values(workMonths.value).reduce((acc, cur) => acc + cur, 0);

      const years = Math.floor(count / 12);
      const months = count % 12; // 一般是月初入職，月底離職，所以要加1

      let result = '';

      if (years !== 0) {
          result += `${years}y `;
      }
      if (months !== 0) {
          result += `${months}m`;
      }

      return result;
  });

  const isDescriptionOpen = ref(false);
</script>

<section class="work-experience-block">

<header class="header">

  ## Work Experience {{ workExperienceTotal }}

  <ElSvgIcon :name="isDescriptionOpen? 'zoom_in_map' : 'zoom_out_map'" @click="() => { isDescriptionOpen = !isDescriptionOpen }" />
</header>

<MoleWorkExperienceMD
  :key="workExperienceData[0].company"
  :comp-img="workExperienceData[0].compImg"
  :company="workExperienceData[0].company"
  :location="workExperienceData[0].location"
  :job-title="workExperienceData[0].jobTitle"
  :period="workExperienceData[0].period"
  :isDescriptionOpen="isDescriptionOpen"
  @calcMonths="calcMonths(0, $event)"
>

#### 一、工作內容概述：
  - 主導 UI/UX、切版、前後端功能對接及串接第三方API。
  - 新技術導入，撰寫技術文件，主講技術分享會。
  - 專案架構開發、技術選型及訂立開發規範。

---
#### 二、使用技能：
  - 前　端：HTML、CSS/SCSS、JS、TS、Vue、Vite、Quasar
  - 後　端：Laravel、php
  - 資料庫：MySQL
  - Tool：Git、Postman、Docker、Trello、JIRA

---
#### 三、時期貢獻&部分作品：
  - 推行：
    - 推行 `JANDI`{.info}，整合工作流，`降低溝通負載60%`，提高同仁辦公及生活水準。
    - 導入 `Vite`{.info}、`Vue3`{.info}、`Typescript`{.info}、`Vitest`{.info}，`提高開發效率`、`降低維護成本`。
    - 導入 `Swiper`{.info}、`Quasar`{.info} 元件庫封裝，對齊專案技術，`降低專案維護門檻`。
    - 導入 `Postman Workspaces`{.info} + `Mock`{.info} 前後端串接SOP，`降低串接負載150%`。
    - 開發 `OAuth 2.0`{.info} 身份識別系統，`撰寫技術文件`及`執行相關教育訓練`。

  - 智慧醫療 - 慈濟洗腎護照 (前端)：
    - 專案技術選型，架構設計，RESTful API 設計。
    - 使用 Vue3 Custom plugin ，開發 Notify 指令需求。
    - 設計、開發 OAuth 2.0 身份識別系統 。

  - 國教署 - 食登3.0 (前端)：
    - Figma 設計軟體 + 工作流導入。
    - 專案技術選型，架構設計，RESTful API 設計。
    - 設計 Developer 開發者 Kit，提高多前端開發效率。
    - 通過無障礙 2A 級審查。
</MoleWorkExperienceMD>

<MoleWorkExperienceMD
  :key="workExperienceData[1].company"
  :comp-img="withBase(workExperienceData[1].compImg)"
  :company="workExperienceData[1].company"
  :location="workExperienceData[1].location"
  :job-title="workExperienceData[1].jobTitle"
  :period="workExperienceData[1].period"
  @calcMonths="calcMonths(1, $event)"
>

#### 一、工作內容概述：
  - 新技術開發、導入並模組化，撰寫技術文件及教育訓練。
  - 實踐客戶需求、前端特效撰寫、後臺功能製作及資料庫架構規劃。
  - 定期製作、報告，業界新概念、技術，提供同仁未來相關的資源及技術。

#### 二、使用技能：
  - 前端：HTML、CSS、JS、Vue、JQ
  - 後端：PHP、Eloquent
  - 資料庫：MySQL
  - MIS：GCP
  - 行銷：SEO優化、GA串接
  - Tool：Git、Adobe Photoshop、Adobe illustrator、Trello

#### 三、時期貢獻&部分作品：
  - 推行：
    - 導入 Git版控系統，整合工作SOP，減少維護工時消耗 200%。
    - Javascript(ES6)、Vue、SCSS 等現代前端技術，
    - 導入 Swiper 統一輪播套件，實現複雜特效，提高同事支援效率80%。
    - 重構公司使用者後台操作介面，導入 axios 及使用 Promise.all 開發多圖上傳後台功能。
    - Laravel Eloquent等現代後端技術，整合公司後端框架，提高公司產品安全性及維護便利性。

  - 傳閔人時案件打卡系統(全端)：(隱私安全，不便提供)
    - 導入 Vue ，重構專案前、後臺，優化UIUX，提高渲染效率 200%。
    - 資料庫結構重構，提高查詢效率45%、存儲效率50%。
    - 重構報表系統，提高查詢速度40%、渲染效率25%及列印版面調整。
    - 舊專案資料重構、整合匯入新專案。

  - [喬山健康(全端)](https://www.johnsonfitnesslive.com/)
    - 協助前端使用 GASP 處理特效。
    - 規劃後台操作流程，並使用 Vue 建立後台使用者介面。
    - 開發會員資料報表整合匯入、匯出功能開發。
    - 主導多團隊 API 整合：APP Team + 機臺 Team + 外包 Team。
    - 內部團隊 API 規劃及串接，藍新金流串接、電子發票串接。
    - 外國金流串接(2C2P)串接並擴展，開發定期定額扣款功能。

</MoleWorkExperienceMD>

<MoleWorkExperienceMD
  :key="workExperienceData[2].company"
  :comp-img="withBase(workExperienceData[2].compImg)"
  :company="workExperienceData[2].company"
  :location="workExperienceData[2].location"
  :job-title="workExperienceData[2].jobTitle"
  :period="workExperienceData[2].period"
  @calcMonths="calcMonths(2, $event)"
>

#### 一、工作內容概述：
  - 網頁切版、後臺客製功能製作、SEO調整、網站部屬。
  - 設計網站UX、動畫效果及RWD，以符合客戶網站風格。

#### 二、使用技能：
  - 前端：HTML、CSS、JS、JQ
  - 後端：PHP
  - 資料庫：MariaDB
  - MIS：網域、DNS、主機管理
  - 行銷：SEO優化、GA串接
  - Tool：Git、Adobe Photoshop、Trello

#### 三、時期貢獻&部分作品：
  - 推行：
    - VS Code 目前市佔率最高的編輯器。
    - 使用 Trello 整合成功做流，透明化案件製作進度，提高輪班時案件相互支援的效率。
    - SCSS 預處理器技術，加速切版及後續維修效率。
    - flex、grid等更具效率，邏輯的現代切版方式。

  - [宇軒綠能(全端 & UI/UX)](https://www.solargo.com.tw/)
    - 太陽能獲利公式，會員系統 UX 設計、程式撰寫。
    - 全站微動畫設計、程式撰寫。

  - [富德土雞(全端 & UI/UX)](http://www.fu-de.com/)
    - 多套件底層整合，提高頁面渲染效能50%。
    - 無金流購物流程設計。

  - [耶路薩冷旅行社(全端協做)](https://www.jrstours.com.tw/)
    - 重構整站後台操作介面、UIUX 優化。
    - 客製行程頁面，無規則排版、特殊RWD切版。

  - [允成建設(全端)](http://www.yun-cheng.com.tw/)
    - 客製 Slide 特效演算法並模組化。
    - 全站轉場、漸變、過動 特效設計、實踐。
    - 全頁式網站 RWD 設計。
</MoleWorkExperienceMD>

<MoleWorkExperienceMD
  :key="workExperienceData[3].company"
  :comp-img="withBase(workExperienceData[3].compImg)"
  :company="workExperienceData[3].company"
  :location="workExperienceData[3].location"
  :job-title="workExperienceData[3].jobTitle"
  :period="workExperienceData[3].period"
  @calcMonths="calcMonths(3, $event)"
>

#### 一、工作內容概述：
  - 協助影像辨識相關軟體開發，軟硬體整合，部分網頁開發案，其他行政工作。

#### 二、使用技能：
  - 影像辨識類
    - 語言：C#、C++
  - 網頁相關(含APP)
    - 前端：HTML、CSS、JS、JQ
    - 後端：IIS
    - 資料庫：MySQL
    - Tool：Trello

#### 三、時期貢獻&部分作品：
  - "客戶試用車牌辨識軟體"硬體金鑰鎖設計及撰寫。
  - "高速公路遠距無線車辨系統"，軟硬體開發、整合。
  - "barCode 無紅外影像辨識機"，核心演算法韌體化。

</MoleWorkExperienceMD>
</section>


<style lang="scss">
  .work-experience-block {
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
      .icon {
        cursor: pointer;
      }
    }
  }
</style>



Opshell's Blog， 坐在有超大螢幕的電腦前面， 螢幕展開出了下面的繽紛內容， 程式技巧、一些技術文件的筆記。 紀錄一些銘刻在靈魂中的收穫。 唯心宇宙，夢幻泡影，萬般帶不走，唯有業隨身。 科幻，簡約，鍊金術，真理之門，整齊的收錄，宇宙圖書館。 天地玄黃，宇宙洪荒。