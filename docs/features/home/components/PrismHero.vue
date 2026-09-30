<script setup lang="ts">
    import type { Ray } from '../prism';
    import { hueVar } from '@shared/utils/spectrum';
    import { onMounted, ref } from 'vue';
    import { EXIT, LABEL_X, ORB, VIEW } from '../prism';

    // 首頁的稜鏡：一道光射進 O（舊首頁那張「筆記本裡的宇宙」裁成圓），從另一邊散成各分類的光。
    // 每道光是一個連結，點了從那個分類的第一篇讀起；滑過一道光，其他的會暗下去。
    // 進場只有一次：光先射進來，再往右散開。沒有 JS 或關閉動態時直接是畫好的樣子（.is-motion 才有動畫）。
    const { rays = [] } = defineProps<{ rays?: Ray[] }>();

    // 插畫裡那個宇宙圓：圓心在圖的 (47.4%, 43.5%)、半徑約 30% 寬。算出圖要放多大、放哪裡，讓它剛好填滿 O
    const IMAGE_SIZE = ORB.r / 0.3;
    const image = { x: ORB.cx - IMAGE_SIZE * 0.474, y: ORB.cy - IMAGE_SIZE * 0.435, size: IMAGE_SIZE };
    // 入射光從左下方斜斜打進來
    const beam = { x1: 0, y1: ORB.cy + 96, x2: ORB.cx, y2: ORB.cy };
    const beamLength = Math.hypot(beam.x2 - beam.x1, beam.y2 - beam.y1);

    const motion = ref(false);
    onMounted(() => {
        motion.value = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
    });
</script>

<template>
    <figure class="prism" :class="{ 'is-motion': motion }">
        <svg
            class="prism__svg"
            :viewBox="`0 0 ${VIEW.width} ${VIEW.height}`"
            role="group"
            aria-labelledby="prism-caption"
            :style="{ '--beam-length': beamLength, '--exit-x': `${EXIT.x}px`, '--exit-y': `${EXIT.y}px` }"
        >
            <defs>
                <clipPath id="prism-orb-clip">
                    <circle :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r" />
                </clipPath>
                <linearGradient id="prism-ring" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="30%" stop-color="var(--pr-amber)" />
                    <stop offset="80%" stop-color="var(--pr-violet)" />
                </linearGradient>
                <!-- 舊首頁插畫後面那團琥珀＋紫的光暈 -->
                <filter id="prism-glow" filterUnits="userSpaceOnUse" x="-120" y="-120" :width="VIEW.width + 240" :height="VIEW.height + 240">
                    <feGaussianBlur stdDeviation="30" />
                </filter>
            </defs>

            <line class="prism__beam" v-bind="beam" />

            <a
                v-for="(ray, index) in rays"
                :key="ray.key"
                class="prism__ray"
                :href="ray.href"
                :style="{ '--hue': hueVar(ray.hue), '--i': index }"
                :aria-label="`${ray.label}，${ray.count} 篇`"
            >
                <polygon :points="ray.points" />
                <text :x="LABEL_X" :y="ray.y" dominant-baseline="central" aria-hidden="true">
                    <tspan class="label">{{ ray.label }}</tspan>
                    <tspan class="count" dx="10">{{ ray.count }}</tspan>
                </text>
            </a>

            <g class="prism__orb" aria-hidden="true">
                <circle class="glow" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r * 0.9" fill="url(#prism-ring)" filter="url(#prism-glow)" />
                <circle class="base" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r" />
                <image
                    href="/opshell-blog.webp"
                    :x="image.x"
                    :y="image.y"
                    :width="image.size"
                    :height="image.size"
                    clip-path="url(#prism-orb-clip)"
                    preserveAspectRatio="xMidYMid slice"
                />
                <circle class="ring" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r" stroke="url(#prism-ring)" />
            </g>
        </svg>
        <figcaption id="prism-caption">一道光穿過 O，散成這裡寫的每一類：光越寬，文章越多。</figcaption>
    </figure>
</template>

<style lang="scss">
    .prism {
        margin: 0;

        &__svg {
            display: block;
            width: 100%;
            height: auto;
            overflow: visible;
        }

        // 入射光：深色是白光，淺色是一條墨線（白光在白底上看不見）
        &__beam {
            stroke: var(--vp-c-text-1);
            stroke-width: 2.5;
            stroke-linecap: round;
        }

        // #region [P] 光線
        &__ray {
            cursor: pointer;
            transition: opacity .2s var(--cubic-FiSo);

            polygon {
                fill: var(--hue);
                opacity: .9;
            }
            text {
                fill: var(--vp-c-text-1);
                font-family: var(--vp-font-family-base);
            }
            .label {
                font-size: 19px;
                font-weight: 700;
            }
            .count {
                fill: var(--vp-c-text-2);
                font-family: var(--vp-font-family-mono);
                font-size: 15px;
            }

            // 手機上整張圖縮到一半以下：字在 SVG 座標裡放大，縮完才有 12px
            @include setRWD(640px) {
                .label { font-size: 26px; }
                .count { font-size: 20px; }
            }
            &:focus { outline: none; }
            &:focus-visible {
                polygon {
                    stroke: var(--vp-c-text-1);
                    stroke-width: 1.5;
                }
                .label { text-decoration: underline; }
            }
        }

        // 滑到一道光上，其他的暗下去
        &__svg:has(.prism__ray:hover, .prism__ray:focus-visible) .prism__ray:not(:hover, :focus-visible) { opacity: .3; }

        // #endregion

        &__orb {
            .glow { opacity: .55; }
            .base { fill: var(--vp-c-bg-alt); }
            .ring {
                fill: none;
                stroke-width: 3;
            }
        }
        figcaption {
            margin-top: .75rem;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            text-align: center;
        }

        // #region [P] 進場：光射進來（.35s），再往右散開，一道接一道
        &.is-motion {
            .prism__beam {
                stroke-dasharray: var(--beam-length);
                animation: prism-beam .45s var(--cubic-FiSo) both;
            }
            .prism__ray {
                polygon {
                    transform-origin: var(--exit-x) var(--exit-y);
                    transform-box: view-box;
                    animation: prism-fan .6s var(--cubic-FiSo) both;
                    animation-delay: calc(.4s + var(--i) * 70ms);
                }
                text {
                    animation: prism-label .4s ease-out both;
                    animation-delay: calc(.7s + var(--i) * 70ms);
                }
            }
        }

        // #endregion
    }

    // 深色模式：光線帶一點光暈，像真的光
    .dark .prism__ray polygon { filter: drop-shadow(0 0 6px var(--hue)); }
    @keyframes prism-beam {
        from { stroke-dashoffset: var(--beam-length); }
        to { stroke-dashoffset: 0; }
    }
    @keyframes prism-fan {
        from {
            transform: scaleX(0);
            opacity: 0;
        }
    }
    @keyframes prism-label {
        from {
            transform: translateX(-8px);
            opacity: 0;
        }
    }
</style>
