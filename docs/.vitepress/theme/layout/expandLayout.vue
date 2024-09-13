<script setup lang="ts">
    import DefaultTheme from 'vitepress/theme';
    import { useData, useRouter } from 'vitepress';

    const { Layout } = DefaultTheme;

    const { site, frontmatter, page, isDark, theme } = useData();

    console.log('site', site);
    console.log('page', page);
    console.log('route', useRouter().route);

    const classification = theme.value.classification;

    const lastUpdated = computed(() => {
        // 把 page.value.lastUpdated 從時間戳轉換成 西元年月日
        const timestamp = page.value.lastUpdated as number;

        return `${timestamp > 0 ? new Date(timestamp).toLocaleDateString() : ''}`;
    });

    //
    function enableTransitions() {
        return (
            'startViewTransition' in document // 判斷是否支援 startViewTransition
            && window.matchMedia('(prefers-reduced-motion: no-preference)').matches // 判斷是否支援 prefers-reduced-motion
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
                easing: 'ease-in',
                pseudoElement: `::view-transition-${isDark.value ? 'old' : 'new'}(root)`
            }
        );
    });

    // 鍵盤事件綁定
    enum Key {
        LEFT = 'ArrowLeft',
        RIGHT = 'ArrowRight'
    }
    enum Code {
        Q = 'KeyQ'
    }

    function selectorClickHandler(selector: string) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
            element.click();
        }
    }

    function leftHandler() {
        selectorClickHandler('.pager-link.prev');
    }
    function rightHandler() {
        selectorClickHandler('.pager-link.next');
    }
    function qHandler() {
        selectorClickHandler('.DocSearch.DocSearch-Button');
    }

    const keyStrategies: { [key in Key]: () => void } = {
        [Key.LEFT]: leftHandler,
        [Key.RIGHT]: rightHandler
    };
    const codeStrategies: { [key in Code]: () => void } = {
        [Code.Q]: qHandler
    };

    function keyDownHandler(event: KeyboardEvent) {
        const key = event.key as Key;
        if (key in keyStrategies) {
            keyStrategies[key]();
        }

        const Code = event.code as Code;
        if (Code in codeStrategies) {
            codeStrategies[Code]();
        }
    }

    onMounted(() => {
        window.addEventListener('keydown', keyDownHandler);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('keydown', keyDownHandler);
    });
</script>

<template>
    <Layout :class="[frontmatter.class]">
        <template #doc-before>
            <div class="info-box">
                <span class="info">✍️ {{ frontmatter.author || 'Opsehll' }}</span>
                <div v-if="lastUpdated !== '' || frontmatter.createdAt" class="date-box">
                    📆
                    <span v-if="lastUpdated !== ''">Last Updated：{{ lastUpdated }}</span>
                    <span v-if="frontmatter.createdAt">Created：{{ frontmatter.createdAt }}</span>
                </div>

                <div class="read">
                    👀 已被閱讀：
                    <span id="busuanzi_value_page_pv">Loading</span>
                    次
                </div>

                <div v-if="frontmatter.tags" class="tag-box">
                    🏷️
                    <a
                        v-for="tag in frontmatter.tags"
                        :key="tag"
                        class="tag-info"
                        :href="`/tags-list.html?tag=${tag}&page=1`"
                    >{{ tag }}</a>
                </div>
            </div>
        </template>

        <template #doc-after>
            <OrgaGiscusComment />
        </template>

        <template #aside-ads-before>
            <div class="busuanzi-box">
                Opshell 的 Blog
                <div class="busuanzi">
                    已有： <span id="busuanzi_value_site_pv" class="number">Loading</span> 次觀看
                </div>
                <div class="busuanzi">
                    已有： <span id="busuanzi_value_site_uv" class="number">Loading</span> 個人來過
                </div>
            </div>
        </template>

        <template #aside-ads-after>
            <div class="tag-box">
                <a
                    v-for="(info, tag) in classification.tags"
                    :key="`tag-${tag}`"
                    class="tag"
                    :href="`/tags-list.html?tag=${tag}&page=1`"
                >
                    <span>{{ tag }}：</span>
                    <span class="count">{{ info.count }}</span>
                </a>
            </div>
        </template>
    </Layout>
</template>

<style lang="scss">
    .layout-top-block {
        background: #123456;
    }
    .read {
        color: var(--vp-c-brand-1);
    }
    .info-box {
        @include setFlex(flex-start, center, 1rem);
        flex-wrap: wrap;
        padding: 0 0 1rem;
        border-bottom: 1px solid var(--vp-c-divider);
        margin-bottom: 1rem;
        color: var(--vp-c-text-2);
        font-size: .85rem;

        .info {
            margin-right: 10px;
            color: var(--vp-c-text-2);
        }

        .date-box {
            @include setFlex(space-between, center, 15px);
            color: var(--vp-c-text-2);
        }
    }

    .busuanzi-box {
        @include setFlex(flex-start, flex-start, 5px, column);
        padding: 10px 0;

        .number {
            color: var(--vp-c-brand-1);
            font-weight: 500;
        }
    }

    .tag-box {
        @include setFlex(flex-start, flex-start, 5px);
        flex-wrap: wrap;

    }

    .tag {
        padding: 5px 10px;
        border: 1px solid var(--vp-c-text-2);
        border-radius: 5px;
        font-size: .8rem;
        .count {
            color: var(--vp-c-brand-1);
            font-weight: 700;
        }
    }
    .tag-info {
        background-color: var(--vp-code-bg);
        padding: 0 5px;
        border-radius: 3px;
        color: var(--vp-c-text-1);
    }

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

    .VPSwitchAppearance {
        width: 22px !important;
    }

    .VPSwitchAppearance .check {
        transform: none !important;
    }
</style>
