<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vitepress';
import type { TagSummary } from '@shared/data/tagSummeries';
import type { Post } from '@shared/hooks/useBuildSiteData';
import { tagSummaries } from '@shared/data/tagSummeries';
import { useSiteData } from '@shared/hooks/useSiteData';
import Heatmap from './heatmap.vue';

// --- Data Fetching ---
const siteData = useSiteData();
const router = useRouter();

// --- State ---
const currentTag = ref('TypeScript');
const currentPage = ref(1);
const searchTerm = ref('');
const pageSize = 10;

// **關注點分離**{.brand}: 路由同步與初始化
const updateStateFromUrl = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const tag = url.searchParams.get('tag');
    const page = url.searchParams.get('page');

    if (tag) currentTag.value = tag;
    if (page) currentPage.value = Number(page);
};

onMounted(() => {
    updateStateFromUrl();
});

// 監聽路由變化 (處理上一頁/下一頁)
watch(() => router.route.path, () => updateStateFromUrl());

// --- Computed Logic ---

// 1. 篩選標籤列表與計算權重
const filteredTags = computed(() => {
    if (!siteData.value) return [];
    const tagsAsArray = Array.from(siteData.value.tags.entries())
        .map(([name, data]) => ({ name, count: data.count }))
        .sort((a, b) => b.count - a.count);

    const filtered = searchTerm.value
        ? tagsAsArray.filter(tag => tag.name.toLowerCase().includes(searchTerm.value.toLowerCase()))
        : tagsAsArray;

    const maxCount = Math.max(...filtered.map(t => t.count), 1);
    return filtered.map(tag => ({
        ...tag,
        weight: (tag.count / maxCount) // 0 ~ 1 比例
    }));
});

// 2. 獲取當前標籤的所有文章
const postsOfCurrentTag = computed<Post[]>(() => {
    if (!siteData.value || !currentTag.value) return [];
    const tagIndex = siteData.value.tags.get(currentTag.value);
    if (!tagIndex) return [];

    const sorted = tagIndex.postUrls
        .map(url => siteData.value?.posts.get(url))
        .filter(Boolean) as Post[];

    return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

// 3. **全域標籤貢獻資料**{.brand} (Heatmap 專用)
// **關注點分離**{.brand}: 處理熱點數據 (含錯誤修復)
const globalHeatmapData = computed(() => {
    const data: Record<string, number> = {};
    if (!siteData.value) return data;

    const targetTagNames = filteredTags.value.map(t => t.name);

    siteData.value.posts.forEach(post => {
        // 1. 檢查日期是否存在且有效
        if (!post.date) return;
        const dateObj = new Date(post.date);
        if (isNaN(dateObj.getTime())) return; // 跳過無效日期

        // 2. 檢查是否包含在目前的篩選標籤中
        const hasVisibleTag = post.tags.some(t => targetTagNames.includes(t));

        if (hasVisibleTag) {
            const dateStr = dateObj.toISOString().split('T')[0];
            data[dateStr] = (data[dateStr] || 0) + 1;
        }
    });
    return data;
});

// 4. 分頁邏輯
const totalCount = computed(() => postsOfCurrentTag.value.length);
const totalPage = computed(() => Math.ceil(totalCount.value / pageSize));
const currentPageData = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    return postsOfCurrentTag.value.slice(start, start + pageSize);
});

const currentTagSummary = computed<TagSummary | undefined>(() => {
    return tagSummaries[currentTag.value as string];
});

// 工具：日期格式化
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toISOString().split('T')[0];
};
</script>

