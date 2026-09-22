<script setup lang="ts">
    // 設計系統頁的元件展示。目前只有星系頁的 HUD 面板；shared/components/el 那批之後再補進來
    import { SvgHudPanel } from '@features/tags-list';
</script>

<template>
    <div>
        <p>Explore our library of atomic components. <del>It hasn't been done yet.</del></p>
        <a href="./components" class="cta-button">View Components Library &rarr;</a>
    </div>

    <SvgHudPanel title="HUD PANEL" icon="radar" side="left">
        <p>星系頁用的 SVG 面板：切角外框、格線底、可收合。</p>
        <ul>
            <li>title、icon、side 三個 props</li>
            <li>內容放 slot</li>
        </ul>
    </SvgHudPanel>
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
