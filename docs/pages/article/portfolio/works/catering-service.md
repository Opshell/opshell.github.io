---
title: 校園食材登錄平臺3.0
image: ''
author: Opshell
createdAt: '2024-10-14'
categories:
  - portfolio
tags:
  - portfolio
  - 前端
  - UI/UX
editLink: false
isPublished: false
description: '教育部國教署校園食材登錄平臺 3.0：整合 1.0 與 2.0、改成前後端分離，並導入 Figma、Postman Mock Server、元件 Kit 與無障礙規範。'
keywords: ''
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的專案筆記補上脈絡、懶人包、挑戰與解法和結論，原本各段內容都保留。發佈前確認客戶名稱能公開。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
作品集的一篇，記錄「校園食材登錄平臺」第三版的改版。這類政府平台常見的狀況是：前兩版各自長出一堆功能、畫面風格不一，協作的人一多，溝通成本比寫程式還高。這篇整理我在這個專案負責的前端與流程改善，給想了解我做過什麼的人看。
:::

## 懶人包
- 專案：教育部國教署的校園食材登錄平臺 3.0，整合 1.0、2.0 並重構成前後端分離的現代架構。
- 我負責：前端開發與 UI/UX 優化，導入 Figma 工作流、元件 Kit、Postman 協作模式，以及無障礙規範。
- 技術：`Vue`、`Vite`、`TypeScript`、`Vitest`、`SCSS`，後端 `Laravel`，工具 `Figma`、`Postman`、`Docker`、`JIRA`、`Jenkins`。
- 成果：前後端串接負載降低 50%，並通過國家無障礙網站 2A 級標準檢驗。

## 技術拆解

### 教育部國教署 - 校園食材登錄平臺3.0

### 專案內容概述
整合食登1.0 及 2.0 優化 UIUX、添加新需求，使用 Laravel + Vite 前後端分離，重構整套系統為更現代的框架。

### 專案管理與協作
使用 JIRA 進行任務追蹤與協作， Git 版本控制、 Postman Workspaces + Postman Mock Server 與後端協作，進行 API 設計及管控，Docker 同步專案環境，利用 Jenkins 部署，確保專案開發時溝通順暢且能按時交付。

### 使用技術
- 前端：HTML、CSS、SCSS、JavaScript、TypeScript、Vue、Vite、Vitest
- 後端：Laravel、PHP
- 資料庫：MySQL
- 工具：Git、Postman、Docker、JIRA、Figma

## 例子與對比

### 技術創新與導入

#### 優化前端開發流程
導入 Figma，優化 PM 展示 > UIUX > 前端切版 的整體工作流，提升內部、客戶溝通效率，加快專案執行進程。

#### 技術封裝與標準化
導入、封裝如 Quasar、Swiper 等現代元件庫，撰寫開發文件，製作元件 Kit，降低協同工作時的技術門檻及提高接手效率。

#### 優化前後端 API 開發工作流
導入 Postman Workspaces + Postman Mock Server ，前後端串接工作模式，減少互相等待，資料不共享及API格式不透明等問題，降低串接負載50%。

#### 開發無障礙規範
開發網站無障礙標準，人工審查標準，通過國家無障礙網站 2A 級標準檢驗。

### 挑戰與解法一覽

| 挑戰 | 解法 |
|---|---|
| 1.0、2.0 兩套系統要合而為一 | 用 `Laravel` + `Vite` 前後端分離重構整套系統 |
| PM、設計、前端之間來回確認很花時間 | 導入 `Figma`，把 PM 展示 > UIUX > 切版串成同一條工作流 |
| 前端等後端 API、API 格式不透明 | `Postman Workspaces` 共享規格，`Mock Server` 先給假資料，兩邊各做各的 |
| 多人協作、接手門檻高 | 封裝 `Quasar`、`Swiper` 成元件 Kit，搭配開發文件 |
| 政府網站要過無障礙檢驗 | 自訂無障礙開發標準與人工審查流程，通過 2A 級 |

## 結論
這個專案最大的收穫不是某個炫技的功能，而是把「人與人之間的等待」一個一個拆掉：設計稿有地方看、API 有地方對、元件有地方抄。程式寫得快是一回事，-|讓整個團隊一起變快|-才是重構真正的價值。
