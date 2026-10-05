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
title: 2022 鐵人賽 - 從 JavaScript 跌進 TypeScript（系列導讀）
image: ''
description: '2022 iThome 鐵人賽 TypeScript 系列的導讀：從型別基礎一路到把 Vite + Vue 專案轉成 TypeScript，每一篇的連結都在這裡。'
keywords: ''
author: Opshell
createdAt: '2024-10-14'
categories:
  - portfolio
tags:
  - 鐵人賽
  - TypeScript
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把作品介紹頁補成系列導讀，依主題分組並連到站上現有的 Day01 ~ Day33。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
注意：上面 frontmatter 的 `hero`（名稱、圖片、按鈕連結）和 `class: vitepress-thirty-days` 是從 VitePress 那頁複製過來的，按鈕會連到 VitePress 系列的 Day30，發佈前要換成 TypeScript 系列的內容。另外站上沒有 Day13、Day17 的檔案，要確認是漏搬還是本來就沒有。
:::

::: info 這篇的脈絡
2022 年第一次參加 iThome 鐵人賽，起因很單純：一踏進 `Vite` 就被 `TypeScript` 絆倒，乾脆用 30 天把自己爬出來的過程記下來。這頁把整個系列照主題整理好，寫給剛要從 `JavaScript` 跨到 `TypeScript`、而且手上有 `Vue 3` 專案的人。
:::

## 懶人包
- 系列從零開始：環境 → 型別基礎 → 函式、物件、介面 → Class、Enum、型別縮小、宣告檔 → 實戰把 `Vite + Vue` 專案轉成 TS。
- 只想補型別觀念：看 Day04 ~ Day21 就夠。
- 想看 TS 怎麼落地到 Vue 專案：Day22 ~ Day30，最後三篇是 `ESLint`、`Prettier`、自動引入的後記調整。
- 寫在 2022 年，狀態管理用的是 `Vuex`，2026 年的新專案請換成 `Pinia`。

## 技術拆解

### 事前準備（Day01 ~ Day03）
為什麼要學、環境怎麼裝、第一個 Hello TypeScript。

- [Day01 - 前言](/article/code-sea/typescript/2022鐵人賽/day01-preface)
- [Day02 - 環境安裝](/article/code-sea/typescript/2022鐵人賽/day02-environment-installation)
- [Day03 - Hello Typescript](/article/code-sea/typescript/2022鐵人賽/day03-hello-typescript)

### 型別基礎（Day04 ~ Day08）
推論、註記、斷言三兄弟，再把基礎型別、複合型別、特殊型別和陣列一次認識。

