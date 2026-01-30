<script setup lang="ts">
import { ref, provide, nextTick, computed } from 'vue';
import { useData } from 'vitepress';
import { useSiteData } from '@hooks/useSiteData';
import useKeyBoardControl from '@shared/hooks/useKeyBoardControl';

// 深度引入 VitePress 原生導航與頁尾 (這是合法的黑魔法)
import VPNav from 'vitepress/dist/client/theme-default/components/VPNav.vue';
import VPFooter from 'vitepress/dist/client/theme-default/components/VPFooter.vue';
import VPSidebar from 'vitepress/dist/client/theme-default/components/VPSidebar.vue';
import VPLocalNav from 'vitepress/dist/client/theme-default/components/VPLocalNav.vue'; // 手機版選單控制用

import {
    ArticleTOC,
    AsideWidget,
    SeriesSidebar,
    ArticleMeta
} from '@features/layout';

const { frontmatter, page, isDark } = useData();
const siteData = useSiteData();

// --- Focus Mode ---
const isFocusMode = ref(false);
const toggleFocus = () => isFocusMode.value = !isFocusMode.value;

// --- Mobile Sidebar Logic (VPNav 需要這個來控制手機版選單) ---
const isSidebarOpen = ref(false);
const openSidebar = () => { isSidebarOpen.value = true; };
const closeSidebar = () => { isSidebarOpen.value = false; };


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

useKeyBoardControl({
    'ArrowLeft': () => selectorClickHandler('.pager-link.prev'),
    'ArrowRight': () => selectorClickHandler('.pager-link.next'),
    'Ctrl+ArrowUp': () => {
        const { outlines, activeIndex } = getOutlines();
        if (outlines.length <= 0) return;
        if (activeIndex > 0) {
            (outlines[activeIndex - 1] as HTMLElement).click();
        } else {
            window.scrollTo(0, 0);
        }
    },
    'Ctrl+ArrowDown': () => {
        const { outlines, activeIndex } = getOutlines();
        if (outlines.length > 0) {
            const nextIndex = activeIndex + 1;
            if (nextIndex < outlines.length) {
                (outlines[nextIndex] as HTMLElement).click();
            }
        }
    }
}, true);
</script>

<template>
  <div class="opshell-blog-layout" :class="{ 'focus-mode': isFocusMode }">

    <header class="layout-header">
       <VPNav :is-sidebar-open="isSidebarOpen" @open-menu="openSidebar" />
    </header>

    <div class="blog-grid-container">

        <aside class="grid-area-left">
           <div class="sticky-content">
              <!-- <SeriesSidebar /> -->
                <VPSidebar :open="isSidebarOpen"/>
           </div>
        </aside>

        <main class="grid-area-main">
            <button class="zen-mode-btn" @click="toggleFocus" :title="isFocusMode ? 'Exit Zen Mode' : 'Enter Zen Mode'">
                <ElSvgIcon :name="isFocusMode ? 'close_fullscreen' : 'open_in_full'" class="icon" />
            </button>

            <article class="paper-card">
                <ArticleMeta />

                <div v-if="frontmatter.image" class="article-banner">
                    <img :src="frontmatter.image" loading="lazy" />
                </div>

                <header class="article-header">
                    <div class="meta-tags">
                        <span v-if="frontmatter.category" class="pill">{{ frontmatter.category }}</span>
                        <span class="date">{{ frontmatter.createdAt?.split('T')[0] }}</span>
                    </div>
                    <h1 class="title">{{ frontmatter.title }}</h1>
                </header>

                <div class="vp-doc markdown-body">
                    <Content />
                </div>
            </article>

            <div class="comments-box">
                <WidgetGiscusComment />
            </div>
        </main>

        <aside class="grid-area-right">
            <div class="sticky-content">
                <ArticleTOC />
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
.opshell-blog-layout {
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
// Grid 變數
$nav-height: var(--vp-nav-height);
$col-left: 260px;
$col-right: 240px;
$gap: 2rem;

.blog-grid-container {
    flex-grow: 1; // 撐開 Footer
    display: grid;
    grid-template-areas: "left main right";

    // 你的聖杯 Grid
    grid-template-columns: $col-left minmax(0, 1fr) $col-right;
    gap: $gap;
    width: 100%;
    max-width: 1440px;
    padding: calc(#{$nav-height} + 3rem) 2rem 4rem; // 避開 Fixed Header
    margin: 0 auto;
    transition: grid-template-columns 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

// --- Focus Mode ---
.opshell-blog-layout.focus-mode .blog-grid-container {
    grid-template-columns: 0 minmax(0, 1fr) 0;

    .grid-area-left, .grid-area-right { pointer-events: none; transform: translateY(10px);
        opacity: 0;
    }
}

// --- Columns & Styles (同上一個版本) ---
.grid-area-left { grid-area: left; transition: all 0.3s; }
.grid-area-main { position: relative; grid-area: main; display: flex; flex-direction: column; gap: 2rem; min-width: 0; }
.grid-area-right { grid-area: right; transition: all 0.3s; }

.sticky-content {
    position: sticky; top: calc(#{$nav-height} + 2rem);
    display: flex; flex-direction: column; gap: 2rem;
    max-height: calc(100vh - 120px);
    overflow-y: auto; scrollbar-width: none;
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
    position: absolute; top: 0; right: -50px; display: flex; align-items: center; justify-content: center;
    background: var(--vp-c-bg);
    width: 40px; height: 40px; border: 1px solid var(--vp-c-divider); border-radius: 50%;
    color: var(--vp-c-text-2);
    cursor: pointer; transition: 0.2s;
    &:hover { box-shadow: 0 4px 12px rgb(0,0,0,10%); color: var(--vp-c-brand); transform: scale(1.1); }
    @media (width <= 1280px) { top: 1rem; right: 1rem; }
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