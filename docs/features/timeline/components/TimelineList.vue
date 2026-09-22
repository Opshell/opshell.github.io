<script setup lang="ts">
    import type { Post } from '@shared/hooks/useBuildSiteData';
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { computed } from 'vue';
    import PostCard from './PostCard.vue';

    // 時間軸：全部已發布的文章，年 > 月 > 文章。
    // 主線畫在 __wrap 上（版面內的絕對定位），不再用 fixed 加一串 calc 去猜圓點在哪；窄螢幕只要改 --op-line-left 就對得上。
    const siteData = useSiteData();

    interface iMonthGroup {
        month: string;
        label: string;
        posts: Post[];
    }
    interface iYearGroup {
        year: string;
        months: iMonthGroup[];
        count: number;
    }

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabel = (month: string) => MONTHS[Number(month) - 1] ?? month;

    const timelineData = computed<iYearGroup[]>(() => {
        if (!siteData.value) return [];

        const posts = Array.from(siteData.value.posts.values())
            .filter(post => post.date)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const grouped: Record<string, Record<string, Post[]>> = {};
        for (const post of posts) {
            const date = new Date(post.date);
            const year = Number.isNaN(date.getFullYear()) ? 'Unknown' : String(date.getFullYear());
            const month = Number.isNaN(date.getMonth()) ? '0' : String(date.getMonth() + 1);
            ((grouped[year] ??= {})[month] ??= []).push(post);
        }

        return Object.keys(grouped)
            .sort((a, b) => Number(b) - Number(a))
            .map((year) => {
                const months = Object.keys(grouped[year])
                    .sort((a, b) => Number(b) - Number(a))
                    .map(month => ({ month, label: monthLabel(month), posts: grouped[year][month] }));
                return { year, months, count: months.reduce((n, m) => n + m.posts.length, 0) };
            });
    });

    const totalCount = computed(() => timelineData.value.reduce((n, y) => n + y.count, 0));
</script>

<template>
    <div class="timeline-page">
        <header class="timeline-page__hero">
            <h1 class="title">Timeline</h1>
            <p class="subtitle">依時間排列的全部文章，共 {{ totalCount }} 篇。</p>
        </header>

        <p v-if="!timelineData.length" class="timeline-page__empty">時間軸空空如也…</p>

        <div v-else class="timeline-page__wrap">
            <section
                v-for="yearGroup in timelineData"
                :key="yearGroup.year"
                class="timeline-page__year"
            >
                <h2 class="timeline-page__year-label">
                    <span class="year">{{ yearGroup.year }}</span>
                    <span class="count">{{ yearGroup.count }} 篇</span>
                </h2>

                <div class="timeline-page__months">
                    <section
                        v-for="monthGroup in yearGroup.months"
                        :key="monthGroup.month"
                        class="timeline-page__month"
                    >
                        <h3 class="timeline-page__month-label" :title="`${yearGroup.year} 年 ${monthGroup.month} 月`">
                            {{ monthGroup.label }}
                            <span class="sr-only">{{ yearGroup.year }} 年 {{ monthGroup.month }} 月</span>
                        </h3>

                        <ul class="timeline-page__posts">
                            <PostCard
                                v-for="post in monthGroup.posts"
                                :key="post.url"
                                :post
                            />
                        </ul>
                    </section>
                </div>
            </section>
        </div>
    </div>
</template>

