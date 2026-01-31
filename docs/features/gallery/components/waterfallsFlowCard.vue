<script setup lang="ts">
    const { title = '' } = defineProps<{
        title?: string
    }>();
</script>

<template>
    <div class="waterfalls-flow-card">
        <div class="wrap">
            <h4 class="title" v-html="title" />
            <slot />
        </div>
    </div>
</template>

<style lang="scss">
    .waterfalls-flow-card {
        background: var(--color-extreme-reverse);
        border: 1px solid var(--color-border-box);
        @include setBorder();
        border-radius: 10px;

        .wrap {
            @include setFlex(flex-start, stretch, 10px, column);
            padding: 15px;
            overflow: hidden;
            .title {
                margin: 0 0 10px;
                font-size: 1.2rem;
                font-weight: 400;
                line-height: 1;
            }
        }
    }
</style>
