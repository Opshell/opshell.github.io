<script setup lang="ts">
    import type { Ray } from '../prism';
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { categoryHue, categoryLabel, hueVar } from '@shared/utils/spectrum';
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { BLOG_INTRO, BLOG_MOTTO, BLOG_NAME, LATEST_COUNT, launchpads, moreLinks, nameParts, PHILOSOPHY_URL } from '../constants';
    import { chapters, postsInCategories, seriesOf, yearlyCounts } from '../contents';
    import { INTRO, introState } from '../intro';
    import { buildRays, rayFor } from '../prism';
    import { vSpotlight } from '../spotlight';
    import HomeIntro from './HomeIntro.vue';
    import LightStage from './LightStage.vue';
    import SeriesTracks from './SeriesTracks.vue';

    // 首頁（2026-10「稜鏡」翻新，第三版 2026-10-06）。使用者：首頁可以放開來，多一點動態、互動、特效，不用像讀文章時那麼拘謹。
    // - 開場（HomeIntro＋這裡＋LightStage，約 7.3 秒，故事見 intro.ts）：LOGO、名字、Slogan → 收成一個光點 → 光點飛過來綻開成 O →
    //   白光從天上射進 O → 一道道落到分類 → 最近在忙的、文章依序出現
    // - 定格：左邊「最近在忙的」三張大卡；右邊玻璃 O，光從畫面上方射進來（LightStage 是蓋在上半部的畫布）
    // - 光往下落在文章區的分隔線上（標題與卡片之間），每一道對準一個分類標籤；標籤集中在 O 的下方，光自然地散開、不硬鋪滿整個寬
    //   （使用者：「光束從天上下來、透過圓玻璃、連結到下方文章區塊應該更合理」；後來：「不要極光背景，分隔線回到文字與卡片之間，光線不用特地鋪平」）
    // - 卡片樣式統一，只換顏色（那一類的光的顏色）；滑過卡片那道光亮，滑過光或標籤那一類的卡片亮
    // - 兩個三十天、為什麼叫 Opshell 照舊
    const siteData = useSiteData();

    const posts = computed(() => [...(siteData.value?.posts.values() ?? [])].filter(post => post.date));
    const rays = computed(() => buildRays(chapters(posts.value)));
    const series = computed(() => seriesOf(posts.value));
    const counts = computed(() => siteData.value?.counts);
    const rootRef = ref<HTMLElement>();

    // #region [P] 選了哪一道光；滑過光或標籤（hoverRay）亮那一類的卡片，滑過卡片（hintRay）亮那道光
    const selected = ref<string | null>(null);
    const selectedRay = computed(() => rays.value.find(ray => ray.key === selected.value) ?? null);
    const shown = computed(() => postsInCategories(posts.value, selectedRay.value?.members ?? null, LATEST_COUNT));
    const hoverRay = ref<string | null>(null);
    const hintRay = ref<string | null>(null);
    const focusRay = computed(() => hoverRay.value ?? hintRay.value ?? selected.value);
    const cards = computed(() => shown.value.map(post => ({ post, ray: rayFor(rays.value, post.category[0]) })));
    const hueOf = (ray: Ray | undefined, category: string[]) => hueVar(ray?.hue ?? categoryHue(category[0] ?? ''));

    /** 分隔線的三種顏色：白光時是品牌的光譜，選了一道光就是那一類的顏色深深淺淺 */
    const lineColors = computed(() => {
        const ray = selectedRay.value;
        if (!ray) return { '--a1': 'var(--pr-amber)', '--a2': 'var(--pr-magenta)', '--a3': 'var(--pr-violet)' };
        const hue = hueVar(ray.hue);
        return { '--a1': hue, '--a2': `color-mix(in srgb, ${hue} 70%, var(--op-origin))`, '--a3': `color-mix(in srgb, ${hue} 65%, var(--pr-violet))` };
    });

    const latestRef = ref<HTMLElement>();
    /** 點了一道光：底下的文章不在畫面裡的話（窄螢幕），捲過去；再點一次同一道是回到全部 */
    function pick(key: string | null) {
        selected.value = selected.value === key ? null : key;
        const top = latestRef.value?.getBoundingClientRect().top ?? 0;
        if (selected.value && top > window.innerHeight * 0.75) latestRef.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
    // #endregion

    // #region [P] 開場：JS 接手時才開始播（playing），播完、或使用者點了／捲了／按了鍵就定格（settled）
    // JS 太晚接手（超過 1.5 秒，沒 JS 時那層 2 秒就自己淡掉了）就不播，直接定格
    const SKIP_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    const settled = ref(introState.played);
    const playing = ref(false);
    const introAt = ref<number | null>(null);
    let introTimer = 0;
    function release() {
        clearTimeout(introTimer);
        for (const type of SKIP_EVENTS) window.removeEventListener(type, settle);
    }
    function settle() {
        settled.value = true;
        playing.value = false;
        introAt.value = null;
        release();
    }
    onMounted(() => {
        const late = performance.now() > 1500;
        const still = !window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
        if (settled.value || late || still) return settle();
        introState.played = true;
        introAt.value = performance.now();
        playing.value = true;
        introTimer = window.setTimeout(settle, INTRO.done);
        for (const type of SKIP_EVENTS) window.addEventListener(type, settle, { passive: true });
    });
    onBeforeUnmount(release);
    // #endregion

    // #region [P] Timeline 卡片：每年寫幾篇
    const years = computed(() => yearlyCounts(posts.value));
    const yearMax = computed(() => Math.max(1, ...years.value.map(y => y.count)));
    // #endregion

    // #region [P] 名字那一段：捲到才亮（沒有 JS、關閉動態時一開始就亮著）
    const aboutRef = ref<HTMLElement>();
    const lit = ref(true);
    let observer: IntersectionObserver | undefined;
    onMounted(() => {
        if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
        lit.value = false;
        observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            lit.value = true;
            observer?.disconnect();
        }, { threshold: 0.4 });
        observer.observe(aboutRef.value!);
    });
    onBeforeUnmount(() => observer?.disconnect());
    // #endregion

    const categoryOf = (category: string[]) => category[0] ?? '';
