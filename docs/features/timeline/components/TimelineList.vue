<script setup lang="ts">
    import { computed } from 'vue';
    import { getFrontMatter } from '@shared/hooks/useFrontMatter';
    import type { Post } from '@shared/hooks/useBuildSiteData';
    import { useSiteData } from '@shared/hooks/useSiteData';

    import dateBadge from './dateBadge.vue';

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
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
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
                            <h2 class="month">
                                {{ monthGroup.monthLabel }}
                                <span class="sr-only">{{ yearGroup.year }}</span>
                            </h2>
                        </header>

                        <ul class="timeline-page__month-container">
                            <li
                                v-for="post in monthGroup.posts"
                                :key="post.url"
                                class="timeline-page__post-item"
                            >
                                <div class="timeline-page__post-marker">
                                    <div class="dot"></div>
                                </div>

                                <a :href="post.url" class="timeline-page__post-card">
                                    <!-- <img v-if="false" :src="post.image" loading="lazy" class="card-thumbnail" alt="cover" /> -->

                                    <dateBadge  class="date" :date="post.date" />

                                    <span v-if="post.category" class="category">
                                        {{ post.category }}
                                    </span>

                                    <h3 class="title">{{ post.title }}</h3>
                                    <p class="excerpt">
                                        {{ (post as any).excerpt || '點擊閱讀更多內容...' }}
                                    </p>

                                    <div v-if="post.tags.length > 0" class="tag-box">
                                        <span v-for="tag in post.tags" class="tag">
                                            #{{tag}}
                                        </span>
                                    </div>

                                    <span class="read-more">
                                        Read more
                                        <ElSvgIcon name="arrow_forward" class="icon arrow" />
                                    </span>
                                </a>
                            </li>
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
        --op-month-width: 250px;

        --op-post-dot-size: 18px;
        max-width: var(--vp-layout-max-width);
        min-height: 60vh;
        padding: 3rem 1.5rem;
        margin: 0 auto;

        // 科技感主線：使用漸層讓它頭尾消失，不顯得生硬
        &::before {
            content: '';
            position: fixed;
            top: 62px;
            bottom: 0;
            left: calc(
                (100vw - var(--vp-layout-max-width)) / 2 +
                var(--op-year-width) + var(--op-month-width) + 4rem
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
                    font-size: 2.5rem;
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
                    font-size: 2.5rem;
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
                padding-left: 3rem; // 留出空間給線條和節點
                margin: 0;
                list-style: none;
            }
        }

        &__post {
            &-item {
                position: relative;
                border-radius: 1rem;
                box-shadow: 1px 1px 10px 0 rgb(0, 0, 0, 8%);

                // Hover 效果：當滑鼠移到卡片，觸發整個項目的活性
                &:hover {
                    .timeline-page__post-marker {
                        .dot {
                            // background-color: $active-color;
                            backdrop-filter: blur(0);
                            border-color: var(--color-view-block);

                            // border-color: $active-color;
                            box-shadow: 0 0 20px 0 var(--vp-home-hero-name-background); // 發光
                            // transform: scale(1.2); // 稍微放大

                            &::before {
                                inset: -6px;
                                filter: blur(6px);
                                opacity: .65;  // 預設隱藏
                            }
                        }

                        &::after { // 連結線變色
                            background-color: $active-color;
                            width: 1.65rem; // 伸長
                            opacity: 1;
                        }
                    }

                    &::before {
                        inset: -2px;
                        transition-delay:.18s;
                    }
                }

                &::before {
                    content: '';
                    position: absolute;
                    inset: -2px calc(100% + 2px) -2px -2px;
                    background: var(--vp-home-hero-name-background);
                    border-radius: 16px;
                    pointer-events: none;
                    transition: 0.3s var(--op-timing-FiSo);
                    z-index: -1;
                }
            }

            &-marker {
                position: absolute;
                top: 1.5rem; // 對齊卡片的 Title 高度 (視你的 Card padding 而定)
                left: -2.9rem; // 回推到 padding 的位置
                @include setFlex();
                @include setSize(20px, 20px);
                z-index: 2;

                // 水平連接線 (從圓點連到卡片的線)
                &::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 100%; // 從圓點右邊開始
                    background-color: $line-color;
                    width: 0.5rem; // 預設很短
                    height: 1px;
                    transition: all 0.3s ease;
                    opacity: 0.5;
                }

                .dot {
                    position: relative;
                    background: rgba($color: #FFF, $alpha: 8%); // 中間鏤空 (背景色)
                    @include setSize(var(--op-post-dot-size), var(--op-post-dot-size));
                    backdrop-filter: blur(2px);
                    border: 2px solid #fff;
                    border-radius: 50%;
                    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);

                    // opacity: .8;
                    z-index: 2;


                    &::before {
                        content: '';
                        position: absolute;
                        inset: 2px;
                        background: var(--vp-home-hero-name-background);
                        border-radius: 50%;
                        transition: 0.25s ease;
                        filter: blur(10px);
                        opacity: 0;
                        z-index: -1;
                    }
                }
            }

            &-card {
                position: relative;
                display: grid;
                grid-template:  "date title   category" auto
                                "date excerpt excerpt " auto
                                "date tags    read"     auto/
                                 80px 1fr     auto    ;
                gap: 1rem;
                background: var(--vp-c-bg);
                padding: .5rem;
                border: 2px solid transparent;
                border-radius: 1rem;
                transition: .2s var(--op-timing-FiSo);
                overflow: hidden;


                .date {
                    grid-area: date;
                    align-self: flex-start;
                }

                .category {
                    grid-area: category;
                    background-color: color-mix(in srgb, var(--vp-c-brand) 10%, transparent);
                    padding: 2px 8px;
                    border-radius: 4px;
                    color: var(--vp-c-brand-dark);
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .title {
                    grid-area: title;
                    color: var(--vp-c-text-1);
                    font-size: 1.5rem;
                    font-weight: 700;
                    line-height: 1.4;
                    transition: color 0.2s;
                }

                .excerpt {
                    grid-area: excerpt;
                    display: -webkit-box;
                    color: var(--vp-c-text-2);
                    font-size: 1rem;
                    line-height: 1.6;
                    overflow: hidden;
                    line-clamp: 2;
                    -webkit-box-orient: vertical;
                }

                .tag-box {
                    grid-area: tags;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    align-items: center;

                    .tag {
                        background-color: color-mix(in srgb, var(--vp-c-brand) 10%, transparent);
                        padding: 2px 12px;
                        border-radius: 14px;
                        color: var(--vp-c-brand-dark);
                        font-size: 0.75rem;
                        font-weight: 500;
                    }
                }

                .read-more {
                    grid-area: read;
                    justify-self: end;
                    gap: 6px;
                    align-items: center;
                    color: var(--vp-c-brand);
                    font-size: 0.9rem;
                    font-weight: 600;
                    .arrow {
                        width: 16px;
                        height: 16px;
                        transition: transform 0.2s;
                    }
                }

                &:hover {
                    // transform: translateX(5px); // 輕微右移，配合水平線伸長
                    // 這裡可以加一點 Glassmorphism 效果
                }
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