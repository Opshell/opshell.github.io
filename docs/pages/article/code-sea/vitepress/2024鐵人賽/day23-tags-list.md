---
title:  'Day23 - tags list'
author: 'Opshell'
createdAt: '2024/09/24'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: false
---

既然都做了 `classification` 那我們就把順便利用他把文章列表也做出來吧，前面我們是歸檔了 `tags` 就來做一個基於 `tags` 然後帶簡單分頁功能的列表吧。

## 建立頁面
在 `docs/pages/` 下面新增 `tags-list.md`：

```md [tags-list.md]
---
title: Tags List
author: 'Opshell'
categories:
  - Archive
tags:
  - Archive
layout: page
---

<TemplateTagsList />
```

## Router
在 `docs/components/template/` 裡新增 `tagsList.vue`：
```vue [tagsList.vue]
<script setup lang="ts">
    import { useData, useRouter } from 'vitepress';

    import { iClassification } from '@/hooks/useArticleClassification';

    const { theme } = useData();

    // 取得全部分類
    const classification = computed(() => theme.value.classification as iClassification);

    const urlParams = ref(new URLSearchParams(window.location.search));
    const currentTag = ref(urlParams.value.get('tag') ? urlParams.value.get('tag') : 'typescript'); // 當前Tag
    const currentPage = ref(urlParams.value.get('page') ? Number(urlParams.value.get('page')) : 1); // 當前頁碼

    const router = useRouter();
    router.onAfterRouteChanged = (to) => {
        urlParams.value = new URLSearchParams(to.split('?')[1]);

        currentTag.value = urlParams.value.get('tag') ? urlParams.value.get('tag') : 'typescript'; // 當前Tag
        currentPage.value = urlParams.value.get('page') ? Number(urlParams.value.get('page')) : 1; // 當前頁碼
    };

    const pageSize = 10; // 每頁顯示幾筆

    // 總筆數
    const totalCount = computed(() => {
        return classification.value.tags[currentTag.value as string].group.length;
    });

    // 總頁數
    const totalPage = computed(() => {
        return Math.ceil(totalCount.value / pageSize);
    });

    // 取出當前頁面的資料
    const currentPageData = computed(() => {
        const start = (currentPage.value - 1) * pageSize;
        const end = currentPage.value * pageSize;
        return classification.value.tags[currentTag.value as string].group.slice(start, end);
    });
</script>

<template>
    <div class="article-list-block">
        <div class="left-block">
            <a
                v-for="(info, tag) in classification.tags"
                :key="`tabs-${tag}`"
                class="tab"
                :class="[{ current: currentTag === tag }]"
                :href="`?tag=${tag}&page=1`"
            >
                <span>{{ tag }}: {{ info.count }}</span>
            </a>
        </div>

        <div class="right-block">
            <ul class="list-block">
                <li v-for="item in currentPageData" :key="`list-${currentTag}-${currentPage}-${item.title}`">
                    <a :href="`${item.url}`" class="item-box">
                        <img class="image" :src="item.image" />
                        <span class="date">
                            <ElSvgIcon name="calendar_month" />
                            {{ item.date }}
                        </span>
                        <span class="category">
                            <ElSvgIcon name="folder" />
                            {{ item.category }}
                        </span>
                        <h3 class="title">{{ item.title }}</h3>
                        <span class="view">
                            <ElSvgIcon name="pageview" />
                            view
                        </span>
                    </a>
                </li>
            </ul>

            <div class="pagination-box">
                <template v-for="num in totalPage" :key="`page-${num}`">
                    <a
                        v-if="num !== currentPage"
                        :href="`?tag=${currentTag}&page=${num}`"
                        class="pagination"
                    >
                        {{ num }}
                    </a>
                    <span v-else class="pagination current">{{ num }}</span>
                </template>
            </div>
        </div>
    </div>
</template>
```

前面有提到 `VitePress` 提供了一些 API 給我們用，我們前面用過了 `useData` ，在這邊各位可以注意到，我們用到了 `useRouter`，來幫助我們做簡易的分頁器，下面是 `useRouter`  的型別：
```ts
interface Router {
  /**
   * 当前路由
   */
  route: Route
  /**
   * 导航到新的 URL
   */
  go: (to?: string) => Promise<void>
  /**
   * 在路由更改前调用。返回 `false` 表示取消导航
   */
  onBeforeRouteChange?: (to: string) => Awaitable<void | boolean>
  /**
   * 在页面组件加载前（history 状态更新后）调用。返回 `false` 表示取消导航
   */
  onBeforePageLoad?: (to: string) => Awaitable<void | boolean>
  /**
   * 在页面组件加载后（页面组件实际更新前）调用
   */
  onAfterPageLoad?: (to: string) => Awaitable<void>
  /**
   * 在路由更改后调用
   */
  onAfterRouteChanged?: (to: string) => Awaitable<void>
}
```
提供了一些路由週期的接口。

## 小結
這樣就實踐了簡單的路由，並做了簡易的文章列表，之後也可以用類似的方式做出分類和時間軸的類型，後面的文章就不贅述做法了。
