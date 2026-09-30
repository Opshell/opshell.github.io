<script setup lang="ts">
    import type { Post } from '@shared/schemas/post.schema';
    import { computed } from 'vue';
    import DateBadge from './DateBadge.vue';

    // 跟時間軸同一套條目：標題、日期、摘要、標籤，細線分開（2026-10 翻新拿掉卡片）
    const { post } = defineProps<{ post: Post }>();

    const categories = computed(() => (post.category ?? []).filter(c => c && !['未分類', '雜談'].includes(c)));
</script>

<template>
    <article class="tags-post">
        <h3 class="title">
            <a :href="post.url">{{ post.title }}</a>
        </h3>
        <p class="meta">
            <DateBadge :date="post.date" />
            <span v-if="categories.length" class="category">{{ categories.join('、') }}</span>
        </p>
        <p v-if="post.excerpt" class="excerpt">{{ post.excerpt }}</p>
        <div v-if="post.tags.length" class="tag-box">
            <ElTag v-for="tag in post.tags" :key="tag" :tag />
        </div>
    </article>
</template>

<style lang="scss">
    .tags-post {
        @include setFlex(flex-start, stretch, var(--nb-space-2), column);
        padding: var(--nb-space-4) 0;
        border-bottom: 1px solid var(--nb-rule);

        :where(h3, p) { margin: 0; }
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
        .meta {
            display: flex;
            flex-wrap: wrap;
            gap: var(--nb-space-1) var(--nb-space-4);
            align-items: baseline;

            .category {
                color: var(--nb-ink-3);
                font-size: var(--nb-step--2);
            }
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
</style>
