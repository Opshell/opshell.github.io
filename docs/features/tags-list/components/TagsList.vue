<script setup lang="ts">
    import { useRouter } from 'vitepress';
    import type { TagSummary } from '@shared/data/tagSummeries';
    import type { Post } from '@shared/hooks/useBuildSiteData';
    import { tagSummaries } from '@shared/data/tagSummeries';
    import { useSiteData } from '@shared/hooks/useSiteData';

    // **關注點分離**{.brand}: 資料處理邏輯
    const siteData = useSiteData();
    const router = useRouter();

    const currentTag = ref('TypeScript');
    const currentPage = ref(1);
    const searchTerm = ref('');
    const pageSize = 10;

    // 初始化與路由監聽
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
    // --- Computed Logic ---
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
    const totalPage = computed(() => Math.ceil(totalCount.value / pageSize));
    const currentPageData = computed(() => {
        const start = (currentPage.value - 1) * pageSize;
        return postsOfCurrentTag.value.slice(start, start + pageSize);
    });

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

    // 日期格式化
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        if(isNaN(date.getTime())) return dateString;
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
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
            <header class="list-header">
                <div class="title-row">
                    <h1 class="tag-title">
                        <span class="hash">#</span> {{ currentTag }}
                    </h1>
                    <span class="post-count">{{ totalCount }} posts</span>
                </div>
                <p v-if="currentTagSummary" class="tag-desc">
                    {{ currentTagSummary.description }}
                </p>
            </header>

            <div class="cards-grid">
                <article
                    v-for="post in currentPageData"
                    :key="post.url"
                    class="modern-card"
                >
                    <a :href="post.url" class="card-link-wrapper">
                        <div class="card-body">
                            <div class="card-meta-header">
                                <div class="category-pill" v-if="post.category">
                                    <ElSvgIcon name="folder" class="icon" />
                                    {{ post.category }}
                                </div>
                                <div class="date-info">
                                    <ElSvgIcon name="calendar_month" class="icon" />
                                    {{ formatDate(post.date) }}
                                </div>
                            </div>

                            <h2 class="card-title">{{ post.title }}</h2>
                            <p class="card-excerpt">
                                {{ (post as any).excerpt || '點擊閱讀更多關於這篇文章的內容...' }}
                            </p>

                            <div class="card-footer">
                                <div class="tags-list">
                                    <span class="tag-pill"># {{ currentTag }}</span>
                                </div>
                                <span class="read-more">
                                    Read More
                                    <ElSvgIcon name="arrow_forward" class="icon arrow" />
                                </span>
                            </div>
                        </div>

                        <div class="card-thumbnail" v-if="post.image">
                            <img :src="post.image" loading="lazy" alt="cover" />
                        </div>
                    </a>
                </article>
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
    // **Variables & Mixins**
    $radius-card: 12px;
    $radius-pill: 6px;
    $transition-base: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    .tags-list-layout {
        display: flex;
        gap: 3rem;
        align-items: flex-start;
        max-width: 1100px;
        padding: 3rem 1.5rem;
        margin: 0 auto;
        @media (width <= 900px) {
            flex-direction: column;
            gap: 2rem;
        }
    }

    // --- Sidebar ---
    .sidebar {
        position: sticky;
        top: calc(var(--vp-nav-height) + 2rem);
        flex-shrink: 0;
        width: 260px;
        @media (width <= 900px) {
            position: relative;
            top: 0;
            width: 100%;
        }
    }

    .search-wrapper {
        position: relative;
        margin-bottom: 1.5rem;

        .icon {
            position: absolute;
            top: 50%;
            left: 12px;
            width: 16px;
            height: 16px;
            transform: translateY(-50%);
            fill: var(--vp-c-text-3);
        }

        input {
            background: var(--vp-c-bg-alt);
            width: 100%;
            padding: 10px 10px 10px 36px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            color: var(--vp-c-text-1);
            font-size: 0.9rem;
            transition: border-color 0.2s;

            &:focus {
                border-color: var(--vp-c-brand);
                outline: none;
            }
        }
    }

    .tags-nav {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-height: calc(100vh - 200px);
        overflow-y: auto;
        @media (width <= 900px) {
            flex-flow: row wrap;
            max-height: none;
        }

        .tag-link {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            border-radius: 6px;
            color: var(--vp-c-text-2);
            font-size: 0.95rem;
            text-decoration: none;
            transition: 0.2s;

            &:hover {
                background: var(--vp-c-bg-alt);
                color: var(--vp-c-brand);
            }

            &.active {
                background: color-mix(in srgb, var(--vp-c-brand) 10%, transparent);
                color: var(--vp-c-brand);
                font-weight: 600;
            }

            .count {
                background: var(--vp-c-bg-alt);
                padding: 1px 6px;
                border-radius: 10px;
                font-size: 0.8rem;
                opacity: 0.6;
            }

            // Mobile style override
            @media (width <= 900px) {
                background: var(--vp-c-bg-alt);
                border: 1px solid var(--vp-c-divider);
                .count { display: none; }
                &.active { border-color: var(--vp-c-brand); }
            }
        }
    }

    // --- Main Content ---
    .main-content {
        flex-grow: 1;
        width: 100%; // Avoid flex overflow
    }

    .list-header {
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--vp-c-divider);
        margin-bottom: 2rem;

        .title-row {
            display: flex;
            gap: 1rem;
            align-items: baseline;
            margin-bottom: 0.5rem;
        }

        .tag-title {
            margin: 0;
            color: var(--vp-c-text-1);
            font-size: 2rem;
            font-weight: 800;
            .hash {
                color: var(--vp-c-brand);
                opacity: 0.8;
            }
        }

        .post-count {
            color: var(--vp-c-text-3);
            font-family: var(--vp-font-family-mono);
            font-size: 0.9rem;
        }

        .tag-desc {
            margin: 0;
            color: var(--vp-c-text-2);
            line-height: 1.6;
        }
    }

    // --- Modern Card Style (The "React" Vibe) ---
    .cards-grid {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

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
            border-radius: $radius-pill;
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

    // --- Pagination ---
    .pagination-wrapper {
        display: flex;
        gap: 8px;
        justify-content: center;
        margin-top: 3rem;

        .page-num {
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--vp-c-bg);
            width: 40px;
            height: 40px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            color: var(--vp-c-text-2);
            text-decoration: none;
            transition: 0.2s;

            &:hover {
                border-color: var(--vp-c-brand);
                color: var(--vp-c-brand);
            }

            &.active {
                background: var(--vp-c-brand);
                border-color: var(--vp-c-brand);
                color: white;
            }
        }
    }
</style>