---
title: 'AI 幫你 commit 之後，你的工作變成管歷史'
image: /images/article/git/human-ai-loop.svg
description: 'AI 寫的 commit 訊息比我好，commit 得也比我勤。然後我得到了一條十六個 merge 的分支、三個檢查沒過就推上去的 commit、一次讓所有人 hash 全變的歷史改寫。這篇講當 commit 這件事交出去之後，人剩下的工作是什麼：訂規則、裝閘門、守三條線，以及為什麼歷史的品質突然變得比以前重要。'
keywords: ''
author: Opshell
createdAt: '2026-10-05'
categories:
  - AI
tags:
  - AI
  - Claude Code
  - Git
  - 協作
editLink: true
isPublished: false
---

::: warning 草稿
Claude 依照這個工作區的 git 歷史、記憶檔與開發記錄整理。十六個 merge、三次檢查沒跑、#0064 歷史改寫、用舊專案 git 歷史寫進化史系列，都是真的；hook 與 branch protection 的建議還沒在這個倉庫實作（目前只有部署用的 CI），是提案。
:::

::: info 這篇的脈絡
[上一篇](./一個對話一棵樹-git-worktree) 講多個 AI 怎麼共用一個倉庫。這篇往上一層：AI 會 commit 之後，人在 git 這件事上還剩什麼工作。答案是「管歷史」，而且這個工作比以前重要，因為讀歷史的不再只有人。
:::

## 緣起：它 commit 得比我好
用 Claude Code 之前，我的 commit 訊息是 `adj`、`fix`、`update`、`修正`。用了之後，訊息變成這樣：

```text
feat(visitor): 接上 POST /v1/blog/hit，三個顯示點改讀 ref、拿掉不蒜子（#0090）
fix(dindon): 宣傳頁的錨點按鈕停錯位置；手機上加入步驟排在動畫前
docs(devlog): 套件評估與訪客計數的開發記錄
```

有 scope、有為什麼、有單號、一個 commit 一件事。不是因為它比較認真，是因為它**手上有完整的上下文**：它知道這次改動是為了溝通板上哪張單、改了哪三個檔、為什麼拿掉不蒜子。人 commit 的時候常常已經忘了一半，它不會忘。

所以 commit 這件事我交出去了。然後問題來了。

## 交出去之後發生的三件事
### 一、十六個 Merge
Git 系列[第六篇](/article/code-sea/git/stage-6-strategy)講過的那條分支：五天，十六次「同步 main」，歷史圖像一把梳子。AI 每次開工都做「正確的事」（同步），只是沒有人告訴它頻率。

### 二、三次檢查沒跑就 commit
規矩是 commit 前要跑 `pnpm check`（lint、stylelint、typecheck、test、build）。AI 寫的指令長這樣：

```bash
pnpm lint:style && pnpm typecheck
cat >> docs/devlog/web_開發記錄v0.2.md <<'EOF'
……
EOF
git add -A && git commit -m "..."
```

第一行失敗了，第二行照跑，第三行照 commit。因為 `&&` 只管同一行，heredoc 之後換行的 `git add` 不在那條鏈裡。三次。第三次還推上了 main，CI 擋下來才沒上線，只好補一個排版 commit。

AI 的修正方式是在整段指令開頭加 `set -e`。可行，但那是「記得加」，跟「記得跑檢查」是同一種脆弱。

### 三、歷史改寫，三十個 commit 的 hash 全變
官網倉庫裡 commit 進了幾支演示影片，我決定從歷史裡清掉，force push。9 月 25 日之後的 30 個 commit 每一個 hash 都變了。那次有留鏡像、有對照表、開了一張單（#0064）通知所有對話去換掉文件裡引用的編號。沒出事，但那是因為當時官網還只有一個工作目錄；晚一週做，就是六條分支全部重接。

這三件事的共同點：**AI 把每一步都做對了，但沒有人管整體的形狀。** 那個人應該是我。

## 分工：AI 負責 commit，人負責歷史
![AI 在自己的分支上提交，人看過才合併進 main，main 一推就上線](/images/article/git/human-ai-loop.svg)

分工畫出來是這樣：AI 在自己的分支上改、跑檢查、commit，想 commit 幾次都可以；人決定要不要合進 main。main 等於上線。

這個分工下，人的工作變成四件：

### 1. 訂規則，而且寫下來
AI 每個對話都是從零開始，它不會「記得上次你說過」。規則要在它開工時就在它眼前：專案說明檔（`CLAUDE.md`）、它的記憶檔、或者 skill。這個倉庫目前的 git 規則（最後一條是這次才加的）：

