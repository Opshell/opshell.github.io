<script setup lang="ts">
    import type { TagSummary } from '@shared/data/tagSummeries';
    import type { Post } from '@shared/schemas/post.schema';
    import type { TagSort } from '../tagSpectrum';
    import { tagSummaries } from '@shared/data/tagSummeries';
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { hueVar } from '@shared/utils/spectrum';
    import { computed, onMounted, ref, watch } from 'vue';
    import { sortTags, splitTags, tagInfos } from '../tagSpectrum';
    import Heatmap from './Heatmap.vue';
    import PostCard from './PostCard.vue';

    // 標籤頁：左邊標籤的光譜索引、右邊該標籤的介紹、活動熱圖、文章清單（分頁）。
    // 狀態以網址為準（?tag=&page=），換標籤、換頁都用 replaceState 寫回網址，不重新載入。
    const siteData = useSiteData();

    const PAGE_SIZE = 10;
    const currentTag = ref('');
    const currentPage = ref(1);
    const searchTerm = ref('');
    const selectedDate = ref<string | null>(null);
    const listRef = ref<HTMLElement>();

    // #region [P] 光譜索引：大的標籤一列一條光，零星的收成一團（2026-10「稜鏡」翻新）
    const sortBy = ref<TagSort>('count');
    const allTags = computed(() => (siteData.value ? sortTags(tagInfos(siteData.value.tags, siteData.value.posts), sortBy.value) : []));
    const maxCount = computed(() => Math.max(1, ...allTags.value.map(tag => tag.count)));
    const filteredTags = computed(() => {
        const term = searchTerm.value.trim().toLowerCase();
        return term ? allTags.value.filter(tag => tag.name.toLowerCase().includes(term)) : allTags.value;
    });
    const groups = computed(() => splitTags(filteredTags.value, !!searchTerm.value.trim()));
    const currentInfo = computed(() => allTags.value.find(tag => tag.name === currentTag.value));
    /** 零星的小籤用主要那一類的顏色 */
    const mainHue = (tag: { segments: { hue: Parameters<typeof hueVar>[0] }[] }) => (tag.segments[0] ? hueVar(tag.segments[0].hue) : 'var(--vp-c-text-3)');
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
            <!-- #region [P] 光譜索引 -->
            <aside class="tags-page__sidebar">
                <ElInput v-model="searchTerm" type="search" placeholder="篩選標籤…" aria-label="篩選標籤">
                    <template #icon><ElSvgIcon name="pageview" /></template>
                </ElInput>

                <div class="tags-page__sort" role="group" aria-label="標籤排序">
                    <button type="button" :aria-pressed="sortBy === 'count'" @click="sortBy = 'count'">篇數</button>
                    <button type="button" :aria-pressed="sortBy === 'recent'" @click="sortBy = 'recent'">最近寫的</button>
                </div>

                <nav class="tags-page__index" aria-label="標籤">
                    <a
                        v-for="tag in groups.major"
                        :key="tag.name"
                        class="tags-page__row"
                        :class="{ 'is-active': currentTag === tag.name }"
                        :href="`?tag=${encodeURIComponent(tag.name)}`"
                        :aria-current="currentTag === tag.name ? 'page' : undefined"
                        @click="selectTag(tag.name, $event)"
                    >
                        <span class="name"><span class="hash">#</span>{{ tag.name }}</span>
                        <span class="count">{{ tag.count }}</span>
                        <!-- 一條光：長度是篇數，顏色照分類比例分段 -->
                        <span class="beam" aria-hidden="true">
                            <span class="light" :style="{ width: `${(tag.count / maxCount) * 100}%` }">
                                <span v-for="segment in tag.segments" :key="segment.category" :style="{ flexGrow: segment.count, background: hueVar(segment.hue) }" />
                            </span>
                        </span>
                    </a>

                    <template v-if="groups.minor.length">
                        <p class="tags-page__minor-title">零星的 {{ groups.minor.length }} 個<span>（1～2 篇）</span></p>
                        <div class="tags-page__minor">
                            <a
                                v-for="tag in groups.minor"
                                :key="tag.name"
                                class="tags-page__pebble"
                                :class="{ 'is-active': currentTag === tag.name }"
                                :style="{ '--hue': mainHue(tag) }"
                                :href="`?tag=${encodeURIComponent(tag.name)}`"
                                :aria-current="currentTag === tag.name ? 'page' : undefined"
                                @click="selectTag(tag.name, $event)"
                            >{{ tag.name }}<small>{{ tag.count }}</small></a>
                        </div>
                    </template>
                    <p v-if="!filteredTags.length" class="tags-page__muted">沒有符合的標籤</p>
                </nav>
            </aside>
            <!-- #endregion -->

            <main class="tags-page__main">
                <!-- #region [P] 標籤介紹 -->
                <section class="tags-page__card tags-page__intro">
                    <h2 class="tag-name"><span class="hash">#</span>{{ currentTag }}</h2>
                    <p class="tag-meta">{{ postsOfTag.length }} 篇文章</p>
                    <!-- 這個標籤由哪幾類組成：跟左欄那條光同一個比例 -->
                    <div v-if="currentInfo?.segments.length" class="tag-spectrum">
                        <span class="light" aria-hidden="true">
                            <span v-for="segment in currentInfo.segments" :key="segment.category" :style="{ flexGrow: segment.count, background: hueVar(segment.hue) }" />
                        </span>
                        <ul>
                            <li v-for="segment in currentInfo.segments" :key="segment.category" :style="{ '--hue': hueVar(segment.hue) }">
                                {{ segment.label }} <span>{{ segment.count }}</span>
                            </li>
                        </ul>
                    </div>
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
            grid-template-columns: 280px minmax(0, 1fr);
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
            top: calc(var(--vp-nav-height) + 1rem);
            @include setFlex(flex-start, stretch, .75rem, column);
            max-height: calc(100vh - var(--vp-nav-height) - 1.75rem);
            overflow-y: auto;
            scrollbar-width: thin;

            // 可以捲的 flex 欄會把子元素壓扁（篩選框曾被壓成一半高）
            > * { flex-shrink: 0; }
        }

        &__sort {
            display: flex;
            gap: 2px;
            background: var(--vp-c-bg-soft);
            padding: 3px;
            border-radius: 10px;

            button {
                flex: 1;
                background: transparent;
                padding: 4px 8px;
                border: 0;
                border-radius: 7px;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-xs);
                font-weight: 600;
                cursor: pointer;

                &[aria-pressed=true] {
                    background: var(--vp-c-bg);
                    box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
                    color: var(--vp-c-text-1);
                }
                &:focus-visible { outline: 2px solid var(--vp-c-brand-1); }
            }
        }

        // 整欄放得下：零星的標籤收成一團，不再需要自己的捲軸（畫面比左欄矮時，整個左欄才捲，見 __sidebar）
        &__index {
            @include setFlex(flex-start, stretch, 1px, column);
        }

        // 一列：名字、篇數，底下一條光
        &__row {
            display: grid;
            grid-template:
                'name count' auto
                'beam beam' auto / minmax(0, 1fr) auto;
            gap: 3px 8px;
            padding: 5px 10px 6px;
            border-radius: 8px;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            text-decoration: none;
            transition: background .2s var(--cubic-FiSo), color .2s var(--cubic-FiSo);

            .name {
                grid-area: name;
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }
            .hash {
                margin-right: 1px;
                color: var(--vp-c-text-3);
            }
            .count {
                grid-area: count;
                color: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: var(--font-size-xs);
            }
            .beam {
                grid-area: beam;
                display: block;
                background: var(--vp-c-default-soft);
                height: 3px;
                border-radius: 2px;
                overflow: hidden;
            }
            .light {
                display: flex;
                height: 100%;
                opacity: .75;

                span { flex-basis: 0; }
            }
            &:hover {
                background: var(--vp-c-bg-soft);
                color: var(--vp-c-text-1);

                .light { opacity: 1; }
            }
            &:focus-visible {
                outline: 2px solid var(--vp-c-brand-1);
                outline-offset: -2px;
            }
            &.is-active {
                background: var(--vp-c-bg-soft);
                color: var(--vp-c-text-1);
                font-weight: 700;

                .count { color: var(--vp-c-text-1); }
                .beam { height: 5px; }
                .light { opacity: 1; }
            }
        }
        .dark &__row.is-active .light { filter: drop-shadow(0 0 4px rgb(255 255 255 / 25%)); }

        &__minor-title {
            padding: 0 10px;
            margin: .75rem 0 .4rem;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-xs);
            font-weight: 600;

            span {
                color: var(--vp-c-text-3);
                font-weight: 400;
            }
        }

        // 零星的小籤：不加框，一個分類色的小點＋名字，像一段文字裡的關鍵字，一行放得下三四個
        &__minor {
            display: flex;
            flex-wrap: wrap;
            gap: 2px 12px;
            padding: 0 10px;
        }
        &__pebble {
            @include setFlex(flex-start, center, 4px);
            padding: 2px 0;
            border-radius: 4px;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-xs);
            text-decoration: none;

            &::before {
                content: '';
                @include setSize(6px, 6px);
                background: var(--hue);
                border-radius: 50%;
            }
            small {
                color: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: 10px;
            }
            &:hover { color: var(--vp-c-text-1); }
            &:focus-visible { outline: 2px solid var(--vp-c-brand-1); }
            &.is-active {
                color: var(--vp-c-text-1);
                font-weight: 700;
                text-decoration: underline 2px var(--hue);
                text-underline-offset: 4px;
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
            .tag-spectrum {
                @include setFlex(flex-start, stretch, .6rem, column);
                margin-top: 1rem;

                .light {
                    display: flex;
                    height: 6px;
                    border-radius: 3px;
                    overflow: hidden;

                    span { flex-basis: 0; }
                }
                ul {
                    display: flex;
                    flex-wrap: wrap;
                    gap: .25rem 1.25rem;
                    padding: 0;
                    margin: 0;
                    color: var(--vp-c-text-2);
                    font-size: var(--font-size-s);
                    list-style: none;
                }
                li {
                    @include setFlex(flex-start, center, 6px);

                    &::before {
                        content: '';
                        @include setSize(8px, 8px);
                        background: var(--hue);
                        border-radius: 50%;
                    }
                    span {
                        color: var(--vp-c-text-3);
                        font-family: var(--vp-font-family-mono);
                        font-size: var(--font-size-xs);
                    }
                }
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

            // 窄螢幕：光譜索引排成兩三欄，零星的照樣一團
            &__index {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                max-height: none;
                overflow: visible;
            }
            &__minor-title,
            &__minor,
            &__index > .tags-page__muted { grid-column: 1 / -1; }
        }

        // #endregion
    }
</style>
