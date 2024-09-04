---
title:  "Day14 - Build a Resume"
author: 'Opshell'
createdAt: '2024/09/15'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - vitepress
editLink: true
isPublished: false
---

## 在 Markdown 中使用 Vue

今天來用個人履歷來嘗試 `vitepress` 的功能，先用 `Figma` 大概拉個畫面，然後就來開工吧~
實際的[完工畫面](https://opshell.github.io/resume-layout.html)可以來這裡看看。
我們一開始先從最熟悉的功能往外擴展， `vitepress` 的 `Markdown` 可以把 `.vue` 檔塞進來用，我們就從這邊開始吧。
首先在 `docs/pages/` 下面建立一個 `resume-vue.md` 的檔案，`docs/components/template/` 下建立 `resume.vue`，然後在 `nav.ts` 中加入 `resume-vue` 的連結：

::: code-group
```md [resume-vue.md]
---
title: Opshell's Resume
author: 'Opshell'
layout: page
---

<script setup lang="ts">
    import TemplateResume from '@components/template/resume.vue';
</script>

<TemplateResume />
```
:::

是的，要在 `vitepress` 的 `Markdown` 中使用 Vue 就是這麼簡單，因為在 `vitepress` 中，每個 `Markdown` 都會被編譯成 `HTML` 然後當作 `Vue SFC` 處理。
簡單的說，在 `vitepress` 中 可以使用任何 Vue 的功能，包括`動態模板`、<script> 和 import `Vue Component`。

::: tip SSR
https://vitepress.dev/zh/guide/using-vue
:::

## Markdown 中 auto import component
咦奇怪? 不是昨天才說可以自動 import `component` 了嗎? 為什麼這邊不加 import 的 script 會沒東西呢?
爬了一下文件，原來少了這行參數：
```ts
import Components from 'unplugin-vue-components/vite';

export default defineConfig({
    vite: {
        plugins: [
            Components({
                dirs: ['./components'], // 指定components位置 預設是'src/components'
                dts: './types/components.d.ts', // .d.ts生成位置
                extensions: ['vue'],
                include: [/\.vue$/, /\.vue\?vue/, /\.md$/], // allow auto import and register components used in markdown // [!code ++]
                directoryAsNamespace: true, // 允許子目錄作為命名空間
                resolvers: [] // 解析規則
            })
        ]
    }
});
```
`include` 是在決定，auto import 的 `component` 可以用在哪，加入了 `/\.md$/` 後就可以不用宣告囉~

::: code-group
```vue [resume.vue]
<script setup lang="ts">

</script>

<template>
    <article class="article-block">
        <div class="left-block"></div>
        <hr class="divider" />
        <div class="right-block"></div>
    </article>
</template>

<style lang="scss">

</style>
```
:::

img import

public image

svg

svg sprite
