<script setup lang="ts">
    import type { TabKey } from '../constants';
    import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
    import { GUIDE_TABS } from '../constants';
    import MdPrism from './MdPrism.vue';

    // 語法圖鑑的外框：稜鏡在最上面，內容拆成分頁（slot 名稱＝GUIDE_TABS 的 key，內容由 md 傳進來才會經過 markdown 編譯）。
    // 往下捲、稜鏡捲過吸頂線之後，右側的導覽「停靠」出來，兼當分頁與目錄；版面太窄（文章頁）時改成吸頂的橫向分頁列。
    const active = ref<TabKey>('overview');
    const current = ref('');
    const docked = ref(false);

    const rootEl = ref<HTMLElement>();
    const heroEl = ref<HTMLElement>();
    const navEl = ref<HTMLElement>();
    const panesEl = ref<HTMLElement>();

    const activeTab = computed(() => GUIDE_TABS.find(tab => tab.key === active.value));

    // 吸頂線＝導覽 sticky 的 top，CSS 變數在不同頁面不一樣（設計系統頁上面還有一條分頁列）
    function stickyTop() {
        return navEl.value ? Number.parseFloat(getComputedStyle(navEl.value).top) || 64 : 64;
    }

    function update() {
        const top = stickyTop();
        if (heroEl.value) docked.value = heroEl.value.getBoundingClientRect().bottom < top + 24;

        // 目前讀到哪一節：最後一個捲過吸頂線下方一點的小標題
        let id = '';
        for (const item of activeTab.value?.items ?? []) {
            const el = document.getElementById(item.id);
            if (el && el.getBoundingClientRect().top <= top + 96) id = item.id;
        }
        current.value = id;
    }

    let frame = 0;
    function onScroll() {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(update);
    }

    // 捲到某個元素，扣掉它的 scroll-margin-top（讓開吸頂的導覽）。
    // 不用 scrollIntoView：分頁剛從 display: none 打開、淡入動畫才開始的那一刻，Chrome 會把平滑捲動吃掉，等下一格再自己算位置
    function scrollToEl(el: HTMLElement) {
        nextTick(() => requestAnimationFrame(() => {
            const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
            window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - margin, behavior: 'smooth' });
        }));
    }

    // 切換分頁；人已經捲進內容裡的話，帶回這一頁的開頭，不然會停在上一頁的位置看到一半
    function select(key: TabKey) {
        active.value = key;
        current.value = '';
        if (panesEl.value && panesEl.value.getBoundingClientRect().top < stickyTop()) scrollToEl(panesEl.value);
    }

    // 錨點指到這份圖鑑裡的小節時（光譜的長條、導覽的目錄、文章右側的目錄、直接帶 #id 的網址），先切到它的分頁再捲過去
    function reveal(hash: string) {
        const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
        const pane = target?.closest<HTMLElement>('[data-tab]');
        if (!target || !pane || !rootEl.value?.contains(pane)) return false;

        active.value = pane.dataset.tab as TabKey;
        scrollToEl(target);
        return true;
    }

    // 掛在 document 的捕獲階段：文章目錄自己有 @click 捲動，要搶在它之前把分頁打開
    function onClick(event: MouseEvent) {
        const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
        if (!link) return;
        const url = new URL(link.href, location.href);
        if (url.pathname !== location.pathname) return;
        if (reveal(url.hash)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    onMounted(() => {
        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('click', onClick, true);
        reveal(location.hash);
        update();
    });

    onUnmounted(() => {
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', onScroll);
        document.removeEventListener('click', onClick, true);
    });
</script>

<template>
    <div ref="rootEl" class="md-guide">
        <div class="md-guide__layout" :class="{ 'is-docked': docked }">
            <div ref="heroEl" class="md-guide__hero">
                <MdPrism :active @select="select" />
            </div>

            <nav ref="navEl" class="md-guide__nav" aria-label="語法圖鑑的分頁與目錄">
                <p class="md-guide__nav-title">語法圖鑑</p>
                <ul class="md-guide__tabs" role="tablist">
                    <li v-for="tab in GUIDE_TABS" :key="tab.key" class="md-guide__tab-item" :class="`is-${tab.key}`">
                        <button
                            type="button"
                            role="tab"
                            class="md-guide__tab"
                            :class="[`is-${tab.key}`, { 'is-active': active === tab.key }]"
                            :aria-selected="active === tab.key"
                            @click="select(tab.key)"
                        >
                            {{ tab.name }}
                        </button>

                        <!-- 目前這一頁的小節，收合用 grid-template-rows 0fr → 1fr 做高度漸變 -->
                        <div v-if="tab.items.length" class="md-guide__toc" :class="{ 'is-open': active === tab.key }">
                            <ul>
                                <li v-for="item in tab.items" :key="item.id">
                                    <a :href="`#${item.id}`" :class="{ 'is-current': current === item.id }" :tabindex="active === tab.key ? 0 : -1">
                                        {{ item.name }}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </li>
                </ul>
            </nav>

            <div ref="panesEl" class="md-guide__panes">
                <section
                    v-for="tab in GUIDE_TABS"
                    :key="tab.key"
                    class="md-guide__pane"
                    :class="{ 'is-active': active === tab.key }"
                    :data-tab="tab.key"
                    role="tabpanel"
                    :aria-label="tab.name"
                >
                    <slot :name="tab.key" />
                </section>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    .md-guide {
        container-type: inline-size;

        &__nav {
            position: sticky;
            top: var(--md-guide-sticky-top);
            background-color: var(--vp-c-bg-soft);
            padding: .375rem;
            border-radius: 10px;
            margin: 0 0 1.5rem;
            z-index: 5;
        }

        &__nav-title {
            display: none;
        }

        &__tabs {
            display: flex;
            gap: .25rem;
            padding: 0 !important;
            margin: 0 !important;
            list-style: none !important;
            overflow-x: auto;
            scrollbar-width: none;
        }

        &__tab-item {
            flex-shrink: 0;
            padding: 0 !important;
            margin: 0 !important;
            list-style: none !important;
        }

        &__tab {
            display: flex;
            gap: .5rem;
            align-items: center;
            background: none;
            width: 100%;
            padding: .375rem .75rem;
            border: none;
            border-radius: 6px;
            color: var(--vp-c-text-2);
            font: inherit;
            font-size: var(--font-size-s);
            white-space: nowrap;
            text-align: left;
            cursor: pointer;
            transition:
                color .25s var(--cubic-FiSo),
                background-color .25s var(--cubic-FiSo);

            &::before {
                content: '';
                flex-shrink: 0;
                background-color: var(--md-layer);
                width: 8px;
                height: 8px;
                border-radius: 2px;
                transition: transform .25s var(--cubic-FiSo);
            }

            &:hover,
            &:focus-visible {
                background-color: var(--vp-c-default-soft);
                color: var(--vp-c-text-1);
            }

            &.is-active {
                background-color: color-mix(in srgb, var(--md-layer) 16%, var(--vp-c-bg));
                color: var(--vp-c-text-1);
                font-weight: 600;

                &::before { transform: scale(1.25); }
            }
        }

        // 窄版是橫向分頁列，不放目錄
        &__toc {
            display: none;
        }

        &__panes {
            scroll-margin-top: calc(var(--md-guide-sticky-top) + 4rem);
        }

        &__pane {
            display: none;

            // 錨點捲過去時讓開吸頂的導覽
            [id] { scroll-margin-top: calc(var(--md-guide-sticky-top) + 4rem); }

            // 第一個 h2 不要再畫分隔線，分頁本身就是分隔
            > h2:first-child {
                padding-top: 0 !important;
                border-top: none !important;
                margin-top: 0 !important;
            }

            &.is-active {
                display: block;
                animation: md-guide-pane-in .4s var(--cubic-FiSo);
            }
        }

        // 寬版（設計系統頁）：右邊一欄給導覽，稜鏡捲出去之後才滑出來
        @container (width >= 1000px) {
            &__layout {
                display: grid;
                grid-template-columns: minmax(0, 1fr) 13rem;
                column-gap: 2.5rem;
            }

            &__hero {
                grid-row: 1;
                grid-column: 1;
            }

            &__panes {
                grid-row: 2;
                grid-column: 1;
                scroll-margin-top: var(--md-guide-sticky-top);
            }

            &__pane [id] { scroll-margin-top: calc(var(--md-guide-sticky-top) + 1rem); }

            &__nav {
                align-self: start;
                grid-row: 1 / span 2;
                grid-column: 2;
                background: none;
                padding: 0;
                margin: 0;
                pointer-events: none;
                transform: translateX(-2rem);
                transition:
                    opacity .35s var(--cubic-FiSo),
                    transform .45s var(--cubic-FiSo),
                    visibility 0s .45s;
                visibility: hidden;
                opacity: 0;
            }

            &__layout.is-docked &__nav {
                pointer-events: auto;
                transform: none;
                transition:
                    opacity .35s var(--cubic-FiSo),
                    transform .45s var(--cubic-FiSo);
                visibility: visible;
                opacity: 1;
            }

            &__nav-title {
                display: block;
                margin: 0 0 .5rem !important;
                color: var(--vp-c-text-2) !important;
                font-size: var(--font-size-xs) !important;
                letter-spacing: .08em;
            }

            &__tabs {
                flex-direction: column;
                gap: .125rem;
                overflow: visible;
            }

            &__toc {
                display: grid;
                grid-template-rows: 0fr;
                transition: grid-template-rows .35s var(--cubic-FiSo);

                &.is-open { grid-template-rows: 1fr; }

                ul {
                    padding: 0 0 0 1.75rem !important;
                    margin: 0 !important;
                    list-style: none !important;
                    overflow: hidden;
                }

                li {
                    padding: 0 !important;
                    margin: 0 !important;
                    list-style: none !important;
                }

                a {
                    display: block;
                    padding: .25rem .5rem;
                    border-left: 2px solid var(--vp-c-divider);
                    color: var(--vp-c-text-2) !important;
                    font-size: var(--font-size-xs);
                    line-height: 1.5;
                    text-decoration: none !important;
                    transition:
                        color .25s var(--cubic-FiSo),
                        border-color .25s var(--cubic-FiSo);

                    &:hover { color: var(--vp-c-text-1) !important; }

                    &.is-current {
                        border-color: var(--md-layer);
                        color: var(--vp-c-text-1) !important;
                    }
                }
            }
        }
    }
    @keyframes md-guide-pane-in {
        from {
            transform: translateY(8px);
            opacity: 0;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .md-guide__pane.is-active { animation: none; }
        .md-guide__nav { transition: none !important; }
    }
</style>