<template>
    <div class="tags-list-layout">
        <aside class="sidebar">
            <div class="search-wrapper">
                <ElSvgIcon name="search" class="icon" />
                <input v-model="searchTerm" type="text" placeholder="Filter tags..." />
            </div>

            <nav class="tags-nav">
                <a
                    v-for="tag in filteredTags"
                    :key="tag.name"
                    class="tag-link"
                    :class="{ active: currentTag === tag.name }"
                    :href="`?tag=${tag.name}&page=1`"
                    :style="{ '--weight': tag.weight }"
                >
                    <span class="name"># {{ tag.name }}</span>
                    <span class="count">{{ tag.count }}</span>
                </a>
            </nav>
        </aside>

        <main class="main-content">
            <section class="analysis-card">
                <div class="card-header">
                    <h3 class="title">
                        <ElSvgIcon name="timeline" class="icon" />
                        Activity Insight
                    </h3>
                    <div class="badge" :class="{ 'is-filtering': searchTerm }">
                        {{ searchTerm ? 'Filtered Tags' : 'All Activities' }}
                    </div>
                </div>
                <Heatmap :data="globalHeatmapData" />
            </section>

            <header class="list-header">
                <div class="title-row">
                    <h1 class="tag-title">
                        <span class="hash">#</span> {{ currentTag }}
                    </h1>
                    <span class="post-count">{{ totalCount }} posts</span>
                </div>
                <p v-if="currentTagSummary" class="tag-desc">{{ currentTagSummary.description }}</p>
            </header>

            <div class="cards-grid">
                <TransitionGroup name="list">
                    <article v-for="post in currentPageData" :key="post.url" class="modern-card">
                        <a :href="post.url" class="card-link-wrapper">
                            <div class="card-body">
                                <div class="card-meta-header">
                                    <div class="category-pill" v-if="post.category">
                                        <ElSvgIcon name="folder" class="icon" /> {{ post.category }}
                                    </div>
                                    <div class="date-info">
                                        <ElSvgIcon name="calendar_month" class="icon" /> {{ formatDate(post.date) }}
                                    </div>
                                </div>
                                <h2 class="card-title">{{ post.title }}</h2>
                                <p class="card-excerpt">{{ (post as any).excerpt || 'Read more about this article...' }}</p>
                                <div class="card-footer">
                                    <div class="tags-list">
                                        <span class="tag-pill"># {{ currentTag }}</span>
                                    </div>
                                    <span class="read-more">View <ElSvgIcon name="arrow_forward" class="icon arrow" /></span>
                                </div>
                            </div>
                            <div class="card-thumbnail" v-if="post.image">
                                <img :src="post.image" loading="lazy" alt="cover" />
                            </div>
                        </a>
                    </article>
                </TransitionGroup>
            </div>

            <div class="pagination-wrapper" v-if="totalPage > 1">
                <a
                    v-for="num in totalPage"
                    :key="num"
                    :href="`?tag=${currentTag}&page=${num}`"
                    class="page-num"
                    :class="{ active: num === currentPage }"
                >
                    {{ num }}
                </a>
            </div>
        </main>
    </div>
</template>

<style lang="scss" scoped>
$radius-card: 16px;
$transition-base: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

.tags-list-layout {
    display: flex;
    gap: 3rem;
    max-width: 1150px;
    padding: 3rem 1.5rem;
    margin: 0 auto;
    @media (width <= 960px) { flex-direction: column; }
}

// --- Sidebar & Tag Cloud ---
.sidebar {
    position: sticky;
    top: 100px;
    width: 280px;
    @media (width <= 960px) { position: static; width: 100%; }
}

.tags-nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    .tag-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-radius: 10px;
        color: var(--vp-c-text-2);

        /* **動態字重**{.brand} */
        font-weight: calc(400 + (var(--weight) * 300));
        transition: $transition-base;

        &:hover {
            background: var(--vp-c-bg-alt);
            color: var(--vp-c-brand);
            transform: translateX(5px);
        }
        &.active {
            background: color-mix(in srgb, var(--vp-c-brand) 15%, transparent);
            box-shadow: inset 4px 0 0 var(--vp-c-brand);
            color: var(--vp-c-brand);
        }
        .count {
            background: var(--vp-c-bg-soft);
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 0.75rem;
            opacity: 0.7;
        }
    }
}

// --- Analysis Card (Heatmap Wrapper) ---
.analysis-card {
    background: var(--vp-c-bg-alt);
    padding: 1.5rem;
    border: 1px solid var(--vp-c-divider);
    border-radius: $radius-card;
    margin-bottom: 2.5rem;

    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.2rem;
        .title { display: flex; gap: 8px; align-items: center;
            margin: 0;
            color: var(--vp-c-text-1); font-size: 1.1rem;
        }
        .badge {
            background: var(--vp-c-bg-soft); padding: 4px 10px; border-radius: 50px; color: var(--vp-c-text-3);
            font-size: 0.7rem;
            &.is-filtering { background: var(--vp-c-brand); color: white; }
        }
    }
}

// --- Cards & Transitions ---
.modern-card {
    background: var(--vp-c-bg);
    border: 1px solid var(--vp-c-bg-soft);
    border-radius: $radius-card;
    margin-bottom: 1.5rem;
    transition: $transition-base;
    overflow: hidden;

    &:hover {
        border-color: var(--vp-c-brand);
        box-shadow: 0 12px 30px -10px rgb(0,0,0,10%);
        transform: translateY(-4px);
    }
}

// 文章列表切換動畫
.list-enter-active, .list-leave-active { transition: all 0.5s ease; }
.list-enter-from, .list-leave-to { transform: translateX(30px); opacity: 0; }

/* 其他樣式繼承您之前的設定並稍作間距微調... */
</style>