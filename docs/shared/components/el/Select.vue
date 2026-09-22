<script setup lang="ts">
    // 原生 <select> 加上跟 ElInput 一樣的外殼；箭頭用 CSS 畫，不依賴瀏覽器預設樣式
    interface iOption {
        label: string;
        value: string | number;
        disabled?: boolean;
    }
    const { options, placeholder = '', disabled = false } = defineProps<{
        options: iOption[];
        placeholder?: string;
        disabled?: boolean;
    }>();
    const data = defineModel<string | number>({ default: '' });
</script>

<template>
    <label class="el-select" :class="{ 'is-disabled': disabled }">
        <select v-model="data" class="el-select__native" :disabled>
            <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
            <option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">
                {{ option.label }}
            </option>
        </select>
        <span class="el-select__arrow" aria-hidden="true" />
    </label>
</template>

<style lang="scss">
    .el-select {
        position: relative;
        display: block;
        background: var(--vp-c-bg-soft);
        width: 100%;
        height: 40px;
        border: 1px solid var(--vp-c-divider);
        border-radius: 10px;
        transition: border-color .2s var(--cubic-FiSo);

        &:hover { border-color: color-mix(in srgb, var(--vp-c-brand) 50%, var(--vp-c-divider)); }
        &:focus-within { border-color: var(--vp-c-brand); }

        &__native {
            background: transparent;
            padding: 0 36px 0 12px;
            border: 0;
            outline: none;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
            cursor: pointer;
            appearance: none;
            @include setSize(100%, 100%);

            &:invalid { color: var(--vp-c-text-3); }
            option { background: var(--vp-c-bg); }
        }
        &__arrow {
            position: absolute;
            top: 50%;
            right: 14px;
            border-right: 2px solid var(--vp-c-text-3);
            border-bottom: 2px solid var(--vp-c-text-3);
            pointer-events: none;
            transform: translateY(-70%) rotate(45deg);
            @include setSize(8px, 8px);
        }

        &.is-disabled {
            cursor: not-allowed;
            opacity: .5;
        }
    }
</style>
