---
title: 'Sitemap 筆記：sitemap.xml 每個欄位的意思與現況'
author: Opshell
createdAt: '2024-09-02'
categories:
  - SEO
tags:
  - seo
  - sitemap
sitemap:
  - priority: 0.5
  - changefreq: yearly
editLink: true
isPublished: false
image: ''
description: 'sitemap.xml 的欄位一次看懂：loc、lastmod、priority、changefreq，以及圖片、影片的擴充標籤。也整理現在搜尋引擎實際會看哪些、哪些已經被忽略。'
keywords: ''
---
::: warning 草稿
Claude 於 2026-10-05 補完：保留原本的介紹與欄位筆記，補上懶人包、XML 範例、搜尋引擎現況與結論。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
在 VitePress 鐵人賽的 [Day29 - Sitemap](/article/code-sea/vitepress/2024鐵人賽/day29-sitemap) 講了 sitemap 為什麼需要、怎麼自動產生。這篇是當時整理的另一半筆記：產生出來的 `sitemap.xml` 裡每個欄位到底是什麼意思，寫給想手動調整、或想知道 `priority` 到底有沒有用的人。
:::

## 懶人包
- Sitemap 是給爬蟲的導覽地圖，讓搜尋引擎不用一頁一頁爬也能知道網站有哪些頁面。
- 唯一必填的是 `loc`（網址），其他欄位都是選填。
- `lastmod` 是現在最有用的欄位，但要填真的修改時間，亂填會被搜尋引擎忽略。
- Google 官方已經說明會忽略 `priority` 和 `changefreq`，填了不會壞事，但別期待它有效果。
- 圖片、影片可以用擴充的命名空間標籤，讓媒體內容也被收錄。

## 技術拆解

### Sitemap 介紹
搜尋引擎的原理是透過『網路爬蟲』（Crawler）把一個網站上的網頁抓取後進行分析與索引。然而『網路爬蟲』一頁一頁的爬取過程中可能因爲執行效率或爬取時間的因素，部分網頁一直沒有出現在搜尋結果網頁（Search Engine Result Page）中。因此，這時候 Sitemap 就可以扮演很重要的角色，就如同出去旅行一樣，我們可以每到一個觀光景點後，才到『遊客服務中心』索取導覽地圖，這樣的行為就是『網路爬蟲』的動作。也可以安裝 Google Map 或紙本地圖，掌握所有資訊，這時候 Google Map 或紙本地圖就像是 sitemap 一樣提供我們全局的資訊。

廢話不多說，來看看 sitemap 的資料格式吧！

### 基本欄位
- 網頁完整網址：`loc`
- 修改日期：`lastmod`
- 優先級：`priority`。可填入 0.0～1.0，越高代表這個網頁越重要。首頁通常為 1.0，然後依重要性逐漸降低。
- 更新頻率：`changefreq`

關於『更新頻率』是指『這個網址網頁』的更新頻率，並非以整個網站的更新頻率。更新頻率有幾種值可以填寫：

| 值 | 意思 |
|---|---|
| `always` | 表示頁面一直在變動 |
| `hourly` | 每小時會變動 |
| `daily` | 每天會變動 |
| `weekly` | 每週會變動 |
| `monthly` | 每月會變動 |
| `yearly` | 每年會變動 |
| `never` | 永不變動 |

### 圖片與影片的擴充標籤
- 圖片完整網址：`image:loc`
- 影片縮圖完整網址：`video:thumbnail_loc`
- 影片標題：`video:title`
- 影片完整網址：`video:player_loc`，`allow_embed` 可指定搜尋引擎是否能將影片嵌入至搜尋結果中。允許的值為 `yes` 或 `no`。
- 影片的片長（以秒為單位）：`video:duration`
- 影片的到期日：`video:expiration_date`

這些帶前綴的標籤要在 `<urlset>` 上宣告對應的命名空間才會生效。

### 搜尋引擎現在實際看哪些
寫 sitemap 的時候很容易認真幫每一頁排 `priority`，但現況是：

| 欄位 | Google 的態度 |
|---|---|
| `loc` | 必填，一定看 |
| `lastmod` | 會看，前提是它「一直都是準的」；如果每次產生都填當下時間，會被判定不可信而忽略 |
| `priority` | 官方說明會忽略 |
| `changefreq` | 官方說明會忽略 |

其他搜尋引擎的態度不一定相同，以各家官方文件為準。所以 `priority`、`changefreq` 留著無妨（本站的 frontmatter 也還在用），但不用花時間調。真正要顧好的是 `lastmod`：VitePress 開啟 `lastUpdated` 後，會用 git 的最後修改時間來填，剛好是準的。

## 例子與對比

### 一份完整的 sitemap.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
    xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
>
    <url>
        <loc>https://example.com/</loc>
        <lastmod>2026-10-01</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://example.com/article/hello</loc>
        <lastmod>2026-09-15</lastmod>
        <image:image>
            <image:loc>https://example.com/images/hello-cover.jpg</image:loc>
        </image:image>
    </url>
    <url>
        <loc>https://example.com/video/intro</loc>
        <video:video>
            <video:thumbnail_loc>https://example.com/images/intro-thumb.jpg</video:thumbnail_loc>
            <video:title>產品介紹</video:title>
            <video:description>三分鐘看懂產品怎麼用</video:description>
            <video:player_loc allow_embed="yes">https://example.com/player/intro</video:player_loc>
            <video:duration>180</video:duration>
        </video:video>
    </url>
</urlset>
```

### 該花力氣的地方 vs 不用花力氣的地方

| 值得花力氣 | 不用花力氣 |
|---|---|
| 只放想被收錄的頁面（草稿、後台、`noindex` 的頁面不要放） | 逐頁微調 `priority` |
| `lastmod` 用真的修改時間 | 猜每頁的 `changefreq` |
| 網址跟 canonical 一致（結尾斜線、`.html` 統一） | 把 sitemap 拆得很細 |
| 到 Search Console 提交，看有沒有錯誤 | |

本站在 Day29 用 `transformItems` 把 `isPublished` 不是 true 的頁面濾掉，就是第一列的做法。

## 結論
Sitemap 就是那張遊客服務中心的導覽地圖：地圖上的景點要真的存在、開放時間要寫對（`lastmod`），至於哪個景點比較重要（`priority`），爬蟲現在自己會判斷，不太聽我們的。

地圖畫得再漂亮，景點本身不好玩也沒用，內容還是王道。
