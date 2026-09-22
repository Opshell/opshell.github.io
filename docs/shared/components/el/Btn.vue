<script setup lang="ts">
    // 按鈕。有 href 就是 <a>，沒有就是 <button>。
    // 四種樣式：ghost（預設，跟標籤頁的分頁鈕、相簿的返回鈕同一套）、primary（品牌色）、text（只有字）、danger。
    interface iProps {
        variant?: 'ghost' | 'primary' | 'text' | 'danger';
        size?: 'sm' | 'md';
        href?: string;
        target?: string;
        disabled?: boolean;
        type?: 'button' | 'submit';
    }
    const { variant = 'ghost', size = 'md', href = '', target, disabled = false, type = 'button' } = defineProps<iProps>();
</script>

<template>
    <component
        :is="href ? 'a' : 'button'"
        class="el-btn"
        :class="[`el-btn--${variant}`, `el-btn--${size}`, { 'is-disabled': disabled }]"
        :href="href || undefined"
        :target="href ? target : undefined"
        :rel="href && target === '_blank' ? 'noopener' : undefined"
        :type="href ? undefined : type"
        :disabled="href ? undefined : disabled"
        :aria-disabled="disabled || undefined"
    >
        <span v-if="$slots.icon" class="el-btn__icon"><slot name="icon" /></span>
        <span v-if="$slots.default" class="el-btn__text"><slot /></span>
    </component>
</template>

<style lang="scss">
    .el-btn {
        @include setFlex(center, center, 6px);
        display: inline-flex;
        background: var(--vp-c-bg-soft);
        height: 36px;
        padding: 0 14px;
        border: 1px solid var(--vp-c-divider);
        border-radius: 10px;
        color: var(--vp-c-text-2);
        font-size: var(--font-size-s);
        font-weight: 500;
        line-height: 1;
        white-space: nowrap;
        text-decoration: none;
        cursor: pointer;
        transition: .2s var(--cubic-FiSo);

        &__icon {
            @include setFlex();
            @include setSize(16px, 16px);
            fill: currentColor;

            .icon { @include setSize(16px, 16px); padding: 0; }
        }

        &:hover {
            border-color: var(--vp-c-brand);
            color: var(--vp-c-brand);
        }
        &:active { transition-duration: .05s; }
        &:focus-visible {
            outline: 2px solid var(--vp-c-brand-1);
            outline-offset: 2px;
        }

        &--primary {
            background: var(--vp-c-brand);
            border-color: var(--vp-c-brand);
            color: var(--color-gray-000);

            &:hover {
                background: var(--vp-c-brand-2);
                border-color: var(--vp-c-brand-2);
                color: var(--color-gray-000);
            }
        }
        &--text {
            background: transparent;
            border-color: transparent;

            &:hover {
                background: var(--vp-c-bg-soft);
                border-color: transparent;
            }
        }
        &--danger {
            background: transparent;
            border-color: var(--color-error);
            color: var(--color-error);

            &:hover {
                background: var(--color-error);
                border-color: var(--color-error);
                color: var(--color-gray-000);
            }
        }

        &--sm {
            height: 30px;
            padding: 0 10px;
            border-radius: 8px;
            font-size: var(--font-size-xs);
        }

        &.is-disabled,
        &:disabled {
            pointer-events: none;
            cursor: not-allowed;
            opacity: .4;
        }
    }
</style>
