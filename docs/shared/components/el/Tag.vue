<script setup lang="ts">
    defineProps<{
        tag: string;
    }>();
</script>

<template>
    <a class="el-tag" :href="`/tags-list.html?tag=${tag}`">
        <span class="hash">#</span>
        <span>{{ tag }}</span>
        <slot />
    </a>
</template>

<style lang="scss">
    // 筆記本裡的標籤：就是一個寫在頁邊的 #詞，不是膠囊（2026-10 翻新）
    .el-tag {
        @include setFlex(flex-start, baseline, .1em);
        color: var(--nb-ink-2, var(--vp-c-text-2));
        font-family: var(--nb-font-sans, inherit);
        font-size: var(--nb-step--1, .875rem);
        font-weight: 500;
        line-height: 1.4;
        white-space: nowrap;
        text-decoration: none;

        .hash { color: var(--nb-pencil, var(--vp-c-text-3)); }
        &:hover {
            color: var(--nb-link, var(--vp-c-brand-1));
            text-decoration: underline;
            text-underline-offset: .25em;
        }
        &:focus-visible {
            outline: 2px solid var(--nb-link, var(--vp-c-brand-1));
            outline-offset: 2px;
        }
    }
</style>
