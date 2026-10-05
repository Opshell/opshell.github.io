---
title: '關於 VS Code Git GUI 的那些事（三）：origin 是誰：fetch、pull、push 與那條虛線'
image: /images/article/git/ahead-behind.svg
description: 'fetch 只動虛線的便利貼，push 動遠端的，pull 是 fetch 再接一個 merge 或 rebase。搞清楚每個動作在圖上動了哪一張，push 被拒絕的時候就不會想按 --force。'
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
Claude 照大綱重寫。「本機 main 比 origin/main 多」那一節是這個工作區真的發生的事；`pull.rebase` 與別名是 Claude 的建議，查過你的全域設定目前兩個都沒設，要寫成「我的設定」就先真的設一下。
:::

::: info 這篇的脈絡
系列第三篇，前一篇在[這裡](./stage-2-branch-switch-commit)。前兩篇都在本機。這篇把 GitHub 拉進來，講 `origin/` 開頭那條虛線到底是什麼，以及 fetch、pull、push 各自搬了哪張便利貼。
:::

## origin 是個外號
```bash
git remote -v
# origin  git@github.com:Opshell/opshell.github.io.git (fetch)
# origin  git@github.com:Opshell/opshell.github.io.git (push)
```

`origin` 只是你 clone 的時候 git 自動幫遠端倉庫取的外號，沒有任何神聖的意思，改叫 `github` 也可以。有第二個遠端的時候（fork 別人的專案）才會多一個 `upstream` 之類的。

## 虛線便利貼：origin/main
![本機 main 比 origin/main 多兩個 commit](/images/article/git/remote-refs.svg)

第一篇說過：`origin/main` 是「**上次對過的時候**，遠端的 main 在哪」。它住在你的 `.git` 裡，是一張你不能直接站上去改的便利貼（真的要站，會進 detached HEAD）。

這張便利貼只在三個時候會動：fetch、pull、push。

## 三個動作各搬哪一張
| 動作 | 動了什麼 | 沒動什麼 |
|---|---|---|
| `git fetch` | 把遠端的 commit 抓下來，**只更新虛線**的便利貼 | 你站的分支、你的檔案，完全不動 |
| `git push` | 把你的 commit 送上去，遠端的 main 搬到你這裡；虛線跟著對齊 | — |
| `git pull` | `fetch` 之後，再把虛線那張**合進**你站的分支（merge 或 rebase） | — |

fetch 是最安全的動作，隨時可以按，按完去看圖：虛線跑到哪了？跟我的實線差幾個？這是為什麼我說「先 fetch 再想」。

VS Code 的 Source Control 面板右上角 `...` → `Fetch`／`Pull`／`Push`，或命令面板打 `Git: Fetch`。狀態列左下角那個 ↻ 是 **Sync**，等於 pull 再 push，一鍵完成。它方便，但等一下會講為什麼我把它當成陷阱。

## 分岔：ahead 2、behind 1
![本機 main 與 origin/main 各自往前走，分岔了](/images/article/git/ahead-behind.svg)

```bash
git status -sb
## main...origin/main [ahead 2, behind 1]
```

你在這台電腦 commit 了 D、E，同時另一台電腦（或另一個對話）推了 X 上去。兩邊都動過，分岔了。這時候 `git push` 會被拒絕：

```text
! [rejected]  main -> main (non-fast-forward)
```

它的意思是「遠端有你沒有的東西，我不敢幫你蓋掉」。正確反應是 pull，**不是** `--force`。`--force` 是把遠端的 X 直接扔掉換成你的 D、E，對方推上去的東西就這樣沒了。

## pull 的兩種收法
![pull 用 merge 會多一個合併 commit；用 rebase 會把本機的 commit 接到遠端後面](/images/article/git/pull-merge-vs-rebase.svg)

分岔之後 pull，git 要把 X 跟 D、E 收成一條，兩種收法：

- **merge**（預設）：生一個 merge commit M，兩個爸爸。歷史忠實記錄「這裡曾經分岔過」，但多了一個沒有內容的點。
- **rebase**：把你的 D、E 剪下來，接到 X 後面重做一次，變成 D'、E'。一條直線，但 D、E 被重寫了，hash 變了。

值得設的一行：

```bash
git config --global pull.rebase true   # pull 一律用 rebase
```

理由：還沒 push 出去的 commit 只有我自己有，重寫它們不會傷到任何人；而 merge 法會在歷史上留下一堆「Merge branch 'main' of github.com:...」這種沒內容的點。第六篇有一條分支留了十六個，那是前車之鑑。

但 rebase 有一條黃金法則：**已經 push 出去的 commit 不要 rebase**（第五篇細講）。`pull --rebase` 只重寫「你本機比遠端多出來的那幾個」，剛好都是還沒推的，所以安全。

VS Code 命令面板有 `Git: Pull (Rebase)`，或者設了上面那行之後，一般的 Pull 就是 rebase。

### 為什麼我不按 Sync
Sync ＝ pull ＋ push 一鍵。問題在它的 pull 走的是你的預設設定：沒設 `pull.rebase` 的話，每次兩邊有分岔它就默默生一個 merge commit 再推上去。你會在歷史裡看到一堆自己沒印象的 Merge，那就是它。設了 `pull.rebase true` 之後 Sync 就乖了，但我還是建議分開按，因為 push 前值得再看一眼圖。

## 真的發生過：本機 main 比 origin/main 多
這個工作區同時有好幾個對話在用同一個倉庫（各自一個 worktree，AI 專區那篇會講）。某一天我從 `main` 開新分支，開完一看，`main` 比 `origin/main` 多了一個 commit：是另一個對話把它的工作併進 main 了，但**沒有 push**。

後果是我的新分支帶著一個「還沒上線、也不是我做的」commit。沒有壞掉，但要說清楚。我們後來訂的規則是：**併進 main 的人要馬上 push**，因為這個倉庫 push main 就等於上線，沒推的 main 是個半成品狀態，不該留在那裡讓別人踩。

開分支之前多看一眼 `git status -sb`，ahead 不是 0 就要想一下為什麼。

## PR 是什麼
GitHub 的 Pull Request 翻成圖的語言是：「我有一張便利貼，請你把它併進你的 main」。底層就是第二篇的 branch 加第四篇的 merge，GitHub 多給你的是一個討論、審查、按按鈕的介面。

一個人的專案我不開 PR，但我會做 PR 做的事：合併前看一遍差異。

```bash
git diff main...docs/git-series --stat    # 三個點：從分岔點算起，這條分支改了什麼
git log main..docs/git-series --oneline   # 兩個點：這條分支多了哪些 commit
```

三個點跟兩個點的差別是這個系列裡最容易被問的。記法：`diff` 用三個點（只看分支自己的改動，不含 main 後來的變化），`log` 用兩個點（列出對方有、我沒有的 commit）。

## 小結
- `origin/main` 是上次對過的快照，只有 fetch、pull、push 會動它。
- fetch 隨時可以按，按完看圖。
- push 被拒＝遠端有你沒有的，pull 回來，不要 force。
- `pull.rebase true`：還沒推的 commit 重寫沒關係，直線比較好讀。
- 併進 main 就推，main 不該有「做了但沒上線」的狀態。

下一篇：[（四）合併：fast-forward、merge commit 與衝突](./stage-4-merge)。
