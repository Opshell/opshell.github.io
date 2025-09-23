---
title: Day29 - Sitemap
author: Opshell
createdAt: '2024-09-30'
categories:
  - vitepress-thirty-days
tags:
  - 鐵人賽
  - VitePress
  - sitemap
editLink: true
isPublished: true
image: ''
description: ''
keywords: ''
---
![Banner29](https://ithelp.ithome.com.tw/upload/images/20240930/20109918NcsUZ5Jlgl.png)

今天大概就是這個系列會寫寫程式的最後一篇文章了，來處理個 `sitemap` 好了。

## Sitemap 是什麼
什麼是 `sitemap` 呢? 字面解釋就是網站地圖。

不過為什麼網站需要地圖?
其實 `sitemap` 基本上不是我們人類看的，是搜尋引擎的`爬蟲`在看的，`爬蟲`的原理是在你的網站中，按照你的超連結一頁一頁的爬取你網站的頁面並收錄資料，收錄過的頁面才會在搜尋引擎搜尋的時候出現喔~

既然`爬蟲`會一頁一頁的爬，那他為什麼還需要 `sitemap` 呢?
主動提交 `sitemap` 有一些優點：

### 1. 新網站上線
網站剛上線、沒有反向連結，會比較難發現你的網站，主動提交 `sitemap`  告訴搜尋引擎你的存在。

### 2. 幫助搜尋引擎更快收錄你新增的頁面
如果網站規模太大，搜尋引擎可能無法、較慢找到所有網頁(尤其是新增的頁面)，提交 `sitemap` 能加快發現、收錄網頁的速度

### 3. 媒體內容
網站可能有許多媒體內容(影片或圖片)：如果你希望網站出現影片、新聞、圖片等等搜尋結果，可以用 `sitemap` 來提供媒體內容的資料。

### 4. 避免網站的孤島頁面沒有被收錄到
網站如果出現沒有內連完整的孤島網頁，透過 `sitemap` 可以讓搜尋引擎發現這個世外桃源。

### 5. 網站有多語系
透過 `sitemap` 可以讓搜尋引擎知道你的網站會說多種語言。

## Sitemap 生成
說了這麼多該怎麼來生成 `sitemap` 呢?
在 `VitePress` 中提供了開箱即用的配置，為網站生成 `sitemap.xml` 文件。
只要在 `docs/.vitepress/config.mts` 中加入下面的設定：
```ts
export default {
    sitemap: {
        hostname: 'https://opshell.github.io'
    }
};
```

如果 `config` 中 `lastUpdated` 的設定是啟動的， `sitemap` 會生成 `<lastmod>` 標籤。

## 客製 Sitemap
如果我們想在 `sitemap` 中加入一些文章內的參數， `VitePress` 提供了我們 `transformItems` 這個 Hook，
我們修改一下 `docs/.vitepress/config.mts`：
```ts
import { absolutePath, getFrontMatter, isDirectory } from '../hooks/useFrontMatter';

export default {
    sitemap: {
        hostname: 'https://opshell.github.io',
        transformItems: (items) => {
            return items.map((item) => {
                const { url } = item;
                const filepath = absolutePath(url.replace('.html', '.md'));

                if (!isDirectory(filepath)) {
                    const frontmatter = getFrontMatter(filepath);

                    if (frontmatter.isPublished) {
                        const { sitemap } = frontmatter;
                        item.changefreq = sitemap?.changefreq || 'yearly';
                        item.priority = sitemap?.priority || 0.6;

                        return item;
                    }
                }
                return false;
            }).filter(item => item);
        }
    }
};
```

是的 `getFrontMatter` 蠻常用到的，所以把邏輯抽出來做成 Composable 了：
```ts
// useFrontMatter.ts
import path from 'node:path';
import fs from 'node:fs';
import matter from 'gray-matter';

const PAGES_PATH = path.resolve(__dirname, '../pages'); // 把pages 設定成根目錄

export function absolutePath(startPath: string) {
    return path.join(PAGES_PATH, startPath); // 轉換出絕對路徑
}

export function isDirectory(filePath: string) {
    return fs.lstatSync(filePath).isDirectory();
}

// getFrontMatter
export function getFrontMatter(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);

    return data;
};

```

## 測試
設定完之後，就會在你 build 網站的時候順便把 sitemap 生成囉!
```sh
yarn docs:build
```

接下來就可以在 `docs/.vitepress/dist/` 中發現他 `sitemap.xml`。

## 提交 Sitemap
接下來只需要把 `sitemap` 提交給搜尋引擎就可以囉!
每間搜尋引擎都有自己的提交，請各回各家~ 各找各媽~。

例如：在 `google search console` 中提交，選擇 `meta` 驗證方式，在 `config` 中補上
```ts
export default {
    head: [
        ['link', { rel: 'icon', href: '/favicon.ico' }],
        ['meta', { name: 'google-site-verification', content: 'KleiijJ_uj3h0_LT3G25_t8GbiJ4W8Caapo7N8pkt8' }] // [!code ++]
    ]
};
```

驗證完後提交 `sitemap.xml` 就好囉~

## 小結
到今天第 29 天，一個部落格該有的東西都有了，接下來的路就請各位看官自己走下去了~
希望我們都可以讓這個世界多點愛~ 各位晚安。
