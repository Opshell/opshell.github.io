<script setup lang="ts">
    import type { Post } from '@shared/hooks/useBuildSiteData';
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { computed, ref } from 'vue';

    // 專區首頁：列出某個資料夾底下已發佈的文章，可以依分類切換（例如 AI 專區的「技術／心得」）。
    // 文章要出現在這裡只要兩件事：放在 prefix 那個資料夾底下、isPublished: true。
    interface iTab {
        label: string;
        /** 對應 frontmatter 的 categories；不給就是「全部」 */
        category?: string;
    }
    const { prefix, title, lead = '', tabs = [] } = defineProps<{
        prefix: string;
        title: string;
        lead?: string;
        tabs?: iTab[];
    }>();

    const siteData = useSiteData();
    const active = ref(0);

    const posts = computed<Post[]>(() => {
        if (!siteData.value) return [];
        return Array.from(siteData.value.posts.values())
            .filter(post => post.url.startsWith(prefix))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    const allTabs = computed<iTab[]>(() => (tabs.length ? [{ label: '全部' }, ...tabs] : []));
    const countOf = (tab: iTab) => (tab.category ? posts.value.filter(p => p.category.includes(tab.category!)).length : posts.value.length);
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

        <ElCard v-else class="section-posts__empty">
            <p>第一篇還在寫，快了。</p>
        </ElCard>
    </div>
</template>

<style lang="scss">
    .section-posts {
        max-width: 860px;
        padding: 2rem 1.5rem 4rem;
        margin: 0 auto;

        &__hero {
            margin-bottom: 1.5rem;

            .title {
                display: inline-block;
                background: var(--vp-home-hero-name-background);
                -webkit-background-clip: text;
                background-clip: text;
                padding: 0;
                border: 0;
                margin: 0;
                font-size: 2.5rem;
                font-weight: 800;
                line-height: 1.4;
                -webkit-text-fill-color: transparent;
            }
            .lead {
                margin: .25rem 0 0;
                color: var(--vp-c-text-2);
                line-height: 1.7;
            }
        }

        &__tabs {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
            margin-bottom: 1.5rem;

            .count {
                font-family: var(--vp-font-family-mono);
                opacity: .7;
            }
        }

        &__list {
            @include setFlex(flex-start, stretch, 1rem, column);
            padding: 0;
            margin: 0;
            list-style: none;

            > li {
                background: var(--vp-c-bg-soft);
                border: 1px solid var(--vp-c-divider);
                border-radius: 1rem;
                transition: .2s var(--cubic-FiSo);

                &:hover {
                    border-color: var(--vp-c-brand);
                    box-shadow: var(--card-shadow);
                    transform: translateY(-2px);
                }
            }
            .tags {
                @include setFlex(flex-start, center, 6px);
                flex-wrap: wrap;
                padding: 0 1.25rem 1.25rem;
            }
        }

        &__card {
            display: block;
            padding: 1.25rem 1.25rem .75rem;
            color: inherit;
            text-decoration: none;

            .meta {
                @include setFlex(flex-start, center, 8px);
                color: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: var(--font-size-xs);
            }
            .category {
                background: color-mix(in srgb, var(--vp-c-brand) 12%, transparent);
                padding: 2px 8px;
                border-radius: 6px;
                color: var(--vp-c-brand-dark);
                font-family: inherit;
                font-weight: 600;
            }
            .post-title {
                padding: 0;
                border: 0;
                margin: .5rem 0 .25rem;
                color: var(--vp-c-text-1);
                font-size: var(--font-size-l);
                font-weight: 700;
                line-height: 1.4;
                transition: color .2s var(--cubic-FiSo);
            }
            .excerpt {
                display: -webkit-box;
                margin: 0;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
                line-height: 1.7;
                overflow: hidden;
                -webkit-line-clamp: 2;
                line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            &:hover .post-title { color: var(--vp-c-brand); }
        }

        &__empty {
            color: var(--vp-c-text-2);
            text-align: center;

            p { margin: 1rem 0; }
        }
    }
</style>
