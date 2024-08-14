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
        --color-btn-background: #F5F5F5;
        position: relative;
        @include setFlex;
        gap: 3px;
        background: var(--color-btn-background);
        @include setSize(auto, 40px);
        padding: 10px 20px;
        border: 1px solid var(--color-border-box);
        border-radius: 5px;
        color: var(--color-extreme);
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
            fill: var(--color-extreme);
            transform: translateY(-1px);
        }

        &.hight {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: var(--color-extreme-reverse);
            .icon { fill: var(--color-extreme-reverse);}
        }
        &.sub{
            background: var(--color-extreme-reverse);
            border-color: var(--color-primary);
            color: var(--color-primary);
            .icon { fill: var(--color-primary);}
        }
        &.add {
            background: var(--color-view-block);
            border: 1px dashed var(--color-border-box);
            color: var(--color-text);
            .icon { fill: var(--color-text);}
        }
        &.danger {
            background: var(--color-error);
            border-color: var(--color-error);
            color: var(--color-extreme-reverse);
            .icon { fill: var(--color-extreme-reverse);}
        }
        &.white {
            background: var(--color-extreme-reverse);
            border-color: var(--color-extreme-reverse);
            color: var(--color-extreme);
            .icon { fill: var(--color-extreme);}
        }

        &.border{
            border: 1px solid var(--color-primary);
            box-shadow: 0 0 0 2px var(--color-hover-light);
        }
        &.bg-inherit{
            background-color: inherit;
        }

        &:hover {
            background: var(--color-primary-light);
            border-color: var(--color-primary-light);
            color: var(--color-extreme-reverse);
            .icon { fill: var(--color-extreme-reverse);}
        }
        &:active {
            background: var(--color-primary-dark);
            border-color: var(--color-primary-dark);
            color: var(--color-extreme-reverse);
            .icon { fill: var(--color-extreme-reverse);}
            transition-duration: .03s;
        }
        &.current { // 當前頁面
            background: var(--color-primary-dilute);
            border-color: var(--color-primary-dark);
            color: var(--color-primary-dark);
            .icon { fill: var(--color-primary-dark);}
        }
        &.disable {
            background: var(--color-view-block);
            border-color: var(--color-border-box);
            color: var(--color-text-light);
            .icon { fill: var(--color-text-light);}
            cursor: not-allowed;
            &:hover {
                background: var(--color-view-block);
                border-color: var(--color-border-box);
                color: var(--color-text-light);
                .icon { fill: var(--color-text-light);}
            }
        }
        &.small-text .text{
            font-size: 0.875rem;
        }
    }
</style>
