---
title: '一個對話一棵樹：多個 AI 同時改一個倉庫，git worktree 怎麼用'
image: /images/article/git/worktrees.svg
description: '四個 Claude 同時在同一個倉庫做事，第一週就有人在別人的分支上改東西。解法不是叫它們排隊，是 git worktree：一個 .git、好幾個資料夾，每個對話站在自己的分支上。這篇講怎麼開、哪些東西不會跟過去、什麼時候其實不該平行。'
keywords: ''
author: Opshell
createdAt: '2026-10-05'
categories:
  - AI
tags:
  - AI
  - Claude Code
  - Git
  - worktree
editLink: true
isPublished: false
---

::: warning 草稿
Claude 依照這個工作區的 git 歷史、記憶檔與開發記錄整理。10-05 的事故、六個 worktree 的實況、撞號事件都是真的；「什麼時候不該平行」那一節是 Claude 的判斷，請用你的經驗校正。
:::

::: info 這篇的脈絡
這是 [Git 系列](/article/code-sea/git/stage-0-preface) 的應用題。前提是 [四個 Claude 一起開發一個 App](./四個-claude-一起開發一個-app) 那篇講的分工：Android、後端、官網各一個 AI，彼此看不到對方的對話。那篇講它們怎麼溝通，這篇講它們怎麼共用一個 git 倉庫而不互相踩腳。
:::

## 緣起：10 月 5 日，兩個對話擠在同一個資料夾
那天我同時開著四個對話在改部落格：一個做視覺翻新、一個盤點草稿、一個升套件、一個做 Markdown 語法圖鑑。前三個早就各自開了 worktree，第四個是新開的對話，我忘了交代，它就直接在 `opshell.github.io/` 這個主資料夾裡做事。

主資料夾當時站在 `redesign-2026-10`，翻新那個對話的分支。於是語法圖鑑的檔案全部長在翻新分支上，兩個對話沒提交的改動混在同一份 `git status` 裡。沒有壞掉，但「翻新做到哪、圖鑑做到哪」已經分不開，想單獨上線其中一個也做不到。

![三個對話共用同一個工作目錄，一個切分支，另外兩個看到的檔案就變了](/images/article/git/one-checkout-many-chats.svg)

問題的本質很單純：**一個工作目錄只能站在一條分支上**。你 `git switch` 一下，資料夾裡所有檔案都換成那條分支的樣子，另外三個對話眼前的檔案跟著變，它們連發生什麼事都不知道。以前一個人用 git 不會遇到，因為你一次只做一件事；現在同時有四個「人」在做四件事，單身公寓硬塞四個室友。

## 三個選項
1. **排隊**：一次只開一個對話。最安全，但平行是用 AI 的全部意義，不然我自己做就好。
2. **clone 四份**：四個資料夾，四個 `.git`，各自透過 GitHub 同步。可行，但本機分支彼此看不到，要看別人做到哪得先 push 再 fetch，而且 `.git` 存四份。
3. **worktree**：一個 `.git`，好幾個資料夾，每個資料夾站在自己的分支上。所有分支在同一個 `.git` 裡，彼此看得到，不用經過 GitHub。

選三。

## worktree 是什麼
![一個 .git 掛好幾個工作目錄，每個目錄站在自己的分支上](/images/article/git/worktrees.svg)

```bash
cd ~/WWW/opshell.github.io
git worktree add ../opshell-git-series -b docs/git-series main
```

這一行做了三件事：從 `main` 開一條新分支 `docs/git-series`、在隔壁建一個資料夾 `opshell-git-series`、讓那個資料夾站在新分支上。資料夾裡是一份完整的工作目錄，但沒有自己的 `.git`，只有一個小檔案指回主倉庫。

```bash
git worktree list
# /Users/opshell/WWW/opshell.github.io       fdd5a9d [redesign-2026-10]
# /Users/opshell/WWW/opshell-deps            ec32a3f [deps-2026-10]
# /Users/opshell/WWW/opshell-drafts          a210447 [drafts-2026-10]
# /Users/opshell/WWW/opshell-home            bc44f35 [redesign-home]
# /Users/opshell/WWW/opshell-main            0f76035 [main]
# /Users/opshell/WWW/opshell-git-series      0f76035 [docs/git-series]
```

這是 10 月 5 日晚上的實況：六個資料夾、六條分支、四個對話。每個對話開工第一件事就是跑這行，確認自己在哪一棵樹上。

做完合回 main 之後：

```bash
git worktree remove ../opshell-git-series   # 刪資料夾
git branch -d docs/git-series               # 刪便利貼
git worktree prune                          # 清掉手動刪過資料夾的殘留記錄
```

## 幾條 worktree 自帶的規矩
**同一條分支不能被兩個 worktree 同時站著。** 你試著在第二個資料夾 checkout 一條已經有人站的分支，git 直接拒絕。一開始覺得煩，後來發現這是最好的保護：一條分支一個主人，不會有兩個對話同時往同一條分支 commit。

