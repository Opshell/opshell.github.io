import { defineConfig } from 'vitepress';

import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';

import nav from './theme/configs/nav';
import sidebar from './theme/configs/sidebar';
import socialLinks from './theme/configs/socialLinks';
import search from './theme/configs/search';

// https://vitepress.dev/reference/site-config
export default defineConfig({
    lang: 'zh-Hant',
    title: 'Opshell\'s Blog',
    description: 'Opshell\'s life records.',
    head: [
        ['link', { rel: 'icon', href: '/favicon.ico' }]
    ],
    rewrites: { // 我们在nav設定的連結應該要是重寫後的路徑
        'pages/(.*)': '(.*)'
    },
    themeConfig: {
        siteTitle: 'Opshell\'s Blog',
        logo: {
            light: '/logo.jpg',
            dark: '/logo-w.jpg',
            alt: 'Opshell Logo'
        },

        // https://vitepress.dev/reference/default-theme-config
        nav,
        sidebar,
        socialLinks,
        search,

        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2024-present Opshell'
        },
        lastUpdated: {
            text: 'Last Updated at',
            formatOptions: {
                dateStyle: 'medium',
                timeStyle: 'medium'
            }
        },
        notFound: { // 404
            title: 'Page Not Found ~!!',
            quote: '請檢查網址或目前頁面不開放觀看，使用下方按鈕回到首頁。',
            linkText: '回到首頁'
        },
        externalLinkIcon: true
    },
    markdown: {
        theme: 'one-dark-pro',
        lineNumbers: true,
        container: {
            tipLabel: '提示',
            warningLabel: '警告',
            dangerLabel: '危險',
            infoLabel: '簡述',
            detailsLabel: '詳細'
        }
    },
    transformHead({ assets }) {
        // adjust the regex accordingly to match your font
        ['Roboto', 'NotoSansTC', 'FiraCode'].map((fontName) => {
            const fontFile = assets.find(file => new RegExp(`${fontName}\\-\\w+\\.ttf`).test(file));
            if (fontFile) {
                return [
                    [
                        'link',
                        {
                            rel: 'preload',
                            href: fontFile,
                            as: 'fonts',
                            type: 'fonts/ttf',
                            crossorigin: ''
                        }
                    ]
                ];
            }
            return [];
        });
    },
    vite: {
        resolve: {
            alias: { // 設定別名
                '@': new URL('../', import.meta.url).pathname, // docs 當根目錄
                '@vitepress': new URL('../.vitepress', import.meta.url).pathname, // .vitepress 目錄
                '@components': new URL('../components', import.meta.url).pathname,
                '@data': new URL('../data', import.meta.url).pathname,
                '@pages': new URL('../pages', import.meta.url).pathname
            }
        },
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
            }),
            Components({
                dirs: ['./components'], // 指定components位置 預設是'src/components'
                dts: './types/components.d.ts', // .d.ts生成位置
                extensions: ['vue'],
                directoryAsNamespace: true, // 允許子目錄作為命名空間
                resolvers: [] // 解析規則
            })
            // createSvgIconsPlugin({
            //     iconDirs: [path.resolve(__dirname, '../', 'public/icons')], // 指定需要占存的Icon目錄
            //     symbolId: '[name]', // 指定symbolId格式 預設：'icon-[dir]-[name]

            //     inject: 'body-last', // | 'body-first' sprite插入位置
            //     customDomId: '__svg__icons__dom__' // 自訂 Dom ID
            // })
        ]
    }
});
