---
title:  'Day22 - classify'
author: 'Opshell'
createdAt: '2024/09/22'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: false
---

自動化側邊欄目錄之後，接下來想做標籤功能和分類功能。

## 歸類 function 設計
我們一樣在 `docs/.vitepress/hooks/` 目錄下新增檔案 `useArticleClassification`：

```ts
import path from 'node:path';
import fs from 'node:fs';
import matter from 'gray-matter';

const isDirectory = (path: string) => fs.lstatSync(path).isDirectory();

function getFrontMatter(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);

    return data;
}

interface iTags {
    [key: string]: {
        count: number
        group: {
            title: string
            category: string
            date: string
            url: string
        }[]
    }
}
export interface iClassification {
    tags: iTags

}

export async function getArticleClassification(files: string[], startPathName: string, res: iClassification | null = null): Promise<iClassification> {
    if (!res) {
        res = {
            tags: {},
        };
    }

    for (const file of files) {
        const dir = path.join(startPathName, file); // 組合路徑
        const isDir = isDirectory(dir); // 判斷是否是資料夾

        if (isDir) { // 如果是資料夾，遞迴進下一次
            const nextfiles = fs.readdirSync(dir);
            res = await getArticleClassification(nextfiles, `${startPathName}/${file}`, res);
        } else {
            const fileName = path.basename(file);

            // 排除非md檔案
            const suffix = path.extname(file);
            if (suffix !== '.md') {
                continue;
            }

            const frontmatter = getFrontMatter(`${startPathName}/${fileName}`);

            if (frontmatter.tags && frontmatter.isPublished) {
                const url = `${startPathName.split('\pages')[1]}/${fileName.replace('.md', '.html')}`;

                for (const tag of frontmatter.tags as string[]) {
                    res.tags[tag] = res.tags[tag] ?? { count: 0, group: [] };
                    res.tags[tag].count++;
                    res.tags[tag].group.push({
                        title: frontmatter.title as string,
                        iamge: frontmatter.image as string | '',
                        category: frontmatter.categories as string | '',
                        date: frontmatter.createdAt as string | '',
                        url
                    });
                }
            }
        }
    }

    return res;
}
```

透過和昨天類似的方式把 Tags 整理起來。 之後如果要做 `時間線` 、 `分類` 等歸類方式，也都可以在這邊擴充。

## Config 設定
然後我們在 `config` 中加入他，然後擴充原先 `DefaultTheme.Config` 的型別：
```ts
import { getArticleClassification, iClassification } from '../hooks/useArticleClassification';

const startPathDir = path.resolve(__dirname, '../pages'); // 把pages 設定成根目錄
const mdFiles = fs.readdirSync(startPathDir); // 讀取目錄下的文件&目錄

interface iThemeConfig extends DefaultTheme.Config {
    classification: iClassification
}

const classification = await getArticleClassification(mdFiles, startPathDir);

export default defineConfig({
    themeConfig: {
        classification,
    } as iThemeConfig,
});

```

## 文章裡要使用
title: 'Enum 使用實例'
author: 'Opshell'
createdAt: '2024/08/10'
categories:
  - 使用實例
tags:
  - typescript
editLink: true
isPublished: true

## 使用 classification
資料整理好後，由於我們把他塞在 `themeConfig` 裡面，所以我們可以透過 `useData().theme` 得他，我們在擴充後的 `Layout` 使用他吧。
```vue
<script>
    import { useData } from 'vitepress';

    const { theme } = useData();

    const classification = theme.value.classification;
</script>

<template>
    <Layout>
        <template #aside-ads-after>
            <div class="tag-box">
                <a
                    v-for="(info, tag) in classification.tags"
                    :key="`tag-${tag}`"
                    class="tag"
                    :href="`/tags-list.html?tag=${tag}&page=1`"
                >
                    <span>{{ tag }}：</span>
                    <span class="count">{{ info.count }}</span>
                </a>
            </div>
        </template>
    </Layout>
</template>
```

## 小結
這樣在我們的文章右下角，就會出現整個網站有的 tag 和相關的文章數量啦~
