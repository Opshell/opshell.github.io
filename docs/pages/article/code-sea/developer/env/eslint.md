---
title: 'ESLint 設定的兩種流派：從 .eslintrc + Prettier 到 flat config 繼承 antfu'
image: ''
description: '比較兩份常見的 ESLint 設定：傳統 .eslintrc 加 Prettier，以及 flat config 繼承 @antfu/eslint-config 再微調。順便整理 tsconfig 的建議與單行 if 的規則設定。'
keywords: ''
author: Opshell
createdAt: '2024-09-13'
categories:
  - 開發環境
tags:
  - ESLint
  - TypeScript
  - Vue
  - env
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把群組裡分享的兩份設定整理成新舊對比，補上 2026 年的 flat config 寫法與 tsconfig 建議。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
有一次大家在群組裡互相分享自己的 `ESLint` 和 `tsconfig` 設定，剛好出現兩種很有代表性的寫法：一種是老派的 `.eslintrc` 加 `Prettier`，一種是 flat config 直接繼承 `@antfu/eslint-config` 再微調。這篇把兩份設定攤開來比較，寫給正在決定「新專案的 `ESLint` 要怎麼設」的人。
:::

## 懶人包
- `ESLint` 9 起預設就是 flat config（`eslint.config.js`／`.ts`），`.eslintrc` 已經是舊時代的東西，新專案不要再用。
- 老派做法是 `ESLint` 管品質、`Prettier` 管格式，兩個要約法好幾章才不會打架。
- 新派做法是繼承 `@antfu/eslint-config`，格式也交給 `ESLint`（Stylistic 規則），一份設定就搞定，再用 `rules` 微調成自己的風格。
- `tsconfig` 記得加 `noUncheckedIndexedAccess`，`moduleResolution` 在 Vite 專案用 `bundler`。
- 想讓 `if (!res) { throw ... }` 可以寫成一行，靠 `curly` 搭配 `max-statements-per-line`。

## 技術拆解

### 流派一：.eslintrc + Prettier
這是 `Vue 3` 剛出來那幾年很典型的設定：

:::code-group
```ts [eslintrc]
module.exports = {
    parser: 'vue-eslint-parser',
    env: {
        node: true
    },
    extends: [
        'plugin:vue/vue3-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended'
    ],
    parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    rules: {
        '@typescript-eslint/no-unused-vars': 0,
        'vue/attribute-hyphenation': 0,
        'vue/v-on-event-hyphenation': 0,
        'vue/multi-word-component-names': 0
    }
};
```

```json [tsconfig]
{
  "compilerOptions": {
    "target": "esnext",
    "useDefineForClassFields": true,
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "jsx": "preserve",
    "allowJs": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "lib": ["esnext", "dom"],
    "skipLibCheck": true,
    "baseUrl": ".",
    "types": ["node", "element-plus/global"]
  },
  "exclude": ["node_modules"],
}
```
:::

重點在 `plugin:prettier/recommended`：它把 `Prettier` 包成一條 `ESLint` 規則，並關掉跟格式有衝突的規則。好處是分工清楚，壞處是兩個工具的責任範圍有重疊，設定一壞就開始互相打架，而且 `Prettier` 的 `printWidth` 很難讓人滿意，這段心路歷程我在 [我和 Prettier 分手了](../../vitepress/2024鐵人賽/day12-prettier-is-not-that-great) 寫過了。

### 流派二：flat config 繼承 antfu 再微調
另一份是「繼承 antfu 的設定再微調」，以下是原汁原味的分享（antfu 預設風格是 2 空格、無分號，所以這兩段長這樣）：

```ts
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    rules: {
      'no-console': 'warn',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': 'warn',
      'style/arrow-parens': ['error', 'always'],
      'style/member-delimiter-style': [
        'error',
        {
          multiline: {
            delimiter: 'semi',
            requireLast: true,
          },
          singleline: {
            delimiter: 'semi',
            requireLast: false,
          },
          multilineDetection: 'brackets',
        },
      ],
      'jsdoc/multiline-blocks': [
        'error',
        {
          noZeroLineText: false,
        },
      ],
    },
  },
  {
    files: ['**/*.json'],
    rules: {
      'style/eol-last': 'off',
    },
  },
)
```

`Vue` 專案的版本，多開了 `unocss`，並針對 `.vue` 檔加了兩條規則：

