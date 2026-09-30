<script setup lang="ts">
    import type { Post } from '@shared/schemas/post.schema';
    import { computed } from 'vue';
    import DateBadge from './DateBadge.vue';

    const { post } = defineProps<{ post: Post }>();

    // 「未分類」「雜談」是預設值，不是資訊，不顯示
    const categories = computed(() => (post.category ?? []).filter(c => c && !['未分類', '雜談'].includes(c)));
</script>

<template>
    <!-- 一篇：左邊是日（當頁碼），右邊是標題、摘要、標籤。整個標題就是連結，不另外放「閱讀更多」 -->
    <li class="timeline-page__post">
        <DateBadge class="timeline-page__post-day" :date="post.date" />

        <article class="timeline-page__post-body">
            <h3 class="title">
                <a :href="post.url">{{ post.title }}</a>
            </h3>
            <p v-if="categories.length" class="category">{{ categories.join('、') }}</p>
            <p v-if="post.excerpt" class="excerpt">{{ post.excerpt }}</p>
            <div v-if="post.tags.length" class="tag-box">
                <ElTag v-for="tag in post.tags" :key="tag" :tag />
            </div>
        </article>
    </li>
</template>

<style lang="scss">
    .timeline-page__post {
        display: grid;
        grid-template-columns: 2.5rem minmax(0, 1fr);
        gap: var(--nb-space-4);
        padding: var(--nb-space-4) 0;
        border-bottom: 1px solid var(--nb-rule);

        &-body {
            @include setFlex(flex-start, stretch, var(--nb-space-2), column);

            .title {
                font-family: var(--nb-font-serif);
                font-size: var(--nb-step-1);
                font-weight: 600;
                line-height: 1.5;

                a {
                    color: var(--nb-ink);
                    text-decoration: none;

                    &:hover {
                        color: var(--nb-link);
                        text-decoration: underline;
                        text-underline-offset: .25em;
                    }
                    &:focus-visible {
                        outline: 2px solid var(--nb-link);
                        outline-offset: 3px;
                    }
                }
            }
            .category {
                color: var(--nb-ink-3);
                font-size: var(--nb-step--2);
            }
            .excerpt {
                display: -webkit-box;
                color: var(--nb-ink-2);
                font-size: var(--nb-step--1);
                line-height: 1.75;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
                overflow: hidden;
            }
            .tag-box {
                display: flex;
                flex-wrap: wrap;
                gap: var(--nb-space-1) var(--nb-space-4);
            }
        }
    }
</style>
