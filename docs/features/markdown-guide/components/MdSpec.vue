<script setup lang="ts">
    import type { LayerKey } from '../constants';
    import { TOTAL_POSTS } from '../constants';

    // 一個語法一張卡：左邊寫法、右邊呈現（真的經過這個站的 markdown 渲染），下面是為什麼這樣呈現、讀者怎麼讀。
    // 左右的寬度比例由外層 MdGuide 的 --md-split 決定（三段開關）。
    // 「呈現」那格不是截圖，是 md 原文直接渲染，所以改了主題樣式，這頁會跟著變。
    const { layer, origin, posts } = defineProps<{
        layer: LayerKey;
        origin: '標準 Markdown' | 'VitePress 內建' | '站台自訂' | '外掛' | '未啟用';
        posts?: number;
    }>();
</script>

<template>
    <section class="md-spec" :class="`is-${layer}`">
        <header class="md-spec__meta">
            <span class="md-spec__origin">{{ origin }}</span>
            <span v-if="posts !== undefined" class="md-spec__posts">
                {{ posts ? `${posts} / ${TOTAL_POSTS} 篇在用` : '還沒有文章用過' }}
            </span>
        </header>

        <div class="md-spec__stage">
            <div class="md-spec__pane md-spec__pane--source">
                <span class="md-spec__label">寫法</span>
                <slot />
            </div>
            <div class="md-spec__pane md-spec__pane--render">
                <span class="md-spec__label">呈現</span>
                <div class="md-spec__render">
                    <slot name="render" />
                </div>
            </div>
        </div>

        <div class="md-spec__notes">
            <div v-if="$slots.why" class="md-spec__note">
                <span class="md-spec__label">為什麼這樣呈現</span>
                <slot name="why" />
            </div>
            <div v-if="$slots.read" class="md-spec__note">
                <span class="md-spec__label">讀者怎麼讀</span>
                <slot name="read" />
            </div>
        </div>
    </section>
</template>

<style lang="scss">
    .md-spec {
        container-type: inline-size;
        background-color: var(--vp-c-bg-soft);
        padding: 1rem 1.25rem 1.25rem;
        border-top: 4px solid var(--md-layer);
        border-radius: 4px 4px 12px 12px;
        margin: 1rem 0 2.5rem;

        &__meta {
            display: flex;
            flex-wrap: wrap;
            gap: .5rem 1rem;
            align-items: center;
            font-size: var(--font-size-xs);
        }

        &__origin {
            background-color: color-mix(in srgb, var(--md-layer) 16%, transparent);
            padding: .125rem .625rem;
            border-radius: 999px;
            color: var(--vp-c-text-1);
            font-weight: 500;
        }

        &__posts {
            color: var(--vp-c-text-2);
        }

        &__stage {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: .75rem 1rem;
            margin-top: .75rem;
        }

        // 兩欄都是「標籤＋內容」，內容撐滿剩下的高度，左右兩塊底部對齊
        &__pane {
            display: flex;
            flex-direction: column;
            gap: .375rem;
            min-width: 0;

            // 程式碼區塊自己有上下邊距，卡片裡收掉，兩欄才對得齊
            > div[class*=language-] {
                flex: 1;
                margin: 0 !important;
            }
        }

        &__render {
            flex: 1;
            background-color: var(--vp-c-bg);
            padding: .75rem 1rem;
            border-radius: 8px;
            overflow-x: auto;

            > :first-child { margin-top: 0 !important; }
            > :last-child { margin-bottom: 0 !important; }
        }

        &__label {
            display: block;
            color: var(--md-layer);
            font-size: var(--font-size-xs);
            font-weight: 600;
            letter-spacing: .08em;
        }

        &__notes {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: .75rem 1.5rem;
            margin-top: 1rem;
        }

        &__note {
            > p {
                margin: .25rem 0 0 !important;
                font-size: var(--font-size-s) !important;
                line-height: 1.7 !important;
            }
        }

        // 夠寬才左右對照；太窄（手機）維持上下排，不然程式碼只剩一小條
        @container (width >= 560px) {
            &__stage {
                grid-template-columns: var(--md-split, minmax(0, 1fr) minmax(0, 1fr));
                transition: grid-template-columns .45s var(--cubic-FiSo);
            }
        }
        @container (width >= 640px) {
            &__notes {
                grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            }
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .md-spec__stage { transition: none !important; }
    }
</style>
