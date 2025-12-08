<script setup lang="ts">
import { useData } from 'vitepress';
    const { frontmatter, page, isDark } = useData();

    const lastUpdated = computed(() => {
    const timestamp = page.value.lastUpdated as number;
    return timestamp > 0 ? new Date(timestamp).toLocaleDateString() : '';
});
</script>

<template>
    <header class="article-meta-header">
        <div>
            <div class="meta-row">
                <div class="meta-item author">
                    <ElSvgIcon name="person" class="icon" />
                    <span>{{ frontmatter.author || 'Opshell' }}</span>
                </div>

                <div v-if="lastUpdated || frontmatter.createdAt" class="meta-item date">
                    <ElSvgIcon name="calendar_month" class="icon" />
                    <span v-if="frontmatter.createdAt">{{ frontmatter.createdAt }}</span>
                    <span v-else>{{ lastUpdated }}</span>
                </div>

                <div class="meta-item views">
                    <ElSvgIcon name="visibility" class="icon" />
                    <span id="busuanzi_value_page_pv">--</span>
                </div>
            </div>

            <div v-if="frontmatter.tags" class="tags-row">
                <a
                    v-for="tag in frontmatter.tags"
                    :key="tag"
                    class="tag-pill"
                    :href="`/tags-list.html?tag=${tag}&page=1`"
                >
                    <ElSvgIcon name="tag" class="icon" />
                    {{ tag }}
                </a>
            </div>
        </div>

        <div v-if="frontmatter.image" class="banner-block">
            <img :src="frontmatter.image" :alt="`${frontmatter.title}_image`" />
        </div>
    </header>
</template>

<style lang="scss">

</style>