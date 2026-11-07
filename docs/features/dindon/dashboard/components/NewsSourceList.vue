<script setup lang="ts">
    import type { NewsSource } from '../schemas/admin.schema';
    import { formatDateTime } from '../format';

    // 新聞示警草稿的來源列表（Flowsker #532）。網址來自外部新聞，只有 https:// 才做成連結：
    // 現在後端只存 Google 新聞的網址，但換來源時 javascript: 這類網址不能變成點得下去的東西。
    defineProps<{ sources: NewsSource[] }>();
</script>

<template>
    <ul class="dd-news-sources">
        <li v-for="source in sources" :key="source.url">
            <a v-if="source.url.startsWith('https://')" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a>
            <span v-else>{{ source.title }}</span>
            <small>{{ source.source }}{{ source.publishedAt ? `・${formatDateTime(source.publishedAt)}` : '' }}</small>
        </li>
    </ul>
</template>

<style lang="scss">
    .dd-news-sources {
        padding-left: 1.2em;
        margin: 6px 0 0;

        li { margin: 4px 0; }
        small {
            display: block;
            color: var(--vp-c-text-3);
        }
    }
</style>
