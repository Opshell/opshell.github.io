<script setup lang="ts">
    import type { TabKey } from '../constants';
    import { computed } from 'vue';
    import { LAYER_OFF, LAYERS, USAGES } from '../constants';

    // 稜鏡本身也是分頁按鈕：點哪一層就切到哪一頁，選中的那道光亮著、其他的變淡
    const { active } = defineProps<{
        active: TabKey;
    }>();
    const emit = defineEmits<{
        select: [key: TabKey];
    }>();

    // 每道光的高度固定，SVG 的光線終點才對得上右邊每一列的中心
    const ROW_HEIGHT = 64;
    const ROW_GAP = 8;
    const PRISM_HEIGHT = LAYERS.length * ROW_HEIGHT + (LAYERS.length - 1) * ROW_GAP;
    const EXIT = { x: 88, y: PRISM_HEIGHT / 2 };

    const rays = LAYERS.map((layer, index) => ({
        ...layer,
        y: index * (ROW_HEIGHT + ROW_GAP) + ROW_HEIGHT / 2,
        count: USAGES.filter(usage => usage.layer === layer.key).length
    }));
    const isLayerActive = computed(() => rays.some(ray => ray.key === active));
</script>

<template>
    <figure class="md-prism" aria-label="一行 Markdown 經過稜鏡，折射成四道光">
        <p class="md-prism__caption">你寫下的一行</p>
        <code class="md-prism__source">-|重點|- 與 **Shell**{.brand}</code>

        <div class="md-prism__body" :style="{ '--prism-height': `${PRISM_HEIGHT}px`, '--row-height': `${ROW_HEIGHT}px`, '--row-gap': `${ROW_GAP}px` }">
            <svg
                class="md-prism__svg"
                :viewBox="`0 0 120 ${PRISM_HEIGHT}`"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="md-prism-glass" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stop-color="#F4B936" stop-opacity=".35" />
                        <stop offset="1" stop-color="#BD34FE" stop-opacity=".35" />
                    </linearGradient>
                </defs>

                <line class="md-prism__beam" x1="0" :y1="EXIT.y + 18" x2="50" :y2="EXIT.y" />
                <path
                    v-for="(ray, index) in rays"
                    :key="ray.key"
                    class="md-prism__ray"
                    :class="[`is-${ray.key}`, { 'is-dim': isLayerActive && active !== ray.key }]"
                    :style="{ '--delay': `${index * 90}ms` }"
                    :d="`M ${EXIT.x} ${EXIT.y} C 104 ${EXIT.y}, 104 ${ray.y}, 120 ${ray.y}`"
                />
                <polygon
                    class="md-prism__glass"
                    :points="`68,${EXIT.y - 44} 40,${EXIT.y + 30} 96,${EXIT.y + 30}`"
                    fill="url(#md-prism-glass)"
                />
            </svg>

            <ol class="md-prism__layers">
                <li v-for="ray in rays" :key="ray.key">
                    <button
                        type="button"
                        class="md-prism__layer"
                        :class="[`is-${ray.key}`, { 'is-active': active === ray.key }]"
                        :aria-pressed="active === ray.key"
                        @click="emit('select', ray.key)"
                    >
                        <span class="md-prism__layer-name">
                            {{ ray.name }}<small>{{ ray.en }} · {{ ray.count }} 種</small>
                        </span>
                        <span class="md-prism__layer-desc">{{ ray.desc }}</span>
                    </button>
                </li>
            </ol>
        </div>

        <figcaption class="md-prism__footer">
            <button type="button" :class="{ 'is-active': active === 'overview' }" @click="emit('select', 'overview')">
                ← 先看光譜總覽
            </button>
            <button type="button" :class="{ 'is-active': active === LAYER_OFF.key }" @click="emit('select', LAYER_OFF.key)">
                還有一道{{ LAYER_OFF.name }}的光 →
            </button>
        </figcaption>
    </figure>
</template>

