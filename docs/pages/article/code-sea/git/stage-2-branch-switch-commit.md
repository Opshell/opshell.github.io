---
title: '關於 VS Code Git GUI 的那些事（二）：開分支、切分支、commit：便利貼的日常'
image: /images/article/git/branch-create.svg
description: '開分支是貼便利貼，切分支是換一張站，commit 是把站著的那張往前推。三個動作在 VS Code 裡各在哪裡按、指令是什麼，以及不小心 commit 到 main 上怎麼辦。'
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
Claude 照大綱重寫。「切不過去」那一節的三個解法，以及 commit 訊息的格式，是照這個倉庫目前的習慣寫的；跟你想推的規範不同就改。
:::

::: info 這篇的脈絡
系列第二篇，前一篇在[這裡](./stage-1-read-the-graph)。這篇講每天都在做的三件事：開分支、切分支、commit。例子不用假的登入頁，用的就是這篇文章自己：它是在 `docs/git-series` 分支上寫的，從 `main` 開出來。
:::

## 開分支：多貼一張便利貼
![開分支的當下，兩張便利貼貼在同一個 commit；在新分支提交後只有新分支往前走](/images/article/git/branch-create.svg)

```bash
git switch -c docs/git-series        # 新寫法：開一張新便利貼，然後站上去
git checkout -b docs/git-series      # 舊寫法，一樣的事
git switch -c docs/git-series main   # 指定從 main 開（不一定要站在 main 上）
```

開完的瞬間，`main` 跟 `docs/git-series` 貼在**同一個 commit** 上，圖上看不出差別。要等你在新分支上 commit 一次，它才會長出自己的線。

VS Code 裡：
- 狀態列左下角點分支名 → `+ Create new branch...`。
- 內建 Graph 或 Git Graph：右鍵任何一個 commit → `Create Branch...`。這個很好用，想從三天前的狀態開一條分支試東西，點那個點就好。

### 名字怎麼取
前綴加斜線：`feat/`、`fix/`、`docs/`、`chore/`、`refactor/`。Git Graph 會把斜線前面的當資料夾摺起來，分支一多就看得出好處。這個倉庫 2026 年 10 月同時開著的幾條：`redesign-2026-10`、`redesign-home`、`drafts-2026-10`、`deps-2026-10`、`feat/markdown-guide`、`docs/git-series`。前四條沒加前綴，是早期隨手取的，之後會慢慢統一。

## 切分支：換一張站
```bash
git switch main
git switch -          # 回到上一張（像 cd -）
```

VS Code 狀態列點分支名，選一個；Git Graph 右鍵分支名 → `Checkout Branch`。

切分支會把工作目錄的檔案換成那張便利貼指著的快照。**切不過去**的時候，是因為你手上有還沒提交的改動，而那些檔案在目標分支長得不一樣，git 不敢幫你蓋掉。三個解法：

| 解法 | 什麼時候用 |
|---|---|
| `git stash` 收進口袋，切過去，回來再 `git stash pop` | 改到一半、十分鐘內會回來 |
| 先 commit 一個「WIP」 | 這條分支本來就是你的，之後 rebase 時再整理（第五篇） |
| `git worktree add ../另一個資料夾 其他分支` | 兩邊都要同時開著，例如一邊跑 dev server 一邊改別的。這是我現在的主要做法，整篇在 [AI 專區](/article/ai/一個對話一棵樹-git-worktree) |

大綱裡原本沒有第三個，2025 年的我還不知道 worktree 這麼好用。

## commit：把站著的便利貼往前推
Source Control 面板：改過的檔案在 Changes 底下，按 `+` 收進 Staged Changes，上面打訊息，按 ✓。指令版：

```bash
git add -p                 # 一段一段問你要不要收，推薦
git add docs/pages/...     # 指定檔案
git commit -m "docs(article): Git 系列第二篇"
```

`git add -p` 值得特別推。它把每個檔案的改動切成一段一段（hunk）問你要不要收，所以你可以把「順手修的錯字」跟「真正的功能」分成兩個 commit。VS Code 也做得到：在 diff 檢視裡，改動的區塊旁邊有 `Stage Selected Ranges`（右鍵選單）。

### 一個 commit 一件事
不是為了好看，是為了第五篇的 revert 跟 cherry-pick：一個 commit 裡混了三件事，想退掉其中一件就退不掉。這個倉庫的訊息格式是 `type(scope): 一句中文`，寫**為什麼**而不只是改了什麼：

```text
feat(visitor): 瀏覽計數改用自家後端，拿掉不蒜子（#0090）
fix(dindon): 後台只有內容區會捲，表頭吸在內容區頂端
docs(devlog): 套件評估與訪客計數的開發記錄
```

括號裡的 `#0090` 是工作區溝通板的單號，跨倉庫找得回來。

## 不小心 commit 到 main 上
會發生的。尤其當你同時有好幾個對話在同一個倉庫做事，其中一個忘了先開分支。

![在 main 上誤提交之後，先在這個 commit 開分支，再把 main 退回一格](/images/article/git/wrong-branch-fix.svg)

記住便利貼的比喻就不會慌：commit 本身沒有錯，錯的只是便利貼貼錯張。所以**先貼對的，再撕錯的**：

```bash
git branch feat/oops            # ① 在這個 commit 貼一張新的便利貼
git switch feat/oops            # ② 站過去
git branch -f main HEAD~1       # ③ 把 main 這張撕回上一個 commit
```

順序不能反。先把 main 退回去的話，那個 commit 就暫時沒有任何便利貼指著，雖然 reflog 救得回來（第五篇），但何必。

GUI 版：Git Graph 右鍵那個 commit → `Create Branch...`，勾 Checkout；再右鍵上一個 commit → `Reset current branch to this commit` → 選 Hard（這時候你已經站在新分支上，所以 reset 的是 main……等等，不對，reset 動的是你站的那張）。所以 GUI 版其實是：先開新分支**不要** checkout，右鍵上一個 commit reset main（hard），再 checkout 新分支。看，GUI 也不見得比較不容易錯，這就是為什麼我說指令才是真相。

已經 push 出去的就不能這樣做了，要用 revert（第五篇）。

## 刪分支
```bash
git branch -d feat/oops    # 小寫 d：只刪已經合併過的，沒合會拒絕
git branch -D feat/oops    # 大寫 D：不管，刪
```

刪的是便利貼，commit 還在。合過的分支用完就刪，不然 Git Graph 的左邊會越來越長。

## 小結
- 開分支＝貼便利貼，當下兩張貼同一個點；切分支＝換一張站。
- 切不過去：stash、WIP commit、或 worktree。
- commit 一件事一個，訊息寫為什麼；`git add -p` 幫你切。
- 貼錯張：先貼對的再撕錯的，`branch` → `switch` → `branch -f`。

下一篇：[（三）origin 是誰：fetch、pull、push 與那條虛線](./stage-3-remote)。
