---
title:  'Day25 - busuanzi'
author: 'Opshell'
createdAt: '2024/09/26'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: false
---

由於我們部落格走無後端的輕量化路線，所以計算訪客數的功能就比較沒有選擇，目前比較合用的 Opshell 看來看去就只有 `不蒜子` 而已。

## 配置 `不蒜子`
因為要在每個頁面都有統計的能力，所以我們要在 `docs/.vitepress/theme/index.ts` 裡面使用他，並在每次路由改變時 `reload`。

```ts
import { useRoute } from 'vitepress';

function reloadBusuanzi() {
    const busuanziScriptId = 'busuanzi-script';

    // 移除舊的不蒜子
    const existingScript = document.getElementById(busuanziScriptId);
    if (existingScript) {
        existingScript.remove();
    }

    // 建立新的不蒜子物件
    const script = document.createElement('script');
    script.id = busuanziScriptId;
    script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
    script.async = true;

    document.body.appendChild(script);
}

export default {
    setup() {
        const route = useRoute();

        onMounted(async () => {
            reloadBusuanzi(); // 初始化
        });
        watch(() => route.path, () => {
            nextTick(() => {
                reloadBusuanzi(); // 監聽
            });
        });
    }
};
```

## 實際使用
我們在擴充的 `docs/.vitepress/theme/layout/expendLayout.vue` 中使用他：
```vue
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

                <div class="read">
                    // [!code ++]
                    👀 已被閱讀： // [!code ++]
                    <span id="busuanzi_value_page_pv">Loading</span> // [!code ++]
                    次 // [!code ++]
                </div> // [!code ++]

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

        <template #aside-ads-before>
            // [!code ++]
            <div class="busuanzi-box">
                // [!code ++]
                Opshell 的 Blog // [!code ++]
                <div class="busuanzi">
                    // [!code ++]
                    已有： <span id="busuanzi_value_site_pv" class="number">Loading</span> 次觀看 // [!code ++]
                </div> // [!code ++]
                <div class="busuanzi">
                    // [!code ++]
                    已有： <span id="busuanzi_value_site_uv" class="number">Loading</span> 個人來過 // [!code ++]
                </div> // [!code ++]
            </div> // [!code ++]
        </template> // [!code ++]
    </Layout>
</template>
```

## 主要用法
```html
<span id="busuanzi_value_page_pv">Loading</span>
<span id="busuanzi_value_site_pv" class="number">Loading</span>
<span id="busuanzi_value_site_uv" class="number">Loading</span>
```

他們之間的差異是?
### page_pv
該頁面有多少人瀏覽過：
該頁面每次瀏覽都會計數一次，不蒜子目前沒有防重整功能，可藉由擴充路由比對的功能添加防重整功能。

### site_pv
整個網站的總瀏覽量：
每一個網站下頁面的瀏覽都會計數一次，所以可以理解成整個網站的"總瀏覽量"

### site_uv
網站的訪客數
用戶紀錄，同一個瀏覽者，連續觀看多偏文章，只會計數一次，是針對網站有多少人來過。

## 小結
這樣就可以簡易的計算來過多少人了喔。
