<script setup lang="ts">
    // 三個版本並排比較：最新版 → 第二版（svgHudPanel_back2）→ 第一版（svgHudPanel_back）
    import {
        SvgHudPanel,
        SvgHudPanelBackup,
        SvgHudPanelBackup2
    } from '@features/tags-list';
</script>

<template>
    <div>
        <p>Explore our library of atomic components. <del>It hasn't been done yet.</del></p>
        <a href="./components" class="cta-button">View Components Library &rarr;</a>
    </div>

    <SvgHudPanel>
        <template #default>
            <p>sergjknglkjselgnesgnjj</p>
            <ul>
                <li>123</li>
                <li>456</li>
            </ul>
        </template>
    </SvgHudPanel>
    <SvgHudPanelBackup2 side="right">
        sergjknglkjselgnesgnjj
        <ul>
            <li>123</li>
            <li>456</li>
        </ul>
    </SvgHudPanelBackup2>
    <SvgHudPanelBackup side="right">123</SvgHudPanelBackup>
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