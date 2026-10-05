---
title: Swiper Virtual Slides：新增 slide 之後畫面沒更新
image: ''
description: '開了 Swiper 的 virtual 模式之後，改 Vue 的陣列不會讓 slide 跟著更新。原因是 virtual 模式下 slide 由 Swiper 自己管理，要改 swiper.virtual.slides 再呼叫 update()，或用 virtual 提供的方法。'
keywords: ''
author: Opshell
createdAt: '2024-09-12'
categories:
  - vue
tags:
  - vue
  - swiper
  - virtual-slides
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的筆記與 StackBlitz 範例寫成全文（virtual 模式為什麼不跟著 Vue 更新、兩種更新方式、範例）。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
`Swiper` 的 slide 一多（幾百張圖、無限載入的卡片），通常會打開 virtual 模式，只渲染畫面附近的幾張。問題是開了之後，在 `Vue` 裡 `push` 一筆新資料，slide 卻沒有出現。

我卡在「新增 slide 後不知道要怎麼 update」，問了一圈才知道：-|它的一切 update 都要走 virtual 自己的那套|-。這篇記錄解法，問題重現在 [這個 StackBlitz](https://stackblitz.com/edit/vitejs-vite-cz9w7g?file=src%2FApp.vue&terminal=dev)，解法在 [這個 StackBlitz](https://stackblitz.com/edit/vitejs-vite-b8tmmv?file=src%2FApp.vue)。
:::

## 懶人包
- virtual 模式下，slide 不是 `Vue` 渲染的，是 `Swiper` 照 `swiper.virtual.slides` 這個陣列自己畫的。
- 所以改 `Vue` 的 `ref` 陣列，`Swiper` 不會知道；要把新陣列塞回 `swiper.virtual.slides`，再呼叫 `swiper.virtual.update()`。
- 單純新增、刪除，也可以直接用 `virtual.appendSlide()`、`virtual.prependSlide()`、`virtual.removeSlide()`。
- 原則：資料以 `Vue` 為準，每次改完同步給 `Swiper` 一次，不要兩邊各改各的。

## 技術拆解

### 為什麼改陣列沒用
一般模式下，你用 `v-for` 渲染 slide，`Vue` 改 DOM，`Swiper` 再去讀 DOM 算位置，大家相安無事。

virtual 模式為了效能，不會把所有 slide 都放進 DOM，而是自己維護一份 `virtual.slides` 陣列，捲到哪就只產生那幾張的 DOM。換句話說，在 virtual 模式下 -|`Swiper` 才是 slide 的主人|-，`Vue` 那份陣列只是你手上的資料，`Swiper` 不會去監聽它。

所以你在 `Vue` 裡 `slides.value.push(...)`，`Swiper` 手上的 `virtual.slides` 還是舊的，畫面當然不會變。

### 解法一：整份換掉再 update
最直接的做法，就是把 `Vue` 的陣列轉成 `Swiper` 要的格式，塞回去，再叫它更新：

```ts
swiperRef.value.swiper.virtual.slides = slides.value.map(
    slide => slide.content
);
swiperRef.value.swiper.virtual.update();
```

好處是簡單、不會不同步，資料怎麼變都一樣處理；缺點是每次都整份重算，資料量非常大時要注意。

### 解法二：用 virtual 的方法逐筆操作
`Swiper` 的 virtual 模組本身也提供了操作方法，會自己更新 `virtual.slides` 並重新渲染：

- `virtual.appendSlide(slides)`：加在最後面
- `virtual.prependSlide(slides)`：加在最前面
- `virtual.removeSlide(indexes)`：依索引刪除
- `virtual.removeAllSlides()`：全部清掉

適合「無限載入、往後加一批」這種只會往一個方向長的情境。但要記得 `Vue` 那份陣列也要一起改，不然兩邊會越差越遠。

## 例子與對比
下面用 `Swiper Element`（`<swiper-container>`）示範，`swiperRef.value.swiper` 拿到的就是 `Swiper` 實例：

```vue
<script setup lang="ts">
    import { onMounted, ref, useTemplateRef } from 'vue';
    import { register } from 'swiper/element/bundle';
    import type { SwiperContainer } from 'swiper/element';

    register();

    type Slide = { id: number; content: string };

    const swiperRef = useTemplateRef<SwiperContainer>('swiperRef');
    const slides = ref<Slide[]>(
        Array.from({ length: 50 }, (_, i) => ({ id: i, content: `Slide ${i + 1}` }))
    );

    onMounted(() => {
        if (!swiperRef.value) { return; }

        Object.assign(swiperRef.value, {
            slidesPerView: 3,
            virtual: {
                slides: slides.value.map(slide => slide.content)
            }
        });
        swiperRef.value.initialize();
    });

    // 解法一：資料以 Vue 為準，改完整份同步
    function syncSlides() {
        const swiper = swiperRef.value?.swiper;
        if (!swiper) { return; }

        swiper.virtual.slides = slides.value.map(slide => slide.content);
        swiper.virtual.update();
    }

    function addSlide() {
        const id = slides.value.length;
        slides.value.push({ id, content: `Slide ${id + 1}` });
        syncSlides();
    }

    // 解法二：只往後加，用 virtual 的方法
    function appendSlide() {
        const id = slides.value.length;
        const slide = { id, content: `Slide ${id + 1}` };

        slides.value.push(slide);
        swiperRef.value?.swiper.virtual.appendSlide(slide.content);
    }
</script>

<template>
    <swiper-container ref="swiperRef" init="false" />
    <button type="button" @click="addSlide">新增（整份同步）</button>
    <button type="button" @click="appendSlide">新增（appendSlide）</button>
</template>
```

::: tip
在 `Vue` 裡用 `swiper-container` 這種自訂元素，要在 `vite.config.ts` 的 `vue()` 外掛設定 `template.compilerOptions.isCustomElement`，讓 `swiper-` 開頭的標籤不被當成 `Vue` 元件解析。官方也建議新專案改用 `Swiper Element`，原本的 `Swiper Vue` 元件之後可能會被移除，以官方文件為準。
:::

| | 整份同步 + `update()` | `appendSlide()` 這類方法 |
|---|---|---|
| 寫法 | 一個 `syncSlides()` 打天下 | 每種操作各叫各的 |
| 不同步的風險 | 低 | 要自己記得兩邊都改 |
| 效能 | 每次整份重算 | 只動變更的部分 |
| 適合 | 會排序、篩選、隨意增刪的列表 | 無限載入、只往後加 |

## 結論
virtual 模式的關鍵就一句話：slide 歸 `Swiper` 管，`Vue` 的陣列它看不到。資料改完，記得親口告訴它一聲 `update()`。

`Swiper`：「你不說，我怎麼會知道？」~~（很像某些對話。）~~
