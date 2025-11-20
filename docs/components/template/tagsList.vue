<script setup lang="ts">
    import type { TagSummary } from '@data/tagSummeries';
    import type { Post } from '@/hooks/useBuildSiteData';
    import { tagSummaries } from '@data/tagSummeries';
    import { useSiteData } from '@hooks/useSiteData';
    import { useRouter } from 'vitepress';

    const siteData = useSiteData();

    const currentTag = ref('TypeScript'); // 當前Tag
    const currentPage = ref(1); // 當前頁碼

    onMounted(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tag')) {
            currentTag.value = urlParams.get('tag')!;
        }
        if (urlParams.get('page')) {
            currentPage.value = Number(urlParams.get('page'));
        }
    });

    const router = useRouter();
    router.onAfterRouteChanged = (to) => {
        const urlParams = new URLSearchParams(to.split('?')[1]);

        currentTag.value = urlParams.get('tag') ? urlParams.get('tag')! : 'TypeScript'; // 當前Tag
        currentPage.value = urlParams.get('page') ? Number(urlParams.get('page')) : 1; // 當前頁碼
    };

    const pageSize = 10; // 每頁顯示幾筆

    // 取得當前 Tag 的所有文章
    const postsOfCurrentTag = computed<Post[]>(() => {
        if (!siteData.value || !currentTag.value)
            return [];

        const tagIndex = siteData.value.tags.get(currentTag.value);
        if (!tagIndex)
            return [];

        // 根據 url 列表，從 posts Map 中取出完整的文章資料
        // .filter(Boolean) 是一個小技巧，可以過濾掉因意外 url 錯誤而找不到的 post (undefined)
        return tagIndex.postUrls
            .map(url => siteData.value?.posts.get(url))
            .filter(Boolean) as Post[];
    });

    // 總筆數
    const totalCount = computed(() => postsOfCurrentTag.value.length);
    // 總頁數
    const totalPage = computed(() => Math.ceil(totalCount.value / pageSize));
    // 取出當前頁面的資料
    const currentPageData = computed(() => {
        const start = (currentPage.value - 1) * pageSize;
        const end = currentPage.value * pageSize;

        return postsOfCurrentTag.value.slice(start, end);
    });

    // [-] 目前Tag的摘要資訊(如果有的話)
    const currentTagSummary = computed<TagSummary | undefined>(() => {
        return tagSummaries[currentTag.value as string];
    });

    // [P] 標籤搜尋
    const searchTerm = ref('');
    const filteredTags = computed(() => {
        if (!siteData.value)
            return [];

        // 從 Map 轉換為陣列
        const tagsAsArray = Array.from(siteData.value.tags.entries()).map(([name, data]) => ({
            name,
            count: data.count
        }));

        if (!searchTerm.value) {
            return tagsAsArray;
        }

        // 篩選邏輯不變
        return tagsAsArray.filter(tag =>
            tag.name.toLowerCase().includes(searchTerm.value.toLowerCase())
        );
    });

    // [P] 標籤雲效果
    // 從原始資料計算最大與最小值
    const allCounts = computed(() => {
        if (!siteData.value) { return []; }

        // 從 Map 的 values() 中取得所有 count
        return Array.from(siteData.value.tags.values()).map(tag => tag.count);
    });
    const maxCount = computed(() => Math.max(...allCounts.value));
    const minCount = computed(() => Math.min(...allCounts.value));

    // 計算樣式的函式
    function getTagStyle(count: number) {
        const minFontSize = 1; // rem
        const maxFontSize = 1.8; // rem

        // 避免分母為 0
        if (maxCount.value === minCount.value) {
            return { fontSize: `${minFontSize}rem` };
        }

        const ratio = (count - minCount.value) / (maxCount.value - minCount.value);
        const fontSize = minFontSize + (maxFontSize - minFontSize) * ratio;

        return {
            fontSize: `${fontSize.toFixed(2)}rem`
        };
    }

    // 計算顏色的函式 (使用階層式 Class)
    function getTagClass(count: number) {
        const tiers = 5; // 分成 5 個等級
        const range = maxCount.value - minCount.value;
        if (range === 0)
            return 'tag-level-1';

        const level = Math.ceil(((count - minCount.value) / range) * tiers);
        return `tag-level-${Math.max(1, level)}`; // 確保至少是 level-1
    }
</script>

