<script setup lang="ts">
    import { useSiteData } from '@hooks/useSiteData';
    import { formatNumber } from '@utils/number';

    import { useIntervalFn } from '@vueuse/core';
    import { computed } from 'vue';

    // [-] 常數渲染
    const siteData = useSiteData();

    // #region [P] 發佈數據 & 訪客人數 Fun
    // --- 1. Data Stats Carousel Logic ---
    const currentStatPage = ref(0);
    const isHoveringStats = ref(false);

    // 切換頁面 (0: Posts/Drafts, 1: PV/UV)
    const nextStatPage = () => {
        currentStatPage.value = (currentStatPage.value + 1) % 2;
    };

    // 每 5 秒輪播一次 (如果沒有 Hover 的話)
    const { pause, resume } = useIntervalFn(() => {
        if (!isHoveringStats.value) {
            nextStatPage();
        }
    }, 30000); // 建議 5 秒，2-3 分鐘太久了使用者會以為那是靜態的

    // 為了 Busuanzi 數字的即時格式化，我們使用 MutationObserver 或者簡單的 computed
    // 但 Busuanzi 是直接操作 DOM innerText，Vue 的響應式抓不到。
    // [Trick] 我們用一個 invisible 的 span 讓 Busuanzi 填值，然後我們讀取它來格式化顯示
    const pvRaw = ref('--');
    const uvRaw = ref('--');

    const displayPV = computed(() => formatNumber(pvRaw.value));
    const displayUV = computed(() => formatNumber(uvRaw.value));
    // #endregion

    // #region [P] 標籤雲
    const isTagsExpanded = ref(false); // 預設精簡模式
    const toggleTags = () => isTagsExpanded.value = !isTagsExpanded.value;

    const tags = computed(() => {
        if (!siteData.value) return [];

        // 原始排序後的 tags
        const allTags = Array.from(siteData.value.tags.entries())
            .map(([name, index]) => ({ name, count: index.count }))
            .sort((a, b) => b.count - a.count);

        // [判斷邏輯]
        // 1. 如果是 "精簡模式" (!isTagsExpanded) -> 只顯示 count >= 5 的 tags，且最多顯示前 15 個
        // 2. 如果是 "展開模式" (isTagsExpanded) -> 顯示前 50 個 (或是全部，看你需求)

        if (!isTagsExpanded.value) {
            // 精簡條件：文章數 >= 3 且取前 12 個 (避免太長)
            return allTags.filter(t => t.count >= 3).slice(0, 12);
        } else {
            // 展開：顯示更多
            return allTags.slice(0, 50);
        }
    });

    // 判斷是否需要顯示 "展開/收合" 按鈕
    // 如果即使展開了也沒有更多 tag，就不用顯示按鈕
    const hasMoreTags = computed(() => {
        if (!siteData.value) return false;
        const totalTagsCount = siteData.value.tags.size;
        // 如果總 tag 數很少，根本不需要折疊功能，直接全顯示
        if (totalTagsCount <= 12) return false;

        return true;
    });
    // #endregion

    // 在 mounted 後啟動一個觀察者去抓 busuanzi 的 DOM 變化
    onMounted(() => {
        // 這裡用一個簡單的 polling 來同步 busuanzi 的值到 Vue ref
        // 因為 busuanzi 腳本載入時間不確定
        const syncInterval = setInterval(() => {
            const pvEl = document.getElementById('busuanzi_value_site_pv_hidden');
            const uvEl = document.getElementById('busuanzi_value_site_uv_hidden');
            if (pvEl) pvRaw.value = pvEl.innerText;
            if (uvEl) uvRaw.value = uvEl.innerText;
        }, 2000);

        onUnmounted(() => clearInterval(syncInterval));
    });
</script>

