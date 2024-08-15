<script setup lang="ts">
    import { useData, frontmatter } from 'vitepress';

    const { page } = useData();
</script>

<template>
    <div>
        <h3>Custom Layout</h3>

        <div v-if="page.isNotFound">
            Custom 404 page!
        </div>
        <Content v-else />
    </div>
</template>

<style lang="scss">

</style>
