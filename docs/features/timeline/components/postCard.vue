<script setup lang="ts">
    import { Post } from "@hooks/useBuildSiteData";
    import dateBadge from './dateBadge.vue';

    const { post } = defineProps<{ post: Post; }>();
</script>

<template>
    <li
        :key="post.url"
        class="timeline-page__post-item"
    >
        <div class="timeline-page__post-marker">
            <div class="dot"></div>
        </div>

        <section  class="timeline-page__post-card">
            <!-- <img v-if="false" :src="post.image" loading="lazy" class="card-thumbnail" alt="cover" /> -->
            <dateBadge  class="date" :date="post.date" />

            <div v-if="post.category" class="category-box">
                <span v-for="category in post.category" class="category">{{ category }}</span>
            </div>

            <h3 class="title">
                <a :href="post.url">{{ post.title }}</a>
            </h3>

            <p class="excerpt">
                {{ (post as any).excerpt || '點擊閱讀更多內容...' }}
            </p>

            <div v-if="post.tags.length > 0" class="tag-box">
                <ElTag v-for="tag in post.tags" :key="tag" :tag />
            </div>

            <a :href="post.url" class="read-more">
                Read more
                <!-- <ElSvgIcon name="arrow_forward" /> -->
            </a>
        </section>
    </li>
</template>

<style lang="scss">
    .timeline-page__post {
        --op-post-dot-size: 20px;

        &-item {
            position: relative;
            @include setFlex(flex-start, stretch);
            gap: 1.5rem;

            &:hover {
                .timeline-page__post-marker {
                    .dot { backdrop-filter: blur(4px); }
                    &::after { transform: scaleX(1) rotateZ(180deg); }
                }

                &::before {
                    top: -2px;
                    @include setSize(calc(100% + 4px), calc(100% + 4px));
                    transition: width 0.15s var(--op-timing-FiSo) .2s,
                            height 0.15s var(--op-timing-FiSo) .1s;
                }
            }

            &::before {
                content: '';
                position: absolute;
                top: 50%;
                left: calc(var(--op-post-dot-size) + 1.5rem - 2px);
                background: var(--vp-home-hero-name-background);
                @include setSize(0, 0);
                clip-path: inset(0 round calc(1rem + 2px)); // 裁切圓角
                pointer-events: none;
                transition: 0.2s var(--op-timing-FiSo);
                z-index: -1;
            }
        }

        &-marker {
            position: sticky;
            top: calc(var(--vp-nav-height) + 1rem); // 讓圓點也黏住
            @include setFlex();
            @include setSize(var(--op-post-dot-size), 3.25rem); // 字高 2.25rem + padding
            padding: .2rem 0 0;
            z-index: 2;

            // 水平連接線 (從圓點連到卡片的線)
            &::after {
                content: '';
                position: absolute;
                top: calc(3.25rem / 2 + 1px);
                left: calc(-1rem - 7px);
                background: var(--vp-home-hero-name-background);
                @include setSize(2rem, 2px);
                border-radius: 2px;
                transform: scaleX(0) rotateZ(180deg);
                transform-origin: right;
                transition: 0.2s var(--op-timing-FiSo);
            }

            .dot {
                position: relative;
                background: rgba($color: #FFF, $alpha: 8%); // 中間鏤空 (背景色)
                @include setSize(var(--op-post-dot-size), var(--op-post-dot-size));
                backdrop-filter: blur(2px);
                border: 2px solid var(--color-extreme);
                border-radius: 50%;
                transition: 0.25s var(--op-timing-FiSo);

                // opacity: .8;
                z-index: 2;


                &::before {
                    content: '';
                    position: absolute;
                    inset: 2px;
                    flex-shrink: 0;
                    background: var(--vp-home-hero-name-background);
                    border-radius: 50%;
                    transition: 0.25s ease;
                    filter: blur(10px);
                    opacity: 0;
                    z-index: -1;
                }
            }
        }

        &-card {
            position: relative;
            flex-shrink: 0;
            display: grid;
            grid-template:  "date title   category" auto
                            "date excerpt excerpt " auto
                            "date tags    read"     auto/
                             80px 1fr     auto    ;
            gap: 1rem;
            background: var(--vp-c-bg);
            width: 100%;
            padding: 0 2rem 1.25rem 1rem;
            border: 2px solid transparent;

            // clip-path: inset(0 round 1rem); // 裁切圓角
            border-radius: 1rem;
            box-shadow: var(--card-shadow);
            transition: .2s var(--op-timing-FiSo);
            .date {
                position: sticky;
                top: calc(var(--vp-nav-height) + 1rem);
                grid-area: date;
                align-self: flex-start;
            }

            .category-box {
                grid-area: category;
                justify-self: end;
                color: var(--vp-c-brand-dark);
                font-size: 0.75rem;
                font-weight: 500;

                .category {
                    position: absolute;
                    top: -3px;
                    right: -3px;
                    display: none;
                    background: rgb(from var(--vp-c-brand-1) r g b / 60%);
                    padding: 4px 12px;
                    border-radius: 3px;
                    border-top-right-radius: 1rem;
                    border-bottom-left-radius: 12px;

                    // 4. 陰影增加層次
                    box-shadow: 2px -2px 5px rgb(0,0,0,5%) inset;
                    color: white; // 反白字體
                    font-size: 0.8rem;
                    font-weight: 700;
                    z-index: 5;
                }
            }

            .title {
                grid-area: title;
                padding: calc(1rem - 2px) 0 0;
                color: var(--vp-c-text-1);
                font-size: var(--op-timeline-font-size);
                font-weight: 700;
                line-height: 1;
                transition: .2s var(--op-timing-FiSo);

                &:hover { color: var(--vp-c-brand); }
            }

            .excerpt {
                grid-area: excerpt;
                display: -webkit-box;
                margin-bottom: .5rem;
                color: var(--vp-c-text-2);
                font-size: 1rem;
                font-weight: 300;
                line-height: 1.6;
                overflow: hidden;
                line-clamp: 2;
                -webkit-box-orient: vertical;
            }

            .tag-box {
                grid-area: tags;
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                align-items: center;

                .tag {
                    background-color: color-mix(in srgb, var(--vp-c-brand) 20%, transparent);
                    padding: 6px 15px 5px;
                    border-radius: 14px;
                    color: var(--vp-c-brand-dark);
                    font-size: .9rem;
                    font-weight: 400;
                    line-height: 1;
                    transition: .2s var(--op-timing-FiSo);
                    &:hover {
                        background-color: var(--vp-c-brand);
                        color: white;
                    }
                }
            }

            .read-more {
                grid-area: read;
                place-self: end end;
                gap: 6px;
                align-items: center;
                color: var(--vp-c-brand);
                font-size: 1.2rem;
                font-weight: 500;
                line-height: 1;
                .arrow {
                    width: 16px;
                    height: 16px;
                    transition: transform 0.2s;
                }
            }

            &:hover {
                // transform: translateX(5px); // 輕微右移，配合水平線伸長
                // 這裡可以加一點 Glassmorphism 效果
            }
        }
    }
</style>