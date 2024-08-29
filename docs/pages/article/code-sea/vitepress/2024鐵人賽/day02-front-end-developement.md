---
title:  'Day02 - 環境準備&對齊'
author: 'Opshell'
createdAt: '2024/09/02'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - vitepress
  - env
editLink: true
isPublished: false
---

# [Day02] - 環境準備 向右看齊~

再開始蓋部落格之前，先對齊一下工程環境。

## 1. 系統：[Window 11](https://www.microsoft.com/zh-tw/software-download/windows11)
## 2. 編輯器：[VS Code](https://code.visualstudio.com/)
## 3. 終端機：[PowerShell 7](https://docs.microsoft.com/zh-tw/powershell/scripting/install/installing-powershell-on-windows?view=powershell-7.2)
::: tip
  如果本來是PowerShell 5 要安裝7 可能會有一點點問題 [請參考](https://docs.microsoft.com/zh-tw/powershell/scripting/whats-new/migrating-from-windows-powershell-51-to-powershell-7?view=powershell-7.2)<br />
  查看powershell版本方式：在powershell中輸入：↓↓↓

  ```sh
  Get-Host | Select-Object Version
  ```
  安裝完之後，記得把VS code的預設終端機改成PowerShell <br />
  快捷鍵：`ctrl + ~`開啟終端，然後在右下可以設定預設終端機喔：

  ![終端機右下](https://ithelp.ithome.com.tw/upload/images/20220902/20109918JMnbcVDkih.png)

  ![要選PowerShell 7 喔](https://ithelp.ithome.com.tw/upload/images/20220902/20109918wzqmchpUJ1.png)
:::

## 4. Node版本管理：[NVM](https://github.com/coreybutler/nvm-windows)
::: tip
  `NVM` 建議安裝在C:\
  確認 `NVM` 有沒有安裝好
  ```sh
    nvm version
  ```
:::

::: warning
  你的 nvm 指令老是無法成功，或者出現了亂碼，請將 `NVM` 安裝在 `C:\` 下，或者使用系統管理員權限執行。
:::

## 5. Node.Js：[Node.js](https://nodejs.org/zh-tw/)
::: info
  身為一個會玩前端的園丁，裝個Node.js應該也是很正常的一件事。<br />
  ~~看了前面的環境，你不會以為我下的指令不是在Windows吧?~~<br />

  確認安裝了什麼版本的node
  ``` sh
    nvm list
  ```

  安裝 Node.js 20.11.1 版本 (`Vitepress` 需要 **18** 以上的版本，Opshell 安裝目前自己最常使用的穩定版本。)
  ``` sh
    nvm install 20.11.1
  ```

  切換到20.11.1版的Node
  ``` sh
  nvm use 20.11.1
  ```
  ![node 版本](https://ithelp.ithome.com.tw/upload/images/20220902/20109918ZmCyzv0gIl.png)
:::

## 6. 套件管理 [yarn](https://ithelp.ithome.com.tw/articles/10191745)
::: info
  抱歉了各位，我還沒有跳槽到 `pnpm` 學不完阿~~~~
  全域安裝 `yarn` ↓↓↓
  ``` sh
  npm install -g yarn
  ```

  確認 `yarn` 版本↓↓↓
  ``` sh
  yarn -v
  ```
:::

## 7. 好用的 VS Code 套件推薦：
::: info
  1. [Chinese (Traditional) Language Pack for Visual Studio Code](Chinese (Traditional) Language Pack for Visual Studio Code)
  > 我英文不好，很需要這個。
  1. [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens)
  > 錯誤視覺化、配合 `typescript` 哪邊怪怪的馬上就會知道。
  2. [File Nesting Updater](https://marketplace.visualstudio.com/items?itemName=antfu.file-nesting)
  > 把一堆雜檔好好的縮在一起，保護眼睛及腦袋不受訊息轟炸。
  3. [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
  4. [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat)
  > 好處太多了我找一天專門寫文章歌頌他，~~Github請記得付我工商的費用，開玩笑的~~
  5. [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme)
  > 沒啥原因，就是覺得順眼喜歡。\
  6. [Power Mode](https://marketplace.visualstudio.com/items?itemName=hoovercj.vscode-power-mode)
  > 寫扣，不炫砲，不成活。
  7. [Todo Tree](https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.todo-tree)
  > 超級無敵好用，只是配置要花一些心力，用了一樣回不去了!!

  以上這些套件，沒裝不會怎樣，裝了很不一樣!! ~~(年紀透漏)~~
:::

## 小結：
這篇文章，水分大概是99%吧，<br />
好像對齊了環境，又好像什麼都沒做。<br />
各位晚安。
