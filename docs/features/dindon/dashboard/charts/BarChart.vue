<script setup lang="ts">
    import { computed, ref } from 'vue';

    // 橫條圖：單一系列，或堆疊（部分與整體）。
    // - 兩個以上的系列一定有圖例；數字放在條尾外面（不塞進條內，免得被截掉）
    // - 堆疊的段與段之間留 2px 空隙，不畫邊框
    // - 顏色跟著系列走（series[i].color），不跟著數值排名換
    export interface BarSeries {
        key: string
        label: string
        /** CSS 顏色，建議傳 var(--dd-series-n) */
        color: string
    }
    export interface BarRow {
        label: string
        /** 每個系列的值，key 對應 series[].key */
        values: Record<string, number>
    }

    const { rows, series, format = (v: number) => v.toLocaleString('zh-TW'), unit = '' } = defineProps<{
        rows: BarRow[]
        series: BarSeries[]
        format?: (value: number) => string
        unit?: string
    }>();

    const totals = computed(() => rows.map(row => series.reduce((sum, s) => sum + (row.values[s.key] ?? 0), 0)));
    const max = computed(() => Math.max(Number.MIN_VALUE, ...totals.value));

    // 段長用「佔這一列的比例 × 1000」當 flex-grow。直接用數值的話，像 $0.0109 這種小於 1 的值，
    // flex-grow 加總小於 1，只會分到那麼一點點空間，條就畫不滿
    const share = (rowIndex: number, key: string) => {
        const total = totals.value[rowIndex];
        return total ? ((rows[rowIndex].values[key] ?? 0) / total) * 1000 : 0;
    };

    const active = ref<string | null>(null);
    const activeTip = computed(() => {
        if (!active.value) return null;
        const [rowIndex, key] = active.value.split('|');
        const row = rows[Number(rowIndex)];
        const s = series.find(item => item.key === key);
        if (!row || !s) return null;
        const value = row.values[key] ?? 0;
        const total = totals.value[Number(rowIndex)];
        return { row: row.label, series: s, value, share: total ? value / total : 0 };
    });
</script>

<template>
    <div class="dd-bar">
        <ul v-if="series.length > 1" class="dd-bar__legend" aria-label="圖例">
            <li v-for="s in series" :key="s.key">
                <span class="swatch" :style="{ background: s.color }" aria-hidden="true"></span>{{ s.label }}
            </li>
        </ul>

        <div class="dd-bar__rows" @pointerleave="active = null">
            <div v-for="(row, rowIndex) in rows" :key="row.label" class="dd-bar__row">
                <span class="label">{{ row.label }}</span>
                <div class="track">
                    <div class="fill" :style="{ width: `${(totals[rowIndex] / max) * 100}%` }">
                        <button
                            v-for="s in series.filter(item => (row.values[item.key] ?? 0) > 0)"
                            :key="s.key"
                            type="button"
                            class="seg"
                            :style="{ flexGrow: share(rowIndex, s.key), background: s.color }"
                            :class="{ 'is-active': active === `${rowIndex}|${s.key}` }"
                            :aria-label="`${row.label}，${s.label}：${format(row.values[s.key] ?? 0)}${unit}`"
                            @pointerenter="active = `${rowIndex}|${s.key}`"
                            @focus="active = `${rowIndex}|${s.key}`"
                            @blur="active = null"
                        ></button>
                    </div>
                    <!-- 數字貼在條尾後面；軌道右邊預留了它的位置，條長才能照同一個比例畫 -->
                    <span class="total" :style="{ left: `calc(${(totals[rowIndex] / max) * 100}% + 8px)` }">{{ format(totals[rowIndex]) }}{{ unit }}</span>

                    <span v-if="activeTip && activeTip.row === row.label" class="dd-chart-tip is-bar" role="tooltip">
                        <strong>{{ format(activeTip.value) }}{{ unit }}</strong>
                        <span class="key"><i :style="{ background: activeTip.series.color }"></i>{{ activeTip.series.label }}</span>
                        <span v-if="series.length > 1">佔 {{ (activeTip.share * 100).toFixed(0) }}%</span>
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    .dd-bar {
        &__legend {
            @include setFlex(flex-start, center, 6px 16px);
            flex-wrap: wrap;
            padding: 0;
            margin: 0 0 12px;
            color: var(--dd-chart-ink-2);
            font-size: var(--font-size-xs);
            list-style: none;

            li { @include setFlex(flex-start, center, 6px); }
            .swatch {
                width: 10px;
                height: 10px;
                border-radius: 2px;
            }
        }
        &__rows {
            @include setFlex(flex-start, stretch, 12px, column);
        }
        &__row {
            display: grid;
            grid-template-columns: 5.5em 1fr;
            gap: 10px;
            align-items: center;
            font-size: var(--font-size-s);

            .label {
                color: var(--dd-chart-ink-2);
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }

            // 軌道寬度扣掉條尾數字的位置，條長一律照這個寬度換算，最長的那條也不會被截短
            .track {
                position: relative;
                width: calc(100% - 5.5em);
                min-width: 0;
                height: 20px;
            }
            .fill {
                display: flex;
                gap: 2px; // 堆疊段之間的空隙：底色本身就是分隔，不畫邊框
                min-width: 2px;
                height: 100%;
            }
            .seg {
                flex-basis: 0;
                min-width: 2px;
                height: 100%;
                padding: 0;
                border: 0;
                cursor: default;
                transition: opacity .15s;

                &:last-child { border-radius: 0 4px 4px 0; } // 條尾圓角、起點平的
                &.is-active { opacity: .75; }
                &:focus-visible {
                    outline: 2px solid var(--dd-chart-ink);
                    outline-offset: 1px;
                }
            }
            .total {
                position: absolute;
                top: 50%;
                color: var(--dd-chart-ink);
                font-weight: 600;
                white-space: nowrap;
                transform: translateY(-50%);
                font-variant-numeric: tabular-nums;
            }
        }
    }
</style>
