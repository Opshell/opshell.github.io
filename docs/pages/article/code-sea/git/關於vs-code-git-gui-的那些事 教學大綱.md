---
title: 關於VS Code Git GUI 的那些事
image: ''
author: Opshell
createdAt: '2025-04-11'
categories:
  - Git
tags:
  - Git
  - VS Code
  - Git Graph
editLink: true
isPublished: false
description: ''
keywords: ''
---
#

好的，這是一個很棒的主題！在 VS Code 中使用 Git Graph 和 Git History 這類視覺化工具，確實能大大提升大型專案的 Git 操作效率和理解度。

針對你的 Vitepress 部落格，這是一個建議的系列文章教學大綱，從基礎到進階，並著重於協作：

系列標題建議： VS Code Git 神器：用 Git Graph 與 Git History 高效協作大型專案

系列文章大綱：

第一篇：入門篇 - 告別指令列，擁抱視覺化 Git 工作流

前言：為何需要視覺化 Git 工具？
大型專案中 Git 指令列的挑戰 (分支複雜、歷史難追)
視覺化工具的優勢 (直觀、易懂、減少錯誤)
介紹 Git Graph 和 Git History 這兩個 VS Code 擴充套件的核心功能與差異。
環境準備：安裝與基本設定
在 VS Code 中搜尋並安裝 Git Graph 和 Git History。
快速導覽兩個擴充套件的主要介面與常用按鈕。
(可選) 推薦搭配的其他 VS Code Git 相關設定或擴充套件 (如 GitLens - 雖然功能部分重疊，但也可提一下)。
初試啼聲：查看專案歷史與分支
Git History:
如何開啟並查看整個專案或單一檔案的提交歷史。
理解提交訊息、作者、日期、Commit Hash 等基本資訊。
比較不同提交之間的檔案變更。
Git Graph:
如何開啟 Git Graph 面板。
理解分支線條、合併點、標籤 (Tags) 的視覺呈現。
基礎的篩選功能 (依分支、作者)。
小結： 視覺化工具帶來的初步體驗與好處。
第二篇：基礎操作篇 - 用圖形介面輕鬆駕馭分支

複習：Git 分支的核心概念
為何需要分支？ (功能開發、Bug 修復、實驗)
git branch, git checkout / git switch 的基本用途。
使用 Git Graph 建立與切換分支
在 Git Graph 中右鍵點擊特定 Commit 建立新分支。
視覺化查看新分支的起點。
在 Git Graph 中快速切換 (Checkout) 到不同分支。
VS Code 狀態列如何同步顯示目前所在分支。
提交你的變更 (Commit)
搭配 VS Code 的 Source Control 面板進行檔案 Staging。
撰寫清晰的 Commit Message。
執行 Commit 操作。
在 Git Graph 和 Git History 中立即看到新的 Commit 節點。
案例演練：開發一個簡單的新功能
從 main (或 develop) 分支建立 feature/xxx 分支。
在 feature/xxx 分支上進行修改並提交數次。
透過 Git Graph 清晰看到 feature/xxx 分支的開發進程。
小結： 如何透過視覺化介面完成最常見的分支建立、切換與提交操作。
第三篇：合併篇 - 看懂並解決分支合併問題

複習：Git 合併的核心概念
git merge 的基本原理 (Fast-forward vs. Non-fast-forward/Merge Commit)。
合併時可能遇到的狀況 (衝突)。
使用 Git Graph 執行合併 (Merge)
情境一：Fast-forward 合併。
在 Git Graph 中將 feature/yyy 分支拖曳 (或右鍵) 合併到 main。
觀察 Git Graph 中 main 指標的移動。
情境二：產生 Merge Commit 的合併。
在兩個分支都有新 Commit 的情況下，執行合併。
觀察 Git Graph 中產生的新 Merge Commit 節點以及其連接線。
視覺化理解合併衝突 (Merge Conflicts)
模擬一個合併衝突的場景。
Git Graph 如何標示出存在衝突的合併嘗試 (通常需要先嘗試合併)。
VS Code 如何標示出衝突的檔案。
在 VS Code 中解決衝突
使用 VS Code 內建的衝突解決工具 (Accept Current Change, Accept Incoming Change, Accept Both Changes, Compare Changes)。
解決衝突後，Staging 檔案並完成 Merge Commit。
觀察 Git Graph 中合併完成後的圖形。
使用 Git History 追溯合併歷史
如何透過 Git History 查看某個 Merge Commit 包含了哪些來源分支的變更。
比較 Merge Commit 前後特定檔案的變化。
小結： 利用視覺化工具讓複雜的合併流程與衝突解決變得更清晰。
第四篇：進階技巧篇 - Rebase 與互動式 Rebase 圖解

