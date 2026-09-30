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
    // 時間軸的「日」：像書的頁碼，等寬數字、鉛筆色。
    // 標籤頁也有一個 DateBadge、同樣叫 .date-badge：各自包在頁面的 class 底下，不然全域的樣式會互相蓋
    .timeline-page .date-badge {
        display: block;
        padding-top: .2em;
        line-height: 1;

        .day {
            display: block;
            color: var(--nb-ink-3);
            font-family: var(--nb-font-serif);
            font-size: var(--nb-step-2);
            font-weight: 600;
            text-align: right;
            font-variant-numeric: tabular-nums;
        }
    }
</style>
