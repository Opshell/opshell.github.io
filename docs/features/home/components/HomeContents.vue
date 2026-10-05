<script setup lang="ts">
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { categoryHue, categoryLabel, hueVar } from '@shared/utils/spectrum';
    import { computed, ref } from 'vue';
    import { BLOG_INTRO, BLOG_MOTTO, BLOG_NAME, LATEST_COUNT, nameParts, PHILOSOPHY_URL, shortcuts } from '../constants';
    import { chapters, postsInCategories, seriesOf } from '../contents';
    import { buildRays } from '../prism';
    import PrismHero from './PrismHero.vue';
    import SeriesTracks from './SeriesTracks.vue';

    // 首頁（2026-10「稜鏡」翻新）：舊首頁的 hero 文字與入口原樣留著，右邊的插畫變成稜鏡——
    // 光穿過 O 散成各分類。稜鏡也是底下文章的篩選：選一道光看那一類，白光是全部。
    // 再往下是兩個鐵人賽三十天，最後一段講 Opshell 這個名字（光與稜鏡的出處）。
    const siteData = useSiteData();

    const posts = computed(() => [...(siteData.value?.posts.values() ?? [])].filter(post => post.date));
    const rays = computed(() => buildRays(chapters(posts.value)));
    const series = computed(() => seriesOf(posts.value));
    const counts = computed(() => siteData.value?.counts);

    // #region [P] 稜鏡選了哪一道光
    const selected = ref<string | null>(null);
    const selectedRay = computed(() => rays.value.find(ray => ray.key === selected.value) ?? null);
    const shown = computed(() => postsInCategories(posts.value, selectedRay.value?.members ?? null, LATEST_COUNT));
    const listLine = computed(() => (selectedRay.value ? `linear-gradient(90deg, ${hueVar(selectedRay.value.hue)}, transparent)` : 'var(--pr-brand-gradient)'));
    // #endregion

    const categoryOf = (category: string[]) => category[0] ?? '';
</script>

<template>
    <div class="op-home">
        <!-- #region [P] hero：左邊是舊首頁的三句話與入口，右邊是稜鏡 -->
        <header class="op-home__hero">
            <div class="op-home__intro">
                <h1 class="op-home__name">{{ BLOG_NAME }}</h1>
                <p class="op-home__text">{{ BLOG_INTRO }}</p>
                <p class="op-home__motto">{{ BLOG_MOTTO }}</p>
                <nav class="op-home__actions" aria-label="入口">
                    <a
                        v-for="item in shortcuts"
                        :key="item.href"
                        class="op-home__action"
                        :class="{ 'op-home__action--primary': item.primary }"
                        :href="item.href"
                    >{{ item.text }}</a>
                </nav>
                <!-- 舊側欄的 Posts／Drafts：草稿多是事實，也是這個部落格的個性 -->
                <p v-if="counts" class="op-home__counts">
                    寫了 <strong>{{ counts.published }}</strong> 篇，還有 <strong>{{ counts.unpublished }}</strong> 篇在坑裡。
                </p>
            </div>
            <PrismHero class="op-home__prism" :rays="rays" :selected="selected" @select="selected = $event" />
        </header>
        <!-- #endregion -->

        <!-- #region [P] 稜鏡底下的文章：白光是最近寫的，選了一道光就是那一類 -->
        <section class="op-home__section" aria-labelledby="op-home-latest" :style="{ '--list-line': listLine }">
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
            <TransitionGroup tag="ol" name="op-card" class="op-home__cards">
                <li v-for="post in shown" :key="post.url">
                    <a class="op-home__card" :href="post.url" :style="{ '--hue': hueVar(categoryHue(categoryOf(post.category))) }">
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
        <section class="op-home__section op-home__about" aria-labelledby="op-home-name">
            <div class="op-home__section-head">
                <h2 id="op-home-name">為什麼叫 Opshell</h2>
                <a :href="PHILOSOPHY_URL">讀〈Opshell 的哲學意義〉</a>
            </div>
            <dl class="op-home__parts">
                <div v-for="item in nameParts" :key="item.part">
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
        @include setFlex(flex-start, stretch, 5rem, column);
        width: 100%;
        max-width: 1200px;
        padding: 4rem 2rem 6rem;
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
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
            gap: 3rem;
            align-items: center;
            @include setRWD(960px) {
                grid-template-columns: minmax(0, 1fr);
                gap: 2.5rem;
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
            color: var(--vp-c-text-1);
            font-size: clamp(1.375rem, 1.1rem + 1vw, 2rem);
            font-weight: 800;
            line-height: 1.5;
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
        &__actions {
            display: flex;
            flex-wrap: wrap;
            gap: .75rem;
            margin-top: .5rem;
        }
        &__action {
            background: var(--vp-c-default-soft);
            padding: .6rem 1.25rem;
            border-radius: 999px;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
            font-weight: 700;
            text-decoration: none;
            transition: background .2s var(--cubic-FiSo);

            &:hover { background: var(--vp-c-default-2); }
            &--primary {
                background: var(--vp-c-brand-1);
                color: var(--vp-c-white);

                &:hover { background: var(--vp-c-brand-2); }
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
        &__section-links {
            @include setFlex(flex-end, baseline, 1.25rem);
            flex-wrap: wrap;
        }
        &__note {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }

        // 稜鏡底下那一段的標題線：白光時是品牌漸層，選了一類就是那一類的光
        &__section[style] > .op-home__section-head {
            background: var(--list-line) left bottom / 100% 3px no-repeat;
            padding-bottom: .75rem;
        }
        &__cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
            gap: 1.25rem;
            padding: 0;
            margin: 0;
            list-style: none;

            li { display: flex; }
        }

        // 卡片：頂端一道分類色的光，其他跟舊首頁的卡片一樣安靜
        &__card {
            @include setFlex(flex-start, flex-start, .6rem, column);
            flex: 1;
            background: var(--vp-c-bg-soft);
            padding: 1.25rem 1.5rem 1.5rem;
            border: 1px solid var(--vp-c-divider);
            border-top: 3px solid var(--hue);
            border-radius: 12px;
            color: var(--vp-c-text-1);
            text-decoration: none;
            transition: border-color .2s var(--cubic-FiSo);

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

        // #region [P] 名字的由來：O、P、Shell 三段，字母用品牌漸層
        &__parts {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 2rem;
            @include setRWD(768px) {
                grid-template-columns: minmax(0, 1fr);
                gap: 1.25rem;
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
                font-size: 2.5rem;
                font-weight: 900;
                line-height: 1;
            }
            dd {
                color: var(--vp-c-text-2);
                line-height: 1.8;
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
            &__action,
            &__card,
            .op-card-enter-active { transition: none; }
        }
    }
</style>
