---
title:  'Day18 - basic markdown'
author: 'Opshell'
createdAt: '2024/09/19'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
  - markdown-it
editLink: true
isPublished: true
---
![banner18](https://ithelp.ithome.com.tw/upload/images/20240919/20109918hOgzIS526M.png)

本篇文章請至[Opshell's Blog](https://opshell.github.io/article/code-sea/vitepress/2024鐵人賽/day18-basic-markdown)服用，已擁有完整的賞文體驗。

當初會選 `VitePress` 的原因就是他對 `.md` 的擴充非常的讚，`VitePress` 使用 [markdown-it](https://github.com/markdown-it/markdown-it) 做為解析器， `VitePress` 很多的 `.md` 的擴展功能都是透過自訂套件實現的，可以在 `config` 中設定 `markdown` 選項來調整外掛的行為或添加更多的套件。

常用設定可以參考[官方文件](https://vitepress.dev/guide/markdown)
詳細設定可以參考[官方Git](https://github.com/vuejs/vitepress/blob/main/src/node/markdown/markdown.ts)

## container
今天我們就來設定一下我們需要的 `Markdown` 功能吧：
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

<div class="in-out-demo-block">

#### Input：{.brand}
````md
::: tip
這就是 container
:::
````
#### Output：{.brand}
::: tip
 這就是 container
:::
</div>

### 自訂標題
而 container 有上面五種，除了樣式不一樣，行為也是有些差異，詳細的表現可以到[這邊](/markdown-theme-preview#custom-containers)看看喔~
前面也說了，設定只是預設標題，意思就是說我們可以自訂標題：

<div class="in-out-demo-block">

#### Input：{.brand}
````md
::: tip 自訂標題
這就是 container
:::
````
#### Output：{.brand}
::: tip 自訂標題
這就是 container
:::
</div>

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
    &.details {}
}
```

## markdown-it-attrs
隨著我們使用 `.md` 越來越多，然後剛好 Opshell 又是一個龜毛的人，會想調整很多細節部份的樣式，但是 `Markdown` 渲染出來的 html dom 沒辦法自訂 `class` 阿 ，該怎麼辦呢~?

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

在 `docs/.vitepress/theme/scss/` 中新增 `_basic.scss` 來當作我們的全域 CSS 設定，記得在 `style.scss` 中引用喔：
::: code-group
```scss [_basic.scss]
// md attr 樣式
.vp-doc {
    .brand { color: var(--vp-c-brand-1) !important; }
    .error { color: var(--vp-c-red-1) !important; }
    .warning { color: var(--vp-c-yellow-1) !important; }
    .success { color: var(--vp-c-green-2) !important; }
}

```

```scss [style.scss]
// 專案主題變數定義
@import 'variable';

// vitepress 預設樣式的覆蓋
@import 'vitepress';

// 自訂全域CSS // [!code ++]
@import 'basic'; // [!code ++]

```
:::

### 使用
<div class="in-out-demo-block">

#### Input：{.brand}
````md
自訂 class 和其他 attr {.error data-test="custom"}
````

#### Output：{.brand}
自訂 class 和其他 attr {.error data-test="custom"}
> ↑↑ 請對我按右鍵檢查屬性
</div>

甚至可以這樣
<div class="in-out-demo-block">

#### Input：{.brand}
````md
該 `Issue`{.error} 已被 `Fix`{.success}
````
#### Output：{.brand}
該 `Issue`{.error} 已被 `Fix`{.success}
> ↑↑ 請對我按右鍵檢查屬性
</div>

## 小結
可以到 it幫看看這篇[文章](https://ithelp.ithome.com.tw/articles/10354109)，稍稍為比較兩邊(it幫 和 VitePress) 一樣的內容，`VitePress` 可以寫的更規範，理論上也會有更好的閱讀體驗 ~~(如果沒有是因為 Opshell 還沒優化好樣式)~~ <br />
套句名言：他還是個孩子~~~

所以 Opshell 才會選擇用 `VitePress` 自己蓋部落格，一切盡在不言中。
