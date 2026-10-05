---
title: 在 Vue + Vite 專案裝好 Vitest
image: ''
description: '從安裝套件、package.json 指令、vitest.config.ts 到第一支元件測試，把 Vitest、Vue Test Utils、jsdom 與 @pinia/testing 一次接好，還有測試覆蓋率要多裝的那一包。'
keywords: ''
author: Opshell
createdAt: '2024-10-04'
categories:
  - vue
tags:
  - vue
  - vitest
  - 單元測試
  - pinia
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：依原本的指令與套件清單寫成安裝教學，補上設定檔、第一支測試、Pinia 測試與覆蓋率套件。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
決定要開始寫單元測試之後，第一個關卡往往不是「測什麼」，而是「怎麼裝」：要裝哪幾包、`package.json` 指令怎麼寫、為什麼元件測試會說 `document is not defined`。

這篇是安裝筆記，寫給用 `Vite` + `Vue 3` + `Pinia` 的專案。為什麼要寫測試，見 [為什麼要寫測試](./why%20testing)；TDD、BDD 那些方法論的吐槽，見 [TDD 在台灣行得通嗎](./what%20test)。原始參考：[這篇 CSDN 文章](https://blog.csdn.net/Web_ChuXia/article/details/129741522)。
:::

## 懶人包
- `Vitest` 直接吃 `vite.config.ts` 的設定（alias、外掛），`Vite` 專案幾乎零設定就能跑。
- 要測元件，加 `@vue/test-utils` 和 `jsdom`（模擬瀏覽器環境）；要測用到 store 的元件，加 `@pinia/testing`。
- 想要圖形介面就裝 `@vitest/ui`；要看覆蓋率，還得多裝 `@vitest/coverage-v8`。
- `vitest` 預設是 watch 模式，CI 上要用 `vitest run`。

## 技術拆解

### 要裝哪些
原本的清單是這五包，用 `yarn` 或 `pnpm` 裝成 devDependencies：

```sh
yarn add -D vitest @vitest/ui @vue/test-utils @pinia/testing jsdom
# 或
pnpm add -D vitest @vitest/ui @vue/test-utils @pinia/testing jsdom
```

各自的角色：

| 套件 | 做什麼 |
|---|---|
| `vitest` | 測試執行器本體，`describe`、`it`、`expect` 都從這裡來 |
| `@vitest/ui` | 瀏覽器裡的測試介面，看哪支過、哪支掛 |
| `@vue/test-utils` | 官方的元件測試工具，`mount` 元件、觸發事件、找元素 |
| `jsdom` | 在 Node 裡模擬 DOM，元件測試才有 `document` 可以用 |
| `@pinia/testing` | 建一個測試用的 Pinia，可以預設 state、把 action 換成 spy |

要跑覆蓋率的話，還要再加一包（第一次跑 `--coverage` 時 `Vitest` 也會提示你）：

```sh
pnpm add -D @vitest/coverage-v8
```

### package.json 指令

```json
{
    "scripts": {
        "test": "vitest",
        "test:ui": "vitest --ui",
        "test:unit": "vitest --environment jsdom",
        "test:coverage": "vitest run --coverage"
    }
}
```

- `test`：watch 模式，改檔就重跑相關的測試，開發時常駐。
- `test:ui`：開一個網頁介面，測試結果、錯誤堆疊、模組關係圖都在上面。
- `test:unit`：指定 `jsdom` 環境跑。如果在設定檔裡已經寫了 `environment: 'jsdom'`，這個參數可以省略。
- `test:coverage`：`run` 是只跑一次不 watch，CI 上要用這種。

### vitest.config.ts
`Vitest` 會讀 `vite.config.ts`，但建議把測試設定分出來，再用 `mergeConfig` 合併，`vite.config.ts` 才不會塞滿測試的東西：

```ts
// vitest.config.ts
import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
    test: {
        environment: 'jsdom',
        root: fileURLToPath(new URL('./', import.meta.url)),
        include: ['src/**/*.{test,spec}.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,vue}']
        }
    }
}));
```

如果 `vite.config.ts` 是 `defineConfig(env => ({ ... }))` 的函式寫法，`mergeConfig` 不能直接吃函式，要先呼叫一次再合併，細節以官方文件為準。

TypeScript 要認得 `describe`、`it` 的話，可以每支測試自己 `import { describe, it, expect } from 'vitest'`（我比較推這個，來源清楚）；想省掉 import 就開 `globals: true`，並在 `tsconfig` 的 `types` 加上 `vitest/globals`。

## 例子與對比

### 第一支元件測試

```vue
<!-- src/components/Counter.vue -->
<script setup lang="ts">
    import { ref } from 'vue';

    const count = ref(0);
</script>

<template>
    <button type="button" @click="count++">點了 {{ count }} 次</button>
</template>
```

```ts
// src/components/Counter.spec.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Counter from './Counter.vue';

describe('Counter', () => {
    it('點一下數字加一', async () => {
        const wrapper = mount(Counter);

        await wrapper.get('button').trigger('click');

        expect(wrapper.text()).toContain('點了 1 次');
    });
});
```

### 有用到 Pinia 的元件

```ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import UserBadge from './UserBadge.vue';
import { useUserStore } from '@/stores/user';

describe('UserBadge', () => {
    it('顯示 store 裡的使用者名稱', () => {
        const wrapper = mount(UserBadge, {
            global: {
                plugins: [
                    createTestingPinia({
                        createSpy: vi.fn,
                        initialState: { user: { name: 'Opshell' } }
                    })
                ]
            }
        });

        expect(wrapper.text()).toContain('Opshell');

        // action 預設被換成 spy，不會真的執行
        const store = useUserStore();
        expect(store.fetchUser).not.toHaveBeenCalled();
    });
});
```

`createTestingPinia` 預設會把所有 action 換成 spy，測元件時就不會真的去打 API；要讓 action 照常執行，傳 `stubActions: false`。

### jsdom vs happy-dom

| | `jsdom` | `happy-dom` |
|---|---|---|
| 相容性 | 高，最接近真實瀏覽器 | 少數 API 不完整 |
| 速度 | 較慢 | 較快 |
| 適合 | 先求穩 | 測試很多、想跑快一點 |

先用 `jsdom`，等測試多到嫌慢再換也不遲，改 `environment` 一行就好。

## 結論
`Vitest` 最舒服的地方，是它跟 `Vite` 共用同一份設定，alias、外掛都不用再寫一次。裝好這幾包、寫好四個指令、跑過第一支測試，剩下的就是「到底要測什麼」的哲學問題了。

工具裝好只花十分鐘，養成寫測試的習慣才是那個要花一輩子的。