- 一件事一條分支，從 main 開，在自己的 worktree 做。
- `type(scope): 一句中文（#單號）`，寫為什麼。
- 檢查過才 commit。
- 不為同步而同步：還沒推就 rebase，推了就少合。
- 不碰 main、不 push、不改歷史，除非人開口。

每一條都是被咬了才加的。規則不是設計出來的，是事故的沉澱。

### 2. 把規則變成閘門，不要靠它記得
「檢查過才 commit」失敗三次之後我才想通：這條規則不該是給 AI 的，該是給 git 的。

```bash
# .husky/pre-commit（或 simple-git-hooks、lefthook，看你喜歡哪個）
pnpm lint-staged
```

pre-commit hook 在 commit 的瞬間跑，失敗就不讓 commit，AI 記不記得都一樣。`lint-staged` 只跑改到的檔案，幾秒鐘，不會拖慢它的迭代。

同樣的邏輯：
- main 分支保護（GitHub 的 branch protection）：就算 AI 哪天真的 push 了 main，沒過 CI 的也進不去。
- `git config --global pull.rebase true`：pull 的收法用設定決定，不是每次叫它記得加 `--rebase`。

批判一下自己：這些閘門 2024 年就該裝了，跟 AI 無關。只是以前只有我一個人 commit，錯了我知道；現在有四個不會互相提醒的「人」在 commit，閘門從「最好有」變成「不能沒有」。

### 3. 看過才合
AI 的分支合進 main 之前，我做三件事：

```bash
git log main..docs/git-series --oneline      # 它 commit 了什麼
git diff main...docs/git-series --stat       # 它動了哪些檔
cd ../opshell-git-series && pnpm docs:dev    # 開起來看
```

第二行最重要。AI 偶爾會「順手」改到沒請它改的東西，`--stat` 一眼就看到一個不該出現的檔名。有一次它全倉庫自動修 lint，修到了我自己沒提交的一行文案，雖然它刻意沒把那個檔收進 commit，但線上版本就留著錯的那一行。看 `--stat` 的習慣是那次養成的。

合的時候用不用 `--no-ff`？功能分支用，留一個泡泡，之後 `git log --first-parent main` 可以像看目錄一樣看 main 上做了哪些事，要退就整個泡泡 revert。文件、草稿這種直接 fast-forward。要不要 squash？我不 squash：AI 的每一步 commit 是它的思考軌跡，出問題時「它在第幾步改了什麼」很有用，壓掉就沒了。

### 4. 守三條線
AI 自己不做的三件事：**合進 main、push、改歷史**。這三件事的共同點是「影響別人」：main 是上線，push 是別人拿得到，改歷史是別人手上的 hash 作廢。它要做這三件事之前會停下來問，我習慣之後反而放心讓它做其他所有事。

## 為什麼歷史突然變重要
以前 git 歷史是給人看的，而人其實很少看。現在多了一種讀者。

十月初我請 AI 寫一個「API 串接進化史」的系列：從大學時代的 AJAX 到現在的 TanStack Query，我自己怎麼一路演變。素材是四個舊專案的倉庫。它用 `git log -S` 找某個函式第一次出現的 commit、用 `git show` 看當時的封裝檔、對著 commit 訊息還原每一次改法的動機，挖出我自己都忘了的事：同一份 `useApi.ts` 從 A 專案複製到 B 專案再到 C 專案，連寫反的 `if (!token)` 一起帶走；兩個專案在同一個月犯了同一個錯，一個 15 天後修、一個 16 個月後才修。

那四個倉庫的歷史品質不一，看得出差別：訊息寫了為什麼的那段，它還原得準；訊息是 `update` 的那段，它只能猜，而且猜錯過。

這才是我想說的：**歷史品質以前影響的是「三個月後的你」，現在影響的是「下一個對話的 AI」**。下一個對話是從零開始的，它認識這個專案的方式就是讀檔案跟讀歷史。歷史乾淨，它接手得快、解釋得準；歷史是一把梳子加一堆 `update`，它就只能編。

所以管歷史不是潔癖。它是你留給下一個對話的上下文。

## 小結
- AI 的 commit 訊息比人好，因為它手上有完整的上下文；commit 可以交出去。
- 交出去之後出的事（merge 氾濫、檢查沒跑、歷史改寫）都不是它做錯，是沒人管形狀。
- 人的工作變成四件：規則寫下來、規則變閘門（hook、branch protection、config）、看過才合（`log`、`diff --stat`、開起來看）、守三條線（main、push、歷史）。
- 歷史品質的讀者多了一個：下一個從零開始的 AI。它讀得懂，才接得下去。
