<script setup lang="ts">
    import type { RouteLocationRaw } from 'vue-router';

    interface iProps {
        title?: string
        icon?: string
        href?: RouteLocationRaw
    }
    withDefaults(defineProps<iProps>(), {
        title: '',
        icon: '',
        href: ''
    });
</script>

<template>
    <router-link v-if="href !== ''" :to="href" class="el-btn" role="button">
        <slot v-if="$slots.icon" name="icon" />
        <span v-if="$slots.default" class="text">
            <slot />
        </span>
    </router-link>

    <div v-else class="el-btn" role="button">
        <slot v-if="$slots.icon" name="icon" />
        <span v-if="$slots.default" class="text">
            <slot />
        </span>
    </div>
</template>

<style lang="scss">
    .el-btn {
        --color-gray-200: #F5F5F5;
        position: relative;
        @include setFlex ();
        gap: 3px;
        background: var(--color-gray-200);
        @include setSize(auto, 40px);
        padding: 10px 20px;
        border: 1px solid var(--color-gray-200);
        border-radius: 5px;
        color: var(--color-gray-900);
        cursor: pointer;
        transition: 0.2s $cubic-FiSo;
        overflow: hidden;
        .text {
            font-size: 1rem;
            white-space: nowrap;
            transform: translateY(1px);
            user-select: none;
        }
        .icon {
            flex-shrink: 0;
            margin-left: -8px;
            fill: var(--color-gray-900);
            transform: translateY(-1px);
        }

        &.hight {
            background: var(--color-primary-1);
            border-color: var(--color-primary-1);
            color: var(--color-gray-000);
            .icon { fill: var(--color-gray-000);}
        }
        &.sub{
            background: var(--color-gray-000);
            border-color: var(--color-primary-1);
            color: var(--color-primary-1);
            .icon { fill: var(--color-primary-1);}
        }
        &.add {
            background: var(--color-gray-050);
            border: 1px dashed var(--color-gray-200);
            color: var(--color-gray-700);
            .icon { fill: var(--color-gray-700);}
        }
        &.danger {
            background: var(--color-error);
            border-color: var(--color-error);
            color: var(--color-gray-000);
            .icon { fill: var(--color-gray-000);}
        }
        &.white {
            background: var(--color-gray-000);
            border-color: var(--color-gray-000);
            color: var(--color-gray-900);
            .icon { fill: var(--color-gray-900);}
        }

        &.border{
            border: 1px solid var(--color-primary-1);
            box-shadow: 0 0 0 2px var(--color-brand);
        }
        &.bg-inherit{
            background-color: inherit;
        }

        &:hover {
            background: var(--color-primary-light);
            border-color: var(--color-primary-light);
            color: var(--color-gray-000);
            .icon { fill: var(--color-gray-000);}
        }
        &:active {
            background: var(--color-primary-3);
            border-color: var(--color-primary-3);
            color: var(--color-gray-000);
            .icon { fill: var(--color-gray-000);}
            transition-duration: .03s;
        }
        &.current { // 當前頁面
            background: var(--color-primary-dilute);
            border-color: var(--color-primary-3);
            color: var(--color-primary-3);
            .icon { fill: var(--color-primary-3);}
        }
        &.disable {
            background: var(--color-gray-050);
            border-color: var(--color-gray-200);
            color: var(--color-gray-300);
            .icon { fill: var(--color-gray-300);}
            cursor: not-allowed;
            &:hover {
                background: var(--color-gray-050);
                border-color: var(--color-gray-200);
                color: var(--color-gray-300);
                .icon { fill: var(--color-gray-300);}
            }
        }
        &.small-text .text{
            font-size: 0.875rem;
        }
    }
</style>
