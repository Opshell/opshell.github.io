<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  data: Record<string, number>;
}>();

// 生成 GitHub 風格的日期矩陣
const heatmapGrid = computed(() => {
  const weeks = [];
  const today = new Date();
  // 找出 52 週前的星期日
  const startDate = new Date();
  startDate.setDate(today.getDate() - (52 * 7) - today.getDay());

  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + (w * 7) + d);
      const dateStr = current.toISOString().split('T')[0];
      const count = props.data[dateStr] || 0;

      days.push({
        date: dateStr,
        count,
        level: count >= 3 ? 3 : count >= 2 ? 2 : count >= 1 ? 1 : 0
      });
    }
    weeks.push(days);
  }
  return weeks;
});
</script>

<template>
  <div class="heatmap-scroller">
    <div class="heatmap-grid">
      <div v-for="(week, wIdx) in heatmapGrid" :key="wIdx" class="heatmap-column">
        <div
          v-for="(day, dIdx) in week"
          :key="dIdx"
          class="heatmap-cell"
          :class="[`level-${day.level}`]"
          :title="`${day.date}: ${day.count} posts`"
        ></div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.heatmap-scroller {
  padding-bottom: 8px;
  overflow-x: auto;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: var(--vp-c-divider); border-radius: 10px; }
}

.heatmap-grid {
  display: flex;
  gap: 3px;
  min-width: max-content;
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
  border-radius: 2px;
  transition: transform 0.1s ease;

  &:hover {
    outline: 1.5px solid var(--vp-c-brand);
    transform: scale(1.4);
    z-index: 10;
  }

  &.level-1 { background: color-mix(in srgb, var(--vp-c-brand) 25%, transparent); }
  &.level-2 { background: color-mix(in srgb, var(--vp-c-brand) 55%, transparent); }
  &.level-3 { background: var(--vp-c-brand); }
}
</style>