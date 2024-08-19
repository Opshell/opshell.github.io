<script setup lang="ts">
    import { useData } from 'vitepress';

    import { iClassification } from '@/hooks/useArticleClassification';

    const { theme } = useData();

    // 取得全部分類
    const classification = computed(() => theme.value.classification as iClassification);

    const urlParams = new URLSearchParams(window.location.search);
    const currentTag = urlParams.get('tag') ? urlParams.get('tag') : 'typescript'; // 當前Tag
    const currentPage = urlParams.get('page') ? Number(urlParams.get('page')) : 1; // 當前頁碼

    const pageSize = 10; // 每頁顯示幾筆
    const totalCount = classification.value.tags[currentTag as string].group.length; // 總筆數
    const totalPage = Math.ceil(totalCount / pageSize); // 總頁數

    // 取出當前頁面的資料
    const currentPageData = computed(() => {
        const start = (currentPage - 1) * pageSize;
        const end = currentPage * pageSize;
        return classification.value.tags[currentTag as string].group.slice(start, end);
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
            <li v-for="item in currentPageData" :key="`posts-${item.title}`">
                <a :href="`${item.url}`" class="posts">
                    <span class="date">{{ item.date }}</span>
                    <span class="category"> {{ item.category }}</span>
                    <h3 class="title">{{ item.title }}</h3>
                    <span>
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
                    :href="`?tags=${currentTag}&page=${num}`"
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
        height: calc(100dvh - var(--vp-nav-height) - 113px);
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
