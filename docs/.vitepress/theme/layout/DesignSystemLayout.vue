<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';

const { Layout } = DefaultTheme;
const { frontmatter } = useData();
</script>

<template>
    <Layout class="design-system-layout">
        <template #doc-before>
            <div class="design-system-header">
                <h1>{{ frontmatter.title }}</h1>
                <p v-if="frontmatter.description">{{ frontmatter.description }}</p>
            </div>
        </template>
    </Layout>
</template>

<style lang="scss">
.design-system-layout {
    .VPPage {
        .container {
            max-width: calc(var(--vp-layout-max-width) - 64px) !important;
            width: 100%;
            padding: 0 32px;
            margin: 0 auto;
        }
    }

    // Hide the default title if we are adding a custom one, or style it
    .VPDoc {
        padding: 0 !important;
    }

    .design-system-header {
        margin-bottom: 40px;
        text-align: center;

        h1 {
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 1rem;
            background: -webkit-linear-gradient(120deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        p {
            font-size: 1.2rem;
            color: var(--vp-c-text-2);
        }
    }
}
</style>
