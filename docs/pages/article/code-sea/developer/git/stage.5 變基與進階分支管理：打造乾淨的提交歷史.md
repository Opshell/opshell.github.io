---
title: 關於VS Code Git GUI 的那些事
image:
author: 'Opshell'
createdAt: 2025-04-11
categories:
  - 'Git'
tags:
  - 'Git'
  - 'VS Code'
  - 'Git Graph'
editLink: true
isPublished: false
---

# 目標：變基與進階分支管理：打造乾淨的提交歷史
目標：介紹變基（Rebase）作為合併的替代方案，使用 Git Graph 和 Git History 管理複雜分支結構和乾淨的提交歷史。
內容：
什麼是變基？：
變基與合併的區別（線性歷史 vs. 合併提交）。
變基在大型專案中的用途（例如簡化 PR 審查）。
使用 Git Graph 執行變基：
對單一分支變基（git rebase main）。
視覺化變基後的提交歷史。
互動式變基：
使用 git rebase -i 整理提交（合併、編輯訊息）。
用 Git History 檢視變基前後的提交差異。
進階分支管理：
多分支協作（例如 feature、dev、release 分支）。
使用 Git Graph 追蹤多分支進度。
實務案例：
將 feature-login 變基到最新的 main 分支。
使用互動式變基合併多次提交。
用 Git Graph 確認乾淨的線性歷史。
常見問題：
變基衝突的解決方法。
變基的風險（例如覆蓋遠端分支）。
小結：
變基如何提升提交歷史的可讀性。
預告最終篇：複雜分支合併與大型專案策略。
預估字數：1800-2000 字。
難度：★★★★★（適合進階開發者）。
