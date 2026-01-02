<script setup lang="ts">
import { computed } from 'vue';
import { getFrontMatter } from '@shared/hooks/useFrontMatter';
import type { Post } from '@shared/hooks/useBuildSiteData';
import { useSiteData } from '@shared/hooks/useSiteData';

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

// Helper: 數字轉英文月份 (更有質感)
const getMonthName = (month: string) => {
    const monthNames = [
        "[端] January", "[杏] February", "[桃] March", "[槐] April", "[蒲] May", "[荷] June",
        "[蘭] July", "[桂] August", "[菊] September", "[陽] October", "[葭] November", "[臘] December"
    ];
    const index = parseInt(month) - 1;
    return monthNames[index] || month;
};

// Helper: Date Formatting (YYYY-MM-DD)
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toISOString().split('T')[0];
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
                                    <div class="card-body">
                                        <div class="card-meta">
                                            <time class="date-badge" :datetime="post.date">
                                                <ElSvgIcon name="calendar_month" class="icon" />
                                                {{ formatDate(post.date) }}
                                            </time>
                                            <span class="category-pill" v-if="post.category">
                                                <ElSvgIcon name="folder" class="icon" />
                                                {{ post.category }}
                                            </span>
                                        </div>

                                        <h3 class="card-title">{{ post.title }}</h3>
                                        <p class="card-excerpt">
                                            {{ (post as any).excerpt || '點擊閱讀更多內容...' }}
                                        </p>

                                        <div class="card-footer">
                                            <span class="read-more">
                                                Read Article
                                                <ElSvgIcon name="arrow_forward" class="icon arrow" />
                                            </span>
                                        </div>
                                    </div>

                                    <div class="card-thumbnail" v-if="post.image">
                                        <img :src="post.image" loading="lazy" alt="cover" />
                                    </div>
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
  0% { box-shadow: 0 0 0 0 rgba(var(--vp-c-brand-1), 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(var(--vp-c-brand-1), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--vp-c-brand-1), 0); }
}
@keyframes flow-down {
  0% { background-position: 0% 0%; }
  100% { background-position: 0% 100%; }
}



