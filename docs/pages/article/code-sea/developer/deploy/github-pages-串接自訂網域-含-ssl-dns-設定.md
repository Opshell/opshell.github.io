---
title: 'GitHub Pages 串接 Cloudflare 自訂網域（含 SSL／DNS 設定）'
image:
description: 'GitHub Pages 接上 Cloudflare 買的網域：四筆 A 紀錄加一筆 CNAME，「先灰雲、後橘雲」的串接順序，以及 InvalidDNSError、Too many redirects、Enforce HTTPS 反灰三個坑的解法。'
keywords:
author: 'Opshell'
createdAt: 2026-01-21
categories:
  - '未分類'
tags:
  - GitHub Pages
  - Cloudflare
  - DNS
  - 部署
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把原本的設定筆記整理成文章格式，補上脈絡、懶人包、雲朵狀態的說明與結論，原本的 SOP 與疑難排解都保留。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
部落格搬家三部曲的第二篇。[上一篇](./網域申請)在 Cloudflare 買好了 `opshell.me`，這篇要讓它指向 GitHub Pages 上的部落格，並且全站 HTTPS。步驟本身不多，但順序錯一步就會卡在驗證失敗或無限重新導向，所以把正確順序和踩過的坑記下來。
:::

## 懶人包
- DNS 要設四筆 A 紀錄（根網域指向 GitHub 的四個 IP）加一筆 CNAME（`www` 指向 `<帳號>.github.io`）。
- 關鍵順序是「**先灰雲、後橘雲**」：GitHub 驗證和簽發憑證時，Cloudflare 的 Proxy 要先關掉。
- 驗證通過、Enforce HTTPS 勾好之後，再開回橘雲享受 CDN。
- Cloudflare 的 SSL 模式要用 **Full** 或 **Full (Strict)**，用 Flexible 會無限重新導向。

## 技術拆解

### 先搞懂：灰雲和橘雲
Cloudflare 的每一筆 DNS 紀錄旁邊都有一朵雲：

- **灰雲（僅 DNS）**：Cloudflare 只負責告訴大家「這個網域在哪裡」，訪客直接連到 GitHub。
- **橘雲（已 Proxy）**：訪客先連到 Cloudflare，再由 Cloudflare 轉給 GitHub，中間可以做 CDN 快取、防護。

橘雲就像大樓的管理員：外人看到的是管理員，看不到你家的門牌。這對安全很好，但 GitHub 要驗證「這個網域是不是指向我」的時候，看到的也是管理員，它就會說驗證失敗。所以驗證期間要先讓管理員讓開。

### 1. Cloudflare DNS 設定
為了讓 `opshell.me` 指向 GitHub Pages，需要設定以下紀錄：

- **A 紀錄（根網域 `@`）**：指向 GitHub 官方 IP
    - `185.199.108.153`
    - `185.199.109.153`
    - `185.199.110.153`
    - `185.199.111.153`
- **CNAME 紀錄（`www`）**：指向 `opshell.github.io`

GitHub 的 IP 以官方文件〈Managing a custom domain for your GitHub Pages site〉為準。

### 2. 標準串接流程（SOP）
這是一個「先灰雲，後橘雲」的關鍵流程，順序錯誤會導致驗證失敗。

1. **Cloudflare 端**：將上述 5 筆 DNS 紀錄的 Proxy Status 切換為 **「僅 DNS（灰色雲朵）」**。
2. **GitHub 端**：進入 Settings > Pages > Custom domain，填入 `opshell.me` 並儲存。
3. **等待驗證**：等 GitHub 顯示 **"DNS check successful"**（綠色勾勾）。
4. **開啟 HTTPS**：勾選 "Enforce HTTPS"（若反灰，就等 SSL 憑證簽發，約 15～30 分鐘）。
5. **Cloudflare 端**：確認網站可以存取之後，將 DNS 紀錄切回 **「已 Proxy 處理（橘色雲朵）」** 以啟用 CDN。
6. **SSL 模式調整**：Cloudflare 的 SSL/TLS 設定改為 **"Full"** 或 **"Full (Strict)"**。

## 例子與對比

### 遇到的問題與解法

| 狀況 | 原因 | 解法 |
| :--- | :--- | :--- |
| `InvalidDNSError` 或 `Domain's DNS record could not be retrieved` | GitHub 驗證當下，Cloudflare 開著橘雲（Proxy），GitHub 讀不到正確的 A 紀錄 IP。 | 暫時關閉 Proxy（切成灰雲），強制重新整理 GitHub 設定頁，驗證通過後再開回橘雲。 |
| `Too many redirects`（重新導向次數過多） | Cloudflare SSL 設定為 "Flexible"，與 GitHub Pages 的 HTTPS 衝突。 | 將 Cloudflare SSL 改為 **"Full"**。 |
| "Enforce HTTPS" 無法勾選 | Let's Encrypt 憑證尚未簽發完成。 | 保持灰雲，等約 30 分鐘後再試。 |

### 為什麼 Flexible 會無限重新導向
這個坑值得多講一句：

```text
Flexible 模式：
訪客 --HTTPS--> Cloudflare --HTTP--> GitHub Pages
                                     「請改用 HTTPS」（301）
訪客 <---------- Cloudflare <--------
訪客 --HTTPS--> Cloudflare --HTTP--> GitHub Pages
                                     「請改用 HTTPS」（301）
……無限循環

Full 模式：
訪客 --HTTPS--> Cloudflare --HTTPS--> GitHub Pages
                                      正常回應
```

Flexible 的意思是「Cloudflare 到原站之間用 HTTP」，但 GitHub Pages 開了 Enforce HTTPS 之後，收到 HTTP 就會叫你改走 HTTPS，兩邊就這樣互踢皮球。改成 Full，Cloudflare 到 GitHub 也走 HTTPS，循環就解開了。

### 正確順序 vs 常見的錯誤順序

| | 正確 | 常見錯誤 |
| :--- | :--- | :--- |
| 第一步 | 先切灰雲 | 直接用預設的橘雲 |
| GitHub 驗證 | 成功 | `InvalidDNSError` |
| 憑證簽發 | GitHub 順利簽發 | Enforce HTTPS 一直反灰 |
| 最後 | 開回橘雲、SSL 設 Full | SSL 留在 Flexible，無限重新導向 |

## 結論
GitHub Pages 接自訂網域，真正的難點只有一個：**驗證期間讓 Cloudflare 讓開**。記住「先灰雲、後橘雲、SSL 用 Full」這三句，大部分的坑都能繞過去。

下一篇會用同一個網域，在 Cloudflare R2 架一個 `images.opshell.me` 的圖床。至於那朵雲，記得驗證完要把它塗回橘色 ~~（不然 CDN 就白買了，雖然是免費的）~~。
