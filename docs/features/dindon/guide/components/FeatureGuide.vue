<script setup lang="ts">
    import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
    import { ACCOUNT_PATH, CONTACT_EMAIL, DEMO_PATH, PRIVACY_PATH } from '../../constants';
    import { branches, features, findFeature, REVIEWED_APP_VERSION, stages } from '../featureMap';
    import FeatureDetail from './FeatureDetail.vue';
    import FeatureMindMap from './FeatureMindMap.vue';
    import FeatureShowcase from './FeatureShowcase.vue';
    import HabitPath from './HabitPath.vue';

    // 功能地圖頁（/dindon/guide/）：心智圖＋說明、養成路線、藏起來的操作。
    // 網址帶 #f-功能 直接選中那個功能，可以分享；養成路線每一段是 #stage-xxx。
    type Filter = 'all' | 'hidden' | 'demo' | `stage:${string}`;

    const selected = ref('');
    const filter = ref<Filter>('all');

    const activeStage = computed(() => (filter.value.startsWith('stage:') ? filter.value.slice(6) : ''));
    const highlight = computed<string[] | null>(() => {
        if (filter.value === 'hidden') return features.filter(f => f.hidden).map(f => f.id);
        if (filter.value === 'demo') return features.filter(f => f.demo).map(f => f.id);
        const stage = stages.find(s => s.id === activeStage.value);
        return stage ? stage.features : null;
    });
    const hiddenFeatures = features.filter(feature => feature.hidden);
    const stageOfFilter = computed(() => stages.find(s => s.id === activeStage.value));

    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** 把地圖上那個節點捲進畫面（從養成路線點過來的時候它可能在很遠的地方） */
    function revealNode(id: string) {
        void nextTick(() => {
            document.querySelector(`[data-node="f-${id}"]`)?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
        });
    }

    function select(id: string, reveal = false) {
        selected.value = id;
        history.replaceState(history.state, '', id ? `#f-${id}` : location.pathname + location.search);
        if (id && reveal) revealNode(id);
    }
    function toggleSelect(id: string) {
        select(selected.value === id ? '' : id);
    }

    function focusStage(stageId: string) {
        filter.value = activeStage.value === stageId ? 'all' : `stage:${stageId}`;
        if (filter.value !== 'all') {
            document.getElementById('map')?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
        }
    }
    function goToStage(stageId: string) {
        document.getElementById(`stage-${stageId}`)?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }

    function fromHash() {
        const match = /^#f-(.+)$/.exec(decodeURIComponent(location.hash));
        if (match && findFeature(match[1])) select(match[1], true);
    }
    function onKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && selected.value) select('');
    }

    // #region [P] 地圖開頭的介紹（FeatureShowcase）：播的時候地圖藏起來、高度收成介紹那麼高；飛回地圖時放開
    // 只在瀏覽器端決定要不要播（SSR 與沒有 JS 時地圖照常顯示）；網址指到某個功能、或關閉動態時不播
    const intro = ref<'off' | 'playing' | 'landing'>('off');
    const played = ref(false);
    function playIntro() {
        select('');
        intro.value = 'playing';
        played.value = true;
    }
    // #endregion

    onMounted(() => {
        if (!reducedMotion() && !/^#f-/.test(location.hash)) playIntro();
        fromHash();
        window.addEventListener('hashchange', fromHash);
        window.addEventListener('keydown', onKeydown);
    });
    onBeforeUnmount(() => {
        window.removeEventListener('hashchange', fromHash);
        window.removeEventListener('keydown', onKeydown);
    });
</script>

<template>
    <div class="dindon-landing dindon-guide">
        <!-- #region [P] 開頭 -->
        <header class="dindon-guide__hero">
            <div class="dindon-guide__container">
                <a class="dindon-guide__back" href="/dindon/">← 叮咚記帳</a>
                <h1 class="dindon-guide__headline">功能地圖</h1>
                <p class="dindon-guide__lead">
                    叮咚記帳的每一個功能、它們怎麼互相接起來、為什麼要這樣設計，還有那些不說就不知道的操作。最後是一條養成路線：用現在就有的功能，從「讓帳自己進來」一步一步走到「每月回顧」。
                </p>
                <p class="dindon-guide__meta">
                    App {{ REVIEWED_APP_VERSION }} · {{ features.length }} 個功能 · {{ branches.length }} 個分支 · {{ stages.length }} 段養成路線
                </p>
                <nav class="dindon-guide__toc" aria-label="頁面段落">
                    <a href="#map">功能地圖</a>
                    <a href="#path">養成路線</a>
                    <a href="#hidden">藏起來的操作</a>
                    <a :href="DEMO_PATH">功能演示影片</a>
                </nav>
            </div>
        </header>
        <!-- #endregion -->

        <main class="dindon-guide__container dindon-guide__main">
            <!-- #region [P] 地圖 -->
            <section id="map" class="dindon-guide__section" aria-labelledby="map-title">
                <h2 id="map-title" class="dindon-guide__section-title">功能地圖</h2>
                <p class="dindon-guide__section-lead">點一個功能看說明，會一起用的功能會連線。</p>

                <div class="dindon-guide__filters" role="group" aria-label="地圖上要標出哪些功能">
                    <button type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">全部</button>
                    <button type="button" :aria-pressed="filter === 'hidden'" @click="filter = 'hidden'">藏起來的操作</button>
                    <button type="button" :aria-pressed="filter === 'demo'" @click="filter = 'demo'">有演示影片</button>
                    <button v-if="played && intro === 'off'" type="button" class="replay" @click="playIntro">再看一次介紹</button>
                    <button v-if="stageOfFilter" type="button" aria-pressed="true" class="stage" @click="filter = 'all'">
                        {{ stageOfFilter.when }}・{{ stageOfFilter.title }} ✕
                    </button>
                </div>

                <div class="dindon-guide__workspace">
                    <div class="dindon-guide__layout">
                        <div class="dindon-guide__mapwrap" :class="intro !== 'off' && `is-${intro}`">
                            <FeatureMindMap :selected="selected" :highlight="highlight" @select="toggleSelect" />
                            <FeatureShowcase v-if="intro !== 'off'" @landing="intro = 'landing'" @done="intro = 'off'" />
                        </div>
                        <aside class="dindon-guide__aside" :class="{ 'is-open': !!selected }" aria-live="polite" aria-label="功能說明">
                            <FeatureDetail :id="selected" @select="id => select(id, true)" @stage="goToStage" @close="select('')" />
                        </aside>
                    </div>
                </div>
            </section>
            <!-- #endregion -->

            <!-- #region [P] 養成路線 -->
            <section id="path" class="dindon-guide__section" aria-labelledby="path-title">
                <h2 id="path-title" class="dindon-guide__section-title">養成路線</h2>
                <p class="dindon-guide__section-lead">
                    一次只加一件事。每一段大約的時間只是參考，做到「訊號」那一行再往下走；跳過帳戶那一段也完全沒關係。
                </p>
                <HabitPath :active="activeStage" @select="id => select(id, true)" @focus="focusStage" />
            </section>
            <!-- #endregion -->

            <!-- #region [P] 藏起來的操作 -->
            <section id="hidden" class="dindon-guide__section" aria-labelledby="hidden-title">
                <h2 id="hidden-title" class="dindon-guide__section-title">藏起來的操作</h2>
                <p class="dindon-guide__section-lead">按住、滑、拖、點數字，這些不說就不容易發現。</p>
                <ul class="dindon-guide__hidden">
                    <li v-for="feature in hiddenFeatures" :key="feature.id" :style="{ '--branch': `var(--g-${feature.branch})` }">
                        <button type="button" @click="select(feature.id, true)">
                            <span class="name">{{ feature.name }}</span>
                            <span class="how">{{ feature.hidden }}</span>
                        </button>
                    </li>
                </ul>
            </section>
            <!-- #endregion -->

            <p class="dindon-guide__outro">
                想自己玩玩看？<a href="/dindon/#beta">加入封閉測試</a>，或先看<a :href="DEMO_PATH">功能演示影片</a>。
            </p>
        </main>

        <footer class="dindon-landing__footer">
            <div class="dindon-landing__container">
                <a href="/dindon/">叮咚記帳</a>
                <span aria-hidden="true">·</span>
                <a :href="PRIVACY_PATH">隱私權政策</a>
                <span aria-hidden="true">·</span>
                <a :href="ACCOUNT_PATH">刪除資料與帳號</a>
                <span aria-hidden="true">·</span>
                <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>
            </div>
        </footer>
    </div>
</template>

<style lang="scss">
    // 配色、footer 沿用宣傳頁（根元素同時掛 .dindon-landing，吃同一組 --dd-* 與深色模式）
    .dindon-guide {
        // 七個分支的顏色；淡色版用表面色調出來，深淺模式各自對
        --g-capture: #2F6FDB;
        --g-tidy: #7A5AF8;
        --g-insight: #0B8A7C;
        --g-plan: #D9480F;
        --g-wallet: #2B8A3E;
        --g-habit: #C2255C;
        --g-trust: #5C677D;
        --g-capture-tint: color-mix(in srgb, var(--g-capture) 14%, var(--dd-surface));
        --g-tidy-tint: color-mix(in srgb, var(--g-tidy) 14%, var(--dd-surface));
        --g-insight-tint: color-mix(in srgb, var(--g-insight) 14%, var(--dd-surface));
        --g-plan-tint: color-mix(in srgb, var(--g-plan) 14%, var(--dd-surface));
        --g-wallet-tint: color-mix(in srgb, var(--g-wallet) 14%, var(--dd-surface));
        --g-habit-tint: color-mix(in srgb, var(--g-habit) 14%, var(--dd-surface));
        --g-trust-tint: color-mix(in srgb, var(--g-trust) 14%, var(--dd-surface));
        background: var(--dd-bg);
        color: var(--dd-text);

        &__container {
            max-width: 1280px;
            padding: 0 24px;
            margin: 0 auto;
            @include setRWD(500px) { padding: 0 16px; }
        }

        // #region [P] 開頭
        &__hero {
            background: var(--dd-accent);
            padding: 48px 0 28px;
            color: #1B1815;
            @include setRWD(768px) { padding-top: 32px; }
        }
        &__back {
            display: inline-block;
            margin-bottom: 12px;
            color: #1B1815;
            font-size: var(--font-size-s);
            font-weight: 700;
            text-decoration: none;
            &:hover { text-decoration: underline; }
        }
        &__headline {
            font-size: clamp(2rem, 4.5vw, 3rem);
            font-weight: 800;
            line-height: 1.25;
        }
        &__lead {
            max-width: 42em;
            margin-top: 12px !important;
            font-size: var(--font-size-m);
        }
        &__meta {
            margin-top: 8px !important;
            color: rgb(27 24 21 / 72%);
            font-size: var(--font-size-s);
        }
        &__toc {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
            margin-top: 24px;

            a {
                background: rgb(255 253 248 / 55%);
                padding: 4px 14px;
                border-radius: 999px;
                color: #1B1815;
                font-size: var(--font-size-s);
                font-weight: 700;
                text-decoration: none;
                @media (hover: hover) {
                    &:hover { background: #FFFDF8; }
                }
            }
        }

        // #endregion

        // #region [P] 段落
        &__main { padding-bottom: 72px; }
        &__section {
            padding-top: 56px;
            scroll-margin-top: var(--vp-nav-height);
        }
        &__section-title {
            font-size: var(--font-size-xl);
            font-weight: 800;
        }
        &__section-lead {
            max-width: 42em;
            margin: 6px 0 18px !important;
            color: var(--dd-muted);
        }

        // 介紹播的時候：地圖先藏著、高度收成介紹舞台那麼高（下面不會空一大塊）；飛回來時放開高度、地圖淡入
        &__mapwrap {
            position: relative;

            // 跟 showcase.ts 的 SHOWCASE_WIDE_H／SHOWCASE_NARROW_H 一樣（窄螢幕的判斷是 720px）
            &.is-playing {
                max-height: 560px;
                overflow: clip;
                @include setRWD(760px) { max-height: 760px; }
            }
            &.is-playing .dd-mindmap { opacity: 0; }
            &.is-landing .dd-mindmap { animation: dd-guide-map-in .5s .9s both; }
        }
        &__filters .replay { margin-left: auto; }
        &__filters {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
            margin-bottom: 24px;

            button {
                background: var(--dd-surface);
                padding: 4px 14px;
                border: 1.5px solid var(--dd-border);
                border-radius: 999px;
                color: var(--dd-text);
                font: inherit;
                font-size: var(--font-size-s);
                cursor: pointer;

                &[aria-pressed=true] {
                    background: var(--dd-text);
                    border-color: var(--dd-text);
                    color: var(--dd-bg);
                    font-weight: 700;
                }
                &.stage[aria-pressed=true] {
                    background: var(--dd-accent);
                    border-color: #1B1815;
                    color: #1B1815;
                }
                &:focus-visible { outline: 3px solid var(--dd-primary); }
            }
        }

        // #endregion

        // #region [P] 地圖與說明：寬的時候說明黏在右邊；窄的時候選了才從底下拉上來
        &__workspace { container: guide-work / inline-size; }
        &__layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
        }
        &__aside {
            position: fixed;
            right: 0;
            bottom: 0;
            left: 0;
            background: var(--dd-surface);
            max-height: 72dvh;
            padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
            border-top: 1px solid var(--dd-border);
            border-radius: 24px 24px 0 0;
            box-shadow: 0 -8px 24px rgb(27 24 21 / 16%);
            transform: translateY(100%);
            transition: transform .25s var(--cubic-FiSo), visibility 0s .25s;
            visibility: hidden;
            overflow-y: auto;
            z-index: 30;

            &.is-open {
                transform: none;
                transition: transform .3s var(--cubic-FiSo), visibility 0s;
                visibility: visible;
            }
        }
        @container guide-work (width >= 1080px) {
            &__layout {
                grid-template-columns: minmax(0, 1fr) 320px;
                gap: 28px;
                align-items: start;
            }
            &__aside {
                position: sticky;
                inset: calc(var(--vp-nav-height) + 16px) auto auto;
                max-height: calc(100dvh - var(--vp-nav-height) - 32px);
                padding: 20px;
                border: 1px solid var(--dd-border);
                border-radius: var(--dd-radius);
                box-shadow: none;
                transform: none;
                transition: none;
                visibility: visible;
                z-index: auto;
            }
            &__aside .dd-feature-detail__close { display: none; }
        }

        // #endregion

        // #region [P] 藏起來的操作
        &__hidden {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 12px;
            padding: 0;
            list-style: none;

            button {
                @include setFlex(flex-start, flex-start, 4px, column);
                background: var(--dd-surface);
                @include setSize(100%, 100%);
                padding: 14px 16px;
                border: 1px solid var(--dd-border);
                border-left: 4px solid var(--branch);
                border-radius: 14px;
                color: var(--dd-text);
                font: inherit;
                text-align: left;
                cursor: pointer;
                @media (hover: hover) {
                    &:hover { border-color: var(--branch); }
                }
                &:focus-visible { outline: 3px solid var(--dd-primary); }
            }
            .name { font-weight: 800; }
            .how {
                color: var(--dd-muted);
                font-size: var(--font-size-s);
                line-height: 1.6;
            }
        }

        // #endregion

        &__outro {
            margin-top: 56px !important;
            font-size: var(--font-size-m);
            text-align: center;

            a {
                color: var(--dd-primary);
                font-weight: 700;
                text-decoration: underline;
                text-underline-offset: 3px;
            }
        }
        @media (prefers-reduced-motion: reduce) {
            &__aside, &__aside.is-open { transition: none; }
        }
    }

    .dark .dindon-guide {
        --g-capture: #76A9FF;
        --g-tidy: #A99BFF;
        --g-insight: #3CCFBF;
        --g-plan: #FF8A50;
        --g-wallet: #5BCB6E;
        --g-habit: #F06595;
        --g-trust: #9AA6BD;
    }
    @keyframes dd-guide-map-in {
        from { opacity: 0; }
    }
</style>
