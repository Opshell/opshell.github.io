<script setup lang="ts">
    import { useData } from 'vitepress';

    const { frontmatter, page, isDark } = useData();

    const lastUpdated = computed(() => {
        const timestamp = page.value.lastUpdated as number;
        return timestamp > 0 ? new Date(timestamp).toLocaleDateString() : '';
    });
</script>

<template>
    <!-- 標題下面一行小字：日期、作者、閱讀次數；再一行標籤。不放圖示，資訊本身就夠清楚 -->
    <div class="article-meta">
        <p class="article-meta__row">
            <time v-if="frontmatter.createdAt || lastUpdated" class="date">{{ frontmatter.createdAt || lastUpdated }}</time>
            <span class="author">{{ frontmatter.author || 'Opshell' }}</span>
            <span class="views">閱讀 <span id="busuanzi_value_page_pv">--</span> 次</span>
        </p>

        <div v-if="frontmatter.tags?.length" class="article-meta__tags">
            <ElTag v-for="tag in frontmatter.tags" :key="tag" :tag />
        </div>

        <figure v-if="frontmatter.image" class="article-meta__banner">
            <img :src="frontmatter.image" :alt="`${frontmatter.title}_image`" loading="lazy" />
        </figure>
    </div>
</template>

<style lang="scss">
    .article-meta {
        @include setFlex(flex-start, stretch, var(--nb-space-3), column);

        &__row {
            display: flex;
            flex-wrap: wrap;
            gap: var(--nb-space-1) var(--nb-space-5);
            margin: 0;
            color: var(--nb-ink-3);
            font-size: var(--nb-step--1);

            .date { font-variant-numeric: tabular-nums; }
        }
        &__tags {
            display: flex;
            flex-wrap: wrap;
            gap: var(--nb-space-1) var(--nb-space-4);
        }
        &__banner {
            margin: var(--nb-space-4) 0 0;

            img {
                display: block;
                width: 100%;
                height: auto;
                border: 1px solid var(--nb-rule);
                border-radius: var(--nb-radius);
            }
        }
    }
</style>
