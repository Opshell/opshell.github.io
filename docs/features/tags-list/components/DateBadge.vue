<script setup lang="ts">
    import { computed } from 'vue';

    // 標籤頁的條目沒有年、月分組，日期寫完整的年月日
    const { date = '' } = defineProps<{ date?: string }>();

    const parsed = computed(() => {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return { full: '' };
        const pad = (n: number) => String(n).padStart(2, '0');
        return { full: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
    });
</script>

<template>
    <time class="date-badge" :datetime="parsed.full" :title="parsed.full">
{{ parsed.full || '--' }}
    </time>
</template>

<style lang="scss">
    // 標籤頁的日期：完整的年月日一行小字（時間軸那邊也有 .date-badge，所以包在 .tags-page 底下）
    .tags-page .date-badge {
        color: var(--nb-ink-3);
        font-size: var(--nb-step--1);
        line-height: 1.4;
        font-variant-numeric: tabular-nums;
    }
</style>
