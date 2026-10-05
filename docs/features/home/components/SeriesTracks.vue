<script setup lang="ts">
    import type { Series } from '../contents';
    import { categoryHue, hueVar } from '@shared/utils/spectrum';
    import { ref } from 'vue';

    // 首頁的「兩個三十天」：鐵人賽連載一天一格排成一條，滑過一格看那天寫什麼、點了直接讀。
    // 格子只給滑鼠（不進 Tab 順序，不然一次多 61 個停留點）；鍵盤與螢幕閱讀器走每條底下的「第一篇／最後一篇」連結，
    // 文章頁本來就有上一篇、下一篇。
    const { series = [] } = defineProps<{ series?: Series[] }>();

    /** 每一條現在滑到哪一格（key → 第幾篇） */
    const hovered = ref<Record<string, number>>({});
</script>

<template>
    <div class="op-series">
        <article
            v-for="item in series"
            :key="item.key"
            class="op-series__item"
            :style="{ '--hue': hueVar(categoryHue(item.key)) }"
            @mouseleave="hovered[item.key] = -1"
        >
            <header class="op-series__head">
                <h3>{{ item.label }}</h3>
                <span class="count">{{ item.posts.length }} 篇 · {{ item.posts[0]?.date.slice(0, 4) }}</span>
            </header>

            <ol class="op-series__track" aria-hidden="true">
                <li v-for="(post, index) in item.posts" :key="post.url">
                    <a
                        :href="post.url"
                        tabindex="-1"
                        :class="{ 'is-hovered': hovered[item.key] === index }"
                        @mouseenter="hovered[item.key] = index"
                    />
                </li>
            </ol>

            <!-- 滑到哪一格就顯示那一天；沒滑的時候顯示第一篇與最後一篇的連結 -->
            <p v-if="(hovered[item.key] ?? -1) >= 0" class="op-series__caption" aria-hidden="true">
                <span class="day">{{ String(hovered[item.key] + 1).padStart(2, '0') }}</span>
                {{ item.posts[hovered[item.key]].title }}
            </p>
            <p v-else class="op-series__caption">
                <a :href="item.posts[0].url">從第一天讀起</a>
                <a :href="item.posts.at(-1)!.url">最後一天：{{ item.posts.at(-1)!.title }}</a>
            </p>
        </article>
    </div>
</template>

<style lang="scss">
    .op-series {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
        gap: 1.25rem;

        &__item {
            @include setFlex(flex-start, stretch, .9rem, column);
            background: var(--vp-c-bg-soft);
            padding: 1.25rem 1.5rem;
            border: 1px solid var(--vp-c-divider);
            border-radius: 12px;
        }
        &__head {
            @include setFlex(space-between, baseline, 1rem);

            h3 {
                margin: 0;
                font-size: var(--font-size-l);
                font-weight: 800;
            }
            .count {
                color: var(--vp-c-text-2);
                font-family: var(--vp-font-family-mono);
                font-size: var(--font-size-xs);
                white-space: nowrap;
            }
        }

        // 一天一格：底部對齊的細條，滑到的那一格拉高、全亮
        &__track {
            display: flex;
            gap: 3px;
            align-items: flex-end;
            height: 44px;
            padding: 0;
            margin: 0;
            list-style: none;

            li {
                display: flex;
                flex: 1;
                height: 100%;
            }
            a {
                align-self: flex-end;
                background: var(--hue);
                width: 100%;
                height: 60%;
                border-radius: 2px;
                transition: height .15s var(--cubic-FiSo), opacity .15s;
                opacity: .45;

                &.is-hovered {
                    height: 100%;
                    opacity: 1;
                }
            }
        }
        &__caption {
            @include setFlex(flex-start, baseline, .35rem 1.25rem);
            flex-wrap: wrap;
            min-height: 1.6em;
            margin: 0;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
            font-weight: 600;

            .day {
                color: var(--hue);
                font-family: var(--vp-font-family-mono);
                font-weight: 700;
            }
            a {
                color: var(--vp-c-brand-1);
                text-decoration: none;

                &:hover { text-decoration: underline; }
                &:focus-visible {
                    border-radius: 4px;
                    outline: 2px solid var(--vp-c-brand-1);
                    outline-offset: 2px;
                }
            }
        }
        @media (prefers-reduced-motion: reduce) {
            &__track a { transition: none; }
        }
    }
</style>
