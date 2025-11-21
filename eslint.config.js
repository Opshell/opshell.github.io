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
            'no-console': ['warn'],
            'curly': ['error', 'multi-line'], // if else while 花括號&單行 風格
            // max-statements-per-line
            'no-restricted-syntax': 'off', // 關閉 no-restricted-syntax 規則

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
            'ts/no-floating-promises': 'off', // 關閉 no-floating-promises 規則   [+]router.push() 會有問題
            'ts/no-unsafe-call': 'off', // 關閉 no-unsafe-call 規則

            // [-] Features 目錄規劃
            'import/no-restricted-paths': ['error', { // 禁止跨 features 導入
                zones: [
                    {
                        target: './src/features/UIKit',
                        from: './src/features',
                        except: ['./UIKit']
                    }
                ]
            }],
            'no-restricted-imports': ['error', { // 禁止直接引用 features 內的檔案，只開放從 features/index.ts 引用
                patterns: ['@/features/*/*']
            }],
            'import/no-cycle': 'error', // 禁止循環依賴
            'jsdoc/multiline-blocks': 'off' // 讓註解標題可以在第一行
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
            'vue/require-valid-default-prop': 'off', // 配合 Vue3.5 可解構 props 不再需要 () => [] 只要給 [] 就可以了
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
