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
            'ts/no-unused-vars': 'off', // 關閉 ts/no-unused-vars 規則
            'ts/strict-boolean-expressions': 'off',
            'ts/consistent-type-imports': 'off', // 關閉 ts/consistent-type-imports 規則
            'unused-imports/no-unused-vars': 'off',
            'no-console': 'off'
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
