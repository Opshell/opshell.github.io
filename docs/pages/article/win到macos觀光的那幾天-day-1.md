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
isPublished: false
---

#
---
title: "[Mac] Windows 前端工程師轉移 Mac 生存指南 (一)：快捷鍵與操作邏輯重塑"
date: 2026-01-27
tags: [Mac, Windows, Efficiency, VS Code]
categories: [Dev Environment]
---

身為一個長期使用 Windows 的前端工程師，最近入手了一台 MacBook Air。本以為只是換個系統，沒想到肌肉記憶完全跟不上，手指常常打結。這篇文章紀錄了我為了找回生產力，整理出的 Windows 對照 Mac 的生存守則。

## 1. 核心觀念：你的大拇指要變忙了

Windows 的核心修飾鍵是小指控制的 `Ctrl`，而 Mac 則是空白鍵旁、大拇指控制的 `Command (⌘)`。

### 常用快捷鍵對照表

| 動作 | Windows (舊習慣) | Mac (新習慣) | 備註 |
| :--- | :--- | :--- | :--- |
| **複製/貼上** | `Ctrl` + C / V | **`Cmd (⌘)`** + C / V | 最基本的肌肉記憶 |
| **全選** | `Ctrl` + A | **`Cmd (⌘)`** + A | |
| **存檔** | `Ctrl` + S | **`Cmd (⌘)`** + S | 這一定要先練熟 |
| **切換視窗** | `Alt` + Tab | **`Cmd (⌘)`** + Tab | 邏輯一樣 |
| **關閉視窗** | `Alt` + F4 | **`Cmd (⌘)`** + W | 這是關閉分頁/視窗，程式還在背景 |
| **完全退出** | (無常用) | **`Cmd (⌘)`** + Q | **Mac 獨有邏輯**：按 X 只是關視窗，這才是真正關掉 APP |
| **尋找** | `Ctrl` + F | **`Cmd (⌘)`** + F | |

## 2. 消失的 Home / End / Delete

對於寫 Code 的人來說，這三個鍵消失最痛苦。Mac 的邏輯是用 `Cmd` 或 `Fn` 組合：

* **回到行首 (Home):** `Cmd (⌘)` + `←`
* **回到行尾 (End):** `Cmd (⌘)` + `→`
* **回到頁首/頁尾:** `Cmd (⌘)` + `↑` / `↓`
* **向後刪除 (Delete):** `Fn` + `Delete (Backspace)`

## 3. 必裝神器：Rectangle

Windows 11 的視窗拖曳貼齊 (Snapping) 做得非常好，但 Mac 原生居然不支援「拖到邊緣變半個視窗」的功能（或是很難用）。

強烈建議安裝免費開源的 **Rectangle**。裝完後：
* `Ctrl` + `Option` + `←`：視窗佔據左半邊
* `Ctrl` + `Option` + `→`：視窗佔據右半邊

## 4. VS Code 快速上手

既然是工程師，VS Code 絕對是第一個開的軟體。

* **開啟命令面板 (Command Palette):** `Cmd (⌘)` + `Shift` + `P`
* **快速開啟檔案 (Quick Open):** `Cmd (⌘)` + `P`
* **多重游標 (Multi-cursor):** `Option (⌥)` + 點擊
* **開啟終端機:** `Ctrl` + `` ` `` (這個跟 Windows 一樣！)

剛開始轉移雖然痛苦，但習慣後會發現 Mac 的觸控板手勢（三指拖移、四指切換桌面）加上 M 系列晶片的續航，真的能帶來很棒的開發體驗。