<script setup lang="ts">
    import { computed, provide, nextTick, onMounted } from 'vue';
    import { useData } from 'vitepress';

    import DefaultTheme from 'vitepress/theme';
    import DesignSystemLayout from './DesignSystemLayout.vue';
    import ArticleLayout from './articleLayout.vue';
    import useKeyBoardControl from '@shared/hooks/useKeyBoardControl';
    import { useSiteData } from '@shared/hooks/useSiteData';

    // Layout Component
    const { Layout } = DefaultTheme;

    // Data Hooks
    const aa = useData();
    console.log(aa);
    const { frontmatter, page, isDark } = useData();
    const siteData = useSiteData();

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

    // #region [P] Keyboard Control Logic
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

    // #endregion
</script>

<template>
    <DesignSystemLayout v-if="frontmatter.layout === 'design-system' || frontmatter.designSystem" />

    <ArticleLayout v-else-if="!frontmatter.layout" />

    <!-- <Layout v-else :class="[frontmatter.class]" /> -->

    <Layout v-else :class="[frontmatter.class]">
        <template #doc-before>
            <div class="article-meta-header">
                <div class="meta-row">
                    <div class="meta-item author">
                        <ElSvgIcon name="person" class="icon" />
                        <span>{{ frontmatter.author || 'Opshell' }}</span>
                    </div>

                    <div v-if="lastUpdated || frontmatter.createdAt" class="meta-item date">
                        <ElSvgIcon name="calendar_month" class="icon" />
                        <span v-if="frontmatter.createdAt">{{ frontmatter.createdAt }}</span>
                        <span v-else>{{ lastUpdated }}</span>
                    </div>

                    <div class="meta-item views">
                        <ElSvgIcon name="visibility" class="icon" />
                        <span id="busuanzi_value_page_pv">--</span>
                    </div>
                </div>

                <div v-if="frontmatter.tags" class="tags-row">
                    <a
                        v-for="tag in frontmatter.tags"
                        :key="tag"
                        class="tag-pill"
                        :href="`/tags-list.html?tag=${tag}&page=1`"
                    >
                        <ElSvgIcon name="tag" class="icon" />
                        {{ tag }}
                    </a>
                </div>
            </div>

            <div v-if="frontmatter.image" class="banner-block">
                <img :src="frontmatter.image" :alt="`${frontmatter.title}_image`" />
            </div>
        </template>

        <template #doc-after>
            <WidgetGiscusComment />
        </template>

        <template #aside-ads-before>
            <div class="aside-widget">
                <div class="widget-header">
                    <ElSvgIcon name="analytics" class="icon" />
                    <span class="title">Blog Stats</span>
                </div>
                <ul class="stats-list">
                    <li v-if="siteData?.counts.published" class="stat-item">
                        <span class="label">已發布文章</span>
                        <span class="value">{{ siteData?.counts.published }}</span>
                    </li>
                    <li v-if="siteData?.counts.unpublished" class="stat-item">
                        <span class="label">填坑中</span>
                        <span class="value">{{ siteData?.counts.unpublished }}</span>
                    </li>
                    <li class="stat-item">
                        <span class="label">總瀏覽量</span>
                        <span id="busuanzi_value_site_pv" class="value">--</span>
                    </li>
                    <li class="stat-item">
                        <span class="label">訪客人數</span>
                        <span id="busuanzi_value_site_uv" class="value">--</span>
                    </li>
                </ul>
            </div>
        </template>

        <template #aside-ads-after>
            <div class="aside-widget">
                <div class="widget-header">
                    <ElSvgIcon name="tag" class="icon" />
                    <span class="title">Topics</span>
                </div>
                <div class="aside-tags-cloud">
                    <a
                        v-for="tag in tags"
                        :key="`tag-${tag.name}`"
                        v-show="tag.count > 1"
                        class="mini-tag"
                        :href="`/tags-list.html?tag=${tag.name}&page=1`"
                    >
                        <span class="name">#{{ tag.name }}</span>
                        <span class="count">{{ tag.count }}</span>
                    </a>
                    <a class="mini-tag more" href="/tags-list.html">
                        More...
                    </a>
                </div>
            </div>
        </template>
    </Layout>
</template>

