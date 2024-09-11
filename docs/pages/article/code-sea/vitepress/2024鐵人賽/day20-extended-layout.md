---
title:  'Day20 - Extended Layout & useData'
author: 'Opshell'
createdAt: '2024/09/20'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: false
---

`VitePress` 除了提供自訂 `layout` 以外，也提供對預設 `layout` 的擴充，今天我們就來擴充預設的 `layout` 吧。

## 新增 Expand Layout Component
我們一樣在 `docs/.vitepress/theme/layout` 裡面添加 `expandLayout.vue`：
```vue
<script setup lang="ts">
    import DefaultTheme from 'vitepress/theme';
    import { useData } from 'vitepress';

    const { Layout } = DefaultTheme;

    const { frontmatter, page } = useData();

    const lastUpdated = computed(() => {
        // 把 page.value.lastUpdated 從時間戳轉換成 西元年月日
        const timestamp = page.value.lastUpdated as number;

        return `${timestamp > 0 ? new Date(timestamp).toLocaleDateString() : ''}`;
    });
</script>
```

## useData
都已經講到了擴充預設 `layout` 了，我們就來說說 `useData` 吧，`VitePress` 提供了一些全域範圍的輔助函數其中就包刮了 `useData` ，用來方便在 `Vue Component` 或者 `.md` 裡面使用，快速取得資料。

`useData` 的類型長這樣：
```ts
interface VitePressData<T = any> {
  /**
   * 站点级元数据
   */
  site: Ref<SiteData<T>>
  /**
   * .vitepress/config.js 中的 themeConfig
   */
  theme: Ref<T>
  /**
   * 页面级元数据
   */
  page: Ref<PageData>
  /**
   * 页面 frontmatter
   */
  frontmatter: Ref<PageData['frontmatter']>
  /**
   * 动态路由参数
   */
  params: Ref<PageData['params']>
  title: Ref<string>
  description: Ref<string>
  lang: Ref<string>
  isDark: Ref<boolean>
  dir: Ref<string>
  localeIndex: Ref<string>
}

interface PageData {
  title: string
  titleTemplate?: string | boolean
  description: string
  relativePath: string
  filePath: string
  headers: Header[]
  frontmatter: Record<string, any>
  params?: Record<string, any>
  isNotFound?: boolean
  lastUpdated?: number
}
```

## Layout Slots
資料已經透過 useData 取得了，那要怎麼放進頁面中呢?

預設主題的 `<Layout>` 設計了一些插槽，可以在特定的頁面位置加入內容

::: code-group
```vue [expandLayout.vue]
<template>
    <Layout :class="[frontmatter.class]">
        <template #doc-before>
            <div class="info-box">
                <span class="info">✍️ {{ frontmatter.author || 'Opsehll' }}</span>
                <div v-if="lastUpdated !== '' || frontmatter.createdAt" class="date-box">
                    📆
                    <span v-if="lastUpdated !== ''">Last Updated：{{ lastUpdated }}</span>
                    <span v-if="frontmatter.createdAt">Created：{{ frontmatter.createdAt }}</span>
                </div>

                <div v-if="frontmatter.tags" class="tag-box">
                    🏷️
                    <a
                        v-for="tag in frontmatter.tags"
                        :key="tag"
                        class="tag-info"
                        :href="`/tags-list.html?tag=${tag}&page=1`"
                    >{{ tag }}</a>
                </div>
            </div>
        </template>
    </Layout>
</template>
```
:::

## 覆蓋預設 Layout
`expandLayout.vue` 做完之後，在 `docs/.vitepress/theme/index.ts` 中覆蓋：
```ts
import { DefineComponent, h } from 'vue';
import { Theme, useRoute } from 'vitepress';
import DefaultTheme from 'vitepress/theme-without-fonts';

import ExpandLayout from './layout/expandLayout.vue'; // [!code ++]

export default {
    ...DefaultTheme,
    Layout: ExpandLayout, // [!code ++]
    Layout: () => { // [!code --]
        return h(DefaultTheme.Layout, null, { // [!code --]
            // https://vitepress.dev/guide/extending-default-theme#layout-slots // [!code --]
        });  // [!code --]
    }, // [!code --]

    enhanceApp({ app }) {
        app.component('resume', LayoutResume);
    }
} satisfies Theme;

```

除了直接做一個 vue 元件覆蓋以外，當然也可以用渲染函數來處理：
```ts
import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';
import ArticleInfoComponent from './articleInfoComponent.vue';

export default {
    extends: DefaultTheme,
    Layout() {
        return h(DefaultTheme.Layout, null, {
            'doc-before': () => h(ArticleInfoComponent)
        });
    }
};
```

有哪些插槽可以參考[官方文件](https://vitepress.dev/zh/guide/extending-default-theme#layout-slots)。
