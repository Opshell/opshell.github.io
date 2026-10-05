---
title: 'Cloudflare R2 圖床建置：Bucket、自訂網域、CORS 與上傳權限'
image:
description: '用 Cloudflare R2 架一個 images.opshell.me 的圖床：建立 Bucket、綁自訂網域、設定 CORS、申請 API Token，附上用 Node.js 上傳圖片的範例與兩個常見的坑。'
keywords:
author: 'Opshell'
createdAt: 2026-01-21
categories:
  - 'Cloudflare R2'
tags:
  - 'Cloudflare R2'
  - Cloudflare
  - 圖床
  - 部署
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把原本的設定筆記整理成文章格式，補上脈絡、懶人包、Node.js 上傳範例與結論，原本的步驟與疑難排解都保留。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
部落格搬家三部曲的最後一篇。[網域](./網域申請)買好了，[GitHub Pages](./github-pages-串接自訂網域-含-ssl-dns-設定) 也接上了，剩下攝影集的照片要有個地方放。照片放在 Git 倉庫裡會讓倉庫越來越肥，所以改用 Cloudflare R2 當圖床，網址用 `images.opshell.me`。
:::

## 懶人包
- Cloudflare R2 是相容 S3 API 的物件儲存，而且**不收流出流量費**（egress），很適合當圖床。
- 步驟四個：建立 Bucket → 綁自訂網域 → 設定 CORS → 申請 API Token。
- 自訂網域綁好之後，Cloudflare 會自動加 CNAME，不用手動設 DNS。
- API Token 權限選 **Object Read & Write** 就夠了；Endpoint 不要包含 Bucket 名稱。

## 技術拆解

### 為什麼選 R2
圖床最怕兩件事：容量越來越大、流量費越來越貴。R2 用「倉庫」來比喻的話，它是一間租金便宜、而且**出貨不收運費**的倉庫，照片被看再多次也不會因為流量收到驚喜帳單。再加上網域本來就在 Cloudflare，DNS、CDN、儲存都在同一個後台。免費額度與計價方式以 Cloudflare 官方的 R2 價目為準。

### 1. 建立儲存桶（Bucket）
- **名稱**：`opshell-gallery`（僅限小寫英文、數字、短橫線）。
- **位置**：Automatic（自動選擇最佳節點）。

### 2. 綁定自訂網域（Custom Domain）
讓圖片網址從 `r2.dev` 變成 `images.opshell.me`。

- **位置**：Bucket Settings > Public Access > **Custom Domains**。
- **操作**：點擊「+ 連接網域」，輸入 `images.opshell.me`。
- **結果**：Cloudflare 會自動新增 CNAME 紀錄，不用手動設定 DNS。

`r2.dev` 的公開網址官方定位是開發測試用，有速率限制，也吃不到快取設定；正式的圖床還是要綁自訂網域。

### 3. CORS 設定（跨域資源共享）
解決前端（JS）無法讀取圖片資訊的問題。只用 `<img>` 顯示圖片不需要 CORS，但如果要用 `fetch` 讀圖片、或是把圖片畫進 `<canvas>` 再匯出，就一定要設。

- **位置**：Bucket Settings > **CORS Policy**。
- **設定內容**：

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

`"*"` 代表任何網站都能讀。如果不想讓別人的網站直接拿去用，可以把 `AllowedOrigins` 改成 `["https://opshell.me"]`。

### 4. 取得上傳權限（API Token）
給本地的 Node.js 腳本或 S3 Browser 上傳圖片用。

- **位置**：R2 首頁 > **Manage R2 API Tokens**。
- **權限**：**Object Read & Write**（讀寫權限）。
- **保存資訊**：
    - `Access Key ID`
    - `Secret Access Key`
    - `Endpoint`（像 S3 Browser 這類工具，要去掉 `https://` 只填主機名稱）

::: warning
`Secret Access Key` 只會顯示一次，記得存進密碼管理工具或 `.env`，而且 `.env` 不要進 Git。
:::

## 例子與對比

### 用 Node.js 上傳圖片
R2 相容 S3 API，所以直接用 AWS 的 SDK 就好：

```ts
// upload.ts
import { readFile } from 'node:fs/promises';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const client = new S3Client({
    region: 'auto',
    // SDK 要完整網址；注意結尾不要加 Bucket 名稱
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? ''
    }
});

await client.send(new PutObjectCommand({
    Bucket: 'opshell-gallery',
    Key: 'photos/2026/sunset.webp',
    Body: await readFile('./sunset.webp'),
    ContentType: 'image/webp'
}));

console.log('上傳完成：https://images.opshell.me/photos/2026/sunset.webp');
```

`ContentType` 記得帶，不然瀏覽器可能會把圖片當成下載檔案。

### Endpoint 的兩種寫法

| 用在哪 | 寫法 |
| :--- | :--- |
| AWS SDK（Node.js 腳本） | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| S3 Browser 這類 GUI 工具 | `<ACCOUNT_ID>.r2.cloudflarestorage.com`（去掉 `https://`） |
| 兩者都**不要** | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com/opshell-gallery`（後台複製的網址可能帶著 Bucket 名稱） |

### 遇到的問題與解法

| 問題 | 原因 | 解法 |
| :--- | :--- | :--- |
| 找不到「連接網域（Connect Domain）」的按鈕 | 介面誤導，其實就在 Settings 分頁**最上方**的 "Custom Domains" 區塊。 | 點擊該區塊右上角的藍色「+ 新增」按鈕。 |
| 上傳腳本無法運作 | API Token 權限不足，或 Endpoint 格式錯誤。 | 確認 Token 權限為 "Read & Write"（不是 Admin），而且 Endpoint 不包含 Bucket 名稱。 |

## 結論
R2 當圖床的流程其實很短：開 Bucket、綁網域、設 CORS、拿 Token。真正會卡住的只有「按鈕藏在哪」和「Endpoint 要不要帶東西」這兩件小事。

到這裡，網域、部落格、圖床三件套就都搬好家了。照片終於不用再塞進 Git 倉庫裡，倉庫也終於可以減肥了 ~~（Git 歷史裡的那些就算了，它們會永遠活在那裡）~~。
