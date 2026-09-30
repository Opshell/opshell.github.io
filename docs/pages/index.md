---
# 首頁＝這本筆記的目錄頁（2026-10 翻新）。以前是 VitePress 的 home 版型（hero＋四張卡片），內容搬到 features/home/constants.ts
layout: page
class: nb-home-page
sidebar: false
aside: false

title: "Opshell's Blog"
description: 一個藉由分享前端開發、各種想法、奇怪技能及其他雜項來與世界互動的部落格。

sitemap:
  - priority: 1
---

<script setup>
import { HomeContents } from '@features/home';
</script>

<HomeContents />