```ts
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    unocss: true,
  },
  {
    rules: {
      'no-console': 'warn',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': 'warn',
      'style/arrow-parens': ['error', 'always'],
      'style/member-delimiter-style': [
        'error',
        {
          multiline: {
            delimiter: 'semi',
            requireLast: true,
          },
          singleline: {
            delimiter: 'semi',
            requireLast: false,
          },
          multilineDetection: 'brackets',
        },
      ],
      'jsdoc/multiline-blocks': [
        'error',
        {
          noZeroLineText: false,
        },
      ],
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/component-name-in-template-casing': ['error', 'kebab-case', {
        registeredComponentsOnly: true,
        ignores: [],
      }],
      'vue/block-order': ['error', {
        order: [['script', 'template'], 'style'],
      }],
    },
  },
  {
    files: ['**/*.json'],
    rules: {
      'style/eol-last': 'off',
    },
  },
)
```

幾個值得注意的微調：
- `no-console`、`unused-imports/*` 降成 `warn`：開發時不會一直被紅線轟炸，但還是看得到。
- `style/member-delimiter-style`：`interface` 多行時每個成員結尾都要分號，單行時最後一個可以省。
- `vue/block-order`：`.vue` 檔的區塊順序固定為 `<script>`、`<template>`、`<style>`。
- `vue/component-name-in-template-casing`：模板裡的元件名稱用 kebab-case。

`tsconfig` 的內容跟流派一差不多，不過多加了一個 `noUncheckedIndexedAccess`，這個下面會講。

### 兩個流派怎麼選
用搬家比喻：流派一像請兩家搬家公司，一家搬家具、一家搬紙箱，還得先開會講好誰負責冰箱；流派二像找一家包到好的，只要告訴它「書櫃放左邊」就好。

## 例子與對比

### 2026 年的起手式
如果是新的 `Vue` + `TypeScript` 專案，我會直接用流派二，並在 antfu 的 `stylistic` 選項裡改成自己習慣的 4 空格、單引號、要分號：

```ts
// eslint.config.ts
import antfu from '@antfu/eslint-config';

export default antfu(
    {
        vue: true,
        typescript: true,
        stylistic: {
            indent: 4,
            quotes: 'single',
            semi: true
        }
    },
    {
        rules: {
            'no-console': 'warn',
            'style/arrow-parens': ['error', 'always'],
            'style/comma-dangle': ['error', 'never']
        }
    }
);
```

選項名稱與預設值會隨版本調整，以 `@antfu/eslint-config` 的 README 為準。

### 單行 if 的設定
我自己很喜歡把「守門員」型的判斷寫成一行：

```ts
if (!res) { throw new Error('資料取得異常！, 網路錯誤！！'); }
```

但很多預設規則會要求花括號裡的內容一定要換行。加上這兩條就能放行：

```ts
'curly': ['error', 'multi-line'], // if else while 花括號 & 單行風格
'style/max-statements-per-line': ['error', { max: 2 }], // 單行最大語句數
```

`curly` 的 `multi-line` 允許單行時省略或保留花括號，`max-statements-per-line` 放寬到 2，讓 `if` 加上裡面那一句可以待在同一行。

### tsconfig 的兩個更新
流派一的 `tsconfig` 是當年 Vite 範本的樣子，2026 年建議改兩個地方：

```json
{
    "compilerOptions": {
        "moduleResolution": "bundler",
        "noUncheckedIndexedAccess": true
    }
}
```

- `moduleResolution: "bundler"`：讓 TypeScript 用跟 Vite 這類打包工具一樣的方式解析模組（支援 `package.json` 的 `exports`），`node` 是給舊版 Node 的解析方式。
- `noUncheckedIndexedAccess`：`array[0]`、`record[key]` 的型別會自動加上 `| undefined`，逼你處理「可能取不到」的情況。

```ts
const tags: string[] = [];

// 沒開：型別是 string，執行時卻是 undefined
// 有開：型別是 string | undefined，不處理就報錯
const firstTag = tags[0];
console.log(firstTag?.toUpperCase());
```

說到 `tsconfig`，分享一篇很不錯的文章：[TSConfig Cheat Sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet)。

| | 流派一：.eslintrc + Prettier | 流派二：flat config + antfu |
| :--- | :--- | :--- |
| 設定檔格式 | `.eslintrc`（舊格式） | `eslint.config.ts`（flat config） |
| 格式化 | `Prettier` | `ESLint` Stylistic |
| 工具數量 | 兩個，要處理衝突 | 一個 |
| 客製彈性 | `Prettier` 選項很少 | 每條規則都能調 |
| 適合 | 維護中的舊專案 | 新專案 |

## 結論
`ESLint` 設定沒有標準答案，但有時代背景：`.eslintrc` 加 `Prettier` 是那個年代的最佳解，現在 flat config 加上 antfu 這類整合好的設定，已經能用一份設定檔包辦品質和格式。

設定檔就像房間的收納規則，重點不是誰的最漂亮，而是全家人都願意照著放 ~~（還有，不要每換一個專案就重新研究一次）~~。
