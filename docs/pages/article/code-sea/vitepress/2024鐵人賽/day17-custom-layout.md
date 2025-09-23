---
title: Day17 - 自訂一個Layout
author: Opshell
createdAt: '2024-09-18'
categories:
  - vitepress-thirty-days
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: true
image: ''
description: ''
keywords: ''
---
![Banner17](https://ithelp.ithome.com.tw/upload/images/20240918/20109918jmf5iZLjyZ.png)

前面我們透過了引用 `Vue Component` 的方式做了一個履歷表，可以客製我們想要的排版和內容，如果 Opshell 想要應徵多種職缺，需要多篇履歷，這樣就會一直增加元件和 `data` ，管理和維護會越來越不方便，有沒有辦法像是管理 `.md` 的方式管理履歷呢?如果可以自己做 `layout` 就好了!

## 新增 Layout Component
由於是主題相關且不會複用，所以這邊的 Component 不放在 `@components` 裡面，我們在 `docs/.vitepress/theme/` 裡面新增目錄 `layout`，然後在裡面新增檔案 `resume.vue`。

## useData frontmatter
第一件事就是把原本 `resume.vue` 的切版啥的通通搬過來，搬過來之後要改資料的引用方式，還記得我們前面提到 `.md` 會先被轉成 `html` 再當`Vue SFC` 處理嗎? 所以我們的資料要從 `.md` 裡面進來才可以被當成靜態資歷收錄喔!

所以 Ops 想到的方式和預設的 home 方式一樣，先把資料寫在 `frontmatter` 裡面，這樣就可以被結構化了，而 `VitePres` 也提供了抓取頁面 `frontmatter` 的方式：

所以我們在新的 resume 裡面加入：
```vue
<script setup lang="ts">
    import { useData } from 'vitepress';

    const { frontmatter } = useData();
</script>
```
並向這樣子使用：
```vue {4-7}
<template>
    <OrgaSectionBlock title="Contact">
        <ul class="contact-box">
            <li v-for="contact in frontmatter.contact" :key="`contact-${contact.text}`" class="contact">
                <ElSvgIcon :name="contact.icon" />
                <a :href="contact.href" target="_blank" rel="noopener noreferrer">{{ contact.text }}</a>
            </li>
        </ul>
    </OrgaSectionBlock>
</template>
```

## 註冊layout
透過上面的方式和億些修改，這個 `Layout` 就算是做好囉，那要怎麼使用呢?
我們要在 `/docs/.vitepress/theme/index.ts` 中註冊他：
```ts
import LayoutResume from './layout/resume.vue';  // [!code ++]

export default {
    ...DefaultTheme,
    Layout: () => {
        return h(DefaultTheme.Layout, null, {
            // https://vitepress.dev/guide/extending-default-theme#layout-slots
        });
    },
    enhanceApp({ app }) {
        app.component('resume', LayoutResume); // [!code ++]
    }
} satisfies Theme;
```
這樣就完成了一個自訂主題佈局囉~

## 使用
接著我們來實際使用看看，首先把原來的 `pages/resume.md` 重新命名為 `resume-vue.md` 然後新增一個 `resume-layout.md` 並加入這些內容：
```md
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
contact:
  - icon: mail
    text: phenomx9990@gmail.com
    href: mailto:phenomx9990@gmail.com
  - icon: language
    text: Opshell's Github
    href: https://github.com/Opshell
---
```
打開這個頁面就會發現資料已經被應用囉~

## markdown 夾資料
除了可以放在 `fronmatter` 以外，透故 `VitePress` 的特性，我們也可以把資料夾成這樣：
```md
---
frontmatter
---

<script setup lang="ts">
  import {  withBase } from 'vitepress';
  import { data as workExperienceData } from '@/data/works.data';

  import MoleWorkExperience from '@components/mole/workExperienceMD.vue';
</script>

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

<MoleWorkExperience/>
```

## 小結
這樣我們就完成了自己的 layout 囉~ 這樣如果之後想在部落格賣些文創商品之類的，就可以做一個 `product` 的 `layout`~ 是個很實用的功能喔~
