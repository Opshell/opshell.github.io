<script setup lang="ts">
    import { computed, ref, watch } from 'vue';

    const props = defineProps<{
        data: Record<string, number>; // { '2023-01-01': 5 }
    }>();

    const emit = defineEmits<{
        (e: 'select-date', date: string | null): void;
    }>();

    // --- 狀態 ---
    const currentYear = ref(new Date().getFullYear());
    const selectedDate = ref<string | null>(null);

    // --- 年份切換邏輯 ---
    const switchYear = (delta: number) => {
        currentYear.value += delta;
        selectedDate.value = null; // 切換年份時清空篩選
        emit('select-date', null);
    };

    // --- 生成熱圖數據 (固定生成當年的 52/53 週) ---
    const heatmapGrid = computed(() => {
        const weeks = [];

        // 設定該年的 1月1日
        const startOfYear = new Date(currentYear.value, 0, 1);
        // 找出該年第一週的起始日 (通常是星期日或星期一，這裡假設週日為始)
        const startDate = new Date(startOfYear);
        startDate.setDate(startOfYear.getDate() - startOfYear.getDay());

        // 生成一整年的格子 (通常 53 週能覆蓋所有年份)
        for (let w = 0; w < 53; w++) {
            const days = [];
            for (let d = 0; d < 7; d++) {
                const current = new Date(startDate);
                current.setDate(startDate.getDate() + (w * 7) + d);

                const dateStr = current.toISOString().split('T')[0];
                const yearOfDate = current.getFullYear();

                // 處理跨年份的顯示：只顯示當前年份的格子，或者顯示灰色
                const isCurrentYear = yearOfDate === currentYear.value;
                const count = props.data[dateStr] || 0;

                days.push({
                    date: dateStr,
                    count,
                    level: count >= 3 ? 3 : count >= 2 ? 2 : count >= 1 ? 1 : 0,
                    isCurrentYear
                });
            }
            weeks.push(days);
        }
        return weeks;
    });

    // --- 互動 ---
    const handleCellClick = (date: string, count: number) => {
        // 如果點擊同一個日期則取消，否則選中
        if (selectedDate.value === date) {
            selectedDate.value = null;
        } else {
            selectedDate.value = date;
        }
        emit('select-date', selectedDate.value);
    };
</script>

<template>
    <div class="heatmap-container">
        <div class="heatmap-header">
            <span class="year-control" @click="switchYear(-1)">❮</span>
            <span class="current-year">{{ currentYear }} Activity</span>
            <span class="year-control" @click="switchYear(1)" :class="{ disabled: currentYear >= new Date().getFullYear() }">❯</span>

            <div class="legend">
                <span>Less</span>
                <div class="cell level-0"></div>
                <div class="cell level-2"></div>
                <div class="cell level-3"></div>
                <span>More</span>
            </div>
        </div>

        <div class="heatmap-scroller">
            <div class="heatmap-grid">
                <div v-for="(week, wIdx) in heatmapGrid" :key="wIdx" class="heatmap-column">
                    <div
                        v-for="(day, dIdx) in week"
                        :key="day.date"
                        class="heatmap-cell"
                        :class="[
                            `level-${day.level}`,
                            { 'is-selected': selectedDate === day.date },
                            { 'not-current-year': !day.isCurrentYear }
                        ]"
                        :title="`${day.date}: ${day.count} posts`"
                        @click="handleCellClick(day.date, day.count)"
                    ></div>
                </div>
            </div>
        </div>

        <div v-if="selectedDate" class="selection-info">
            Filtering: <b>{{ selectedDate }}</b> (Click again to clear)
        </div>
    </div>
</template>

<style lang="scss" scoped>
    .heatmap-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .heatmap-header {
        display: flex;
        gap: 1rem;
        align-items: center;
        color: var(--vp-c-text-2);
        font-size: 0.9rem;

        .year-control {
            padding: 2px 8px;
            cursor: pointer;
            user-select: none;
            &:hover { background: var(--vp-c-bg-soft); border-radius: 4px; color: var(--vp-c-brand); }
            &.disabled { pointer-events: none; opacity: 0.3; }
        }

        .current-year { color: var(--vp-c-text-1); font-weight: 600; }

        .legend {
            display: flex;
            gap: 4px;
            align-items: center;
            margin-left: auto;
            font-size: 0.75rem;

            .cell { width: 10px; height: 10px; border-radius: 2px; }
            .level-0 { background: var(--vp-c-bg-soft); }
            .level-2 { background: color-mix(in srgb, var(--vp-c-brand) 55%, transparent); }
            .level-3 { background: var(--vp-c-brand); }
        }
    }

    .heatmap-scroller {
        padding-bottom: 4px;
        overflow-x: auto;
        &::-webkit-scrollbar { height: 4px; }
        &::-webkit-scrollbar-thumb { background: var(--vp-c-divider); border-radius: 4px; }
    }

    .heatmap-grid {
        display: flex;
        gap: 3px;
        width: max-content;
    }

    .heatmap-column {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .heatmap-cell {
        background: var(--vp-c-bg-soft);
        width: 11px;
        height: 11px;
        border: 1px solid transparent;
        border-radius: 2px;
        cursor: pointer;
        transition: all 0.1s;

        &.not-current-year {
            pointer-events: none;
            opacity: 0.1;
        }

        &:hover {
            border-color: var(--vp-c-text-2);
            transform: scale(1.2);
            z-index: 2;
        }

        // 選中狀態
        &.is-selected {
            border-color: var(--vp-c-text-1);
            box-shadow: 0 0 0 2px var(--vp-c-bg), 0 0 0 3px var(--vp-c-brand);
            z-index: 3;
        }

        &.level-1 { background: color-mix(in srgb, var(--vp-c-brand) 25%, transparent); }
        &.level-2 { background: color-mix(in srgb, var(--vp-c-brand) 55%, transparent); }
        &.level-3 { background: var(--vp-c-brand); }
    }

    .selection-info {
        align-self: flex-start;
        background: var(--vp-c-bg-soft);
        padding: 4px 12px;
        border-radius: 4px;
        color: var(--vp-c-brand);
        font-size: 0.85rem;
    }
</style>