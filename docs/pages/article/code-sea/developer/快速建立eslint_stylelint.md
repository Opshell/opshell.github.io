---
title: Ops's 團隊程式碼格式化 TLS
image: ''
author: Opshell
createdAt: '2024-10-21'
categories:
  - env
tags:
  - eslint
  - stylelint
  - env
editLink: false
isPublished: true
description: ''
keywords: ''
---
## 需安裝的套件

- 之前穩定版
``` sh
yarn add

@antfu/eslint-config@2.24.1
eslint@9.5.0
postcss@8.4.47
postcss-html@1.7.0
postcss-scss@4.0.9
sass@1.71.1
stylelint@16.9.0
stylelint-config-standard-scss@13.1.0
stylelint-config-standard-vue@1.0.0
stylelint-order@6.0.4

-D
```

- 配套 vue 升級3.5 版
``` sh
yarn add

@antfu/eslint-config@3.8.0
eslint@9.13.0
postcss@8.4.47
postcss-html@1.7.0
postcss-scss@4.0.9
sass@1.71.1
stylelint@16.9.0
stylelint-config-standard-scss@13.1.0
stylelint-config-standard-vue@1.0.0
stylelint-order@6.0.4

-D
```

### .vscode/settings.json
```json
{
    // Disable the default formatter, use eslint instead
    "prettier.enable": false,
    "editor.formatOnSave": false, //存檔時自動格式化
    "editor.formatOnSaveMode": "file", // 格式化範圍

    // Auto fix
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": "explicit",
        "source.fixAll.stylelint": "explicit",
        "source.organizeImports": "never"
    },

    "eslint.experimental.useFlatConfig": true, // 使用扁平化配置
    // Silent the stylistic rules in you IDE, but still auto fix them
    "eslint.rules.customizations": [
        { "rule": "style/*", "severity": "off", "fixable": true },
        { "rule": "format/*", "severity": "off", "fixable": true },
        { "rule": "*-indent", "severity": "off", "fixable": true },
        { "rule": "*-spacing", "severity": "off", "fixable": true },
        { "rule": "*-spaces", "severity": "off", "fixable": true },
        { "rule": "*-order", "severity": "off", "fixable": true },
        { "rule": "*-dangle", "severity": "off", "fixable": true },
        { "rule": "*-newline", "severity": "off", "fixable": true },
        { "rule": "*quotes", "severity": "off", "fixable": true },
        { "rule": "*semi", "severity": "off", "fixable": true }
    ],

    // Enable eslint for all supported languages
    "eslint.validate": [
        "javascript",
        "javascriptreact",
        "typescript",
        "typescriptreact",
        "vue",
        "html",
        "markdown",
        "json",
        "jsonc",
        "yaml",
        "toml",
        "xml",
        "gql",
        "graphql",
        "astro",
        "css",
        "less",
        "scss",
        "pcss",
        "postcss"
    ],

    "stylelint.config": null, // 使用 stylelint 的設定檔
    "stylelint.enable": true, // 啟用 stylelint
    "stylelint.validate": [
        "postcss",
        "css",
        "scss",
        "vue",
        "html",
    ],
}
```

### 根目錄檔案
::: code-group
```js [eslint.config.js]
import antfu from '@antfu/eslint-config';

export default antfu(
    { // General rules
        env: {
            browser: true,
            es2021: true,
            node: true
        },
        stylistic: {
            indent: 4, // 2, 4, or 'tab'
            quotes: 'single' // single or 'double'
        },
        // `.eslintignore` is no longer supported in Flat config, use `ignores` instead
        ignores: [
            'node_modules',
            'certs',
            'dist'
        ],

        yaml: false,
        jsonc: false,
        vue: true,
        typescript: {
            tsconfigPath: 'tsconfig.json'
        }
    },
    { // Without `files`, they are general rules for all files
        rules: {
            'no-console': 'off',
            'curly': ['error', 'multi-line'], // if else while 花括號&單行 風格
            // max-statements-per-line

            'style/semi': ['error', 'always'], // 結束需要分號
            'style/comma-dangle': ['error', 'never'], // 關閉末尾陣列尾隨逗號
            'style/brace-style': ['error', '1tbs', { allowSingleLine: true }], // 大括號風格
            'style/max-statements-per-line': ['error', { max: 2 }], // 單行最大語句數
            // 'style/nonblock-statement-body-position': ['error', 'beside'], // if 單行風格

            'unused-imports/no-unused-vars': 'off',

            'ts/no-unused-vars': 'off', // 關閉 ts/no-unused-vars 規則
            'ts/strict-boolean-expressions': 'off',
            'ts/consistent-type-imports': 'off', // 關閉 ts/consistent-type-imports 規則

            // [+]再找時間處理 no-unsafe
            'ts/no-unsafe-return': 'off', // 關閉 no-unsafe-return 規則
            'ts/no-unsafe-assignment': 'off', // 關閉 no-unsafe-assignment 規則
            'ts/no-unsafe-argument': 'off', // 關閉 no-unsafe-assignment 規則
            'ts/no-unsafe-member-access': 'off', // 關閉 no-unsafe-member-access 規則
            'ts/no-floating-promises': 'off' // 關閉 no-floating-promises 規則   [+]router.push() 會有問題
        }
    },
    { // 某些規則僅在特定文件中啟用，例如，規則僅在檔中啟用，規則僅在檔中啟用。如果要覆寫規則，則需要指定檔案延伸名稱：ts/*.tsvue/*.vue
        files: ['**/*.vue'],
        rules: {
            // https://eslint.vuejs.org/rules/script-indent
            'vue/script-indent': ['error', 4, {
                baseIndent: 1,
                switchCase: 1,
                ignores: []
            }],
            'style/indent': 'off', // 關閉 style/indent 規則，避免和 vue/script-indent 衝突
            'vue/operator-linebreak': ['error', 'before'],
            'vue/html-closing-bracket-newline': ['error', { // html '>' 標籤  如果斷行  怎麼處理
                singleline: 'never',
                multiline: 'always',
                selfClosingTag: {
                    singleline: 'never',
                    multiline: 'always'
                }
            }],
            'vue/html-self-closing': ['error', {
                html: {
                    void: 'always',
                    normal: 'always',
                    component: 'always'
                },
                svg: 'always',
                math: 'always'
            }]
        }
    },
    {
        files: ['**/*.md'],
        rules: {
            'no-irregular-whitespace': 'off' // MarkDown 文件中不檢查全形空格
        }
    }
);
```

