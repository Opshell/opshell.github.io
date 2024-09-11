---
title:  'Day18 - custom markdown css'
author: 'Opshell'
createdAt: '2024/09/17'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: false
---

隨著我們使用 `.md` 越來越多，然後剛好 Opshell 又是一個龜毛的人，會想調整很多細節部份的樣式，但是 markdown 渲染出來的 html dom 沒辦法自訂 `class` 阿 ，該怎麼辦呢~? 我們需要擴充 markdown 的解析器。

::: tip markdown-it
`VitePress` 使用 [markdown-it](https://github.com/markdown-it/markdown-it) 做為解析器， `VitePress` 很多的 `.md` 的擴展功能都是透過自訂套件實現的，可以在 `config` 中設定 `markdown` 選項來調整外掛的行為或添加更多的套件。
:::

## 安裝 markdown-it-attrs
符合我們需求的外掛蠻多的，我們選擇[@marked-it/markdown-it-attrs](https://www.npmjs.com/package/@marked-it/markdown-it-attrs)來使用，因為他除了可以自訂 class 以外，還可以控制其他的 attr 在實用度和需求覆蓋度上面都有更好的發展空間。
```sh
yarn add @marked-it/markdown-it-attrs -D
```

https://github.com/vuejs/vitepress/blob/main/src/node/markdown/markdown.ts

[markdown-it-task-lists](https://www.npmjs.com/package/@hackmd/markdown-it-task-lists)

https://github.com/markdown-it/markdown-it-abbr
https://www.npmjs.com/package/markdown-it-deflist
https://www.npmjs.com/package/markdown-it-ins

https://www.npmjs.com/package/markdown-it-treelist

## 使用

MarkDown 超集 碼農的愛

https://typora.io/

4. 調整 md css

https://github.com/takumisoft68/vscode-markdown-table

https://www.npmjs.com/package/@marked-it/markdown-it-attrs

https://www.npmjs.com/package/markdown-it-label
