<script setup lang="ts">
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { categoryHue, hueVar } from '@shared/utils/spectrum';
    import { computed } from 'vue';
    import { BLOG_INTRO, BLOG_MOTTO, BLOG_NAME, CATEGORY_LABELS, LATEST_COUNT, nameParts, PHILOSOPHY_URL, shortcuts } from '../constants';
    import { chapters, latestPosts } from '../contents';
    import { buildRays } from '../prism';
    import PrismHero from './PrismHero.vue';

    // 首頁（2026-10「稜鏡」翻新）：舊首頁的 hero 文字與入口原樣留著，右邊的插畫變成稜鏡——
    // 光穿過 O 散成各分類。底下是最近寫的，最後一段講 Opshell 這個名字（光與稜鏡的出處）。
    const siteData = useSiteData();

    const posts = computed(() => [...(siteData.value?.posts.values() ?? [])].filter(post => post.date));
    const latest = computed(() => latestPosts(posts.value, LATEST_COUNT));
    const rays = computed(() => buildRays(chapters(posts.value)));
    const total = computed(() => siteData.value?.counts.published ?? posts.value.length);

    const categoryOf = (category: string[]) => category[0] ?? '';
    const labelOf = (category: string[]) => CATEGORY_LABELS[categoryOf(category).trim()] ?? categoryOf(category);
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
            </div>
            <PrismHero class="op-home__prism" :rays="rays" />
        </header>
        <!-- #endregion -->

        <!-- #region [P] 最近寫的：卡片頂端那條是分類的顏色（跟稜鏡上的光同色） -->
        <section class="op-home__section" aria-labelledby="op-home-latest">
            <div class="op-home__section-head">
                <h2 id="op-home-latest">最近寫的</h2>
                <a href="/timeline.html">看全部 {{ total }} 篇</a>
            </div>
            <ol class="op-home__cards">
                <li v-for="post in latest" :key="post.url">
                    <a class="op-home__card" :href="post.url" :style="{ '--hue': hueVar(categoryHue(categoryOf(post.category))) }">
                        <span class="op-home__card-cat">{{ labelOf(post.category) }}</span>
                        <h3>{{ post.title }}</h3>
                        <p v-if="post.excerpt">{{ post.excerpt }}</p>
                        <time :datetime="post.date">{{ post.date }}</time>
                    </a>
                </li>
            </ol>
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
                font-size: var(--font-size-xl);
                font-weight: 800;
            }
            a {
                color: var(--vp-c-brand-1);
                font-weight: 600;
                text-decoration: none;

                &:hover { text-decoration: underline; }
            }
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
        @media (prefers-reduced-motion: reduce) {
            &__action,
            &__card { transition: none; }
        }
    }
</style>
