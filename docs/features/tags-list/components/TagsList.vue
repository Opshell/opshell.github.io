<script setup lang="ts">
    import type { TagSummary } from '@shared/data/tagSummeries';
    import type { Post } from '@shared/hooks/useBuildSiteData';
    import { tagSummaries } from '@shared/data/tagSummeries';
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { computed, onMounted, ref, watch } from 'vue';
    import Heatmap from './Heatmap.vue';
    import PostCard from './PostCard.vue';

    // 標籤頁：左邊標籤雲、右邊該標籤的介紹、活動熱圖、文章清單（分頁）。
    // 狀態以網址為準（?tag=&page=），換標籤、換頁都用 replaceState 寫回網址，不重新載入。
    const siteData = useSiteData();

    const PAGE_SIZE = 10;
    const currentTag = ref('');
    const currentPage = ref(1);
    const searchTerm = ref('');
    const selectedDate = ref<string | null>(null);
    const listRef = ref<HTMLElement>();

    // #region [P] 標籤雲
    const allTags = computed(() => {
        if (!siteData.value) return [];
        return Array.from(siteData.value.tags.entries())
            .map(([name, data]) => ({ name, count: data.count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    });
    const filteredTags = computed(() => {
        const term = searchTerm.value.trim().toLowerCase();
        return term ? allTags.value.filter(tag => tag.name.toLowerCase().includes(term)) : allTags.value;
    });
    // #endregion

    // #region [P] 目前的標籤
    /** tagSummaries 的 key 跟實際標籤大小寫不一定一樣（vitepress vs VitePress），不分大小寫找 */
    const summary = computed<TagSummary | undefined>(() => {
        const key = Object.keys(tagSummaries).find(k => k.toLowerCase() === currentTag.value.toLowerCase());
        return key ? tagSummaries[key] : undefined;
    });

    const postsOfTag = computed<Post[]>(() => {
        const index = siteData.value?.tags.get(currentTag.value);
        if (!siteData.value || !index) return [];
        return index.postUrls
            .map(url => siteData.value!.posts.get(url))
            .filter((post): post is Post => !!post)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    /** 壞掉的日期給空字串，呼叫端跳過；不然 toISOString() 丟例外會讓整頁空白 */
    const toDay = (date: string) => {
        const d = new Date(date);
        return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    };

    /** 熱圖：這個標籤每天幾篇 */
    const heatmapData = computed(() => {
        const data: Record<string, number> = {};
        for (const post of postsOfTag.value) {
            const day = toDay(post.date);
            if (!day) continue;
            data[day] = (data[day] || 0) + 1;
        }
        return data;
    });

    const filteredPosts = computed(() => (selectedDate.value
        ? postsOfTag.value.filter(post => post.date && toDay(post.date) === selectedDate.value)
        : postsOfTag.value));

    const totalPage = computed(() => Math.max(1, Math.ceil(filteredPosts.value.length / PAGE_SIZE)));
    const pagePosts = computed(() => filteredPosts.value.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE));
    /** 頁碼：最多顯示 7 個，目前頁在中間 */
    const pageNumbers = computed(() => {
        const total = totalPage.value;
        const start = Math.max(1, Math.min(currentPage.value - 3, total - 6));
        return Array.from({ length: Math.min(7, total) }, (_, i) => start + i);
    });
    // #endregion

    // #region [P] 網址同步
    function readUrl() {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        currentTag.value = params.get('tag') || allTags.value[0]?.name || '';
        currentPage.value = Math.max(1, Number(params.get('page')) || 1);
    }
    function writeUrl() {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams({ tag: currentTag.value });
        if (currentPage.value > 1) params.set('page', String(currentPage.value));
        history.replaceState(null, '', `?${params}`);
    }

    function selectTag(name: string, event: MouseEvent) {
        if (event.metaKey || event.ctrlKey) return; // 新分頁開，交給瀏覽器
        event.preventDefault();
        currentTag.value = name;
        selectedDate.value = null;
        currentPage.value = 1;
        writeUrl();
    }
    function goPage(page: number) {
        currentPage.value = Math.min(Math.max(1, page), totalPage.value);
        writeUrl();
        listRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function onDateSelect(date: string | null) {
        selectedDate.value = date;
        currentPage.value = 1;
    }

    // 頁數超過範圍（篩日期之後）就拉回最後一頁
    watch(totalPage, (total) => { if (currentPage.value > total) currentPage.value = total; });
    onMounted(() => {
        readUrl();
        window.addEventListener('popstate', readUrl);
    });
    // #endregion
</script>

<template>
    <div class="tags-page">
        <header class="tags-page__hero">
            <h1 class="title">Tags</h1>
            <p class="subtitle">共 {{ allTags.length }} 個標籤。挑一個，看它底下的文章與活動。</p>
        </header>

        <div class="tags-page__layout">
            <!-- #region [P] 標籤雲 -->
            <aside class="tags-page__sidebar">
                <ElInput v-model="searchTerm" type="search" placeholder="篩選標籤…" aria-label="篩選標籤">
                    <template #icon><ElSvgIcon name="pageview" /></template>
                </ElInput>

                <nav class="tags-page__cloud" aria-label="標籤">
                    <a
                        v-for="tag in filteredTags"
                        :key="tag.name"
                        class="tags-page__chip"
                        :class="{ 'is-active': currentTag === tag.name }"
                        :href="`?tag=${encodeURIComponent(tag.name)}`"
                        :aria-current="currentTag === tag.name ? 'page' : undefined"
                        @click="selectTag(tag.name, $event)"
                    >
                        <span class="name"><span class="hash">#</span>{{ tag.name }}</span>
                        <span class="count">{{ tag.count }}</span>
                    </a>
                    <p v-if="!filteredTags.length" class="tags-page__muted">沒有符合的標籤</p>
                </nav>
            </aside>
            <!-- #endregion -->

            <main class="tags-page__main">
                <!-- #region [P] 標籤介紹 -->
                <section class="tags-page__card tags-page__intro">
                    <h2 class="tag-name"><span class="hash">#</span>{{ currentTag }}</h2>
                    <p class="tag-meta">{{ postsOfTag.length }} 篇文章</p>
                    <template v-if="summary">
                        <h3 class="tag-title">{{ summary.title }}</h3>
                        <p class="tag-desc">{{ summary.description }}</p>
                    </template>
                </section>
                <!-- #endregion -->

                <!-- #region [P] 活動熱圖 -->
                <section class="tags-page__card tags-page__activity">
                    <div class="card-header">
                        <h3 class="card-title">Activity</h3>
                        <ElBtn v-if="selectedDate" size="sm" variant="primary" title="清除日期篩選" @click="onDateSelect(null)">
                            {{ selectedDate }} ✕
                        </ElBtn>
                        <span v-else class="badge">點日期可以篩選</span>
                    </div>
                    <Heatmap :data="heatmapData" @select-date="onDateSelect" />
                </section>
                <!-- #endregion -->

                <!-- #region [P] 文章清單 -->
                <section ref="listRef" class="tags-page__list">
                    <header class="list-header">
                        <h3 class="list-title">
                            文章
                            <span class="list-count">{{ filteredPosts.length }}</span>
                        </h3>
                        <span v-if="totalPage > 1" class="tags-page__muted">第 {{ currentPage }} / {{ totalPage }} 頁</span>
                    </header>

                    <TransitionGroup name="list" tag="div" class="list-body">
                        <PostCard v-for="post in pagePosts" :key="post.url" :post />
                    </TransitionGroup>

                    <p v-if="!pagePosts.length" class="tags-page__empty">
                        {{ selectedDate ? '這一天沒有這個標籤的文章' : '這個標籤底下還沒有文章' }}
                    </p>

                    <nav v-if="totalPage > 1" class="tags-page__pager" aria-label="分頁">
                        <ElBtn size="sm" :disabled="currentPage === 1" aria-label="上一頁" @click="goPage(currentPage - 1)">‹</ElBtn>
                        <ElBtn
                            v-for="page in pageNumbers"
                            :key="page"
                            size="sm"
                            :variant="page === currentPage ? 'primary' : 'ghost'"
                            :aria-current="page === currentPage ? 'page' : undefined"
                            @click="goPage(page)"
                        >
                            {{ page }}
                        </ElBtn>
                        <ElBtn size="sm" :disabled="currentPage === totalPage" aria-label="下一頁" @click="goPage(currentPage + 1)">›</ElBtn>
                    </nav>
                </section>
                <!-- #endregion -->
            </main>
        </div>
    </div>
</template>

<style lang="scss">
    .tags-page {
        max-width: var(--view-width);
        padding: 2rem 1.5rem 4rem;
        margin: 0 auto;

        &__hero {
            margin-bottom: 2rem;

            .title {
                display: inline-block;
                background: var(--vp-home-hero-name-background);
                -webkit-background-clip: text;
                background-clip: text;
                margin: 0;
                font-size: 2.5rem;
                font-weight: 800;
                line-height: 1.4;
                -webkit-text-fill-color: transparent;
            }
            .subtitle {
                margin: .25rem 0 0;
                color: var(--vp-c-text-2);
            }
        }

        &__layout {
            display: grid;
            grid-template-columns: 260px minmax(0, 1fr);
            gap: 2.5rem;
            align-items: start;
        }

        &__muted {
            margin: 0;
            color: var(--vp-c-text-3);
            font-size: var(--font-size-s);
        }

        // #region [P] 左欄
        &__sidebar {
            position: sticky;
            top: calc(var(--vp-nav-height) + 1.5rem);
            @include setFlex(flex-start, stretch, 1rem, column);
        }

        &__cloud {
            @include setFlex(flex-start, stretch, 4px, column);
            max-height: calc(100vh - var(--vp-nav-height) - 8rem);
            padding-right: 4px;
            overflow-y: auto;
        }

        &__chip {
            @include setFlex(space-between, center, 8px);
            padding: 8px 12px;
            border-radius: 10px;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            text-decoration: none;
            transition: .2s var(--cubic-FiSo);

            .hash {
                margin-right: 2px;
                color: var(--vp-c-brand-1);
                opacity: .7;
            }
            .count {
                background: var(--vp-c-bg-soft);
                min-width: 1.75em;
                padding: 2px 8px;
                border-radius: 999px;
                color: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: var(--font-size-xs);
                text-align: center;
            }

            &:hover {
                background: var(--vp-c-bg-soft);
                color: var(--vp-c-brand);
                transform: translateX(4px);
            }
            &.is-active {
                background: color-mix(in srgb, var(--vp-c-brand) 15%, transparent);
                box-shadow: inset 3px 0 0 var(--vp-c-brand);
                color: var(--vp-c-brand);
                font-weight: 600;

                .count {
                    background: var(--vp-c-brand);
                    color: var(--color-gray-000);
                }
            }
        }

        // #endregion

        // #region [P] 右欄
        &__main {
            @include setFlex(flex-start, stretch, 1.5rem, column);
            min-width: 0;
        }

        &__card {
            background: var(--vp-c-bg-soft);
            padding: 1.5rem;
            border: 1px solid var(--vp-c-divider);
            border-radius: 1rem;
        }

        &__intro {
            .tag-name {
                display: inline-block;
                background: var(--vp-home-hero-name-background);
                -webkit-background-clip: text;
                background-clip: text;
                padding: 0;
                border: 0;
                margin: 0;
                font-size: var(--font-size-xxl);
                font-weight: 800;
                line-height: 1.3;
                -webkit-text-fill-color: transparent;

                .hash { margin-right: 4px; }
            }
            .tag-meta {
                margin: 0;
                color: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: var(--font-size-s);
            }
            .tag-title {
                padding: 0;
                border: 0;
                margin: 1rem 0 .25rem;
                color: var(--vp-c-text-1);
                font-size: var(--font-size-l);
                font-weight: 600;
            }
            .tag-desc {
                margin: 0;
                color: var(--vp-c-text-2);
                line-height: 1.7;
            }
        }

        &__activity {
            .card-header {
                @include setFlex(space-between, center, 8px);
                margin-bottom: 1rem;
            }
            .card-title {
                padding: 0;
                border: 0;
                margin: 0;
                font-size: var(--font-size-m);
                font-weight: 600;
            }
            .badge {
                background: var(--vp-c-bg);
                padding: 4px 10px;
                border: 0;
                border-radius: 999px;
                color: var(--vp-c-text-3);
                font-size: var(--font-size-xs);

            }
        }

        &__list {
            scroll-margin-top: calc(var(--vp-nav-height) + 1rem);

            .list-header {
                @include setFlex(space-between, baseline, 8px);
                margin-bottom: 1rem;
            }
            .list-title {
                @include setFlex(flex-start, baseline, 8px);
                padding: 0;
                border: 0;
                margin: 0;
                font-size: var(--font-size-l);
                font-weight: 700;
            }
            .list-count {
                color: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: var(--font-size-s);
                font-weight: 400;
            }
            .list-body { @include setFlex(flex-start, stretch, 1rem, column); }
        }

        &__empty {
            background: var(--vp-c-bg-soft);
            padding: 3rem 1rem;
            border-radius: 1rem;
            margin: 0;
            color: var(--vp-c-text-3);
            text-align: center;
        }

        &__pager {
            @include setFlex(center, center, 6px);
            margin-top: 1.5rem;

            .el-btn {
                min-width: 32px;
                font-family: var(--vp-font-family-mono);
            }
        }

        // #endregion

        // 清單切換
        .list-enter-active,
        .list-leave-active { transition: .3s var(--cubic-FiSo); }
        .list-enter-from,
        .list-leave-to {
            transform: translateY(12px);
            opacity: 0;
        }

        // #region [P] RWD：平板以下左欄變成橫向的標籤列
        @include setRWD(960px) {
            &__layout {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
            &__sidebar { position: static; }
            &__cloud {
                flex-flow: row wrap;
                max-height: none;
                overflow: visible;
            }
            &__chip {
                padding: 6px 10px;

                &:hover { transform: none; }
            }
        }

        // #endregion
    }
</style>
