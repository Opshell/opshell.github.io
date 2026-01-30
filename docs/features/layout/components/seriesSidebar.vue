<script setup lang="ts">
    import { computed } from 'vue';
    import { useData } from 'vitepress';
    import { useSiteData } from '@hooks/useSiteData'; // 使用你提供的 Hook

    import { useSidebar } from 'vitepress/dist/client/theme-default/composables/sidebar';

    const { frontmatter, page } = useData();
    const siteData = useSiteData();

    // 1. 決定標題：優先顯示 Series，其次 Category，最後 fallback
    const contextTitle = computed(() => {
        return frontmatter.value.series
            || frontmatter.value.category
            || 'Recent Posts';
    });

    const contextLabel = computed(() => {
        if (frontmatter.value.series) return 'SERIES';
        if (frontmatter.value.category) return 'CATEGORY';
        return 'EXPLORE';
    });

    // 2. 核心邏輯：從 Map 中篩選相關文章
    const relatedPosts = computed(() => {
        if (!siteData.value) return [];

        // 將 Map 的 values 轉為陣列來進行 filter/sort
        // 這裡的 posts 已經是還原好的 Post 物件了
        const allPosts = Array.from(siteData.value.posts.values());

        // Scenario A: 系列文 (Series)
        if (frontmatter.value.series) {
            return allPosts
                .filter(p => (p as any).series === frontmatter.value.series)
                // 系列文通常建議：舊 -> 新 (閱讀順序)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        // Scenario B: 同分類 (Category)
        if (frontmatter.value.category) {
            return allPosts
                .filter(p => p.category === frontmatter.value.category)
                // 分類文章建議：新 -> 舊
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        // Scenario C: 最新文章 (Recent)
        // 利用 sortedPostUrls (已經排好序的 key) 直接去 Map 抓，效能最高
        return siteData.value.sortedPostUrls
            .slice(0, 10)
            .map(url => siteData.value!.posts.get(url))
            .filter(Boolean); // 過濾掉可能的 undefined
    });

    // Helper: 判斷是否為當前頁面 (比對 URL)
    const isActive = (url: string) => {
        // 處理一下路徑結尾 (.html vs 無副檔名)
        const currentPath = page.value.relativePath.replace(/\.md$/, '');
        const targetPath = url.replace(/\.html$/, '').replace(/^\//, '');
        return currentPath === targetPath;
    };
</script>

<template>
  <nav class="series-nav" v-if="relatedPosts.length > 0">
    <div class="nav-header">
        <span class="label">{{ contextLabel }}</span>
        <h3 class="title">{{ contextTitle }}</h3>
    </div>

    <ul class="post-list">
        <li v-for="(post, index) in relatedPosts" :key="post!.url">
            <a :href="post!.url" class="post-link" :class="{ active: isActive(post!.url) }">
                <span class="index">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="text">{{ post!.title }}</span>
            </a>
        </li>
    </ul>
  </nav>
</template>

<style lang="scss" scoped>
.series-nav {
    padding-right: 1rem;

    .nav-header {
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--vp-c-divider);
        margin-bottom: 1.5rem;

        .label { color: var(--vp-c-brand);
            font-size: 0.7rem; font-weight: 800;
            letter-spacing: 1.2px; text-transform: uppercase;
        }
        .title { margin-top: 0.4rem;
            color: var(--vp-c-text-1);
            font-size: 1.1rem; font-weight: 700; line-height: 1.4;
        }
    }

    .post-list { display: flex; flex-direction: column; gap: 4px; padding: 0; margin: 0;
        list-style: none;
    }

    .post-link {
        display: flex; gap: 12px; align-items: baseline;
        padding: 8px 12px; border-radius: 8px; color: var(--vp-c-text-2);
        font-size: 0.9rem;
        line-height: 1.5;
        text-decoration: none;
        transition: all 0.2s ease;

        .index { min-width: 1.5em;
            font-family: var(--vp-font-family-mono);
            font-size: 0.8rem; opacity: 0.4;
        }

        &:hover {
            background: var(--vp-c-bg-alt);
            color: var(--vp-c-brand);
            transform: translateX(4px);
        }

        &.active {
            background: var(--vp-c-bg-soft);
            box-shadow: 0 1px 2px rgb(0,0,0,5%);
            color: var(--vp-c-brand);
            font-weight: 600;
            .index {
                color: var(--vp-c-brand);
                opacity: 1;
            }
        }
    }
}
</style>