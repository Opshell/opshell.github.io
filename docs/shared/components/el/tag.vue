<script setup lang="ts">
    defineProps<{
        tag: string
    }>();
</script>

<template>
    <a class="el-tag" :href="`/tags-list.html?tag=${tag}`">
        <span class="hash">#</span>
        <span>{{tag}}</span>
        <slot></slot>
    </a>
</template>

<style lang="scss">
    .el-tag {
        @include setFlex();
        gap: .25rem;
        background-color: color-mix(in srgb, var(--vp-c-brand) 20%, transparent);
        padding: 6px 14px;
        border-radius: 14px;
        color: var(--vp-c-brand-dark);
        font-size: .9rem;
        font-weight: 400;
        line-height: 1;
        transition: .2s var(--cubic-FiSo);

        .hash {
            color: var(--vp-c-brand-1);
            transition: .2s var(--cubic-FiSo);
        }
        &:hover {
            .hash {
                color: var(--color-gray-000);
            }
            background-color: var(--vp-c-brand);
            color: var(--color-gray-000);
        }
    }
</style>
