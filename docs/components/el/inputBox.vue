<script setup lang="ts">
    withDefaults(defineProps<{
        fieldName?: string,
        type?: 'row' | 'column',
        remark?: string,
    }>(), {
        fieldName: '',
        type: 'column'
    });
</script>

<template>
    <label class="input-box" :class="{ row: type === 'row' }">
        <span class="text">{{ fieldName }}</span>
        <div class="slot-box">
            <slot></slot>
        </div>
        <span v-if="remark != ''" class="remark">{{ remark }}</span>
    </label>
</template>

<style lang="scss">
    .input-box {
        position: relative;
        @include setFlex(space-between, flex-start, 5px, column);
        > .text {
            flex-shrink: 0;
            color: var(--color-text);
            font-weight: 300;
            font-size: .875rem;
            line-height: 1.188rem;
        }
        .slot-box {
            @include setFlex(flex-start, center, 5px);
            width: 100%;
        }

        &.row {
            flex-direction: row;
            align-items: center;
            flex-wrap: nowrap;
            gap: 10px;
            > .text {
                flex-shrink: 0;
                color: var(--color-text);
                font-weight: 300;
                font-size: 2rem;
                line-height: 1;
            }
        }

        &.normal-label .text{
            font-size: 1rem;
            font-weight: 400;
        }
    }
</style>