---
title:  'Day05 - 基本設定 Part1'
author: 'Opshell'
createdAt: '2024/09/06'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - vitepress
editLink: true
isPublished: true
---

![banner05](https://ithelp.ithome.com.tw/upload/images/20240906/2010991860UjaFgbno.png)

改完首頁樣式之後，就會開始想把 `header` 調整成自己想要的樣子了，
看了 [官方文件](https://vitepress.dev/zh/reference/default-theme-nav) 就會知道，
如果我們要調整 `header` 的內容，我們需要打開 `docs/.vitepress/config.mts` (之後都簡稱 `config` ) 這支檔案，

::: code-group
```ts [config.mts]
import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'Opsehell\'s Blog',
    description: 'Opsehll\'s work and life records',
    themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Examples', link: '/markdown-examples' }
        ],

        sidebar: [
            {
                text: 'Examples',
                items: [
                    { text: 'Markdown Examples', link: '/markdown-examples' },
                    { text: 'Runtime API Examples', link: '/api-examples' }
                ]
            }
        ],

        socialLinks: [
            { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
        ]
    }
});
```
:::

我們今天主要要設定的是 `themeConfig` 的部分，下面的程式區塊會聚焦在這裡。

## Nav標題 與 Logo
先來添加預設頁面標題和 Logo 吧：
```ts
export default defineConfig({
    themeConfig: {
        siteTitle: 'Opshell\'s Blog',
        logo: {
            light: '/logo.jpg',
            dark: '/logo-w.jpg',
            alt: 'Opshell Logo'
        }
    }
});
```
Logo 旁邊的網站標題文字，預設是從 `config.title` 抓取，也就是上面 `defineConfig` 裡的 `title`，
如果想要使用其他的文字，可以設定在 `siteTitle`，如果不想顯示任何文字，則可以把 `siteTitle` 設定為 `false` 。

自帶黑夜模式是 `vitepress` 的其中一個加分項，
而黑與白模式的 Logo 可以分別設定，當然 你可以像下面這樣設定同一個：
```ts
export default defineConfig({
    themeConfig: {
        logo: '/logo.jpg'
    }
});
```

## rewrites (路由重寫)
要開始設定文章連結前，Ops 想到，預設的 `md` 存放位置是 `/docs/` ，目前我們有的文章數量不多所以沒差，
但是當文章數量越來越多且專案越玩越花的時候，我們是必須要使用多層資料夾做管理，
於是新建了一個資料夾專門放 `md` 命名為 `pages` ，各位可以自行決定名稱 `view`、`markdown`、`article` 也都可以，只要自己習慣就好。

然後在 `congfig` 裡加入這個設定：
```ts
export default defineConfig({
    rewrites: {
        'pages/(.*)': '(.*)'
    }
});
```
::: tip
`rewrites` 這個設定是寫在 `defineConfig({})` 下面，而不是在`themeConfig`裡面喔。
:::
這樣的話， `vitepress` 會把就會知道 `/pages/about-opshell.md` 改寫成 `/about-opshell` 來做生成，這樣的情況下在之後有需要連結到地方也記得要把 `/pages` 拿掉喔~。
關於 `rewrites` 屬性還有更多複雜的用法可以用，例如動態路由，Opshell 這邊沒用到，就不展開來講了，有需要的看官請參考[官方文件-路由重寫](https://vitepress.dev/zh/guide/routing#route-rewrites)。

目前目錄結構差不多長這樣(只要沒有副檔名，就是目錄)：
```sh
.
├─ docs
│  ├─ .vitepress
│  │  ├─ theme
│  │  │  ├─ index.ts
│  │  │  └─ style.css
│  │  └─ config.mts
│  └─ pages
│     ├─ article
│     │  ├─ code-sea
│     │  │  ├─ typescript
│     │  │  └─ vitepress
│     │  └─ life-murmurs
│     ├─ index.md
│     └─ about-opshell.md
├─ node_modules
└─ package.json
```
也就是說，如果我要連一個站內連結，會從原先的 `/pages/about-opshell` 寫成 `/about-opshell` 喔。

## nav (選單)
加入 About Ops 和 相關的目錄文章連結吧~
```ts
export default defineConfig({
    themeConfig: {
        nav: [
            {
                text: '✨️ Vitepress Thirty Day',
                link: '/vitepress-thirty-day'
            },
            {
                text: 'Article',
                items: [
                    {
                        text: 'Life\'s Mumurs',
                        link: '/article/life-mumurs/life'
                    },
                    {
                        text: 'Code Sea',
                        items: [
                            {
                                text: 'typescript',
                                link: '/article/code-sea/typescript/day-1'
                            },
                            {
                                text: 'vitepress',
                                link: '/article/code-sea/vitepress/day-1'
                            }
                        ]
                    }
                ]
            }
        ]
    }
});
```
::: tip
記得要建立目錄和檔案。
:::

About Ops 是連結，如果帶的是 `items as NavItem[]` 則會變成下拉選單，再繼續包的話則會變成下拉選單裡面有群組，
而 `NavItem` 這個型別是這樣定義的：
```ts
type NavItem = NavItemWithLink | NavItemWithChildren;

interface NavItemWithLink {
  text: string
  link: string
  activeMatch?: string
  target?: string
  rel?: string
  noIcon?: boolean
}

interface NavItemChildren {
  text?: string
  items: NavItemWithLink[]
}

interface NavItemWithChildren {
  text?: string
  items: (NavItemChildren | NavItemWithLink)[]
  activeMatch?: string
}
```
也就是說，`items` 和 `link` 兩個屬性只能擇一，要馬是連結，要馬是群組。
可以到 [官方文件](https://vitepress.dev/zh/reference/default-theme-nav) 看更多 nav 設定的用法。

今天就先到這邊吧，感謝各位的觀看，各位晚安。
