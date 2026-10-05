---
title: 'VS Code Profiles 設定檔管理：不同專案一套設定，還能匯出到 Gist'
author: Opshell
createdAt: '2024-08-23'
categories:
  - 使用實例
tags:
  - VS Code
  - Work Flow
editLink: true
isPublished: false
image: ''
description: '用 VS Code 的 Profiles 把前端、後端、寫文章的外掛與設定分開，綁定到資料夾自動切換，再匯出成 GitHub Gist 或檔案，換電腦、分享給同事都一鍵搞定。'
keywords: ''
version: 1.0.0
---
::: warning 草稿
Claude 於 2026-10-05 補完：原本只有標題和一篇參考連結，寫成 Profiles 的用途、匯出匯入到 Gist 的步驟。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
`VS Code` 用久了，外掛會越裝越多：寫 `Vue` 要的、寫 `Go` 要的、寫 Markdown 要的全部擠在一起，啟動變慢、右下角一直跳通知，不同專案的格式化設定還會互相打架。這篇整理 `VS Code` 內建的 Profiles（設定檔）怎麼用，以及怎麼匯出到 GitHub Gist，換電腦或分享給團隊都方便。
:::

## 懶人包
- Profile 是一整套「設定 + 外掛 + 快捷鍵 + 程式碼片段 + 介面配置」，可以有很多套，隨時切換。
- 每個資料夾或工作區可以綁一個 Profile，下次打開會自動切過去。
- 匯出可以選 GitHub Gist 或本機檔案，匯入時貼上 Gist 網址就好。
- 個人多台電腦同步用 Settings Sync，跟團隊分享一套環境用匯出的 Profile。

## 技術拆解

### Profile 裡面有什麼
一個 Profile 可以包含這些東西，建立時可以挑要不要跟預設 Profile 共用：

| 項目 | 說明 |
| :--- | :--- |
| Settings | `settings.json` 的使用者設定 |
| Keyboard Shortcuts | 快捷鍵 |
| Snippets | 程式碼片段 |
| Tasks | 使用者層級的 tasks |
| Extensions | 安裝、啟用的外掛 |
| UI State | 側邊欄、面板的配置 |

用衣櫃來比喻：預設 Profile 是你的日常衣櫃，其他 Profile 是「上班」「運動」「出國」三個行李箱，每一個都已經裝好需要的東西，出門前拎一個走就好，不用每次重新翻衣櫃。

### 建立與切換
1. 左下角齒輪 > **Profiles**，或命令面板（`Cmd`／`Ctrl` + `Shift` + `P`）輸入 `Profiles: New Profile...`。
2. 可以從空白開始、從目前的 Profile 複製，或用官方提供的範本（例如 Python、Java 的預設組合）。
3. 取好名字、選圖示，挑要獨立還是跟預設共用的項目。
4. 切換用 `Profiles: Switch Profile`，或是在 Profiles 編輯器裡直接點。

### 綁定到資料夾
在某個專案資料夾裡切到對應的 Profile 之後，`VS Code` 會記住這個組合，下次打開同一個資料夾就自動切換。前端專案打開就是前端那套，後端專案打開就是後端那套，再也不用手動切。

也可以從終端機指定：

```bash
code --profile "Vue" ./my-vue-project
```

## 例子與對比

### 一個前端的 Profile 分法範例
這只是一種切法，照自己的工作內容調整：

| Profile | 適合的外掛類型 | 重點設定 |
| :--- | :--- | :--- |
| Vue 前端 | `Vue - Official`、`ESLint`、`Stylelint`、`UnoCSS`／`Tailwind` 的語法提示 | 關掉預設格式化，交給 `ESLint` 修 |
| 後端 | 語言工具、資料庫用戶端、`REST Client` | 該語言自己的格式化工具 |
| 寫文章 | Markdown 預覽、拼字檢查 | 自動換行、字體放大 |
| 乾淨模式 | 什麼都不裝 | 拿來排查「是不是外掛害的」 |

最後一個「乾淨模式」特別推薦：遇到怪問題時切過去試一次，是外掛的鍋還是 `VS Code` 本身的鍋，馬上就知道。

### 匯出到 GitHub Gist
1. 命令面板輸入 `Profiles: Export Profile...`（或在 Profiles 編輯器裡對該 Profile 按匯出）。
2. 勾選要匯出的項目。
3. 選擇 **GitHub Gist**，第一次會要求登入 GitHub 授權。
4. 完成後會得到一個 Gist 網址，預設是不公開（secret）的 Gist，但拿到網址的人都看得到。

也可以選擇匯出成本機的 `.code-profile` 檔案，丟進團隊的倉庫或雲端硬碟。

::: warning
匯出前檢查一下 `settings.json`：有些外掛會把 API Key、Token 或內部網址寫在設定裡，匯出成 Gist 就等於分享出去了。
:::

### 匯入
1. 命令面板輸入 `Profiles: Import Profile...`。
2. 貼上 Gist 網址，或選擇 `.code-profile` 檔案。
3. 預覽內容、決定名稱，按下建立，外掛會自動安裝。

### Settings Sync vs 匯出 Profile

| | Settings Sync | 匯出 Profile |
| :--- | :--- | :--- |
| 用途 | 自己的多台電腦保持一致 | 分享一套環境給別人、做備份 |
| 同步方式 | 登入帳號後自動同步，包含所有 Profile | 手動匯出、手動匯入 |
| 適合 | 個人 | 團隊新人上手、教學、換工作帶著走 |

### 延伸閱讀
- [VSCode Workflow Profiles Export/Import to Gist](https://medium.com/@ray102467/vscode-vscode-workflow-profiles-export-import-to-gist-34eecc4d4726)
- 各選項的最新名稱與位置，請以 `VS Code` 官方文件的 Profiles 頁面為準。

## 結論
Profiles 就是讓 `VS Code` 學會「看場合穿衣服」：寫前端穿前端那套，寫文章換成輕便的，出問題時換上什麼都沒有的乾淨模式。再加上匯出到 Gist，新電腦、新同事都能一鍵拿到同一套環境。

從此之後，外掛裝再多也不怕，反正它們會乖乖待在自己的行李箱裡 ~~（前提是你記得分箱）~~。
