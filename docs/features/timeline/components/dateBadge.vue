<script setup lang="ts">
    const { date = '' } = defineProps<{
        date: string
    }>();

    // 使用 computed 緩存計算結果，效能最佳化
    const splitDate = computed(() => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return { year: '--', month: '--', day: '--' };

        return {
            year: d.getFullYear().toString().slice(-2), // 取後兩位
            month: String(d.getMonth() + 1).padStart(2, '0'),
            day: String(d.getDate()).padStart(2, '0')
        };
    });
</script>

<template>
  <time class="date-badge" :datetime="date">
    <span class="day">{{ splitDate.day }}</span>
    <span class="year">{{ splitDate.year }}</span>
    <span class="month">{{ splitDate.month }}</span>
  </time>
</template>

<style lang="scss">
    .date-badge {
        display: grid;
        grid-template: "day  day" auto
                       "year month" auto /
                        auto auto;
        font-family: var(--vp-font-family-mono);
        line-height: 1;

        .day {
            grid-area: day;
            @include setFlex(center, flex-end);
            color: var(--vp-c-brand);
            font-size: 4rem;
            font-weight: bold;
        }
        .year {
            grid-area: year;
            justify-self: center;
            padding: 0 4px;
            color: var(--vp-c-text-1);
            font-size: 1.5rem;
        }

        .month {
            grid-area: month;
            justify-self: center;
            padding: 0 4px;
            color: var(--vp-c-text-1);
            font-size: 1.5rem;
        }
    }
</style>