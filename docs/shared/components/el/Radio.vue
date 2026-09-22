<script setup lang="ts">
    import { computed } from 'vue';

    // 單選。同一組給同一個 v-model，各自帶 val
    const { val, label = '', disabled = false } = defineProps<{
        val: string | number;
        label?: string;
        disabled?: boolean;
    }>();
    const data = defineModel<string | number>({ default: '' });
    const checked = computed(() => data.value === val);
</script>

<template>
    <label class="el-radio" :class="{ 'is-checked': checked, 'is-disabled': disabled }">
        <input type="radio" class="el-radio__native" :checked :disabled @change="data = val" />
        <span class="el-radio__dot" aria-hidden="true" />
        <span v-if="label || $slots.default" class="el-radio__label"><slot>{{ label }}</slot></span>
    </label>
</template>

<style lang="scss">
    .el-radio {
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
        &__dot {
            position: relative;
            flex-shrink: 0;
            background: var(--vp-c-bg-soft);
            @include setSize(18px, 18px);
            border: 1px solid var(--vp-c-divider);
            border-radius: 50%;
            transition: .15s var(--cubic-FiSo);

            &::after {
                content: '';
                position: absolute;
                inset: 4px;
                background: var(--color-gray-000);
                border-radius: 50%;
                transform: scale(0);
                transition: transform .15s var(--cubic-SiRo);
            }
        }

        &:hover .el-radio__dot { border-color: var(--vp-c-brand); }
        &__native:focus-visible + .el-radio__dot {
            outline: 2px solid var(--vp-c-brand-1);
            outline-offset: 2px;
        }

        &.is-checked .el-radio__dot {
            background: var(--vp-c-brand);
            border-color: var(--vp-c-brand);

            &::after { transform: scale(1); }
        }
        &.is-disabled {
            cursor: not-allowed;
            opacity: .5;
        }
    }
</style>
