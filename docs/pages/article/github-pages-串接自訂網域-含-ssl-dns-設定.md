---
title: GitHub Pages 串接自訂網域 (含 SSL/DNS 設定)
image:
description:
keywords:
author: 'Opshell'
createdAt: 2026-01-21
categories:
  - '未分類'
tags:
  -
editLink: true
isPublished: false
---

# GitHub Pages 串接 Cloudflare 自訂網域筆記

## 1. Cloudflare DNS 設定
為了讓 `opshell.me` 指向 GitHub Pages，需設定以下紀錄：

* **A 紀錄 (根網域 `@`)**：指向 GitHub 官方 IP
    * `185.199.108.153`
    * `185.199.109.153`
    * `185.199.110.153`
    * `185.199.111.153`
* **CNAME 紀錄 (`www`)**：指向 `opshell.github.io`

## 2. 標準串接流程 (SOP)
這是一個「先灰雲，後橘雲」的關鍵流程，順序錯誤會導致驗證失敗。

1.  **Cloudflare 端**：將上述 5 筆 DNS 紀錄的 Proxy Status 切換為 **「僅 DNS (灰色雲朵)」**。
2.  **GitHub 端**：進入 Settings > Pages > Custom domain，填入 `opshell.me` 並儲存。
3.  **等待驗證**：等待 GitHub 顯示 **"DNS check successful"** (綠色勾勾)。
4.  **開啟 HTTPS**：勾選 "Enforce HTTPS" (若反灰則等待 SSL 憑證簽發，約 15-30 分鐘)。
5.  **Cloudflare 端**：確認網站可存取後，將 DNS 紀錄切回 **「已 Proxy 處理 (橘色雲朵)」** 以啟用 CDN。
6.  **SSL 模式調整**：Cloudflare SSL/TLS 設定改為 **"Full"** 或 **"Full (Strict)"**。

## 3. 遇到的問題與解法 (Troubleshooting)
* **錯誤訊息**：`InvalidDNSError` 或 `Domain's DNS record could not be retrieved`。
    * **原因**：在 GitHub 驗證當下，Cloudflare 開啟了「橘色雲朵 (Proxy)」，導致 GitHub 讀不到正確的 A 紀錄 IP。
    * **解法**：暫時關閉 Proxy (切換為灰雲)，強制重整 GitHub 設定頁，待驗證通過後再開回橘雲。
* **錯誤訊息**：`Too many redirects` (重新導向次數過多)。
    * **原因**：Cloudflare SSL 設定為 "Flexible"，與 GitHub Pages 的 HTTPS 衝突。
    * **解法**：將 Cloudflare SSL 改為 **"Full"**。
* **狀況**："Enforce HTTPS" 按鈕無法勾選。
    * **原因**：Let's Encrypt 憑證尚未簽發完成。
    * **解法**：保持「灰雲」狀態，等待約 30 分鐘後重試。