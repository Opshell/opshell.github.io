---
title: Day11 - stylelint
author: Opshell
createdAt: '2024-09-12'
categories:
  - vitepress-thirty-days
tags:
  - 鐵人賽
  - VitePress
  - env
  - VS Code
editLink: true
isPublished: true
image: ''
description: ''
keywords: ''
---
![banner11](https://ithelp.ithome.com.tw/upload/images/20240912/20109918fuJ6gJH494.png)

昨天千辛萬苦 ~~(只有我)~~ 的把 `ESLiint` 處理好了，
但是 `ESLint` 有個問題，他沒在管 style 的 ~~(所以我才會有機會受到 `Prettier` 的荼毒)~~
所以我們今天來幫 style 找個小精靈吧~

## 安裝 stylelint
```sh
yarn add stylelint stylelint-config-standard-scss stylelint-config-standard-vue stylelint-order postcss postcss-html postcss-scss -D
```

裝完會出現這些：
```json
{
  "postcss": "^8.4.41",
  "postcss-html": "^1.7.0",
  "postcss-scss": "^4.0.9",
  "stylelint": "^16.8.1",
  "stylelint-config-standard-scss": "^13.1.0",
  "stylelint-config-standard-vue": "^1.0.0",
  "stylelint-order": "^6.0.4",
}
```
沒錯看到安裝的程式碼，我們今天就是要來用 `stylelint` 啦，
為什麼是 `stylelint` 呢?
1. 超過 170 條規則來檢查 CSS 語法，並自動修復大部分格式問題。
2. `unopinionated(非强制约束)`，可以根據需求自訂規則約束力度。
3. 可以處理 CSS 預處理器 等類似 CSS 的語法。
4. 可以看懂 HTML、Markdown 和 CSS-in-JS 等內嵌 CSS。

那裝上面一堆有的沒的是做什麼的?
1. `postcss` 系列，由於 `stylelint` 會需要動 CSS 程式碼，所以要依賴一下。
2. `stylelint-config-standard-scss` 讓 `stylelint` 更好的檢查 `SCSS` 。
3. `stylelint-config-standard-vue` 讓 `stylelint` 可以檢查 `vue SFC` 的 `<style>` 區塊 。
4. `stylelint-order` 依照你的規則，排序 CSS 屬性，含自動修復排序功能。

## 設定 stylelint 規則
在根目錄下面新增兩個檔案 `.stylelintrc.mjs`、`.stylelintignore`

::: code-group
  ```js [.stylelintrc.mjs]
  /** @type {import('stylelint').Config} */
  export default {
      extends: [
          'stylelint-config-standard-scss',
          'stylelint-config-standard-vue/scss'
      ],
      plugins: [
          'stylelint-order'
      ],
      rules: {
          'order/order': [
              'custom-properties',
              'declarations'
          ],
          'order/properties-order': [ // 可自訂，請參考 order/properties-order 排序
          ],
          'at-rule-no-unknown': null, // 允許未知的 at 規則。
          'rule-empty-line-before': null, // 規則之前必須始終有一個空行。
          'block-no-empty': true, // 不允許空塊。
          'comment-no-empty': true, // 不允許空註解。
          'length-zero-no-unit': true, // 不允許使用零長度的單位（可自動修復）。
          'declaration-block-single-line-max-declarations': 1, // 單行 CSS block 的最參數數量。
          'at-rule-empty-line-before': 'never', // at(@) 規則之前必須始終有一個空行。
          // 'selector-class-pattern': '^[a-z][a-zA-Z0-9]+$', // 類選擇器的命名模式。
          'selector-class-pattern': null, // 類選擇器的命名模式。
          'property-no-vendor-prefix': null, // 禁止屬性的供應商前綴。
          'value-no-vendor-prefix': null, // 禁止值的供應商前綴。
          'selector-attribute-quotes': 'never', // 不用給屬性選擇器的引號。
          'declaration-empty-line-before': 'never', // 在屬性之前不允許空行。
          'color-function-notation': null, // 不限制色彩函數的表示法。
          'scss/at-mixin-argumentless-call-parentheses': 'always', // 在 mixin 調用時，要求省略空參數的括號。
          'scss/at-mixin-pattern': null, // mixin 的命名模式。
          'scss/dollar-variable-pattern': null, // 變數的命名模式。
          'scss/percent-placeholder-pattern': null, // 繼承型變數的命名模式。
          'value-keyword-case': null, // 屬性值的大小寫。
          'no-descending-specificity': null // 低權重選擇器無法宣告在高權重選擇器之後。(檢測邏輯不夠完善 不開啟)
      },
      overrides: [
          {
              files: ['*.vue', '**/*.vue']
          }
      ],
      ignoreFiles: ['**/*.js', '**/*.jsx', '**/*.tsx', '**/*.ts', '**/*.json', 'node_modules/', 'docs/.vitrepress/cache/', 'docs/.vitrepress/dist/']
  };
  ```

  ``` [.stylelintignore]
  /node_modules/**
  /docs/public/**
  /docs/.vitepress/cache/**
  /docs/.vitepress/dist/**
  ```

  ```js [order/properties-order 排序]
  {
    'order/properties-order': [
          'content',
          // 定位與形式
          'position', 'inset', 'top', 'right', 'bottom', 'left',
          'grid-area',
          'flex-grow', 'flex-shrink',
          'display',
          'flex', 'flex-direction', 'flex-wrap', 'flex-flow', 'flex-basis', 'order',
          'grid', 'grid-template', 'grid-template-areas', 'grid-template-columns', 'grid-template-rows', 'grid-row', 'grid-row-start', 'grid-row-end', 'grid-column', 'grid-column-start', 'grid-column-end', 'grid-auto-rows', 'grid-auto-columns', 'grid-auto-flow', 'grid-gap', 'grid-row-gap', 'grid-column-gap',
          'gap', 'row-gap', 'column-gap',
          'align-content', 'align-items', 'align-self',
          'justify-content', 'justify-items', 'justify-self',
          'float',
          'clear',
          // 盒模型
          'background', 'background-color', 'background-image', 'background-repeat', 'background-position', 'background-size', 'background-attachment', 'background-clip', 'background-origin', 'background-blend-mode', 'backdrop-filter',
          'clip',
          'clip-path',
          'width', 'min-width', 'max-width',
          'height', 'min-height', 'max-height',
          'padding', 'padding-top', 'padding-left', 'padding-right', 'padding-bottom',
          'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-width', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-style', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style', 'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
          'box-sizing',
          'outline', 'outline-width', 'outline-style', 'outline-color', 'outline-offset',
          'margin', 'margin-top', 'margin-left', 'margin-right', 'margin-bottom',
          'box-shadow',
          'drop-shadow',
          // 文字
          'color',
          'font', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant', 'font-size-adjust', 'font-stretch', 'font-effect', 'font-emphasize', 'font-emphasize-position', 'font-emphasize-style', 'font-smooth',
          'line-height',
          'letter-spacing',
          'word-spacing',
          'white-space',
          'text-align', 'text-align-last', 'text-transform', 'text-decoration', 'text-emphasis', 'text-emphasis-color', 'text-emphasis-style', 'text-emphasis-position', 'text-indent', 'text-justify', 'text-outline', 'text-wrap', 'text-overflow', 'text-overflow-ellipsis', 'text-overflow-mode', 'text-orientation', 'text-shadow',
          'vertical-align',
          'word-wrap', 'word-break',
          'overflow-wrap',
          'tab-size',
          'hyphens',
          'vertical-align',
          // 列表
          'list-style', 'list-style-type', 'list-style-position', 'list-style-image',
          'pointer-events',
          'cursor',
          // 特效相關
          'transform', 'transform-origin', 'transform-style', 'transform-box', 'transform-origin-x', 'transform-origin-y', 'transform-origin-z',
          'transition', 'transition-delay', 'transition-timing-function', 'transition-duration', 'transition-property',
          'animation', 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state',
          'visibility',
          'overflow', 'overflow-x', 'overflow-y', 'overflow-scrolling',
          'filter',
          'opacity',
          'z-index'
      ],
  }
  ```
:::

## 安裝 VS Code 的 [Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint) 擴充套件
安裝完之後，在 `settings.json` 加入下面的設定：
```json
{
    // Auto fix
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": "explicit",
        "source.fixAll.stylelint": "explicit", // [!code ++]
        "source.organizeImports": "never"
    },

    "stylelint.config": null, // 使用 stylelint 的設定檔  // [!code ++]
    "stylelint.enable": true, // 啟用 stylelint  // [!code ++]
    "stylelint.validate": [  // [!code ++]
        "postcss",  // [!code ++]
        "css",  // [!code ++]
        "scss",  // [!code ++]
        "vue",  // [!code ++]
        "html",  // [!code ++]
  ],  // [!code ++]
}
```

最後重啟專案就完成啦~

## 小結
當然設定 `stylelint` 的過程也是充滿了問題，<br />
和 `ESLlint` 不太一樣，這邊主要是 套件要安裝那些各種混亂，<br />
最多的時候裝了 14 個相依套件 = =，而且還是失敗的狀態，<br />
甚至還有說 `stylelint` 對 `vue` 的支援有問題，要退大版本才可以......<br />
一度差點放棄，最後搞半天才有了現在的成果，
在這邊特別感謝 [Claire 大大的文章](https://clairechang.tw/2023/08/04/nuxt3/nuxt-v3-stylelint/) ，讓我脫離農場文陷阱。
真的要多嘗試，不要太相信一些農場文的唬爛= =。
