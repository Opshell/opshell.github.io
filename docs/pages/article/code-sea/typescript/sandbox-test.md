---
title: sandbox-test
author: Opshell
createdAt: '2024-08-10'
categories:
  - 使用實例
tags:
  - TypeScript
  - vue
editLink: true
isPublished: false
image: ''
description: ''
keywords: ''
---
::: danger 標記：無意義
測試 `::: sandbox` 語法用的頁面，2026-10-05 取消公開。
:::

::: sandbox {template=vue3-ts}
```vue /src/App.vue
<script setup lang="ts">
    import { ref } from 'vue';

    const person = ref<string>('Opshell');
</script>

<template>
    <h1>Hi, I am {{ person }}</h1>
</template>
```
:::
