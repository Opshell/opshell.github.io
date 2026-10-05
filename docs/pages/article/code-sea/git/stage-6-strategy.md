---
title: '關於 VS Code Git GUI 的那些事（六）：分支策略：一個人、四個 AI、一條 main'
image: /images/article/git/merge-noise.svg
description: '大綱要我介紹 Git Flow 並模擬「10 個分支、5 人協作」。我沒有 5 個人，我有 4 個 AI，所以這篇寫我真的在用的模型，以及一條五天內合併了十六次 main 的分支教我的事。'
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
Claude 照大綱重寫。十六個 merge 的案例與歷史改寫（#0064）都是這個倉庫真的發生的；「該怎麼做」的那幾條是 Claude 的建議，請以你實際想推的規矩為準。
:::

::: info 這篇的脈絡
系列最後一篇，前一篇在[這裡](./stage-5-rebase-reset-reflog)。前五篇是指令，這篇是「什麼時候用哪一個」。原本 2025 年的大綱列了 Git Flow、GitHub Flow、Trunk-based 三種模型要我一一介紹，再模擬一個五人協作的大型專案。我只做前半，後半換成真的：一個人加四個 AI。
:::

## 三種模型的形狀
![Git Flow、GitHub Flow、Trunk-based 三種分支模型的形狀](/images/article/git/branch-models.svg)

| 模型 | 形狀 | 適合 | 代價 |
|---|---|---|---|
| **Git Flow** | `main` 只放發行版，`develop` 是日常，功能從 develop 開、合回 develop，發行時開 `release`，線上出事開 `hotfix` | 有版本號、有發行週期的軟體（桌面 App、函式庫） | 五種分支，圖最複雜；持續部署的網站根本用不到 release |
| **GitHub Flow** | 只有 `main`，每件事開一條短命分支，PR 合回 main 就上線 | 持續部署的網站、服務 | main 要隨時能上線，所以合併前的檢查要可靠 |
| **Trunk-based** | 幾乎不開分支，大家直接進 main，沒做完的功能用 feature flag 藏起來 | 大團隊、CI 很強、一天合幾十次 | 要有 flag 機制跟很好的測試，不然 main 隨時壞 |

一個比一個少分支。分支越多越安全，也越難看懂；分支越少越快，但要靠別的東西（flag、CI）兜底。沒有哪個對，只有哪個跟你的發行方式搭。

這個部落格 push main 就上線（GitHub Pages），沒有版本號，所以是 GitHub Flow。叮咚記帳的 Android 跟後端倉庫更極端：各只有一個 AI 對話在改，整個倉庫只有一條 `main`，連分支都很少開，commit 直接進去。那其實是 trunk-based 的極簡版，撐得住是因為「一個倉庫一個對話」，沒有人會跟它搶。

## 我實際的模型：GitHub Flow 加 worktree
- **`main` 等於上線。** 推上去就部署，所以 main 上不能有半成品，也不能有「做了但沒推」的 commit（第三篇那個案例）。
- **一件事一條分支，一條分支一個資料夾。** 每條分支用 `git worktree` 開在自己的資料夾裡，同時可以開著好幾條，各自跑各自的 dev server。這是因為同時有好幾個 AI 對話在做事，細節在 [AI 專區那篇](/article/ai/一個對話一棵樹-git-worktree)。
- **AI commit，人合併。** AI 在它的分支上想 commit 幾次都可以；合進 main 這個動作是我按的，按之前看過。
- **合完就刪**：分支跟 worktree 都刪，不留。

## 真實案例：十六個 Merge origin/main
![一條長壽分支每天把 main 合併進來，歷史會被合併 commit 淹沒](/images/article/git/merge-noise.svg)

2026 年 9 月 30 日開了一條 `redesign-2026-10`，做部落格視覺翻新，活了五天。這五天裡 main 也一直有東西進去（別的對話在修官網、發文章）。負責翻新的那個 AI 每次開工都很勤勞地「同步一下 main」：

```text
4740d18 Merge remote-tracking branch 'origin/main' into redesign-2026-10
40f04a0 Merge remote-tracking branch 'origin/main' into redesign-2026-10
1a948e6 Merge remote-tracking branch 'origin/main' into redesign-2026-10
6eb5a1c Merge remote-tracking branch 'origin/main' into redesign-2026-10
...（共十六個）
```

十月二日一天就合了九次。打開 `git log --graph`，那條分支右邊長出十六條斜線接回 main，像一把梳子，真正的改動（翻新第一到第五階段、後台外殼、稜鏡首頁）全部淹在裡面。

