<script setup lang="ts">
    import { useData } from 'vitepress';

    const { frontmatter, page, isDark } = useData();

    const lastUpdated = computed(() => {
    const timestamp = page.value.lastUpdated as number;
    return timestamp > 0 ? new Date(timestamp).toLocaleDateString() : '';
});
</script>

<template>
    <header class="article-meta">
        <div class="article-meta-header">
            <div class="meta-row">
                <div class="meta-item author">
                    <ElSvgIcon name="history_edu" />
                    <span class="text">{{ frontmatter.author || 'Opshell' }}</span>
                </div>

                <div v-if="lastUpdated || frontmatter.createdAt" class="meta-item date">
                    <ElSvgIcon name="calendar_month" />
                    <span v-if="frontmatter.createdAt" class="text">{{ frontmatter.createdAt }}</span>
                    <span v-else class="text">{{ lastUpdated }}</span>
                </div>

                <div class="meta-item views">
                    <ElSvgIcon name="visibility" />
                    <span id="busuanzi_value_page_pv" class="text">--</span>
                </div>
            </div>

            <div v-if="frontmatter.tags" class="tags-row">
                <ElTag v-for="tag in frontmatter.tags" :key="tag" :tag/>
            </div>
        </div>

        <div v-if="frontmatter.image" class="banner-block">
            <img :src="frontmatter.image" :alt="`${frontmatter.title}_image`" loading="lazy"/>
        </div>
    </header>
</template>

<style lang="scss">
    .article-meta {
        margin-bottom: 2.5rem;
    }

    .article-meta-header {
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--vp-c-divider);
        margin-bottom: 2rem;
    }

    .meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        align-items: center;
        margin-bottom: 1rem;
        color: var(--vp-c-text-2);
        font-size: 0.9rem;

        .meta-item {
            display: flex;
            gap: 6px;
            align-items: center;
            .icon {
                @include setSize(26px, 26px);
                transform: translateY(-1px);
            }
            .text {
                color: var(--color-gray-600);
                font-size: var(--font-size-s);
            }

            // Font fix for numbers/dates
            &.date, &.views {
                font-family: var(--vp-font-family-mono);
            }
        }
    }

    .tags-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }


    .banner-block {
        border-radius: 12px;
        margin: 1.5rem 0;
        box-shadow: 0 4px 12px rgb(0,0,0,5%);
        overflow: hidden;

        img {
            display: block;
            width: 100%;
            height: auto;
        }
    }
</style>