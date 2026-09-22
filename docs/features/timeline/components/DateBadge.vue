<script setup lang="ts">
    import { computed } from 'vue';

    // 時間軸已經按年、月分組，卡片上只剩「日」；完整日期放在 title 給滑鼠停留看
    const { date = '' } = defineProps<{ date?: string }>();

    const parsed = computed(() => {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return { day: '--', full: '' };
        const pad = (n: number) => String(n).padStart(2, '0');
        return { day: pad(d.getDate()), full: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
    });
</script>

<template>
    <time class="date-badge" :datetime="parsed.full" :title="parsed.full">
        <span class="day">{{ parsed.day }}</span>
    </time>
</template>

<style lang="scss">
    .date-badge {
        display: block;
        padding: calc(1rem - 2px) 1rem 0 0;
        line-height: 1;

        .day {
            display: block;
            color: var(--vp-c-brand);
            font-size: var(--op-timeline-font-size, var(--font-size-xl));
            font-weight: bold;
            text-align: right;
        }
    }
</style>
