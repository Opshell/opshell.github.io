<script setup lang="ts">
    import type { SplitMode } from '../constants';
    import { computed } from 'vue';
    import { SPLIT_MODES } from '../constants';

    // 三段開關：左＝寫法放大、中＝各半、右＝呈現放大。兩側的字也能點，鍵盤用左右鍵
    const mode = defineModel<SplitMode>({ required: true });

    const index = computed(() => SPLIT_MODES.findIndex(item => item.key === mode.value));
    const current = computed(() => SPLIT_MODES[index.value]);

    function step(delta: number) {
        const next = SPLIT_MODES[Math.min(SPLIT_MODES.length - 1, Math.max(0, index.value + delta))];
        if (next) mode.value = next.key;
    }

    // 點軌道：點哪一段就停哪一段
    function pick(event: MouseEvent) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const slot = Math.floor(((event.clientX - rect.left) / rect.width) * SPLIT_MODES.length);
        const next = SPLIT_MODES[Math.min(SPLIT_MODES.length - 1, Math.max(0, slot))];
        if (next) mode.value = next.key;
    }
</script>

<template>
    <div class="md-split-switch" :class="`is-${mode}`">
        <button type="button" class="md-split-switch__side is-source" @click="mode = 'source'">寫法</button>

        <button
            type="button"
            class="md-split-switch__track"
            role="slider"
            aria-label="寫法與呈現的寬度比例"
            aria-valuemin="0"
            :aria-valuemax="SPLIT_MODES.length - 1"
            :aria-valuenow="index"
            :aria-valuetext="current?.label"
            :title="current?.label"
            @click="pick"
            @keydown.left.prevent="step(-1)"
            @keydown.right.prevent="step(1)"
        >
            <span class="md-split-switch__thumb" />
        </button>

        <button type="button" class="md-split-switch__side is-render" @click="mode = 'render'">呈現</button>
    </div>
</template>

<style lang="scss">
    .md-split-switch {
        display: inline-flex;
        gap: .5rem;
        align-items: center;
        font-size: var(--font-size-xs);

        &__side {
            background: none;
            padding: .125rem .25rem;
            border: none;
            border-radius: 4px;
            color: var(--vp-c-text-3);
            font: inherit;
            cursor: pointer;
            transition: color .25s var(--cubic-FiSo);

            &:hover,
            &:focus-visible { color: var(--vp-c-text-1); }
        }

        // 放大的那一邊字亮起來；各半時兩邊都是一般亮度
        &.is-even &__side { color: var(--vp-c-text-2); }
        &.is-source &__side.is-source,
        &.is-render &__side.is-render {
            color: var(--vp-c-text-1);
            font-weight: 600;
        }

        // 軌道三段：thumb 停在 0%／50%／100%，用 left 的漸變滑過去
        &__track {
            --thumb: 14px;
            position: relative;
            flex-shrink: 0;
            background-color: var(--vp-c-default-soft);
            width: 3.25rem;
            height: 20px;
            padding: 0;
            border: none;
            border-radius: 10px;
            cursor: pointer;

            &::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                background-color: var(--vp-c-text-3);
                width: 4px;
                height: 4px;
                border-radius: 50%;
                transform: translate(-50%, -50%);
            }

            &:focus-visible { outline: 2px solid var(--color-primary-1); }
        }

        &__thumb {
            position: absolute;
            top: 3px;
            left: calc(50% - var(--thumb) / 2);
            background-color: var(--color-primary-1);
            width: var(--thumb);
            height: var(--thumb);
            border-radius: 50%;
            transition: left .35s var(--cubic-SiMo);
        }

        &.is-source &__thumb { left: 3px; }
        &.is-render &__thumb { left: calc(100% - var(--thumb) - 3px); }
    }
    @media (prefers-reduced-motion: reduce) {
        .md-split-switch__thumb { transition: none; }
    }
</style>