</script>

<template>
    <div ref="rootRef" class="op-home" :class="{ 'is-intro': !settled, 'is-playing': playing }">
        <HomeIntro v-if="!settled" :playing="playing" />
        <LightStage :rays="rays" :focus="focusRay" :intro-at="introAt" @hover="hoverRay = $event" @select="pick" />

        <div class="op-home__sr">
            <h1>{{ BLOG_NAME }}</h1>
            <p>{{ BLOG_INTRO }}{{ BLOG_MOTTO }}</p>
        </div>

        <!-- #region [P] hero：左邊最近在忙的，右邊玻璃 O（光從上面來） -->
        <header class="op-home__hero">
            <section class="op-home__now" aria-labelledby="op-home-now">
                <div class="op-home__section-head op-home__appear">
                    <h2 id="op-home-now">最近在忙的</h2>
                    <nav class="op-home__more" aria-label="其他入口">
                        <a v-for="link in moreLinks" :key="link.href" :href="link.href">{{ link.text }}</a>
                    </nav>
                </div>
                <div class="op-home__pads">
                    <a v-spotlight class="op-pad op-pad--dindon" :href="launchpads.dindon.href" style="--i: 0">
                        <span class="op-pad__head">
                            <img :src="launchpads.dindon.icon" alt="" width="40" height="40" />
                            <span class="op-pad__status"><span class="pulse" aria-hidden="true" />{{ launchpads.dindon.status }}</span>
                        </span>
                        <span class="op-pad__title">{{ launchpads.dindon.title }}</span>
                        <span class="op-pad__text">{{ launchpads.dindon.text }}</span>
                        <span class="op-pad__chips">
                            <span v-for="(feature, index) in launchpads.dindon.features" :key="feature" :style="{ '--c': index }">{{ feature }}</span>
                        </span>
                        <img class="op-pad__screen" :src="launchpads.dindon.screen" alt="" loading="lazy" width="240" height="520" />
                    </a>
                    <a v-spotlight class="op-pad op-pad--timeline" :href="launchpads.timeline.href" style="--i: 1">
                        <span class="op-pad__title">{{ launchpads.timeline.title }}</span>
                        <span class="op-pad__text">
                            寫了 {{ counts?.published ?? posts.length }} 篇<template v-if="counts">，坑裡還有 {{ counts.unpublished }} 篇</template>。
                        </span>
                        <span class="op-pad__bars" aria-hidden="true">
                            <span v-for="y in years" :key="y.year" class="bar" :style="{ '--h': y.count / yearMax }">
                                <span class="fill" />
                                <span class="n">{{ y.count || '' }}</span>
                                <span class="year">{{ y.year.slice(2) }}</span>
                            </span>
                        </span>
                    </a>
                    <a v-spotlight class="op-pad op-pad--resume" :href="launchpads.resume.href" style="--i: 2">
                        <span class="op-pad__head">
                            <img class="op-pad__portrait" :src="launchpads.resume.portrait" alt="" loading="lazy" width="40" height="40" />
                            <span class="op-pad__title">{{ launchpads.resume.title }}</span>
                        </span>
                        <span class="op-pad__role">{{ launchpads.resume.role }}</span>
                        <span class="op-pad__text">{{ launchpads.resume.text }}</span>
                    </a>
                </div>
                <!-- 卡片整張是連結，裡面不能再放連結：DinDon 的兩個子頁放在卡片外 -->
                <p class="op-home__sublinks op-home__appear">
                    DinDon 記帳還有
                    <a v-for="link in launchpads.dindon.links" :key="link.href" :href="link.href">{{ link.text }}</a>
                </p>
            </section>

            <div class="op-home__sky">
                <!-- 白光：從頁面最上面垂直打進 O -->
                <span class="op-home__beam" aria-hidden="true" />
                <p class="op-home__caption op-home__appear">
                    白光從天上來，在 O 裡演化，落成底下寫的每一類。光越寬，文章越多；點一道光或分類，看那一類。
                </p>
                <!-- 玻璃 O：點了回到全部。裡面的光絲畫在 LightStage 的畫布上（量這顆的位置） -->
                <button
                    type="button"
                    class="op-home__orb"
                    :class="{ 'is-selected': selected === null }"
                    :aria-pressed="selected === null"
                    aria-label="全部分類（白光）"
                    @click="pick(null)"
                >
                    <svg viewBox="0 0 240 240" aria-hidden="true">
                        <defs>
                            <linearGradient id="op-orb-ring" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="15%" stop-color="var(--pr-amber)" />
                                <stop offset="55%" stop-color="var(--pr-magenta)" />
                                <stop offset="90%" stop-color="var(--pr-violet)" />
                            </linearGradient>
                            <radialGradient id="op-orb-glass" cx="42%" cy="38%" r="70%">
                                <stop offset="0%" stop-color="var(--op-glass-core)" />
                                <stop offset="70%" stop-color="var(--op-glass-edge)" />
                                <stop offset="100%" stop-color="var(--op-glass-rim)" />
                            </radialGradient>
                            <!-- 光暈是不動的：模糊只算一次 -->
                            <filter id="op-orb-halo" x="-60%" y="-60%" width="220%" height="220%">
                                <feGaussianBlur stdDeviation="22" />
                            </filter>
                        </defs>
                        <circle class="halo" cx="120" cy="120" r="112" fill="url(#op-orb-ring)" filter="url(#op-orb-halo)" />
                        <circle class="body" cx="120" cy="120" r="112" fill="url(#op-orb-glass)" />
                        <circle class="orbit" cx="120" cy="120" r="76" />
                        <circle class="thick" cx="120" cy="120" r="103" stroke="url(#op-orb-ring)" />
                        <circle class="ring" cx="120" cy="120" r="112" stroke="url(#op-orb-ring)" />
                    </svg>
                </button>
            </div>
        </header>
        <!-- #endregion -->

        <!-- #region [P] 文章：光落在分隔線上、每一道對準一個分類；極光從分隔線往下籠罩整區 -->
        <section ref="latestRef" class="op-home__latest" aria-labelledby="op-home-latest" :style="lineColors">
            <div class="op-home__latest-head">
                <div class="op-home__latest-title">
                    <h2 id="op-home-latest" aria-live="polite">
                        {{ selectedRay ? selectedRay.label : '最近寫的' }}
                        <span v-if="selectedRay" class="count">{{ selectedRay.count }} 篇</span>
                    </h2>
                    <div class="op-home__section-links">
                        <button v-if="selectedRay" type="button" @click="pick(null)">看全部分類</button>
                        <a v-if="selectedRay && selectedRay.key !== '其他'" :href="selectedRay.href">從第一篇讀起</a>
                        <a v-else href="/timeline.html">看全部 {{ counts?.published ?? posts.length }} 篇</a>
                    </div>
                </div>
                <!-- 每一類一個標籤，光從 O 落在它正下方的分隔線上（LightStage 量標籤的中心） -->
                <div class="op-home__labels" role="group" aria-label="分類">
                    <button
                        v-for="(ray, index) in rays"
                        :key="ray.key"
                        type="button"
                        class="op-home__label"
                        :class="{ 'is-selected': selected === ray.key, 'is-focused': focusRay === ray.key, 'is-muted': !!focusRay && focusRay !== ray.key }"
                        :style="{ '--hue': hueVar(ray.hue), '--i': index }"
                        :aria-pressed="selected === ray.key"
                        :title="`最新：${ray.latest.title}`"
                        @click="pick(ray.key)"
                        @pointerenter="hoverRay = ray.key"
                        @pointerleave="hoverRay = null"
                        @focus="hoverRay = ray.key"
                        @blur="hoverRay = null"
                    >
                        <span class="name">{{ ray.label }}</span>
                        <span class="count">{{ ray.count }}</span>
                    </button>
                </div>
            </div>
            <span :key="`line-${selected ?? 'white'}`" class="op-home__divider" aria-hidden="true" />
            <TransitionGroup tag="ol" name="op-card" class="op-home__cards">
                <li v-for="({ post, ray }, index) in cards" :key="post.url" :style="{ '--i': index }">
                    <a
                        v-spotlight
                        class="op-home__card"
                        :class="{ 'is-lit': !!hoverRay && ray?.key === hoverRay, 'is-dim': !!hoverRay && ray?.key !== hoverRay }"
                        :href="post.url"
                        :style="{ '--hue': hueOf(ray, post.category) }"
                        @pointerenter="hintRay = ray?.key ?? null"
                        @pointerleave="hintRay = null"
                        @focus="hintRay = ray?.key ?? null"
                        @blur="hintRay = null"
                    >
                        <span class="op-home__card-cat">{{ categoryLabel(categoryOf(post.category)) }}</span>
                        <h3>{{ post.title }}</h3>
                        <p v-if="post.excerpt">{{ post.excerpt }}</p>
                        <time :datetime="post.date">{{ post.date }}</time>
                    </a>
                </li>
            </TransitionGroup>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 兩個三十天 -->
        <section v-if="series.length" class="op-home__section" aria-labelledby="op-home-series">
            <div class="op-home__section-head">
                <h2 id="op-home-series">兩個三十天</h2>
                <span class="op-home__note">鐵人賽，一天一篇。滑過一格看那天寫什麼</span>
            </div>
            <SeriesTracks :series="series" />
        </section>
        <!-- #endregion -->

        <!-- #region [P] 名字的由來 -->
        <section ref="aboutRef" class="op-home__section op-home__about" :class="{ 'is-lit': lit }" aria-labelledby="op-home-name">
            <div class="op-home__section-head">
                <h2 id="op-home-name">為什麼叫 Opshell</h2>
                <a :href="PHILOSOPHY_URL">讀〈Opshell 的哲學意義〉</a>
            </div>
            <dl class="op-home__parts">
                <div v-for="(item, index) in nameParts" :key="item.part" :style="{ '--i': index }">
                    <dt><span class="part">{{ item.part }}</span>{{ item.title }}</dt>
                    <dd>{{ item.text }}</dd>
                </div>
            </dl>
        </section>
        <!-- #endregion -->
    </div>
