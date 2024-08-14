<script setup lang="ts">
    defineProps<{
        title: string
        subtitle?: string
    }>();
</script>

<template>
    <section class="section-block">
        <h2 class="title">
            {{ title }}
            <span v-if="subtitle" class="subtitle">（{{ subtitle }}）</span>
        </h2>

        <slot />
    </section>
</template>

<style lang="scss">
    .section-block {
        @include setFlex(flex-start, stretch, 2.5rem, column);
        @include setSize(100%, auto);
        > .title {
            color: var(--vp-c-text-1);
            font-size: 1.75rem;
            line-height: 2rem;
            .subtitle {
                color: #999;
                font-size: 1.125rem;
            }
        }
    }
</style>
