<script setup lang="ts">
    import { useData, useRouter } from 'vitepress';
    import { type TagSummary, tagSummaries } from '@data/tagSummeries';
    import { iClassification } from '@hooks/useArticleClassification';

    const { theme } = useData();

    // 取得全部分類
    const classification = computed(() => theme.value.classification as iClassification);

    const urlParams = ref(new URLSearchParams(window.location.search));
    const currentTag = ref(urlParams.value.get('tag') ? urlParams.value.get('tag') : 'TypeScript'); // 當前Tag
    const currentPage = ref(urlParams.value.get('page') ? Number(urlParams.value.get('page')) : 1); // 當前頁碼

    const router = useRouter();
    router.onAfterRouteChanged = (to) => {
        urlParams.value = new URLSearchParams(to.split('?')[1]);

        currentTag.value = urlParams.value.get('tag') ? urlParams.value.get('tag') : 'TypeScript'; // 當前Tag
        currentPage.value = urlParams.value.get('page') ? Number(urlParams.value.get('page')) : 1; // 當前頁碼
    };

    const pageSize = 10; // 每頁顯示幾筆

    // 總筆數
    const totalCount = computed(() => {
        return classification.value.tags[currentTag.value as string].group.length;
    });

    // 總頁數
    const totalPage = computed(() => {
        return Math.ceil(totalCount.value / pageSize);
    });

    // 取出當前頁面的資料
    const currentPageData = computed(() => {
        const start = (currentPage.value - 1) * pageSize;
        const end = currentPage.value * pageSize;
        return classification.value.tags[currentTag.value as string].group.slice(start, end);
    });

    // 目前Tag的摘要資訊(如果有的話)
    const currentTagSummary = computed<TagSummary | undefined>(() => {
        return tagSummaries[currentTag.value as string];
    });
</script>

<template>
    <div class="article-list-block">
        <div class="left-block">
            <a
                v-for="(info, tag) in classification.tags"
                :key="`tabs-${tag}`"
                class="tab"
                :class="[{ current: currentTag === tag }]"
                :href="`?tag=${tag}&page=1`"
            >
                <span>{{ tag }}: {{ info.count }}</span>
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
            gap: 10px;
            background-color: var(--vp-c-bg);
            @include setSize(100%, 100%);
            max-width: 300px;
            padding: 1.5rem 0;

            .tab {
                padding: 5px 10px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 5px;
                color: var(--vp-c-text-1);
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: 0.4s;
                &:hover {
                    color: var(--vp-c-brand);
                }
                &.current {
                    color: var(--vp-c-brand);
                }
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
