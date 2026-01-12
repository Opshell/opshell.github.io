<script setup lang="ts">
    import ColorPalette from './colorPalette.vue';
    import TypeScale from './typeScale.vue';
    import FontFamily from './fontFamily.vue';
    import MotionCurve from './motionCurve.vue';
    import IconGallery from './iconGallery.vue';
    import Components from './components.vue';

    const activeTab = ref('colors');

    const tabs = [
        { id: 'colors', label: 'Colors', icon: 'palette' },
        { id: 'typography', label: 'Typography', icon: 'text_fields' },
        { id: 'font', label: 'Font', icon: 'grid_view' },
        { id: 'animations', label: 'Animations', icon: 'grid_view' },
        { id: 'icons', label: 'Icons', icon: 'grid_view' },
        { id: 'components', label: 'Components', icon: 'widgets' }
    ];

    // --- Indicator Logic ---
    const tabRefs = ref<HTMLElement[]>([]); // 儲存所有按鈕的 DOM
    const indicatorStyle = ref({ left: '0px', width: '0px' });

    const updateIndicator = () => {
        const currentIndex = tabs.findIndex(t => t.id === activeTab.value);
        const currentTabEl = tabRefs.value[currentIndex];

        if (currentTabEl) {
            // offsetLeft 是相對於父層 (.tabs) 的距離
            // offsetWidth 是元素本身的寬度
            indicatorStyle.value = {
                left: `${currentTabEl.offsetLeft}px`,
                width: `${currentTabEl.offsetWidth}px`
            };
        }
    };

    // 監聽 activeTab 變化
    watch(activeTab, () => {
        updateIndicator();
    });

    // 初始化與視窗縮放
    onMounted(async () => {
        await nextTick(); // 確保 DOM 渲染完成
        updateIndicator();
        window.addEventListener('resize', updateIndicator);
    });
</script>

<template>
    <div class="design-system__page">
        <header class="design-system__hero">
            <h1 class="title">Design System</h1>
            <p class="subtitle">
                Opshell's Blog 的視覺語言與設計規範。
                <br>
                The visual language and foundation of Opshell's Blog.
            </p>
        </header>

        <div class="design-system__nav">
            <nav class="tabs">
                <button
                    v-for="(tab, index) in tabs"
                    :key="tab.id"

                    :ref="(el) => { if(el) tabRefs[index] = el as HTMLElement }"

                    class="tab-button"
                    :class="{ active: activeTab === tab.id }"
                    @click="activeTab = tab.id"
                >
                    <span class="tab-label">{{ tab.label }}</span>
                </button>

                <div class="tab-indicator" :style="indicatorStyle"></div>
            </nav>
        </div>

        <main class="design-system__container">
            <Transition name="fade" mode="out-in">
                <div v-if="activeTab === 'colors'" class="tab-pane" key="colors">
                    <div class="section-header">
                        <h2>Colors</h2>
                        <p>定義品牌識別與狀態溝通的色彩系統。</p>
                    </div>
                    <ColorPalette />
                </div>

                <div v-else-if="activeTab === 'typography'" class="tab-pane" key="typography">
                    <div class="section-header">
                        <h2>Typography</h2>
                        <p>確保閱讀體驗清晰易讀的排版規範。</p>
                    </div>
                    <TypeScale />
                </div>

                <div v-else-if="activeTab === 'font'" class="tab-pane" key="font">
                    <div class="section-header">
                        <h2>Font Family & Sizes</h2>
                        <p>字體家族與字級變數定義。</p>
                    </div>
                    <FontFamily />
                </div>

                <div v-else-if="activeTab === 'animations'" class="tab-pane" key="animations">
                    <div class="section-header">
                        <h2>Motion & Easing</h2>
                        <p>
                            定義轉場動畫的時間曲線，營造流暢的操作手感。<br />
                            橘色小球為該 Motion 的 Demo，紫色則為 linear
                        </p>
                    </div>
                    <MotionCurve />
                </div>

                <div v-else-if="activeTab === 'icons'" class="tab-pane" key="icons">
                    <div class="section-header">
                        <h2>Icons</h2>
                        <p>
                            用於引導使用者與節省空間的符號系統。<br />
                            點擊該 icon 可以直接複製 svg name
                        </p>
                    </div>
                    <div class="card">
                        <IconGallery />
                    </div>
                </div>

                <div v-else-if="activeTab === 'components'" class="tab-pane" key="components">
                    <div class="section-header">
                        <h2>Components</h2>
                        <p>Reusable building blocks for creating consistent interfaces.</p>
                    </div>
                    <div class="card">
                        <Components />
                    </div>
                </div>

            </Transition>
        </main>
    </div>
</template>

<style scoped lang="scss">
    .design-system {
        &__page {
            width: 100%;
            max-width: var(--view-width);
            padding-bottom: 6rem;
            margin: 0 auto;
        }

        &__hero {
            position: relative;
            background: linear-gradient(180deg, var(--vp-c-bg-soft) 0%, var(--vp-c-bg) 100%);
            padding: 6rem 2rem 4rem;
            margin-bottom: 3rem;
            text-align: center;

            .title {
                display: inline-block;
                background: linear-gradient(120deg, var(--color-primary-1), var(--color-adorn));
                -webkit-background-clip: text;
                margin-bottom: 1rem;
                font-size: 3.5rem;
                font-weight: 800;
                line-height: 1.8;
                -webkit-text-fill-color: transparent;
            }
            .subtitle {
                max-width: 600px;
                margin: 0 auto;
                color: var(--vp-c-text-2);
                font-size: 1.25rem;
                line-height: 1.6;
            }
        }

        &__nav {
            position: sticky;
            top: var(--vp-nav-height); // 配合 VitePress Header
            @include setFlex();
            background: rgb(255, 255, 255, 80%); // 玻璃擬態
            backdrop-filter: blur(12px);
            padding: 1rem 2rem;
            border-bottom: 1px solid var(--vp-c-divider);
            z-index: 10;

            .dark & {
                background: rgb(30, 30, 30, 80%);
            }

            .tabs {
                position: relative;
                display: flex;
                justify-content: center;
                background: var(--vp-c-bg-soft);
                padding: 4px;
                border-radius: 12px;
                margin: 0 auto;
                box-shadow: inset 0 1px 3px rgb(0,0,0,5%);
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

                    &:hover {
                        color: var(--color-primary-3);
                    }
                    &.active { color: var(--color-primary-2); }
                }

                &-indicator {
                    position: absolute;
                    top: 4px;
                    left: 0;
                    background: var(--vp-c-bg);
                    height: calc(100% - 8px);
                    border-radius: 8px;
                    box-shadow: 0 2px 5px rgb(0,0,0,5%), 0 1px 1px rgb(0,0,0,5%);
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

            ::v-deep(.section) {
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
