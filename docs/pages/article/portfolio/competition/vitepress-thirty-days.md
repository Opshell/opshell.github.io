---
layout: home
class: vitepress-thirty-days
hero:
  name: Day30 - 後記
  text: 完賽了~ 但是之後的路還很長。<br />最近發生很多事，接下來要好好的沉澱一下。
  tagline: 完賽感言
  image:
    src: /images/Opshell-vitepress-3.png
    alt: Opshell-3D
  actions:
    - theme: brand
      text: Day30 - 後記
      link: /article/code-sea/vitepress/2024鐵人賽/day30-epilog
title: 2024 鐵人賽 - 用 VitePress 建一個部落格（系列導讀）
image: ''
description: '2024 iThome 鐵人賽 VitePress 系列的導讀：30 天分五個階段，從 init 到可以上線的部落格，每一篇的連結都在這裡。'
keywords: ''
author: Opshell
createdAt: '2024-10-14'
categories:
  - portfolio
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把作品介紹頁補成系列導讀，照 Day01 前言的五個階段分組並連到 Day01 ~ Day30。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
2024 年參加 iThome 鐵人賽，用 30 天記錄怎麼用 `VitePress` 從零建一個部落格，也就是你現在看到的這個站。文章一篇一篇看很容易迷路，這頁把 30 篇照階段整理好，寫給想照著做一遍、或只想挑某個主題看的人。
:::

## 懶人包
- 30 天分五個階段：環境與基本設定 → Lint 與 Plugin → 用履歷頁練功能 → 改造主題、動態化 → 擴充套件與後記。
- 想快速架站：看 Day01 ~ Day09，做完就有一個能部署到 GitHub Pages 的站。
- 想要程式碼風格一致：Day10 ~ Day13，順便看我怎麼跟 `Prettier` 分手。
- 想做出自己的部落格功能（文章列表、分類、標籤、留言）：Day17 ~ Day30。

## 技術拆解

### 第一階段：前言、環境、專案建立和基礎設定（Day01 ~ Day09）
從為什麼選 `VitePress` 開始，init 專案、設定 config、自訂字型和 CSS 變數，把 config 拆檔，最後部署到 GitHub Pages。

- [Day01 - 前言](/article/code-sea/vitepress/2024鐵人賽/day01-preface)
- [Day02 - 環境準備&對齊](/article/code-sea/vitepress/2024鐵人賽/day02-front-end-developement)
- [Day03 - VitePress 部落格](/article/code-sea/vitepress/2024鐵人賽/day03-why-is-vitepress)
- [Day04 - Init VitePress](/article/code-sea/vitepress/2024鐵人賽/day04-init-a-home)
- [Day05 - 基本設定 Part1](/article/code-sea/vitepress/2024鐵人賽/day05-base-config-part-1)
- [Day06 - config sidebar、socialLinks、footer](/article/code-sea/vitepress/2024鐵人賽/day06-base-config-part-2)
- [Day07 - custom font & css](/article/code-sea/vitepress/2024鐵人賽/day07-font-css-var)
- [Day08 - config 拆分](/article/code-sea/vitepress/2024鐵人賽/day08-Split-config)
- [Day09 - Deploy to GitHub Pages](/article/code-sea/vitepress/2024鐵人賽/day09-github-page)

### 第二階段：`ESLint` & `stylelint` 整合與 Plugin（Day10 ~ Day13）
程式碼風格這件事，用 `antfu/eslint-config` 加 `stylelint`，再聊聊為什麼不用 `Prettier`。

- [Day10 - antfu/eslint-config](/article/code-sea/vitepress/2024鐵人賽/day10-antfu-eslint-config)
- [Day11 - stylelint](/article/code-sea/vitepress/2024鐵人賽/day11-stylelint)
- [Day12 - 我和 Prettier 分手了](/article/code-sea/vitepress/2024鐵人賽/day12-prettier-is-not-that-great)
- [Day13 - VitePress Plugin Setting](/article/code-sea/vitepress/2024鐵人賽/day13-vitepress-plugin-setting)

