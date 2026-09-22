<script setup lang="ts">
    // 卡片：設計系統裡所有「一塊」的基礎（標籤介紹卡、Activity 卡、相簿卡都是這個長相）
    const { hoverable = false, padding = 'md' } = defineProps<{
        /** 滑過去邊框變品牌色、微微浮起（可點的卡才開） */
        hoverable?: boolean;
        padding?: 'none' | 'sm' | 'md' | 'lg';
    }>();
</script>

<template>
    <div class="el-card" :class="[`el-card--${padding}`, { 'is-hoverable': hoverable }]">
        <header v-if="$slots.header" class="el-card__header"><slot name="header" /></header>
        <div class="el-card__body"><slot /></div>
        <footer v-if="$slots.footer" class="el-card__footer"><slot name="footer" /></footer>
    </div>
</template>

<style lang="scss">
    .el-card {
        --el-card-padding: 1.25rem;
        background: var(--vp-c-bg-soft);
        border: 1px solid var(--vp-c-divider);
        border-radius: 1rem;
        transition: .2s var(--cubic-FiSo);
        overflow: hidden;

        &--none { --el-card-padding: 0; }
        &--sm { --el-card-padding: .75rem; }
        &--lg { --el-card-padding: 2rem; }

        &__header,
        &__footer {
            padding: calc(var(--el-card-padding) * .75) var(--el-card-padding);
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
        &__header {
            border-bottom: 1px solid var(--vp-c-divider);
            font-weight: 600;
        }
        &__footer { border-top: 1px solid var(--vp-c-divider); }
        &__body { padding: var(--el-card-padding); }

        &.is-hoverable {
            cursor: pointer;

            &:hover {
                border-color: var(--vp-c-brand);
                box-shadow: var(--card-shadow);
                transform: translateY(-3px);
            }
        }
    }
</style>