### 為什麼會這樣
不是 AI 笨，是它太聽話。「開工先同步 main」是個合理的習慣，但人會憑感覺判斷「main 有沒有我需要的東西」，AI 沒有這個感覺，看到 `origin/main` 有新 commit 就合。而且每次 merge 都成功、沒衝突、檢查全綠，沒有任何訊號告訴它這樣不好。

### 代價
- 圖不能看。十六個沒內容的點，`git log` 一半是 Merge。
- `git bisect` 找哪個 commit 弄壞東西的時候，要在 merge 之間跳來跳去。
- 合回 main 的時候，這條分支跟 main 的關係已經盤根錯節，`--no-ff` 的泡泡會包著十六個小泡泡。

### 該怎麼做
分兩種情況，第五篇的黃金法則決定走哪條：

1. **分支還沒推出去**（只有這個 worktree 有）：需要 main 的東西就 `git rebase main`，整條分支剪下來貼到最新的 main 後面，一條直線，零個 merge commit。
2. **分支已經推出去**（有備份到 GitHub、或別台電腦也在用）：不能 rebase，那就**少合**。只在「真的需要 main 上某個東西」的時候合一次，不要每天合；最後要合回 main 之前再合一次解衝突。五天合兩次是合理的，十六次不是。

還有一條給 AI 的規矩，這次才要寫進它的說明檔：**不要為了同步而同步**。開工時 `git fetch` 看一眼就好，main 有新東西不代表你需要它。

## 真實案例二：改寫歷史，三十個 commit 的 hash 全變
2026 年 9 月 28 日，官網倉庫裡有幾支演示影片被 commit 進去了，只 clone `main` 就 136 MB。我決定把它們從歷史裡清掉（`git filter-repo` 這一類的工具，只改寫 9 月 25 日之後那一段），然後 force push。結果是那 30 個 commit **每一個 hash 都變了**，倉庫瘦成 75 MB。

做之前留了一份改寫前的完整鏡像跟一張「舊 hash → 新 hash」的對照表；做完在工作區的溝通板開了一張單（#0064）通知所有對話：溝通板跟待辦文件裡引用到的官網 commit 編號已經換成新的，別台電腦上的 clone 要重新 clone。那時候官網還只有一個工作目錄，所以沒有分支要重接。

運氣好的地方在這裡：**如果晚一個禮拜做，就是六個 worktree、六條分支全部要重新 rebase。** 教訓是第五篇那條線的放大版：改歷史之前，先確定沒有別的分支開著；非改不可，就要有鏡像、有對照表、通知每一個拿著舊 hash 的人（包括 AI）。可以的話，影片這種東西一開始就不該進倉庫，放 R2 或任何物件儲存。

## 幾條固定的規矩
整個系列講完，我真的在執行的規矩只有這幾條：

1. **開工先 `git worktree list` 跟 `git status -sb`**：知道自己站在哪、main 有沒有沒推的東西。
2. **一件事一條分支，從 main 開**：分支名加前綴 `feat/`、`fix/`、`docs/`、`chore/`。
3. **一個 commit 一件事，訊息寫為什麼，帶單號**：`type(scope): 一句中文（#單號）`。
4. **檢查過才 commit**：lint、typecheck、build。這條曾經靠「記得跑」執行，失敗過三次，壞掉的 commit 推上去被 CI 擋下來才發現。靠記憶不如靠 hook，這點在 [AI 專區那篇](/article/ai/ai-幫你-commit-之後-你的工作變成管歷史) 細講。
5. **不為同步而同步**：還沒推就 rebase，推了就少合。
6. **合併前看 `diff main...分支 --stat`**，合完馬上 push，分支跟 worktree 刪掉。
7. **推出去的不改歷史**；非改不可，先通知所有人。

## 結語
2025 年的大綱最後一篇叫「複雜分支合併與大型專案的 Git 策略」，預估兩千五百字、難度五顆星。寫到這裡我發現，大型專案的策略我沒資格寫，但「一個人同時指揮四個 AI 改同一個倉庫」這件事，2025 年的大綱裡還不存在，現在卻是我每天在做的。

這個系列到這裡結束，但它其實是個前菜。真正讓我重新把 git 學一遍的，是接下來那兩篇：[一個對話一棵樹](/article/ai/一個對話一棵樹-git-worktree)，以及 [AI 幫你 commit 之後，你的工作變成管歷史](/article/ai/ai-幫你-commit-之後-你的工作變成管歷史)。