<style lang="scss">
    .timeline-page {
        --op-year-width: 120px;
        --op-month-width: 100px;
        --op-gap: 1rem;
        --op-post-dot-size: 20px;
        --op-timeline-font-size: var(--font-size-xl); // 年、月、日、標題共用
        --op-sticky-top: calc(var(--vp-nav-height) + 1rem);

        // 主線的 x：年欄 + 間距 + 月欄 + 間距 + 圓點的一半
        --op-line-left: calc(var(--op-year-width) + var(--op-gap) + var(--op-month-width) + var(--op-gap) + var(--op-post-dot-size) / 2 - 1px);
        max-width: var(--vp-layout-max-width);
        min-height: 60vh;
        padding: 2rem 120px 4rem;
        margin: 0 auto;

        // #region [P] 頁首：跟 Design System 頁同一種漸層標題
        &__hero {
            margin-bottom: 2.5rem;

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
                font-size: var(--font-size-m);
            }
        }

        // #endregion

        &__empty {
            padding: 4rem 0;
            color: var(--vp-c-text-3);
            text-align: center;
        }

        &__wrap {
            position: relative;
            @include setFlex(flex-start, stretch, 1.25rem, column);

            // 主線：漸層讓頭尾自然淡出
            &::before {
                content: '';
                position: absolute;
                top: 0;
                bottom: 0;
                left: var(--op-line-left);
                background: var(--vp-home-hero-name-background);
                width: 2px;
                border-radius: 1px;
                mask-image: linear-gradient(to bottom, transparent, #000 4rem, #000 calc(100% - 4rem), transparent);
                z-index: 0;
            }
        }

        &__year {
            display: grid;
            grid-template: 'year months' auto / var(--op-year-width) 1fr;
            gap: var(--op-gap);

            &-label {
                position: sticky;
                top: var(--op-sticky-top);
                grid-area: year;
                align-self: start;
                @include setFlex(flex-start, baseline, .5rem);
                padding: 1rem 1rem 1rem 0;
                border: 0;
                margin: 0;
                z-index: 3;

                .year {
                    color: var(--vp-c-text-1);
                    font-size: var(--op-timeline-font-size);
                    font-weight: 900;
                    line-height: 1;
                    -webkit-text-stroke: 1px var(--vp-c-brand-light);
                }
                .count {
                    color: var(--vp-c-text-3);
                    font-size: var(--font-size-xs);
                    white-space: nowrap;
                }
            }
        }

        &__months {
            grid-area: months;
            @include setFlex(flex-start, stretch, 1.25rem, column);
        }

        &__month {
            display: grid;
            grid-template: 'month posts' auto / var(--op-month-width) 1fr;
            gap: var(--op-gap);

            &-label {
                position: sticky;
                top: var(--op-sticky-top);
                align-self: start;
                background: var(--vp-c-bg);
                padding: 1rem 1rem 1rem 0;
                border: 0;
                margin: 0;
                color: var(--vp-c-text-1);
                font-size: var(--op-timeline-font-size);
                font-weight: 900;
                line-height: 1;
                z-index: 3;
                -webkit-text-stroke: 1px var(--vp-c-brand-light);
            }
        }

        &__posts {
            position: relative;
            @include setFlex(flex-start, stretch, 1.25rem, column);
            padding: 0;
            margin: 0;
            list-style: none;
            z-index: 1;
        }

        .sr-only {
            position: absolute;
            clip-path: inset(50%);
            width: 1px;
            height: 1px;
            overflow: hidden;
        }

        // #region [P] RWD：平板縮欄寬；手機把年、月改成橫排的標籤，主線貼左
        @include setRWD(1100px) {
            --op-year-width: 80px;
            --op-month-width: 64px;
            --op-timeline-font-size: var(--font-size-l);
            padding: 2rem 2rem 4rem;
        }
        @include setRWD(640px) {
            --op-line-left: calc(var(--op-post-dot-size) / 2 - 1px);
            padding: 1.5rem 1rem 3rem;

            &__year,
            &__month {
                display: block;
            }
            &__year-label,
            &__month-label {
                position: static;
                padding: 0 0 .75rem;
            }
            &__month-label {
                padding-left: calc(var(--op-post-dot-size) + 1.5rem);
                color: var(--vp-c-text-2);
                font-size: var(--font-size-m);
                -webkit-text-stroke: 0;
            }
        }

        // #endregion
    }
</style>
