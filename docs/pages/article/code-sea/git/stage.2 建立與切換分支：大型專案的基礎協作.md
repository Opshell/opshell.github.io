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

# 目標：教導如何使用 Git Graph 和 Git History 建立、切換和管理分支，為多人協作奠定基礎。
內容：
分支的核心概念：
什麼是分支？為什麼需要分支？
為何需要分支？ (功能開發、Bug 修復、實驗)
git branch, git checkout / git switch 的基本用途。

分支在大型專案中的角色（功能開發、錯誤修復）。
使用 Git Graph 建立分支：
從主分支（main）建立新分支（git branch feature-x 或 Git Graph 的 UI）。
視覺化分支結構，確認分支分離點。
切換分支：
使用 Git Graph 或 VS Code 切換分支（git checkout）。
檢查工作目錄變化（Git History 顯示分支提交）。
提交到分支：
在新分支提交變更（例如新增功能檔案）。
用 Git History 檢視分支的獨立提交記錄。 ˊ˙
實務案例：
在一個模擬專案中建立 feature-login 分支。
新增登入頁面程式碼並提交。
用 Git Graph 確認分支與 main 的關係。
常見問題：
分支命名規範（例如 feature/、bugfix/）。
誤切換分支的處理方法。
小結：
分支如何隔離開發工作，提升協作效率。
預告下一篇文章：推送分支與拉取請求。
預估字數：1000-1200 字。
難度：★★☆☆☆（適合有 Git 基礎的初學者）。