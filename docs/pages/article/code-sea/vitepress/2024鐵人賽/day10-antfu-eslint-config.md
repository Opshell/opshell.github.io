---
title:  'Day10 - antfu/eslint-config'
author: 'Opshell'
createdAt: '2024/09/11'
categories: 'vitepress-thirty-days'
tags:
  - 鐵人賽
  - VitePress
  - env
  - VS Code
editLink: true
isPublished: true
---

![banner10](https://ithelp.ithome.com.tw/upload/images/20240911/20109918gb9KCw4r61.png)

從第二階段開始就會寫一些程式啦~終於開始擠牙膏出來了，
在寫程式之前，我希望有個聰明靈活的小助手可以幫助我這個老眼昏花的碼農，
首先想到的事 `ESLint` + `Prettier` ，以前我也是這樣做的，但是有有億點點值得放棄他的理由，
於是我在 前端群組 裡和各位大佬們討論，想知道他們都是如何解決的，
於是得到了今天的關鍵字 `antfu/eslint-config` 安東尼大的 `ESLint` 解決方案!
就讓我們開始設定吧~

## 安裝 @antfu/eslint-config
由於更新的版本好像有點問題，在發文的今天我還是使用目前相對穩定的版本：
```sh
yarn add @antfu/eslint-config@2.24.1 -D
```
```sh
yarn add eslint@9.5.0
```

## eslint.config.js
在根目錄下新增 `eslint.config.js`，由於 `@antfu/eslint-config` 支援開箱即用，所以如果需求不高，只想要有個簡單的小精靈，可以做到這邊就好。
```js
import antfu from '@antfu/eslint-config';

export default antfu();
```

## 客製 ESLint 規則
Opshell 需要這個小精靈可以完全符合我的習慣，所以我們做一些設定，並新增 `tsconfig.json` 吧：
::: code-group
```js [eslint.config.js]
import antfu from '@antfu/eslint-config';

export default antfu({ // General rules
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    // Customize the stylistic rules
    stylistic: {
        indent: 4, // 2, 4, or 'tab'
        quotes: 'single' // single or 'double'
    },

    // `.eslintignore` is no longer supported in Flat config, use `ignores` instead
    ignores: [
        '**/node_modules',
        '**/resource',
        '**/.vitepress/cache',
        '**/.vitepress/dist'
    ],

    yaml: false,
    jsonc: false,
    vue: true,
    typescript: {
        tsconfigPath: 'tsconfig.json'
    }
});
```

```json [tsconfig.json]
{
    "compilerOptions": {
        "target": "ESNext",
        "baseUrl": ".",
        "module": "ESNext",
        "moduleResolution": "Bundler",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "allowImportingTsExtensions": false,
        "paths": {
            "@/*": ["./docs/*"],
            "@vitepress/*": ["./docs/.vitepress/*"],
        }
    },
    "include": [
        "docs/.vitepress/*.mts",
        "docs/.vitepress/theme/*.ts",
        "docs/.vitepress/theme/**/*.ts",
        "docs/.vitepress/theme/**/*.vue",
    ],
    "exclude": [
        "node_modules",
        "resource",
    ]
}
```
:::

## 進階設定
上面的設定可以讓一些我想做的效果出來了，例如我要4個空白當縮排、單引號當字串的包，等等，但是接下來 Opshell 想要結尾強制有分號，一開始想得很簡單，直接把參數加在 `stylistic` 就可以了吧，全錯、大爆炸，文件翻到爛才搞定。<br />
得益於[ESLint Flat](https://eslint.org/docs/latest/use/configure/configuration-files)我們可以在一般設定下面在新增一個物件區塊，Opshell 用來表達預設的程式風格和規則：
```js [eslint.config.js]
import antfu from '@antfu/eslint-config';

export default antfu(
    { // General rules
        env: {
            browser: true,
            es2021: true,
            node: true
        },
        // Customize the stylistic rules
        stylistic: {
            indent: 4, // 2, 4, or 'tab'
            quotes: 'single' // single or 'double'
        },

        // `.eslintignore` is no longer supported in Flat config, use `ignores` instead
        ignores: [
            '**/node_modules',
            '**/resource',
            '**/.vitepress/cache',
            '**/.vitepress/dist'
        ],

        yaml: false,
        jsonc: false,
        vue: true,
        typescript: {
            tsconfigPath: 'tsconfig.json'
        }
    },
    { // Without `files`, they are general rules for all files // [!code ++]
        rules: { // [!code ++]
            'style/semi': ['error', 'always'], // 結束需要分號 // [!code ++]
            'style/comma-dangle': ['error', 'never'], // 關閉末尾陣列尾隨逗號 // [!code ++]
            'style/brace-style': ['error', '1tbs', { allowSingleLine: true }], // 大括號風格 // [!code ++]
            'ts/no-unused-vars': 'off', // 關閉 ts/no-unused-vars 規則 // [!code ++]
            'ts/strict-boolean-expressions': 'off', // [!code ++]
            'ts/consistent-type-imports': 'off', // 關閉 ts/consistent-type-imports 規則 // [!code ++]
            'unused-imports/no-unused-vars': 'off', // [!code ++]
            'no-console': 'off' // [!code ++]
        } // [!code ++]
    } // [!code ++]
);
```
原來 ESLint Flat 的規則要求我們要顯示，提供規則的外掛名稱，<br />
所以一開始寫 `'semi': ['error', 'always']` ，完全沒反應，<br />
知道了之後改成了 `'@stylistic/semi': ['error', 'always']`<br />
抱歉，還是不行，原來 `antfu/eslint-config` [重新命名](https://github.com/antfu/eslint-config?tab=readme-ov-file#plugins-renaming)(可參考)了外掛，<br />
也就是說我們要寫成 `'style/semi': ['error', 'always']`<br />
終於~ 大成功~

## 針對 .vue 類型檔案設定
通用規則寫完了之後，有億些想要針對 `vue` 檔做得規則，我們可以用下列的方式加起來：
```js [eslint.config.js]
import antfu from '@antfu/eslint-config';

export default antfu(
    { // General rules
        env: {
            browser: true,
            es2021: true,
            node: true
        },
        // Customize the stylistic rules
        stylistic: {
            indent: 4, // 2, 4, or 'tab'
            quotes: 'single' // single or 'double'
        },

        // `.eslintignore` is no longer supported in Flat config, use `ignores` instead
        ignores: [
            '**/node_modules',
            '**/resource',
            '**/.vitepress/cache',
            '**/.vitepress/dist'
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
            'style/semi': ['error', 'always'], // 結束需要分號
            'style/comma-dangle': ['error', 'never'], // 關閉末尾陣列尾隨逗號
            'style/brace-style': ['error', '1tbs', { allowSingleLine: true }], // 大括號風格
            'ts/no-unused-vars': 'off', // 關閉 ts/no-unused-vars 規則
            'ts/strict-boolean-expressions': 'off',
            'ts/consistent-type-imports': 'off', // 關閉 ts/consistent-type-imports 規則
            'unused-imports/no-unused-vars': 'off',
            'no-console': 'off'
        }
    },
    { // 某些規則僅在特定文件中啟用，例如，規則僅在檔中啟用，規則僅在檔中啟用。如果要覆寫規則，則需要指定檔案延伸名稱：ts/*.tsvue/*.vue // [!code ++]
        files: ['**/*.vue'], // [!code ++]
        rules: { // [!code ++]
            // https://eslint.vuejs.org/rules/script-indent // [!code ++]
            'vue/script-indent': ['error', 4, { // [!code ++]
                baseIndent: 1, // [!code ++]
                switchCase: 1, // [!code ++]
                ignores: [] // [!code ++]
            }], // [!code ++]
            'style/indent': 'off', // 關閉 style/indent 規則，避免和 vue/script-indent 衝突 // [!code ++]
            'vue/operator-linebreak': ['error', 'before'], // [!code ++]
            'vue/html-closing-bracket-newline': ['error', { // html '>' 標籤  如果斷行  怎麼處理 // [!code ++]
                singleline: 'never', // [!code ++]
                multiline: 'always', // [!code ++]
                selfClosingTag: { // [!code ++]
                    singleline: 'never', // [!code ++]
                    multiline: 'always' // [!code ++]
                } // [!code ++]
            }], // [!code ++]
            'vue/html-self-closing': ['error', { // [!code ++]
                html: { // [!code ++]
                    void: 'always', // [!code ++]
                    normal: 'always', // [!code ++]
                    component: 'always' // [!code ++]
                }, // [!code ++]
                svg: 'always', // [!code ++]
                math: 'always' // [!code ++]
            }] // [!code ++]
        } // [!code ++]
    } // [!code ++]
);
```

要針對 `.md` 的規則也可以利用這個方式加起來
```js
import antfu from '@antfu/eslint-config';

export default antfu(
    // 省略一堆...
    {
        files: ['**/*.md'],
        rules: {
            'no-irregular-whitespace': 'off' // MarkDown 文件中不檢查全形空格
        }
    }
);
```
---

::: tip tsconfig 在 vitepress 專案的陷阱：
可能有看官發現，Opshell 的 `tsconfig.json` `include` 都有具名 docs 而不是一般的 **，這是為什麼呢?
這是因為，`tsconfig` 其實有預設作用域 `src` 但是呢 `VitePress` 專案裡的資源目錄並不是用 `src` (除非一開始生專案的時候有特別改啦) 而是用 `docs`，所以需要具名 `docs` ，不然 `tsconfig` 會找不到檔案喔。
:::

## VS Code 安裝 [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) 外掛。
安裝完之後，在 `settings.json` 加入下面的設定：
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
    "eslint.validate": [
        "javascript",
        "typescript",
        "vue",
        "html",
        "markdown",
        "json",
        "xml",
        "css",
        "scss",
    ],
}
```

## 小結
好的今天完成了針對 `ESLint` 的設定了，
研究的時候花一堆時間，寫成文章就短短的幾千字，閱讀速度快的朋友大概不用10分鐘就看完了，感到心情複雜。
不過這也是我寫部落格的初衷之一，希望可以給設定環境苦手的朋友一點幫助。
各位看官晚安。
