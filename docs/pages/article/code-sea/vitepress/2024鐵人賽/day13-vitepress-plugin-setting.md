---
title:  'Day13 - Vitepress Plugin Setting'
author: 'Opshell'
createdAt: '2024/09/14'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - vitepress
editLink: true
isPublished: false
---

到昨天，整個環境才算是設定好了，水了 12 天了，接下來該認認真真的寫一點程式了，那我們今天來水點 vite 的 plugin 吧 ~~(被拖去打)~~
等等聽我解釋， `vitepress` 的其中一個很大的優勢就是他建立在 `vite` 上面，我們要善用他的優勢!!

## 路徑別名
我們在 `docs/` 下面建立 `components`、`data`、`hooks` 幾個資料夾，並分別設定他們的別名：
```ts
import path from 'node:path';

export default defineConfig({
    vite: {
        resolve: {
            alias: { // 設定別名
                '@': path.resolve(__dirname, '../'), // docs 當根目錄
                '@vitepress': path.resolve(__dirname), // .vitepress 目錄
                '@components': path.resolve(__dirname, '../', 'components'),
                '@data': path.resolve(__dirname, '../', 'data'),
                '@hooks': path.resolve(__dirname, '../', 'hooks'),
                '@pages': path.resolve(__dirname, '../', 'pages')
            }
        }
    }
});
```

## 自動 import
稍微大點的專案，通常會用很多 import，
`Anthony Fu`大，根據 `unplugin` 做了幾個自動 import 的套件：

## unplugin-auto-import
自動 import 常用的API，像是 vue 的 `ref`、`computed`、`onMounted`，第三方的 `axios`、`vueUse` 的 API 等等。

### 1. 安裝
```sh
yarn add unplugin-auto-import -D
```

### 2. 設定
```ts
import AutoImport from 'unplugin-auto-import/vite';

export default defineConfig({
    vite: {
        plugins: [
            AutoImport({
                include: [
                    /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
                    /\.vue$/,
                    /\.vue\?vue/, // .vue
                    /\.md$/ // .md
                ],
                // global imports to register
                imports: [ // presets
                    'vue',
                    { // custom
                        '@vueuse/core': [
                            // named imports
                            'useMouse', // import { useMouse } from '@vueuse/core',
                            // alias
                            ['useFetch', 'useMyFetch']
                        ],
                        'axios': [
                            // default imports
                            ['default', 'axios']
                        ],
                        'vue': ['PropType', 'defineProps', 'InjectionKey', 'Ref']
                    }
                ],
                dirs: [],
                dts: './types/auto-imports.d.ts', // typescript 宣告檔案位置
                vueTemplate: false,
                eslintrc: {
                    enabled: false, // Default `false`
                    filepath: './.eslintrc-auto-import.json',
                    globalsPropValue: true
                }
            })
        ]
    }
});
```

::: tip types 目錄建立
可以看到設定裡面有個 `dts: './types/auto-imports.d.ts'`，所以我們要記得在 `docs/` 目錄下建立 `types` 目錄。
:::
::: tip eslintrc-auto-import.json 生成
而 `eslintrc.enabled` 這個設定可以 `true` 一次，然後執行 `yarn docs:dev`
可以讓她生成 `eslintrc-auto-import.json`，
生成後改為 `false`，除非有改動再重新生，不關掉的話每次都會重新生成，
有時候會導致 `ESLint` 抓不到文件。
:::

## unplugin-vue-components
自動 import `component`

### 1. 安裝
```sh
yarn add unplugin-vue-components -D
```

### 2. 設定
```ts
import Components from 'unplugin-vue-components/vite';

export default defineConfig({
    vite: {
        plugins: [
            Components({
                dirs: ['./components'], // 指定components位置 預設是'src/components'
                dts: './types/components.d.ts', // .d.ts生成位置
                extensions: ['vue'],
                directoryAsNamespace: true, // 允許子目錄作為命名空間
                resolvers: [] // 解析規則
            })
        ]
    }
});
```
會看到 Opshell 把 `directoryAsNamespace` 這個參數設為 `true`，而 `components` 的目錄結構長這樣：
```sh
docs/components/
├─ el
│  ├─ btn.vue
│  ├─ input.vue
│  ├─ skill.vue
│  └─ svgIcon.vue
├─ mole
├─ orga
└─ template
```
所以他生成之後，要使用 `skil.vue` 好了，就會像這樣，`<ElSkill></ElSkill>`。

## vite-plugin-svg-icons

ESM CommonJS
https://hackmd.io/@SkT7-27LSWWQi5G2DJBLkw/ryQ1w-rBi

2. unplugin-auto-import
3. unplugin-vue-components
