<script setup lang="ts">
    import { useData, useRouter } from 'vitepress';

    import { iClassification } from '@/hooks/useArticleClassification';

    const { theme } = useData();

    // 取得全部分類
    const classification = computed(() => theme.value.classification as iClassification);

    const urlParams = ref(new URLSearchParams(window.location.search));
    const currentTag = ref(urlParams.value.get('tag') ? urlParams.value.get('tag') : 'typescript'); // 當前Tag
    const currentPage = ref(urlParams.value.get('page') ? Number(urlParams.value.get('page')) : 1); // 當前頁碼

    const router = useRouter();
    router.onAfterRouteChanged = (to) => {
        urlParams.value = new URLSearchParams(to.split('?')[1]);

        currentTag.value = urlParams.value.get('tag') ? urlParams.value.get('tag') : 'typescript'; // 當前Tag
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
</script>

<template>
    <div class="articel-list-block">
        <div class="tabs-header">
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

        <ul class="list-block">
            <li v-for="item in currentPageData" :key="`list-${currentTag}-${currentPage}-${item.title}`">
                <a :href="`${item.url}`" class="item-box">
                    <span class="date">{{ item.date }}</span>
                    <span class="category"> {{ item.category }}</span>
                    <h3 class="title">{{ item.title }}</h3>
                    <span class="view">
                        view
                        <ElSvgIcon name="eye" />
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
</template>

<style lang="scss" scoped>
    .articel-list-block {
        position: relative;
        @include setFlex(space-between, stretch, 0, column);
        width: 100%;

        // height: calc(100dvh - var(--vp-nav-height) - 113px);
        padding: 0 calc((100% - 900px) / 2);
        margin: 0 auto;

        .tabs-header {
            position: sticky;
            top: 0;
            gap: 10px;
            background-color: var(--vp-c-bg);
            padding: 1.563rem;
            @include setFlex();
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

        .list-block {
            flex-grow: 1;
            @include setFlex(flex-start, stretch, 10px, column);
            .item-box {
                display: grid;
                grid-template-areas: "date category view"
                                     "title title   view";
                grid-template-columns: 100px 1fr 100px;
                gap: 15px;
                padding: 10px 20px 15px;
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

            .date {
                grid-area: date;
                color: var(--vp-c-text-3);
                transition: 0.25s;
            }
            .category {
                grid-area: category;
                color: var(--vp-c-text-3);
                transition: 0.25s;
            }
            .title {
                grid-area: title;
                color: var(--vp-c-text-1);
                font-size: 1.6rem;
                line-height: 2.4rem;
                transition: 0.25s;
            }
            .view {
                grid-area: view;
                @include setFlex();
                color: var(--vp-c-text-1);
                font-size: 1.25rem;
                svg {
                    margin-left: 5px;
                }
            }
        }

        .pagination-box {
            @include setFlex();
            gap: 5px;
            @include setSize(100%, 180px);

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

    .posts {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 0 4px 25px;

        &-dot {
            display: inline-block;
            background-color: var(--li-dot-color);
            width: 4px;
            height: 4px;
            border-radius: 50%;
            margin-right: 10px;
            margin-bottom: 3px;
        }
        &-container {
            color: var(--vp-c-text-2);
            font-size: 0.9375rem;
            font-weight: 400;
            &:hover {
                color: var(--vp-c-brand);
            }
        }
        &-info {
            font-size: 12px;
            span {
                display: inline-block;
                background-color: var(--vp-c-bg-alt);
                padding: 0 8px;
                border-radius: 2px;
                margin-right: 10px;
                color: var(--vp-c-text-1);
                transition: 0.4s;
            }
        }

        .date {
            color: var(--date-color);
            font-family: var(--date-font-family);
        }
    }
</style>