``` [.stylelintignore]
node_modules/**
certs/**
dist/**
```

```js [.stylelintrc.mjs]
/** @type {import('stylelint').Config} */
export default {
    extends: [
        'stylelint-config-standard-scss',
        'stylelint-config-standard-vue/scss'
    ],
    plugins: [
        'stylelint-order'
    ],
    rules: {
        'order/order': [
            'custom-properties',
            'declarations'
        ],
        'order/properties-order': [
            'content',
            // 定位與形式
            'position',
            'inset',
            'top',
            'right',
            'bottom',
            'left',
            'grid-area',
            'flex-grow',
            'flex-shrink',
            'place-self',
            'align-self',
            'justify-self',
            'display',
            'flex',
            'flex-direction',
            'flex-wrap',
            'flex-flow',
            'flex-basis',
            'order',
            'grid',
            'grid-template',
            'grid-template-areas',
            'grid-template-columns',
            'grid-template-rows',
            'grid-row',
            'grid-row-start',
            'grid-row-end',
            'grid-column',
            'grid-column-start',
            'grid-column-end',
            'grid-auto-rows',
            'grid-auto-columns',
            'grid-auto-flow',
            'grid-gap',
            'grid-row-gap',
            'grid-column-gap',
            'gap',
            'row-gap',
            'column-gap',
            'align-content',
            'align-items',
            'justify-content',
            'justify-items',
            'float',
            'clear',
            // 盒模型
            'background',
            'background-color',
            'background-image',
            'background-repeat',
            'background-position',
            'background-size',
            'background-attachment',
            'background-clip',
            'background-origin',
            'background-blend-mode',
            'backdrop-filter',
            'clip',
            'clip-path',
            'width',
            'min-width',
            'max-width',
            'height',
            'min-height',
            'max-height',
            'padding',
            'padding-top',
            'padding-left',
            'padding-right',
            'padding-bottom',
            'border',
            'border-top',
            'border-right',
            'border-bottom',
            'border-left',
            'border-width',
            'border-top-width',
            'border-right-width',
            'border-bottom-width',
            'border-left-width',
            'border-style',
            'border-top-style',
            'border-right-style',
            'border-bottom-style',
            'border-left-style',
            'border-color',
            'border-top-color',
            'border-right-color',
            'border-bottom-color',
            'border-left-color',
            'border-radius',
            'border-top-left-radius',
            'border-top-right-radius',
            'border-bottom-right-radius',
            'border-bottom-left-radius',
            'box-sizing',
            'outline',
            'outline-width',
            'outline-style',
            'outline-color',
            'outline-offset',
            'margin',
            'margin-top',
            'margin-left',
            'margin-right',
            'margin-bottom',
            'box-shadow',
            'drop-shadow',
            // 文字
            'color',
            'font',
            'font-family',
            'font-size',
            'font-weight',
            'font-style',
            'font-variant',
            'font-size-adjust',
            'font-stretch',
            'font-effect',
            'font-emphasize',
            'font-emphasize-position',
            'font-emphasize-style',
            'font-smooth',
            'line-height',
            'letter-spacing',
            'word-spacing',
            'white-space',
            'text-align',
            'text-align-last',
            'text-transform',
            'text-decoration',
            'text-emphasis',
            'text-emphasis-color',
            'text-emphasis-style',
            'text-emphasis-position',
            'text-indent',
            'text-justify',
            'text-outline',
            'text-wrap',
            'text-overflow',
            'text-overflow-ellipsis',
            'text-overflow-mode',
            'text-orientation',
            'text-shadow',
            'vertical-align',
            'word-wrap',
            'word-break',
            'overflow-wrap',
            'tab-size',
            'hyphens',
            'vertical-align',
            // 列表
            'list-style',
            'list-style-type',
            'list-style-position',
            'list-style-image',
            'pointer-events',
            'cursor',
            // 特效相關
            'transform',
            'transform-origin',
            'transform-style',
            'transform-box',
            'transform-origin-x',
            'transform-origin-y',
            'transform-origin-z',
            'transition',
            'transition-delay',
            'transition-timing-function',
            'transition-duration',
            'transition-property',
            'animation',
            'animation-name',
            'animation-duration',
            'animation-timing-function',
            'animation-delay',
            'animation-iteration-count',
            'animation-direction',
            'animation-fill-mode',
            'animation-play-state',
            'visibility',
            'overflow',
            'overflow-x',
            'overflow-y',
            'overflow-scrolling',
            'filter',
            'opacity',
            'z-index'
        ],
        'at-rule-no-unknown': null, // 允許未知的 at 規則。
        'rule-empty-line-before': null, // 規則之前必須始終有一個空行。
        'block-no-empty': true, // 不允許空塊。
        'comment-no-empty': true, // 不允許空註解。
        'length-zero-no-unit': true, // 不允許使用零長度的單位（可自動修復）。
        'declaration-block-single-line-max-declarations': 1, // 單行 CSS block 的最參數數量。
        'at-rule-empty-line-before': 'never', // at(@) 規則之前必須始終有一個空行。
        // 'selector-class-pattern': '^[a-z][a-zA-Z0-9]+$', // 類選擇器的命名模式。
        'selector-class-pattern': null, // 類選擇器的命名模式。
        'property-no-vendor-prefix': null, // 禁止屬性的供應商前綴。
        'value-no-vendor-prefix': null, // 禁止值的供應商前綴。
        'selector-attribute-quotes': 'never', // 不用給屬性選擇器的引號。
        'declaration-empty-line-before': 'never', // 在屬性之前不允許空行。
        'color-function-notation': null, // 不限制色彩函數的表示法。
        'scss/at-mixin-argumentless-call-parentheses': 'always', // 在 mixin 調用時，要求省略空參數的括號。
        'scss/at-mixin-pattern': null, // mixin 的命名模式。
        'scss/dollar-variable-pattern': null, // 變數的命名模式。
        'scss/percent-placeholder-pattern': null, // 繼承型變數的命名模式。
        'value-keyword-case': null, // 屬性值的大小寫。

        'no-descending-specificity': null, // 低權重選擇器無法宣告在高權重選擇器之後。(檢測邏輯不夠完善 不開啟)
        'custom-property-empty-line-before': null, // CSS 屬性 之前不允許空行。
        'custom-property-pattern': null // 自定義屬性的命名模式。
        // 'at-rule-no-unknown': [
        //     true,
        //     {
        //         ignoreAtRules: ['mixin', 'include', 'function', 'return', 'extend', 'at-root', 'if', 'else', 'for', 'each', 'while', 'content', 'import', 'use', 'forward', 'tailwind', 'apply', 'screen', 'layer', 'variants', 'responsive', 'media', 'apply']
        //     }
        // ],
    },
    overrides: [
        {
            files: ['*.vue', '**/*.vue']
        }
    ],
    ignoreFiles: ['**/*.js', '**/*.jsx', '**/*.tsx', '**/*.ts', '**/*.json', 'node_modules/', 'dist/']
};
```

