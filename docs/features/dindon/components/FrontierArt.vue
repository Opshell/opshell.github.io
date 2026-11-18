<script setup lang="ts">
    import type { FrontierStep } from '../constants';

    // 西部拓荒季的三個小圖：警長星、套索、仙人掌（#756：意象不用槍）。
    // 平面單色，顏色吃外層的 color，深淺色模式跟著段落的變數走
    defineProps<{ art: FrontierStep['art']; size?: number }>();
</script>

<template>
    <svg class="frontier-art" :width="size ?? 32" :height="size ?? 32" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <template v-if="art === 'star'">
            <!-- 六角警長星，角尖是圓球：座標是 r=21／11、每 30 度一點算出來的 -->
            <polygon points="24,3 29.5,14.5 42.2,13.5 35,24 42.2,34.5 29.5,33.5 24,45 18.5,33.5 5.8,34.5 13,24 5.8,13.5 18.5,14.5" fill="currentColor" />
            <circle cx="24" cy="3.5" r="3" fill="currentColor" />
            <circle cx="41.8" cy="13.8" r="3" fill="currentColor" />
            <circle cx="41.8" cy="34.2" r="3" fill="currentColor" />
            <circle cx="24" cy="44.5" r="3" fill="currentColor" />
            <circle cx="6.2" cy="34.2" r="3" fill="currentColor" />
            <circle cx="6.2" cy="13.8" r="3" fill="currentColor" />
        </template>
        <template v-else-if="art === 'lasso'">
            <!-- 套索：一個圈加一段繩尾，繩子本身就是線，用粗的圓頭線條 -->
            <ellipse cx="22" cy="17" rx="16" ry="10" fill="none" stroke="currentColor" stroke-width="4.5" />
            <path d="M14 25.5 C 12 32, 20 34, 18 40 S 24 46, 30 44" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" />
        </template>
        <template v-else>
            <!-- 仙人掌：主幹加兩隻手臂，全是圓角色塊 -->
            <rect x="19" y="4" width="10" height="40" rx="5" fill="currentColor" />
            <rect x="7" y="14" width="8" height="16" rx="4" fill="currentColor" />
            <rect x="7" y="24" width="16" height="7" rx="3.5" fill="currentColor" />
            <rect x="33" y="10" width="8" height="14" rx="4" fill="currentColor" />
            <rect x="25" y="18" width="16" height="7" rx="3.5" fill="currentColor" />
            <rect x="12" y="42" width="24" height="4" rx="2" fill="currentColor" />
        </template>
    </svg>
</template>
