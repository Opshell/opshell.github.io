---
title: 'Windows 轉 Mac（三）：擁抱 pnpm 與解決幽靈依賴'
image: ''
description: 'Mac Air 硬碟寸土寸金，趁換機全面改用 pnpm：為什麼省空間、從 Yarn 搬過來會撞到的幽靈依賴，以及 Build Scripts 要手動授權。'
keywords: ''
author: Opshell
createdAt: '2026-01-27'
categories:
  - 開發環境
tags:
  - Mac
  - pnpm
  - Node.js
  - 開發環境
editLink: true
isPublished: false
---
::: info 系列：Windows 前端工程師搬家到 Mac
用了十年 Windows，第一次拿 MacBook Air 寫 code，把卡住我的地方照順序記下來。
1. [快捷鍵與操作邏輯](./01-快捷鍵與操作邏輯)
2. [開發環境：Homebrew + fnm + Oh My Zsh](./02-開發環境)
3. [擁抱 pnpm 與解決幽靈依賴](./03-pnpm-與幽靈依賴)
:::

換了 Mac Air 後，硬碟空間變得寸土寸金。傳統的 `npm` 或 `Yarn` 會在每個專案底下都塞一份 `node_modules`，這對硬碟是極大的浪費。藉著換機的機會，我決定全面轉向 **pnpm**。

## 為什麼選 pnpm？

1.  **省空間**：使用全局內容定址 (Content-addressable store)，多個專案共用同一份依賴，只用連結 (Symlink) 連過去。
2.  **速度快**：安裝過的套件不用重新下載。
3.  **嚴格模式**：避免「幽靈依賴」問題。

## 安裝與遷移

因為安裝了 Homebrew，安裝 pnpm 只需要一行：

```bash
brew install pnpm
```

## 遇到的坑：幽靈依賴（Phantom Dependencies）
當我把舊的部落格專案（原本用 Yarn）拉下來，執行 `pnpm i` 後，跑起來卻噴錯了：

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'markdown-it-container' ...
```

### 原因分析

Yarn 和 npm 比較「好心」，如果 A 套件依賴了 B，它會把 B 提昇到最上層，讓你的程式碼可以直接 import B，即使你的 package.json 根本沒寫 B。這就是幽靈依賴。

pnpm 非常嚴格：**「沒在 package.json 寫的，就不准用。」** 這是為了避免未來的潛在 Bug。

### 解決方法

缺什麼，補什麼。看錯誤訊息說缺誰，就把它裝進 `devDependencies`：

```bash
pnpm add -D markdown-it-container
```

## 另一個坑：Build Scripts 權限
在執行 `pnpm i` 時，可能會看到警告，或者某些依賴 (如 esbuild, sharp) 沒跑起來。這是因為 pnpm 預設不執行腳本。

執行以下指令一次授權：

```bash
pnpm approve-builds
```

## 總結
雖然剛轉 pnpm 會遇到一些嚴格的規範導致報錯，但長遠來看，它能讓專案依賴更健康，並且大幅節省 Mac 的硬碟空間。強烈推薦新 Mac 用戶直接入坑！