<style lang="scss">
    // Global Animation Fix (Keep existing logic)
    ::view-transition-old(root),
    ::view-transition-new(root) {
        animation: none;
        mix-blend-mode: normal;
    }
    ::view-transition-old(root),
    .dark::view-transition-new(root) {
        z-index: 1;
    }
    ::view-transition-new(root),
    .dark::view-transition-old(root) {
        z-index: 9999;
    }
    .VPSwitchAppearance { width: 22px !important; }
    .VPSwitchAppearance .check { transform: none !important; }
</style>

<style lang="scss" scoped>
    // 框架調整
    // 範例：將原本的 Sidebar 和 Content 左右互換
    .VPContent {
        // VitePress 預設通常是 Flex 或 Grid
        display: flex;
        flex-direction: row-reverse; // 這樣內容就會跑到左邊，Sidebar 跑到右邊
    }

    // 範例：利用 Grid Area 重新定義版面
    // 這需要你去查閱 VitePress 預設的 class name
    .VPDoc {
        display: grid;
        grid-template-areas:
            "header header"
            "content aside"; // 把目錄(Aside)放到右邊
    }
</style>

<style lang="scss" scoped>
    // --- 1. Article Meta Header (Clean Style) ---
    .article-meta-header {
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--vp-c-divider);
        margin-bottom: 2rem;
    }

    .meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        align-items: center;
        margin-bottom: 1rem;
        color: var(--vp-c-text-2);
        font-size: 0.9rem;

        .meta-item {
            display: flex;
            gap: 6px;
            align-items: center;

            .icon {
                width: 16px;
                height: 16px;
                fill: currentColor;
                opacity: 0.8;
            }

            // Font fix for numbers/dates
            &.date, &.views {
                font-family: var(--vp-font-family-mono);
            }
        }
    }

    .tags-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .tag-pill {
        display: inline-flex;
        gap: 4px;
        align-items: center;

        // Dynamic Color Mix
        background-color: color-mix(in srgb, var(--vp-c-brand) 10%, transparent);
        padding: 3px 10px;
        border-radius: 20px; // Pill shape
        color: var(--vp-c-brand-dark);
        font-size: 0.8rem;
        font-weight: 500;
        text-decoration: none;
        transition: all 0.2s ease;

        .icon {
            width: 12px;
            height: 12px;
            fill: currentColor;
        }

        &:hover {
            background-color: var(--vp-c-brand);
            color: white;
            transform: translateY(-1px);
        }
    }

    .banner-block {
        border-radius: 12px;
        margin: 1.5rem 0;
        box-shadow: 0 4px 12px rgb(0,0,0,5%);
        overflow: hidden;

        img {
            display: block;
            width: 100%;
            height: auto;
        }
    }

    // --- 2. Aside Widgets (Card Style) ---
    .aside-widget {
        background: var(--vp-c-bg-soft);
        padding: 1.2rem;
        border: 1px solid var(--vp-c-bg-soft); // subtle border
        border-radius: 12px;
        margin-bottom: 1.5rem;

        .widget-header {
            display: flex;
            gap: 8px;
            align-items: center;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--vp-c-divider);
            margin-bottom: 1rem;

            .icon {
                width: 18px;
                height: 18px;
                fill: var(--vp-c-brand);
            }
            .title {
                color: var(--vp-c-text-1);
                font-size: 0.9rem;
                font-weight: 700;
            }
        }
    }

    // Blog Stats List
    .stats-list {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        padding: 0;
        margin: 0;
        list-style: none;

        .stat-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.85rem;

            .label { color: var(--vp-c-text-2); }
            .value {
                color: var(--vp-c-brand);
                font-family: var(--vp-font-family-mono);
                font-weight: 600;
            }
        }
    }

    // Aside Tags Cloud (Minimal Text Link)
    .aside-tags-cloud {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;

        .mini-tag {
            display: flex;
            align-items: center;
            color: var(--vp-c-text-2);
            font-size: 0.8rem;
            text-decoration: none;
            transition: color 0.2s;

            &:hover {
                color: var(--vp-c-brand);
                .count {
                    background: var(--vp-c-brand);
                    color: white;
                }
            }

            .name { margin-right: 4px; }

            .count {
                background: var(--vp-c-bg-alt);
                min-width: 18px;
                padding: 0 6px;
                border-radius: 8px;
                color: var(--vp-c-text-3);
                font-size: 0.7rem;
                text-align: center;
                transition: all 0.2s;
            }

            &.more {
                color: var(--vp-c-text-3);
                font-style: italic;
                &:hover { color: var(--vp-c-brand); }
            }
        }
    }
</style>