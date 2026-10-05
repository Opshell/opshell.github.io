---
title: 'GitLens：清掉暫存提交，但把修改留下來'
image: ''
description: '為了比對分支先隨手 commit 了一個暫存提交，現在想把它清掉、檔案的修改卻要留著。GitLens 右鍵選單的四個指令各做什麼、該按哪一個，一次講清楚。'
keywords: ''
author: Opshell
createdAt: '2025-08-28'
categories:
  - Git
tags:
  - Git
  - GitLens
  - VS Code
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的問答整理成「清掉暫存提交但保留修改」的操作筆記。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
常見的情況是：手上的東西改到一半，為了切去別的分支比對，先隨手 commit 了一個「暫存用」的提交。比對完回來，想把這個暫存提交清掉，但檔案的修改一行都不想丟。

GitLens 在提交上按右鍵，會跳出 `Revert Commit`、`Reset Current Branch to Commit`、`Reset Current Branch to Previous Commit`、`Rebase Current Branch onto Commit` 四個長得很像的指令，按錯一個就可能把修改一起送走。這篇是寫給跟我一樣，看到這四個選項會猶豫三秒的人。
:::

## 懶人包
- 要「拿掉提交、保留修改」，用的是 `Reset`，而且模式選 `Soft`（或 `Mixed`），**絕對不要選 `Hard`**。
- 在暫存提交的**前一個**提交按 `Reset Current Branch to Commit`，或直接在暫存提交上按 `Reset Current Branch to Previous Commit`，效果一樣。
- `Revert Commit` 會多生一個反向提交，`Rebase` 是在搬提交，兩個都不是這個情境要的。
- 暫存提交如果已經推上遠端，reset 之後要強制推送，別人也拉過的話先講一聲。

## 操作拆解

### 先搞懂 reset 的三種模式
`reset` 做的事是「把分支的指標搬回某個提交」，三種模式差在**被拿掉的那些提交，裡面的修改要放哪**：

| 模式 | 分支指標 | 暫存區（staged） | 工作目錄的檔案 | 這個情境 |
|---|---|---|---|---|
| `--soft` | 搬回去 | 修改保留，而且還是 staged | 保留 | 最適合 |
| `--mixed`（預設） | 搬回去 | 清空，修改變回 unstaged | 保留 | 也可以 |
| `--hard` | 搬回去 | 清空 | **一起回到那個提交的樣子** | 修改會不見 |

用生活比喻：`soft` 是把寄出去的包裹退回來、東西還裝在箱子裡；`mixed` 是退回來、東西拿出來放桌上；`hard` 是退回來直接丟掉 ~~（然後你會在 reflog 裡哭著找它）~~。

### 四個指令各做什麼

**1. Revert Commit**
建立一個新的提交，內容是指定提交的反向操作。原本的提交歷史保留，反向的更改加在新的提交裡。
適合「已經推上去、大家都拉了，只能用新提交把它抵銷」的情況。
這個情境**不符合**：它會多一個提交，而且你的修改會被反向抵銷掉，跟「保留修改」正好相反。

**2. Reset Current Branch to Commit**
把目前的分支指向你點的那個提交，之後的提交從歷史上拿掉，修改怎麼處理看選的模式。
這個情境**符合**：在暫存提交的**前一個**提交上按，選 `Soft`，修改會留在暫存區，歷史回到暫存提交之前。

**3. Reset Current Branch to Previous Commit**
跟第二個一樣，只是固定退到「目前這個提交的上一個」，不用自己挑目標。
這個情境**符合**，前提是暫存提交只有一個；同樣選 `Soft`。

**4. Rebase Current Branch onto Commit**
把目前分支上的提交，搬到指定的提交後面重新套一次，會改寫歷史，也可能遇到衝突。
這個情境**不符合**：它是在整理歷史，不是拿掉提交。

::: tip 選單文字以你的 GitLens 版本為準
不同版本的 GitLens，reset 跳出來的模式選項文字可能略有不同（例如寫成 `Soft Reset`、`Mixed Reset`），認明 soft／mixed 就對了，看到 hard 先停手。
:::

## 例子與對比

### 用 GitLens 點
1. 打開 GitLens 的 Commit Graph（或側欄的提交清單）。
2. 找到暫存提交**下面那一個**提交，右鍵 → `Reset Current Branch to Commit...`。
3. 模式選 `Soft`。
4. 打開「原始檔控制」面板，修改都還在 Staged Changes 裡，暫存提交已經從歷史上消失。

### 對照的指令
```bash
# 確認一下目前的提交歷史
git log --oneline -3

# 拿掉最後一個提交，修改留在暫存區（等於 Reset Current Branch to Previous Commit + Soft）
git reset --soft HEAD~1

# 想讓修改變回 unstaged，就用 mixed（git reset 不帶參數也是 mixed）
git reset --mixed HEAD~1
```

### 如果暫存提交是開在一個「暫存分支」上
有時候不只是一個提交，而是整條暫存分支都想收掉，修改帶回原本的分支：

```bash
# 1. 在暫存分支上，先把提交拆回成修改
git reset --soft HEAD~1

# 2. 帶著未提交的修改切回原本的分支（沒有衝突的話，修改會跟著過去）
git switch main

# 3. 刪掉暫存分支；它上面已經沒有需要的提交，用 -D 強制刪除
git branch -D temp-branch
```

切分支如果遇到衝突，Git 會擋下來，這時可以先 `git stash` 再切過去 `git stash pop`。

### 按錯了怎麼辦
真的手滑按了 `Hard`，先別慌，提交其實還在 reflog 裡：

```bash
git reflog
# 找到暫存提交那一行的 hash，例如 a1b2c3d
git reset --hard a1b2c3d
```

前提是那些修改**有被 commit 過**；從來沒 commit 的修改被 hard reset 掉，就真的找不回來了。

## 結論
這個情境一句話：**對前一個提交 `Reset`，模式選 `Soft`**。`Revert` 是寫一封道歉信公開撤回，`Rebase` 是把整疊信重新排過，`Reset --soft` 才是把信從郵筒拿回來、內容一字不改。

下次右鍵選單跳出來的時候，至少不用再猶豫三秒了，頂多兩秒。
