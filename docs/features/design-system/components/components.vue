<script setup lang="ts">
    import {
        SvgHudPanel
    } from '@features/tags-list';
</script>

<template>
    <div>
        <p>Explore our library of atomic components. <del>It hasn't been done yet.</del></p>
        <a href="./components" class="cta-button">View Components Library &rarr;</a>
    </div>

    <SvgHudPanel>123</SvgHudPanel>
    <SvgHudPanel side="right">123</SvgHudPanel>
</template>

<style lang="scss">
    .cta-button {
        display: inline-block;
        background: var(--vp-c-brand-1);
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        margin-top: 1.5rem;
        color: white;
        font-weight: 600;
        text-decoration: none;
        transition: background 0.2s;

        &:hover {
            background: var(--vp-c-brand-2);
        }
    }
</style>