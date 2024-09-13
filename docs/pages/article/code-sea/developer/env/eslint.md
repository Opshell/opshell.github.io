// 福大設定
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

// 魚大
我是繼承 antfu 的設定再微調

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

tsconfig
內容差不多XD，不過我會多加 noUncheckedIndexedAccess

vue 專案的設定
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



說到 tsconfig，分享一篇很不錯的文章
https://www.totaltypescript.com/tsconfig-cheat-sheet