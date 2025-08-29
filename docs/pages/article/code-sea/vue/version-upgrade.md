---
title:  'Vue 3.3 升 3.5 疑難錦囊'
author: 'Opshell'
createdAt: '2024/10/16'
categories: 'vue'
tags:
  - vue
  - vue-router
  - upgrade
  - 開發體驗
  - defineModel
  - props
editLink: true
isPublished: true
---

<!-- ## Vue 3.3 升 3.5 疑難錦囊 -->
相對純淨的專案中，Vue 的升級居然也會遇到很多怪怪的問題，所以記錄在這邊，遇到新問題時會同步更新在這邊，讓有猿人撿到錦囊時可以提早下班。

## useVModel 改 defineModel
在 Vue 3.4 之前 `defineModel` 只是個實驗性功能，所以一般都會使用 `VueUse` 中的 `useVModel` 來偷懶，現在專案更新了，我們來紀錄怎麼從 `useVModel` 改成 `defineModel` 吧。

### useVModel
``` vue
<script setup lang="ts">
    import { useVModel } from '@vueuse/core';

    interface iProps {
        model?: 'view' | 'edit'
        album: giImageData[] | null
    }

    const props = withDefaults(defineProps<iProps>(), {
        model: 'view',
        album: null
    });

    const emit = defineEmits<{
        'update:album': [result: giImageData[]]
        'uploadImages': [res: giImageData[]]
    }>();

    const relayAlbum = useVModel(props, 'album', emit);
</script>

<template>
    <div class="album-box" :class="{ '--is-edit': model === 'edit' }">
        <div
            v-for="(photo, i) in relayAlbum"
            :key="`photo_${i}`" class="photo"
        >
            <img :src="photo.file" />
        </div>
    </div>
</template>
```

### defineModel
:::tip
看看這精美的程式碼， coding 體驗感覺儲值了 VVIP 一樣。
``` vue
<script setup lang="ts">
    interface iProps {
        model?: 'view' | 'edit'
    }
    const props = withDefaults(defineProps<iProps>(), {
        model: 'view'
    });
    const emit = defineEmits<{
        selectActiveImage: [index: number]
        uploadImages: [res: giImageData[]]
    }>();
    const relayAlbum = defineModel<giImageData[] | null>('album', { default: null });
</script>

<template>
    <div class="album-box" :class="{ '--is-edit': model === 'edit' }">
        <div
            v-for="(photo, i) in relayAlbum"
            :key="`photo_${i}`" class="photo"
        >
            <img :src="photo.file" />
        </div>
    </div>
</template>
```
:::

## 不失去響應性的 Props 解構
在 `Vue 3.5` 的之前的版本中，對 props `解構賦值`會讓他失去響應性，需要使用 `toRef` 等方式處理，才能保存響應性，在上面的例子中，也會需要使用 `withDefaults` 來給預設值，才不會失去響應。在 `Vue3.5` 中已經不需要了，所以上面的範例 在 3.5 中會在進化成：

``` vue
<script setup lang="ts">
    interface iProps {
        model?: 'view' | 'edit'
    }
    const { model = 'view' } = defineProps<iProps>();

    const emit = defineEmits<{
        selectActiveImage: [index: number]
        uploadImages: [res: giImageData[]]
    }>();

    const relayAlbum = defineModel<giImageData[] | null>('album', { default: null });
</script>

<template>
    <div class="album-box" :class="{ '--is-edit': model === 'edit' }">
        <div
            v-for="(photo, i) in relayAlbum"
            :key="`photo_${i}`" class="photo"
        >
            <img :src="photo.file" />
        </div>
    </div>
</template>
```

::: tip () => [] 預設值報錯
在 3.5 之前的 `props` 中，給預設值時通常會給

```ts
const props = withDefaults(defineProps<{
    options: iOptions[],
}>(), {
    options: () => [],
});
```
但我們會在 3.5 以上這樣使用
```ts
const { options = [] } = defineProps<{ options: iOptions[] }>();
```

但是這樣做  在 F12 控制台中會爆警告 說我們應該是拿到 function 但是拿到 Array。

目前沒有發現可行的做法，猜測是 `ESLint` 還沒有支援這個特性? 所以把這個警告先關掉了：
```js
{
    files: ['**/*.vue'],
    rules: {
        'vue/require-valid-default-prop': 'off', // 配合 Vue3.5 可解構 props 不再需要 () => [] 只要給 [] 就可以了
    }
}
```

:::

## vue-router 抓不到全域變數
升級 3.5 之後，本來寫在 `router/index.ts` 中 `router.beforeEach` 的全域 `provide` 突然就 `undefined` 了，

自從 `vue-router 3.3` 之後，應該要可以在 `導航守衛(Navigation Guards)` (例:`router.beforeEach()`) 中使用 `inject()` 來注入全域變數才對阿?

::: code-group

```ts [router/index.ts]
router.beforeEach(async (to: RouteLocationNormalizedGeneric) => {
    const app: App = inject('app');
    const leaveConfirm = await app.config.globalProperties.$notify('warning', '提醒！', '您尚在編輯模式，<br />可能有未儲存的資料，<br />請確認是否要離開此頁面。', 0, true);
});
```

```ts [main.ts]
const app = createApp(App);
app.provide('app', app); // 提供this.$app 主要是router 裡要使用全域變數
```
:::

嘗試了很多方式，例如 `getCurrentInstance()` 一樣都不行，最後懷疑到 vue-router 的版本上面，一更新果然好了。

:::tip
更新 `vue-router` 的版本可以修正這個問題。

原 package：
"vue": "3.4.4"
"vue-router": "4.0.13",

新 package：
"vue": "3.5.12"
"vue-router": "4.4.5"
:::

## auto-import 不會載入 useTemplateRef、useId 等 Vue 3.5 新語法
更新 `unplugin-auto-import` 套件至版本 `0.18.1` 以上