<style lang="scss">
    .md-prism {
        // 上緣一條光譜：四道光的顏色依序排開，也是這張圖的圖例
        background:
            linear-gradient(90deg, var(--md-layer-text), var(--md-layer-block), var(--md-layer-code), var(--md-layer-live)) top / 100% 4px no-repeat,
            var(--vp-c-bg-soft);
        padding: 1.25rem 1.5rem;
        border-radius: 12px;
        margin: 1.5rem 0 2rem;

        &__caption {
            margin: 0 0 .5rem !important;
            color: var(--vp-c-text-2) !important;
            font-size: var(--font-size-s) !important;
        }

        &__source {
            display: inline-block;

            // 跟程式碼區塊同一個底（不分深淺色都是 one-dark 的深底）
            background-color: var(--vp-code-block-bg) !important;
            max-width: 100%;
            padding: .5rem .875rem !important;
            border-radius: 6px;
            color: #ABB2BF !important;
            font-family: var(--font-monospace);
            font-size: var(--font-size-s) !important;
            white-space: normal;
        }

        &__body {
            display: grid;
            grid-template-columns: 96px minmax(0, 1fr);
            gap: .75rem;
            margin-top: 1rem;
        }

        &__svg {
            width: 100%;
            height: var(--prism-height);
            overflow: visible;
        }

        &__beam {
            stroke: var(--vp-c-text-2);
            stroke-linecap: round;
            stroke-width: 3;
        }

        &__ray {
            fill: none;
            stroke: var(--md-layer);
            stroke-dasharray: 120;
            stroke-dashoffset: 0;
            stroke-linecap: round;
            stroke-width: 3;
            transition: opacity .3s var(--cubic-FiSo);
            animation: md-prism-ray .6s var(--cubic-FiSo) var(--delay) backwards;

            &.is-dim { opacity: .25; }
        }

        &__layers {
            display: flex;
            flex-direction: column;
            gap: var(--row-gap);
            padding: 0 !important;
            margin: 0 !important;
            list-style: none !important;

            li {
                padding: 0 !important;
                margin: 0 !important;
                list-style: none !important;
            }
        }

        &__layer {
            display: flex;
            flex-direction: column;
            gap: .125rem;
            justify-content: center;
            background-color: var(--vp-c-bg);
            width: 100%;
            height: var(--row-height);
            padding: 0 1rem;
            border: none;
            border-left: 4px solid var(--md-layer);
            border-radius: 4px 8px 8px 4px;
            color: var(--vp-c-text-1);
            font: inherit;
            text-align: left;
            cursor: pointer;
            transition:
                transform .25s var(--cubic-FiSo),
                background-color .25s var(--cubic-FiSo);
            overflow: hidden;

            &:hover,
            &:focus-visible {
                background-color: color-mix(in srgb, var(--md-layer) 8%, var(--vp-c-bg));
                transform: translateX(4px);
            }

            &.is-active {
                background-color: color-mix(in srgb, var(--md-layer) 16%, var(--vp-c-bg));
            }
        }

        &__layer-name {
            color: var(--md-layer);
            font-weight: 600;

            small {
                margin-left: .5rem;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-xs);
                font-weight: 400;
            }
        }

        &__layer-desc {
            display: -webkit-box;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            line-height: 1.4;
            overflow: hidden;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
        }

        &__footer {
            display: flex;
            flex-wrap: wrap;
            gap: .5rem;
            justify-content: space-between;
            margin-top: 1rem;

            button {
                background: none;
                padding: .25rem .5rem;
                border: none;
                border-radius: 6px;
                color: var(--vp-c-text-2);
                font: inherit;
                font-size: var(--font-size-s);
                cursor: pointer;
                transition:
                    color .25s var(--cubic-FiSo),
                    background-color .25s var(--cubic-FiSo);

                &:hover,
                &:focus-visible,
                &.is-active {
                    background-color: var(--vp-c-default-soft);
                    color: var(--vp-c-text-1);
                }
            }
        }
    }
    @keyframes md-prism-ray {
        from { stroke-dashoffset: 120; }
    }
    @media (prefers-reduced-motion: reduce) {
        .md-prism__ray { animation: none; }
        .md-prism__layer { transition: none; }
    }
</style>
