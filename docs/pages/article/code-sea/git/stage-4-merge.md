---
title: '關於 VS Code Git GUI 的那些事（四）：合併：fast-forward、merge commit 與衝突'
image: /images/article/git/merge-commit.svg
description: 'main 沒動過，合併只是搬便利貼；兩邊都動過，就得生一個有兩個爸爸的 commit。衝突就是在生那個 commit 的時候發生的。VS Code 的衝突介面哪邊是哪邊，一次講清楚。'
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
Claude 照大綱重寫。VS Code 衝突介面的按鈕名稱（Accept Current／Incoming／Both、Resolve in Merge Editor）照 2026 年的版本寫，請在自己的環境對一次。
:::

::: info 這篇的脈絡
系列第四篇，前一篇在[這裡](./stage-3-remote)。分支開了、改完了，要合回 main。合併只有兩種形狀，衝突只會在其中一種發生。
:::

## 第一種：fast-forward，只是搬便利貼
![main 沒有新 commit 時，合併只是把 main 的標籤往前搬](/images/article/git/fast-forward.svg)

你從 `main` 的 B 開了 `feat/login`，做了 C、D。這段時間 `main` 完全沒動，還停在 B。現在站在 main 上合併：

```bash
git switch main
git merge feat/login
# Updating b2e9...d4c1
# Fast-forward
```

git 發現 B 是 D 的祖先，不用做任何合併運算，直接把 `main` 這張便利貼從 B 搬到 D。**沒有新 commit**，歷史變成一條直線，看不出曾經有過分支。

一個人加幾個 AI 的專案裡，這是最常見的合併。每條分支都是從最新的 main 開出來、做完就合，main 中間沒人動，幾乎每次都 fast-forward。

### 要不要留下泡泡
fast-forward 乾淨，但「看不出曾經有分支」有時候是缺點：三個月後你想知道「訪客計數這個功能是哪幾個 commit」，直線上找不到邊界。所以有個選項：

```bash
git merge --no-ff feat/login
```

強迫 git 就算能 fast-forward 也生一個 merge commit，歷史上留一個泡泡，一個功能一個泡泡。想看「main 上有哪些功能」就 `git log --first-parent main`，只走泡泡不進去，像看目錄。

我兩種都用：文件、草稿這類直接 fast-forward；功能分支 `--no-ff`。這個判斷留到第六篇。

## 第二種：三方合併，生一個有兩個爸爸的 commit
![兩邊都有新 commit 時，合併會產生一個有兩個爸爸的 merge commit](/images/article/git/merge-commit.svg)

分支開出去之後，main 也動了（E、F）。現在兩邊各走各的，沒辦法搬便利貼了事。git 會找三個點：分岔點 B、main 的 F、分支的 D，算出「兩邊各自改了什麼」，合成一個新的 commit M。**M 有兩個爸爸**：F 跟 D。這就是三方合併，merge commit 就是這個 M。

```bash
git switch main
git merge feat/login
# Merge made by the 'ort' strategy.
```

那個 `ort` 是 git 2.34 之後的合併演算法名字，看到它就知道是三方合併，不是 fast-forward。

GUI：Git Graph 右鍵 `feat/login` → `Merge into current branch`，對話框裡可以勾 `Create a new commit even if fast-forward is possible`，就是 `--no-ff`。內建的在 Source Control 面板 `...` → `Branch` → `Merge Branch...`。

## 衝突：生 M 的時候兩邊改了同一行
三方合併的時候，如果 main 跟分支改了**同一個檔案的同一個區域**，git 不知道該聽誰的，就停下來：

```text
Auto-merging docs/.vitepress/config.mts
CONFLICT (content): Merge conflict in docs/.vitepress/config.mts
Automatic merge failed; fix conflicts and then commit the result.
```

這時候 M 還沒生出來，你處在「合併進行中」的狀態。檔案裡會長出這種東西：

```text
<<<<<<< HEAD
    title: 'Opshell\'s Blog',
=======
    title: 'Opshell 的部落格',
>>>>>>> feat/i18n
```

### 哪邊是哪邊
這是衝突最容易搞錯的地方，用圖的語言記：

- `<<<<<<< HEAD` 到 `=======`：**你站的那張便利貼**（main）現在的樣子。VS Code 叫它 **Current**。
- `=======` 到 `>>>>>>> feat/i18n`：**被合進來的**那張。VS Code 叫它 **Incoming**。

merge 的時候你站在 main，所以 Current 是 main。但第五篇 rebase 的時候，你站在分支上把它接到 main 後面，git 內部是「以 main 為基底一個一個套用你的 commit」，所以 Current 反而是 main、Incoming 是你的分支——跟直覺相反。記法：**Current 永遠是「基底」，Incoming 永遠是「正在被套上去的」**。

### 在 VS Code 解
打開衝突的檔案，每一塊衝突上方有一排小字：`Accept Current Change`、`Accept Incoming Change`、`Accept Both Changes`、`Compare Changes`。點一個就好。右下角還有一顆 `Resolve in Merge Editor`，打開三格的合併編輯器：左邊 Incoming、右邊 Current、下面結果，可以逐段勾選，適合大衝突。

解完之後：

```bash
git add docs/.vitepress/config.mts   # 告訴 git 這個檔我解好了
git commit                           # 訊息會自動填 "Merge branch 'feat/i18n'"
```

VS Code 的 Source Control 面板會把解完的檔案列在 Merge Changes 底下，按 `+` 就是 `git add`，再按 ✓ 就是 commit。

想放棄：

```bash
git merge --abort   # 回到合併前，像沒發生過
```

### 衝突不是錯誤
是兩個人（或兩個 AI）對同一行有不同意見，git 只是把決定權交回給你。真正要避免的不是衝突，是**沒有人記得為什麼改**。訊息寫清楚（第二篇），衝突的時候才知道該留哪邊。

## 合併之前看一眼
不管 GUI 還是指令，合併前我一定做這件事：

```bash
git diff main...feat/login --stat   # 這條分支到底動了哪些檔
git log main..feat/login --oneline  # 多了哪些 commit
```

AI 做的分支尤其要看，它偶爾會「順手」改到你沒請它改的檔案。看完再合，合完 push，上線。

## 小結
- main 沒動：fast-forward，搬便利貼，沒有新 commit；`--no-ff` 可以強迫留泡泡。
- 兩邊都動：三方合併，生一個兩個爸爸的 M。
- 衝突發生在生 M 的時候；Current 是你站的（基底），Incoming 是被合進來的。
- 解完 `add` 再 `commit`；想放棄 `--abort`。

下一篇：[（五）整理與救援：rebase、reset、reflog](./stage-5-rebase-reset-reflog)。
