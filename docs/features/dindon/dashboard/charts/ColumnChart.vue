<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { niceTicks } from './ticks';

    // 單一系列的直條圖（時間序列）。只有一個顏色，所以不放圖例，標題就說明畫的是什麼。
    // 規格照 dataviz：柱寬最多 24px、頂端 4px 圓角、底部平；格線 1px 實線；標籤用文字色、不用資料色。
    export interface ColumnPoint {
        /** x 軸上的短標籤，例如 9/19 */
        label: string
        /** 提示框與表格用的完整標籤，例如 2026/09/19（五） */
        full: string
        value: number
    }

    const { points, unit = '', height = 180, integer = true, format = (v: number) => v.toLocaleString('zh-TW') } = defineProps<{
        points: ColumnPoint[]
        unit?: string
        height?: number
        /** 計數類（台、次）的刻度只用整數 */
        integer?: boolean
        format?: (value: number) => string
    }>();

    const ticks = computed(() => niceTicks(Math.max(0, ...points.map(p => p.value)), { integer }));
    const top = computed(() => ticks.value[ticks.value.length - 1] || 1);
    // x 軸標籤太密會擠在一起：最多顯示約 8 個。從最後一個（今天）往回每隔幾個顯示一次，
    // 最新的日期一定看得到，間距也固定，不會有兩個標籤黏在一起
    const labelEvery = computed(() => Math.max(1, Math.ceil(points.length / 8)));
    const showLabel = (index: number) => (points.length - 1 - index) % labelEvery.value === 0;

    const active = ref<number | null>(null);
</script>

<template>
    <div class="dd-col" :style="{ '--plot-h': `${height}px` }">
        <div class="dd-col__plot">
            <div v-for="tick in ticks" :key="tick" class="dd-col__grid" :style="{ bottom: `${(tick / top) * 100}%` }">
                <span>{{ format(tick) }}</span>
            </div>

            <div class="dd-col__bars" @pointerleave="active = null">
                <button
                    v-for="(point, index) in points"
                    :key="point.full"
                    type="button"
                    class="dd-col__hit"
                    :class="{ 'is-active': active === index }"
                    :aria-label="`${point.full}：${format(point.value)}${unit}`"
                    @pointerenter="active = index"
                    @focus="active = index"
                    @blur="active = null"
                >
                    <span class="bar" :style="{ height: `${(point.value / top) * 100}%` }"></span>
                    <span v-if="active === index" class="dd-chart-tip" role="tooltip">
                        <strong>{{ format(point.value) }}{{ unit }}</strong>
                        <span>{{ point.full }}</span>
                    </span>
                </button>
            </div>
        </div>

        <div class="dd-col__x" aria-hidden="true">
            <span v-for="(point, index) in points" :key="point.full">
                {{ showLabel(index) ? point.label : '' }}
            </span>
        </div>
    </div>
</template>

<style lang="scss">
    .dd-col {
        padding-left: 40px; // 留給 y 軸刻度

        &__plot {
            position: relative;
            height: var(--plot-h);
            border-bottom: 1px solid var(--dd-chart-axis);
        }
        &__grid {
            position: absolute;
            right: 0;
            left: 0;
            border-top: 1px solid var(--dd-chart-grid);

            span {
                position: absolute;
                top: -.7em;
                left: -40px;
                width: 34px;
                color: var(--dd-chart-muted);
                font-size: var(--font-size-xs);
                font-variant-numeric: tabular-nums;
                text-align: right;
            }
        }
        &__bars {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: stretch;
        }

        // 整個欄位都是滑鼠的目標，不只畫出來的那一小條
        &__hit {
            position: relative;
            display: flex;
            flex: 1;
            align-items: flex-end;
            justify-content: center;
            background: transparent;
            padding: 0 1px;
            border: 0;
            cursor: default;

            .bar {
                display: block;
                background: var(--dd-series-1);
                width: 100%;
                max-width: 24px;
                min-height: 0;
                border-radius: 4px 4px 0 0;
                transition: opacity .15s;
            }
            &.is-active .bar { opacity: .75; }
            &:focus-visible {
                outline: 2px solid var(--dd-series-1);
                outline-offset: 1px;
            }
        }
        &__x {
            display: flex;
            margin-top: 6px;
            color: var(--dd-chart-muted);
            font-size: var(--font-size-xs);

            span {
                flex: 1;
                white-space: nowrap;
                text-align: center;
                overflow: visible;
            }
        }
    }
</style>
