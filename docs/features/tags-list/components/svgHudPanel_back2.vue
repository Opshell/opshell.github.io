<script setup lang="ts">
import { ref, computed } from 'vue';
import { useElementSize } from '@vueuse/core';

// 定義 Props 與預設值
const props = withDefaults(defineProps<{
    title?: string;
    icon?: string;
    side?: 'left' | 'right';
    color?: string;
}>(), {
    title: 'SYSTEM PANEL',
    icon: 'bookmark_stacks',
    side: 'left',
    color: '#00f0ff'
});

// 狀態控制
const isCollapsed = ref(false);
const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value;
};

// DOM Refs 與尺寸監聽
const headerRef = ref<HTMLElement | null>(null);
const mainRef = ref<HTMLElement | null>(null);

const { width: headerW, height: headerH } = useElementSize(headerRef);
const { width: mainW, height: mainH } = useElementSize(mainRef);

// --- 幾何常數與計算 ---
const SLOPE = 12; // 統一的倒角尺寸
const themeColor = computed(() => props.color);

// Header 幾何
const hw = computed(() => Math.max(headerW.value, 150));
const hh = computed(() => Math.max(headerH.value, 40));
const fhx = (x: number) => props.side === 'right' ? hw.value - x : x;

// Main 幾何
const mw = computed(() => Math.max(mainW.value, 150));
const mh = computed(() => Math.max(mainH.value, 50));
const fmx = (x: number) => props.side === 'right' ? mw.value - x : x;

// 1. Header Path (只有上左切角)
const headerPath = computed(() => {
    const _w = hw.value;
    const _h = hh.value;
    const points = [
        [fhx(SLOPE), 0], [fhx(_w), 0],             // 頂部
        [fhx(_w), _h], [fhx(0), _h],               // 底部 (平整對接)
        [fhx(0), SLOPE]                            // 左側接上左
    ];
    return `M ${points.map(p => p.join(',')).join(' L ')} Z`;
});

// 2. Main Path (包含下右與下左切角)
const mainPath = computed(() => {
    const _w = mw.value;
    const _h = mh.value;
    const points = [
        [fmx(0), 0], [fmx(_w), 0],                              // 頂部 (平整對接 Header)
        [fmx(_w), _h / 3 - SLOPE], [fmx(_w - SLOPE), _h / 3],   // 右側接上右切角
        [fmx(_w - SLOPE), _h - 0.5 * SLOPE],                      // 右下切角
        [fmx(_w - SLOPE - 0.5 * SLOPE), _h],
        [fmx(SLOPE + 5), _h], [fmx(0), _h - SLOPE - 5]          // 左下切角
    ];
    return `M ${points.map(p => p.join(',')).join(' L ')} Z`;
});

// 3. Side Tab 裝飾塊 (綁定在 Main)
const sideTabDecor = computed(() => {
    const _w = mw.value;
    const midY = mh.value / 2;
    const startY = Math.max(midY - 20, 10);
    const endY = Math.min(midY + 20, mh.value - 20);

    return `M ${fmx(_w)} ${startY}
            L ${fmx(_w - 8)} ${startY + 8}
            V ${endY}
            L ${fmx(_w)} ${endY - 8} Z`;
});
</script>

