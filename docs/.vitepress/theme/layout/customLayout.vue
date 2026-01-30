<script setup lang="ts">
    import { useRoute } from 'vitepress'
    import DefaultTheme from 'vitepress/theme';
    import { useData } from 'vitepress';

    const {theme, frontmatter} = useData();

    console.log('theme', theme);
    console.log('frontmatter', frontmatter);
</script>

<template>

</template>

<style scoped>
.Layout {
  display: flex;
  display: grid;
  flex-direction: column;
  grid-template-areas: "header header header"
                       "article-link main aside"
                       "article-link main ad";
  min-height: 100vh;

}
</style>
