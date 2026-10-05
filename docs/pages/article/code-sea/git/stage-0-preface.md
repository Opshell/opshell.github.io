---
title: '關於 VS Code Git GUI 的那些事（零）：指令會背，圖看不懂'
image: /images/article/git/refs-and-head.svg
description: '2025 年列的七篇大綱，一篇都沒寫。一年半後回來，寫的理由變了：同一個倉庫裡同時有四個 AI 在改東西，看不懂那張分支圖，就不知道誰在幹嘛。這個系列從「教你用 Git Graph」變成「教你看懂那張圖」。'
keywords: ''
author: Opshell
createdAt: '2026-10-05'
categories:
  - Git
tags:
  - Git
  - VS Code
  - Git Graph
editLink: true
isPublished: false
---

::: warning 草稿
Claude 照 2025-04 的大綱重寫成七篇。文裡「我」的經歷是從這個倉庫的 git 歷史、開發記錄與工作區的規則整理出來的，不是編的，但口氣是模仿的。看一下有沒有說錯，補幾句自己的話再發。
:::

::: info 這篇的脈絡
2025 年 4 月我列了一份「VS Code Git GUI」的教學大綱，想寫七篇，結果一篇都沒寫，資料夾裡躺了一年半的七個檔案全是大綱。
2026 年 10 月回來補，動機已經不一樣了：這個部落格的倉庫現在同時有四個 Claude 在改，六個 worktree、六條分支。看不懂那張分支圖的話，連「誰在哪裡改什麼」都答不出來。所以這個系列從「教你用 Git Graph 擴充套件」變成「教你看懂那張圖」，工具只是順便。
:::

## 緣起
我用 git 的方式長期是「背指令」。`add`、`commit`、`push`、`pull`，偶爾 `checkout -b`，遇到衝突的標準流程是 ~~砍掉重 clone~~ 深呼吸。

分支圖是裝了 `Git Graph` 之後才真的開始看的。看了之後才發現，原來我背的那些指令，每一個都只是在圖上「搬一張便利貼」而已。這個領悟其實應該在五年前發生，但沒關係，現在也不晚，因為真正需要它的時刻才剛到。

2026 年開始，我讓好幾個 Claude 同時在同一個倉庫裡做事：一個翻新主題、一個整理草稿、一個升套件、一個寫這個系列。它們彼此看不到對方的對話，唯一的共同語言就是那張 git 的圖。有一次其中一個直接在別人的分支上改東西，兩邊沒提交的改動混在同一份 `git status` 裡，那天我才認真地把「一個對話一棵樹」訂成規矩。

那件事會留到系列最後兩篇講。前面六篇先把圖看懂。

## 這個系列的立場
1. **圖是用來看的，操作用 GUI 或指令都可以。** 每個操作我兩種都給，但指令才是真相，GUI 只是幫你按。
2. **只用三個詞：點、便利貼、站的地方。** commit 是一個點，分支是貼在點上的便利貼，HEAD 是你現在站在哪張便利貼上。整個系列不講 blob、tree、packfile，講了你也不會因此比較會用。
3. **例子都是真的。** 範例分支圖是這個部落格倉庫 2026 年 10 月初的樣子，包括那條五天內合併了十六次 main 的翻新分支。假的「feature-login 登入頁」案例我寫不下去。
4. **原本大綱裡的東西，不對的就不寫。** 2025 年的大綱說要模擬「10 個分支、5 人協作」，我沒有 5 個人，我有 4 個 AI，那就寫 4 個 AI。

## 圖怎麼看
整個系列的圖長這樣：

![分支只是貼在 commit 上的標籤，HEAD 指向你現在站的分支](/images/article/git/refs-and-head.svg)

- 圓點是 commit，底下的灰字是它的名字（真的 hash 太長，這裡用 A、B、C）。
- 有顏色的方框是分支，也就是便利貼。**實心**的那張是你現在站的地方（HEAD）。
- **虛線**的方框是遠端分支（`origin/main` 這種），第三篇才會出現。
- 線的顏色跟著分支走。

圖是我自己用一支小腳本畫的 SVG（[`scripts/gen-git-diagrams.mjs`](https://github.com/Opshell/opshell.github.io/blob/main/scripts/gen-git-diagrams.mjs)），不是截圖。原因有二：mermaid 的 `gitGraph` 畫不出 worktree 跟 reset 這種東西；截圖過半年版面就變了。底色故意跟程式碼區塊一樣，深淺色模式都不用另外處理。

## 工具：2026 年還要裝 Git Graph 嗎
這是大綱寫的時候沒有、現在必須先回答的問題。

| 工具 | 現況 | 我的用法 |
|---|---|---|
| VS Code 內建 **Source Control Graph** | 1.93（2024 年 8 月）起內建，在 Source Control 面板下方。看歷史、右鍵 checkout、cherry-pick、從某個 commit 開分支都有 | 平常看圖就用它 |
| **Git Graph**（mhutchie） | 2021 年之後沒再更新，也沒有開源授權，但九百萬人還在用，功能最齊：右鍵就能 merge、rebase、reset（三種力道）、revert | 要「動手」的時候用它，操作比內建多很多 |
| **GitLens** | 免費的部分：blame、檔案歷史、互動式 rebase 編輯器。進階功能要付費 | 只為 blame 跟 rebase 編輯器裝的 |

三個我都裝著，不衝突。你只想裝一個的話：內建的看圖夠用，指令補操作。

## 系列目錄
1. [（一）看懂那張圖：點、便利貼、站的地方](./stage-1-read-the-graph)
2. [（二）開分支、切分支、commit：便利貼的日常](./stage-2-branch-switch-commit)
3. [（三）origin 是誰：fetch、pull、push 與那條虛線](./stage-3-remote)
4. [（四）合併：fast-forward、merge commit 與衝突](./stage-4-merge)
5. [（五）整理與救援：rebase、reset、reflog](./stage-5-rebase-reset-reflog)
6. [（六）分支策略：一個人、四個 AI、一條 main](./stage-6-strategy)

看完六篇之後，AI 專區有兩篇是這個系列的「應用題」：[一個對話一棵樹](/article/ai/一個對話一棵樹-git-worktree) 講 worktree，[AI 幫你 commit 之後](/article/ai/ai-幫你-commit-之後-你的工作變成管歷史) 講歷史該長什麼樣。

## 結語
分手的理由總是特別薄弱，開始的理由也是。我開始認真看 git 的圖，不是因為想成為 git 高手，是因為某天打開 `git log --graph`，發現自己看不懂自己的倉庫。

下一篇從那個「看不懂」開始。
