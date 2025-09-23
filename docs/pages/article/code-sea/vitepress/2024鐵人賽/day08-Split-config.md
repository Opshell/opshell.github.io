---
title: Day08 - config 拆分
author: Opshell
createdAt: '2024-09-09'
categories:
  - vitepress-thirty-days
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: true
image: ''
description: ''
keywords: ''
version: 1.0.0
---
![banner08](https://ithelp.ithome.com.tw/upload/images/20240909/201099187kroOlXw41.png)

## config 拆分
加完了字型和 SCSS 之後 又要繼續在 `config` 加設定啦~~
不過現在的 `themeConfig` 由於要一個個連結設定的原因，
已經是長長長長長的義大利麵的狀態了，
我們先來把會常常改到的幾個設定(`nav`、`sidebar`、`socialLinks`)獨立出來吧

先在 `docs/.vitepress/theme` 目錄下面，建立目錄並命名為 `configs`，然後在把這些設定分別製作成檔案，然後在 `config` 裡面引用：
::: code-group
```ts [nav.ts]
import { DefaultTheme } from 'vitepress';

export default [
    {
        text: '✨️ Vitepress Thirty Day',
        link: '/vitepress-thirty-day'
    },
    {
        text: 'Article',
        items: [
            {
                text: 'Life\'s Mumurs',
                link: '/article/life-murmurs/life'
            },
            {
                text: 'Code Sea',
                items: [
                    {
                        text: 'developer',
                        link: '/article/code-sea/developer/authenticate/01-session-cookie'
                    },
                    {
                        text: 'javascript',
                        link: '/article/code-sea/javascript/how-is-this'
                    },
                    {
                        text: 'typescript',
                        link: '/article/code-sea/typescript/enum'
                    },
                    {
                        text: 'vitepress',
                        link: '/article/code-sea/vitepress/day-1'
                    }
                ]
            }
        ]
    },
] as DefaultTheme.NavItem[];
```

```ts [sidebar.ts]
import { DefaultTheme } from 'vitepress';

export default {
    '/article/code-sea/typescript/': [
        {
            text: 'Typescript',
            items: [
                { text: '1. 前言', link: '/article/code-sea/typescript/day-1' },
                { text: 'Enum & 使用情境', link: '/article/code-sea/typescript/enum' }
            ]
        }
    ],
    '/article/code-sea/vitepress/': [
        {
            text: 'Vitepress',
            items: [
                { text: '1. Opshell 碎碎念', link: '/article/code-sea/vitepress/day-1' },
                { text: '2. Environment Alignment', link: '/article/code-sea/vitepress/day-2' },
                { text: '3. Why is Vitepress', link: '/article/code-sea/vitepress/day-3' },
                { text: '4. Init a home', link: '/article/code-sea/vitepress/day-4' }
            ]
        }
    ],
    '/article/life-murmurs/': [
        {
            text: 'Life Murmurs',
            items: [
                { text: 'Life is it', link: '/article/life-murmurs/life' }
            ]
        }
    ]
} as DefaultTheme.Sidebar;
```

```ts [socialLinks.ts]
import { DefaultTheme } from 'vitepress';

export default [
    {
        icon: 'github',
        link: 'https://github.com/Opshell',
        ariaLabel: 'opshell\'s github'
    },
    {
        icon: 'instagram',
        link: 'https://www.instagram.com/phenomx9990/',
        ariaLabel: 'opshell\'s instagram'
    }
] as DefaultTheme.SocialLink[];
```

```ts [config.mts]
import nav from './theme/configs/nav';
import sidebar from './theme/configs/sidebar';
import socialLinks from './theme/configs/socialLinks';

export default defineConfig({
    themeConfig: {
        nav,
        socialLinks,
        sidebar
    }
});
```
:::

## search
拆分完之後繼續來補設定吧~
在一個部落格中，`search(搜尋)`也是很重要的一個功能，能在一大堆的文章中找到相關的內容，
而 `VitePress` 的搜尋功能是建立在 [minisearch](https://github.com/lucaong/minisearch/) 的架構上，
所以能夠使用瀏覽器內的索引來模糊全文搜尋。
所以我們來把 `search`的功能補完吧
在 `docs/.vitepress/theme/configs` 目錄下，新增檔案 `search.ts` 然後輸入下面的內容：

```ts
import { DefaultTheme } from 'vitepress';

// 要排除的目錄
const ignorePath = [
    'pages/article/life-murmurs'
];

export default {
    provider: 'local', // 啟動 miniSearch
    options: {
        translations: {
            button: {
                buttonText: '搜尋文章',
                buttonAriaLabel: '搜尋文章'
            },
            modal: {
                noResultsText: '找不到相關內容',
                displayDetails: '詳細訊息',
                resetButtonTitle: '清除搜尋條件',
                backButtonTitle: '返回搜尋结果',
                footer: {
                    selectText: '選擇',
                    selectKeyAriaLabel: 'enter',
                    navigateText: '切換',
                    navigateUpKeyAriaLabel: 'up arrow',
                    navigateDownKeyAriaLabel: 'down arrow',
                    closeKeyAriaLabel: 'escape'
                }
            }
        },
        _render(src, env, md) {
            const html = md.render(src, env);
            // 排除 有設定不給搜尋 或者 沒有發布的頁面
            if (env.frontmatter?.search === false || !env.frontmatter?.isPublished)
                return '';

            // 要排除特定的目錄
            for (const path of ignorePath) {
                if (env.relativePath.startsWith(path)) {
                    return '';
                }
            }

            // 新增錨點
            if (env.frontmatter?.title)
                return md.render(`# ${env.frontmatter.title}`) + html;

            return html;
        }
    }
} as DefaultTheme.Config['search'];
```

除了 `miniSearch` 外， `VitePress` 也提供 `Algolia Search` 當作搜尋核心，
只要把 `provider` 改成 `'algolia'` 然後把設定改成 [Algolia DocSearch](https://docsearch.algolia.com/docs/what-is-docsearch/) 的樣子即可，
由於 Opshell 懶惰，所以使用最不需要做什麼的 `miniSearch` 。
最後像上面 `sidebar` 的方式引入設定。

::: tip
如果有自定義 `_render` ，在呼叫 `md.render` 之前，`env` 不會完全填充，所以上面程式中，對 `env` 的屬性操作(如 `env.frontmatter` )，都放在 `const html = md.render(src, env);` 的後面。
:::

## outline、lastUpdated、notFound
接下來就是設定一些小東西啦~
1. `outline` 是文章中的目錄標題，預設會顯示文章中的 h2，`level` 可以單給數字代表要顯示的 Level，也可以給`Array(陣列)`，第一個數字代表開始層，第二個數字代表結束層，下面範例中代表他會顯示 h2~h4 之間的全部層級，如果要顯示 h2~h6 全部，則可以直接輸入 `level: 'deep'`。
::: tip
`outline` 是文章目錄功能，而 h1 是文章標題，所以 `outline` 不會顯示 h1 喔，設定也不會顯示。
:::
2. `lastUpdated` 文章最後修改的時間，會顯示在文章的最後面，要提交 `.md` 之後才會有喔，可以在 `.md` 的 `frontmatter` 中為個別文章設定該選項，例：`lastUpdated: false`。
3. `notFound` 設定 page not Found 頁面的文字，當然你也可以透過擴展預設主題來客製一個屬於自己的 page not found 頁面，後面會提到。

```ts [config.mts]
export default defineConfig({
    themeConfig: {
        outline: {
            level: [2, 4],
            label: '目錄：'
        },

        lastUpdated: {
            text: 'Last Updated at',
            formatOptions: {
                dateStyle: 'medium',
                timeStyle: 'medium'
            }
        },
        notFound: { // 404
            title: 'Page Not Found ~!!',
            quote: '請檢查網址或目前頁面不開放觀看，使用下方按鈕回到首頁。',
            linkText: '回到首頁'
        }
    }
});
```
## 小結
基本設定到這邊就結束啦，如果想了解更多，推薦去看看[官方的文件](https://vitepress.dev/reference/default-theme-config)，`vue` 官方在做文件真的沒在開玩笑的，真的好。
