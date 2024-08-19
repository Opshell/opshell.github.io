<script setup lang="ts">
    import DefaultTheme from 'vitepress/theme';
    import { useData } from 'vitepress';

    const { Layout } = DefaultTheme;

    const { frontmatter, isDark, page } = useData();

    const url = location.href.split('?')[1];
    const params = new URLSearchParams(url);
    const { theme } = useData();

    console.log('theme', theme.value);

    const classification = computed(() => theme.value.classification);

    const lastUpdated = computed(() => {
        // 把 page.value.lastUpdated 從時間戳轉換成 西元年月日
        const timestamp = page.value.lastUpdated as number;

        // ${new Date(timestamp).toLocaleTimeString()}
        return `${new Date(timestamp).toLocaleDateString()}  `;
    });

    // const selectTag = ref(params.get('tag') ? params.get('tag') : '');
    // function toggleTag(tag: string) {
    //     selectTag.value = tag;
    // }
</script>

<template>
    <Layout>
        <template #doc-before>
            <div class="info-box">
                <span class="info">✍️ {{ frontmatter.author || 'Opsehll' }}</span>
                <span v-if="frontmatter.createdAt" class="info">🕐 Last Updated：{{ lastUpdated }} ~ Create By {{ frontmatter.createdAt }} </span>
                <div v-if="frontmatter.tags" class="tag-box">
                    🔗
                    <span v-for="item in frontmatter.tags" :key="item" class="tag-info">{{ item }}</span>
                </div>
            </div>
        </template>

        <template #aside-ads-before>
            <div class="tag-box">
                <a
                    v-for="(info, tag) in classification.tags"
                    :key="`tag-${tag}`"
                    class="tag"
                    :href="`tags-list.html?tag=${tag}&page=1`"
                >
                    <span>{{ tag }}：</span>
                    <span class="count">{{ info.count }}</span>
                </a>
            </div>
        </template>
    </Layout>
</template>

<style lang="scss">
    .info-box {
        @include setFlex(flex-start, center, 1rem);
        padding: 0 0 1rem;
        border-bottom: 1px solid var(--vp-c-divider);
        margin-bottom: 1rem;
        color: var(--vp-c-text-2);
        font-size: .8rem;

        .info {
            margin-right: 10px;
            color: var(--vp-c-text-2);
            font-size: 13px;
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
