---
layout: resume

name: Opshell
jobTitle: Front-End Developer
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

喜歡交流、學習技術的我， 從高中開始對程式語言萌生興趣，獨立製作了一個RPG畢業專題， 在大學、實習時期確認了喜愛的程式類型，並完成網頁技術相關的國科會計畫。 在之後的工作中，一頭熱的投入了全端網頁技術的海洋， 熟練HTML、CSS、Javascript、Typescript、Vue等前端語言、框架， 使用PHP、SQL撰寫網站後端，串接各式API，用GCP配合LAMP架站。 對設計美感與使用體驗有要求的我， 持續的學習與成長，面對新的挑戰，一步步超越自己。 不喜歡停滯不前，在時代與技術的洪流中， 只有被沖走或逆流而上兩個選項。

---

<script setup lang="ts">
  import {  withBase } from 'vitepress';
  import { data as workExperienceData } from '@/data/works.data';

  import MoleWorkExperience from '@components/mole/workExperienceMD.vue';
</script>

<section class="work-experience-block">

## Work Experience

<MoleWorkExperience
  :key="workExperienceData[0].company"
  :comp-img="withBase(workExperienceData[0].compImg)"
  :company="workExperienceData[0].company"
  :location="workExperienceData[0].location"
  :job-title="workExperienceData[0].jobTitle"
  :period="workExperienceData[0].period"
>

#### 一、工作內容概述：
  - 依客戶需求協同規劃 UI/UX、切版、前、後端功能對接及串接第三方API。
  - 開發、導入新技術，撰寫開發文件，主講技術分享會。
  - 專案技術選型。

---
#### 二、使用技能：
  - 前　端：HTML、CSS、JS、TS、Vue、Vite、Quasar
  - 後　端：Laravel、php
  - 資料庫：MySQL
  - Tool：Git、Postman、Docker、Trello、JIRA

---
#### 三、時期貢獻&部分作品：
  - 推行：
    - JANDI 辦公通訊軟體，協助整合工作SOP、提高同仁辦公及生活水準。
    - Vite、Vue3、Typescript 等更現代前端技術，提高開發效率、降低維護難度及複雜度。
    - Swiper 導入、Quasar 元件庫封裝，對齊專案技術選型，降低同事彼此維護專案的技術門檻。
    - PostMan Workspaces + PostMan Mock Server 前、後端API開發工作流導入。

  - 智慧醫療 - 慈濟洗腎護照 (前端)：
    - 使用Vite + Vue3 + Typescript 重構整個研究專案，實踐公司第一個前後端分離的專案。
    - UI/UX 操作邏輯優化、處理特殊 Drag 需求。
    - 使用 Vue3 自製 plugin 技術，實踐 Notify 指令需求。
    - 設計、實踐 OAuth 2.0 身份識別架構。

  - 國教署 - 食登3.0 (前端)：
    - Figma 設計軟體 + 工作流導入。
    - 導入PostMan Workspaces + PostMan Mock Server 前、後端API開發工作流。
    - 全站技術選型，Quasar 元件庫導入。
    - 設計 Developer 開發者 Kit，提高多前端開發效率。
    - 通過無障礙 2A 級審查。
</MoleWorkExperience>


<MoleWorkExperience
  :key="workExperienceData[1].company"
  :comp-img="withBase(workExperienceData[1].compImg)"
  :company="workExperienceData[1].company"
  :location="workExperienceData[1].location"
  :job-title="workExperienceData[1].jobTitle"
  :period="workExperienceData[1].period"
>

#### 一、工作內容概述：
  - 協助規劃客戶網站，實現不同的特殊需求，串接各式API。
  - 新技術選型、導入並模組化，撰寫文件及教育訓練。
  - 定期製作、報告，業界新技術、概念，提供公司同仁未來成長相關的資源&技術。

#### 二、使用技能：
  - 前端：HTML、CSS、JS、Vue、JQ
  - 後端：PHP、Eloquent
  - 資料庫：MySQL
  - MIS：GCP
  - 行銷：SEO優化、GA串接
  - Tool：Git、Adobe Photoshop、Adobe illustrator、Trello

#### 三、時期貢獻&部分作品：
  - 推行：
    - Git版控系統，協助整合工作SOP
    - Javascript(ES6)、Vue、SCSS等現代前端技術，
    - 選型 Swiper 當統一輪播套件，實現更複雜特效，提高同事間支援效率。
    - 整合及統一公司框架並模組化框架功能。
    - 重構公司使用者後台操作介面，導入 axios 及使用 Promise.all 開發多圖上傳後台功能。
    - Laravel Eloquent等現代後端技術，整合公司後端框架，提高公司產品安全性及維護便利性。

  - 傳閔人時案件打卡系統(全端)：(隱私安全，不便提供)
    - 導入 Vue ，重構整個專案前、後臺相關功能，優化UIUX。
    - 資料庫結構重構，提高查詢、存儲效率。
    - 設計員工請假功能，自動計算年資，打卡、請假紀錄。
    - 重構報表相關功能，提高查詢速度、渲染效率及列印版面調整。

  - [喬山健康(全端)](https://www.johnsonfitnesslive.com/)
    - 協助前端使用 GASP 處理特效。
    - 規劃後台操作流程，並使用 Vue 建立後台使用者介面。
    - 做為資料中心協助多團隊API整合：APP Team + 機台 Team + 外包 Team。
    - 團隊內 API 規劃及串接。
    - 外國金流串接(2C2P)串接並擴展開發定期定額扣款功能。
    - 藍新金流串接、電子發票串接。

</MoleWorkExperience>

<MoleWorkExperience
  :key="workExperienceData[2].company"
  :comp-img="withBase(workExperienceData[2].compImg)"
  :company="workExperienceData[2].company"
  :location="workExperienceData[2].location"
  :job-title="workExperienceData[2].jobTitle"
  :period="workExperienceData[2].period"
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
    - 太陽能獲利公式UX設計、程式撰寫。
    - 全站微動畫設計，

  - [富德土雞(全端 & UI/UX)](http://www.fu-de.com/)
    - 多套件整合，底層調整，提高互動渲染效能。
    - 無金流購物流程設計。

  - [耶路薩冷旅行社(全端協做)](https://www.jrstours.com.tw/)
    - 重構整站後台操作介面、UIUX 優化。
    - 客製行程頁面

  - [允成建設(全端)](http://www.yun-cheng.com.tw/)
    - 客製 Slide 特效演算法，並模組化。
    - 全頁式網站 RWD 設計。
    - 全站轉場、漸變、過動 特效設計、實踐。
</MoleWorkExperience>

<MoleWorkExperience
  :key="workExperienceData[3].company"
  :comp-img="withBase(workExperienceData[3].compImg)"
  :company="workExperienceData[3].company"
  :location="workExperienceData[3].location"
  :job-title="workExperienceData[3].jobTitle"
  :period="workExperienceData[3].period"
>

#### 一、工作內容概述：
  - 協助影像辨識軟體開發，網站開發，其他行政工作。

#### 二、使用技能：
  - 影像辨識類
    - 語言：C#
  - 網頁相關(含APP)
    - 前端：HTML、CSS、JS、JQ
    - 後端：IIS
    - 資料庫：MySQL
    - Tool：Trello
</MoleWorkExperience>
</section>
