<script setup lang="ts">
    import { computed } from 'vue';

    // 核取方塊。v-model 是布林就單顆開關；是陣列就用 val 決定有沒有在陣列裡（文章裡有這種用法）
    const { val, label = '', disabled = false } = defineProps<{
        val?: string | number;
        label?: string;
        disabled?: boolean;
    }>();
    const data = defineModel<boolean | (string | number)[]>({ default: false });

    const checked = computed(() => (Array.isArray(data.value) ? data.value.includes(val as string | number) : !!data.value));

    function toggle() {
        if (disabled) return;
        if (Array.isArray(data.value)) {
            data.value = checked.value ? data.value.filter(v => v !== val) : [...data.value, val as string | number];
        } else {
            data.value = !data.value;
        }
    }
</script>

<template>
    <label class="el-checkbox" :class="{ 'is-checked': checked, 'is-disabled': disabled }">
        <input type="checkbox" class="el-checkbox__native" :checked :disabled @change="toggle" />
        <span class="el-checkbox__box" aria-hidden="true">
            <svg viewBox="0 0 16 16" class="el-checkbox__mark"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </span>
        <span v-if="label || $slots.default" class="el-checkbox__label"><slot>{{ label }}</slot></span>
    </label>
</template>

<style lang="scss">
    .el-checkbox {
        @include setFlex(flex-start, center, 8px);
        display: inline-flex;
        color: var(--vp-c-text-1);
        font-size: var(--font-size-s);
        cursor: pointer;
        user-select: none;

        &__native {
            position: absolute;
            @include setSize(1px, 1px);
            clip-path: inset(50%);
            opacity: 0;
        }
        &__box {
            flex-shrink: 0;
            @include setFlex();
            background: var(--vp-c-bg-soft);
            @include setSize(18px, 18px);
            border: 1px solid var(--vp-c-divider);
            border-radius: 5px;
            color: var(--color-gray-000);
            transition: .15s var(--cubic-FiSo);
        }
        &__mark {
            @include setSize(12px, 12px);
            transform: scale(0);
            transition: transform .15s var(--cubic-SiRo);
        }

        &:hover .el-checkbox__box { border-color: var(--vp-c-brand); }
        &__native:focus-visible + .el-checkbox__box {
            outline: 2px solid var(--vp-c-brand-1);
            outline-offset: 2px;
        }

        &.is-checked .el-checkbox__box {
            background: var(--vp-c-brand);
            border-color: var(--vp-c-brand);
        }
        &.is-checked .el-checkbox__mark { transform: scale(1); }

        &.is-disabled {
            cursor: not-allowed;
            opacity: .5;
        }
    }
</style>