<template>
    <div class="article-list-block">
        <div class="left-block">
            <div class="search-box">
                <input v-model="searchTerm" type="text" placeholder="搜尋標籤..." />
            </div>
            <a
                v-for="tag in filteredTags"
                :key="`tabs-${tag.name}`"
                class="tab"
                :class="[
                    { current: currentTag === tag.name },
                    getTagClass(tag.count),
                ]"
                :style="getTagStyle(tag.count)"
                :href="`?tag=${tag}&page=1`"
            >
                <span>{{ tag.name }}: {{ tag.count }}</span>
            </a>
        </div>

        <div class="right-block">
            <div v-if="currentTagSummary" class="tag-summary-block">
                <h2>{{ currentTagSummary.title }}</h2>
                <p>{{ currentTagSummary.description }}</p>
            </div>

            <ul class="list-block">
                <li v-for="item in currentPageData" :key="`list-${currentTag}-${currentPage}-${item.title}`">
                    <a :href="`${item.url}`" class="item-box">
                        <img class="image" :src="item.image || '/images/no_image.jpg'" />
                        <span class="date">
                            <ElSvgIcon name="calendar_month" />
                            {{ item.date }}
                        </span>
                        <span class="category">
                            <ElSvgIcon name="folder" />
                            {{ item.category }}
                        </span>
                        <h3 class="title">{{ item.title }}</h3>
                        <span class="view">
                            <ElSvgIcon name="pageview" />
                            view
                        </span>
                    </a>
                </li>
            </ul>

            <div class="pagination-box">
                <template v-for="num in totalPage" :key="`page-${num}`">
                    <a
                        v-if="num !== currentPage"
                        :href="`?tag=${currentTag}&page=${num}`"
                        class="pagination"
                    >
                        {{ num }}
                    </a>
                    <span v-else class="pagination current">{{ num }}</span>
                </template>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
    .article-list-block {
        position: relative;
        @include setFlex(space-between, stretch, 1.5rem);
        width: 100%;

        // height: calc(100dvh - var(--vp-nav-height) - 113px);
        padding: 0 calc((100% - 1200px) / 2);
        margin: 0 auto;

        .left-block {
            position: sticky;
            top: var(--vp-nav-height);
            @include setFlex(flex-start);
            flex-wrap: wrap;

            // gap: 10px;
            background-color: var(--vp-c-bg);
            @include setSize(100%, 100%);
            max-width: 300px;
            padding: 1.5rem 0;

            .tab {
                padding: 5px 10px;

                // border: 1px solid var(--vp-c-divider);
                border-radius: 5px;
                color: var(--vp-c-text-1);
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: 0.2s;

                // 定義不同等級的顏色
                @for $i from 1 through 5 {
                    &.tag-level-#{$i} {
                        // $i/5 會得到 0.2, 0.4, ..., 1
                        // 讓顏色從 70% 亮度 變到 100% 亮度的品牌色
                        color: color-mix(in srgb, var(--vp-c-text-2) 30%, var(--vp-c-brand) calc($i / 5 * 100%));
                    }
                }

                &.current, &:hover {
                    color: var(--vp-c-brand-dark);
                    transform: scale(1.1); // 加個小互動
                }

                // &:hover {
                //     color: var(--vp-c-brand);

                // }
                // &.current {
                //     color: var(--vp-c-brand);
                // }
            }
        }

        .right-block {
            @include setFlex(flex-start, stretch, 10px, column);
            gap: 10px;
            width: 100%;
            padding: 1.5rem 0;
        }
        .tag-summary-block {
            background-color: var(--vp-c-bg-soft);
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 1rem; // 與文章列表拉開距離

            h2 {
                border-bottom: none; // 覆蓋 vitepress 預設樣式
                margin-bottom: 0.5rem;
                font-size: 1.8rem;
                font-weight: 600;
            }

            p {
                color: var(--vp-c-text-2);
                font-size: 1rem;
                line-height: 1.7;
            }
        }
        .list-block {
            flex-grow: 1;
            @include setFlex(flex-start, stretch, 10px, column);
            .item-box {
                display: grid;
                grid-template-areas: "image date category view"
                                     "image title title   view";
                grid-template-columns: 120px 140px 1fr 100px;
                gap: 10px;
                align-items: center;
                min-height: 80px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 10px;

                &:hover {
                    .date, .category {
                        color: var(--vp-c-text-2);
                        transition-delay: 0.05s;
                    }
                    .title {
                        color: var(--vp-c-brand);
                    }
                }
            }

            .image {
                grid-area: image;
                background: var(--vp-c-divider);
                border-radius: 5px 0 0 5px;
            }

            .date {
                grid-area: date;
                place-self: flex-end start;
                @include setFlex();
                padding-left: .625rem;
                color: var(--vp-c-text-3);
                transition: 0.25s;
                .icon {
                    @include setSize(22px, 22px);
                    transform: translate(-3px, -1px);
                }
            }
            .category {
                grid-area: category;
                place-self: flex-end start;
                color: var(--vp-c-text-3);
                transform: translateY(-2px);
                transition: 0.25s;
                @include setFlex();
                .icon {
                    @include setSize(24px, 24px);
                    transform: translateX(-2px);
                }
            }
            .title {
                grid-area: title;
                padding-left: .625rem;
                color: var(--vp-c-text-1);
                font-size: 1.6rem;
                line-height: 2.4rem;
                transition: 0.25s;
            }
            .view {
                grid-area: view;
                justify-self: start;
                @include setFlex();
                color: var(--vp-c-text-1);
                font-size: 1.25rem;
                .icon {
                    margin-right: 5px;
                }
            }
        }

        .pagination-box {
            @include setFlex();
            gap: 5px;
            @include setSize(100%, 80px);

            .pagination {
                @include setFlex();
                background: var(--vp-c-bg-alt);
                @include setSize(40px, 40px);
                padding: 5px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 3px;
                color: var(--vp-c-text-3);
                font-size: 1rem;
                font-weight: 500;
                transition: .25s $cubic-FiSo;

                &:hover {
                    background: var(--vp-c-brand);
                    color: var(--vp-c-text-1);
                }

                &.current {
                    background: var(--vp-c-brand);
                    color: var(--vp-c-text-1);
                }
            }
        }
    }
</style>
