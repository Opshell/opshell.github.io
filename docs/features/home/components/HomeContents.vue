<script setup lang="ts">
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { computed } from 'vue';
    import { BLOG_INTRO, BLOG_MOTTO, BLOG_NAME, LATEST_COUNT, shortcuts, topics } from '../constants';
    import { chapters, latestPosts } from '../contents';

    // 首頁＝這本筆記的目錄頁（2026-10 翻新）：書名與一句介紹、最近寫的幾篇、一個分類一章。
    // 標題和日期之間用書本目錄的點線串起來，日期就是這本書的「頁碼」。
    const siteData = useSiteData();

    const posts = computed(() => [...(siteData.value?.posts.values() ?? [])].filter(post => post.date));
    const latest = computed(() => latestPosts(posts.value, LATEST_COUNT));
    const toc = computed(() => chapters(posts.value));
    const counts = computed(() => siteData.value?.counts);
</script>

<template>
    <div class="nb-home">
        <!-- #region [P] 封面：書名、介紹、入口；右邊頁邊寫這本筆記寫些什麼 -->
        <header class="nb-home__cover">
            <div class="nb-home__title-block">
                <h1 class="nb-home__name">{{ BLOG_NAME }}</h1>
                <p class="nb-home__intro">{{ BLOG_INTRO }}</p>
                <p class="nb-home__motto">{{ BLOG_MOTTO }}</p>
                <nav class="nb-home__shortcuts" aria-label="入口">
                    <a v-for="item in shortcuts" :key="item.href" :href="item.href">{{ item.text }}</a>
                </nav>
                <p v-if="counts" class="nb-home__counts">
                    寫了 <strong>{{ counts.published }}</strong> 篇，還有 {{ counts.unpublished }} 篇草稿在坑裡。
                </p>
            </div>

            <aside class="nb-home__topics" aria-label="這本筆記寫些什麼">
                <h2>這本筆記寫些什麼</h2>
                <dl>
                    <div v-for="topic in topics" :key="topic.title">
                        <dt>{{ topic.title }}</dt>
                        <dd>{{ topic.text }}</dd>
                    </div>
                </dl>
            </aside>
        </header>
        <!-- #endregion -->

        <!-- #region [P] 最近寫的 -->
        <section class="nb-home__section" aria-labelledby="nb-home-latest">
            <h2 id="nb-home-latest" class="nb-home__heading">最近寫的</h2>
            <ol class="nb-home__list">
                <li v-for="post in latest" :key="post.url">
                    <a class="nb-home__entry" :href="post.url">
                        <span class="title">{{ post.title }}</span>
                        <span class="leader" aria-hidden="true" />
                        <time class="page" :datetime="post.date">{{ post.date }}</time>
                    </a>
                    <p v-if="post.excerpt" class="nb-home__excerpt">{{ post.excerpt }}</p>
                </li>
            </ol>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 目錄：一個分類一章 -->
        <section class="nb-home__section" aria-labelledby="nb-home-toc">
            <h2 id="nb-home-toc" class="nb-home__heading">目錄</h2>
            <ol class="nb-home__list nb-home__list--chapters">
                <li v-for="chapter in toc" :key="chapter.key">
                    <a class="nb-home__entry" :href="chapter.first.url">
                        <span class="title">{{ chapter.label }}</span>
                        <span class="leader" aria-hidden="true" />
                        <span class="page">{{ chapter.count }} 篇</span>
                    </a>
                    <p class="nb-home__chapter-links">
                        <a :href="chapter.first.url">從第一篇讀：{{ chapter.first.title }}</a>
                        <a v-if="chapter.latest.url !== chapter.first.url" :href="chapter.latest.url">最新一篇：{{ chapter.latest.title }}</a>
                    </p>
                </li>
            </ol>
            <p class="nb-home__more"><a href="/timeline.html">照時間看全部文章</a></p>
        </section>
        <!-- #endregion -->
    </div>
</template>

