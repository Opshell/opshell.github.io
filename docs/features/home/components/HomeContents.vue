<script setup lang="ts">
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { categoryHue, categoryLabel, hueVar } from '@shared/utils/spectrum';
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { BLOG_INTRO, BLOG_MOTTO, BLOG_NAME, LATEST_COUNT, launchpads, moreLinks, nameParts, PHILOSOPHY_URL } from '../constants';
    import { chapters, latestPosts, postsInCategories, seriesOf, yearlyCounts } from '../contents';
    import { buildRays } from '../prism';
    import { vSpotlight } from '../spotlight';
    import LightBench from './LightBench.vue';
    import SeriesTracks from './SeriesTracks.vue';

    // 首頁（2026-10「稜鏡」翻新，第二版）。使用者：首頁可以放開來，多一點動態、互動、特效，不用像讀文章時那麼拘謹。
    // - hero：左邊是名字與三句話，右邊是光學台（白光射進玻璃 O、散成各分類；滑鼠瞄準、點一道光篩下面的文章）
    // - 最近在忙的：DinDon 記帳、Timeline、Resume 三張大卡，游標在上面時有一圈光、卡片微微朝游標傾斜
    // - 最近寫的、兩個三十天：內容照舊（使用者說這兩段很好），卡片一樣有光
    // - 為什麼叫 Opshell：捲到時 O、P、Shell 依序被點亮
    const siteData = useSiteData();

    const posts = computed(() => [...(siteData.value?.posts.values() ?? [])].filter(post => post.date));
    const rays = computed(() => buildRays(chapters(posts.value)));
    const series = computed(() => seriesOf(posts.value));
    const counts = computed(() => siteData.value?.counts);

    // #region [P] 光學台選了哪一道光
    const selected = ref<string | null>(null);
    const selectedRay = computed(() => rays.value.find(ray => ray.key === selected.value) ?? null);
    const shown = computed(() => postsInCategories(posts.value, selectedRay.value?.members ?? null, LATEST_COUNT));
    const listLine = computed(() => (selectedRay.value ? `linear-gradient(90deg, ${hueVar(selectedRay.value.hue)}, transparent)` : 'var(--pr-brand-gradient)'));
    // #endregion

    // #region [P] Timeline 卡片：最新一篇與每年寫幾篇
    const newest = computed(() => latestPosts(posts.value, 1)[0]);
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
    <div class="op-home">
        <!-- #region [P] hero -->
        <header class="op-home__hero">
            <div class="op-home__intro">
                <h1 class="op-home__name">{{ BLOG_NAME }}</h1>
                <p class="op-home__text">{{ BLOG_INTRO }}</p>
                <p class="op-home__motto">{{ BLOG_MOTTO }}</p>
                <!-- 舊側欄的 Posts／Drafts：草稿多是事實，也是這個部落格的個性 -->
                <p v-if="counts" class="op-home__counts">
                    寫了 <strong>{{ counts.published }}</strong> 篇，還有 <strong>{{ counts.unpublished }}</strong> 篇在坑裡。
                </p>
            </div>
            <LightBench class="op-home__bench" :rays="rays" :selected="selected" @select="selected = $event" />
        </header>
        <!-- #endregion -->

        <!-- #region [P] 最近在忙的 -->
        <section class="op-home__section" aria-labelledby="op-home-now">
            <div class="op-home__section-head">
                <h2 id="op-home-now">最近在忙的</h2>
                <nav class="op-home__more" aria-label="其他入口">
                    <a v-for="link in moreLinks" :key="link.href" :href="link.href">{{ link.text }}</a>
                </nav>
            </div>
            <div class="op-home__pads">
                <a v-spotlight class="op-pad op-pad--dindon" :href="launchpads.dindon.href">
                    <span class="op-pad__head">
                        <img :src="launchpads.dindon.icon" alt="" width="44" height="44" />
                        <span class="op-pad__status"><span class="pulse" aria-hidden="true" />{{ launchpads.dindon.status }}</span>
                    </span>
                    <span class="op-pad__title">{{ launchpads.dindon.title }}</span>
                    <span class="op-pad__text">{{ launchpads.dindon.text }}</span>
                    <span class="op-pad__chips">
                        <span v-for="(feature, index) in launchpads.dindon.features" :key="feature" :style="{ '--i': index }">{{ feature }}</span>
                    </span>
                    <img class="op-pad__screen" :src="launchpads.dindon.screen" alt="" loading="lazy" width="240" height="520" />
                </a>
                <a v-spotlight class="op-pad op-pad--timeline" :href="launchpads.timeline.href">
                    <span class="op-pad__title">{{ launchpads.timeline.title }}</span>
                    <span v-if="newest" class="op-pad__text">
                        {{ counts?.published ?? posts.length }} 篇，最新是 {{ newest.date }}〈{{ newest.title }}〉
                    </span>
                    <span class="op-pad__bars" aria-hidden="true">
                        <span v-for="y in years" :key="y.year" class="bar" :style="{ '--h': y.count / yearMax }">
                            <span class="fill" />
                            <span class="n">{{ y.count || '' }}</span>
                            <span class="year">{{ y.year.slice(2) }}</span>
                        </span>
                    </span>
                </a>
                <a v-spotlight class="op-pad op-pad--resume" :href="launchpads.resume.href">
                    <img class="op-pad__portrait" :src="launchpads.resume.portrait" alt="" loading="lazy" width="64" height="64" />
                    <span class="op-pad__title">{{ launchpads.resume.title }}</span>
                    <span class="op-pad__role">{{ launchpads.resume.role }}</span>
                    <span class="op-pad__text">{{ launchpads.resume.text }}</span>
                </a>
            </div>
            <!-- 卡片整張是連結，裡面不能再放連結：DinDon 的兩個子頁放在卡片外 -->
            <p class="op-home__sublinks">
                DinDon 記帳還有
                <a v-for="link in launchpads.dindon.links" :key="link.href" :href="link.href">{{ link.text }}</a>
            </p>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 光學台底下的文章：白光是最近寫的，選了一道光就是那一類 -->
        <section class="op-home__section" aria-labelledby="op-home-latest" :style="{ '--list-line': listLine }">
            <div class="op-home__section-head op-home__section-head--line">
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
            <TransitionGroup tag="ol" name="op-card" class="op-home__cards">
                <li v-for="post in shown" :key="post.url">
                    <a v-spotlight class="op-home__card" :href="post.url" :style="{ '--hue': hueVar(categoryHue(categoryOf(post.category))) }">
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
        padding: 3rem 2rem 6rem;
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

        // #region [P] hero
        &__hero {
            display: grid;
            grid-template-columns: minmax(0, .85fr) minmax(0, 1.3fr);
            gap: 2rem;
            align-items: center;
            @include setRWD(960px) {
                grid-template-columns: minmax(0, 1fr);
                gap: 1.5rem;
            }
        }
        &__intro {
            @include setFlex(flex-start, flex-start, 1.25rem, column);
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

            // 光學台底下那一段的標題線：白光時是品牌漸層，選了一類就是那一類的光
            &--line {
                background: var(--list-line) left bottom / 100% 3px no-repeat;
                padding-bottom: .75rem;
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
            margin-top: -.5rem !important;
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

        // #region [P] 最近在忙的：DinDon 一張大的，Timeline、Resume 疊在右邊
        &__pads {
            display: grid;
            grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
            grid-template-rows: auto auto;
            gap: 1.25rem;
            perspective: 900px;
            @include setRWD(768px) { grid-template-columns: minmax(0, 1fr); }
        }

        // #endregion

        // #region [P] 文章卡片：頂端一道分類色的光；游標在上面時多一圈光
        &__cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
            gap: 1.25rem;
            padding: 0;
            margin: 0;
            list-style: none;

            li { display: flex; }
        }
        &__card {
            @include setFlex(flex-start, flex-start, .6rem, column);
            flex: 1;
            background:
                radial-gradient(280px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--hue) 16%, transparent), transparent 70%),
                var(--vp-c-bg-soft);
            padding: 1.25rem 1.5rem 1.5rem;
            border: 1px solid var(--vp-c-divider);
            border-top: 3px solid var(--hue);
            border-radius: 12px;
            color: var(--vp-c-text-1);
            text-decoration: none;
            transition: border-color .2s var(--cubic-FiSo), transform .3s var(--cubic-FiSo);

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
            &:hover {
                border-color: var(--hue);
                transform: translateY(-3px);

                h3 { color: var(--vp-c-brand-1); }
            }
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
    }

    html:not(.dark) .op-home { --op-amber-ink: #A86A00; }

    // #region [P] 「最近在忙的」大卡：游標的光（--mx／--my）與傾斜（--rx／--ry）由 v-spotlight 寫進來
    .op-pad {
        --pad-hue: var(--pr-amber);
        position: relative;
        background:
            radial-gradient(360px circle at var(--mx, 30%) var(--my, 0%), color-mix(in srgb, var(--pad-hue) 22%, transparent), transparent 70%),
            var(--vp-c-bg-soft);
        padding: 1.5rem 1.75rem;
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
            font-size: var(--font-size-xl);
            font-weight: 900;
            line-height: 1.2;
        }
        &__text {
            max-width: 26em;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            line-height: 1.7;
        }

        // DinDon：大卡，App 的首頁截圖從右下角探出來，游標進來時升起一點
        &--dindon {
            grid-row: span 2;
            min-height: 340px;
            padding-right: 44%;
            @include setRWD(768px) {
                min-height: 0;
                padding-right: 1.75rem;
                padding-bottom: 12rem;
            }

            .op-pad__title {
                background: var(--pr-brand-gradient);
                background-clip: text;
                color: transparent;
                font-size: clamp(1.75rem, 1.4rem + 1.4vw, 2.5rem);
            }
        }
        &__head {
            @include setFlex(flex-start, center, .75rem);
            margin-bottom: .5rem;

            img { border-radius: 12px; }
        }
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
                    border-radius: 50%;
                    box-shadow: 0 0 0 0 var(--pr-amber);
                    animation: op-pad-pulse 2s ease-out infinite;
                }
            }
        }
        &__screen {
            position: absolute;
            right: 7%;
            bottom: -28%;
            width: 34%;
            max-width: 240px;
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
            height: 76px;
            margin: auto 0 18px;

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
                padding: .15rem .65rem;
                border: 1px solid color-mix(in srgb, var(--pr-amber) 25%, transparent);
                border-radius: 999px;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-xs);
                transition: color .3s calc(var(--i) * 50ms), border-color .3s calc(var(--i) * 50ms);
            }
        }
        &--dindon:hover &__chips span {
            border-color: color-mix(in srgb, var(--pr-amber) 70%, transparent);
            color: var(--vp-c-text-1);
        }

        // Resume
        &--resume { --pad-hue: var(--pr-coral); }
        &__portrait {
            position: absolute;
            top: 1.5rem;
            right: 1.75rem;
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
        to { box-shadow: 0 0 0 8px transparent; }
    }

    // #endregion
</style>
