---
title: Cloudflare R2 容器設定 (圖床建置)
image:
description:
keywords:
author: 'Opshell'
createdAt: 2026-01-21
categories:
  - 'Cloudflare R2'
tags:
  - 'Cloudflare R2'
editLink: true
isPublished: false
---

# Cloudflare R2 圖床容器設定筆記

## 1. 建立儲存桶 (Bucket)
* **名稱**：`opshell-gallery` (僅限小寫英文、數字、短橫線)。
* **位置**：Automatic (自動選擇最佳節點)。

## 2. 綁定自訂網域 (Custom Domain)
讓圖片網址從 `r2.dev` 變為 `images.opshell.me`。

* **位置**：Bucket Settings > Public Access > **Custom Domains**。
* **操作**：點擊「+ 連接網域」，輸入 `images.opshell.me`。
* **結果**：Cloudflare 會自動新增 CNAME 紀錄，無需手動設定 DNS。

## 3. CORS 設定 (跨域資源共享)
解決前端 (JS) 無法讀取圖片資訊的問題。

* **位置**：Bucket Settings > **CORS Policy**。
* **設定內容**：
    ```json
    [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": [],
        "MaxAgeSeconds": 3000
      }
    ]
    ```

## 4. 取得上傳權限 (API Token)
供本地 Node.js 腳本或 S3 Browser 上傳圖片使用。

* **位置**：R2 首頁 > **Manage R2 API Tokens**。
* **權限**：**Object Read & Write** (讀寫權限)。
* **保存資訊**：
    * `Access Key ID`
    * `Secret Access Key`
    * `Endpoint` (需去除 `https://` 使用)

## 5. 遇到的問題與解法 (Troubleshooting)
* **問題**：找不到「連接網域 (Connect Domain)」的按鈕。
    * **原因**：介面誤導，其實就在 Settings 分頁的**最上方** "Custom Domains" 區塊。
    * **解法**：點擊該區塊右上角的藍色「+ 新增」按鈕。
* **問題**：上傳腳本無法運作。
    * **原因**：API Token 權限不足或 Endpoint 格式錯誤。
    * **解法**：確認 Token 權限為 "Read & Write" (非 Admin)，且 Endpoint 不包含 Bucket 名稱。