**沒進版控的東西不會跟過去。** 新 worktree 只有 git 追蹤的檔案，所以：
- `node_modules/` 要自己裝。pnpm 有全域的 store，`pnpm install --frozen-lockfile` 幾秒鐘，硬碟也不會多一份。
- `.env.local` 這類被 gitignore 的設定檔**不在**。要用就從主資料夾複製一份過去（`cp ../opshell.github.io/.env.local .`），或者像這個站的後台那樣用網址參數覆寫後端位址，讓 worktree 不需要它。
- `dist/`、`.vitepress/cache/` 也沒有，第一次 build 會比較慢。

**dev server 要各開各的 port。** 四個 worktree 同時 `pnpm docs:dev` 會搶 5173，VitePress 會自動往上找，但你要看清楚終端機印的是哪個 port，不然會對著別人的分支看自己的改動。

## 給 AI 的規矩
worktree 解決了「踩腳」，但 AI 要知道規矩才會用。這幾條寫在它的記憶檔跟專案說明裡：

1. **開工先 `git worktree list`**，看自己在哪、別人在哪。
2. **新工作一律 `git worktree add ../opshell-<名稱> -b <type>/<名稱> main`**，在那裡改、裝套件、跑檢查、commit。不在主資料夾做事，不在別人的分支上做事。
3. **不碰 main**。合進 main 是人按的，按之前人會看。
4. **不 push、不改歷史**，除非我開口。
5. **做完回報 worktree 路徑與分支名**，我去那個資料夾開 dev server 看成果。

第一條是 10 月 5 日之後加的。規矩不是一開始就想得到，是被咬了才加，跟 [四個 Claude](./四個-claude-一起開發一個-app) 那篇的溝通板規則一樣。

## 什麼時候不該平行
worktree 讓平行變便宜，便宜到會忘記問「該不該平行」。幾個真的發生過的判斷：

- **兩件事會改同一批檔案**：翻新主題跟改首頁都動 `theme/` 底下的 SCSS。平行做完合併時衝突一堆，解衝突的時間比排隊做還長。這種就排隊，或者先把共用的部分拆成一條分支先合。
- **一件事依賴另一件事的結果**：升套件那條分支把一個 SVG 外掛換掉了，翻新那條用到那個外掛。翻新合進 main 之前，升套件那條得先合、翻新再 rebase 一次。這種順序 AI 不會自己知道，要人排。
- **只是順手的小改**：改一個錯字也開 worktree 是過頭了。直接在 `opshell-main` 那個站在 main 的資料夾改、commit、push。

平行的單位是「可以獨立上線或獨立丟掉的一件事」，不是「一個對話」。兩個對話在做同一件事的兩半，就應該在同一棵樹上。

## 另一種共用：溝通板那個倉庫
工作區根目錄（`DinDon/`）本身也是一個 git 倉庫，放溝通板跟待辦。它**沒有**用 worktree，四個對話都直接在同一個資料夾、同一條 main 上寫、commit。

這樣可以，是因為它跟程式倉庫的性質不同：每個對話只寫自己的那張單（一件事一個檔案），寫完馬上 commit，檔案彼此不重疊。唯一撞過的一次是「開單編號」：兩個對話同時開單，拿了同一個號碼。後來的規則是 commit 前再查一次最大號碼，看到同號不是自己的就改自己的，先 commit 的人不動。

所以不是「多人就要 worktree」。改的是同一份程式、要能各自上線或丟掉，才需要；各寫各的小檔案、馬上 commit，共用一條分支反而簡單。

## VS Code 怎麼開
一個 worktree 就是一個資料夾，VS Code 直接 `File → Open Folder` 開它，或者在一個 workspace 裡 Add Folder 把幾個 worktree 並排。Source Control 面板會認得每個資料夾各自站在哪條分支。

但這個工作區的做法比較特別：VS Code 永遠開最外層的 `DinDon/`，官網是用捷徑 `DinDon_Web → ../opshell.github.io` 掛進來的。捷徑指的是**主資料夾**，不是 worktree。所以網頁 Claude 在對話裡要用絕對路徑進自己的 worktree（`cd ../opshell-git-series`），這件事也寫進它的規矩裡了。這是這個結構的一個小坑，目前用「規矩」補，沒有更好的解法。

## 小結
- 一個工作目錄只能站一條分支，多個對話就需要多個工作目錄：worktree。
- 一個 `.git`、多個資料夾、彼此看得到分支、同一條分支只能有一個主人。
- `node_modules`、`.env.local`、`dist` 不會跟過去，要自己補。
- 平行的單位是「可以獨立上線或丟掉的一件事」；會改同一批檔案的就排隊。
- 溝通板那種各寫各的小檔案，不需要 worktree。

下一篇：[AI 幫你 commit 之後，你的工作變成管歷史](./ai-幫你-commit-之後-你的工作變成管歷史)。
