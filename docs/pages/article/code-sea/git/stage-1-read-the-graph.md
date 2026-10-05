---
title: '關於 VS Code Git GUI 的那些事（一）：看懂那張圖：點、便利貼、站的地方'
image: /images/article/git/commit-chain.svg
description: 'git 的圖只有三種東西：commit 是一個點，分支是貼在點上的便利貼，HEAD 是你現在站的那張。把這三個詞記住，之後所有指令都只是在圖上搬便利貼。'
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
Claude 照大綱重寫。VS Code 各面板的位置與名稱請在自己的環境對一次，版本不同按鈕會搬家。
:::

::: info 這篇的脈絡
這是「關於 VS Code Git GUI 的那些事」系列的第一篇，前言在[這裡](./stage-0-preface)。這篇不教任何會改變倉庫的操作，只教看圖：圖上每一個東西是什麼、代表什麼、VS Code 裡去哪裡看。
:::

## 一個 commit 是一個點，它記著上一個
![三個 commit 串成一條線，每個 commit 指向它的上一個](/images/article/git/commit-chain.svg)

一個 commit 裡有四樣東西：一串 hash（它的名字）、一段訊息、那一刻全部檔案的快照，以及**它爸爸的 hash**。最後那個最重要：commit 只認得過去，不認得未來。從最新的 commit 出發，順著爸爸一路往回走，走得到的就是「歷史」；走不到的 commit 就算還在硬碟裡，圖上也看不到它。

所以工具畫的圖雖然通常不畫箭頭，方向要自己記著：**線是從新的指向舊的**。這件事在第五篇講 reset 跟 reflog 的時候會救你一命。

看一個 commit 要看三件事：訊息、改了哪些檔、爸爸是誰。VS Code 內建的 Source Control Graph 點一下節點就展開改了哪些檔；Git Graph 也是點一下，多一個「Commit Details」面板。

## 分支是便利貼
![分支只是貼在 commit 上的標籤，HEAD 指向你現在站的分支](/images/article/git/refs-and-head.svg)

這是整個系列最重要的一句話：**分支不是一條線，是一張貼在某個 commit 上的便利貼。**

證據在這裡：

```bash
cat .git/refs/heads/main
# 0f76035a1c3e... ← 一行 hash，就這樣，沒了
```

一張便利貼就是「名字 → hash」。開分支是多貼一張，秒開，不複製任何檔案；刪分支是撕掉一張，commit 本身不會消失。圖上你看到的那些「線」，是工具順著爸爸關係畫出來給你看的，git 自己沒有存線。

便利貼會自己往前跑：你站在它上面 commit，它就移到新的 commit。你沒站在上面的便利貼，不管你 commit 幾次都不會動。圖上的 `main` 停在 C，是因為後來的 D、E 都是站在 `feat/login` 上提交的。

## HEAD 是你站的地方
HEAD 也是個檔案：

```bash
cat .git/HEAD
# ref: refs/heads/feat/login ← 我現在站在 feat/login 這張便利貼上
```

HEAD → 便利貼 → commit，兩層。圖上實心的那張就是 HEAD 在的地方。VS Code 左下角狀態列顯示的分支名稱，顯示的就是 HEAD 指著哪張便利貼。

有一種狀況叫 **detached HEAD**：HEAD 直接指著一個 commit，沒有經過便利貼。在 Git Graph 右鍵某個舊 commit 按 Checkout 就會進入這個狀態，VS Code 狀態列會顯示一截 hash 而不是分支名。這時候 commit 不是不行，但新 commit 上沒有任何便利貼，你一切走它就變孤兒。真的要在舊 commit 上做事，先貼一張便利貼再說（第二篇）。

## 虛線的便利貼：origin/
![本機 main 比 origin/main 多兩個 commit](/images/article/git/remote-refs.svg)

`origin/main` 這種名字開頭有 `origin/` 的，是遠端分支的**本機快照**：上次跟 GitHub 對過的時候，它的 `main` 在哪裡。它不會自己更新，也不是遠端現在的樣子；你 `fetch` 它才動。第三篇整篇都在講這條虛線，這裡先認得它就好。

## 在 VS Code 裡去哪裡看
| 想看什麼 | 內建 | Git Graph | GitLens |
|---|---|---|---|
| 整張圖 | Source Control 面板往下捲，**Graph** 區塊 | 命令面板 `Git Graph: View Git Graph`，或狀態列的 Git Graph 按鈕 | 側欄 Commits／Branches |
| 某個 commit 改了什麼 | 點節點 | 點節點 | 點節點 |
| 某個檔案的歷史 | 檔案右鍵 → Open Timeline | — | File History 側欄 |
| 這一行是誰改的 | — | — | 游標停在那一行就顯示（blame） |
| 我站在哪 | 狀態列左下角 | 圖上粗體的分支 | 狀態列 |

我自己的分工：平常看圖開內建的 Graph，要動手（合併、rebase、reset）才開 Git Graph，blame 看 GitLens。

## 指令對照
GUI 畫給你看的，終端機也看得到，而且在 AI 的對話裡只有這個版本：

```bash
git log --graph --oneline --all --decorate   # 整張圖，全部分支
git log --oneline -20                        # 只看我站的這條，最近 20 個
git status -sb                               # 我站在哪、跟遠端差幾個、改了什麼
git branch -vv                               # 每張便利貼在哪、追蹤哪個遠端
git show <hash> --stat                       # 某個 commit 改了哪些檔
```

第一行太長，大家都會做成別名：

```bash
git config --global alias.lg "log --graph --oneline --all --decorate"
```

## 看圖時問自己的三個問題
1. **我站在哪？** 找實心的便利貼。
2. **哪些分支還沒合回來？** 線分出去之後沒有接回 main 的，就是還沒合。
3. **本機跟遠端差多少？** 實心的 `main` 跟虛線的 `origin/main` 之間隔了幾個點。

這三個問題答得出來，第二篇到第六篇的每一個操作你都看得懂它在圖上做了什麼。

## 小結
- commit 是點，記著爸爸；線是從新指向舊。
- 分支是便利貼，一行 hash；開分支免費，刪分支不刪 commit。
- HEAD 是你站的便利貼；實心的就是它。
- `origin/` 開頭的虛線，是上次對過的遠端快照。

下一篇：[（二）開分支、切分支、commit：便利貼的日常](./stage-2-branch-switch-commit)。