- [Day04 - 推論、註記、斷言](/article/code-sea/typescript/2022鐵人賽/day04-inference-annotation-assertion)
- [Day05 - 基礎的型別](/article/code-sea/typescript/2022鐵人賽/day05-basic-type)
- [Day06 - 複合型別](/article/code-sea/typescript/2022鐵人賽/day06-composite-type)
- [Day07 - TypeScript's 特殊型別](/article/code-sea/typescript/2022鐵人賽/day07-special-type)
- [Day08 - Array Type](/article/code-sea/typescript/2022鐵人賽/day08-array)

### 函式、物件與介面（Day09 ~ Day14）
函式型別分兩篇，接著是物件、`interface` 和型別別名。

- [Day09 - Function Type Part1](/article/code-sea/typescript/2022鐵人賽/day09-function-part-1)
- [Day10 - Function Type Part2](/article/code-sea/typescript/2022鐵人賽/day10-function-part-2)
- [Day11 - Object Type](/article/code-sea/typescript/2022鐵人賽/day11-object)
- [Day12 - Interface Type Part1](/article/code-sea/typescript/2022鐵人賽/day12-interface-type-part1)
- [Day14 - 別名 Alias](/article/code-sea/typescript/2022鐵人賽/day14-alias)

### Class、Enum 與型別的進階用法（Day15 ~ Day21）
`class` 和 `interface` 怎麼搭、`enum` 什麼時候用、Type Guard 與 Narrowing，最後是 `.d.ts` 宣告檔。

- [Day15 - Class](/article/code-sea/typescript/2022鐵人賽/day15-class)
- [Day16 - Class X Interface](/article/code-sea/typescript/2022鐵人賽/day16-class-x-interface)
- [Day18 - 列舉 Enum](/article/code-sea/typescript/2022鐵人賽/day18-enum)
- [Day19 - Type Guard 型別檢測 & Narrowing](/article/code-sea/typescript/2022鐵人賽/day19-type-guard-arrowing)
- [Day20 - 宣告檔案 Part 1](/article/code-sea/typescript/2022鐵人賽/day20-declare-file-part-1)
- [Day21 - 宣告檔案 Part 2](/article/code-sea/typescript/2022鐵人賽/day21-declare-file-part-2)

### 實戰：把 Vite + Vue 專案轉成 TypeScript（Day22 ~ Day30）
裝 `Vite` 與 plugin、store、`axios` 與 router，接著把登入、取資料重構成 TS，再做 SVG sprite 和遞迴選單。

- [Day22 - vite install](/article/code-sea/typescript/2022鐵人賽/day22-vite-install)
- [Day23 - vite plugin install](/article/code-sea/typescript/2022鐵人賽/day23-vite-plugin-install)
- [Day24 - Vuex install & setting](/article/code-sea/typescript/2022鐵人賽/day24-vuex-install-setting)
- [Day25 - Store](/article/code-sea/typescript/2022鐵人賽/day25-store)
- [Day26 - axios & router](/article/code-sea/typescript/2022鐵人賽/day26-axios-router)
- [Day27 - App.vue & Login Refactoring](/article/code-sea/typescript/2022鐵人賽/day27-app-login-refactoring)
- [Day28 - getData Refactoring](/article/code-sea/typescript/2022鐵人賽/day28-getData-refactoring)
- [Day29 - svg sprite](/article/code-sea/typescript/2022鐵人賽/day29-svg-sprite)
- [Day30 - recursion menu](/article/code-sea/typescript/2022鐵人賽/day30-recursion-menu)

### 後記調整（Day31 ~ Day33）
完賽後補的三篇：`ESLint`、`Prettier`、自動引入。

- [Day31 - Postscript Adjustment ESLint](/article/code-sea/typescript/2022鐵人賽/day31-postscript-adjustment-eslint)
- [Day32 - Postscript Adjustment Prettier](/article/code-sea/typescript/2022鐵人賽/day32-postscript-adjustment-prettier)
- [Day33 - Postscript Adjustment AutoLoad](/article/code-sea/typescript/2022鐵人賽/day33-postscript-adjustment-autoload)

## 例子與對比

### 2022 vs 2026：哪些還能照做？

| 主題 | 系列寫的（2022） | 2026 年的建議 |
|---|---|---|
| 型別基礎、函式、介面、Narrowing | 照做沒問題 | 觀念沒變，語法以 `TypeScript` 5.x 為準 |
| 狀態管理 | `Vuex` | 新專案用 `Pinia` |
| ESLint 設定 | 舊版 `.eslintrc` | 改用 flat config（`eslint.config.js`） |
| 程式碼格式 | `ESLint` + `Prettier` | 我後來跟 `Prettier` 分手了，見 [VitePress 系列 Day12](/article/code-sea/vitepress/2024鐵人賽/day12-prettier-is-not-that-great) |

::: tip
想看比較新的 TS 主題，站上還有 [索引簽章](/article/code-sea/typescript/索引簽章)、[泛型](/article/code-sea/typescript/泛型)、[Enum 使用實例](/article/code-sea/typescript/enum) 可以接著看。
:::

## 結論
這個系列是一個菜鳥從 `TypeScript` 坑裡爬出來的完整紀錄，跌倒的地方都留著，剛好讓後面的人少踩幾個。型別觀念到現在都還適用，工具鏈的部分就當成時光膠囊看吧 ~~(2022 年的自己，你的 Vuex 我幫你收好了)~~。

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
