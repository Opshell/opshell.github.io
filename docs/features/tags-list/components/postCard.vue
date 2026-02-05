<script setup lang="ts">
    import { computed } from 'vue';
    import { Post } from "@hooks/useBuildSiteData";
    import DateBadge from './dateBadge.vue'; // 假設你有這個組件

    const props = defineProps<{
        post: Post;
    }>();

    // 簡單的日期格式化，如果 DateBadge 已經處理則不需要
    const formattedDate = computed(() => {
        return new Date(props.post.date).toISOString().split('T')[0];
    });
</script>

<template>
    <article class="post-card-item">
        <div class="post-marker">
            <div class="dot"></div>
        </div>

        <section class="post-card-content">
            <div class="date-area">
                <DateBadge :date="post.date" />
            </div>

            <div v-if="post.category" class="category-box">
                <span class="category">{{ post.category }}</span>
            </div>

            <h3 class="title">
                <a :href="post.url">{{ post.title }}</a>
            </h3>

            <p class="excerpt">
                {{ (post as any).excerpt || '點擊閱讀更多內容...' }}
            </p>

            <div v-if="post.tags && post.tags.length > 0" class="tag-box">
                <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
            </div>

            <a :href="post.url" class="read-more">
                Read more
                <span class="arrow">→</span>
            </a>
        </section>
    </article>
</template>

<style lang="scss" scoped>
    $dot-size: 14px;
    $line-color: var(--vp-c-divider);
    $card-bg: var(--vp-c-bg-soft);

    .post-card-item {
        position: relative;
        display: flex;

        // gap: 1.5rem;
        margin-bottom: 1.5rem;

        // Hover 效果
        &:hover {
            // .post-marker .dot {
            //     background: var(--vp-c-brand);
            //     border-color: var(--vp-c-brand);
            //     transform: scale(1.2);
            // }
            .post-card-content {
                border-color: var(--vp-c-brand-dimm);
                box-shadow: 0 4px 12px rgb(0,0,0,5%);
                transform: translateY(-2px);
            }
        }
    }

    // .post-marker {
    //     display: flex;
    //     flex-direction: column;
    //     align-items: center;
    //     min-width: 20px;
    //     padding-top: 1.8rem; // 對齊標題高度

    //     .dot {
    //         background: var(--vp-c-bg);
    //         width: $dot-size;
    //         height: $dot-size;
    //         border: 2px solid var(--vp-c-text-3);
    //         border-radius: 50%;
    //         transition: all 0.3s ease;
    //         z-index: 2;
    //     }
    // }

    .post-card-content {
        position: relative;
        display: grid;
        flex: 1;

        // 定義 Grid 區域: Date | Title | Category
        //                Date | Excerpt | Excerpt
        //                Date | Tags    | ReadMore
        grid-template-areas:
            "date title category"
            "date excerpt excerpt"
            "date tags read";
        grid-template-columns: auto 1fr auto;
        gap: 0.8rem 1.5rem;
        background: $card-bg;
        padding: 1.5rem;
        border: 1px solid transparent;
        border-radius: 12px;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        @media (width <= 640px) {
            grid-template-areas:
                "category"
                "title"
                "excerpt"
                "tags"
                "read"
                "date";
            grid-template-columns: 1fr;
            gap: 0.8rem;
        }

        .date-area {
            grid-area: date;
            padding-top: 0.2rem;
        }

        .category-box {
            grid-area: category;
            justify-self: end;
            .category {
                background: color-mix(in srgb, var(--vp-c-brand) 10%, transparent);
                padding: 2px 8px;
                border-radius: 4px;
                color: var(--vp-c-brand);
                font-size: 0.75rem;
                font-weight: 600;
            }
            @media (width <= 640px) { justify-self: start; }
        }

        .title {
            grid-area: title;
            margin: 0;
            font-size: 1.25rem;
            font-weight: 700;
            line-height: 1.3;
            a {
                color: var(--vp-c-text-1);
                text-decoration: none;
                transition: color 0.2s;
                &:hover { color: var(--vp-c-brand); }
            }
        }

        .excerpt {
            grid-area: excerpt;
            display: -webkit-box;
            margin: 0;
            color: var(--vp-c-text-2);
            font-size: 0.95rem;
            line-height: 1.6;
            overflow: hidden;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }

        .tag-box {
            grid-area: tags;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;

            .tag {
                background: var(--vp-c-bg);
                padding: 2px 8px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 4px;
                color: var(--vp-c-text-3);
                font-size: 0.8rem;
            }
        }

        .read-more {
            grid-area: read;
            place-self: end end;
            display: flex;
            gap: 4px;
            align-items: center;
            color: var(--vp-c-brand);
            font-size: 0.9rem;
            font-weight: 500;
            transition: gap 0.2s;

            &:hover {
                gap: 8px;
            }
        }
    }
</style>