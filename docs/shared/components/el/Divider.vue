<script setup lang="ts">
    // 分隔線；有 slot 就在中間放一段字
</script>

<template>
    <div class="el-divider" :class="{ 'has-text': $slots.default }" role="separator">
        <span v-if="$slots.default" class="el-divider__text"><slot /></span>
    </div>
</template>

<style lang="scss">
    .el-divider {
        @include setFlex(center, center, 12px);
        width: 100%;
        margin: 1rem 0;

        &::before,
        &::after {
            content: '';
            flex: 1;
            background: var(--vp-c-divider);
            height: 1px;
        }
        &:not(.has-text)::after { display: none; }

        &__text {
            color: var(--vp-c-text-3);
            font-size: var(--font-size-xs);
            white-space: nowrap;
        }
    }
</style>
