<script setup lang="ts">
    import {
        ArticleMeta,
        ArticleToc,
        AsideWidget,
        SeriesSidebar,
        useToc
    } from '@features/layout';
    import { useSiteData } from '@hooks/useSiteData';
    import { defaultWindow, useScroll } from '@vueuse/core';

    import { useData } from 'vitepress';

    import VPFooter from 'vitepress/dist/client/theme-default/components/VPFooter.vue';
    // 深度引入 VitePress 原生導航與頁尾 (這是合法的黑魔法)
    import VPNav from 'vitepress/dist/client/theme-default/components/VPNav.vue';

    import { computed, nextTick, provide, ref } from 'vue';

    const { frontmatter, page, isDark } = useData();
    const siteData = useSiteData();

    const contentDom = ref<HTMLElement>();
    // 把 ref 丟進去 useToc
    const { headers, activeAnchor } = useToc(contentDom);

    // --- Focus Mode ---
    const isFocusMode = ref(false);
    const toggleFocus = () => isFocusMode.value = !isFocusMode.value;

    // --- Mobile Sidebar Logic (VPNav 需要這個來控制手機版選單) ---
    const isSidebarOpen = ref(false);
    const openSidebar = () => { isSidebarOpen.value = true; };
    const closeSidebar = () => { isSidebarOpen.value = false; };

    // #region [P] 捲動監測 左右欄 模糊判斷

    // --- Scroll & Focus Logic ---
    // 監聽視窗捲動 Y 軸。不能直接寫 window：SSR 沒有 window，setup 一丟錯整篇文章的 HTML 就是空的
    // defaultWindow 在瀏覽器是 window、在 SSR 是 undefined（useScroll 會安靜地不監聽）
    const { y } = useScroll(defaultWindow);

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
            'reading-mode': isReadingMode,
        }"
    >
        <header class="article-layout__header">
            <VPNav :is-sidebar-open="isSidebarOpen" @open-menu="openSidebar" />
        </header>

        <!-- 筆記本版面（2026-10 翻新）：中間一欄內文（約 38 字寬），左邊是系列、右邊是頁邊批註（本頁目錄與標籤）。
             不再把文章裝進卡片：內文直接寫在紙上，結構靠留白與細線 -->
        <div class="article-layout__container">
            <aside class="article-layout__container-left" aria-label="這個系列">
                <div class="sticky-content">
                    <SeriesSidebar />
                </div>
            </aside>

            <main class="article-layout__container-main">
                <article class="article-layout__article">
                    <header class="article-layout__article-header">
                        <h1 class="title">{{ frontmatter.title }}</h1>
                        <ArticleMeta />
                    </header>

                    <div ref="contentDom" class="vp-doc markdown-body">
                        <Content />
                    </div>
                </article>

                <div class="comments-box">
                    <WidgetGiscusComment />
                </div>
            </main>

            <aside class="article-layout__container-right" aria-label="頁邊批註">
                <div class="sticky-content">
                    <button
                        type="button"
                        class="article-layout__focus"
                        :aria-pressed="isFocusMode"
                        @click="toggleFocus"
                    >
                        <ElSvgIcon :name="isFocusMode ? 'zoom_in_map' : 'zoom_out_map'" />
                        {{ isFocusMode ? '結束專注閱讀' : '專注閱讀' }}
                    </button>

                    <ArticleToc
                        :headers="headers"
                        :active-anchor="activeAnchor"
                    />

                    <div class="widgets-area">
                        <AsideWidget />
                    </div>
                </div>
            </aside>
        </div>

        <div v-if="isSidebarOpen" class="mobile-nav-overlay" @click="closeSidebar" />

        <VPFooter />
    </div>
</template>