<template>
    <section class="cyber-hud-wrapper" :class="[`side-${side}`, { 'is-collapsed': isCollapsed }]" :style="{ '--hud-color': themeColor }">

        <header ref="headerRef" class="hud-header" @click="toggleCollapse">
            <svg class="bg-svg" :width="hw" :height="hh">
                <path :d="headerPath" class="hud-bg shape-border" />
                <polygon :points="`${fhx(hw-15)},5 ${fhx(hw-5)},5 ${fhx(hw-5)},15`" class="corner-tri" />
            </svg>

            <div class="header-content">
                <div class="icon-box">
                    <ElSvgIcon :name="icon" />
                </div>
                <h2 class="title">{{ title }}</h2>
                <div class="minimize-btn" :class="{ active: isCollapsed }"></div>
            </div>
        </header>

        <Transition name="cyber-slide">
            <div v-show="!isCollapsed" class="hud-main-transition">
                <main ref="mainRef" class="hud-main">
                    <svg class="bg-svg" :width="mw" :height="mh">
                        <defs>
                            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path
                                    d="M 20 0 L 0 0 0 20"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="0.5"
                                    opacity="0.1"
                                />
                            </pattern>
                        </defs>
                        <path :d="mainPath" class="hud-bg shape-border" />
                        <path :d="mainPath" fill="url(#grid)" />
                        <path :d="sideTabDecor" class="side-tab-block" />

                        <polygon :points="`${fhx(5)},5 ${fhx(15)},5 ${fhx(5)},15`" class="corner-tri" />
                    </svg>

                    <div class="main-content">
                        <div class="scan-line" />
                        <slot />
                    </div>
                </main>
            </div>
        </Transition>
    </section>
</template>

<style lang="scss" scoped>
$bg-color: rgb(0, 10, 20, 85%);

.cyber-hud-wrapper {
    position: relative;
    margin-bottom: 1rem;
    color: var(--hud-color);
    filter: drop-shadow(0 0 4px rgb(0, 240, 255, 30%));

    &.side-right {
        margin-left: auto;
    }

    /* 共用 SVG 樣式 */
    .bg-svg {
        position: absolute;
        top: 0; left: 0;
        pointer-events: none;
        z-index: 0;

        .hud-bg {
            fill: $bg-color;
            backdrop-filter: blur(8px);
        }
        .shape-border {
            stroke: var(--hud-color);
            stroke-width: 1px;
            opacity: 0.7;
        }
        .corner-tri, .side-tab-block {
            fill: var(--hud-color);
        }
    }

    /* --- Header 樣式 --- */
    .hud-header {
        position: relative;
        min-height: 40px;
        cursor: pointer;
        user-select: none;
        z-index: 2; // 確保層級比 main 高，壓住接縫

        .header-content {
            position: relative;
            display: flex;
            gap: 12px;
            align-items: center;
            height: 40px; // 固定高度對齊 SVG
            padding: 0 12px;
            z-index: 1;

            .icon-box {
                display: flex; align-items: center;
                color: var(--hud-color);
            }

            .title {
                flex: 1;
                margin: 0;
                font-family: Orbitron, sans-serif;
                font-size: 0.9rem;
                font-weight: 700;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                text-shadow: 0 0 4px rgb(0, 240, 255, 50%);
            }

            .minimize-btn {
                background: var(--hud-color);
                width: 12px; height: 2px;
                transition: transform 0.3s, background-color 0.3s;
                &.active {
                    background: #f05;
                    transform: rotate(180deg);
                }
            }
        }
    }

    /* --- Main 樣式 --- */
    .hud-main-transition {
        position: relative;
        margin-top: -1px; // 神奇的一像素：解決亞像素接縫問題
        overflow: hidden;
        z-index: 1;
    }

    .hud-main {
        position: relative;
        min-height: 120px;

        .main-content {
            position: relative;
            padding: 15px;
            color: #fff;
            z-index: 1;

            .scan-line {
                position: absolute;
                top: 0; left: 0;
                background: var(--hud-color);
                width: 100%; height: 2px;
                pointer-events: none;
                animation: scan 3s linear infinite;
                opacity: 0.3;
            }
        }
    }
}

/* Vue 動畫：使用 Grid 技巧達成平滑收合 */
.cyber-slide-enter-active,
.cyber-slide-leave-active {
    display: grid;
    grid-template-rows: 1fr;
    transition: grid-template-rows 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease;
}
.cyber-slide-enter-from,
.cyber-slide-leave-to {
    grid-template-rows: 0fr;
    opacity: 0;
}
@keyframes scan {
    0% { top: 0; opacity: 0; }
    50% { opacity: 0.5; }
    100% { top: 100%; opacity: 0; }
}
</style>