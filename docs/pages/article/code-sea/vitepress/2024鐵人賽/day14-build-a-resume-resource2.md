---
title:  "Day14 - build a resume resource"
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
簡單的說，在 `vitepress` 中 可以使用任何 Vue 的功能，包括`動態模板`、`script` 和 import `Vue Component`。
也就是說，你可以把 `md` 當作比較特別的 `Vue SFC` 使用。

::: tip SSR 相容性
所有的 Vue 用法都需要 相容 SSR，請參考[SSR 兼容性](https://vitepress.dev/zh/guide/ssr-compat)，得到更多資訊和常見問題的解決方案。
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

## resume.vue 切版
::: code-group
```vue [resume.vue]
<script setup lang="ts">

</script>

<template>
    <article class="article-block">
        <div class="left-block" />
        <hr class="divider" />
        <div class="right-block" />
    </article>
</template>

<style lang="scss">

</style>
```
:::

## 大頭照與基本資訊
就從左上切版到右下吧，`left-block` 區塊中加入大頭照區塊，
```html
<header class="header-block">
    <div class="image-box">
        <img src="/images/resume/portrait.png" alt="Opshell 大頭貼" />
    </div>
    <h1 class="name">
        <span class="en">{{ frontmatter.name }}</span>
    </h1>
    <span class="job-title">
        {{ frontmatter.jobTitle }}
    </span>
    <div class="mbti" />
</header>
```
要塞圖片進來，我們就來研究一下 `vitepress` 的兩種資源處理方式吧，

## 引用靜態資源
向前面說的，所有的 `md` 都會變成 `vue` 給 `vite` 處理，所以可以用絕對或相對路徑的方式引用靜態資源(下面為相對路徑在各種情境下的引用方式)：
::: code-group
```md [markdown 引用]
![Opshell-portrait](/images/resume/portrait.png)
```

```vue [vue 引用]
<img src="/images/resume/portrait.png" alt="Opshell 大頭貼" />
```

```css [css 引用]
.mbti {
    background: url('/images/resume/mbti.png') no-repeat 50% 50%;
}
```
:::
而相對路徑引用的出發點是 `docs/` 下面，所以記得在 `docs/` 目錄下面建立一個 `images` 目錄。

所有引用的資源(絕對或相對都是)，都會在 `build` 的時候被複製到 `dist` 目錄中，然後重新命名為 `hash` 格式，沒被使用到的資源則會被忽略。
小於 4kb 的圖片會被轉換成 `base64` 內聯，這個行為可以通過修改 `Vite.build.assetsInlineLimit` 設定來調整。

::: tip 連結引用進來的文件不會被當作資源
在 `md` 中，通過連結引用的 PDF 或其他文件，不會自動被當作是資源，要讓這些文件可以用，必須手動放在 `public` 目錄裡面。
:::

## public 目錄
有時可能需要一些靜態資源，但這些資源沒有直接被 `md` 或 `Vue` 直接引用，或想以原始檔名提供文件，像 `robots.txt`，`favicons` 和 `PWA icon` 等。

可以將這些文件放置在源目錄的 `public` 目錄中。例如，如果項目根目錄是 `./docs`，並且使用默認源目錄位置，那麼 `public` 目錄將是 `./docs/public`。

放置在 `public` 中的資源將按原樣複製到輸出目錄的根目錄中。

::: tip 注意
應使用 `根絕對路徑` 來引用放置在 `public` 中的文件——例如，`public/icon.png` 會是這樣引用 `/icon.png`。
也就是說 Opshell 上面的範例，也可以是放在 `docs/public/images` 中，區別在於打包輸出的方式。
而 Opshell 統一都放在 `public` 裡，打算找個時間來研究一下，兩中輸出方式主要的差異在哪。
:::

## Base(根) Url
在前面的[Day09 - 部署到 Github Page]()有提過，如果專案沒有部署在 `Base url` 上面的時候，會需要在 `config` 中設定 `base` 選項，

### 1. 靜態資源引用
這個情況下，所有的靜態資源 `build` 時會自動修正路徑來契合 `base` 選項，例：如果 `md` 中有一個對 `public` 中的資源的引用
```md
![Opshell-portrait](/images/resume/portrait.png)
```
上面的情況下，調整 `base` 值不用調整路徑。

### 2. 動態資源引用
如果是一個 `Vue Component` ，動態的引用資源：
```vue
<img :src="theme.logoPath" />
```

這種情況下， `vitepress` 提供了 `withBase` 來 handle 路徑， `withBase` 會把 `base` 的值追加在資源的 url 中：
```vue
<script setup>
    import { useData, withBase } from 'vitepress';

    const { theme } = useData();
</script>

<template>
    <img :src="withBase(theme.logoPath)" />
</template>
```

## 小結
今天學資源引用，感覺 `vitepress` 各種使用情境都注意到了，和平常的 `vue vite` 專案使用上也沒什麼差異，真的是個狠容易上手的部落格框架。
