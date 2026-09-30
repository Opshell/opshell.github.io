<script setup lang="ts">
    import type { TagSummary } from '@shared/data/tagSummeries';
    import type { Post } from '@shared/schemas/post.schema';
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
            <h1 class="title">標籤</h1>
            <p class="subtitle">共 {{ allTags.length }} 個標籤。挑一個，看它底下的文章與寫作紀錄。</p>
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
                        <h3 class="card-title">寫作紀錄</h3>
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
    // 標籤頁（2026-10 翻新）：左邊是標籤索引（像書後面的索引，一行一個、右邊是篇數），
    // 右邊是這個標籤的說明、寫作紀錄（熱圖）與文章，全部寫在紙上、用細線分段，不用卡片。
    .tags-page {
        width: 100%;
        max-width: 68rem;
        padding: var(--nb-space-8) var(--nb-space-6);
        margin: 0 auto;
        color: var(--nb-ink);
        @include setRWD(768px) { padding: var(--nb-space-6) var(--nb-space-4) var(--nb-space-7); }

        :where(h1, h2, h3, p) { margin: 0; }

        &__hero {
            @include setFlex(flex-start, flex-start, var(--nb-space-2), column);
            padding-bottom: var(--nb-space-6);
            border-bottom: 1px solid var(--nb-rule);
            margin-bottom: var(--nb-space-7);

            .title {
                font-family: var(--nb-font-serif);
                font-size: var(--nb-step-5);
                font-weight: 700;
                line-height: 1.15;
            }
            .subtitle { color: var(--nb-ink-3); }
        }

        &__layout {
            display: grid;
            grid-template-columns: 15rem minmax(0, 1fr);
            gap: var(--nb-space-7);
            align-items: start;
        }
        &__muted {
            color: var(--nb-ink-3);
            font-size: var(--nb-step--1);
        }

        // #region [P] 左欄：索引
        &__sidebar {
            position: sticky;
            top: calc(var(--vp-nav-height) + var(--nb-space-5));
            @include setFlex(flex-start, stretch, var(--nb-space-4), column);
        }
        &__cloud {
            @include setFlex(flex-start, stretch, 0, column);
            max-height: calc(100vh - var(--vp-nav-height) - 10rem);
            overflow-y: auto;
        }

        // 一個標籤一行：名字……篇數；目前這個用螢光筆標在左邊
        &__chip {
            @include setFlex(space-between, baseline, var(--nb-space-2));
            padding: 5px var(--nb-space-2) 5px var(--nb-space-3);
            border-left: 3px solid transparent;
            color: var(--nb-ink-2);
            font-size: var(--nb-step--1);
            text-decoration: none;

            .hash { color: var(--nb-pencil); }
            .count {
                color: var(--nb-ink-3);
                font-size: var(--nb-step--2);
                font-variant-numeric: tabular-nums;
            }
            &:hover { color: var(--nb-link); }
            &:focus-visible {
                outline: 2px solid var(--nb-link);
                outline-offset: -2px;
            }
            &.is-active {
                border-left-color: var(--nb-marker);
                color: var(--nb-ink);
                font-weight: 700;
            }
        }

        // #endregion

        // #region [P] 右欄
        &__main {
            @include setFlex(flex-start, stretch, var(--nb-space-7), column);
            min-width: 0;
        }
        &__card {
            padding-bottom: var(--nb-space-6);
            border-bottom: 1px solid var(--nb-rule);
        }

        &__intro {
            @include setFlex(flex-start, stretch, var(--nb-space-2), column);

            .tag-name {
                font-family: var(--nb-font-serif);
                font-size: var(--nb-step-4);
                font-weight: 700;
                line-height: 1.2;

                .hash {
                    margin-right: .1em;
                    color: var(--nb-pencil);
                }
            }
            .tag-meta { color: var(--nb-ink-3); }
            .tag-title {
                margin-top: var(--nb-space-3);
                font-size: var(--nb-step-1);
                font-weight: 700;
            }
            .tag-desc {
                max-width: var(--nb-measure);
                color: var(--nb-ink-2);
                font-family: var(--nb-font-serif);
                line-height: 1.85;
            }
        }

        &__activity {
            .card-header {
                @include setFlex(space-between, center, var(--nb-space-2));
                margin-bottom: var(--nb-space-4);
            }
            .card-title {
                font-size: var(--nb-step-0);
                font-weight: 700;
            }
            .badge {
                color: var(--nb-ink-3);
                font-size: var(--nb-step--2);
            }
        }

        &__list {
            scroll-margin-top: calc(var(--vp-nav-height) + var(--nb-space-4));

            .list-header {
                @include setFlex(space-between, baseline, var(--nb-space-2));
                padding-bottom: var(--nb-space-2);
                border-bottom: 1px solid var(--nb-ink);
            }
            .list-title {
                @include setFlex(flex-start, baseline, var(--nb-space-2));
                font-size: var(--nb-step-0);
                font-weight: 700;
            }
            .list-count {
                color: var(--nb-ink-3);
                font-size: var(--nb-step--1);
                font-weight: 400;
            }
        }
        &__empty {
            padding: var(--nb-space-7) 0;
            color: var(--nb-ink-3);
            text-align: center;
        }
        &__pager {
            @include setFlex(center, center, var(--nb-space-1));
            margin-top: var(--nb-space-6);

            .el-btn {
                min-width: 36px;
                font-variant-numeric: tabular-nums;
            }
        }

        // #endregion

        // 換頁：淡入就好
        .list-enter-active,
        .list-leave-active { transition: opacity .2s ease; }
        .list-enter-from,
        .list-leave-to { opacity: 0; }

        // 平板以下：索引變成橫向的一串
        @include setRWD(960px) {
            &__layout {
                grid-template-columns: minmax(0, 1fr);
                gap: var(--nb-space-6);
            }
            &__sidebar { position: static; }
            &__cloud {
                flex-flow: row wrap;
                gap: var(--nb-space-1) var(--nb-space-2);
                max-height: none;
                overflow: visible;
            }
        }
        @media (prefers-reduced-motion: reduce) {
            .list-enter-active,
            .list-leave-active { transition: none; }
        }
    }
</style>
