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

## 快速安裝

`VitePress` 可以單獨使用，也可以安裝到現有專案中。在這兩種情況下，都可以使用以下方式安裝它：
```sh
  yarn add -D vitepress
```

## 安裝精靈
`VitePress` 附帶一個命令行生成精靈，可以幫助你生成一個基本專案。安裝後，通過執行以下命令啟動精靈：
``` sh
  yarn vitepress init
```

需要回答幾個簡單的問題：
``` sh
┌  Welcome to VitePress!
│
◇  Where should VitePress initialize the config?
│  ./docs
│
◇  Site title:
│  Opsehell\'s Blog
│
◇  Site description:
│  Opsehll\'s work and life records
│
◇  Theme:
│  Default Theme + Customization
│
◇  Use TypeScript for config and theme files?
│  Yes
│
◇  Add VitePress npm scripts to package.json?
│  Yes
│
└  Done! Now run yarn run docs:dev and start writing.

Tips:
- Since you've chosen to customize the theme, you should also explicitly install vue as a dev dependency.

```
::: tip
  如果是安裝到現有專案中，可以按照需求調整第一個選項的輸入，從而調整成適合的專案目錄結構。
:::

## 目錄結構
在精靈的幫助下，我們成功建立了專案，新生的專案寶寶有著下面的目錄結構：

``` sh
.
├─ docs
│  ├─ .vitepress
│  │  ├─ theme
│  │  │  ├─ index.ts
│  │  │  └─ style.css
│  │  └─ config.mts
│  ├─ api-examples.md
│  ├─ index.md
│  └─ markdown-examples.md
├─ node_modules
└─ package.json
```

`docs` 目錄是 VitePress 專案的根目錄。

`.vitepress` 目錄是 `config 文件`、`Dev Server 的暫存(cache)`、`build 的輸出(dist)` 和 `theme(自訂主題)` 的位置。

建議將 `.vitepress/cache` `.vitepress/dist` 加入 `.gitignore` 文件中。

## 嘗試啟動
``` sh
  yarn docs:dev
```
`docs:dev` 會啟動建立在 `Vite` 基礎上，具有即時熱更新的本地開發Server。

官方也提供另外一種直接調用 Vitepress的方式：
``` sh
  yarn vitepress dev docs
```
雖然我都用第一種~~

沒啥問題的話會看到下面的畫面：
![啟動畫面](/images/article/day04-init-a-home-1.png)

https://vitepress.dev/reference/default-theme-home-page

## 結論