<template>
    <div class="widgets-container">
        <div
            class="widget-card stats"
            @mouseenter="isHoveringStats = true"
            @mouseleave="isHoveringStats = false"
        >
            <h4 class="w-title">
                <span class="text">這個部落格</span>
                <div class="dots">
                    <button type="button" class="dot" :class="{ active: currentStatPage === 0 }" aria-label="文章數" @click="currentStatPage = 0" />
                    <button type="button" class="dot" :class="{ active: currentStatPage === 1 }" aria-label="瀏覽數" @click="currentStatPage = 1" />
                </div>
            </h4>

            <div style="display: none;">
                <span id="busuanzi_value_site_pv_hidden" />
                <span id="busuanzi_value_site_uv_hidden" />
            </div>

            <div class="stat-content">
                <transition name="fade-slide" mode="out-in">
                    <div v-if="currentStatPage === 0" key="page0" class="stat-grid">
                        <div class="stat-item">
                            <span class="val">{{ formatNumber(siteData?.counts.published || 0) }}</span>
                            <span class="label">篇文章</span>
                        </div>
                        <div class="stat-item">
                            <span class="val">{{ formatNumber(siteData?.counts.unpublished || 0) }}</span>
                            <span class="label">篇草稿</span>
                        </div>
                    </div>

                    <div v-else key="page1" class="stat-grid">
                        <div class="stat-item">
                            <span class="val">{{ displayPV }}</span>
                            <span class="label">次瀏覽</span>
                        </div>
                        <div class="stat-item">
                            <span class="val">{{ displayUV }}</span>
                            <span class="label">位訪客</span>
                        </div>
                    </div>
                </transition>
            </div>
        </div>

        <div class="widget-card tags">
            <h4 class="w-title">
                <span class="text">常用標籤</span>
                <!-- <ElSvgIcon
                    v-if="hasMoreTags"
                    class="toggle-btn"
                    :name="isTagsExpanded ? 'bookmark_stacks' : 'style'"
                    :title="isTagsExpanded ? 'Show Less' : 'Show More'"
                    @click="toggleTags"
                /> -->
            </h4>

            <div class="tags-cloud">
                <template v-for="tag in tags" :key="tag.name">
                    <a :href="`/tags-list.html?tag=${tag.name}&page=1`" class="tag-link">
                        <span class="hash">#</span>{{ tag.name }}
                        <span class="t-count">{{ formatNumber(tag.count) }}</span>
                    </a>
                </template>

                <a
                    href="/tags-list.html"
                    class="tag-link more-link"
                >
                    全部標籤
                </a>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    // 頁邊批註：數字與常用標籤直接寫在紙上，不裝進卡片（2026-10 翻新）
    .widgets-container {
        @include setFlex(flex-start, stretch, var(--nb-space-6), column);

        .widget-card {
            position: relative;
            padding-left: var(--nb-space-4);
            border-left: 1px solid var(--nb-rule);

            .w-title {
                @include setFlex(space-between, center, var(--nb-space-2));
                margin: 0 0 var(--nb-space-3);
                color: var(--nb-ink-2);
                font-size: var(--nb-step--1);
                font-weight: 700;

                .text { flex-grow: 1; }

                // 兩頁數字的切換點
                .dots {
                    display: flex;
                    gap: 2px;

                    .dot {
                        @include setFlex();
                        background: none;
                        @include setSize(20px, 20px);
                        padding: 0;
                        border: 0;
                        cursor: pointer;

                        &::after {
                            content: '';
                            background: var(--nb-rule);
                            @include setSize(6px, 6px);
                            border-radius: 50%;
                        }
                        &.active::after { background: var(--nb-ink-2); }
                        &:focus-visible {
                            border-radius: 4px;
                            outline: 2px solid var(--nb-link);
                        }
                    }
                }
            }
        }

        .stat-content { min-height: 3rem; }
        .stat-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--nb-space-3);

            .stat-item {
                @include setFlex(flex-start, baseline, var(--nb-space-1));
                flex-wrap: wrap;

                .val {
                    color: var(--nb-ink);
                    font-family: var(--nb-font-serif);
                    font-size: var(--nb-step-3);
                    font-weight: 700;
                    line-height: 1.1;
                    font-variant-numeric: tabular-nums;
                }
                .label {
                    color: var(--nb-ink-3);
                    font-size: var(--nb-step--2);
                }
            }
        }

        .tags-cloud {
            display: flex;
            flex-wrap: wrap;
            gap: var(--nb-space-1) var(--nb-space-3);

            .tag-link {
                @include setFlex(flex-start, baseline, 1px);
                color: var(--nb-ink-2);
                font-size: var(--nb-step--1);
                text-decoration: none;

                .hash { color: var(--nb-pencil); }
                .t-count {
                    margin-left: 2px;
                    color: var(--nb-ink-3);
                    font-size: var(--nb-step--2);
                    font-variant-numeric: tabular-nums;
                }
                &:hover {
                    color: var(--nb-link);
                    text-decoration: underline;
                    text-underline-offset: .25em;
                }
                &:focus-visible {
                    outline: 2px solid var(--nb-link);
                    outline-offset: 2px;
                }
                &.more-link {
                    color: var(--nb-link);
                    font-weight: 600;
                }
            }
        }

        // 數字換頁：淡入淡出就好
        .fade-slide-enter-active,
        .fade-slide-leave-active { transition: opacity .25s ease; }
        .fade-slide-enter-from,
        .fade-slide-leave-to { opacity: 0; }
    }
</style>
