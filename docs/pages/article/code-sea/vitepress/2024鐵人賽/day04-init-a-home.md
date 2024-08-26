---
title:  'Day04 - Init a home'
author: 'Opshell'
createdAt: '2024/09/04'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - vitepress
editLink: true
isPublished: false
---

## 目標

## 做法
1. 前置準備

1. 快速安裝

VitePress 可以單獨使用，也可以安裝到現有專案中。在這兩種情況下，都可以使用以下方式安裝它：
```
yarn add -D vitepress
```

2. 安裝精靈
VitePress 附帶一個命令行設置嚮導，可以説明你構建一個基本專案。安裝後，通過執行以下命令啟動精靈：
```
yarn vitepress init
```

將需要回答幾個簡單的問題：
┌  Welcome to VitePress!
│
◇  Where should VitePress initialize the config?
│  ./docs
│
◇  Site title:
│  My Awesome Project
│
◇  Site description:
│  A VitePress Site
│
◆  Theme:
│  ● Default Theme (Out of the box, good-looking docs)
│  ○ Default Theme + Customization
│  ○ Custom Theme
└

3. 檔結構
如果正在構建一個獨立的 VitePress 網站，可以在當前目錄 （） 中搭建網站。但是，如果在現有專案中與其他原始程式碼一起安裝VitePress，建議將網站搭建在嵌套目錄 （例如 ） 中，以便它與專案的其餘部分分開。././docs

假設選擇在 中搭建VitePress專案，生成的文件結構應該是這樣的：./docs

.
├─ docs
│  ├─ .vitepress
│  │  └─ config.js
│  ├─ api-examples.md
│  ├─ markdown-examples.md
│  └─ index.md
└─ package.json

https://vitepress.dev/reference/default-theme-home-page

## 結論
