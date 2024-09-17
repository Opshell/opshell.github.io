---
title:  'Day18 - basic markdown'
author: 'Opshell'
createdAt: '2024/09/17'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: false
---

本篇文章請至[](https://opshell.github.io/article/code-sea/vitepress/2024鐵人賽/day18-basic-markdown)服用才能有完整的學習體驗。

## container
當初會選 `VitePress` 的原因就是他對 `.md` 的擴充非常的讚，`VitePress` 使用 [markdown-it](https://github.com/markdown-it/markdown-it) 做為解析器， `VitePress` 很多的 `.md` 的擴展功能都是透過自訂套件實現的，可以在 `config` 中設定 `markdown` 選項來調整外掛的行為或添加更多的套件。

詳細設定可以參考[官方Git](https://github.com/vuejs/vitepress/blob/main/src/node/markdown/markdown.ts)，今天我們就來設定一下我們需要的吧：
```ts
export default defineConfig({
    markdown: {
        theme: 'one-dark-pro',
        lineNumbers: true,
        container: {
            infoLabel: '細節：',
            tipLabel: '💡 錦囊 [Tips]：',
            warningLabel: '⚡ 注意 [Warning]：',
            dangerLabel: '⛔ 錯誤 [Error]：',
            detailsLabel: '詳細資料 [Details]：'
        }
    }
});
```

### 什麼是 container
除了設定[shiki的主題樣式](https://shiki.style/languages)，開啟程式區塊的行號以外，還調整了 container 的預設標題，什麼是 container ?

#### Input：
````md
::: tip
 這就是 container
:::
````
#### Output：
::: tip
 這就是 container
:::

### 自訂標題
而 container 有上面五種，除了樣式不一樣，行為也是有些差異，詳細的表現可以到[這邊](/markdown-theme-preview)看看喔~
前面也說了，設定只是預設標題，意思就是說我們可以自訂標題：

#### Input：
````md
::: tip 自訂標題
 這就是 container
:::
````
#### Output：
::: tip 自訂標題
 這就是 container
:::

### 調整外觀
我們的 `docs/.vitepress/theme/scss/_vitepress.scss` 專門拿來蓋 `VitePress` 的預設樣式的，所以我們在裡面新增：
```scss
.custom-block {
    &.info { // 資訊框
        background-color: var(--vp-c-indigo-soft);
        border: 1px solid var(--vp-c-indigo-3);
    }
    &.tip { // 提示框
        border-left: 3px solid var(--vp-c-brand-3);
    }
    &.warning { // 警告框
        border: 1px solid var(--vp-c-yellow-3);
    }
    &.danger { // 危險框
        border-right: 3px solid var(--vp-c-danger-3);
        border-left: 3px solid var(--vp-c-danger-3);
    }
    &.details {

    }
}
```

## markdown-it-attrs
隨著我們使用 `.md` 越來越多，然後剛好 Opshell 又是一個龜毛的人，會想調整很多細節部份的樣式，但是 markdown 渲染出來的 html dom 沒辦法自訂 `class` 阿 ，該怎麼辦呢~?

### 設定
在 `VitePress` 中，有幫我們整合了 `markdown-it-attrs` 我們設定一下就可以用囉

```ts
export default defineConfig({
    markdown: {
        theme: 'one-dark-pro',
        lineNumbers: true,
        container: {
            infoLabel: '細節：',
            tipLabel: '💡 錦囊 [Tips]：',
            warningLabel: '⚡ 注意 [Warning]：',
            dangerLabel: '⛔ 錯誤 [Error]：',
            detailsLabel: '詳細資料 [Details]：'
        },
        attrs: { // [!code ++]
            leftDelimiter: '{', // [!code ++]
            rightDelimiter: '}', // [!code ++]
            allowedAttributes: [] // empty array = all attributes are allowed  // [!code ++]
        } // [!code ++]
    }
});
```

### 使用
#### Input
````md
自訂 class 和其他 attr {.red data-test="custom"}
````

#### Output
自訂 class 和其他 attr {.red data-test="custom"}
> ↑↑↑ 請對我按右鍵檢查屬性 ↑↑↑

甚至可以這樣
#### Input
````md
自訂 `error`{.error} 和其他 `attr`{.fix}
````
#### Output
自訂 `error`{.error} 和其他 `attr`{.fix}
> ↑↑↑ 請對我按右鍵檢查屬性 ↑↑↑

