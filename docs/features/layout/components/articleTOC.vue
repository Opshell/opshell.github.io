<script setup lang="ts">
import { useData } from 'vitepress';

const { page } = useData();
</script>

<template>
  <nav class="article-toc" v-if="page.headers && page.headers.length > 0">
    <h3 class="toc-title">ON THIS PAGE</h3>
    <ul class="toc-list">
      <li v-for="header in page.headers" :key="header.slug" :class="`level-${header.level}`">
        <a :href="`#${header.slug}`">{{ header.title }}</a>
      </li>
    </ul>
  </nav>
</template>

<style lang="scss" scoped>
.article-toc {
  position: sticky;
  top: 2rem;

  .toc-title {
    margin-bottom: 0.8rem;
    color: var(--vp-c-text-2);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .toc-list {
    padding: 0;
    border-left: 2px solid var(--vp-c-divider);
    margin: 0;
    list-style: none;
  }

  li {
    margin: 0;

    a {
      display: block;
      padding: 4px 0 4px 16px;
      border-left: 2px solid transparent; // Active indicator placeholder
      margin-left: -2px; // Pull back to overlap border
      color: var(--vp-c-text-2);
      font-size: 0.9rem;
      text-decoration: none;
      transition: color 0.2s;

      &:hover {
        border-left-color: var(--vp-c-brand-light);
        color: var(--vp-c-brand);
      }
    }

    &.level-3 a {
        padding-left: 28px;
        font-size: 0.85rem;
    }
  }
}
</style>