<script setup lang="ts">
    import { computed } from 'vue';
    import { getFrontMatter } from '@shared/hooks/useFrontMatter';
    import type { Post } from '@shared/hooks/useBuildSiteData';
    import { useSiteData } from '@shared/hooks/useSiteData';

    import postCard from './postCard.vue';

    const siteData = useSiteData();

    // --- Type Definitions ---
    interface MonthGroup {
        month: string;      // e.g., "11" or "Nov"
        monthLabel: string; // e.g., "November"
        posts: Post[];
    }

    interface YearGroup {
        year: string;
        months: MonthGroup[];
    }

    // --- Logic: Data Grouping (Year > Month > Posts) ---
    const timelineData = computed<YearGroup[]>(() => {
        if (!siteData.value) return [];

        const allPosts = Array.from(siteData.value.posts.values())
            .filter(post => post.date);

        // 先排序所有文章 (新 -> 舊)
        allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 建立巢狀結構
        const grouped: Record<string, Record<string, Post[]>> = {};

        allPosts.forEach(post => {
            const dateObj = new Date(post.date);
            const year = isNaN(dateObj.getFullYear()) ? 'Unknown' : dateObj.getFullYear().toString();
            // 取得月份 (0-11)，轉成 1-12
            const month = isNaN(dateObj.getMonth()) ? '0' : (dateObj.getMonth() + 1).toString();

            if (!grouped[year]) grouped[year] = {};
            if (!grouped[year][month]) grouped[year][month] = [];

            grouped[year][month].push(post);
        });

        // 轉為陣列並排序
        // Outer: Years (Desc)
        return Object.keys(grouped)
            .sort((a, b) => Number(b) - Number(a))
            .map(year => {
                const monthMap = grouped[year];
                // Inner: Months (Desc)
                const months = Object.keys(monthMap)
                    .sort((a, b) => Number(b) - Number(a))
                    .map(month => ({
                        month,
                        monthLabel: getMonthName(month),
                        posts: monthMap[month]
                    }));

                return { year, months };
            });
    });

    // [-] 數字轉英文月份
    const getMonthName = (month: string) => {
        const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        const index = parseInt(month) - 1;
        return monthNames[index] || month;
    };
</script>

<template>
    <div class="timeline-page">
        <div v-if="!timelineData.length" class="empty-state">
            <div class="msg">時間軸空空如也...</div>
        </div>

        <div v-else class="timeline-page__wrap">
            <div
                v-for="yearGroup in timelineData"
                :key="yearGroup.year"
                class="timeline-page__year-section"
            >
                <div class="timeline-page__year-header">
                    <span class="year">{{ yearGroup.year }}</span>
                </div>

                <div class="timeline-page__year-container">
                    <section
                        v-for="monthGroup in yearGroup.months"
                        :key="monthGroup.month"
                        class="timeline-page__month-section"
                    >
                        <header class="timeline-page__month-header">
                            <h2 class="month" :title="`${monthGroup.month}月`">
                                {{ monthGroup.monthLabel }}
                                <span class="sr-only">{{ yearGroup.year }}</span>
                            </h2>
                        </header>

                        <ul class="timeline-page__month-container">
                            <postCard
                                v-for="post in monthGroup.posts"
                                :key="post.url"
                                :post
                            />
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
    // **Variables**
    $line-width: 2px;
    $dot-size: 14px;
    $line-left-pos: 24px;


    // **Variables & Config**
    $line-color: var(--vp-c-divider);       // 靜態線條顏色
    $active-color: var(--vp-c-brand);       // 互動發光顏色
    $dot-size: 12px;                        // 節點大小
    $line-offset: 19px;                     // 線條距離左邊的距離 (對齊 Month header 的視覺中心或自訂)

    // **Animations**
    @keyframes pulse-glow {
        0% { box-shadow: 0 0 0 0 rgb(var(--vp-c-brand-1), 0.4); }
        70% { box-shadow: 0 0 0 6px rgb(var(--vp-c-brand-1), 0); }
        100% { box-shadow: 0 0 0 0 rgb(var(--vp-c-brand-1), 0); }
    }
    @keyframes flow-down {
        0% { background-position: 0% 0%; }
        100% { background-position: 0% 100%; }
    }

    .timeline-page {
        --op-year-width: 120px;
        --op-month-width: 100px;

        --op-timeline-font-size: 1.625rem; // 年 月 日 標題 字體大小


        --op-post-dot-size: 18px;
        max-width: var(--vp-layout-max-width);
        min-height: 60vh;
        padding: 3rem 120px;
        margin: 0 auto;

        // 科技感主線：使用漸層讓它頭尾消失，不顯得生硬
        &::before {
            content: '';
            position: fixed;
            top: 62px;
            bottom: 0;
            left: calc(
                (100vw - var(--vp-layout-max-width)) / 2 +
                var(--op-year-width) + var(--op-month-width) + 93px + 4rem
            ); // 調整到圓點中心
            background: var(--vp-home-hero-name-background);
            width: 2px;
            height: calc(100vh - 62px);
            z-index: 1;
        }

        &__wrap {
            @include setFlex(flex-start, stretch, 1.25rem, column);
        }

        &__year {
            &-section {
                // display: flex;
                // align-items: flex-start;
                display: grid;
                grid-template: "year section" auto / var(--op-year-width) 1fr;
                gap: 1rem;
            }

            &-header {
                position: sticky;
                top: calc(var(--vp-nav-height) + 1rem);
                align-self: start;
                padding: 1rem 1rem 1rem 0;
                z-index: 10;

                .year {
                    color: var(--vp-c-text-1);
                    font-size: var(--op-timeline-font-size);
                    font-weight: 900;
                    line-height: 1;
                    z-index: 2;
                    -webkit-text-stroke: 1px var(--vp-c-brand-light);
                }
            }

            &-container {
                @include setFlex(flex-start, stretch, 1.25rem, column);
            }
        }

        &__month {
            &-section {
                position: relative; // 為了讓線條定位
                // display: flex;
                // align-items: flex-start;
                display: grid;
                grid-template: "month section" auto / var(--op-month-width) 1fr;
                gap: 1rem;
            }

            &-header {
                position: sticky;
                top: calc(var(--vp-nav-height) + 1rem);
                align-self: start;
                background-color: var(--vp-c-bg);
                padding: 1rem 1rem 1rem 0;
                z-index: 10;
                .month {
                    color: var(--vp-c-text-1);
                    font-size: var(--op-timeline-font-size);
                    font-weight: 900;
                    line-height: 1;
                    z-index: 2;
                    -webkit-text-stroke: 1px var(--vp-c-brand-light);
                }
            }

            // 時間軸的主線 (垂直線)
            &-container {
                position: relative;
                @include setFlex(flex-start, stretch, 1.25rem, column);
                list-style: none;
            }
        }
    }



    // --- RWD ---
    @media (width <= 640px) {
        .timeline-layout { padding: 2rem 1rem; }

        $mobile-line-left: 16px;

        .year-section::before { left: $mobile-line-left; }
        .month-label { margin-left: calc(#{$mobile-line-left} + 20px); }
        .time-marker { left: $mobile-line-left; }
        .timeline-item { padding-left: $mobile-line-left; }

        .modern-card {
            flex-direction: column-reverse;
            .card-thumbnail {
                width: 100%;
                height: 140px;
                border-bottom: 1px solid var(--vp-c-divider);
                border-left: none;
            }
            .card-body { padding: 1rem; }
        }
    }
</style>