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

https://site.quteam.com/technology/front-end/vitepress-comment/

https://wenlei.wang/life-doc/view/temp/%E5%B7%A5%E5%85%B7/%E6%89%93%E9%80%A0%E7%AB%99%E7%82%B9/%E7%AB%99%E7%82%B9%E6%B7%BB%E5%8A%A0%E8%AF%84%E8%AE%BA%E7%B3%BB%E7%BB%9F.html#giscus
