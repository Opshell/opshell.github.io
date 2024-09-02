---
title:  'Day07 - dynamic config'
author: 'Opshell'
createdAt: '2024/09/09'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - vitepress
editLink: true
isPublished: false
---

加完了字型和 SCSS 之後 又要繼續在 `config` 加設定啦~~
不過現在的 `themeConfig` 由於要一個個連結設定的原因，
已經是長長長長長的義大利麵的狀態了，
我們先來把會常常改到的幾個設定(`nav`、`sidebar`、`socialLinks`)獨立出來吧

先在 `docs/.vitepress/theme` 目錄下面，建立目錄並命名為 `configs`，然後在把這些設定分別製作成檔案，然後在 `config` 裡面引用：
::: code-group
``` ts [nav.ts]
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

``` ts [sidebar.ts]
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

``` ts [socialLinks.ts]
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

:::