<style lang="scss">
    .article-layout {
        @include setFlex(flex-start, stretch, 0, column);
        background-color: var(--vp-c-bg);
        min-height: 100vh;

        // 導覽列：紙上的一條細線，不做毛玻璃
        .VPNav {
            position: fixed;
            top: 0;
            background-color: var(--vp-c-bg) !important;
            width: 100%;
            border-bottom: 1px solid var(--vp-c-divider);
            z-index: 50;
        }

        // 手機版遮罩
        .mobile-nav-overlay {
            position: fixed;
            inset: 0;
            background: rgb(0 0 0 / 60%);
            z-index: 40;
        }

        .sticky-content {
            position: sticky;
            top: calc(var(--vp-nav-height) + var(--nb-space-6));
            @include setFlex(flex-start, stretch, var(--nb-space-6), column);
            max-height: calc(100vh - var(--vp-nav-height) - var(--nb-space-7));
            overflow-y: auto;
            scrollbar-width: none;
        }

        // #region [P] 三欄：系列｜內文｜頁邊批註
        &__container {
            flex-grow: 1; // 撐開 Footer
            display: grid;
            grid-template: 'left main right' auto / 13.5rem minmax(0, var(--nb-measure)) 13.5rem;
            gap: var(--nb-space-7);
            justify-content: center;
            width: 100%;
            padding: calc(var(--vp-nav-height) + var(--nb-space-7)) var(--nb-space-6) var(--nb-space-8);
            margin: 0 auto;

            // 內文欄的寬度以內文字級計算（38em 是 38 個 17px 的字）
            &-main {
                position: relative;
                grid-area: main;
                @include setFlex(flex-start, stretch, var(--nb-space-7), column);
                min-width: 0;
                font-size: var(--nb-read-size);
            }
            &-left { grid-area: left; }
            &-right { grid-area: right; }

            // 窄一點先收掉左邊的系列（系列在文章頁尾的上下篇也找得到），再窄就只剩內文
            @include setRWD(1279px) {
                grid-template: 'main right' auto / minmax(0, var(--nb-measure)) 13.5rem;

                &-left { display: none; }
            }
            @include setRWD(960px) {
                grid-template: 'main' auto / minmax(0, 1fr);
                padding: calc(var(--vp-nav-height) + var(--nb-space-6)) var(--nb-space-4) var(--nb-space-7);

                &-right { display: none; }
            }
        }

        // #endregion

        // #region [P] 文章標頭：標題用襯線，資訊一行小字在下面
        &__article-header {
            @include setFlex(flex-start, stretch, var(--nb-space-4), column);
            padding-bottom: var(--nb-space-6);
            border-bottom: 1px solid var(--vp-c-divider);
            margin-bottom: var(--nb-space-6);

            .title {
                margin: 0;
                color: var(--nb-ink);
                font-family: var(--nb-font-serif);
                font-size: clamp(1.75rem, 1.2rem + 2vw, var(--nb-step-4));
                font-weight: 700;
                line-height: 1.35;
                letter-spacing: .01em;
                text-wrap: balance;
            }
        }

        // #endregion

        // 專注閱讀：頁邊的一個文字鈕，不是浮在內文上的圖示
        &__focus {
            @include setFlex(flex-start, center, var(--nb-space-2));
            background: none;
            padding: 0;
            border: 0;
            color: var(--nb-ink-3);
            font-size: var(--nb-step--1);
            cursor: pointer;

            .svg-icon { @include setSize(16px, 16px); }
            &:hover { color: var(--nb-link); }
            &:focus-visible {
                outline: 2px solid var(--nb-link);
                outline-offset: 3px;
            }
        }

        // #region [P] 專注閱讀與閱讀中的淡出
        &.focus-mode .article-layout__container {
            grid-template-columns: 0 minmax(0, var(--nb-measure)) 13.5rem;

            .article-layout__container-left {
                pointer-events: none;
                opacity: 0;
            }
            .article-layout__container-right :is(.article-toc, .widgets-area) {
                pointer-events: none;
                opacity: 0;
            }
        }

        // 捲過開頭之後，兩邊的欄位淡一點；滑過去就回來
        &.reading-mode .article-layout {
            &__container-left { opacity: .45; }
            &__container-right .widgets-area { opacity: .45; }
        }
        .article-layout__container-left,
        .article-layout__container-right .widgets-area,
        .article-layout__container-right .article-toc {
            transition: opacity .4s ease;

            &:hover { opacity: 1; }
        }

        // #endregion

        .comments-box {
            padding-top: var(--nb-space-6);
            border-top: 1px solid var(--vp-c-divider);
        }

        @media (prefers-reduced-motion: reduce) {
            .article-layout__container-left,
            .article-layout__container-right .widgets-area,
            .article-layout__container-right .article-toc { transition: none; }
        }
    }
</style>
