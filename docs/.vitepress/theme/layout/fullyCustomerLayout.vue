<script setup lang="ts">
import { useData } from 'vitepress';

// 1. 取得資料
const { frontmatter, page, isDark } = useData();

// 簡單的切換深色模式測試
const toggleDark = () => isDark.value = !isDark.value;
</script>

<template>
  <div class="my-custom-frame" :class="{ dark: isDark }">

    <header class="my-header">
      <div class="logo">Opshell's Space</div>
      <nav>
        <a href="/">Home</a>
        <a href="/tags-list">Tags</a>
        <button @click="toggleDark">{{ isDark ? '🌙' : '☀️' }}</button>
      </nav>
    </header>

    <main class="my-container">
      <div class="article-header">
        <h1 class="title">{{ frontmatter.title }}</h1>
        <div class="meta">
          <span>{{ frontmatter.author }}</span>
          <span>{{ frontmatter.createdAt }}</span>
        </div>
        <img v-if="frontmatter.image" :src="frontmatter.image" class="cover-img" />
      </div>

      <article class="markdown-body">
        <Content />
      </article>

      <footer class="my-footer">
        <p>這是完全手刻的 Layout，沒有使用 DefaultTheme</p>
      </footer>
    </main>

  </div>
</template>

<style lang="scss" scoped>
// 這裡可以完全不理會 VitePress 的變數，寫你自己的 CSS
.my-custom-frame {
  min-height: 100vh;
  background: #fff;
  color: #333;
  &.dark {
    background: #1e1e1e;
    color: #eee;
  }
}

.my-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.markdown-body {
  // 這裡你可以針對 Markdown 生成的 HTML 做樣式覆蓋
  // 例如 h2, p, ul, li 等等
  line-height: 1.8;
  font-size: 1.1rem;
}
</style>