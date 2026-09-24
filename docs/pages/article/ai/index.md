---
title: AI
description: Opshell 在實際專案裡跟 AI 一起工作的紀錄：怎麼分工、怎麼讓它不亂來、哪些地方它真的幫上忙，以及用下來的心得。
layout: page
class: section-page
sidebar: false
aside: false
# 專區首頁，不設 isPublished：它不是一篇文章
---

<script setup>
import { SectionPosts } from '@features/article-list';
</script>

<SectionPosts
  prefix="/article/ai/"
  title="AI"
  lead="在真的專案裡跟 AI 一起工作的紀錄：怎麼分工、怎麼讓它不亂來、哪些地方它真的幫上忙，以及用下來的心得。"
  :tabs="[{ label: '技術', category: 'AI' }, { label: '心得', category: '心得' }]"
/>
