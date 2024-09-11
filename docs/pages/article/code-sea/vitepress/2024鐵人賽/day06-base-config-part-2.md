---
title:  'Day06 - config sidebar、socialLinks、footer'
author: 'Opshell'
createdAt: '2024/09/07'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: true
---

![banner06](https://ithelp.ithome.com.tw/upload/images/20240907/20109918fStmRTe47h.png)

沒想到簡單的 `config` 設定可以寫到兩天，
接續昨天的 nav 之後，今天就從 sidebar 開始吧。

## sidebar (側邊欄)
這邊是進入文章頁面的時候，側邊要顯示其他文章連結，主要是下面兩種用法：

### 1. 基本用法：
最簡單的形式就是傳入一組 `array(陣列)`，用法跟上面的 nav 非常的接近，有幾個要注意的地方：
- `link` 需要要指定 `/` 開頭的實體檔案路徑，如果是 `/` 結尾的話，則會指向結尾目錄下 `index.md`。
- 最多只能套嵌 6 層，超過將被程式忽略自然就不會顯示在側邊欄了。
```ts [基本用法]
export default defineConfig({
    themeConfig: {
        sidebar: [
            {
                text: 'Code sea',
                items: [
                    {
                        text: 'Typescript',
                        items: [
                            { text: '1. 前言', link: '/article/code-sea/typescript/day-1' },
                            { text: 'Enum & 使用情境', link: '/article/code-sea/typescript/enum' }
                        ]
                    },
                    {
                        text: 'Vitepress',
                        items: [
                            { text: '1. 前言', link: '/article/code-sea/vitepress/day01-preface' },
                            { text: '2. 環境準備 向右看齊~', link: '/article/code-sea/vitepress/day02-front-end-developement' }
                        ]
                    }
                ]
            },
            {
                text: 'Life Mumurs',
                items: [
                    { text: 'Life is it', link: '/article/life-mumurs/life' }
                ]
            }
        ]
    }
});
```

### 2. 分組型-多側邊欄：
當我們的文章數量多了起來，比如放了2022年鐵人賽30篇，2024年鐵人賽30篇，加個10篇雜記，整整70篇文章，在側邊欄的使用體驗就會變差，
當然我們可以開兩個資料夾，typescript、vitepress 來做區分，但是當主題增加了資料夾越來越多，還是會混亂起來。
Opshell 希望看官可以專注在某個主題，能不能讓側邊欄專注某個主題就好呢?

這時候就要用到我們第二種設定方式 `分組型-多側邊欄` 啦：
```ts [分組型-多側邊欄]
export default defineConfig({
    themeConfig: {
        sidebar: {
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
                        { text: '2. Why is Vitepress', link: '/article/code-sea/vitepress/day-2' },
                        { text: '3. Home from init', link: '/article/code-sea/vitepress/day-3' },
                        { text: '4. Stylelint', link: '/article/code-sea/vitepress/day-4' }
                    ]
                }
            ],
            '/article/life-mumurs/': [
                {
                    text: 'Life Mumurs',
                    items: [
                        { text: 'Life is it', link: '/article/life-mumurs/life' }
                    ]
                }
            ]
        }
    }
});
```

sidebar 會從  `SidebarItem[]` 變成 `SidebarMulti`(物件)
```ts
export type Sidebar = SidebarItem[] | SidebarMulti

export interface SidebarMulti {
  [path: string]: SidebarItem[]
}

export type SidebarItem = {
  /**
   * 侧边栏项的文本标签
   */
  text?: string

  /**
   * 侧边栏项的链接
   */
  link?: string

  /**
   * 侧边栏项的子项
   */
  items?: SidebarItem[]

  /**
   * 如果未指定，侧边栏组不可折叠
   * 如果为 `true`，则侧边栏组可折叠并且默认折叠
   * 如果为 `false`，则侧边栏组可折叠但默认展开
   */
  collapsed?: boolean
}
```
這樣就會根據不同的 `path` 顯示相應的側邊欄了。
根據上面[官方文件](https://vitepress.dev/zh/reference/default-theme-config#sidebar)所提供得型別及說明，我們可以知道側邊欄目錄是可以摺疊的，只要你有設定 `collapsed` 選項，不管是 `true` 或者是 `false` 都會開啟摺疊功能喔~

## socialLinks (社交區)
在 nav 裡面增加 社交平台的連結：
```ts
export default defineConfig({
    themeConfig: {
        socialLinks: [
            {
                icon: 'github',
                link: 'https://github.com/Opshell',
                ariaLabel: 'opshell\'s github'
            },
            {
                icon: 'instagram',
                link: 'https://www.instagram.com/phenomx9990/',
                ariaLabel: 'opshell\'s instagram'
            },
            {
                icon: {
                    svg: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M22.5217 7.07507V17.0435C16.8406 16.4368 11.1594 15.8281 5.47827 15.2194V5.25913C5.47827 5.25913 5.47827 5.2571 5.4803 5.25507C6.45016 3.07594 9.12436 1.20725 12.7846 0L22.5217 7.07507Z" "/> <path d="M6.45817 25.7509L7.52136 26.8141C6.78889 27.5465 5.77542 28 4.65846 28C2.42252 28 0.609619 26.1871 0.609619 23.9512C0.609619 21.7152 2.42252 19.9023 4.65846 19.9023C5.77643 19.9023 6.78991 20.3558 7.52136 21.0883L6.45817 22.1515C5.99759 21.6909 5.3615 21.4068 4.65846 21.4068C3.25237 21.4068 2.1131 22.5461 2.1131 23.9522C2.1131 25.3583 3.25237 26.4976 4.65846 26.4976C5.3615 26.4976 5.9986 26.2125 6.45817 25.7529V25.7509Z" "/> <path d="M12.7561 22.2154V22.7014C12.2834 22.254 11.6493 21.9841 10.9047 21.9841C9.24296 21.9841 7.89673 23.3304 7.89673 24.9921C7.89673 26.6538 9.24296 28.0001 10.9047 28.0001C11.6483 28.0001 12.2824 27.7302 12.7561 27.2828V27.7688H14.144V22.2154H12.7561ZM10.9047 26.6122C10.0099 26.6122 9.28455 25.8879 9.28455 24.9921C9.28455 24.0963 10.0099 23.372 10.9047 23.372C11.7995 23.372 12.5248 24.0973 12.5248 24.9921C12.5248 25.8869 11.7995 26.6122 10.9047 26.6122Z" "/> <path d="M27.3333 25.5704C27.3718 25.3857 27.3911 25.1909 27.3911 24.9921C27.3911 23.3304 26.1879 21.9841 24.3253 21.9841C22.4627 21.9841 21.2595 23.3304 21.2595 24.9921C21.2595 26.6538 22.6331 28.0001 24.3253 28.0001C25.4281 28.0001 26.4121 27.6754 27.0594 27.0312L26.121 26.0928C25.7608 26.4773 25.1602 26.6975 24.3253 26.6975C23.4904 26.6975 22.9416 26.2278 22.7539 25.5693H27.3333V25.5704ZM24.3253 23.2857C25.1826 23.2857 25.7091 23.7564 25.8968 24.4138H22.7549C22.9426 23.7564 23.4701 23.2857 24.3263 23.2857H24.3253Z" "/> <path d="M21.3032 27.7687H19.3492L16.9205 25.34V27.7687H15.5327V19.9054C15.9953 19.9551 16.4579 20.0038 16.9205 20.0535V24.4148L19.12 22.2154H21.0739L18.4118 24.8774L21.3032 27.7687Z" "/> </svg>'
                },
                link: 'https://www.cakeresume.com/me/Opshell',
                ariaLabel: 'opshell\'s cakeresume'
            }
        ]
    }
});
```

預設可以使用常用的社群平台如 `facebook`、`instagram`，沒有在上面也可以自行添加 svg。
`ariaLabel` 則是無障礙的自訂標籤
```ts
interface SocialLink {
  icon: SocialLinkIcon
  link: string
  ariaLabel?: string
}

type SocialLinkIcon =
  | 'discord'
  | 'facebook'
  | 'github'
  | 'instagram'
  | 'linkedin'
  | 'mastodon'
  | 'npm'
  | 'slack'
  | 'twitter'
  | 'x'
  | 'youtube'
  | { svg: string }
```

## footer 頁尾
```ts
export default defineConfig({
    themeConfig: {
        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2024-present Opshell'
        }
    }
});
```
`message` 和 `copyright` 也都支援塞 `html` 進去，如果各位看官有看[官方文件](https://vitepress.dev/zh/reference/default-theme-footer)，會注意到有個警告，

說因為是渲染成 `<p>` tag 所以只接受放 `inline(行內元素)` ， 不過其實 `<p>` tag 是 `block(區塊元素)` 所以你要在裡面塞 `block(區塊元素)` 玩得很花，也是可以的喔!

::: tip
當有啟用 sidebar 的頁面，由於模板設計的問題， footer 不會顯示喔~
:::

---
今天就到這邊啦~
新增側邊欄是一件很流水線的事...
大家晚安~
