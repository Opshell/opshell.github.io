<script setup lang="ts">
    import type { Post } from '@shared/schemas/post.schema';
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { computed } from 'vue';
    import PostCard from './PostCard.vue';

    // 時間軸：全部已發布的文章，年 > 月 > 文章。
    // 主線畫在 __wrap 上（版面內的絕對定位），不再用 fixed 加一串 calc 去猜圓點在哪；窄螢幕只要改 --op-line-left 就對得上。
    const siteData = useSiteData();

    interface MonthGroup {
        month: string;
        label: string;
        posts: Post[];
    }
    interface YearGroup {
        year: string;
        months: MonthGroup[];
        count: number;
    }

    // 月份用中文：「1 月」（2026-10 翻新前是 Jan、Feb）
    const monthLabel = (month: string) => (Number(month) >= 1 && Number(month) <= 12 ? `${Number(month)} 月` : month);

    const timelineData = computed<YearGroup[]>(() => {
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
            <h1 class="title">時間軸</h1>
            <p class="subtitle">全部 {{ totalCount }} 篇文章，從新寫到舊。</p>
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
    // 時間軸（2026-10 翻新）：一本按日期排的筆記。年份寫在左邊的頁邊（捲動時停住），
    // 每個月一個小標，文章一行一篇、用細線分開；日期的「日」當作頁碼放在最左邊。
    .timeline-page {
        --tl-year-width: 7rem;
        --tl-sticky-top: calc(var(--vp-nav-height) + var(--nb-space-5));
        width: 100%;
        max-width: 60rem;
        min-height: 60vh;
        padding: var(--nb-space-8) var(--nb-space-6);
        margin: 0 auto;
        color: var(--nb-ink);
        @include setRWD(768px) { padding: var(--nb-space-6) var(--nb-space-4) var(--nb-space-7); }

        :where(h1, h2, h3, p) { margin: 0; }

        &__hero {
            @include setFlex(flex-start, flex-start, var(--nb-space-2), column);
            padding-bottom: var(--nb-space-6);
            border-bottom: 1px solid var(--nb-rule);
            margin-bottom: var(--nb-space-7);

            .title {
                font-family: var(--nb-font-serif);
                font-size: var(--nb-step-5);
                font-weight: 700;
                line-height: 1.15;
            }
            .subtitle { color: var(--nb-ink-3); }
        }

        &__empty {
            padding: var(--nb-space-8) 0;
            color: var(--nb-ink-3);
            text-align: center;
        }

        &__wrap {
            @include setFlex(flex-start, stretch, var(--nb-space-8), column);
        }

        // 一年：左邊頁邊寫年份，右邊是那一年的每個月
        &__year {
            display: grid;
            grid-template: 'year months' auto / var(--tl-year-width) minmax(0, 1fr);
            gap: var(--nb-space-5);

            &-label {
                position: sticky;
                top: var(--tl-sticky-top);
                grid-area: year;
                align-self: start;
                @include setFlex(flex-start, flex-start, var(--nb-space-1), column);

                .year {
                    font-family: var(--nb-font-serif);
                    font-size: var(--nb-step-4);
                    font-weight: 700;
                    line-height: 1;
                    font-variant-numeric: tabular-nums;
                }
                .count {
                    color: var(--nb-ink-3);
                    font-size: var(--nb-step--1);
                    font-weight: 400;
                }
            }
        }

        &__months {
            grid-area: months;
            @include setFlex(flex-start, stretch, var(--nb-space-7), column);
        }
        &__month-label {
            padding-bottom: var(--nb-space-2);
            border-bottom: 1px solid var(--nb-ink);
            margin-bottom: var(--nb-space-2);
            color: var(--nb-ink-2);
            font-size: var(--nb-step--1);
            font-weight: 700;
        }
        &__posts {
            padding: 0;
            margin: 0;
            list-style: none;
        }

        // 手機：年份不再停在左邊，改成一行標題
        @include setRWD(640px) {
            &__year { display: block; }
            &__year-label {
                position: static;
                flex-direction: row;
                gap: var(--nb-space-3);
                align-items: baseline;
                margin-bottom: var(--nb-space-5);
            }
        }
    }
</style>
