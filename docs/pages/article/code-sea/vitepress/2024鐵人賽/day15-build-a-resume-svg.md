---
title: Day15 - build a resume svg
author: Opshell
createdAt: '2024-09-16'
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
---
![banner15](https://ithelp.ithome.com.tw/upload/images/20240916/20109918zbY4sUxND9.png)

[版面參考](https://opshell.github.io/resume-layout.html)
今天就來處理大頭照下面的 skill 和 contact 區域吧~，可以發現兩個區域其實有滿多 svg icon 的，
而 Opshell 最喜歡使用 sprite 的方式處理 svg ，好處是程式碼很乾淨整齊，找東西和維護很方便：

::: 小知識
 所謂的 svg sprite 其實就像比較早以前的 image sprite 是一樣的邏輯，都是把很多張圖拼起來，然後透過定位來顯示要用的圖片。比較不同的事實踐的方式，svg sprite 是透過把每一個 icon 的"路徑"用 `<symbol>` 標籤包起來並賦與他 `id` 要使用時只要在 svg 的 `xlink:href` 呼叫這個 id 就可以囉。
:::

## SVG Sprtie

### 1. 安裝
當然我們可以手動的把自己要得 svg 加進 sprite 包裡面，但是這樣每次新增修改都有夠麻煩，一個好的工程師必須要有的素養就是想辦法自動化 ~~(偷懶~~，所以我們找 `vite-plugin-svg-icons` 幫我們把散落的svg 打包起來。
```sh
 yarn add vite-plugin-svg-icons -D
```

### 2. 設定
到 `config` 中設定一下，設定他要打包哪邊的 svg，包起來的格式及怎麼加入 body 讓我們引用。
最後再把喜歡的 svg 檔案放進 `docs/public/icons/` 裡面。
```ts
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';

export default defineConfig({
    vite: {
        plugins: [
            createSvgIconsPlugin({
                iconDirs: [path.resolve(__dirname, '../', 'public/icons')], // 指定存放 svg 原始檔案的目錄
                symbolId: '[name]', // 指定symbolId格式 預設：'icon-[dir]-[name]
                inject: 'body-last', // | 'body-first' sprite插入位置
                customDomId: '__svg__icons__dom__' // 自訂 Dom ID
            })
        ]
    }
});
```

### 3. 引用
在 `docs/.vitepress/theme/index.ts` 中啟動他的功能。
```ts
// [-]Svg Icon引用
import 'virtual:svg-icons-register';
```

### 4. 功能封裝
在 `docs/components/el/` 中新增 元件 `svgIcon.vue` ：
```vue
<script setup lang="ts">
    defineProps({
        name: { type: String, required: true, default: 'circle' }
    });
</script>

<template>
    <div class="icon">
        <svg class="svg">
            <use :xlink:href="`#${name}`" />
        </svg>
    </div>
</template>

<style lang="scss">
    .icon {
        position: relative;
        @include setFlex();
        @include setSize(32px, 32px);
        padding: 2px;
        fill: var(--vp-c-brand-1);
        transition: 0.2s $cubic-FiSo;
        .svg {
            @include setFlex();
            @include setSize(100%, 100%);
        }
    }
</style>
```

## 實際使用
這樣就可以像這樣子的使用啦：
```vue
<OrgaSectionBlock title="Contact">
    <ul class="contact-box">
        <li v-for="contact in contactList" :key="`contact-${contact.text}`" class="contact">
            <ElSvgIcon :name="contact.icon" />
            <a :href="contact.href" target="_blank" rel="noopener noreferrer">{{ contact.text }}</a>
        </li>
    </ul>
</OrgaSectionBlock>
```

## 小結
很多範例喜歡用 icon font 的方式來做小圖示，的確是簡單方便。
但是有一些缺點：
- 要一次 import 整包字型
- 在一些情況下可能會有鋸齒
- 和設計師使用的圖示不一樣
讓有點強迫症的 Opshell 感到痛苦，為了心靈的祥和，可以隨心所欲的用自己要得 svg 還是蠻重要的。
