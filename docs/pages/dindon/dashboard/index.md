---
title: 叮咚記帳後台
description: 叮咚記帳的管理後台（僅限管理員）
layout: page
class: dindon-dashboard
sidebar: false
# 後台有自己的側欄：部落格的導覽列與頁尾都不要
navbar: false
footer: false
ogImage: /images/dindon/og-share.png
aside: false
# 後台不給搜尋引擎收錄；也刻意不設 isPublished、不放進導覽列
head:
  - - meta
    - name: robots
      content: noindex, nofollow
---

<script setup>
import { DinDonDashboard } from '@features/dindon';
</script>

<!-- Google 登入與所有 API 呼叫都只能在瀏覽器端跑 -->
<ClientOnly>
    <DinDonDashboard />
</ClientOnly>
