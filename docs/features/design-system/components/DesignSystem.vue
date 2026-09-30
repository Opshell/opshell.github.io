<script setup lang="ts">
    import ColorPalette from './ColorPalette.vue';
    import Components from './Components.vue';
    import FontFamily from './FontFamily.vue';
    import IconGallery from './IconGallery.vue';
    import MotionCurve from './MotionCurve.vue';
    import TypeScale from './TypeScale.vue';

    const activeTab = ref('colors');

    const tabs = [
        { id: 'colors', label: '色彩', icon: 'palette' },
        { id: 'typography', label: '排版', icon: 'text_fields' },
        { id: 'font', label: '字型與字級', icon: 'grid_view' },
        { id: 'animations', label: '動態', icon: 'grid_view' },
        { id: 'icons', label: '圖示', icon: 'grid_view' },
        { id: 'components', label: '元件', icon: 'widgets' }
    ];

    // #region [P] Tab 切換與 Hash 同步邏輯

    // 點擊 Tab 時觸發：切換狀態 + 更新網址
    const switchTab = (id: string) => {
        activeTab.value = id;

        // 使用 pushState 更新 URL hash 但不觸發頁面跳轉 (不使用 router.go)
        // 這樣使用者按上一頁可以回到上一個 Tab
        history.pushState(null, '', `#${id}`);
    };

    // [-] 處理 Hash 變更的邏輯
    function hashChange() {
        // 確保在瀏覽器環境執行 (因為 VitePress 有 SSR)
        if (typeof window !== 'undefined') {
            const hash = window.location.hash;
            if (hash) {
                const id = hash.replace('#', '');
                // 確保該 id 存在於我們的 tabs 中
                if (tabs.some(t => t.id === id)) {
                    activeTab.value = id;
                }
            }
        }
    };

    // --- Indicator Logic (維持原樣) ---
    const tabRefs = ref<HTMLElement[]>([]);
    const indicatorStyle = ref({ left: '0px', width: '0px' });

    const updateIndicator = () => {
        const currentIndex = tabs.findIndex(t => t.id === activeTab.value);
        // 防呆：如果找不到 (例如 hash 是亂碼)，預設回 0
        const safeIndex = currentIndex === -1 ? 0 : currentIndex;
        const currentTabEl = tabRefs.value[safeIndex];

        if (currentTabEl) {
            indicatorStyle.value = {
                left: `${currentTabEl.offsetLeft}px`,
                width: `${currentTabEl.offsetWidth}px`
            };
        }
    };

    // 監聽 activeTab 變化來更新 Indicator
    watch(activeTab, () => {
        // 這裡加個 nextTick 比較保險，確保 active class 變更造成寬度微調後再計算
        nextTick(() => {
            updateIndicator();
        });
    });

    // #endregion

    // 生命週期處理
    onMounted(async () => {
        await nextTick();

        // 初始化 Indicator
        updateIndicator();
        window.addEventListener('resize', updateIndicator);

        // 處理初始 Hash (例如直接貼上網址進入)
        hashChange();

        // 監聽瀏覽器 "上一頁/下一頁" (hashchange 事件)
        window.addEventListener('hashchange', hashChange);
    });

    // 記得移除監聽，雖然 DesignSystem 頁面可能不常切換，但這是好習慣
    onUnmounted(() => {
        window.removeEventListener('resize', updateIndicator);
        window.removeEventListener('hashchange', hashChange);
    });
</script>

<template>
    <div class="design-system__page">
        <header class="design-system__hero">
            <h1 class="title">設計系統</h1>
            <p class="subtitle">
                Opshell's Blog 是一本「對抗健忘的筆記本」（2026-10 翻新）。後台是同一組色票，換成可以用鍵盤操作的 man page。
            </p>
            <!-- 原則：每一條都對應到 token 或元件的一個決定 -->
            <ul class="principles">
                <li><strong>內文先讀得舒服</strong>：襯線字、行寬 38 字、行高 1.9；標題用無襯線跟內文分開。</li>
                <li><strong>結構靠紙上的線</strong>：留白與細線分段，不用卡片、陰影與漸層。</li>
                <li><strong>螢光筆只畫重點</strong>：黃色只出現在粗體與「目前位置」，紅筆只給警告。</li>
                <li><strong>後台是說明文件</strong>：等寬標題、方角、密一點的表格，數字鍵切分頁、? 看快捷鍵。</li>
            </ul>
        </header>

        <div class="design-system__nav">
            <nav class="tabs">
                <button
                    v-for="(tab, index) in tabs"
                    :key="tab.id"
                    :ref="(el) => { if (el) tabRefs[index] = el as HTMLElement }"
                    class="tab-button"
                    :class="{ active: activeTab === tab.id }"

                    @click="switchTab(tab.id)"
                >
                    <span class="tab-label">{{ tab.label }}</span>
                </button>

                <div class="tab-indicator" :style="indicatorStyle" />
            </nav>
        </div>

        <main class="design-system__container">
            <Transition name="fade" mode="out-in">
                <div v-if="activeTab === 'colors'" key="colors" class="tab-pane">
                    <div class="section-header">
                        <h2>色彩</h2>
                        <p>紙、墨、藍墨水、紅筆、螢光筆。點色塊可以複製色碼。</p>
                    </div>
                    <ColorPalette />
                </div>

                <div v-else-if="activeTab === 'typography'" key="typography" class="tab-pane">
                    <div class="section-header">
                        <h2>排版</h2>
                        <p>文章內文的樣子，跟文章頁用的是同一份樣式。</p>
                    </div>
                    <TypeScale />
                </div>

                <div v-else-if="activeTab === 'font'" key="font" class="tab-pane">
                    <div class="section-header">
                        <h2>字型與字級</h2>
                        <p>三種字型各有分工；字級照古典比例。</p>
                    </div>
                    <FontFamily />
                </div>

                <div v-else-if="activeTab === 'animations'" key="animations" class="tab-pane">
                    <div class="section-header">
                        <h2>動態</h2>
                        <p>
                            定義轉場動畫的時間曲線，營造流暢的操作手感。<br />
                            橘色小球為該 Motion 的 Demo，紫色則為 linear
                        </p>
                    </div>
                    <MotionCurve />
                </div>

                <div v-else-if="activeTab === 'icons'" key="icons" class="tab-pane">
                    <div class="section-header">
                        <h2>圖示</h2>
                        <p>
                            用於引導使用者與節省空間的符號系統。<br />
                            點擊該 icon 可以直接複製 svg name
                        </p>
                    </div>
                    <div class="card">
                        <IconGallery />
                    </div>
                </div>

                <div v-else-if="activeTab === 'components'" key="components" class="tab-pane">
                    <div class="section-header">
                        <h2>元件</h2>
                        <p>共用的小元件。</p>
                    </div>
                    <Components />
                </div>
            </Transition>
        </main>
    </div>
