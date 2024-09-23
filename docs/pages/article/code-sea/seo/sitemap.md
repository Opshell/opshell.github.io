---
title:  'Sitemap 筆記'
author: 'Opshell'
createdAt: '2024/09/02'
categories: 'SEO'
tags:
  - seo
  - sitemap
sitemap:
  - priority: 0.5
  - changefreq: yearly
editLink: true
isPublished: false
---

## Sitemap 介紹
搜尋引擎的原理是透過『網路爬蟲』（Crawler）把一個網站上的網頁抓取後進行分析與索引。然而『網路爬蟲』一頁一頁的爬取過程中可能因爲執行效率或爬取時間的因素，部分網頁一直沒有出現在搜尋結果網頁（Search Engine Result Page）中。因此，這時候 Sitemap 就可以扮演很重要的角色，就如同出去旅行一樣，我們可以每到一個觀光景點後，才到『遊客服務中心』索取導覽地圖，這樣的行為就是『網路爬蟲』的動作。也可以安裝 Google Map 或紙本地圖，掌握所有資訊，這時候 Google Map 或紙本地圖就像是 sitemap 一樣提供我們全局的資訊。

廢話不多說，來看看 sitemap 的資料格式吧！

## 格式
網頁完整網址：loc
圖片完整網址：image:loc
影片縮圖完整網址：video:thumbnail_loc
影片標題：video:title
影片完整網址：video:player_loc，allow_embed 可指定搜尋引擎是否能將影片嵌入至搜尋結果中。允許的值為 yes 或 no。
影片的片長（以秒為單位）：video:duration
影片的到期日：video:expiration_date
修改日期：lastmod
優先級：priority。可填入0.0~1.0，越高代表這個網頁越重要。首頁通常為 1.0，然後依重要性逐漸降低。
更新頻率：changefreq
關於『更新頻率』是指『這個網址網頁』的更新頻率，並非以整個網站的更新頻率。更新頻率有幾種值可以填寫：

always：表示頁面一直在變動。
hourly：每小時會變動。
daily：每天會變動。
weekly：每周會變動。
monthly：每月會變動。
yearly：每年會變動。
never：永不變動。
