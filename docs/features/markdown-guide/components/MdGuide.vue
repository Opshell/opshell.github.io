<script setup lang="ts">
    import type { TabKey } from '../constants';
    import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
    import { GUIDE_TABS } from '../constants';
    import MdPrism from './MdPrism.vue';

    // 語法圖鑑的外框：稜鏡在最上面，內容拆成分頁（slot 名稱＝GUIDE_TABS 的 key，內容由 md 傳進來才會經過 markdown 編譯）。
    // 往下捲、稜鏡捲過吸頂線之後，右側的導覽「停靠」出來，兼當分頁與目錄；版面太窄（文章頁）時改成吸頂的橫向分頁列。
    // 每一頁結尾有一段「接力區」：讀完繼續往下捲，進度條填滿就自然進入下一頁。
    const active = ref<TabKey>('overview');
    const current = ref('');
    const docked = ref(false);
    const progress = ref(0);

    const rootEl = ref<HTMLElement>();
    const heroEl = ref<HTMLElement>();
    const navEl = ref<HTMLElement>();
    const panesEl = ref<HTMLElement>();
    const relayEl = ref<HTMLElement>();

    const activeIndex = computed(() => GUIDE_TABS.findIndex(tab => tab.key === active.value));
    const nextTab = computed(() => GUIDE_TABS[activeIndex.value + 1]);

    // 捲動時每一格都要讀的東西先算好：吸頂線（CSS 變數，視窗大小變了才重算）與這一頁小標題的元素
    let stickyTop = 64;
    let itemEls: HTMLElement[] = [];

    function measure() {
        if (navEl.value) stickyTop = Number.parseFloat(getComputedStyle(navEl.value).top) || 64;
        itemEls = (GUIDE_TABS[activeIndex.value]?.items ?? [])
            .map(item => document.getElementById(item.id))
            .filter((el): el is HTMLElement => !!el);
    }

    // 接力：只在往下捲時算數，切過去之後冷卻一下，避免慣性滑動一次跳兩頁
    let lastY = 0;
    let coolUntil = 0;

    function update() {
        const y = window.scrollY;
        const goingDown = y > lastY;
        lastY = y;

        if (heroEl.value) docked.value = heroEl.value.getBoundingClientRect().bottom < stickyTop + 24;

        // 目前讀到哪一節：最後一個捲過吸頂線下方一點的小標題
        let id = '';
        for (const el of itemEls) {
            if (el.getBoundingClientRect().top <= stickyTop + 96) id = el.id;
        }
        current.value = id;

        // 接力區的頂端進到畫面底部時是 0，整段捲完（底端碰到畫面底部）是 1
        if (relayEl.value) {
            const rect = relayEl.value.getBoundingClientRect();
            const value = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / rect.height));
            progress.value = Math.round(value * 100) / 100;
            if (value >= 1 && goingDown && performance.now() > coolUntil) advance();
        }
    }

    let frame = 0;
    function onScroll() {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(update);
    }

    // 頁面已經捲到底、接力區也滿了，再往下滾不會有 scroll 事件；這時候的滾輪／往上滑也算「想看下一頁」。
    // 只認使用者主動的動作，停在那邊不動不會自己跳走
    function nudge() {
        if (progress.value >= 1 && performance.now() > coolUntil) advance();
    }

    function onWheel(event: WheelEvent) {
        if (event.deltaY > 0) nudge();
    }

    let touchY = 0;
    function onTouchStart(event: TouchEvent) {
        touchY = event.touches[0]?.clientY ?? 0;
    }
    function onTouchMove(event: TouchEvent) {
        if (touchY - (event.touches[0]?.clientY ?? touchY) > 40) nudge();
    }

    function onResize() {
        measure();
        onScroll();
    }

    // 捲到某個元素，扣掉它的 scroll-margin-top（讓開吸頂的導覽）。
    // 不用 scrollIntoView：分頁剛從 display: none 打開、淡入動畫才開始的那一刻，Chrome 會把平滑捲動吃掉，等下一格再自己算位置
    function scrollToEl(el: HTMLElement, behavior: ScrollBehavior = 'smooth') {
        nextTick(() => requestAnimationFrame(() => {
            const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
            window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - margin, behavior });
        }));
    }

    // 切換分頁；人已經捲進內容裡的話，帶回這一頁的開頭，不然會停在上一頁的位置看到一半
    function select(key: TabKey) {
        active.value = key;
        current.value = '';
        if (panesEl.value && panesEl.value.getBoundingClientRect().top < stickyTop) scrollToEl(panesEl.value);
    }

    // 進入下一頁：直接把新的一頁接在吸頂線下面（不再平滑捲一大段回去），靠分頁本身的淡入當轉場，讀起來像翻頁
    function advance() {
        if (!nextTab.value || !panesEl.value) return;
        coolUntil = performance.now() + 700;
        active.value = nextTab.value.key;
        current.value = '';
        progress.value = 0;
        scrollToEl(panesEl.value, 'instant');
    }

    // 錨點指到這份圖鑑裡的小節時（光譜的長條、導覽的目錄、文章右側的目錄、直接帶 #id 的網址），先切到它的分頁再捲過去
    function reveal(hash: string) {
        const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
        const pane = target?.closest<HTMLElement>('[data-tab]');
        if (!target || !pane || !rootEl.value?.contains(pane)) return false;

        active.value = pane.dataset.tab as TabKey;
        coolUntil = performance.now() + 900;
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

    // 換頁之後這一頁的小標題不一樣，DOM 更新完再重抓
    watch(active, () => nextTick(() => {
        measure();
        update();
    }));

    onMounted(() => {
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });
        window.addEventListener('wheel', onWheel, { passive: true });
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('click', onClick, true);
        lastY = window.scrollY;
        measure();
        reveal(location.hash);
        update();
    });

    onUnmounted(() => {
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
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

            <!-- 接力區：卡片在這段裡吸住不動，往下捲時進度條填滿，滿了就進入下一頁；也可以直接點 -->
            <div v-if="nextTab" ref="relayEl" class="md-guide__relay" :class="`is-${nextTab.key}`" :style="{ '--progress': progress }">
                <div class="md-guide__relay-card">
                    <span class="md-guide__relay-hint">讀完了？繼續往下捲，進入下一道光</span>
                    <button type="button" class="md-guide__relay-name" @click="advance">
                        {{ nextTab.name }}<span aria-hidden="true">↓</span>
                    </button>
                    <span class="md-guide__relay-bar" aria-hidden="true" />
                </div>
            </div>
            <div v-else class="md-guide__relay is-end">
                <div class="md-guide__relay-card">
                    <span class="md-guide__relay-hint">七彩的光都看完了</span>
                    <button type="button" class="md-guide__relay-name" @click="select('overview')">
                        回到光譜總覽<span aria-hidden="true">↑</span>
                    </button>
                </div>
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

        // 接力區要有一段捲動距離，進度才有東西可以填；最後一頁不接力，只留一張回總覽的卡
        &__relay {
            height: 55vh;
            min-height: 280px;
            margin-top: 3rem;

            &.is-end {
                height: auto;
                min-height: 0;
            }
        }

        &__relay-card {
            position: sticky;
            top: 40vh;
            display: flex;
            flex-direction: column;
            gap: .5rem;
            align-items: center;
            background-color: var(--vp-c-bg-soft);
            padding: 1.25rem 1.5rem;
            border-radius: 12px;
            text-align: center;
        }

        &__relay-hint {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }

        &__relay-name {
            display: inline-flex;
            gap: .5rem;
            align-items: center;
            background: none;
            padding: .25rem .75rem;
            border: none;
            border-radius: 8px;
            color: var(--md-layer);
            font: inherit;
            font-size: var(--font-size-l);
            font-weight: 700;
            cursor: pointer;
            transition: background-color .25s var(--cubic-FiSo);

            span { transition: transform .25s var(--cubic-FiSo); }

            &:hover,
            &:focus-visible {
                background-color: color-mix(in srgb, var(--md-layer) 12%, transparent);

                span { transform: translateY(3px); }
            }
        }

        // 進度條：寬度跟著捲動走，不加 transition，捲多少就填多少才跟手
        &__relay-bar {
            position: relative;
            background-color: var(--vp-c-divider);
            width: min(16rem, 100%);
            height: 4px;
            border-radius: 2px;
            overflow: hidden;

            &::after {
                content: '';
                position: absolute;
                inset: 0;
                background-color: var(--md-layer);
                transform: scaleX(var(--progress, 0));
                transform-origin: left;
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

            &__relay {
                grid-row: 3;
                grid-column: 1;
            }

            // 導覽跨到接力區，捲到接力區時還停靠著
            &__nav {
                align-self: start;
                grid-row: 1 / span 3;
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
