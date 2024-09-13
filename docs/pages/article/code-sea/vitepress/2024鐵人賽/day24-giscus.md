---
title:  'Day24 - giscus'
author: 'Opshell'
createdAt: '2024/09/24'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: false
---

進入了 stage 5 慢慢的也接近賽季的尾聲啦。
做部落格除了分享以外，也想要有交流討論，和大家交交朋友，所以在我們的文章中需要個評論的功能。

## 評論系統選型：
市面上有很多評論系統：
- Waline
- Artalk
- Twikoo
- gitalk
- utterances
- giscus

既然我們都是簡易型的部落格了，先刪掉一些需要部署後端的，勝下來的幾個基本都是依賴 `GitHub` 的， `gitalk`、`utterances`、`giscus`。
而 `gitalk`、`utterances` 都是建立在 `GitHub Issue`，而 `giscus` 則是利用 `GitHub Discussions` 來實踐評論功能，評論功能就是拿來討論的，所以就選 `giscus` 了。

當然，他還有一些 Opshell 很喜歡的優勢：
1. 開放原始碼。🌏
2. 無追蹤，無廣告，永久免費。📡 🚫
3. 無需資料庫。全部資料均儲存在 GitHub Discussions 中。:octocat:
4. 支援自訂佈景主題！🌗
5. 支援多語言。🌐
6. 高度彈性。🔧
7. 自動從 GitHub 取得新留言（包含編輯）。🔃
8. 可自架伺服器！🤳

## GitHub 前置設定
### 1. 專案的觀看權限需要是 `public`
### 2. 開啟專案的 `Github Discussions`
在專案的 Settings -> General -> Features -> Discussions 中開啓 Discussions 功能

### 3. 安裝 giscus
按照 `GitHub OAuth` 流程授權 `giscus app`，授權需要評論的專案。

### 4. 取得 Giscus 配置
打開 Giscus，輸入專案名，獲取配置信息，自動獲得到配置文件，主要是需要獲得 repo-id category-id

## Giscus Component
3.1 加 Giscus 配置组件
在 .vitepress/theme/components 目录下新建 GiscusComment.vue 文件，内容如下：

vue
<template>
    <div style="margin-top: 24px">
        <Giscus
            id="comments"
            repo="haovei/site"
            repoid="R_kgDOIN2Meg"
            category="General"
            categoryid="DIC_kwDOIN2Mes4CenDn"
            mapping="pathname"
            term="Welcome to giscus!"
            reactionsenabled="1"
            emitmetadata="0"
            inputposition="top"
            loading="lazy"
            :theme="isDark ? 'dark' : 'light'"
            :key="route.path"
        ></Giscus>
    </div>
</template>

<script setup>
import Giscus from '@giscus/vue';
import { useRoute, useData } from 'vitepress';

const route = useRoute();
const { isDark } = useData();
</script>
:key="route.path" 用于刷新评论组件，保证每个页面都有独立的评论。
:theme 用于根据页面主题切换评论主题。
3.2 引入 GiscusComment 组件
在 .vitepress/index.ts 中引入 GiscusComment 组件

js
import { h } from 'vue';
import Theme from 'vitepress/theme';
import GiscusComment from './components/GiscusComment.vue';

export default {
    ...Theme,
    Layout() {
        return h(Theme.Layout, null, {
            'doc-after': () => h(GiscusComment),
        });
    },
};
VitePress 很好的一个地方是有很多 Slot, doc-after 就是一个 Slot，用于在文档内容后插入内容。

https://site.quteam.com/technology/front-end/vitepress-comment/

https://wenlei.wang/life-doc/view/temp/%E5%B7%A5%E5%85%B7/%E6%89%93%E9%80%A0%E7%AB%99%E7%82%B9/%E7%AB%99%E7%82%B9%E6%B7%BB%E5%8A%A0%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F.html#giscus
