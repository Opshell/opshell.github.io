<script setup lang="ts">
    interface iProps {
        name: string
        href?: string
    }
    const { name = 'circle', href = '' } = defineProps<iProps>();

    // 跳轉
    function jump() {
        if (href === '') { return; }

        window.open(href, '_self');
    }
</script>

<template>
    <div class="icon" :class="{ btn: href !== '' }" @click="jump">
        <svg class="svg">
            <use :xlink:href="`#${name}`" />
        </svg>

        <slot />
    </div>
</template>

<style lang="scss">
    .icon {
        --color-cube-background: var(--color-view-block);
        position: relative;
        @include setFlex();
        @include setSize(33px, 33px);
        padding: 2px;
        fill: currentColor;
        transition: 0.2s var(--op-cubic-FiSo);
        .svg {
            @include setFlex();
            @include setSize(100%, 100%);
        }

        &.btn {
            cursor: pointer;

            &:hover,
            &.current {
                fill: var(--color-primary);
            }
        }

        &.cube {
            background: var(--color-view-block);
            @include setSize(45px, 45px);
            padding: 8px;
            border: 1px solid var(--color-border-box);
            border-radius: 5px;
            fill: var(--color-text);

            // fill: #b4bdce;
            cursor: pointer;

            &:hover {
                background: var(--color-primary-light);
                border: 1px solid var(--color-primary-light);
                fill: var(--color-extreme-reverse);
            }
        }
    }
</style>