### 第三階段：用一份簡述履歷來玩 `VitePress` 的功能（Day14 ~ Day16）
用一個實際的頁面（履歷）練習素材、SVG 和資料的整理方式。

- [Day14 - build a resume resource](/article/code-sea/vitepress/2024鐵人賽/day14-build-a-resume-resource)
- [Day15 - build a resume svg](/article/code-sea/vitepress/2024鐵人賽/day15-build-a-resume-svg)
- [Day16 - build a resume data](/article/code-sea/vitepress/2024鐵人賽/day16-build-a-resume-data)

### 第四階段：改造主題、把麻煩的東西動態化（Day17 ~ Day23）
自訂 Layout、Markdown 擴充、`useData`，再把文章列表、分類、標籤做成自動產生，不用每次手動維護。

- [Day17 - 自訂一個Layout](/article/code-sea/vitepress/2024鐵人賽/day17-custom-layout)
- [Day18 - base markdown](/article/code-sea/vitepress/2024鐵人賽/day18-base-markdown)
- [Day19 - plus markdown](/article/code-sea/vitepress/2024鐵人賽/day19-plus-markdown)
- [Day20 - Extended Layout & useData](/article/code-sea/vitepress/2024鐵人賽/day20-extended-layout)
- [Day21 - Dynamic article list](/article/code-sea/vitepress/2024鐵人賽/day21-dynamic-article-list)
- [Day22 - classify](/article/code-sea/vitepress/2024鐵人賽/day22-classify)
- [Day23 - tags list](/article/code-sea/vitepress/2024鐵人賽/day23-tags-list)

### 第五階段：用套件擴充部落格 & 後記（Day24 ~ Day30）
留言（`giscus`）、瀏覽數（`busuanzi`）、圖片放大、沙盒、快捷鍵、sitemap，最後是完賽後記。

- [Day24 - giscus](/article/code-sea/vitepress/2024鐵人賽/day24-giscus)
- [Day25 - busuanzi](/article/code-sea/vitepress/2024鐵人賽/day25-busuanzi)
- [Day26 - medium-zoom](/article/code-sea/vitepress/2024鐵人賽/day26-medium-zoom)
- [Day27 - sandbox](/article/code-sea/vitepress/2024鐵人賽/day27-sandbox)
- [Day28 - Quick keys](/article/code-sea/vitepress/2024鐵人賽/day28-quick-keys)
- [Day29 - Sitemap](/article/code-sea/vitepress/2024鐵人賽/day29-sitemap)
- [Day30 - Epilog](/article/code-sea/vitepress/2024鐵人賽/day30-epilog)

## 例子與對比

### 該從哪一篇開始看？

| 你的狀況 | 建議路線 |
|---|---|
| 完全沒碰過 `VitePress` | Day01 → Day09 照順序做 |
| 已經有站，想統一程式碼風格 | Day10 → Day12 |
| 想把文章列表、分類、標籤自動化 | Day20 → Day23 |
| 只想加留言或瀏覽數 | Day24、Day25 |

::: tip 2026 年回頭看
系列寫在 2024 年，用的是當時的 `VitePress` 1.x。套件版本和設定細節之後可能有變，照著做遇到不一樣的地方，以官方文件為準。
:::

## 結論
30 天的鐵人賽像跑一場馬拉松，跑完才發現終點只是另一條路的起點。這頁就是那張路線圖，挑一段你需要的開始跑吧 ~~(水分依然充足，請自備毛巾)~~。

<style lang="scss">
    .vitepress-thirty-days {
        .VPHero {
            transform: translateY(120px);
            &.has-image {
                .image {
                    transform: translateY(50px);
                    .image-bg {
                        width: 350px;
                        height: 350px;
                    }
                    .image-src {
                        max-width: 400px;
                        max-height: 400px;
                    }
                }
                .name, .text {
                    line-height: 1.5;
                }
            }

            @include setRWD(959px) {
                transform: translateY(0);
                .main {
                    transform: translateY(80px);
                }
            }
            @include setRWD(638px) {
                &.has-image .image .image-src {
                    max-width: 300px;
                    max-height: 300px;
                }
            }
        }
    }
</style>
