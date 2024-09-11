---
title:  'Day21 - Dynamic article list'
author: 'Opshell'
createdAt: '2024/09/21'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: false
---

經過昨天的 `Layout` 擴充之後，文章版面越來越成熟了，不禁開始思考一個問題，每次新增文章、調整目錄結構都要手動在 `sidebar.ts` 裡面調來調去的，體驗好差阿，來把 `sidebar` 的產生自動化好了。

## 自動化 sidebar 產生
我們先在 `docs/.vitepress/hooks/` 裡面新增檔案 `useGetSidebar.ts`：
```ts
import path from 'node:path';
import fs from 'node:fs';
import matter from 'gray-matter';

import { DefaultTheme } from 'vitepress';

const PAGES_PATH = path.resolve(__dirname, '../pages'); // 把pages 設定成根目錄
const WHITE_LIST = ['index.md']; // 白名單，不需要顯示的文件或目錄

// 判斷是否是資料夾
const isDirectory = (path: string) => fs.lstatSync(path).isDirectory();
// 取陣列差值
const intersections = (arr1: string[], arr2: string[]) => Array.from(new Set(arr1.filter(item => !new Set(arr2).has(item))));

// 取得 FrontMatter
function getFrontMatter(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);

    return data || null;
}

function getList(params: string[], absolutePath: string, startPath: string): DefaultTheme.SidebarItem[] {
    const res = [];

    for (const file of params) {
        const dir = path.join(absolutePath, file); // 組合路徑
        const isDir = isDirectory(dir); // 判斷是否是資料夾

        if (isDir) { // 如果是資料夾，遞迴進下一次
            const files = fs.readdirSync(dir);
            res.push({
                text: file,
                collapsed: true,
                items: getList(files, dir, `${startPath}/${file}`)
            });
        } else {
            const fileName = path.basename(file);

            // 排除非md檔案
            const suffix = path.extname(file);
            if (suffix !== '.md') {
                continue;
            }

            const frontmatter = getFrontMatter(`${absolutePath}/${file}`);

            if (frontmatter.isPublished) { // 判斷是否發布
                res.push({
                    text: frontmatter.title as string || fileName.replace('.md', ''),
                    link: `${startPath}/${fileName.replace('.md', '')}`
                });
            }
        }
    }

    return res;
}

export async function getSidebar(startPath: string) {
    const absolutePath = path.join(PAGES_PATH, startPath); // 轉換出絕對路徑

    const files = fs.readdirSync(absolutePath); // 讀取目錄下的資料夾&文件

    const items = intersections(files, WHITE_LIST); // 排除白名單

    return getList(items, absolutePath, startPath);
}
```

一支簡單的 `hook` 透過讀取目錄，解析目錄裡 `.md` 的 `frontmatter` 來拼 `sidebar` 。
當然，排序也都可以在這裡處理，不過 Opshell 目前沒需求就先跳過了。

## 使用
接下來在 `config` 裡面
```ts
import { getSidebar } from '../hooks/useGetSidebar';

export default defineConfig({
    themeConfig: {
        sidebar: {
            '/article/code-sea/developer/': [{
                text: 'Developer',
                items: await getSidebar('/article/code-sea/developer')
            }],
            '/article/code-sea/javascript/': [{
                text: 'Jypescript',
                items: await getSidebar('/article/code-sea/javascript')
            }],
            '/article/code-sea/typescript/': [{
                text: 'Typescript',
                items: await getSidebar('/article/code-sea/typescript')
            }],
            '/article/code-sea/vitepress/': [{
                text: 'Vitepress',
                items: await getSidebar('/article/code-sea/vitepress')
            }],
            '/article/life-murmurs/': [{
                text: 'Life\'s Mumurs',
                items: await getSidebar('/article/life-murmurs')
            }]
        }
    }
});
```

這樣就可以自動化生產側邊欄囉~
