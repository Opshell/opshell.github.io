---
title: swiper.updata
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '2024-09-12'
categories:
tags:
editLink: true
isPublished: false
---
swiper 的 virtual 嗎
我卡在新增 slide 後不知道要怎麼 update

https://stackblitz.com/edit/vitejs-vite-cz9w7g?file=src%2FApp.vue&terminal=dev

他的一切update都要用virtual的事件
https://stackblitz.com/edit/vitejs-vite-b8tmmv?file=src%2FApp.vue

swiperRef.value.swiper.virtual.slides = slides.value.map(
    (slide) => slide.content
  );
  swiperRef.value.swiper.virtual.update();
