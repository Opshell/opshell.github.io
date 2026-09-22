<script setup lang="ts">
    import type { Post } from '@shared/hooks/useBuildSiteData';
    import { computed } from 'vue';
    import DateBadge from './DateBadge.vue';

    // 跟時間軸的卡片同一套版型與 token，差別只有日期要帶年月、沒有左邊的圓點
    const { post } = defineProps<{ post: Post }>();

    const categories = computed(() => (post.category ?? []).filter(c => c && !['未分類', '雜談'].includes(c)));
</script>

<template>
    <article class="tags-post-card">
        <DateBadge class="date" :date="post.date" />

        <div v-if="categories.length" class="category-box">
            <span v-for="category in categories" :key="category" class="category">{{ category }}</span>
        </div>

        <h3 class="title">
            <a :href="post.url">{{ post.title }}</a>
        </h3>

        <p v-if="post.excerpt" class="excerpt">{{ post.excerpt }}</p>

        <div v-if="post.tags.length" class="tag-box">
            <ElTag v-for="tag in post.tags" :key="tag" :tag />
        </div>

        <a :href="post.url" class="read-more" :aria-label="`閱讀 ${post.title}`">
            Read more <span aria-hidden="true">→</span>
        </a>
    </article>
</template>

<style lang="scss">
    .tags-post-card {
        position: relative;
        display: grid;
        grid-template:
            'date title   category' auto
            'date excerpt excerpt' auto
            'date tags    read' auto /
            72px 1fr auto;
        gap: .75rem 1rem;
        background: var(--vp-c-bg);
        min-width: 0;
        padding: 1.25rem 1.5rem 1.25rem 1.25rem;
        border: 1px solid var(--vp-c-divider);
        border-radius: 1rem;
        transition: .2s var(--cubic-FiSo);

        &:hover {
            border-color: color-mix(in srgb, var(--vp-c-brand) 50%, transparent);
            box-shadow: var(--card-shadow);
            transform: translateY(-2px);
        }

        .date {
            grid-area: date;
            align-self: start;
        }

        .category-box {
            grid-area: category;
            @include setFlex(flex-end, center, 6px);

            .category {
                background: color-mix(in srgb, var(--vp-c-brand) 12%, transparent);
                padding: 3px 10px;
                border-radius: 6px;
                color: var(--vp-c-brand-dark);
                font-size: var(--font-size-xs);
                font-weight: 600;
                white-space: nowrap;
            }
        }

        .title {
            grid-area: title;
            min-width: 0;
            padding: 0;
            border: 0;
            margin: 0;
            font-size: var(--font-size-l);
            font-weight: 700;
            line-height: 1.3;

            a {
                color: var(--vp-c-text-1);
                text-decoration: none;
                transition: color .2s var(--cubic-FiSo);

                &:hover { color: var(--vp-c-brand); }
            }
        }

        .excerpt {
            grid-area: excerpt;
            display: -webkit-box;
            margin: 0;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            font-weight: 300;
            line-height: 1.6;
            overflow: hidden;
            -webkit-line-clamp: 2;
            line-clamp: 2;
            -webkit-box-orient: vertical;
        }

        .tag-box {
            grid-area: tags;
            @include setFlex(flex-start, center, 6px);
            flex-wrap: wrap;
        }

        .read-more {
            grid-area: read;
            place-self: end end;
            @include setFlex(flex-start, center, 4px);
            color: var(--vp-c-brand);
            font-size: var(--font-size-s);
            font-weight: 500;
            white-space: nowrap;
            transition: gap .2s var(--cubic-FiSo);

            &:hover { gap: 8px; }
        }
        @include setRWD(640px) {
            grid-template:
                'date    category' auto
                'title   title' auto
                'excerpt excerpt' auto
                'tags    tags' auto
                'read    read' auto /
                auto 1fr;
            padding: 1rem;

            .date {
                flex-direction: row;
                gap: 6px;
                align-items: baseline;
            }
        }
    }
</style>
