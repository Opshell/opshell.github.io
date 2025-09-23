---
title: Day24 - giscus
author: Opshell
createdAt: '2024-09-25'
categories:
  - vitepress-thirty-days
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: true
refer:
  - 'https://site.quteam.com/technology/front-end/vitepress-comment/'
  - >-
    https://wenlei.wang/life-doc/view/temp/%E5%B7%A5%E5%85%B7/%E6%89%93%E9%80%A0%E7%AB%99%E7%82%B9/%E7%AB%99%E7%82%B9%E6%B7%BB%E5%8A%A0%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F.html#giscus
image: ''
description: ''
keywords: ''
---
![banner24](https://ithelp.ithome.com.tw/upload/images/20240925/20109918OCbos8fHO8.png)

進入了 stage 5 慢慢的也接近賽季的尾聲啦，做部落格除了分享以外，也想要有交流討論，和大家交交朋友，所以在我們的文章中需要個評論的功能。

## 評論系統選型：
市面上有很多評論系統：
- Waline
- Artalk
- Twikoo
- gitalk
- utterances
- giscus

既然我們都是簡易型的部落格了，先刪掉一些需要部署後端的，剩下來的幾個基本都是依賴 `GitHub` 的， `gitalk`、`utterances`、`giscus`。
而 `gitalk`、`utterances` 都是建立在 `GitHub Issue`，而 `giscus` 則是利用 `GitHub Discussions` 來實踐評論功能，評論功能就是拿來討論的，所以就選 `giscus` 了。

當然，他還有一些 Opshell 很喜歡的優勢(官網說的)：
1. 開放原始碼。🌏
2. 無追蹤，無廣告，永久免費。📡 🚫
3. 無需資料庫。全部資料均儲存在 GitHub Discussions 中。:octocat:
4. 支援自訂佈景主題！🌗
5. 支援多語言。🌐
6. 高度彈性。🔧
7. 自動從 GitHub 取得新留言（包含編輯）。🔃
8. 可自架伺服器！🤳

## giscus 安裝、設定
請到[這邊](https://giscus.app/zh-TW)

### 1. 專案的私有度需要是 `public`
### 2. 開啟專案的 `Github Discussions`
在專案的 Settings -> General -> Features -> Discussions 中開啓 Discussions 功能
![Discussions day24-giscus-2](https://ithelp.ithome.com.tw/upload/images/20240925/20109918xvqwIUOy4K.png)
![Discussions day24-giscus-2-1](https://ithelp.ithome.com.tw/upload/images/20240925/201099183BMKByPwJ4.png)

### 3. 安裝 [giscus App](https://github.com/apps/giscus)
按照 `GitHub OAuth` 流程授權 `giscus app`，授權需要評論的專案。
![Install giscus day24-giscus-3](https://ithelp.ithome.com.tw/upload/images/20240925/20109918IDafM3UJMM.png)

### 4. 取得 Giscus 配置
打開 Giscus，輸入專案名，獲取配置信息，自動獲得到配置文件，主要是需要獲得 repo-id category-id
![Setting giscus day24-giscus-4](https://ithelp.ithome.com.tw/upload/images/20240925/20109918VBSE8PuMEE.png)
![Setting giscus day24-giscus-5](https://ithelp.ithome.com.tw/upload/images/20240925/20109918xsW77kyYsi.png)

### 5. giscus Component
在 `.vitepress/theme/components/orga/` 目錄下新增 `giscusComment.vue`：

```vue
<script setup>
    import Giscus from '@giscus/vue';
    import { useData, useRoute } from 'vitepress';

    const route = useRoute();
    const { isDark } = useData();
</script>

<template>
    <div style="margin-top: 24px">
        <Giscus
            id="comments"
            :key="route.path"
            repo="Opshell/opshell.github.io"
            repoid="R_kgDOMjQqsg"
            category="Announcements"
            categoryid="DIC_kwDOMjQqss4Ch3dc"
            mapping="pathname"
            term="Welcome to giscus!"
            reactionsenabled="1"
            emitmetadata="0"
            inputposition="top"
            loading="lazy"
            lang="zh-TW"
            crossorigin="anonymous"
            :theme="isDark ? 'dark' : 'light'"
        />
    </div>
</template>
```

`:key="route.path"` 用於刷新評論組件，保證每個頁面都有獨立的評論。
`:theme` 用於根據頁面主題切換評論主題。

## 使用 giscus Component
在 `docs/.vitepress/theme/layout/expandLayout.vue` 中使用 `OrgaGiscusComment`：

```vue
<template>
    <Layout :class="[frontmatter.class]">
        <template #doc-before>
            ......
        </template>

        <template #doc-after>
            // [!code ++]
            <OrgaGiscusComment /> // [!code ++]
        </template> // [!code ++]

        <template #aside-ads-before>
            ......
        </template>
    </Layout>
</template>
```

搭拉~~  這樣就有評論系統啦~  就是需要登入Github 帳號才可以，不過大家都是碼農，有個 Github 帳號不過份吧~