.timeline-page {
    max-width: var(--vp-layout-max-width);
    min-height: 60vh;
    padding: 3rem 1.5rem;
    margin: 0 auto;

    &__wrap {

    }

    &__year {
        &-section {
            // display: flex;
            // align-items: flex-start;
            display: grid;
            grid-template: "year section" auto / 120px 1fr;
            gap: 1rem;
        }

        &-header {
            position: sticky;
            align-self: start;
            top: calc(var(--vp-nav-height) + 1rem);
            padding-bottom: 1.5rem;
            z-index: 10;

            .year {
                padding-right: 1rem;
                color: var(--vp-c-text-1);
                font-size: 2.5rem;
                font-weight: 900;
                line-height: 1;
                z-index: 2;
                -webkit-text-stroke: 1px var(--vp-c-brand-light);
            }
        }

        &-container {

        }
    }

    &__month {
        &-section {
            position: relative; // 為了讓線條定位
            // display: flex;
            // align-items: flex-start;
            display: grid;
            grid-template: "month section" auto / 300px 1fr;
            gap: 1rem;
        }

        &-header {
            background-color: var(--vp-c-bg);
            position: sticky;
            align-self: start;
            top: calc(var(--vp-nav-height) + 1rem);
            padding-bottom: 1.5rem;
            z-index: 10;
            .month {
                padding-right: 1rem;
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
            padding-left: 3rem; // 留出空間給線條和節點
            list-style: none;
            margin: 0;

            // 科技感主線：使用漸層讓它頭尾消失，不顯得生硬
            &::before {
                content: '';
                position: absolute;
                left: 6px; // 調整到圓點中心
                top: 0;
                bottom: 0;
                width: 2px;
                background: linear-gradient(
                    to bottom,
                    transparent 0%,
                    $line-color 15%,
                    $line-color 85%,
                    transparent 100%
                );
                z-index: 1;
            }
        }
    }

    &__post {
        &-item {
            position: relative;
            margin-bottom: 2rem;

            // Hover 效果：當滑鼠移到卡片，觸發整個項目的活性
            &:hover {
                .timeline-page__post-marker .dot {
                    background-color: $active-color;
                    border-color: $active-color;
                    box-shadow: 0 0 10px $active-color; // 發光
                    transform: scale(1.2); // 稍微放大
                }

                // 連結線變色
                .timeline-page__post-marker::after {
                    width: 2rem; // 伸長
                    background-color: $active-color;
                    opacity: 1;
                }
            }
        }

        &-marker {
            position: absolute;
    left: -3rem; // 回推到 padding 的位置
    top: 1.5rem; // 對齊卡片的 Title 高度 (視你的 Card padding 而定)
    width: 20px;
    height: 20px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;

    // 水平連接線 (從圓點連到卡片的線)
    &::after {
      content: '';
      position: absolute;
      left: 100%; // 從圓點右邊開始
      top: 50%;
                width: 0.5rem; // 預設很短
                height: 1px;
                background-color: $line-color;
                transition: all 0.3s ease;
                opacity: 0.5;
            }

            .dot {
                width: $dot-size;
      height: $dot-size;
      border-radius: 50%;
      border: 2px solid $line-color;
      background-color: var(--vp-c-bg); // 中間鏤空 (背景色)
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
      z-index: 2;
            }
        }

        &-card {
            display: block; // 讓它吃滿寬度
    position: relative;
    text-decoration: none;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    &:hover {
      transform: translateX(5px); // 輕微右移，配合水平線伸長
      // 這裡可以加一點 Glassmorphism 效果
    }
            .card {

            }
        }
    }

}

.year-section {
    position: relative;
    margin-bottom: 4rem;

    // 連接年份之間的線 (貫穿整年的線)
    &::before {
        content: '';
        position: absolute;
        top: 2.5rem;
        bottom: -4rem;
        left: $line-left-pos;
        background: var(--vp-c-divider);
        width: $line-width;
        z-index: 0;
    }

    &:last-child::before {
        display: none;
    }
}

// --- Month Section Style ---
.month-section {
    margin-bottom: 2rem;

    // 最後一個月份不需要過大的底部間距，因為 Year section 已經有了
    &:last-child {
        margin-bottom: 0;
    }
}

.month-label {
    // 讓月份標籤顯示在時間軸線旁
    position: relative;
    display: flex;
    align-items: center;
    margin-left: calc(#{$line-left-pos} + 20px); // 線右邊一點
    margin-bottom: 1rem;
    color: var(--vp-c-text-1);
    font-family: var(--vp-font-family-mono); // 使用等寬字體更有數字感
    font-size: 1.2rem;
    font-weight: 700;

    // 左側小裝飾線，指向時間軸
    &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: -20px; // 往左延伸到時間軸線
        background: var(--vp-c-brand);
        width: 12px;
        height: 2px;
        opacity: 0.5;
    }
}

.posts-group {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.timeline-item {
    position: relative;
    display: flex;
    gap: 1.5rem;
    padding-left: $line-left-pos;
}

// --- Time Marker ---
.time-marker {
    position: absolute;
    top: 24px;
    left: $line-left-pos;
    transform: translateX(-50%);
    z-index: 2;

    .dot {
        background: var(--vp-c-bg);
        width: $dot-size;
        height: $dot-size;
        border: 2px solid var(--vp-c-text-3);
        border-radius: 50%;
        transition: 0.3s ease;
    }
}

// --- Modern Card Style (Same as before) ---
.modern-card {
    display: flex;
    flex: 1;
    background: var(--vp-c-bg);
    border: 1px solid var(--vp-c-bg-alt);
    border-radius: 12px;
    box-shadow: 0 1px 3px rgb(0, 0, 0, 5%);
    text-decoration: none !important;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    overflow: hidden;

    &:hover {
        border-color: color-mix(in srgb, var(--vp-c-brand) 30%, transparent);
        box-shadow: 0 10px 25px -5px rgb(0, 0, 0, 10%), 0 8px 10px -6px rgb(0, 0, 0, 10%);
        transform: translateY(-4px);
        .card-title { color: var(--vp-c-brand); }
        .arrow { transform: translateX(4px); }
    }
}

.timeline-item:hover .time-marker .dot {
    background: var(--vp-c-brand);
    border-color: var(--vp-c-brand);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--vp-c-brand) 20%, transparent);
    transform: scale(1.3);
}

// --- Card Content ---
.card-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 1.5rem;
}

.card-meta {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 10px;
    font-size: 0.85rem;

    .date-badge {
        display: flex;
        gap: 4px;
        align-items: center;
        color: var(--vp-c-text-2);
        font-family: var(--vp-font-family-mono);
        .icon {
            width: 14px;
            height: 14px;
        }
    }

    .category-pill {
        display: inline-flex;
        gap: 4px;
        align-items: center;
        background-color: color-mix(in srgb, var(--vp-c-brand) 10%, transparent);
        padding: 2px 8px;
        border-radius: 4px;
        color: var(--vp-c-brand-dark);
        font-size: 0.75rem;
        font-weight: 600;
        .icon {
            width: 12px;
            height: 12px;
        }
    }
}

.card-title {
    margin: 0 0 0.5rem;
    color: var(--vp-c-text-1);
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1.4;
    transition: color 0.2s;
}

.card-excerpt {
    display: -webkit-box;
    margin-bottom: 1.5rem;
    color: var(--vp-c-text-2);
    font-size: 0.95rem;
    line-height: 1.6;
    overflow: hidden;
    line-clamp: 2;
    -webkit-box-orient: vertical;
}

.card-footer {
    display: flex;
    align-items: center;
    margin-top: auto;

    .read-more {
        display: flex;
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
}

.card-thumbnail {
    background: var(--vp-c-bg-alt);
    width: 160px;
    border-left: 1px solid var(--vp-c-divider);
    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s ease;
    }
}
.modern-card:hover .card-thumbnail img { transform: scale(1.05); }

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