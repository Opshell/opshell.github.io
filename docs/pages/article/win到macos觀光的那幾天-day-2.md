---
title: win到macOS觀光的那幾天 day 1
image:
description:
keywords:
author: 'Opshell'
createdAt: 2026-01-27
categories:
  - '未分類'
tags:
  -
editLink: true
isPublished: true
---

#
---
title: "[Mac] Windows 前端工程師轉移 Mac 生存指南 (二)：打造最香的開發環境 (Homebrew + fnm + Oh My Zsh)"
date: 2026-01-27
tags: [Mac, Terminal, Zsh, fnm, Homebrew]
categories: [Dev Environment]
---

拿到新 Mac，最忌諱的就是去 Node.js 官網下載安裝包。Mac 的精髓在於終端機環境，這篇紀錄如何用現代化的方式，建立乾淨、快速的前端開發環境。

## 1. 安裝套件管理神器：Homebrew

就像 Linux 的 apt 或 Windows 的 winget，Homebrew 是 Mac 的標配。
開啟 Terminal，輸入以下指令安裝：

```bash
/bin/bash -c "$(curl -fsSL [https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh](https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh))"

⚠️ 注意： 安裝完後，務必依照螢幕下方的 Next steps 提示，執行那兩三行 echo 指令，將 brew 加入環境變數，否則會找不到指令。

2. Node 版本管理：捨棄 nvm，擁抱 fnm
在 Windows 我們可能習慣用 nvm-windows，但在 Mac 上，我強烈推薦用 fnm (Fast Node Manager)。它是用 Rust 寫的，速度比 nvm 快非常多，且支援自動切換版本。

清除舊的 nvm (如果有的話)

如果你不小心先裝了 nvm，建議先移除，避免衝突：
```bash
rm -rf ~/.nvm
# 記得去 ~/.zshrc 把關於 NVM 的設定刪乾淨
```

安裝 fnm 與 Git
```bash
brew install git fnm
```

設定環境變數

將 fnm 的啟動腳本寫入 Shell 設定檔 (~/.zshrc)：

```bash
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc
```

--use-on-cd 是神器，只要進入有 .nvmrc 的資料夾，它會自動幫你切換 Node 版本。

3. 讓終端機變漂亮：Oh My Zsh
Mac 預設的 Zsh 很陽春，我們用 Oh My Zsh 來美化它。

Bash
sh -c "$(curl -fsSL [https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh](https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh))"
必裝外掛

為了讓效率超越 Windows，建議安裝這兩個外掛：

zsh-autosuggestions: 會記住你打過的指令並自動建議。

zsh-syntax-highlighting: 指令打對變綠色，打錯變紅色。

下載後，記得編輯 ~/.zshrc，找到 plugins=(git) 並修改：

Bash
plugins=(git zsh-autosuggestions zsh-syntax-highlighting)
4. 解決 VS Code code 指令找不到的問題
如果在終端機打 code . 沒反應，解法如下：

打開 VS Code。

Cmd + Shift + P 開啟命令面板。

輸入 Shell Command: Install 'code' command in PATH。

重開終端機即可。

現在，你有一個高效、漂亮且乾淨的開發環境了！


---

### 第三篇：進階套件管理篇 (Yarn 轉 pnpm)
**重點：** 介紹為何在 Mac Air 有限的空間下該用 `pnpm`，以及如何解決從 Yarn 轉移時遇到的「幽靈依賴」錯誤。

```markdown
---
title: "[Mac] Windows 前端工程師轉移 Mac 生存指南 (三)：擁抱 pnpm 與解決幽靈依賴"
date: 2026-01-27
tags: [pnpm, Yarn, Node.js, Phantom Dependency]
categories: [Frontend]
---

換了 Mac Air 後，硬碟空間變得寸土寸金。傳統的 `npm` 或 `Yarn` 會在每個專案底下都塞一份 `node_modules`，這對硬碟是極大的浪費。藉著換機的機會，我決定全面轉向 **pnpm**。

## 為什麼選 pnpm？

1.  **省空間**：使用全局內容定址 (Content-addressable store)，多個專案共用同一份依賴，只用連結 (Symlink) 連過去。
2.  **速度快**：安裝過的套件不用重新下載。
3.  **嚴格模式**：避免「幽靈依賴」問題。

## 安裝與遷移

因為安裝了 Homebrew，安裝 pnpm 只需要一行：

```bash
brew install pnpm
遇到的坑：幽靈依賴 (Phantom Dependencies)
當我把舊的部落格專案 (原本用 Yarn) 拉下來，執行 pnpm i 後，跑起來卻噴錯了：

Bash
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'markdown-it-container' ...
原因分析

Yarn 和 npm 比較「好心」，如果 A 套件依賴了 B，它會把 B 提昇到最上層，讓你的程式碼可以直接 import B，即使你的 package.json 根本沒寫 B。這就是幽靈依賴。

pnpm 非常嚴格：「沒在 package.json 寫的，就不准用。」 這是為了避免未來的潛在 Bug。

解決方法

缺什麼，補什麼。看錯誤訊息說缺誰，就把它裝進 devDependencies：

Bash
pnpm add -D markdown-it-container
另一個坑：Build Scripts 權限
在執行 pnpm i 時，可能會看到警告，或者某些依賴 (如 esbuild, sharp) 沒跑起來。這是因為 pnpm 預設不執行腳本。

執行以下指令一次授權：

Bash
pnpm approve-builds
總結
雖然剛轉 pnpm 會遇到一些嚴格的規範導致報錯，但長遠來看，它能讓專案依賴更健康，並且大幅節省 Mac 的硬碟空間。強烈推薦新 Mac 用戶直接入坑！