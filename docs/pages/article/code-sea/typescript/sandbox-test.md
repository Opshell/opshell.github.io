---
title: 'sandbox-test'
author: 'Opshell'
createdAt: '2024/08/10'
categories:
  - 使用實例
tags:
  - typescript
  - vue
editLink: true
isPublished: true
---


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