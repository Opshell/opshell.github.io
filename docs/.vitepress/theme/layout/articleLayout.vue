<script setup lang="ts">
    import { ref, provide, nextTick, computed } from 'vue';
    import { useData } from 'vitepress';
    import { useSiteData } from '@hooks/useSiteData';

    import { useScroll } from '@vueuse/core';

    // 深度引入 VitePress 原生導航與頁尾 (這是合法的黑魔法)
    import VPNav from 'vitepress/dist/client/theme-default/components/VPNav.vue';
    import VPFooter from 'vitepress/dist/client/theme-default/components/VPFooter.vue';
    import VPSidebar from 'vitepress/dist/client/theme-default/components/VPSidebar.vue';
    import VPDocAsideOutline from 'vitepress/dist/client/theme-default/components/VPDocAsideOutline.vue';
    import VPLocalNav from 'vitepress/dist/client/theme-default/components/VPLocalNav.vue'; // 手機版選單控制用

    import {
        ArticleTOC,
        AsideWidget,
        SeriesSidebar,
        ArticleMeta,
        useTOC
    } from '@features/layout';


    const { frontmatter, page, isDark } = useData();
    const siteData = useSiteData();


    const contentDom = ref<HTMLElement>();
    // 把 ref 丟進去 useTOC
    const { headers, activeAnchor } = useTOC(contentDom);

    // --- Focus Mode ---
    const isFocusMode = ref(false);
    const toggleFocus = () => isFocusMode.value = !isFocusMode.value;

    // --- Mobile Sidebar Logic (VPNav 需要這個來控制手機版選單) ---
    const isSidebarOpen = ref(false);
    const openSidebar = () => { isSidebarOpen.value = true; };
    const closeSidebar = () => { isSidebarOpen.value = false; };

    // #region [P] 捲動監測 左右欄 模糊判斷

    // --- Scroll & Focus Logic ---
    const { y } = useScroll(window); // 監聽視窗捲動 Y 軸

    // 定義「閱讀模式」觸發條件
    // 例如：捲動超過 200px (大概是 Banner 離開視線後)
    const isReadingMode = computed(() => {
        // 如果已經手動進入 Focus Mode (全螢幕)，這裡就不需要判斷了，交給 CSS 處理
        if (isFocusMode.value) return false;

        return y.value > 200;
    });
    // #endregion


    // --- 1. TypeScript Fix & Data Logic ---
    // 修復：使用 computed 並處理 siteData 可能為 undefined 的情況
    const tags = computed(() => {
        if (!siteData.value) return [];

        return Array.from(siteData.value.tags.entries())
            .map(([name, data]) => ({
                name,
                count: data.count
            }))
            // 排序：數量多的在前面
            .sort((a, b) => b.count - a.count);
    });

    const lastUpdated = computed(() => {
        const timestamp = page.value.lastUpdated as number;
        return timestamp > 0 ? new Date(timestamp).toLocaleDateString() : '';
    });

    // --- 2. View Transitions Logic (保持原樣) ---
    function enableTransitions() {
        return (
            'startViewTransition' in document
            && window.matchMedia('(prefers-reduced-motion: no-preference)').matches
        );
    }

    provide('toggle-appearance', async ({ clientX: x, clientY: y }: MouseEvent) => {
        if (!enableTransitions()) {
            isDark.value = !isDark.value;
            return;
        }

        const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${Math.hypot(
                Math.max(x, innerWidth - x),
                Math.max(y, innerHeight - y)
            )}px at ${x}px ${y}px)`
        ];

        await document.startViewTransition(async () => {
            isDark.value = !isDark.value;
            await nextTick();
        }).ready;

        document.documentElement.animate(
            { clipPath: isDark.value ? clipPath.reverse() : clipPath },
            {
                duration: 300,
                easing: 'cubic-bezier(.37, .99, .92, .96)',
                pseudoElement: `::view-transition-${isDark.value ? 'old' : 'new'}(root)`,
                fill: 'forwards'
            }
        );
    });

    // --- 3. Keyboard Control Logic (保持原樣) ---
    function selectorClickHandler(selector: string) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) element.click();
    }

    function getOutlines() {
        const outlines = document.querySelectorAll('.VPDocOutlineItem.root .outline-link');
        const activeIndex = Array.from(outlines).findIndex(outline => outline.classList.contains('active'));
        return { outlines, activeIndex };
    }

    // useKeyBoardControl({
    //     'ArrowLeft': () => selectorClickHandler('.pager-link.prev'),
    //     'ArrowRight': () => selectorClickHandler('.pager-link.next'),
    //     'Ctrl+ArrowUp': () => {
    //         const { outlines, activeIndex } = getOutlines();
    //         if (outlines.length <= 0) return;
    //         if (activeIndex > 0) {
    //             (outlines[activeIndex - 1] as HTMLElement).click();
    //         } else {
    //             window.scrollTo(0, 0);
    //         }
    //     },
    //     'Ctrl+ArrowDown': () => {
    //         const { outlines, activeIndex } = getOutlines();
    //         if (outlines.length > 0) {
    //             const nextIndex = activeIndex + 1;
    //             if (nextIndex < outlines.length) {
    //                 (outlines[nextIndex] as HTMLElement).click();
    //             }
    //         }
    //     }
    // }, true);
</script>

<template>
    <div
        class="article-layout"
        :class="{
            'focus-mode': isFocusMode,
            'reading-mode': isReadingMode
        }"
    >
        <header class="article-layout__header">
            <VPNav :is-sidebar-open="isSidebarOpen" @open-menu="openSidebar" />
        </header>

        <div class="article-layout__container">
            <aside class="article-layout__container-left">
                <div class="sticky-content">
                    <SeriesSidebar />
                    <!-- <VPSidebar :open="isSidebarOpen"/> -->
                </div>
            </aside>

            <main class="article-layout__container-main">
                <ElSvgIcon
                    class="zen-mode-btn"
                    :name="isFocusMode ? 'zoom_in_map' : 'zoom_out_map'"
                    :title="isFocusMode ? 'Exit Zen Mode' : 'Enter Zen Mode'"
                    @click="toggleFocus"
                />

                <article class="article-layout__article">
                    <ArticleMeta />

                    <header class="article-header">
                        <h1 class="title">{{ frontmatter.title }}</h1>
                    </header>

                    <div ref="contentDom" class="vp-doc markdown-body">
                        <Content />
                    </div>
                </article>

                <div class="comments-box">
                    <WidgetGiscusComment />
                </div>
            </main>

            <aside class="article-layout__container-right">
                <div class="sticky-content">
                    <ArticleTOC
                        :headers="headers"
                        :active-anchor="activeAnchor"
                    />

                    <div class="widgets-area">
                        <AsideWidget />
                    </div>
                </div>
            </aside>
        </div>

        <div class="mobile-nav-overlay" v-if="isSidebarOpen" @click="closeSidebar"></div>

        <VPFooter />
    </div>
</template>

<style lang="scss">
    // 全域樣式修正：讓 VPNav 乖乖聽話
    .article-layout {
        display: flex;
        flex-direction: column;
        background-color: var(--vp-c-bg-alt); // 底色稍微灰一點，讓 Paper Card 跳出來
        min-height: 100vh;

        .VPNav {
            position: fixed;
            top: 0;

            // 強制玻璃擬態
            background-color: rgb(255, 255, 255, 80%) !important;
            backdrop-filter: saturate(180%) blur(20px);
            width: 100%;
            border-bottom: 1px solid var(--vp-c-divider);
            z-index: 50;

            .dark & { background-color: rgb(22, 22, 22, 80%) !important; }
        }
    }

    // 手機版遮罩
    .mobile-nav-overlay {
        position: fixed; top: 0; left: 0;
        background: rgb(0,0,0,60%); width: 100%; height: 100%; z-index: 40;
    }
</style>

<style lang="scss" scoped>
    .article-layout {
        .sticky-content {
            position: sticky;
            top: calc(var(--vp-nav-height) + 2rem);
            display: flex;
            flex-direction: column;
            gap: var(--gap);
            max-height: calc(100vh - 120px);

            // overflow-y: auto;
            scrollbar-width: none;
        }

        &__header {

        }

        &__container {
            flex-grow: 1; // 撐開 Footer
            display: grid;
            grid-template: "left  main           right" auto /
                            250px minmax(0, 1fr) 250px;
            gap: 1rem;
            width: 100%;
            max-width: 1440px;
            padding: calc(var(--vp-nav-height) + 3rem) 2rem 4rem; // 避開 Fixed Header
            margin: 0 auto;
            transition: grid-template-columns 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);


            // --- Columns ---
            &-left {
                grid-area: left;
                transition: .3s var(--cubic-FiSo);
            }
            &-main {
                position: relative;
                grid-area: main;
                display: flex;
                flex-direction: column;
                gap: 2rem;
                min-width: 0;
            }
            &-right {
                grid-area: right;
                .widgets-area {
                    transition: .3s var(--cubic-FiFo);
                }
            }
        }

        &__article {
            background: var(--vp-c-bg-soft);
            padding: 2rem;
            border: 1px solid var(--vp-c-divider);
            border-radius: .75rem;

            // box-shadow: var(--card-shadow);
        }

        // --- Focus Mode ---
        &.focus-mode .article-layout {
            &__container {
                grid-template-columns: 0 minmax(0, 1fr) 0;

                &-left,
                &-right {
                    pointer-events: none;
                    transform: translateY(10px);
                    opacity: 0;
                }
            }
        }

        // --- reading-mode ---
        &.reading-mode .article-layout {
            &__container-left {
                // 當進入閱讀模式時，變半透明
                opacity: 0.3;

                // 互動恢復
                &:hover { opacity: 1; }
            }

            &__container-right {
                .widgets-area { opacity: 0.3; }
                &:hover .widgets-area{ opacity: 1; }
            }
        }

        // 為了讓變化平滑，要在原來的 class 加上 transition
        .article-layout__container-left,
        .article-layout__container-right {
            transition: opacity 0.5s ease, filter 0.5s ease; // 設定 0.5s 讓過渡很優雅
            opacity: 1; // 預設是不透明
        }
    }








    // Paper Card Style
    .paper-card {
        background: var(--vp-c-bg);
        padding: 3rem 4rem;
        border: 1px solid var(--vp-c-divider);
        border-radius: 16px;
        box-shadow: 0 4px 24px rgb(0,0,0,4%); // 浮起來的感覺
        @media (width <= 768px) { padding: 1.5rem; }
    }

    .article-header {
        margin-bottom: 2.5rem; text-align: center;
        .title {
            background: linear-gradient(120deg, var(--vp-c-text-1), var(--vp-c-text-2));
            -webkit-background-clip: text;
            font-size: 2.5rem; font-weight: 800; line-height: 1.2; -webkit-text-fill-color: transparent;
        }
        .meta-tags {
            display: flex; gap: 10px; justify-content: center; margin-bottom: 1rem;
            color: var(--vp-c-text-2); font-family: var(--vp-font-family-mono);
            .pill { background: var(--vp-c-brand-dimm); padding: 2px 8px; border-radius: 4px; color: var(--vp-c-brand); }
        }
    }

    .zen-mode-btn {
        position: absolute;
        top: 0;
        right: -65px;
        background: var(--vp-c-bg);
        padding: .2rem;
        border: 1px solid var(--vp-c-divider);
        border-radius: .5rem;
        color: var(--vp-c-text-2);
        cursor: pointer;
        transform: scale(1);
        transition: 2.2s var(--op-cubic-FiSo);
        z-index: 10;
        @include setFlex();
        @include setSize(35px, 35px);
        &:hover {
            box-shadow: 0 4px 12px rgb(0,0,0,10%);
            color: var(--vp-c-brand);
            transform: scale(1.2);
        }
        @media (width <= 1280px) {
            top: 1rem;
            right: 1rem;
        }
    }

    // RWD
    @media (width <= 1024px) {
        .blog-grid-container {
            grid-template-columns: 0 minmax(0, 1fr) 0;
            padding: 6rem 1rem 2rem;
        }
        .grid-area-left, .grid-area-right { display: none; }
    }
</style>