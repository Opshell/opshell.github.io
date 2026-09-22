<script setup lang="ts">
    // 技能小卡：有 icon 就放，沒有就純文字；顏色從 --color-skill 來（frontmatter 給）
    defineProps<{ icon?: string }>();
</script>

<template>
    <li class="skill">
        <ElSvgIcon v-if="icon" :name="icon" class="skill__icon" />
        <span class="skill__text"><slot /></span>
    </li>
</template>

<style lang="scss">
    .skill {
        --color-skill: var(--vp-c-text-2);
        @include setFlex(flex-start, center, 6px);
        display: inline-flex;
        background: color-mix(in srgb, var(--color-skill) 10%, transparent);
        height: 30px;
        padding: 0 10px 0 8px;
        border: 1px solid color-mix(in srgb, var(--color-skill) 45%, transparent);
        border-radius: 8px;
        color: var(--color-skill);
        font-size: var(--font-size-s);
        font-weight: 500;
        line-height: 1;
        white-space: nowrap;

        &__icon {
            @include setSize(18px, 18px);
            padding: 0;
            fill: var(--color-skill);
        }
        &:not(:has(.skill__icon)) { padding-left: 10px; }
    }
</style>
