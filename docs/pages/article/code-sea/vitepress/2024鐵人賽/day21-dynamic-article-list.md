---
title:  'Day21 - Dynamic article list'
author: 'Opshell'
createdAt: '2024/09/21'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - vitepress
editLink: true
isPublished: false
---

經過昨天的 `Layout` 擴充之後，文章版面越來越成熟了，不禁開始思考一個問題，每次新增文章、調整目錄結構都要手動在 `sidebar.ts` 裡面調來調去的，體驗好差阿，來把 `sidebar` 的產生自動化好了。

## 新增檔案
我們先在 `docs/.vitepress/hooks/` 裡面新增檔案 `useGetSidebar.ts`：
```ts
import path from 'node:path';
import fs from 'node:fs';

const PAGES_PATH = path.resolve(__dirname, '../pages'); // 把 pages 設定成根目錄
const WHITE_LIST = ['index.md']; // 白名單，不需要顯示的文件或目錄

export async function getSidebar(startPathName: string) {
    const startPathDir = path.join(PAGES_PATH, startPathName); // 設定起始目錄

    const files = fs.readdirSync(startPathDir); // 讀取目錄下的文件&目錄

    const items = intersections(files, WHITE_LIST); // 排除白名單

    return getList(items, startPathDir, startPathName);
}
```

createContentLoader ?

https://www.bilibili.com/read/cv27621286/

[VitePress 系列教程：自动生成侧边栏 #7](https://notes.zhengxinonly.com/posts/VitePress/07.%E8%87%AA%E5%8A%A8%E7%94%9F%E6%88%90%E4%BE%A7%E8%BE%B9%E6%A0%8F.html)
