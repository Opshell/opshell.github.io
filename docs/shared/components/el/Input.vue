<script setup lang="ts">
    // 文字輸入。外殼跟標籤頁的搜尋框同一套；其他 attribute（placeholder、type、maxlength…）直接落到 <input> 上。
    defineOptions({ inheritAttrs: false });
    const { disabled = false } = defineProps<{ disabled?: boolean }>();
    const data = defineModel<string | number>({ default: '' });
</script>

<template>
    <label class="el-input" :class="{ 'is-disabled': disabled }">
        <span v-if="$slots.icon" class="el-input__icon"><slot name="icon" /></span>
        <input v-model="data" class="el-input__native" :disabled v-bind="$attrs" />
        <span v-if="$slots.suffix" class="el-input__suffix"><slot name="suffix" /></span>
    </label>
</template>

<style lang="scss">
    .el-input {
        @include setFlex(flex-start, center, 8px);
        background: var(--vp-c-bg-soft);
        width: 100%;
        height: 40px;
        padding: 0 12px;
        border: 1px solid var(--vp-c-divider);
        border-radius: 10px;
        transition: border-color .2s var(--cubic-FiSo);

        &:hover { border-color: color-mix(in srgb, var(--vp-c-brand) 50%, var(--vp-c-divider)); }
        &:focus-within { border-color: var(--vp-c-brand); }

        &__icon,
        &__suffix {
            flex-shrink: 0;
            @include setFlex();
            color: var(--vp-c-text-3);
            fill: var(--vp-c-text-3);

            .icon { @include setSize(16px, 16px); padding: 0; }
        }
        &__native {
            background: transparent;
            width: 100%;
            min-width: 0;
            padding: 0;
            border: 0;
            outline: none;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);

            &::placeholder { color: var(--vp-c-text-3); }
        }

        &.is-disabled {
            cursor: not-allowed;
            opacity: .5;

            .el-input__native { cursor: not-allowed; }
        }
    }
</style>
