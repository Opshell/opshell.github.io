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
  v-for="work in workExperienceData"
  :key="work.company"
  :comp-img="withBase(work.compImg)"
  :company="work.company"
  :location="work.location"
  :job-title="work.jobTitle"
  :period="work.period"
>

- #### 一、工作內容概述：
  - ． 協助規劃客戶網站需求UIUX調整，切版網頁，串接各式API。
  - ． 前、後端功能對接及實踐不同層面客戶的使用需求。

- #### 二、使用技能：
  - ． 前　端：HTML、CSS、JS、TS、Vue、Vite、Quasar
  - ． 後　端：Laravel
  - ． 資料庫：MySQL
  - ． Tool：Git、Trello、JIRA

- #### 三、時期貢獻&部分作品：
  - ． 推行：
    - ° JANDI 辦公通訊軟體，協助整合工作SOP、提高同仁辦公及生活水準
    - ° Vite、 Vue3、Typescript 等更現代前端技術，
    - ° Swiper 當統一輪播套件，實現更複雜特效，提高同事間支援效率。

  - ． 智慧醫療 - 慈濟洗腎護照 (前端)：
    - ° 使用Vite + Vue3 重構整個研究專案，使其商用化、優化使用者體驗。

  - ． 國教署 - 食登3.0 (前端)：
    - ° 使用Vite + Vue3 重構整個研究專案，使其商用化、優化使用者體驗。
    - ° Quasar 導入

</MoleWorkExperience>
</section>
