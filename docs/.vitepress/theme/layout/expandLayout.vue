<script setup lang="ts">
    import DefaultTheme from 'vitepress/theme';
    import { useData } from 'vitepress';

    const { Layout } = DefaultTheme;

    const { frontmatter, isDark, page } = useData();

    const url = location.href.split('?')[1];
    const params = new URLSearchParams(url);
    const { theme } = useData();

    const classification = computed(() => theme.value.classification);

    const lastUpdated = computed(() => {
        // 把 page.value.lastUpdated 從時間戳轉換成 西元年月日
        const timestamp = page.value.lastUpdated as number;

        return `${timestamp > 0 ? new Date(timestamp).toLocaleDateString() : ''}`;
    });
</script>

<template>
    <Layout>
        <template #doc-before>
            <div class="info-box">
                <span class="info">✍️ {{ frontmatter.author || 'Opsehll' }}</span>
                <div v-if="lastUpdated !== '' || frontmatter.createdAt" class="date-box">
                    📆
                    <span v-if="lastUpdated !== ''">Last Updated：{{ lastUpdated }}</span>
                    <span v-if="frontmatter.createdAt">Created：{{ frontmatter.createdAt }}</span>
                </div>

                <div class="read">
                    👀 瀏覽量：
                    <span id="busuanzi_value_page_pv">Loading</span>
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

        <template #doc-after>
            <OrgaGiscusComment />
        </template>

        <template #aside-ads-before>
            <div class="busuanzi-box">
                <div class="busuanzi">總閱讀數： <span id="busuanzi_value_site_pv" class="number">Loading</span> 次 </div>
                <div class="busuanzi">總訪客數： <span id="busuanzi_value_site_uv" class="number">Loading</span> 人 </div>
            </div>
        </template>
        <template #aside-ads-after>
            <div class="tag-box">
                <a
                    v-for="(info, tag) in classification.tags"
                    :key="`tag-${tag}`"
                    class="tag"
                    :href="`/tags-list.html?tag=${tag}&page=1`"
                >
                    <span>{{ tag }}：</span>
                    <span class="count">{{ info.count }}</span>
                </a>
            </div>
        </template>
    </Layout>
</template>

<style lang="scss">
    .layout-top-block {
        background: #123456;
    }
    .read {
        color: var(--vp-c-brand-1);
    }
    .info-box {
        @include setFlex(flex-start, center, 1rem);
        flex-wrap: wrap;
        padding: 0 0 1rem;
        border-bottom: 1px solid var(--vp-c-divider);
        margin-bottom: 1rem;
        color: var(--vp-c-text-2);
        font-size: .85rem;

        .info {
            margin-right: 10px;
            color: var(--vp-c-text-2);
        }

        .date-box {
            @include setFlex(space-between, center, 15px);
            color: var(--vp-c-text-2);
        }
    }



    .busuanzi-box {
        @include setFlex(flex-start, flex-start, 5px, column);
        padding: 10px 0;

        .busuanzi {

        }

        .number {
            color: var(--vp-c-brand-1);
            font-weight: 500;
        }
    }


    .tag-box {
        @include setFlex(flex-start, flex-start, 5px);
        flex-wrap: wrap;

    }

    .tag {
        padding: 5px 10px;
        border: 1px solid var(--vp-c-text-2);
        border-radius: 5px;
        font-size: .8rem;
        .count {
            color: var(--vp-c-brand-1);
            font-weight: 700;
        }
    }
    .tag-info {
        background-color: var(--vp-c-text-3);
        padding: 0 5px;
        border-radius: 3px;
        color: var(--vp-c-text-1);
    }
</style>
