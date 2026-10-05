---
title: '關於 VS Code Git GUI 的那些事（五）：整理與救援：rebase、reset、reflog'
image: /images/article/git/reset-modes.svg
description: 'rebase 是剪下貼上，貼過去的是複製品；reset 是把便利貼往回撕，三種力道差在哪幾層跟著退；reflog 是「我剛剛到底做了什麼」的黑盒子。三個指令都在改歷史，所以都有一條「推出去就不要碰」的線。'
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
Claude 照大綱重寫，並把原本 `GitLens.md` 那份「清掉暫存分支但保留修改」的問答收進 reset 那一節。reflog 預設保留期限寫 90 天（未被指向的是 30 天），可以查一下自己機器的設定。
:::

::: info 這篇的脈絡
系列第五篇，前一篇在[這裡](./stage-4-merge)。前四篇的操作都在「往前加」，這篇的三個指令都在「改歷史」。改歷史不可怕，可怕的是改到別人已經拿走的那一段。
:::

## rebase：剪下來、貼到 main 後面
![rebase 把分支上的 commit 重做一次，接到 main 最新的 commit 後面](/images/article/git/rebase.svg)

第四篇的三方合併留下一個兩個爸爸的 M。有些人不喜歡那個泡泡，想要一條直線，就用 rebase：

```bash
git switch feat/login
git rebase main
```

git 做的事：找到分岔點 B，把 B 之後你的 C、D 剪下來，站到 main 最新的 F 上，把 C、D 的**改動**一個一個重新套上去，變成 C'、D'。然後把 `feat/login` 這張便利貼貼到 D'。

重點在那個撇號：**C' 不是 C**。內容一樣，但爸爸不一樣，所以 hash 不一樣，是複製品。舊的 C、D 還在硬碟裡，只是沒有便利貼指著它們，圖上會淡掉（或直接消失，看工具）。

rebase 完再回 main 合併，就是第四篇的 fast-forward，一條直線。

### 黃金法則
**推出去的 commit 不要 rebase。** 原因看圖就懂：你把 C、D 換成了 C'、D'，但別人（或你的另一台電腦、另一個 worktree）手上還是 C、D。對方下次 pull，git 會看到兩套長得一樣但 hash 不同的 commit，於是……生一個 merge commit 把它們合起來，你辛苦弄直的線又彎回去了，而且多了重複的 commit。

所以 rebase 只用在「只有我有」的 commit 上：還沒 push 的分支、或只有我一個人用的分支。這個倉庫每條 worktree 分支在合回 main 之前都還沒推，剛好符合。

### 衝突
rebase 是一個一個 commit 重套，所以衝突可能發生好幾次，每次解完：

```bash
git add <檔案>
git rebase --continue   # 套下一個
git rebase --abort      # 放棄，回到 rebase 前
```

VS Code 的衝突介面跟第四篇一樣，但 Current／Incoming 反過來：Current 是 main（基底），Incoming 是你正在套的那個 commit。

GUI：Git Graph 右鍵 `main` → `Rebase current branch on Branch`。

## 互動式 rebase：整理自己的 commit
![互動式 rebase 把三個小 commit 壓成一個](/images/article/git/interactive-rebase.svg)

做功能的時候 commit 常常長這樣：「登入頁」、「修錯字」、「又修」、「真的修好了」。給別人看之前（或給三個月後的自己看之前）可以整理：

```bash
git rebase -i main
```

會打開一個清單：

```text
pick a1f3c 登入頁
pick 7b2e9 修錯字
pick c04d1 又修
```

把後兩個的 `pick` 改成 `squash`（或 `s`），存檔，三個就壓成一個。其他常用的：`reword` 改訊息、`drop` 丟掉、把行的順序換掉就是換 commit 順序。

預設編輯器是 vim，可以改成 VS Code：

```bash
git config --global core.editor "code --wait"
```

裝了 GitLens 的話，`rebase -i` 會直接開一個圖形化的清單，每一行有下拉選單選 pick／squash／drop，拖拉換順序。這是 GitLens 免費功能裡我覺得最值得的一個。

同樣的規則：只整理還沒推出去的。

## reset：把便利貼往回撕
![reset 的三種模式分別影響 HEAD、暫存區、工作目錄中的哪幾個](/images/article/git/reset-modes.svg)

reset 是「把我站的這張便利貼撕回某個舊 commit」。難的不是撕，是撕的時候**那些改動去哪了**。git 有三層：HEAD（歷史）、暫存區（`git add` 過的）、工作目錄（你眼前的檔案）。三種力道差在退幾層：

