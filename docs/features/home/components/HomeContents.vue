<script lang="ts">
    // 開場動畫一個分頁只播一次：在站內點回首頁時直接定格（模組層級的變數，重新整理才會再播）
    </script>

<script setup lang="ts">
    import type { Ray } from '../prism';
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { categoryHue, categoryLabel, hueVar } from '@shared/utils/spectrum';
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { BLOG_INTRO, BLOG_MOTTO, BLOG_NAME, LATEST_COUNT, launchpads, moreLinks, nameParts, PHILOSOPHY_URL } from '../constants';
    import { chapters, postsInCategories, seriesOf, yearlyCounts } from '../contents';
    import { lineStyle, rayFor } from '../lines';
    import { buildRays } from '../prism';
    import { vSpotlight } from '../spotlight';
    import LightBench from './LightBench.vue';
    import SeriesTracks from './SeriesTracks.vue';

let introPlayed = false;

    // 首頁（2026-10「稜鏡」翻新，第二版）。使用者：首頁可以放開來，多一點動態、互動、特效，不用像讀文章時那麼拘謹。
    // - 開場（約 4.5 秒）：左邊名字與三句話一句句出來，右邊白光射進 O、演化、散開；字被吸進白光後，換成「最近在忙的」
    //   （2026-10-05，使用者：「定格版面已經不需要 Opshell's Blog 那一段，那邊變成放最近在忙的，右邊放圓玻璃，下面就可以放 6 塊文章」）
    //   動畫寫在 CSS（媒體查詢）裡，一畫出來就開始、不等 JS；JS 只負責「點一下、捲一下就跳到定格」與時間到了拿掉 is-intro。
    // - 定格：左邊 DinDon 記帳、Timeline、Resume 三張大卡，右邊光學台，底下六篇文章緊貼著光學台
    // - 文章卡片與光學台連動：卡片頂端的線畫成那一類的元素（lines.ts），滑過卡片那道光亮，滑過光那一類的卡片亮
    // - 兩個三十天、為什麼叫 Opshell 照舊
    const siteData = useSiteData();

    const posts = computed(() => [...(siteData.value?.posts.values() ?? [])].filter(post => post.date));
    const rays = computed(() => buildRays(chapters(posts.value)));
    const series = computed(() => seriesOf(posts.value));
    const counts = computed(() => siteData.value?.counts);

    // #region [P] 光學台選了哪一道光
    const selected = ref<string | null>(null);
    const selectedRay = computed(() => rays.value.find(ray => ray.key === selected.value) ?? null);
    const shown = computed(() => postsInCategories(posts.value, selectedRay.value?.members ?? null, LATEST_COUNT));
    const latestRef = ref<HTMLElement>();
    /** 點了一道光：底下的文章不在畫面裡的話（窄螢幕時光學台與文章中間隔著大卡），捲過去 */
    function pick(key: string | null) {
        selected.value = key;
        const top = latestRef.value?.getBoundingClientRect().top ?? 0;
        if (key && top > window.innerHeight * 0.75) latestRef.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
    // #endregion

    // #region [P] 文章卡片與光學台連動：卡片屬於哪一道光；滑過光（hoveredRay）亮那一類的卡片，滑過卡片（hintRay）亮那道光
    const hoveredRay = ref<string | null>(null);
    const hintRay = ref<string | null>(null);
    const cards = computed(() => shown.value.map(post => ({ post, ray: rayFor(rays.value, post.category[0]) })));
    function cardStyle(ray: Ray | undefined, category: string[]) {
        return { '--hue': hueVar(ray?.hue ?? categoryHue(categoryOf(category))), ...(ray ? lineStyle(ray.element.key) : {}) };
    }
    // #endregion

    // #region [P] 開場：時間到、或使用者點了／捲了／按了鍵，就拿掉 is-intro（定格的樣子就是沒有動畫時的樣子）
    const INTRO_MS = 4800;
    const SKIP_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    const settled = ref(introPlayed);
    let introTimer = 0;
    function release() {
        clearTimeout(introTimer);
        for (const type of SKIP_EVENTS) window.removeEventListener(type, settle);
    }
    function settle() {
        settled.value = true;
        release();
    }
    onMounted(() => {
        introPlayed = true;
        if (settled.value || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return settle();
        introTimer = window.setTimeout(settle, INTRO_MS);
        for (const type of SKIP_EVENTS) window.addEventListener(type, settle, { passive: true });
    });
    onBeforeUnmount(release);
    // #endregion

    // #region [P] Timeline 卡片：每年寫幾篇（最新的幾篇就在底下，卡片上不再寫）
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
    <div class="op-home" :class="{ 'is-intro': !settled }">
        <!-- 名字與介紹：開場動畫播完就收起來，螢幕閱讀器與搜尋引擎一直讀得到這一份 -->
        <div class="op-home__sr">
            <h1>{{ BLOG_NAME }}</h1>
            <p>{{ BLOG_INTRO }}{{ BLOG_MOTTO }}</p>
        </div>

        <!-- #region [P] hero：左邊開場是名字，定格是最近在忙的（同一格疊著）；右邊光學台 -->
        <header class="op-home__hero">
            <div class="op-home__stack">
                <div class="op-home__intro" aria-hidden="true">
                    <p class="op-home__name" style="--i: 0">{{ BLOG_NAME }}</p>
                    <p class="op-home__text" style="--i: 1">{{ BLOG_INTRO }}</p>
                    <p class="op-home__motto" style="--i: 2">{{ BLOG_MOTTO }}</p>
                    <!-- 舊側欄的 Posts／Drafts：草稿多是事實，也是這個部落格的個性（定格後寫在 Timeline 卡片上） -->
                    <p v-if="counts" class="op-home__counts" style="--i: 3">
                        寫了 <strong>{{ counts.published }}</strong> 篇，還有 <strong>{{ counts.unpublished }}</strong> 篇在坑裡。
                    </p>
                </div>

                <section class="op-home__now" aria-labelledby="op-home-now">
                    <div class="op-home__section-head" style="--i: 0">
                        <h2 id="op-home-now">最近在忙的</h2>
                        <nav class="op-home__more" aria-label="其他入口">
                            <a v-for="link in moreLinks" :key="link.href" :href="link.href">{{ link.text }}</a>
                        </nav>
                    </div>
                    <div class="op-home__pads">
                        <a v-spotlight class="op-pad op-pad--dindon" :href="launchpads.dindon.href" style="--i: 1">
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
                        <a v-spotlight class="op-pad op-pad--timeline" :href="launchpads.timeline.href" style="--i: 2">
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
                        <a v-spotlight class="op-pad op-pad--resume" :href="launchpads.resume.href" style="--i: 3">
                            <span class="op-pad__head">
                                <img class="op-pad__portrait" :src="launchpads.resume.portrait" alt="" loading="lazy" width="40" height="40" />
                                <span class="op-pad__title">{{ launchpads.resume.title }}</span>
                            </span>
                            <span class="op-pad__role">{{ launchpads.resume.role }}</span>
                            <span class="op-pad__text">{{ launchpads.resume.text }}</span>
                        </a>
                    </div>
                    <!-- 卡片整張是連結，裡面不能再放連結：DinDon 的兩個子頁放在卡片外 -->
                    <p class="op-home__sublinks" style="--i: 4">
                        DinDon 記帳還有
                        <a v-for="link in launchpads.dindon.links" :key="link.href" :href="link.href">{{ link.text }}</a>
                    </p>
                </section>
            </div>
            <LightBench
                class="op-home__bench"
                :rays="rays"
                :selected="selected"
                :hint="hintRay"
                :intro="!settled"
                @select="pick"
                @hover="hoveredRay = $event"
            />
        </header>
        <!-- #endregion -->

        <!-- #region [P] 光學台底下的文章：白光是最近寫的，選了一道光就是那一類 -->
        <section ref="latestRef" class="op-home__section op-home__latest" aria-labelledby="op-home-latest">
            <div class="op-home__section-head">
                <h2 id="op-home-latest" aria-live="polite">
                    {{ selectedRay ? selectedRay.label : '最近寫的' }}
                    <span v-if="selectedRay" class="count">{{ selectedRay.count }} 篇</span>
                </h2>
                <div class="op-home__section-links">
                    <button v-if="selectedRay" type="button" @click="selected = null">看全部分類</button>
                    <a v-if="selectedRay && selectedRay.key !== '其他'" :href="selectedRay.href">從第一篇讀起</a>
                    <a v-else href="/timeline.html">看全部 {{ counts?.published ?? posts.length }} 篇</a>
                </div>
            </div>
            <!-- 分隔線：白光時是一道光譜，選了一道光就變成那一類的元素（換的時候從左邊畫過去） -->
            <span
                :key="selected ?? 'white'"
                class="op-home__divider"
                :class="{ 'is-element': selectedRay }"
                :style="selectedRay ? cardStyle(selectedRay, []) : undefined"
                aria-hidden="true"
            />
            <TransitionGroup tag="ol" name="op-card" class="op-home__cards">
                <li v-for="({ post, ray }, index) in cards" :key="post.url" :style="{ '--i': index }">
                    <a
                        v-spotlight
                        class="op-home__card"
                        :class="{ 'is-lit': !!hoveredRay && ray?.key === hoveredRay, 'is-dim': !!hoveredRay && ray?.key !== hoveredRay }"
                        :data-element="ray?.element.key"
                        :href="post.url"
                        :style="cardStyle(ray, post.category)"
                        @pointerenter="hintRay = ray?.key ?? null"
                        @pointerleave="hintRay = null"
                        @focus="hintRay = ray?.key ?? null"
                        @blur="hintRay = null"
                    >
                        <span class="op-home__card-line" aria-hidden="true" />
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
        a:focus-visible {
            border-radius: 4px;
            outline: 2px solid var(--vp-c-brand-1);
            outline-offset: 3px;
        }

        // #region [P] hero：左邊一格疊兩層（開場的名字、定格的最近在忙的），右邊光學台
        &__hero {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr);
            gap: 2.5rem;
            align-items: center;
            @include setRWD(960px) {
                grid-template-columns: minmax(0, 1fr);
                gap: 2rem;
            }
        }

        // 窄螢幕一欄：光學台放最上面，開場時名字就在它底下、一起看得到
        &__bench {
            @include setRWD(960px) { order: -1; }
        }
        &__stack {
            display: grid;

            > * { grid-area: 1 / 1; }
        }

        // 開場的名字：定格時藏起來（螢幕閱讀器讀 __sr 那一份）
        &__intro {
            @include setFlex(center, flex-start, 1.25rem, column);
            pointer-events: none;
            visibility: hidden;
            @include setRWD(960px) { justify-content: flex-start; }
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

        // 名字是舊首頁那道琥珀→紫的漸層：整道光譜從這裡開始
        &__name {
            background: var(--pr-brand-gradient);
            background-clip: text;
            color: transparent;
            font-size: clamp(2.75rem, 1.8rem + 3.6vw, 4.5rem);
            font-weight: 900;
            line-height: 1.1;
            letter-spacing: -.02em;
        }
        &__text {
            max-width: 22em;
            color: var(--vp-c-text-1);
            font-size: clamp(1.125rem, 1rem + .5vw, 1.375rem);
            font-weight: 700;
            line-height: 1.7;
        }
        &__motto {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-l);
            font-weight: 500;
        }
        &__counts {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);

            strong {
                color: var(--vp-c-text-1);
                font-family: var(--vp-font-family-mono);
            }
        }

        // #endregion

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

        // #region [P] 文章卡片：頂端那條線是這一類的元素（跟光學台裡的光絲同一個樣子），圓角也照元素的性格
        &__latest {
            margin-top: -2rem;
            scroll-margin-top: calc(var(--vp-nav-height) + 1rem);
        }

        // 分隔線：白光時是一道光譜；選了一道光就是那一類的元素，換的時候從左邊畫過去（回應點擊，不是自己在動）
        &__divider {
            display: block;
            background: var(--pr-brand-gradient);
            height: 3px;
            border-radius: 2px;
            margin-top: -.5rem;

            &.is-element {
                background: linear-gradient(90deg, var(--op-origin), var(--hue) 30%);
                height: 14px;
                border-radius: 0;
                mask: var(--line-mask) repeat-x 0 50% / var(--line-w) 14px;
            }
        }
        &__cards {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 1.75rem 1.25rem;
            padding: 0;
            margin: 0;
            list-style: none;
            @include setRWD(960px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            @include setRWD(600px) { grid-template-columns: minmax(0, 1fr); }

            li { display: flex; }
        }
        &__card {
            --radius: 12px;
            --flow: 1.6s;
            --lift: -3px;
            position: relative;
            @include setFlex(flex-start, flex-start, .6rem, column);
            flex: 1;
            background:
                radial-gradient(280px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--hue) 16%, transparent), transparent 70%),
                var(--vp-c-bg-soft);
            padding: 1.4rem 1.5rem 1.5rem;
            border: 1px solid color-mix(in srgb, var(--hue) 24%, var(--vp-c-divider));
            border-top-color: color-mix(in srgb, var(--hue) 10%, transparent);
            border-radius: var(--radius);
            color: var(--vp-c-text-1);
            text-decoration: none;
            transition: border-color .2s var(--cubic-FiSo), transform .3s var(--cubic-FiSo), opacity .3s var(--cubic-FiSo);

            // 金：利（圓角最小、線上有一道白光掃過）；土：重（滑過時往下沉，線不流動）；火：快、閃；木：慢慢長；風：最快；水：圓
            &[data-element=metal] {
                --radius: 3px;
                --flow: .9s;
            }
            &[data-element=earth] {
                --radius: 8px;
                --lift: 2px;
            }
            &[data-element=fire] {
                --radius: 14px;
                --flow: .8s;
            }
            &[data-element=wind] {
                --radius: 20px;
                --flow: .6s;
            }
            &[data-element=water] {
                --radius: 26px;
                --flow: 2.4s;
            }
            &:not([data-element]) { border-top: 3px solid var(--hue); }
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
                border-color: color-mix(in srgb, var(--hue) 60%, transparent);
                border-top-color: color-mix(in srgb, var(--hue) 10%, transparent);
                transform: translateY(var(--lift));

                h3 { color: var(--vp-c-brand-1); }
            }

            // 滑過光學台的一道光：別類的卡片退後
            &.is-dim { opacity: .4; }
        }

        // 線疊在卡片上緣（上框很淡，這條線就是上框），兩端讓出圓角
        &__card-line {
            position: absolute;
            top: -7px;
            right: calc(var(--radius) * .7);
            left: calc(var(--radius) * .7);
            background: linear-gradient(90deg, var(--op-origin), var(--hue) 35%);
            height: 14px;
            mask: var(--line-mask) repeat-x 0 50% / var(--line-w) 14px;
        }
        [data-element=metal] &__card-line {
            background:
                linear-gradient(100deg, transparent 42%, var(--op-origin) 50%, transparent 58%) 150% 0 / 250% 100% no-repeat,
                linear-gradient(90deg, var(--op-origin), var(--hue) 35%);
            transition: background-position .8s var(--cubic-FiSo);
        }
        [data-element=metal]:hover &__card-line,
        [data-element=metal].is-lit &__card-line { background-position: -50% 0, 0 0; }
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

        // 游標在卡片上（或在那道光上）時，線往右流，像光從 O 流出來；土不動
        @media (prefers-reduced-motion: no-preference) {
            &__card:is(:hover, .is-lit):not([data-element=earth]) &__card-line { animation: op-home-flow var(--flow) linear infinite; }
            &__card[data-element=fire]:is(:hover, .is-lit) &__card-line { animation: op-home-flow var(--flow) linear infinite, op-home-flicker .24s steps(2) infinite alternate; }
            &__divider { animation: op-home-draw .7s var(--cubic-FiSo) both; }
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

        // #region [P] 開場（約 4.5 秒，只動透明度、位移；名字那幾行多一點模糊）：
        // 0～2s 名字與三句話一行行出來、右邊白光射進 O 散開 → 3s 字往右被吸進白光 → 3.4s 最近在忙的升上來 → 3.8s 底下的文章、4s 卡片的線畫出來
        // 播完 JS 拿掉 is-intro；中途點一下、捲一下也是。拿掉之後就是沒有動畫的定格樣子，所以不會跳
        @media (prefers-reduced-motion: no-preference) {
            &.is-intro {
                .op-home__intro { animation: op-home-hold 3.7s backwards; }
                .op-home__intro > * {
                    transform-origin: left center;
                    animation:
                        op-home-appear .8s calc(.15s + var(--i) * .4s) var(--cubic-FiSo) both,
                        op-home-absorb .7s calc(2.9s + var(--i) * .08s) var(--cubic-FiSo) forwards;
                }
                .op-home__now > :not(.op-home__pads),
                .op-pad { animation: op-home-rise .7s calc(3.4s + var(--i) * .1s) var(--cubic-FiSo) both; }
                .op-home__latest > :not(.op-home__cards) { animation: op-home-rise .6s 3.8s var(--cubic-FiSo) both; }
                .op-home__cards li { animation: op-home-rise .6s calc(3.9s + var(--i) * .07s) var(--cubic-FiSo) both; }
                .op-home__card-line { animation: op-home-draw .9s calc(4.1s + var(--i) * .07s) var(--cubic-FiSo) both; }
            }
        }

        // #endregion
    }

    .op-home { --op-origin: #FFF8E7; }
    html:not(.dark) .op-home {
        --op-amber-ink: #A86A00;
        --op-origin: #3A2A5C;
    }
    @keyframes op-home-hold {
        from,
        to { visibility: visible; }
    }
    @keyframes op-home-appear {
        from {
            transform: translateY(12px);
            filter: blur(6px);
            opacity: 0;
        }
    }
    @keyframes op-home-absorb {
        to {
            transform: translateX(72px) scaleX(.8);
            filter: blur(8px);
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
        from { clip-path: inset(0 100% 0 0); }
    }
    @keyframes op-home-flow {
        to { mask-position: var(--line-w) 50%; }
    }
    @keyframes op-home-flicker {
        to { opacity: .7; }
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
                    animation: op-pad-pulse 2s ease-out infinite; // 只動 transform 與 opacity：交給合成器，不重畫
                }
            }
        }
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
