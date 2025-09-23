<script setup lang="ts">
    import { useData } from 'vitepress';
    import { useSiteData } from '@hooks/useSiteData';
    import type { Post } from '@/hooks/useBuildSiteData';

    // 定義時間軸上的「群組」
    export interface TimelineGroup {
        type: 'year' | 'month' // 這個群組是代表「年」還是「月」
        year: number
        month?: number // 如果 type 是 'month'，才會有這個值
        title: string // 顯示在時間軸節點旁的標題，如 "2025" 或 "May"
        articles: any[] // 這個群組包含的文章
    }

    const siteData = useSiteData();

    const allPosts = computed(() => {
        if (!siteData.value)
            return [];
        // 直接 map 排序好的 url 列表即可
        return siteData.value.sortedPostUrls.map((url: string) => siteData.value?.posts.get(url));
    });

    // 無限載入的相關 state
    const pageSize = 20; // 每次載入 20 篇
    const displayCount = ref(pageSize);
    const loader = ref<HTMLElement | null>(null); // 用於 IntersectionObserver 的 DOM 元素

    // 當前顯示的文章 (slice 過的)
    const visiblePosts = computed(() => allPosts.value.slice(0, displayCount.value));

    // 無限載入的邏輯
    onMounted(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && displayCount.value < allPosts.value.length) {
                    // 觸底了，載入下一頁
                    displayCount.value += pageSize;
                }
            },
            { threshold: 0.1 }
        );

        if (loader.value) {
            observer.observe(loader.value);
        }
    });

    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const timelineGroups = computed<TimelineGroup[]>(() => {
        const groups: TimelineGroup[] = [];
        if (visiblePosts.value.length === 0)
            return groups;

        // 1. 先將文章按 月份 (YYYY-MM) 分組
        const postsByMonth = new Map<string, any[]>();
        for (const post of visiblePosts.value) {
            const monthKey = post.date.substring(0, 7); // "2025-09"
            if (!postsByMonth.has(monthKey)) {
                postsByMonth.set(monthKey, []);
            }
            postsByMonth.get(monthKey)!.push(post);
        }

        // 2. 遍歷月份分組，生成最終的 timelineGroups
        let currentYearGroup: TimelineGroup | null = null;

        for (const [monthKey, articles] of postsByMonth.entries()) {
            const year = Number.parseInt(monthKey.substring(0, 4));
            const monthIndex = Number.parseInt(monthKey.substring(5, 7)) - 1;

            // 檢查是否是新的一年
            if (!currentYearGroup || currentYearGroup.year !== year) {
                currentYearGroup = { type: 'year', year, title: String(year), articles: [] };
                groups.push(currentYearGroup);
            }

            // 規則：月份文章 > 3 篇，則獨立成一個群組
            if (articles.length > 3) {
                groups.push({
                    type: 'month',
                    year,
                    month: monthIndex + 1,
                    title: MONTH_NAMES[monthIndex],
                    articles
                });
            } else {
                // 否則，併入當年的群組
                currentYearGroup.articles.push(...articles);
            }
        }

        return groups;
    });

    const years = computed(() => [...new Set(allPosts.value.map(p => p.date.substring(0, 4)))]);
    const currentVisibleYear = ref(years.value[0] || new Date().getFullYear());

    // Scrollspy 邏輯，與無限載入類似，也用 IntersectionObserver
    onMounted(() => {
        // ... 無限載入的 observer

        const yearElements = document.querySelectorAll('[data-year]');
        const scrollspyObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const year = (entry.target as HTMLElement).dataset.year;
                    if (year) {
                        currentVisibleYear.value = year;
                    }
                }
            });
        }, { rootMargin: '-40% 0px -60% 0px' }); // 畫面中間區域觸發

        yearElements.forEach(el => scrollspyObserver.observe(el));
    });
</script>

<template>
    <div class="timeline-page">
        <aside class="left-nav">
            <ul>
                <li v-for="year in years" :key="year">
                    <a :href="`#year-${year}`" :class="{ current: currentVisibleYear === year }">
                        {{ year }}
                    </a>
                </li>
            </ul>
        </aside>

        <main class="timeline-container">
            <div v-for="group in timelineGroups" :id="`year-${group.year}`" :key="group.title" class="timeline-group" :data-year="group.year">
                <div class="timeline-node">
                    <div class="dot" />
                    <div class="date-label">
                        <span v-if="group.type === 'year'">{{ group.year }}</span>
                        <span v-else>{{ group.title }}</span>
                    </div>
                    <div class="title-label">
                        <span v-if="group.type === 'year'">{{ group.articles.length }} posts this year</span>
                        <span v-else>{{ group.articles.length }} posts in this month</span>
                    </div>
                </div>

                <div v-if="group.articles.length > 0" class="articles-block">
                    <a v-for="post in group.articles" :key="post.url" :href="post.url" class="article-item">
                        <h3>{{ post.title }}</h3>
                        <p>{{ post.date.substring(5, 10) }}</p>
                    </a>
                </div>
            </div>

            <div ref="loader" class="loader" />
        </main>
    </div>
</template>

<style lang="scss">
.timeline-page {
  display: flex;
  gap: 2rem;
}

.left-nav {
  position: sticky;
  top: var(--vp-nav-height);
  align-self: flex-start; // 確保 sticky 生效
  width: 120px;

  a.current {
    color: var(--vp-c-brand);
    font-weight: bold;
  }
}

.timeline-container {
  position: relative;
  flex: 1;
  padding-left: 3rem; // 為時間軸線留出空間

  // 畫出那條垂直線
  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background-color: var(--vp-c-divider);
    width: 2px;
  }
}

.timeline-node {
  position: relative;
  display: flex;
  align-items: center;
  height: 4rem;

  .dot {
    position: absolute;
    left: -3rem; // 掛在時間軸線上
    background: var(--vp-c-bg-soft);
    width: 16px;
    height: 16px;
    border: 3px solid var(--vp-c-brand);
    border-radius: 50%;
    transform: translateX(-50%); // 精準置中
    z-index: 1;
  }

  .date-label {
    position: absolute;
    right: calc(100% + 1rem); // 顯示在線的左邊
    width: 80px;
    font-size: 1.2rem;
    text-align: right;
  }

  .title-label {
    font-size: 1.5rem;
    font-weight: 600;
  }
}

.articles-block {
  padding: 1rem 0 3rem; // 下方留出間距
  // ... Article item style
}
</style>