<style lang="scss">
    .nb-home {
        @include setFlex(flex-start, stretch, var(--nb-space-8), column);
        width: 100%;
        max-width: 68rem;
        padding: var(--nb-space-8) var(--nb-space-6) var(--nb-space-8);
        margin: 0 auto;
        color: var(--nb-ink);
        @include setRWD(768px) {
            gap: var(--nb-space-7);
            padding: var(--nb-space-6) var(--nb-space-4) var(--nb-space-7);
        }

        // 用 :where() 把重設的權重降到 0，下面各元素自己的 margin 才蓋得過去
        :where(h1, h2, p) { margin: 0; }
        a:focus-visible {
            border-radius: 2px;
            outline: 2px solid var(--nb-link);
            outline-offset: 3px;
        }

        // #region [P] 封面
        &__cover {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 17rem;
            gap: var(--nb-space-7);
            align-items: start;
            padding-bottom: var(--nb-space-7);
            border-bottom: 1px solid var(--nb-rule);
            @include setRWD(900px) {
                grid-template-columns: minmax(0, 1fr);
                gap: var(--nb-space-6);
            }
        }
        &__title-block {
            @include setFlex(flex-start, flex-start, var(--nb-space-4), column);
            max-width: 36em;
        }

        // 書名是這一頁唯一大聲的東西：襯線、大、墨色，不做漸層
        &__name {
            font-family: var(--nb-font-serif);
            font-size: clamp(2.5rem, 1.6rem + 3.6vw, 4.5rem);
            font-weight: 700;
            line-height: 1.1;
            letter-spacing: -.01em;
        }
        &__intro {
            font-family: var(--nb-font-serif);
            font-size: var(--nb-step-2);
            line-height: 1.7;
        }
        &__motto { color: var(--nb-ink-3); }
        &__shortcuts {
            display: flex;
            flex-wrap: wrap;
            gap: var(--nb-space-2) var(--nb-space-5);
            margin-top: var(--nb-space-2);

            a {
                color: var(--nb-link);
                font-weight: 500;
                text-decoration: underline;
                text-decoration-color: color-mix(in srgb, var(--nb-link) 35%, transparent);
                text-underline-offset: .3em;

                &:hover { text-decoration-color: var(--nb-link); }
            }
        }
        &__counts {
            color: var(--nb-ink-3);
            font-size: var(--nb-step--1);

            // 發佈的篇數用螢光筆畫一下：這一頁唯一的黃
            strong {
                background: linear-gradient(transparent 58%, var(--nb-marker-soft) 58%);
                padding: 0 .1em;
                color: var(--nb-ink);
            }
        }

        // 頁邊：這本筆記寫些什麼
        &__topics {
            padding-left: var(--nb-space-5);
            border-left: 1px solid var(--nb-rule);
            @include setRWD(900px) {
                padding: var(--nb-space-5) 0 0;
                border-top: 1px solid var(--nb-rule);
                border-left: 0;
            }

            h2 {
                margin-bottom: var(--nb-space-3);
                color: var(--nb-ink-2);
                font-size: var(--nb-step--1);
                font-weight: 700;
            }
            dl {
                display: grid;
                gap: var(--nb-space-3);
                margin: 0;
            }
            dt {
                font-size: var(--nb-step--1);
                font-weight: 700;
            }
            dd {
                margin: 0;
                color: var(--nb-ink-3);
                font-size: var(--nb-step--1);
                line-height: 1.6;
            }
        }

        // #endregion

        // #region [P] 目錄
        &__section {
            max-width: 46rem;
        }
        &__heading {
            margin-bottom: var(--nb-space-5);
            font-size: var(--nb-step-3);
            font-weight: 700;
        }
        &__list {
            @include setFlex(flex-start, stretch, var(--nb-space-5), column);
            padding: 0;
            margin: 0;
            list-style: none;
        }

        // 一行目錄：標題……點線……頁碼（日期或篇數）
        &__entry {
            display: flex;
            gap: var(--nb-space-3);
            align-items: baseline;
            color: var(--nb-ink);
            text-decoration: none;

            .title {
                font-family: var(--nb-font-serif);
                font-size: var(--nb-step-1);
                font-weight: 600;
                line-height: 1.5;
                transition: color .15s ease;
            }
            .leader {
                flex: 1;
                min-width: var(--nb-space-6);
                border-bottom: 2px dotted var(--nb-pencil);
                transform: translateY(-.3em);
            }
            .page {
                flex-shrink: 0;
                color: var(--nb-ink-3);
                font-size: var(--nb-step--1);
                font-variant-numeric: tabular-nums;
            }
            &:hover .title { color: var(--nb-link); }
        }
        &__excerpt {
            display: -webkit-box;
            margin-top: var(--nb-space-1);
            color: var(--nb-ink-3);
            font-size: var(--nb-step--1);
            line-height: 1.7;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            overflow: hidden;
        }
        &__chapter-links {
            display: flex;
            flex-wrap: wrap;
            gap: var(--nb-space-1) var(--nb-space-5);
            margin-top: var(--nb-space-1);
            font-size: var(--nb-step--1);

            a {
                max-width: 100%;
                color: var(--nb-ink-3);
                white-space: nowrap;
                text-decoration: none;
                text-overflow: ellipsis;
                overflow: hidden;

                &:hover {
                    color: var(--nb-link);
                    text-decoration: underline;
                    text-underline-offset: .25em;
                }
            }
        }
        &__more {
            margin-top: var(--nb-space-6);

            a {
                color: var(--nb-link);
                font-weight: 500;
            }
        }

        // #endregion
        @media (prefers-reduced-motion: reduce) {
            &__entry .title { transition: none; }
        }
    }
</style>