</template>

<style lang="scss">
    // page 版型沒有底色（網站的 body 是黑的），首頁自己鋪
    /* stylelint-disable-next-line selector-class-pattern -- .Layout 是 VitePress 的版型 class */
    .Layout.op-home-page {
        background: var(--vp-c-bg);

        // 窄螢幕時 VitePress 會補一條「Return to top」（VPLocalNav）；舊首頁（home 版型）沒有，這裡也不要
        /* stylelint-disable-next-line selector-class-pattern -- VitePress 的元件 class */
        .VPLocalNav { display: none; }
    }

    .op-home {
        // 琥珀當字的顏色：深色背景用原色，淺色背景太淡，換深一點的
        --op-amber-ink: var(--pr-amber);

        // 光與玻璃的顏色：畫布（LightStage）從這裡讀
        --op-beam: #FFF8E7;
        --op-star: #FFF;
        --op-glass-core: rgb(255 255 255 / 2%);
        --op-glass-edge: rgb(189 52 254 / 6%);
        --op-glass-rim: rgb(244 185 54 / 16%);
        position: relative;
        @include setFlex(flex-start, stretch, 5rem, column);
        width: 100%;
        max-width: 1200px;
        padding: 2rem 2rem 6rem;
        margin: 0 auto;
        @include setRWD(768px) {
            gap: 3.5rem;
            padding: 2rem 1rem 4rem;
        }

        // 用 :where() 把重設的權重降到 0，下面各元素自己的 margin 才蓋得過去
        :where(h1, h2, h3, p, dl, dd) { margin: 0; }

        // 畫布蓋在上半部（z-index 0），內容疊在它上面；游標在一道光上時變手指（LightStage 加的 class）
        > :not(.op-light, .op-intro, .op-home__sr) {
            position: relative;
            z-index: 1;
        }
        &.is-on-ray { cursor: pointer; }
        a:focus-visible {
            border-radius: 4px;
            outline: 2px solid var(--vp-c-brand-1);
            outline-offset: 3px;
        }

        // #region [P] hero：左邊最近在忙的；右邊上面一句說明、下面玻璃 O（底部跟大卡切齊，光往下散時從大卡底下過）
        &__hero {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 2.5rem;
            align-items: end;

            // 窄螢幕一欄：拆開 hero，順序改成 O → 文章 → 最近在忙的 → 其他，
            // 光才能從 O 直直落到文章（中間不隔著大卡），開場時 O 也在第一個畫面裡
            @include setRWD(960px) { display: contents; }
        }
        @include setRWD(960px) {
            &__sky { order: -1; }
            &__now { order: 1; }
            &__section { order: 2; }
        }
        &__sr {
            position: absolute;
            clip-path: inset(50%);
            width: 1px;
            height: 1px;
            white-space: nowrap;
            overflow: hidden;
        }
        &__now {
            @include setFlex(flex-start, stretch, 1rem, column);
        }
        &__sky {
            --orb-size: 260px;
            position: relative;
            @include setFlex(space-between, center, 1.5rem, column);
            align-self: stretch;
            pointer-events: none; // 空的地方讓給畫布的滑鼠（點光、瞄準）
        }
        @include setRWD(600px) {
            &__sky { --orb-size: 220px; }
        }

        // 白光（2026-10-06 從畫布搬出來，使用者：「太吃效能」）：一個元素、幾層 CSS 漸層——中間細而亮的芯，兩邊越來越淡；
        // 上面淡進來，停在玻璃圈的上緣（圈在 240 的方格裡從 8 開始）。不動：任何一直跑的 CSS 動畫都會讓整頁每秒合成 60 次
        &__beam {
            position: absolute;
            top: -2rem; // 首頁最外層的上緣（扣掉 padding）
            bottom: calc(var(--orb-size) * (1 - 8 / 240));
            left: 50%;
            background:
                linear-gradient(90deg, transparent 30.4px, var(--op-beam) 30.4px 33.6px, transparent 33.6px),
                linear-gradient(
                    90deg,
                    transparent,
                    color-mix(in srgb, var(--op-beam) 6%, transparent) 20%,
                    color-mix(in srgb, var(--op-beam) 16%, transparent) 38%,
                    color-mix(in srgb, var(--op-beam) 45%, transparent) 50%,
                    color-mix(in srgb, var(--op-beam) 16%, transparent) 62%,
                    color-mix(in srgb, var(--op-beam) 6%, transparent) 80%,
                    transparent
                );
            width: 64px;
            margin-left: -32px;
            pointer-events: none;
            transform-origin: top;
            z-index: -1;
            mask-image: linear-gradient(to bottom, transparent, #000 30%);

            // 打在玻璃上的那一點
            &::before {
                content: '';
                position: absolute;
                bottom: -16px;
                left: 50%;
                background: radial-gradient(closest-side, var(--op-beam), transparent);
                width: 48px;
                height: 32px;
                margin-left: -24px;
            }
        }

        // 說明放左上，讓開正中間垂直落下的白光
        &__caption {
            align-self: flex-start;
            max-width: 15em;
            color: var(--vp-c-text-2);
            @include setRWD(600px) { display: none; } // 手機太窄，會壓到白光；標籤本身就看得懂
            font-size: var(--font-size-s);
            line-height: 1.8;
        }

        // 玻璃 O：光絲畫在畫布上，這裡只有玻璃（不動）
        &__orb {
            display: block;
            background: none;
            width: var(--orb-size);
            height: var(--orb-size);
            padding: 0;
            border: 0;
            border-radius: 50%;
            pointer-events: auto;
            cursor: pointer;

            svg {
                display: block;
                width: 100%;
                height: 100%;
                overflow: visible;
            }
            .halo { opacity: .3; }
            .ring {
                fill: none;
                stroke-width: 3;
            }
            .thick {
                fill: none;
                stroke-width: 16;
                opacity: .16;
            }
            .orbit {
                fill: none;
                stroke: var(--op-star);
                stroke-dasharray: 2 9;
                stroke-width: 1;
                opacity: .2;
            }
            &:focus-visible {
                outline: 2px solid var(--vp-c-brand-1);
                outline-offset: 6px;
            }
        }

        // #region [P] 段落
        &__section {
            @include setFlex(flex-start, stretch, 1.5rem, column);
        }
        &__section-head {
            @include setFlex(space-between, baseline, 1rem);
            flex-wrap: wrap;

            h2 {
                @include setFlex(flex-start, baseline, .75rem);
                font-size: var(--font-size-xl);
                font-weight: 800;

                .count {
                    color: var(--vp-c-text-2);
                    font-family: var(--vp-font-family-mono);
                    font-size: var(--font-size-s);
                    font-weight: 500;
                }
            }
            a,
            button {
                background: none;
                padding: 0;
                border: 0;
                color: var(--vp-c-brand-1);
                font: inherit;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;

                &:hover { text-decoration: underline; }
            }
        }
        &__section-links,
        &__more {
            @include setFlex(flex-end, baseline, 1.25rem);
            flex-wrap: wrap;
        }
        &__more a {
            color: var(--vp-c-text-2) !important;
            font-size: var(--font-size-s);
        }
        &__note {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
        &__sublinks {
            @include setFlex(flex-start, baseline, .75rem);
            flex-wrap: wrap;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);

            a {
                color: var(--op-amber-ink);
                font-weight: 700;
                text-decoration: none;

                &:hover { text-decoration: underline; }
            }
        }

        // #endregion

        // #region [P] 最近在忙的：DinDon 一張橫的，Timeline、Resume 並排在下面
        &__pads {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
            perspective: 900px;
            @include setRWD(560px) { grid-template-columns: minmax(0, 1fr); }
        }

        // #endregion

        // #region [P] 文章：光落在分隔線上（每一道對準一個分類標籤）；極光從分隔線往下籠罩整區
        &__latest {
            position: relative;
            @include setFlex(flex-start, stretch, 1.25rem, column);
            margin-top: 2.5rem; // 光從 O 往下散開的空間
            scroll-margin-top: calc(var(--vp-nav-height) + 1rem);
        }
        &__latest-head {
            @include setFlex(space-between, flex-end, 1rem 2rem);
            flex-wrap: wrap;
        }
        &__latest-title {
            @include setFlex(flex-start, baseline, .5rem 1.25rem);
            flex-wrap: wrap;

            h2 {
                @include setFlex(flex-start, baseline, .75rem);
                font-size: var(--font-size-xl);
                font-weight: 800;

                .count {
                    color: var(--vp-c-text-2);
                    font-family: var(--vp-font-family-mono);
                    font-size: var(--font-size-s);
                    font-weight: 500;
                }
            }
            a,
            button {
                background: none;
                padding: 0;
                border: 0;
                color: var(--vp-c-brand-1);
                font: inherit;
                font-size: var(--font-size-s);
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;

                &:hover { text-decoration: underline; }
            }
        }

        // 分隔線：標題與卡片之間（原本的位置），一道光譜；光從 O 落在這條線上
        &__divider {
            position: relative;
            display: block;
            background: linear-gradient(90deg, transparent, var(--a1) 12%, var(--a2) 50%, var(--a3) 88%, transparent);
            height: 2px;
            box-shadow: 0 0 14px color-mix(in srgb, var(--a2) 55%, transparent);
        }

        // 分類標籤靠右、集中在 O 的下方：光自然地散開落下，不鋪滿整個寬
        &__labels {
            @include setFlex(flex-end, center, .15rem);
            flex-wrap: wrap;
            @include setRWD(960px) {
                justify-content: flex-start;
                width: 100%;
            }
        }
        &__label {
            @include setFlex(center, baseline, .4rem);
            flex-wrap: wrap;
            background: none;
            padding: .3rem .55rem;
            border: 0;
            border-radius: 8px;
            color: var(--vp-c-text-1);
            font: inherit;
            font-size: var(--font-size-s);
            font-weight: 700;
            cursor: pointer;
            transition: color .25s var(--cubic-FiSo), opacity .25s var(--cubic-FiSo);

            .count {
                color: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: var(--font-size-xs);
                font-weight: 500;
            }
            &.is-focused,
            &.is-selected { color: var(--hue); }
            &.is-selected .name {
                text-decoration: underline 2px;
                text-underline-offset: 5px;
            }
            &.is-muted { opacity: .45; }
            &:focus-visible {
                outline: 2px solid var(--hue);
                outline-offset: 2px;
            }
        }
        &__cards {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 1.25rem;
            padding: 0;
            margin: 0;
            list-style: none;
            @include setRWD(960px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            @include setRWD(600px) { grid-template-columns: minmax(0, 1fr); }

            li { display: flex; }
        }

        // 卡片樣式統一，只有顏色跟著那一類的光
        &__card {
            @include setFlex(flex-start, flex-start, .6rem, column);
            flex: 1;
            background:
                radial-gradient(280px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--hue) 16%, transparent), transparent 70%),
                var(--vp-c-bg-soft);
            padding: 1.25rem 1.5rem 1.5rem;
            border: 1px solid color-mix(in srgb, var(--hue) 30%, transparent);
            border-radius: 14px;
            color: var(--vp-c-text-1);
            text-decoration: none;
            transition: border-color .2s var(--cubic-FiSo), transform .3s var(--cubic-FiSo), opacity .3s var(--cubic-FiSo);

            h3 {
                font-size: var(--font-size-m);
                font-weight: 700;
                line-height: 1.5;
            }
            p {
                display: -webkit-box;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
                line-height: 1.7;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
                overflow: hidden;
            }
            time {
                margin-top: auto;
                color: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: var(--font-size-xs);
            }
            &:hover,
            &.is-lit {
                border-color: var(--hue);
                transform: translateY(-3px);

                h3 { color: var(--vp-c-brand-1); }
            }

            // 滑過一道光或分類：別類的卡片退後
            &.is-dim { opacity: .4; }
        }
        &__card-cat {
            @include setFlex(flex-start, center, .5rem);
            color: var(--vp-c-text-2);
            font-size: var(--font-size-xs);
            font-weight: 600;

            &::before {
                content: '';
                @include setSize(8px, 8px);
                background: var(--hue);
                border-radius: 50%;
            }
        }

        // 首頁上一直在動的只有 LightStage 的畫布（每秒 20 張）：CSS 的無限動畫（就算只動 transform）會讓整頁每秒合成 60 次，
        // 量過拿掉它們，合成器的負擔少九成（2026-10-06，使用者：「電腦要燒起來了」）。換一道光時分隔線從中間重新畫出來（點了才動）
        @media (prefers-reduced-motion: no-preference) {
            &__divider { animation: op-home-draw .6s var(--cubic-FiSo) both; }
        }

        // #endregion

        // #region [P] 名字的由來：O、P、Shell 三段，捲到時依序被光點亮
        &__parts {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 2rem;
            @include setRWD(768px) {
                grid-template-columns: minmax(0, 1fr);
                gap: 1.5rem;
            }

            > div {
                position: relative;
                padding-top: 1.25rem;

                // 每一段頂端一道光，從左邊掃過去
                &::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    background: var(--pr-brand-gradient);
                    width: 100%;
                    height: 2px;
                    transform-origin: left;
                    transition: transform .8s calc(var(--i) * .25s) var(--cubic-FiSo);
                }
            }
            dt {
                @include setFlex(flex-start, baseline, .75rem);
                margin-bottom: .5rem;
                font-weight: 700;
            }
            .part {
                background: var(--pr-brand-gradient);
                background-clip: text;
                color: transparent;
                font-size: 3.25rem;
                font-weight: 900;
                line-height: 1;
                transition: opacity .6s calc(var(--i) * .25s + .2s), filter .6s calc(var(--i) * .25s + .2s);
            }
            dd {
                color: var(--vp-c-text-2);
                line-height: 1.8;
                transition: opacity .6s calc(var(--i) * .25s + .35s), transform .6s calc(var(--i) * .25s + .35s) var(--cubic-FiSo);
            }
        }
        &__about:not(.is-lit) &__parts {
            > div::before { transform: scaleX(0); }
            .part {
                filter: blur(6px);
                opacity: .15;
            }
            dd {
                transform: translateY(8px);
                opacity: 0;
            }
        }
        &__about {
            padding-top: 3rem;
            border-top: 1px solid var(--vp-c-divider);
        }

        // #endregion

        // 換一道光時卡片淡入淡出（回應點擊的動態，不是自己在動）
        .op-card-enter-active,
        .op-card-leave-active { transition: opacity .2s ease, transform .2s var(--cubic-FiSo); }
        .op-card-leave-active { display: none; }
        .op-card-enter-from {
            transform: translateY(8px);
            opacity: 0;
        }
        @media (prefers-reduced-motion: reduce) {
            &__card,
            .op-card-enter-active { transition: none; }
            &__card:hover { transform: none; }
        }

        // #region [P] 開場的後半段（時間照 intro.ts 的 INTRO，從 JS 接手、加上 is-playing 算起；前半段在 HomeIntro）：
        // 4.0s 光點綻開成 O → 4.3s 白光從天上射進來（畫布）→ 5.0s 一道道光往下落 → 5.0s 起最近在忙的從左邊滑進來 →
        // 5.6s 分類一個個亮（光正好落到）→ 5.9s 分隔線從中間畫出來 → 6.1s 起文章一張張浮上來 → 7.3s 定格
        // 播完拿掉 is-playing；中途點一下、捲一下也是。拿掉之後就是沒有動畫的定格樣子，所以不會跳
        @media (prefers-reduced-motion: no-preference) {
            &.is-playing {
                .op-home__orb { animation: op-home-bloom .7s 4s var(--cubic-SiRo) both; }
                .op-home__beam { animation: op-home-drop .6s 4.3s var(--cubic-FiSo) both; }
                .op-home__caption { animation: op-home-fade .8s 4.6s both; }
                .op-home__now > .op-home__appear { animation: op-home-fade .6s 5s both; }
                .op-pad { animation: op-home-slide .7s calc(5.1s + var(--i) * .12s) var(--cubic-FiSo) both; }
                .op-home__latest-title { animation: op-home-fade .6s 5.5s both; }
                .op-home__label { animation: op-home-light .5s calc(5.6s + var(--i) * .08s) var(--cubic-FiSo) both; }
                .op-home__divider { animation: op-home-draw .8s 5.9s var(--cubic-FiSo) both; }
                .op-home__cards li { animation: op-home-rise .6s calc(6.1s + var(--i) * .08s) var(--cubic-FiSo) both; }
            }
        }

        // #endregion
    }

    .op-home { --op-origin: #FFF8E7; }
    html:not(.dark) .op-home {
        --op-amber-ink: #A86A00;
        --op-origin: #3A2A5C;
        --op-beam: #3A2A5C;
        --op-star: #7B61FF;
        --op-glass-core: rgb(255 255 255 / 60%);
        --op-glass-rim: rgb(244 185 54 / 22%);
    }
    @keyframes op-home-bloom {
        from {
            transform: scale(.06);
            opacity: 0;
        }
    }
    @keyframes op-home-drop {
        from { transform: scaleY(0); }
    }
    @keyframes op-home-fade {
        from { opacity: 0; }
    }
    @keyframes op-home-slide {
        from {
            transform: translateX(-28px);
            opacity: 0;
        }
    }
    @keyframes op-home-light {
        from {
            filter: brightness(2.2);
            opacity: 0;
        }
    }
    @keyframes op-home-rise {
        from {
            transform: translateY(16px);
            opacity: 0;
        }
    }
    @keyframes op-home-draw {
        from { clip-path: inset(0 50%); }
    }

    // #region [P] 「最近在忙的」大卡：游標的光（--mx／--my）與傾斜（--rx／--ry）由 v-spotlight 寫進來
    .op-pad {
        --pad-hue: var(--pr-amber);
        position: relative;
        background:
            radial-gradient(360px circle at var(--mx, 30%) var(--my, 0%), color-mix(in srgb, var(--pad-hue) 22%, transparent), transparent 70%),
            var(--vp-c-bg-soft);
        padding: 1.25rem 1.5rem;
        border: 1px solid var(--vp-c-divider);
        border-radius: 18px;
        color: var(--vp-c-text-1);
        text-decoration: none;
        transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
        transition: transform .35s var(--cubic-FiSo), border-color .25s var(--cubic-FiSo);
        overflow: hidden;
        @include setFlex(flex-start, flex-start, .6rem, column);

        &:hover { border-color: color-mix(in srgb, var(--pad-hue) 60%, transparent); }
        &:focus-visible {
            outline: 2px solid var(--pad-hue);
            outline-offset: 3px;
        }
        &__title {
            font-size: var(--font-size-l);
            font-weight: 900;
            line-height: 1.2;
        }
        &__text {
            max-width: 26em;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            line-height: 1.7;
        }

        // DinDon：橫跨兩欄，App 的首頁截圖從右下角探出來，游標進來時升起一點
        &--dindon {
            grid-column: 1 / -1;
            padding-right: 34%;
            @include setRWD(768px) {
                min-height: 0;
                padding-right: 1.75rem;
                padding-bottom: 12rem;
            }

            .op-pad__title {
                background: var(--pr-brand-gradient);
                background-clip: text;
                color: transparent;
                font-size: clamp(1.6rem, 1.3rem + 1vw, 2.125rem);
            }
        }
        &__head {
            @include setFlex(flex-start, center, .75rem);
            margin-bottom: .25rem;
        }
        &--dindon &__head img { border-radius: 12px; }
        &__status {
            @include setFlex(flex-start, center, .45rem);
            background: color-mix(in srgb, var(--pr-amber) 16%, transparent);
            padding: .2rem .7rem;
            border-radius: 999px;
            color: var(--op-amber-ink);
            font-size: var(--font-size-xs);
            font-weight: 700;

            .pulse {
                position: relative;
                background: var(--pr-amber);
                @include setSize(7px, 7px);
                border-radius: 50%;

                &::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: var(--pr-amber);
                    border-radius: 50%;
                    opacity: 0;
                }
            }
        }

        // 「開發中」的脈衝只在游標進來時跳：一直跳的話整頁每秒合成 60 次
        &--dindon:hover &__status .pulse::after { animation: op-pad-pulse 2s ease-out infinite; }
        &__screen {
            position: absolute;
            right: 5%;
            bottom: -48%;
            width: 26%;
            max-width: 200px;
            border: 6px solid #1B1815;
            border-radius: 26px;
            box-shadow: 0 18px 50px rgb(0 0 0 / 45%);
            transform: rotate(-6deg);
            transition: transform .5s var(--cubic-SiRo);
            @include setRWD(768px) {
                right: 50%;
                bottom: -11.5rem;
                width: 46%;
                transform: translateX(50%) rotate(-6deg);
            }
        }
        &--dindon:hover &__screen {
            transform: translateY(-14%) rotate(-3deg);
            @include setRWD(768px) { transform: translateX(50%) translateY(-8%) rotate(-3deg); }
        }

        // Timeline：一年份的小長條
        &--timeline { --pad-hue: var(--pr-violet); }

        // 每年一根：高度是篇數，上面寫數字、底下寫年份；游標進來時長高一點
        &__bars {
            @include setFlex(flex-start, flex-end, 8px);
            width: 100%;
            height: 48px;
            margin: auto 0 16px;

            .bar {
                position: relative;
                @include setFlex(flex-end, center, 4px, column);
                flex: 1;
                height: 100%;
            }
            .fill {
                background: linear-gradient(to top, var(--pr-violet), var(--pr-amber));
                width: 100%;
                height: calc(4% + var(--h) * 96%);
                border-radius: 4px 4px 2px 2px;
                transform: scaleY(.92);
                transform-origin: bottom;
                transition: opacity .25s, transform .45s var(--cubic-SiRo);
                opacity: .45;
            }
            .n {
                order: -1;
                color: var(--vp-c-text-2);
                font-family: var(--vp-font-family-mono);
                font-size: 11px;
            }
            .year {
                position: absolute;
                bottom: -18px;
                color: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: 11px;
            }
        }
        &--timeline:hover &__bars .fill {
            transform: none;
            opacity: .95;
        }

        // DinDon 的功能小標籤：游標進來時一個接一個亮
        &__chips {
            @include setFlex(flex-start, center, .4rem);
            flex-wrap: wrap;
            margin-top: auto;

            span {
                background: color-mix(in srgb, var(--pr-amber) 10%, transparent);
                padding: .1rem .55rem;
                border: 1px solid color-mix(in srgb, var(--pr-amber) 25%, transparent);
                border-radius: 999px;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-xs);
                transition: color .3s calc(var(--c) * 50ms), border-color .3s calc(var(--c) * 50ms);
            }
        }
        &--dindon:hover &__chips span {
            border-color: color-mix(in srgb, var(--pr-amber) 70%, transparent);
            color: var(--vp-c-text-1);
        }

        // Resume
        &--resume { --pad-hue: var(--pr-coral); }
        &__portrait {
            border: 2px solid color-mix(in srgb, var(--pr-coral) 60%, transparent);
            border-radius: 50%;
            object-fit: cover;
        }
        &__role {
            color: var(--pr-coral);
            font-size: var(--font-size-s);
            font-weight: 700;
        }
        @media (prefers-reduced-motion: reduce) {
            transform: none;
            transition: none;

            &__screen,
            &__bars .fill,
            &__chips span { transition: none; }
            &__status .pulse::after { animation: none; }
        }
    }
    @keyframes op-pad-pulse {
        from {
            transform: scale(1);
            opacity: .7;
        }
        to {
            transform: scale(3.2);
            opacity: 0;
        }
    }

    // #endregion
</style>
