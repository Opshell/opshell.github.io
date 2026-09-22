---
title: 刪除叮咚記帳的資料
description: 叮咚記帳（DinDon Ledger）的帳號與資料刪除說明：哪些資料在手機上、哪些在伺服器上，以及怎麼用 Google 帳號線上刪除。
layout: page
class: dindon-account
sidebar: false
ogImage: /images/dindon/og-share.png
aside: false
# Google Play 的「帳號刪除」要求有一個不用裝 App 也打得開的網址，所以這一頁要讓搜尋引擎收得到。
# 不設 isPublished：設了會被當成文章，出現在時間軸與標籤列表
---

<script setup>
import { DinDonAccount } from '@features/dindon';
</script>

<!-- Google 登入只能在瀏覽器端跑 -->
<ClientOnly>
    <DinDonAccount />
</ClientOnly>