</template>

<style lang="scss">
    .design-system {
        &__page {
            width: 100%;
            max-width: var(--view-width);
            padding-bottom: 6rem;
            margin: 0 auto;
        }

        // 頁首：跟部落格其他頁一樣寫在紙上，不做漸層標題
        &__hero {
            max-width: 52rem;
            padding: var(--nb-space-8, 4rem) var(--nb-space-6, 2rem) var(--nb-space-6, 2rem);
            color: var(--nb-ink, var(--vp-c-text-1));

            .title {
                margin: 0 0 var(--nb-space-3, .75rem);
                font-family: var(--nb-font-serif, inherit);
                font-size: var(--nb-step-5, 3rem);
                font-weight: 700;
                line-height: 1.15;
            }
            .subtitle {
                max-width: 38em;
                margin: 0;
                color: var(--nb-ink-2, var(--vp-c-text-2));
                font-family: var(--nb-font-serif, inherit);
                font-size: var(--nb-step-1, 1.125rem);
                line-height: 1.8;
            }
            .principles {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: var(--nb-space-3, .75rem) var(--nb-space-6, 2rem);
                padding: var(--nb-space-5, 1.5rem) 0 0;
                border-top: 1px solid var(--nb-rule, var(--vp-c-divider));
                margin: var(--nb-space-6, 2rem) 0 0;
                color: var(--nb-ink-2, var(--vp-c-text-2));
                font-size: var(--nb-step--1, .875rem);
                line-height: 1.7;
                list-style: none;
                @include setRWD(640px) { grid-template-columns: minmax(0, 1fr); }

                strong { color: var(--nb-ink, var(--vp-c-text-1)); }
            }
        }

        &__nav {
            position: sticky;
            top: var(--vp-nav-height); // 配合 VitePress Header
            @include setFlex();
            background: var(--vp-c-bg);
            padding: 1rem 2rem;
            border-bottom: 1px solid var(--vp-c-divider);
            z-index: 10;

            .tabs {
                position: relative;
                display: flex;
                justify-content: center;
                background: var(--vp-c-bg-soft);
                padding: 4px;
                border-radius: 12px;
                margin: 0 auto;
                box-shadow: inset 0 1px 3px rgb(0 0 0 / 5%);
            }
            .tab {
                &-button {
                    position: relative;
                    background: transparent;
                    padding: 0.6rem 1.2rem;
                    border: none;
                    color: var(--vp-c-text-2);
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: color 0.2s;
                    z-index: 2;

                    &:hover { color: var(--nb-link, var(--vp-c-brand-1)); }
                    &.active { color: var(--nb-ink, var(--vp-c-text-1)); }
                }

                &-indicator {
                    position: absolute;
                    top: 4px;
                    left: 0;
                    background: var(--vp-c-bg);
                    height: calc(100% - 8px);
                    border-radius: 8px;
                    box-shadow: 0 2px 5px rgb(0 0 0 / 5%), 0 1px 1px rgb(0 0 0 / 5%);
                    transition: .3s var(--cubic-FiSo);
                    z-index: 1;
                }
            }
        }

        &__container {
            padding: 3rem 2rem;

            .section-header {
                margin-bottom: 3rem;
                h2 {
                    border: none;
                    font-size: 2.5rem;
                    font-weight: 700;
                    line-height: 1.5;
                }
                p {
                    color: var(--vp-c-text-2);
                    font-size: 1.1rem;
                    line-height: 1.6;
                    text-align: left;
                }
            }

            .section {
                margin-bottom: 4rem;
                .title { // h3
                    padding-bottom: 0.5rem;
                    margin-bottom: 1.5rem;
                    color: var(--color-gray-800);
                    font-size: 1.5rem;
                    font-weight: 700;
                    letter-spacing: 1.2px;
                }
            }

            .card {
                background: var(--vp-c-bg-soft);
                padding: 2rem;
                border: 1px solid var(--vp-c-divider);
                border-radius: 1.5rem;
                text-align: center;
            }
        }
    }

    // --- RWD ---
    @media (width <= 768px) {
        .tabs {
            flex-wrap: wrap; // 手機版折行或改成橫向捲動
            gap: 1rem;
            background: transparent;
            padding-bottom: 0;
            border-radius: 0;
            box-shadow: none;
            overflow-x: auto;

            // 隱藏 Indicator，改用 border-bottom
            .tab-indicator { display: none; }
        }

        .tab-button {
            flex: 0 0 auto; // 不伸展
            padding: 0.5rem 0;
            &.active { border-bottom: 2px solid var(--vp-c-brand); }
        }
    }
</style>
