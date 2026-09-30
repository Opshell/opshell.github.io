<script setup lang="ts">
    import type { Post } from '@shared/schemas/post.schema';
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { computed, ref } from 'vue';

    // 專區首頁：列出某個資料夾底下已發佈的文章，可以依分類切換（例如 AI 專區的「技術／心得」）。
    // 文章要出現在這裡只要兩件事：放在 prefix 那個資料夾底下、isPublished: true。
    interface Tab {
        label: string;
        /** 對應 frontmatter 的 categories；不給就是「全部」 */
        category?: string;
    }
    const { prefix, title, lead = '', tabs = [] } = defineProps<{
        prefix: string;
        title: string;
        lead?: string;
        tabs?: Tab[];
    }>();

    const siteData = useSiteData();
    const active = ref(0);

    const posts = computed<Post[]>(() => {
        if (!siteData.value) return [];
        return Array.from(siteData.value.posts.values())
            .filter(post => post.url.startsWith(prefix))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    const allTabs = computed<Tab[]>(() => (tabs.length ? [{ label: '全部' }, ...tabs] : []));
    const countOf = (tab: Tab) => (tab.category ? posts.value.filter(p => p.category.includes(tab.category!)).length : posts.value.length);
    const shown = computed(() => {
        const tab = allTabs.value[active.value];
        return tab?.category ? posts.value.filter(p => p.category.includes(tab.category!)) : posts.value;
    });

    const formatDate = (date: string) => {
        const d = new Date(date);
        return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    };
</script>

<template>
    <div class="section-posts">
        <header class="section-posts__hero">
            <h1 class="title">{{ title }}</h1>
            <p v-if="lead" class="lead">{{ lead }}</p>
        </header>

        <nav v-if="allTabs.length" class="section-posts__tabs" aria-label="分類">
            <ElBtn
                v-for="(tab, index) in allTabs"
                :key="tab.label"
                size="sm"
                :variant="index === active ? 'primary' : 'ghost'"
                :aria-pressed="index === active"
                @click="active = index"
            >
                {{ tab.label }} <span class="count">{{ countOf(tab) }}</span>
            </ElBtn>
        </nav>

        <ul v-if="shown.length" class="section-posts__list">
            <li v-for="post in shown" :key="post.url">
                <a :href="post.url" class="section-posts__card">
                    <div class="meta">
                        <time :datetime="post.date">{{ formatDate(post.date) }}</time>
                        <span v-for="category in post.category" :key="category" class="category">{{ category }}</span>
                    </div>
                    <h2 class="post-title">{{ post.title }}</h2>
                    <p v-if="post.excerpt" class="excerpt">{{ post.excerpt }}</p>
                </a>
                <div v-if="post.tags.length" class="tags">
                    <ElTag v-for="tag in post.tags" :key="tag" :tag />
                </div>
            </li>
        </ul>

        <p v-else class="section-posts__empty">第一篇還在寫，快了。</p>
    </div>
</template>

<style lang="scss">
    // 專區首頁（2026-10 翻新）：跟時間軸、標籤頁同一套條目，寫在紙上、用細線分開，不用卡片
    .section-posts {
        width: 100%;
        max-width: 50rem;
        padding: var(--nb-space-8) var(--nb-space-6);
        margin: 0 auto;
        color: var(--nb-ink);
        @include setRWD(768px) { padding: var(--nb-space-6) var(--nb-space-4) var(--nb-space-7); }

        :where(h1, h2, p) { margin: 0; }

        &__hero {
            @include setFlex(flex-start, flex-start, var(--nb-space-2), column);
            padding-bottom: var(--nb-space-6);
            border-bottom: 1px solid var(--nb-rule);
            margin-bottom: var(--nb-space-6);

            .title {
                font-family: var(--nb-font-serif);
                font-size: var(--nb-step-5);
                font-weight: 700;
                line-height: 1.15;
            }
            .lead {
                max-width: var(--nb-measure);
                color: var(--nb-ink-2);
                font-family: var(--nb-font-serif);
                line-height: 1.8;
            }
        }

        &__tabs {
            @include setFlex(flex-start, center, var(--nb-space-2));
            flex-wrap: wrap;
            margin-bottom: var(--nb-space-5);

            .count {
                opacity: .7;
                font-variant-numeric: tabular-nums;
            }
        }

        &__list {
            padding: 0;
            border-top: 1px solid var(--nb-ink);
            margin: 0;
            list-style: none;

            > li {
                @include setFlex(flex-start, stretch, var(--nb-space-2), column);
                padding: var(--nb-space-4) 0;
                border-bottom: 1px solid var(--nb-rule);
            }
            .tags {
                display: flex;
                flex-wrap: wrap;
                gap: var(--nb-space-1) var(--nb-space-4);
            }
        }

        &__card {
            @include setFlex(flex-start, stretch, var(--nb-space-2), column);
            color: inherit;
            text-decoration: none;

            .meta {
                display: flex;
                flex-wrap: wrap;
                gap: var(--nb-space-1) var(--nb-space-4);
                color: var(--nb-ink-3);
                font-size: var(--nb-step--1);
                font-variant-numeric: tabular-nums;
            }
            .post-title {
                font-family: var(--nb-font-serif);
                font-size: var(--nb-step-2);
                font-weight: 600;
                line-height: 1.45;
            }
            .excerpt {
                display: -webkit-box;
                color: var(--nb-ink-2);
                font-size: var(--nb-step--1);
                line-height: 1.75;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
                line-clamp: 2;
                overflow: hidden;
            }
            &:hover .post-title {
                color: var(--nb-link);
                text-decoration: underline;
                text-underline-offset: .25em;
            }
            &:focus-visible {
                outline: 2px solid var(--nb-link);
                outline-offset: 4px;
            }
        }

        &__empty {
            padding: var(--nb-space-7) 0;
            color: var(--nb-ink-3);
            text-align: center;
        }
    }
</style>