複習：Git Rebase 的概念與風險
git rebase 的基本原理 (變基：改變 Commit 的基礎)。
Rebase 的優點 (線性歷史)。
重要： Rebase 的黃金法則 - 永遠不要 Rebase 已經推送到共享儲存庫的 Commit。解釋原因 (歷史被改寫)。
使用 Git Graph 執行 Rebase
情境：將 feature/zzz 分支 Rebase 到最新的 main (或 develop) 分支上。
在 Git Graph 中視覺化 Rebase 操作 (例如，拖曳 feature/zzz 到 main 並選擇 Rebase)。
觀察 Rebase 前後 feature/zzz 分支 Commit 的變化 (Commit Hash 會改變，分支起點移動)。
對比 Rebase 和 Merge 後的歷史圖形差異。
視覺化理解 Rebase 衝突
Rebase 過程中也可能發生衝突 (因為是逐個 Commit 應用)。
VS Code 解決 Rebase 衝突的流程 (類似 Merge 衝突，但可能需要多次解決)。
如何中止 (--abort) 或繼續 (--continue) Rebase。
Git Graph 如何輔助查看 Rebase 過程中的狀態。
(可選進階) 互動式 Rebase (Interactive Rebase)
git rebase -i 的用途 (修改 Commit Message, 合併 Commit (Squash/Fixup), 重新排序 Commit, 刪除 Commit)。
如何在 VS Code (可能需要終端機或 Git Graph 的進階功能) 發起互動式 Rebase。
Git Graph 如何展示互動式 Rebase 後的歷史變化。
小結： 何時以及如何安全地使用 Rebase 來整理你的提交歷史，以及視覺化工具如何提供幫助。
第五篇：協作實戰篇 - 與團隊成員高效同步

複習：遠端儲存庫 (Remote Repository) 與協作流程
origin 的概念。
git fetch, git pull, git push 的作用。
常見的協作模型 (如 Feature Branch Workflow, Gitflow Workflow 的簡化概念)。
使用 Git Graph 查看遠端分支狀態
理解 origin/main, origin/feature/abc 等遠端追蹤分支在圖形上的表示。
視覺化比較本地分支與遠端分支的差異 (落後、超前、分叉)。
透過視覺化介面進行 Fetch, Pull, Push
在 Git Graph 中執行 Fetch 操作，觀察遠端分支的更新。
執行 Pull 操作 (Fetch + Merge/Rebase)，觀察本地分支的變化。
討論 pull --rebase vs pull --merge，以及如何透過 Git Graph 看出差異。
執行 Push 操作，將本地變更推送到遠端，觀察遠端追蹤分支的更新。
案例：模擬團隊協作場景
場景一：你開發完功能，需要將 feature/xyz 推送到遠端，並準備 Pull Request (PR)。
場景二：其他團隊成員更新了 main 分支，你需要將最新的 main 拉取下來，並將你的 feature/xyz Rebase 到最新的 main 上，然後再推送。
使用 Git Graph 和 Git History 在這些過程中追蹤分支狀態、檢查變更。
小結： 如何利用視覺化工具更自信地與團隊成員同步程式碼，減少同步錯誤。
第六篇：高階應用與技巧篇 - 提升你的 Git 功力

Git Graph 進階功能
強大的篩選與搜尋功能 (依作者、訊息、檔案、日期範圍)。
自訂圖形顯示 (顏色、樣式)。
Cherry-pick：從一個分支挑選特定 Commit 到另一個分支，並在圖形上操作。
Tagging：在 Git Graph 中建立和查看 Tag。
Stashing：(若 Git Graph 支援) 視覺化 Stash 操作。
Git History 進階功能
查看單一檔案或資料夾的詳細歷史。
比較任意兩個 Commit 或分支之間的差異。
搜尋 Commit 歷史 (訊息、作者、變更內容)。
結合 VS Code 其他功能
與 VS Code 的檔案總管、搜尋、偵錯等功能結合使用。
(若適用) 搭配 Pull Request 相關擴充套件 (如 GitHub Pull Requests and Issues)。
常見問題排查 (Troubleshooting)
圖形顯示異常怎麼辦？ (重新整理、檢查 Git 設定)
誤操作後如何回退？ (利用 Reflog - Git History 可能會顯示 Reflog，或搭配指令列)
總結與後續學習
再次強調視覺化工具在大型專案協作中的價值。
鼓勵讀者持續探索 Git Graph 和 Git History 的更多功能。
提供官方文件或其他優質學習資源連結。
給你的建議：

大量使用截圖： 視覺化工具的教學，清晰的截圖是關鍵。標示出重要按鈕和區域。可以使用 GIF 動圖展示操作流程。
提供範例程式碼庫： 如果可能，建立一個簡單的公開 GitHub 儲存庫，讓讀者可以 Clone 下來跟著操作。
強調「為何」： 不只教「如何」操作，更要解釋「為何」這樣做，以及背後的 Git 原理。
簡化指令： 雖然重點是視覺化工具，但適時提供對應的 Git 指令列命令，有助於加深理解。
保持一致性： 在整個系列中，使用一致的術語和範例分支名稱。
Vitepress 特性利用：
使用代碼塊 (```) 顯示 Git 指令或配置。
可以考慮使用 Vitepress 的 Custom Container 功能來強調提示、警告或重點。
在文章之間建立良好的內部連結。
確保圖片在不同裝置上都能清晰顯示。
這個大綱涵蓋了從入門到進階協作的各個方面，並緊密結合了 Git Graph 和 Git History 的使用。你可以根據實際寫作情況調整每篇文章的篇幅和深度。祝你寫作順利！
