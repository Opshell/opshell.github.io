<script setup lang="ts">
    defineProps<{
        color?: string
    }>();
</script>

<template>
    <li class="skill">
        <slot name="icon" />
        <slot />
    </li>
</template>

<style lang="scss">
    .skill {
        --color-skill: #4AA985;
        display: flex;
        gap: 12px;
        height: 40px;
        padding: 5px 8px;
        border: 1px solid var(--color-skill);
        border-radius: 5px;
        color: var(--color-skill);
        font-size:  1.375rem;
        line-height: 2em;
        @include setFlex();
        svg {
            fill: var(--color-skill);
            @include setSize(30px, 30px);
        }

        .text {
            color: var(--color-skill);
        }
    }
</style>
