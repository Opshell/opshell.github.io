<script setup lang="ts">
    import { computed } from 'vue';
    import { useSiteData } from '@hooks/useSiteData';

    import { formatNumber } from '@utils/number';
    import { useIntervalFn } from '@vueuse/core'

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
                <ElSvgIcon name="group_search" />
                <span class="text">Data</span>
                <div class="dots">
                    <span class="dot" :class="{ active: currentStatPage === 0 }" @click="currentStatPage = 0"></span>
                    <span class="dot" :class="{ active: currentStatPage === 1 }" @click="currentStatPage = 1"></span>
                </div>
            </h4>

            <div style="display: none;">
                <span id="busuanzi_value_site_pv_hidden"></span>
                <span id="busuanzi_value_site_uv_hidden"></span>
            </div>

            <div class="stat-content">
                <transition name="fade-slide" mode="out-in">
                    <div v-if="currentStatPage === 0" key="page0" class="stat-grid">
                        <div class="stat-item">
                            <span class="val">{{ formatNumber(siteData?.counts.published || 0) }}</span>
                            <span class="label">Posts</span>
                        </div>
                        <div class="stat-item">
                            <span class="val">{{ formatNumber(siteData?.counts.unpublished || 0) }}</span>
                            <span class="label">Drafts</span>
                        </div>
                    </div>

                    <div v-else key="page1" class="stat-grid">
                        <div class="stat-item">
                            <span class="val">{{ displayPV }}</span>
                            <span class="label">Views</span>
                        </div>
                        <div class="stat-item">
                            <span class="val">{{ displayUV }}</span>
                            <span class="label">Visitors</span>
                        </div>
                    </div>
                </transition>
            </div>
        </div>

        <div class="widget-card tags">
            <h4 class="w-title">
                <ElSvgIcon name="sell" />
                <span class="text">Tags</span>
                <ElSvgIcon
                    v-if="hasMoreTags"
                    class="toggle-btn"
                    :name="isTagsExpanded ? 'bookmark_stacks' : 'style'"
                    :title="isTagsExpanded ? 'Show Less' : 'Show More'"
                    @click="toggleTags"
                />
            </h4>

            <div class="tags-cloud">
                <template v-for="tag in tags" :key="tag.name">
                    <a :href="`/tags-list.html?tag=${tag.name}&page=1`" class="tag-link">
                        <span class="hash">#</span>{{ tag.name }}
                        <span class="t-count">{{ formatNumber(tag.count) }}</span>
                    </a>
                </template>

                <a
                    v-if="isTagsExpanded"
                    href="/tags-list.html"
                    class="tag-link more-link"
                >
                    All Tags →
                </a>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
    .widgets-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .widget-card {
        position: relative;
        background: var(--vp-c-bg-soft);
        padding: 1.25rem;

        // box-shadow: var(--card-shadow); // 如果有定義變數
        border: 1px solid var(--vp-c-divider);
        border-radius: 12px;
        overflow: hidden;

        .w-title {
            @include setFlex(space-between, center, 5px);
            margin-bottom: 1rem;
            color: var(--vp-c-text-2);
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;

            .icon {
                @include setSize(24px, 24px);
            }
            .text {
                flex-grow: 1;
                text-align: left;
            }


            // Carousel Dots
            .dots {
                display: flex; gap: 4px;
                .dot {
                    background: var(--vp-c-divider);
                    width: 6px; height: 6px; border-radius: 50%;
                    cursor: pointer;
                    transition: background 0.3s;
                    &.active { background: var(--vp-c-brand); }
                }
            }

            // Tag Toggle Btn
            .toggle-btn {
                background: none; border: none;
                color: var(--vp-c-text-3); cursor: pointer;
                transition: color 0.2s;
                &:hover { color: var(--vp-c-brand); }
            }
        }
    }

    .stat-content {
        min-height: 60px; // 固定高度避免跳動
    }

    .stat-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;

        .stat-item {
            display: flex;
            flex-direction: column;

            // align-items: center; // 也可以置中看設計喜好

            .val {
                color: var(--vp-c-brand);
                font-family: var(--vp-font-family-mono);
                font-size: 1.5rem;
                font-weight: 700;
                line-height: 1.1;
            }
            .label {
                margin-top: 4px;
                color: var(--vp-c-text-3);
                font-size: 0.7rem;
                font-weight: 500;
                text-transform: uppercase;
            }
        }
    }

    .tags-cloud {
        display: flex; flex-wrap: wrap; gap: 8px 10px;
        transition: max-height 0.3s ease; // 如果想做 slide down 動畫

        .tag-link {
            display: flex; gap: 2px; align-items: center;
            color: var(--vp-c-text-2);
            font-size: 0.8rem; text-decoration: none;
            transition: all 0.2s;

            .hash { color: var(--vp-c-brand); font-weight: 300; opacity: 0.6; }

            .t-count {
                background: var(--vp-c-bg-alt);
                min-width: 1.4em;
                padding: 0 5px; border-radius: 6px; margin-left: 2px;
                color: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: 0.65rem; text-align: center;
            }

            &:hover {
                color: var(--vp-c-brand);
                transform: translateY(-1px);
                .t-count { background: var(--vp-c-brand); color: white; }
            }

            &.more-link {
                border-bottom: 1px dashed transparent;
                color: var(--vp-c-brand);
                font-size: 0.75rem;
                font-weight: 600;
                &:hover { border-bottom-color: var(--vp-c-brand); }
            }
        }
    }

    // --- Transitions ---
    .fade-slide-enter-active,
    .fade-slide-leave-active {
        transition: all 0.3s ease;
    }
    .fade-slide-enter-from {
        transform: translateY(10px);
        opacity: 0;
    }
    .fade-slide-leave-to {
        transform: translateY(-10px);
        opacity: 0;
    }
</style>