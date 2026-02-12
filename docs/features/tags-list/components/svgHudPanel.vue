<script setup lang="ts">
import { ref, computed } from 'vue';
import { useElementSize } from '@vueuse/core';

const props = defineProps<{
  title?: string;
  side?: 'left' | 'right';
  color?: string;
}>();

const container = ref(null);
const { width: realW, height: realH } = useElementSize(container);

// 1. 定義幾何規格 (幾何常數)
const w = computed(() => Math.max(realW.value, 120));
const h = computed(() => Math.max(realH.value, 200));
const themeColor = computed(() => props.color || '#d4ff00');

const SLOPE = 10; // 統一的倒角位移 (45度核心)
const TAB_GAP = 4; // 裝飾塊離邊框的距離

// 鏡像座標轉換
const fx = (x: number) => props.side === 'right' ? w.value - x : x;

// 2. 精密計算主邊框路徑
const mainPath = computed(() => {
  const _w = w.value; const _h = h.value;
  const midY = _h / 2;

  // 確保每一組轉折點的 dx 與 dy 絕對相等
  const points = [
    [fx(SLOPE), 0], [fx(_w - 5), 0], [fx(_w), 5],             // 頂部
    [fx(_w), midY - 30], [fx(_w - SLOPE), midY - 20],        // 內折開始 (dx=10, dy=10)
    [fx(_w - SLOPE), midY + 30], [fx(_w - 20), midY + 40],   // 內折延伸
    [fx(_w - 20), _h - SLOPE], [fx(_w - 20 - SLOPE), _h],    // 右下切角 (dx=10, dy=10)
    [fx(10), _h], [fx(0), _h - 10],                          // 左下
    [fx(0), SLOPE]                                           // 左上
  ];

  return `M ${points.map(p => p.join(',')).join(' L ')} Z`;
});

// 3. 計算契合的 Side Tab (1px 細線 + 色塊)
const sideTabDecor = computed(() => {
  const _w = w.value;
  const midY = h.value / 2;
  const startY = midY - 25;
  const endY = midY + 25;

  // 與邊框斜邊平行的座標計算
  return {
    line: { x1: fx(_w + 2), y1: startY, x2: fx(_w + 2), y2: endY },
    block: `M ${fx(_w - TAB_GAP)} ${startY}
            L ${fx(_w - TAB_GAP - 8)} ${startY + 8}
            V ${endY - 8}
            L ${fx(_w - TAB_GAP)} ${endY} Z`
  };
});
</script>

<template>
  <div ref="container" class="industrial-hud" :style="{ '--hud-color': themeColor }">
    <svg class="hud-svg" :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.1" />
        </pattern>
      </defs>

      <path :d="mainPath" class="hud-bg" />
      <path :d="mainPath" fill="url(#grid)" />

      <g class="side-tab-group">
        <!-- <line
          :x1="sideTabDecor.line.x1" :y1="sideTabDecor.line.y1"
          :x2="sideTabDecor.line.x2" :y2="sideTabDecor.line.y2"
          stroke="currentColor" stroke-width="1"
        /> -->
        <path :d="sideTabDecor.block" class="side-tab-block" />
      </g>

      <polygon :points="`${fx(w-15)},5 ${fx(w-5)},5 ${fx(w-5)},15`" class="corner-tri" />

      <g class="bottom-dots">
        <circle v-for="i in 8" :key="i" :cx="fx(35 + i*15)" :cy="h - 15" r="2" fill="currentColor" />
      </g>
    </svg>

    <div class="hud-content">
      <header v-if="title" class="hud-header">
        <div class="title-line"></div>
        <span class="title-text">{{ title }}</span>
      </header>
      <main class="hud-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.industrial-hud {
  position: relative;
  min-width: 150px;
  min-height: 200px;
  color: var(--hud-color);

  .hud-svg {
    position: absolute;
    top: 0; left: 0;
    pointer-events: none;
    overflow: visible; // 確保 1px 外掛線條不被裁切

    .hud-bg {
      fill: rgb(20, 25, 0, 85%);
      stroke: var(--hud-color);
      stroke-width: 1.5;
    }

    .side-tab-block {
      fill: var(--hud-color);
      opacity: 0.8;
    }

    .corner-tri {
      fill: var(--hud-color);
      animation: tri-pulse 2s infinite;
    }
  }

  .hud-content {
    position: relative;
    padding: 30px;
    z-index: 1;

    .hud-header {
      margin-bottom: 20px;
      .title-text {
        font-family: Orbitron, sans-serif;
        font-weight: 900;
        letter-spacing: 2px;
        text-transform: uppercase;
      }
      .title-line {
        background: var(--hud-color);
        width: 30px; height: 4px;
        margin-bottom: 8px;
      }
    }
  }
}
@keyframes tri-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.9); opacity: 0.5; }
}
</style>