<script setup lang="ts">
    import type { Post } from '@shared/hooks/useBuildSiteData';
    import { computed } from 'vue';
    import DateBadge from './DateBadge.vue';

    const { post } = defineProps<{ post: Post }>();

    // 「未分類」「雜談」是預設值，不是資訊，不顯示
    const categories = computed(() => (post.category ?? []).filter(c => c && !['未分類', '雜談'].includes(c)));
</script>

<template>
    <li class="timeline-page__post-item">
        <div class="timeline-page__post-marker" aria-hidden="true">
            <div class="dot" />
        </div>

        <article class="timeline-page__post-card">
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
                Read more <span class="arrow" aria-hidden="true">→</span>
            </a>
        </article>
    </li>
</template>

<style lang="scss">
    .timeline-page__post {
        &-item {
            position: relative;
            @include setFlex(flex-start, stretch, 1.5rem);

            // hover：圓點與卡片之間拉一條線、卡片外圍亮一圈漸層
            &:hover {
                .timeline-page__post-marker::after { transform: scaleX(1); }

                // 框從卡片左緣開始畫，寬度要扣掉左邊的圓點與間距，不然右邊會凸出去同樣的距離
                &::before {
                    top: -2px;
                    @include setSize(calc(100% - var(--op-post-dot-size) - 1.5rem + 4px), calc(100% + 4px));
                    transition: width .15s var(--cubic-FiSo) .2s, height .15s var(--cubic-FiSo) .1s;
                }
            }

            &::before {
                content: '';
                position: absolute;
                top: 50%;
                left: calc(var(--op-post-dot-size) + 1.5rem - 2px);
                background: var(--vp-home-hero-name-background);
                @include setSize(0, 0);
                clip-path: inset(0 round calc(1rem + 2px));
                pointer-events: none;
                transition: .2s var(--cubic-FiSo);
                z-index: -1;
            }
        }

        &-marker {
            position: sticky;
            top: var(--op-sticky-top);
            flex-shrink: 0;
            @include setFlex();
            @include setSize(var(--op-post-dot-size), 3.25rem); // 對齊標題那一行
            padding-top: .2rem;
            z-index: 2;

            // 圓點到卡片的橫線
            &::after {
                content: '';
                position: absolute;
                top: calc(3.25rem / 2 + 1px);
                left: calc(var(--op-post-dot-size) - 2px);
                background: var(--vp-home-hero-name-background);
                @include setSize(calc(1.5rem + 2px), 2px);
                border-radius: 2px;
                transform: scaleX(0);
                transform-origin: left;
                transition: .2s var(--cubic-FiSo);
            }

            .dot {
                position: relative;
                background: rgb(255 255 255 / 8%);
                @include setSize(var(--op-post-dot-size), var(--op-post-dot-size));
                backdrop-filter: blur(2px);
                border: 2px solid var(--color-gray-900);
                border-radius: 50%;
                transition: .25s var(--cubic-FiSo);
                z-index: 2;
            }
        }

        &-card {
            position: relative;
            display: grid;
            grid-template:
                'date title   category' auto
                'date excerpt excerpt' auto
                'date tags    read' auto /
                80px 1fr auto;
            gap: .75rem 1rem;
            background: var(--vp-c-bg);
            width: 100%;
            min-width: 0;
            padding: 0 1.5rem 1.25rem 1rem;
            border: 2px solid transparent;
            border-radius: 1rem;
            box-shadow: var(--card-shadow);
            transition: .2s var(--cubic-FiSo);

            .date {
                position: sticky;
                top: var(--op-sticky-top);
                grid-area: date;
                align-self: start;
            }

            .category-box {
                grid-area: category;
                @include setFlex(flex-end, center, 6px);
                padding-top: calc(1rem - 2px);

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
                padding: calc(1rem - 2px) 0 0;
                border: 0;
                margin: 0;
                font-size: var(--op-timeline-font-size);
                font-weight: 700;
                line-height: 1.2;

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
                font-size: var(--font-size-m);
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
                font-size: var(--font-size-m);
                font-weight: 500;
                line-height: 1;
                white-space: nowrap;
                transition: gap .2s var(--cubic-FiSo);

                &:hover { gap: 8px; }
            }
        }

        // 手機：日期改到最上面一列，分類跟著，不再佔左欄
        @include setRWD(640px) {
            &-card {
                grid-template:
                    'date    category' auto
                    'title   title' auto
                    'excerpt excerpt' auto
                    'tags    tags' auto
                    'read    read' auto /
                    auto 1fr;
                padding: 1rem 1rem 1.25rem;

                .date { position: static; }
                .category-box { padding-top: 0; }
                .title { padding-top: 0; }
            }
        }
    }
</style>
