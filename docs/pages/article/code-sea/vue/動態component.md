---
title: 動態component
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-10-04'
categories: 
tags: 
editLink: true
isPublished: false
---
假如你的組件不是那麼馬上需要被使用，就`<component :is="xxx">`
然後：


```ts
<template>
<!-- 使用 Vue 的動態組件語法 :is -->
  <component :is="componentMap[componentKey]" />
</template>

import { defineAsyncComponent } from 'vue'

const componentMap = {
  'componentA': defineAsyncComponent(() => import('@/components/ComponentA.vue')),
  'componentB': defineAsyncComponent(() => import('@/components/ComponentB.vue')),
}

// 這裡 componentKey 可以是根據 router params 或 tab 的值來決定的
const componentKey = 'componentA';  // 動態決定使用哪個組件

```
