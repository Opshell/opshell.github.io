import antfu from '@antfu/eslint-config';

// @antfu/eslint-config 9.x。規則前綴：style/（stylistic）、ts/、vue/、import/、unused-imports/、jsdoc/
export default antfu(
    {
        stylistic: {
            indent: 4,
            quotes: 'single',
            semi: true
        },
        vue: true,
        typescript: {
            tsconfigPath: 'tsconfig.json' // 開型別感知的規則
        },
        yaml: false,
        jsonc: false,
        // 文章的 markdown 不是程式：程式碼區塊是教學內容，不能被 --fix 改掉
        markdown: false,
        ignores: [
            'node_modules',
            'dist',
            'certs',
            'docs/.vitepress/cache',
            'docs/.vitepress/dist',
            'docs/pages/**', // 文章與頁面 md
            'docs/devlog/**', // 開發記錄
            'docs/types/**', // unplugin 自動產生的 d.ts
            'resource/**', // 草稿與參考資料
            'photos/**'
        ]
    },
    { // 全部檔案
        rules: {
            'no-console': ['warn'],
            'curly': ['error', 'multi-line'], // if else while 花括號：多行才要
            'no-restricted-syntax': 'off',

            // 這個倉庫刻意的寫法，跟 antfu 預設相反：單行 if、頂層用 const 箭頭函式、事件名 kebab-case
            'antfu/if-newline': 'off',
            'antfu/top-level-function': 'off',
            'vue/custom-event-name-casing': 'off',
            // 事件處理函式常寫在生命週期後面，只要不在同一層先用到就好
            'ts/no-use-before-define': ['error', { functions: false, classes: false, variables: false }],
            // 這些正則只在建置時跑我們自己的 markdown，ReDoS 不是問題
            'regexp/no-super-linear-backtracking': 'off',

            'style/semi': ['error', 'always'], // 結尾要分號
            'style/comma-dangle': ['error', 'never'], // 沒有尾逗號
            'style/brace-style': ['error', '1tbs', { allowSingleLine: true }],
            'style/max-statements-per-line': ['error', { max: 2 }],

            'unused-imports/no-unused-vars': 'off',
            'ts/no-unused-vars': 'off',
            'ts/strict-boolean-expressions': 'off',
            'ts/consistent-type-imports': 'off',

            // [+] 型別感知的 unsafe 規則先關，等 any 清乾淨再開
            'ts/no-unsafe-return': 'off',
            'ts/no-unsafe-assignment': 'off',
            'ts/no-unsafe-argument': 'off',
            'ts/no-unsafe-member-access': 'off',
            'ts/no-unsafe-call': 'off',
            'ts/no-floating-promises': 'off',

            // features 只能從 index.ts 引用（FSD 的 public API）
            'no-restricted-imports': ['error', { patterns: ['@/features/*/*', '@features/*/*'] }],
            'jsdoc/multiline-blocks': 'off' // 註解標題可以在第一行
        }
    },
    { // Node 腳本：印東西是它的工作
        files: ['scripts/**'],
        rules: { 'no-console': 'off' }
    },
    { // .vue：script 與 style 內容多縮一層、標籤自閉合、多行標籤的 > 換行
        files: ['**/*.vue'],
        rules: {
            'vue/script-indent': ['error', 4, { baseIndent: 1, switchCase: 1, ignores: [] }],
            'vue/singleline-html-element-content-newline': 'off', // <td>{{ x }}</td> 這種一行就好
            'style/indent': 'off', // 跟 vue/script-indent 衝突
            'vue/require-valid-default-prop': 'off', // Vue 3.5 可解構 props，[] 就好
            'vue/operator-linebreak': ['error', 'before'],
            'vue/html-closing-bracket-newline': ['error', {
                singleline: 'never',
                multiline: 'always',
                selfClosingTag: { singleline: 'never', multiline: 'always' }
            }],
            'vue/html-self-closing': ['error', {
                html: { void: 'always', normal: 'always', component: 'always' },
                svg: 'always',
                math: 'always'
            }]
        }
    }
);
