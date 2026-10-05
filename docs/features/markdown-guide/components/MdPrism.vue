<script setup lang="ts">
    import { LAYER_OFF, LAYERS, USAGES } from '../constants';

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
                    :class="`is-${ray.key}`"
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
                    <a class="md-prism__layer" :class="`is-${ray.key}`" :href="`#${ray.key}`">
                        <span class="md-prism__layer-name">
                            {{ ray.name }}<small>{{ ray.en }} · {{ ray.count }} 種</small>
                        </span>
                        <span class="md-prism__layer-desc">{{ ray.desc }}</span>
                    </a>
                </li>
            </ol>
        </div>

        <figcaption class="md-prism__footer">
            <span>讀者看到的四道光</span>
            <a class="is-off" :href="`#${LAYER_OFF.key}`">還有一道{{ LAYER_OFF.name }}的光 →</a>
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

            // 固定用 one-dark 的底色：淺色模式的程式碼底是淺灰，這行淡色字放上去會看不清楚
            background-color: #282C34 !important;
            padding: .5rem .875rem !important;
            border-radius: 6px;
            color: #ABB2BF !important;
            font-family: var(--font-monospace);
            font-size: var(--font-size-s) !important;
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
            animation: md-prism-ray .6s var(--cubic-FiSo) var(--delay) backwards;
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
            height: var(--row-height);
            padding: 0 1rem;
            border-left: 4px solid var(--md-layer);
            border-radius: 4px 8px 8px 4px;
            color: var(--vp-c-text-1) !important;

            // 設計系統頁沒有文章版型，.vp-doc 預設會給連結畫底線
            text-decoration: none !important;
            transition: transform .2s var(--cubic-FiSo);
            overflow: hidden;

            &:hover { transform: translateX(4px); }
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
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);

            a {
                color: var(--vp-c-text-2) !important;
                text-decoration: none !important;
            }
        }
    }
    @keyframes md-prism-ray {
        from { stroke-dashoffset: 120; }
    }
    @media (prefers-reduced-motion: reduce) {
        .md-prism__ray { animation: none; }
    }
</style>
