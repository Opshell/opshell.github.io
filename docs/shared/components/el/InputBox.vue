<script setup lang="ts">
    // 欄位外框：標籤 + 輸入元件 + 備註。column 是標籤在上，row 是標籤在左
    const { fieldName = '', type = 'column', remark = '' } = defineProps<{
        fieldName?: string;
        type?: 'row' | 'column';
        remark?: string;
    }>();
</script>

<template>
    <label class="el-input-box" :class="{ 'is-row': type === 'row' }">
        <span v-if="fieldName" class="el-input-box__label">{{ fieldName }}</span>
        <div class="el-input-box__slot"><slot /></div>
        <span v-if="remark" class="el-input-box__remark">{{ remark }}</span>
    </label>
</template>

<style lang="scss">
    .el-input-box {
        @include setFlex(flex-start, stretch, 6px, column);
        width: 100%;

        &__label {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            font-weight: 500;
        }
        &__slot { @include setFlex(flex-start, center, 8px); }
        &__remark {
            color: var(--vp-c-text-3);
            font-size: var(--font-size-xs);
        }

        &.is-row {
            flex-flow: row wrap;
            gap: 12px;
            align-items: center;

            .el-input-box__label { flex-shrink: 0; }
            .el-input-box__slot { flex: 1; }
            .el-input-box__remark { flex-basis: 100%; }
        }
    }
</style>
