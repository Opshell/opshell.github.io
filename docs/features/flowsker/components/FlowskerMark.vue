<script setup lang="ts">
    // Flowsker 的標誌：一圈刻度裡一堆沙（產品的沙漏主題：心流時時光沙落下堆成沙丘）。
    // 顏色跟著 currentColor（圈）與 --fk-flow（沙）走；首頁大卡用的是同一張畫成檔案的 /images/flowsker/icon.svg
    interface Props {
        size?: number;
        /** 沙堆的高度 0～1，介紹頁的互動示範會改它 */
        level?: number;
    }
    withDefaults(defineProps<Props>(), { size: 40, level: 0.55 });
</script>

<template>
    <svg class="fk-mark" :width="size" :height="size" viewBox="0 0 64 64" aria-hidden="true" :style="{ '--level': level }">
        <circle class="fk-mark__ring" cx="32" cy="32" r="27" />
        <circle class="fk-mark__orbit" cx="32" cy="32" r="27" />
        <g class="fk-mark__sand">
            <polygon points="32,24 16,52 48,52" />
        </g>
        <circle class="fk-mark__grain" cx="32" cy="12" r="1.6" />
    </svg>
</template>

<style lang="scss">
    .fk-mark {
        display: block;
        overflow: visible;

        &__ring {
            fill: none;
            stroke: currentColor;
            stroke-width: 1.5;
            opacity: .35;
        }
        &__orbit {
            fill: none;
            stroke: var(--fk-flow, #2E6BFF);
            stroke-dasharray: 1.5 7;
            stroke-width: 2;
            opacity: .7;
        }
        &__sand {
            fill: var(--fk-flow, #2E6BFF);
            transform: scale(var(--level, .55));
            transform-origin: 32px 52px;
            transition: transform .45s var(--cubic-SiRo, ease-out);
        }
        &__grain {
            fill: var(--fk-flow, #2E6BFF);
            opacity: .8;
        }
    }
</style>
