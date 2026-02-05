<script setup lang="ts">
    import { ref, computed, onMounted, watch } from 'vue';
    import { useRouter } from 'vitepress';
    import { useSiteData } from '@shared/hooks/useSiteData';
    import type { TagSummary } from '@shared/data/tagSummeries';
    import type { Post } from '@shared/hooks/useBuildSiteData';
    import { tagSummaries } from '@shared/data/tagSummeries';

    // 引入新組件
    import Heatmap from './heatmap.vue';
    import PostCard from './postCard.vue';

    // --- Data Fetching ---
    const siteData = useSiteData();
    const router = useRouter();

    // --- State ---
    const currentTag = ref('TypeScript');
    const searchTerm = ref('');
    const selectedDate = ref<string | null>(null); // 新增：日期篩選
    const currentPage = ref(1);
    const pageSize = 10;

    // --- 初始化與路由 ---
    const updateStateFromUrl = () => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        const tag = url.searchParams.get('tag');
        if (tag) currentTag.value = tag;
        // 切換標籤時，通常重置日期篩選
        selectedDate.value = null;
    };

    onMounted(() => updateStateFromUrl());
    watch(() => router.route.path, updateStateFromUrl);

    // 換標籤時清空日期篩選
    watch(currentTag, () => {
        selectedDate.value = null;
        currentPage.value = 1;
    });

    // --- Computed Logic ---
    // 分頁列表
    const postsOfCurrentTag = computed<Post[]>(() => {
        if (!siteData.value || !currentTag.value) return [];
        const tagIndex = siteData.value.tags.get(currentTag.value);
        if (!tagIndex) return [];

        // 排序：最新的在前面
        const sorted = tagIndex.postUrls
            .map(url => siteData.value?.posts.get(url))
            .filter(Boolean) as Post[];

        return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    const totalCount = computed(() => postsOfCurrentTag.value.length);


    const currentTagSummary = computed<TagSummary | undefined>(() => {
        return tagSummaries[currentTag.value as string];
    });

    // 左側標籤雲邏輯
    const filteredTags = computed(() => {
        if (!siteData.value) return [];
        const tagsAsArray = Array.from(siteData.value.tags.entries())
            .map(([name, data]) => ({ name, count: data.count }))
            .sort((a, b) => b.count - a.count);

        if (!searchTerm.value) return tagsAsArray;
        return tagsAsArray.filter(tag => tag.name.toLowerCase().includes(searchTerm.value.toLowerCase()));
    });

    // 2. 熱圖數據 (全域或當前標籤下)
    const heatmapData = computed(() => {
        const data: Record<string, number> = {};
        if (!siteData.value) return data;

        // 這裡可以決定：熱圖顯示「全站數據」還是「當前標籤數據」？
        // 通常顯示全站數據讓使用者知道哪裡有點擊比較好，或者只顯示當前 Tag
        // 這裡示範：顯示「當前選中 Tag」的文章分佈，如果想看全站，可以拿掉 filter

        // 取得當前 Tag 的文章 URL
        const tagData = siteData.value.tags.get(currentTag.value);
        const targetPosts = tagData
            ? tagData.postUrls.map(url => siteData.value!.posts.get(url)).filter(Boolean) as Post[]
            : [];

        targetPosts.forEach(post => {
            if (!post.date) return;
            const dateStr = new Date(post.date).toISOString().split('T')[0];
            data[dateStr] = (data[dateStr] || 0) + 1;
        });

        return data;
    });

    // 3. 文章列表篩選 (加入日期邏輯)
    const filteredPosts = computed<Post[]>(() => {
        if (!siteData.value) return [];

        // A. 先找出屬於當前 Tag 的文章
        const tagIndex = siteData.value.tags.get(currentTag.value);
        if (!tagIndex) return [];

        let posts = tagIndex.postUrls
            .map(url => siteData.value!.posts.get(url))
            .filter(Boolean) as Post[];

        // B. 如果有選擇日期，進行二次篩選
        if (selectedDate.value) {
            posts = posts.filter(p => {
                const pDate = new Date(p.date).toISOString().split('T')[0];
                return pDate === selectedDate.value;
            });
        }

        // C. 排序
        return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    // 4. 分頁
    const totalPage = computed(() => Math.ceil(filteredPosts.value.length / pageSize));
    const currentPageData = computed(() => {
        const start = (currentPage.value - 1) * pageSize;
        return filteredPosts.value.slice(start, start + pageSize);
    });

    // --- Actions ---
    const onDateSelect = (date: string | null) => {
        selectedDate.value = date;
        currentPage.value = 1; // 篩選後回到第一頁
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
                >
                    <span class="name"># {{ tag.name }}</span>
                    <span class="count">{{ tag.count }}</span>
                </a>
            </nav>
        </aside>

        <main class="main-content">
            <section class="analysis-card">
                <div class="card-header">
                    <h3 class="title">Activity Insight</h3>
                    <div class="badge" :class="{ 'is-filtering': selectedDate }">
                        {{ selectedDate ? `Filtered: ${selectedDate}` : `#${currentTag}` }}
                    </div>
                </div>

                <Heatmap
                    :data="heatmapData"
                    @select-date="onDateSelect"
                />
            </section>

            <header class="list-header">
                <h1 class="tag-title">
                    <span class="hash">#</span> {{ currentTag }}
                </h1>
                <span class="post-count">
                    {{ filteredPosts.length }} posts
                    <span v-if="selectedDate" class="date-filter-hint">(on {{ selectedDate }})</span>
                </span>
            </header>

            <div class="cards-grid">
                <TransitionGroup name="list">
                    <PostCard
                        v-for="post in currentPageData"
                        :key="post.url"
                        :post="post"
                    />
                </TransitionGroup>

                <div v-if="currentPageData.length === 0" class="empty-state">
                    No posts found for this date.
                </div>
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

    .cards-grid {
        display: flex;
        flex-direction: column; // 改回 column 因為 PostCard 是長條型的
        gap: 0; // PostCard 自己有 margin-bottom
    }

    .empty-state {
        background: var(--vp-c-bg-alt);
        padding: 3rem;
        border-radius: 12px;
        color: var(--vp-c-text-3);
        text-align: center;
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
                &.is-filtering {
                    background: var(--vp-c-brand);
                    color: white;
                }
            }
        }
    }

    // --- Cards & Transitions ---
    .modern-card {
        position: relative;
        background: var(--vp-c-bg);
        border: 1px solid var(--vp-c-bg-alt); // Start with subtle border
        border-radius: $radius-card;
        box-shadow: 0 1px 3px rgb(0,0,0,5%); // Shadow-sm
        transition: $transition-base;
        overflow: hidden;

        &:hover {
            border-color: color-mix(in srgb, var(--vp-c-brand) 30%, transparent);
            box-shadow: 0 10px 25px -5px rgb(0, 0, 0, 10%), 0 8px 10px -6px rgb(0, 0, 0, 10%); // Shadow-lgish
            transform: translateY(-4px); // Lift effect

            .card-title { color: var(--vp-c-brand); }
            .read-more { color: var(--vp-c-brand-dark); }
            .arrow { transform: translateX(4px); }
        }
    }

    .card-link-wrapper {
        display: flex;
        min-height: 180px; // Maintain some height
        color: inherit;
        text-decoration: none !important;
        @media (width <= 640px) {
            flex-direction: column-reverse;
            min-height: auto;
        }
    }

    .card-body {
        display: flex;
        flex: 1;
        flex-direction: column;
        padding: 1.5rem;
    }

    // 1. Header Meta
    .card-meta-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
        font-size: 0.8rem;

        .category-pill {
            display: inline-flex;
            gap: 4px;
            align-items: center;

            // **Dynamic Brand Color Pill**{.brand}
            background-color: color-mix(in srgb, var(--vp-c-brand) 10%, transparent);
            padding: 4px 10px;
            border-radius: 1rem;
            color: var(--vp-c-brand-dark);
            font-weight: 600;

            .icon {
                width: 14px;
                height: 14px;
            }
        }

        .date-info {
            display: flex;
            gap: 6px;
            align-items: center;
            color: var(--vp-c-text-3);
            font-family: var(--vp-font-family-mono);

            .icon {
                width: 14px;
                height: 14px;
            }
        }
    }

    // 2. Title & Excerpt
    .card-title {
        margin-bottom: 0.75rem;
        color: var(--vp-c-text-1);
        font-size: 1.4rem;
        font-weight: 700;
        line-height: 1.4;
        transition: color 0.2s;
    }

    .card-excerpt {
        flex-grow: 1; // Push footer down
        display: -webkit-box;
        margin-bottom: 1.5rem;
        color: var(--vp-c-text-2);
        font-size: 1rem;
        line-height: 1.6;
        overflow: hidden;
        line-clamp: 2;
        -webkit-box-orient: vertical;
    }

    // 3. Footer
    .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 1rem;
        border-top: 1px solid var(--vp-c-divider);

        .tags-list {
            display: flex;
            gap: 8px;
        }

        .tag-pill {
            background: var(--vp-c-bg-alt);
            padding: 2px 8px;
            border-radius: 4px;
            color: var(--vp-c-text-3);
            font-size: 0.75rem;
        }

        .read-more {
            display: flex;
            gap: 4px;
            align-items: center;
            color: var(--vp-c-brand);
            font-size: 0.9rem;
            font-weight: 600;
            transition: color 0.2s;

            .arrow {
                width: 16px;
                height: 16px;
                transition: transform 0.2s;
            }
        }
    }

    // 4. Thumbnail (Right side)
    .card-thumbnail {
        background: var(--vp-c-bg-alt);
        width: 200px;
        border-left: 1px solid var(--vp-c-divider);
        @media (width <= 640px) {
            width: 100%;
            height: 160px;
            border-bottom: 1px solid var(--vp-c-divider);
            border-left: none;
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;

            // Image subtle zoom on card hover
            transition: transform 0.5s ease;
        }
    }

    // Zoom effect from parent hover
    .modern-card:hover .card-thumbnail img {
        transform: scale(1.05);
    }

    // 文章列表切換動畫
    .list-enter-active,
    .list-leave-active {
        transition: all 0.5s ease;
    }
    .list-enter-from,
    .list-leave-to {
        transform: translateX(30px);
        opacity: 0;
    }

    /* 其他樣式繼承您之前的設定並稍作間距微調... */
</style>