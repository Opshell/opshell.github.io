<script setup lang="ts">
    import type { BarSeries } from './BarChart.vue';
    import { computed, ref } from 'vue';
    import { niceTicks } from './ticks';

    // 直條圖（時間序列）。一個系列就是單色、不放圖例；多個系列就堆疊起來，一定有圖例。
    // 規格照 dataviz：柱寬最多 24px、頂端 4px 圓角、底部平；格線 1px 實線；段與段之間留 2px 空隙；
    // 標籤用文字色、不用資料色；提示框一次列出那一天的每個系列。
    export interface ColumnPoint {
        /** x 軸上的短標籤，例如 9/19 */
        label: string;
        /** 提示框與表格用的完整標籤，例如 2026/09/19（六） */
        full: string;
        /** 每個系列的值，key 對應 series[].key */
        values: Record<string, number>;
    }

    const { points, series, unit = '', height = 180, integer = true, format = (v: number) => v.toLocaleString('zh-TW') } = defineProps<{
        points: ColumnPoint[];
        series: BarSeries[];
        unit?: string;
        height?: number;
        /** 計數類（台、次）的刻度只用整數 */
        integer?: boolean;
        format?: (value: number) => string;
    }>();

    const totals = computed(() => points.map(p => series.reduce((sum, s) => sum + (p.values[s.key] ?? 0), 0)));
    const ticks = computed(() => niceTicks(Math.max(0, ...totals.value), { integer }));
    const top = computed(() => ticks.value[ticks.value.length - 1] || 1);

    // x 軸標籤太密會擠在一起：最多顯示約 8 個。從最後一個（今天）往回每隔幾個顯示一次，
    // 最新的日期一定看得到，間距也固定，不會有兩個標籤黏在一起
    const labelEvery = computed(() => Math.max(1, Math.ceil(points.length / 8)));
    const showLabel = (index: number) => (points.length - 1 - index) % labelEvery.value === 0;

    const active = ref<number | null>(null);
</script>

<template>
    <div class="dd-col" :style="{ '--plot-h': `${height}px` }">
        <ul v-if="series.length > 1" class="dd-bar__legend" aria-label="圖例">
            <li v-for="s in series" :key="s.key">
                <span class="swatch" :style="{ background: s.color }" aria-hidden="true" />{{ s.label }}
            </li>
        </ul>

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
                    :aria-label="`${point.full}：${series.map(s => `${s.label} ${format(point.values[s.key] ?? 0)}${unit}`).join('、')}`"
                    @pointerenter="active = index"
                    @focus="active = index"
                    @blur="active = null"
                >
                    <span class="stack" :style="{ height: `${(totals[index] / top) * 100}%` }">
                        <span
                            v-for="s in series.filter(item => (point.values[item.key] ?? 0) > 0)"
                            :key="s.key"
                            class="seg"
                            :style="{ flexGrow: (point.values[s.key] ?? 0) / (totals[index] || 1) * 1000, background: s.color }"
                        />
                    </span>

                    <span v-if="active === index" class="dd-chart-tip" role="tooltip">
                        <span class="when">{{ point.full }}</span>
                        <span v-for="s in series" :key="s.key" class="row">
                            <strong>{{ format(point.values[s.key] ?? 0) }}{{ unit }}</strong>
                            <span class="key"><i :style="{ background: s.color }" />{{ s.label }}</span>
                        </span>
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

            .stack {
                display: flex;
                flex-direction: column-reverse;
                gap: 2px; // 段與段之間的空隙：底色本身就是分隔，不畫邊框
                width: 100%;
                max-width: 24px;
                min-height: 0;
                border-radius: 4px 4px 0 0;
                transition: opacity .15s;
                overflow: hidden;
            }
            .seg {
                flex-basis: 0;
                min-height: 2px;
            }
            &.is-active .stack { opacity: .75; }
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
