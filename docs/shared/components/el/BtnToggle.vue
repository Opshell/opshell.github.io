<script setup lang="ts">
    // 兩段式開關（OFF / ON），v-model 是布林。要別的字用 labels
    const { labels = ['OFF', 'ON'], disabled = false } = defineProps<{
        labels?: [string, string];
        disabled?: boolean;
    }>();
    const data = defineModel<boolean>({ default: false });
</script>

<template>
    <div class="el-btn-toggle" :class="{ 'is-on': data, 'is-disabled': disabled }" role="group">
        <button type="button" class="el-btn-toggle__option" :class="{ 'is-active': !data }" :disabled :aria-pressed="!data" @click="data = false">
            {{ labels[0] }}
        </button>
        <button type="button" class="el-btn-toggle__option" :class="{ 'is-active': data }" :disabled :aria-pressed="data" @click="data = true">
            {{ labels[1] }}
        </button>
    </div>
</template>

<style lang="scss">
    .el-btn-toggle {
        display: inline-flex;
        background: var(--vp-c-bg-soft);
        padding: 3px;
        border: 1px solid var(--vp-c-divider);
        border-radius: 10px;

        &__option {
            background: transparent;
            min-width: 48px;
            height: 28px;
            padding: 0 12px;
            border: 0;
            border-radius: 7px;
            color: var(--vp-c-text-3);
            font-size: var(--font-size-xs);
            font-weight: 600;
            cursor: pointer;
            transition: .2s var(--cubic-FiSo);

            &:hover { color: var(--vp-c-text-1); }
            &.is-active {
                background: var(--vp-c-bg);
                box-shadow: 0 1px 3px rgb(0 0 0 / 15%);
                color: var(--vp-c-text-1);
            }
            &:focus-visible { outline: 2px solid var(--vp-c-brand-1); }
        }
        &.is-on .el-btn-toggle__option.is-active {
            background: var(--vp-c-brand);
            color: var(--color-gray-000);
        }
        &.is-disabled {
            cursor: not-allowed;
            opacity: .5;

            .el-btn-toggle__option { pointer-events: none; }
        }
    }
</style>
