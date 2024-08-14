<template>
    <div class="icon" :class="{ btn: href !== '' }">
        <svg class="svg">
            <use :xlink:href="`#${name}`" />
        </svg>
    </div>
</template>

<script setup lang="ts">
    // import { Router } from 'vue-router';

    // 用於存放元件的 props
    defineProps({
        name: { type: String, required: true, default: 'circle' },
        href: { type: String, default: '' },
    });

    // let router: Router | null = null;
    // if(props.href !== ''){
    //     router = useRouter(); // 操作路由
    // }

    // 跳轉
    // const jump = () => {
    //     if (props.href !== '' && router) {
    //         router.push(props.href);
    //     }
    // };
</script>

<style lang="scss">
    .icon {
        --color-cube-background: var(--color-view-block);

        position: relative;
        @include setFlex();
        @include setSize(33px, 33px);
        padding: 2px;
        fill: #bbb;
        transition: 0.2s $cubic-FiSo;
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
