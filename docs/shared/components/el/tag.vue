<script setup lang="ts">
    defineProps<{
        tag: string
    }>();
</script>

<template>
    <a class="el-tag" :href="`/tags-list.html?tag=${tag}`">
        #{{tag}}
    </a>
</template>

<style lang="scss">
    .el-tag {
        background-color: color-mix(in srgb, var(--vp-c-brand) 20%, transparent);
        padding: 6px 15px;
        border-radius: 14px;
        color: var(--vp-c-brand-dark);
        font-size: .9rem;
        font-weight: 400;
        line-height: 1;
        transition: .2s var(--op-timing-FiSo);
        &:hover {
            background-color: var(--vp-c-brand);
            color: white;
        }
    }
</style>
