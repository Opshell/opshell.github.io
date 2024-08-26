---
title:  'Day08 - Deploy to Github pages'
author: 'Opshell'
createdAt: '2024/09/08'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - vitepress
editLink: true
isPublished: false
---

##

## 做法
// 設定 public 根目錄
默認情況下，我們假設網站將部署在功能變數名稱 （） 的根路徑上。如果站點在子路徑中提供服務，例如 ，則需要在 VitePress 設定中將 base 選項設定為 。/https://mywebsite.com/blog/'/blog/'

例：如果你使用的是 Github（或 GitLab）頁面並部署到 ，請將 設定為 。user.github.io/repo/base/repo/

// 建庫
1. 建立 "倉庫" [圖1]
2. "倉庫" 名稱 opshell.github.io 請參考 [关于 GitHub Pages](https://docs.github.com/zh/pages/getting-started-with-github-pages/about-github-pages#types-of-github-pages-sites)
3. [關於 "倉庫" 可見性](https://docs.github.com/zh/repositories/creating-and-managing-repositories/about-repositories#about-repository-visibility)
4. 选择“使用 README 初始化此存储库”。

// 建站

// [自動部署](https://vitepress.dev/zh/guide/deploy)

##

## 參考
