---
title:  'Day27 - sandbox'
author: 'Opshell'
createdAt: '2024/09/28'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
editLink: true
isPublished: true
---

![Banner27](https://ithelp.ithome.com.tw/upload/images/20240928/20109918RzXsBbiZJh.png)

鐵人賽也接近尾聲了，各位看官可以發現一個部落格大體的架構都幾乎完成了，stage 5 只是在補一些小套件來 ~~水~~ 完善一些小功能，今天就來補點 `andbox(沙盒)` 吧。

圖片不能對於程式邏輯的表現不夠強烈，所以有了程式碼區塊。如果想要更仔細，<br />可以來個 `Sandbox(沙盒)`。

## vitepress sandbox
vitepress sandbox 透過 [CodeSandbox](https://codesandbox.io/) 的 `online bundler` 來實現瀏覽器即時編譯的沙盒功能。

支援 `static` | `angular` | `react` | `react-ts` | `vanilla` | `vanilla-ts` | `vue` | `vue3` | `vue3-ts` | `svelte` | `solid` | `test-ts` | `vite-templates`.

## 安裝
```sh
yarn add vitepress-plugin-sandpack -D
```

## 全域註冊
```ts
import { DefineComponent, h } from 'vue';
import { Theme, useRoute } from 'vitepress';
import DefaultTheme from 'vitepress/theme-without-fonts';
import mediumZoom from 'medium-zoom';

import { Sandbox } from 'vitepress-plugin-sandpack'; // [!code ++]
import 'vitepress-plugin-sandpack/dist/style.css'; // [!code ++]

import ExpandLayout from './layout/expandLayout.vue';
import LayoutResume from './layout/resume.vue';

function reloadBusuanzi() {......}
function initZoom() {......}

export default {
    ...DefaultTheme,
    Layout: ExpandLayout,
    setup() {......},
    enhanceApp({ app }) {
        app.component('resume', LayoutResume);
        app.component('Sandbox', Sandbox); // [!code ++]
    }
} satisfies Theme;
```
## config markdown 配置
```ts
import path from 'node:path';
import fs from 'node:fs';
import { DefaultTheme, defineConfig } from 'vitepress';
import container from 'markdown-it-container'; // [!code ++]
import { renderSandbox } from 'vitepress-plugin-sandpack'; // [!code ++]

import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';

export default defineConfig({
  markdown: {
    config: (md) => {
      md.use(container, 'sandbox', {  // [!code ++]
          render(tokens: any[], idx: number) { // [!code ++]
              return renderSandbox(tokens, idx, 'sandbox'); // [!code ++]
          } // [!code ++]
      }); // [!code ++]
    }
  }
});
```

## 使用

<div class="in-out-demo-block">

#### Input：{.brand}
```md
::: sandbox {template=vue3-ts}

:::
```

#### Output：{.brand}
::: sandbox {template=vue3-ts}

:::

</div>

![normal](https://ithelp.ithome.com.tw/upload/images/20240928/20109918N0Wt5ll3K7.png)

您可以點擊此按鈕打開codesandbox。
你可以看到，文件目錄是這樣的。

## 進階使用
我們可以將入口檔案（名為myEntry.js ）改為根目錄。
MyApp.vue也在根目錄中。
將/MyApp.vue替換為/src/MyApp.vue ，它可以移動到 src 資料夾。

<div class="in-out-demo-block">

#### Input：{.brand}
````md
::: sandbox {entry=/myEntry.js}
```js /myEntry.js [active]
import { createApp } from 'vue'
import App from './MyApp.vue'

console.log('test entry')
createApp(App).mount('#app')
```

```vue /MyApp.vue
<script setup>
import { ref } from 'vue';

const msg = ref('MyApp');
</script>

<template>
  <div>{{ msg }}</div>
</template>
```
:::
````

#### Output：{.brand}
::: sandbox {entry=/myEntry.js}
```js /myEntry.js [active]
import { createApp } from 'vue';
import App from './MyApp.vue';

console.log('test entry');
createApp(App).mount('#app');
```

```vue /MyApp.vue
<script setup>
    import { ref } from 'vue';

    const msg = ref('MyApp');
</script>

<template>
    <div>{{ msg }}</div>
</template>
```
:::
</div>

![https://ithelp.ithome.com.tw/upload/images/20240928/20109918tbIA5NqyAB.png](https://ithelp.ithome.com.tw/upload/images/20240928/20109918tbIA5NqyAB.png)

![https://ithelp.ithome.com.tw/upload/images/20240928/20109918XxwAnxD2rN.png](https://ithelp.ithome.com.tw/upload/images/20240928/20109918XxwAnxD2rN.png)

你可以看到，文件目錄是這樣的。並且 src 中的檔案將不會被使用。

## 小結
這樣就完成了簡單的沙盒安裝及使用，沒有什麼特別需要注意的地方，如果要說的話，應該是 VitePress Sandbox 只支援 ESM 模式。

## 備註
只要是和 markdown 有關係的功能，文章和實際展示效果在[Opshell's Blog](https://opshell.github.io/article/code-sea/vitepress/2024鐵人賽/day18-basic-markdown)服用，會擁有更棒的賞文體驗。
