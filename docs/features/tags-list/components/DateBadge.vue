<script setup lang="ts">
    import { computed } from 'vue';

    // 標籤頁的卡片各自獨立，沒有年、月分組，所以日要配上年月
    const { date = '' } = defineProps<{ date?: string }>();

    const parsed = computed(() => {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return { day: '--', ym: '', full: '' };
        const pad = (n: number) => String(n).padStart(2, '0');
        return {
            day: pad(d.getDate()),
            ym: `${d.getFullYear()}.${pad(d.getMonth() + 1)}`,
            full: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        };
    });
</script>

<template>
    <time class="date-badge" :datetime="parsed.full" :title="parsed.full">
        <span class="day">{{ parsed.day }}</span>
        <span class="ym">{{ parsed.ym }}</span>
    </time>
</template>

<style lang="scss">
    .date-badge {
        @include setFlex(flex-start, flex-end, 2px, column);
        line-height: 1;

        .day {
            color: var(--vp-c-brand);
            font-size: var(--font-size-xl);
            font-weight: bold;
        }
        .ym {
            color: var(--vp-c-text-3);
            font-family: var(--vp-font-family-mono);
            font-size: var(--font-size-xs);
        }
    }
</style>
