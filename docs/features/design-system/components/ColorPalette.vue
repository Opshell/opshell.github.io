<script setup lang="ts">
    import ColorSeries from "./colorSeries.vue";
</script>

<template>
    <div class="color-palette__container">
        <section class="section">
            <h3 class="title">Brand Colors</h3>
            <ColorSeries category="brand" />
        </section>

        <section class="section">
            <h3 class="title">Gray Colors</h3>
            <ColorSeries category="gray" />
        </section>

        <section class="section">
            <h3 class="title">Status Colors</h3>
            <ColorSeries category="functional" />
        </section>

        <section class="section">
            <h3 class="title">Community Colors</h3>
            <ColorSeries category="community" />
        </section>

        <section class="section">
            <h3 class="title">Article Tag Colors</h3>
            <ColorSeries category="mdtag" />
        </section>
    </div>
</template>

<style lang="scss">
    .color-palette {
        &__container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .section {
            + .section {
                padding-top: 2rem;
                border-top: 1px solid var(--color-gray-200);
            }
        }
    }
</style>