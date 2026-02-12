<script setup lang="ts">
import { ref, computed } from 'vue';
import { useElementSize } from '@vueuse/core';

const props = defineProps<{
    title?: string;
    side?: 'left' | 'right';
    color?: string; // 預設黃綠色 #d4ff00
}>();


const isCollapsed = ref(false);


const container = ref(null);
const { width: realW, height: realH } = useElementSize(container);

// 設定最小寬高，防止塌陷
const w = computed(() => Math.max(realW.value, 120));
const h = computed(() => Math.max(realH.value, 200));
const themeColor = computed(() => props.color || '#d4ff00');

// 鏡像座標轉換函式
const flipX = (x: number) => props.side === 'right' ? w.value - x : x;

// 動態計算主邊框路徑
const mainPath = computed(() => {
    const _w = w.value;
    const _h = h.value;
    const cut = 20;

    // 定義點位 (以左側為基準，透過 flipX 轉換)
    const points = [
        [flipX(cut), 0], [flipX(_w - 5), 0], [flipX(_w), 5], // 頂部
        [flipX(_w), _h - cut], [flipX(_w - cut), _h],       // 右下切角
        [flipX(5), _h], [flipX(0), _h - 5],                // 左下
        [flipX(0), cut]                                    // 左上
    ];

    return `M ${points.map(p => p.join(',')).join(' L ')} Z`;
});
</script>

<template>
  <div ref="container" class="industrial-hud" :style="{ '--hud-color': themeColor }">
    <svg class="hud-svg" :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.2" />
        </pattern>
      </defs>

      <path :d="mainPath" class="hud-bg" />
      <path :d="mainPath" fill="url(#grid)" />

      <path :d="`M ${flipX(w)} ${h*0.3} L ${flipX(w-8)} ${h*0.3+10} V ${h*0.6-10} L ${flipX(w)} ${h*0.6} Z`" class="side-tab" />
      <path :d="`M ${flipX(0)} ${h*0.5} L ${flipX(12)} ${h*0.5+8} V ${h*0.7-8} L ${flipX(0)} ${h*0.7} Z`" class="side-tab" />

      <polygon :points="`${flipX(w-15)},5 ${flipX(w-5)},5 ${flipX(w-5)},15`" class="corner-tri" />

      <g class="bottom-dots">
        <circle v-for="i in 8" :key="i" :cx="flipX(30 + i*15)" :cy="h - 15" r="2" fill="currentColor" />
      </g>
    </svg>

    <div class="hud-content">
      <header v-if="title" class="hud-header">
        <div class="title-line"></div>
        <span>{{ title }}</span>
        <div class="toggle-btn" :class="{ rotated: isCollapsed }"></div>
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

    .hud-bg {
      fill: rgb(20, 25, 0, 80%);
      stroke: var(--hud-color);
      stroke-width: 2;
    }

    .side-tab {
      fill: var(--hud-color);
      opacity: 0.8;
    }

    .corner-tri {
      fill: var(--hud-color);
    }

    .bottom-dots {
      opacity: 0.6;
    }
  }

  .hud-content {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 25px;
    z-index: 1;

    .hud-header {
      margin-bottom: 20px;
      font-family: Orbitron, sans-serif;
      font-weight: bold;
      .title-line {
        background: var(--hud-color);
        width: 40px; height: 4px;
        margin-bottom: 5px;
      }
    }
  }
}
</style>
