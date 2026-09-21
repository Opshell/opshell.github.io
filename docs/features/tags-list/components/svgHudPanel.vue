<script setup lang="ts">
    import { ref, computed } from 'vue';
    import { useElementSize } from '@vueuse/core';

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

    const isCollapsed = ref(false);
    const toggleCollapse = () => {
        isCollapsed.value = !isCollapsed.value;
    };

    const headerRef = ref<HTMLElement | null>(null);
    const mainRef = ref<HTMLElement | null>(null);

    const { width: headerW, height: headerH } = useElementSize(headerRef);
    const { width: mainW, height: mainH } = useElementSize(mainRef);

    const SLOPE = 12;
    const themeColor = computed(() => props.color);

    // --- 幾何計算 ---
    const hw = computed(() => Math.max(headerW.value, 150));
    const hh = computed(() => Math.max(headerH.value, 40));
    const fhx = (x: number) => props.side === 'right' ? hw.value - x : x;

    const mw = computed(() => Math.max(mainW.value, 150));
    const mh = computed(() => Math.max(mainH.value, 50));
    const fmx = (x: number) => props.side === 'right' ? mw.value - x : x;

    // 1. Header Path (只有上左切角)
    const headerPath = computed(() => {
        const _w = hw.value;
        const _h = hh.value;
        const points = [
            [fhx(_w - 5), 0], [fhx(_w), 5],             // 頂部 [fhx(SLOPE / 2), 0],

            [fhx(_w), _h - 10], [fhx(_w - 5), _h - 5],                   // 底部 (平整對接)
            [fhx(_w - 5), _h], [fhx(0), _h],                   // 底部 (平整對接)
            [fhx(0), 0]                        // 左側接上左
        ];
        return `M ${points.map(p => p.join(',')).join(' L ')} Z`;
    });

    // 2. Main Path (包含下右與下左切角)
    const mainPath = computed(() => {
        const _w = mw.value;
        const _h = mh.value;
        const points = [
            [fmx(0), 0], [fmx(_w - 5), 0],                              // 頂部 (平整對接 Header)
            [fmx(_w - 5), 5], [fmx(_w), 10],   // 右側接上右切角
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
        const _h = mh.value;
        const midY = mh.value / 2;

        const startY = _h / 3 - SLOPE + 4;
        const endY = Math.min(midY + 20, mh.value - 20);

        return `M ${fmx(_w) - 1} ${startY + 1}
                L ${fmx(_w - 9)} ${startY + 9}
                V ${endY}
                L ${fmx(_w - 1)} ${endY - 8} Z`;
    });

    // 4. buttom 裝飾塊 (綁定在 Main)
    const buttomDecor = computed(() => {
        const _w = mw.value;
        const midY = mh.value / 2;
        const startY = Math.max(midY - 20, 10);
        const endY = mh.value;

        return `M ${fmx(_w * 0.4 + 4)} ${endY - 10}
                L ${fmx(_w * 0.6 - 4)} ${endY - 10}
                L ${fmx(_w * 0.6)} ${endY - 6}
                V ${endY + 4}
                L ${fmx(_w * 0.4)} ${endY + 4}
                L ${fmx(_w * 0.4)} ${endY - 6} Z`;
    });

    // const sideTabDecor = computed(() => {
    //     const _w = mw.value; const midY = mh.value / 2;
    //     const startY = Math.max(midY - 20, 10);
    //     const endY = Math.min(midY + 20, mh.value - 20);
    //     return `M ${fmx(_w)} ${startY} L ${fmx(_w - 6)} ${startY + 6} V ${endY - 6} L ${fmx(_w)} ${endY} Z`;
    // });
</script>

<template>
    <section class="cyber-hud-wrapper" :class="[`side-${side}`, { 'is-collapsed': isCollapsed }]" :style="{ '--hud-color': themeColor }">
        <header ref="headerRef" class="hud-header" @click="toggleCollapse">
            <svg class="bg-svg" :width="hw" :height="hh">
                <path :d="headerPath" class="hud-bg shape-border" />
                <polygon
                    v-if="isCollapsed"
                    :points="`${fhx(39)}, 32 ${fhx(39)}, 38 ${fhx(34)}, 38`"
                    class="corner-tri"
                />
            </svg>

            <div class="header-content">
                <div class="icon-box"><ElSvgIcon :name="icon" /></div>
                <h2 class="title">{{ title }}</h2>
                <div class="minimize-btn" :class="{ active: isCollapsed }"></div>
            </div>
        </header>

        <div class="hud-main-transition" :class="{ 'is-collapsed': isCollapsed }">
            <main ref="mainRef" class="hud-main">
                <svg class="bg-svg" :width="mw" :height="mh">
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.1" />
                        </pattern>
                    </defs>
                    <path :d="mainPath" class="hud-bg shape-border" />
                    <path :d="mainPath" fill="url(#grid)" />

                    <path :d="sideTabDecor" class="side-tab-block interactive-element" />
                    <path :d="buttomDecor" class="buttom-block" />

                    <polygon :points="`${fhx(5)}, 5 ${fhx(15)}, 5 ${fhx(5)},15`" class="corner-tri" />
                </svg>

                <div class="main-content">
                    <div class="scan-line" />
                    <slot />
                </div>
            </main>
        </div>

    </section>
</template>

<style lang="scss" scoped>
    $bg-color: rgb(0, 10, 20, 85%);

    .cyber-hud-wrapper {
        position: relative;
        max-width: 350px;
        margin-bottom: 1rem;
        color: var(--hud-color);
        pointer-events: auto;
        transition: .25s var(--cubic-FiSo);
        filter: drop-shadow(0 0 4px rgb(0, 240, 255, 30%));
        &.side-right { margin-left: auto; }
        &.is-collapsed {
            max-width: 42px;
            .hud-header {
                border-right: 1px solid var(--hud-color);
                box-shadow: inset -4px 0 8px -4px var(--hud-color),
                            inset -8px 0 16px -4px var(--hud-color);
                .header-content { padding: 4px; }
            }
        }

        .bg-svg {
            position: absolute; top: 0; left: 0;
            z-index: -1; // 修改點 3：強制把 SVG 壓到最底層
            .hud-bg {
                fill: $bg-color;
                backdrop-filter: blur(8px);
                pointer-events: none;
            }
            .shape-border { stroke: var(--hud-color); stroke-width: 1px; opacity: 0.7; }
            .corner-tri,
            .side-tab-block,
            .buttom-block { fill: var(--hud-color); }

            // 💡 針對互動元素的專屬設定
            .interactive-element {
                fill: var(--hud-color);
                pointer-events: auto; // 開啟滑鼠事件
                cursor: pointer;      // 加上手指游標
                transition: fill 0.2s var(--cubic-FiSo); // 確保動畫平滑

                &:hover {
                    fill: #f05;

                    // 如果想要加點科技感，可以讓 hover 時發光
                    filter: drop-shadow(0 0 6px #f05);
                }
            }
        }

        .hud-header {
            position: relative;
            min-height: 40px;
            cursor: pointer;
            transition: .35s var(--cubic-FiSo);
            overflow: hidden;
            z-index: 2;
            user-select: none;

            .header-content {
                position: relative; display: flex; gap: 12px; align-items: center; height: 40px;
                padding: 0 12px; z-index: 1;
                .icon-box { display: flex; align-items: center; color: var(--hud-color); }
                .title {
                    flex: 1; margin: 0; font-family: Orbitron, sans-serif;
                    font-size: 0.9rem; font-weight: 700; letter-spacing: 1.5px;
                    white-space: nowrap;
                    text-transform: uppercase; text-shadow: 0 0 4px rgb(0, 240, 255, 50%);;
                }
                .minimize-btn { background: var(--hud-color);
                    width: 12px; height: 2px;
                    transition: transform 0.3s, background-color 0.3s;
                    &.active { background: #f05; transform: rotate(180deg); }
                }
            }

            &:hover {
                .corner-tri { fill: #f05}
            }

        }

        /* 修改點 4：優雅的 CSS Grid 高度動畫 */
        .hud-main-transition {
            display: grid;
            grid-template-rows: 1fr;
            margin-top: -1px;
            transition: grid-template-rows 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease;
            z-index: 1;

            &.is-collapsed {
                grid-template-rows: 0fr;
                pointer-events: none; // 縮合時禁止內部點擊
                opacity: 0;
            }
        }

        .hud-main {
            position: relative;
            min-height: 0; // 關鍵：允許 Grid 容器將此元素壓縮至 0 高度
            overflow: hidden;

            .main-content {
                position: relative;
                min-height: 120px; // 將原本的 min-height 移入這裡撐開容器
                padding: 15px 30px 20px 13px;
                color: #fff;
                z-index: 10;

                .scan-line {
                    position: absolute; top: 0; left: 0;
                    background: var(--hud-color); width: 100%; height: 2px; pointer-events: none;
                    animation: scan 3s linear infinite; opacity: 0.3;
                }
            }
        }
    }
    @keyframes scan {
        0% {
            top: 0;
            opacity: 0;
        }
        50% { opacity: 0.5; }
        100% {
            top: 100%;
            opacity: 0;
        }
    }
</style>