```json [tsconfig.json]
{
    "compilerOptions": {
        "paths": {
            "@/*": ["./src/*"]
        },
        "types": ["vite/client", "node"],
        "target": "ES2020",
        "useDefineForClassFields": true,
        "module": "ESNext",
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "skipLibCheck": true,

        /* Bundler mode */
        "moduleResolution": "bundler",
        "allowImportingTsExtensions": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "noEmit": true,
        "jsx": "preserve",

        /* Linting */
        "strict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noFallthroughCasesInSwitch": true
    },
    "include": [
        "src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue", "src/types/*.d.ts",
        "__test__/*.spec.ts"
    ],
    "references": [{ "path": "./tsconfig.node.json" }]
}

```

```json [tsconfig.node.json]
{
    "compilerOptions": {
        "composite": true,
        "skipLibCheck": true,
        "module": "ESNext",
        "moduleResolution": "bundler",
        "allowSyntheticDefaultImports": true
    },
    "include": ["vite.config.ts"]
}

```
:::

## VS Code 套件
### 必要
1. [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
2. [Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint)

### 推薦
1. [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens)
2. [ESLint Chinese Rules](https://marketplace.visualstudio.com/items?itemName=maggie.eslint-rules-zh-plugin)

## package.json script 指令
```
{
    "lint": "eslint . --fix",
    "lint:style": "stylelint --fix '**/*.{css,scss,vue}' --fix"
}
```