```bash
git reset --soft HEAD~1    # 只有 HEAD 退；改動全部留在暫存區，等你重新 commit
git reset HEAD~1           # --mixed（預設）：HEAD 退、暫存清空；改動還在檔案裡
git reset --hard HEAD~1    # 三層全退；改動消失（commit 過的 reflog 救得回，沒 commit 過的真的沒了）
```

### 真實的問題：「暫存分支比對完，想清掉但保留修改」
這是我自己去年問 AI 的問題，原文在 `GitLens.md` 躺了一年。情境：我開了一條分支、commit 了幾次當暫存，用來跟別的分支比對；比完了，想把這些暫存 commit 清掉，**但檔案的修改要留著**。GitLens 右鍵給了四個選項：Revert Commit、Reset to Commit、Reset to Previous Commit、Rebase onto Commit。

答案是 **Reset（soft）**：HEAD 退回去，改動留在暫存區，想怎麼重新 commit 都行。Revert 是反向生新 commit（下面講），不是你要的；Rebase 是換爸爸，更不是。

GUI：Git Graph 右鍵目標 commit → `Reset current branch to this commit...` → 選 Soft／Mixed／Hard。它把三種力道做成三個按鈕，這一點比內建好。

### 推出去的用 revert
reset 是改歷史，推出去的 commit 不能 reset（跟 rebase 同一個理由）。推出去的用 revert：生一個**新的** commit，內容是把目標 commit 反過來做一遍。歷史不變，只是多一個「我把那個退掉了」的點。

```bash
git revert <hash>
```

Git Graph 右鍵 commit → `Revert...`。第二篇說「一個 commit 一件事」，在這裡兌現：混了三件事的 commit，revert 會把三件一起退。

## reflog：剛剛到底發生什麼事
![reset 之後舊的 commit 沒有消失，reflog 還記得它](/images/article/git/reflog.svg)

`--hard` 按下去，D 從圖上消失了，你心跳停了一下。第一篇說過：commit 只認得過去，所以沒有便利貼指著的 commit，圖上就看不到。但它還在硬碟裡，而且 git 偷偷記了一本「HEAD 曾經指過哪裡」的流水帳：

```bash
git reflog
# 0f76035 HEAD@{0}: reset: moving to HEAD~1
# a4c1d9e HEAD@{1}: commit: 誤提交
# ...
```

找到 D 的 hash，貼一張便利貼上去，它就回來了：

```bash
git branch rescue a4c1d9e     # 或 git reset --hard a4c1d9e 直接退回去
```

reflog 只在本機，預設保留 90 天（沒有便利貼指著的 30 天）。它救得回 reset、rebase、刪錯分支、detached HEAD 上的 commit。救不回的只有一種：**從來沒 commit 過的改動**。所以我的習慣是「怕的時候先 commit 一個 WIP」，不怕醜，之後 `rebase -i` 可以壓掉。

GitLens 側欄有一個 Repositories → Reflog 視圖；Git Graph 沒有，用終端機。

## cherry-pick：只要那一個
```bash
git cherry-pick <hash>
```

把某個 commit 的改動複製到你站的分支上，變成一個新 commit（hash 不同）。典型用法：main 上修了一個 bug，長壽分支也要，但不想把整個 main 合進來，就挑那一個。Git Graph 右鍵 commit → `Cherry Pick...`。

挑過來的是複製品，之後兩條分支真的合併時 git 通常認得出來內容一樣，不會重複套用，但偶爾會衝突，知道一下。

## stash：口袋
```bash
git stash          # 把沒 commit 的改動收進口袋，工作目錄變乾淨
git stash pop      # 拿出來
git stash list     # 口袋裡有幾個
```

第二篇提過它是「切不過去」的解法之一。老實說我現在幾乎不用了：口袋裡的東西沒有便利貼、沒有訊息、過兩天就忘了那是什麼。要暫存就 commit 一個 WIP；要同時開兩條分支就 worktree。

## 小結
- rebase：剪下貼上，貼過去的是複製品；`-i` 可以壓、改、丟、排序。
- reset：soft 留在暫存區、mixed 留在檔案、hard 全丟。推出去的用 revert。
- reflog：沒有便利貼的 commit 還在，90 天內救得回；沒 commit 過的救不回。
- 三個指令共同的線：**推出去的不要碰**。

下一篇：[（六）分支策略：一個人、四個 AI、一條 main](./stage-6-strategy)。
