import path from 'node:path';
import fs from 'node:fs';
import { DefaultTheme, defineConfig } from 'vitepress';
import container from 'markdown-it-container';
import { renderSandbox } from 'vitepress-plugin-sandpack';

import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';

// import footnote_plugin from 'markdown-it-footnote';
import footnote from 'markdown-it-footnote';

import { getSidebar } from '../hooks/useGetSidebar';
import { getArticleClassification, iClassification } from '../hooks/useArticleClassification';

import nav from './theme/configs/nav';
import socialLinks from './theme/configs/socialLinks';
import search from './theme/configs/search';
import Checkbox from '@/components/el/checkbox.vue';

const startPathDir = path.resolve(__dirname, '../pages'); // 把pages 設定成根目錄
const mdFiles = fs.readdirSync(startPathDir); // 讀取目錄下的資料夾&文件

interface iThemeConfig extends DefaultTheme.Config {
    classification: iClassification
}

const classification = await getArticleClassification(mdFiles, startPathDir);

// https://vitepress.dev/reference/site-config
export default defineConfig({
    // lang: 'zh-Hant',
    lang: 'en',
    title: 'Opshell\'s Blog',
    description: 'Opshell\'s work and life records.',
    head: [
        ['link', { rel: 'icon', href: '/favicon.ico' }]
        // ['script', {defer: 'true', src: 'https://vercount.one/js'}] // vercount
    ],
    rewrites: { // 我们在nav設定的連結應該要是重寫後的路徑
        'pages/(.*)': '(.*)'
    },
    themeConfig: {
        classification,
        // siteTitle: 'Opshell\'s Blog',
        logo: {
            light: '/logo.jpg',
            dark: '/logo-w.jpg',
            alt: 'Opshell Logo'
        },

        // https://vitepress.dev/reference/default-theme-config
        nav,
        socialLinks,
        search,
        sidebar: {
            '/article/code-sea/developer/': [{
                text: 'Developer',
                items: await getSidebar('/article/code-sea/developer')
            }],
            '/article/code-sea/javascript/': [{
                text: 'Jypescript',
                items: await getSidebar('/article/code-sea/javascript')
            }],
            '/article/code-sea/typescript/': [{
                text: 'Typescript',
                items: await getSidebar('/article/code-sea/typescript')
            }],
            '/article/code-sea/vitepress/': [{
                text: 'Vitepress',
                items: await getSidebar('/article/code-sea/vitepress')
            }],
            '/article/life-murmurs/': [{
                text: 'Life\'s Mumurs',
                items: await getSidebar('/article/life-murmurs')
            }]
        },

        outline: {
            level: [2, 4],
            label: '目錄'
        },

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
    } as iThemeConfig,
    markdown: {
        theme: 'one-dark-pro',
        lineNumbers: true,
        container: {
            infoLabel: '細節：',
            tipLabel: '💡 錦囊 [Tips]：',
            warningLabel: '⚡ 注意 [Warning]：',
            dangerLabel: '⛔ 錯誤 [Error]：',
            detailsLabel: '詳細資料 [Details]：'
        },
        attrs: {
            // optional, these are default options
            leftDelimiter: '{',
            rightDelimiter: '}',
            allowedAttributes: [] // empty array = all attributes are allowed
        },
        config: (md) => {
            md.use(footnote);
            interface iFootnoteAnchorTokenMeta {
                id: number
                subId: number
                label: string
            }
            md.renderer.rules.footnote_anchor = function render_footnote_anchor(tokens, idx, options, env, slf) {
                let id = slf.rules.footnote_anchor_name?.(tokens, idx, options, env, slf);
                if ((tokens[idx].meta as iFootnoteAnchorTokenMeta).subId > 0) {
                    id += `:${(tokens[idx].meta as iFootnoteAnchorTokenMeta).subId}`;
                }
                return ` <a href="#fnref${id}" class="footnote-backref"> ⬆️ </a>`;
            };

            md.use(container, 'sandbox', {
                render(tokens: any[], idx: number) {
                    return renderSandbox(tokens, idx, 'sandbox');
                }
            });

            // 在 blockquote 規則前面添加 taskList 規則，透過 function 來解析
            // alt 是這個規則可以打斷的 其他規則，一般不做特別的處理，這裡是直接把 blockquote 的 alt 拿來用。
            md.block.ruler.before('blockquote', 'taskList', (state, startLine, endLine, silent) => {
                const start: number = state.bMarks[startLine] + state.tShift[startLine]; // 行的開始位置
                const max: number = state.eMarks[startLine]; // 行的結束位置

                if (state.src.charCodeAt(start) !== 0x5B) /* [ */
                    return false;
                if (state.src.charCodeAt(start + 2) !== 0x5D) /* ] */
                    return false;

                const content = state.src.substring(start, max); // 取出整段文字
                const reg = /\[(\s|x)\]/;
                const match = content.match(reg);

                if (match && match.length) {
                    let token;
                    const checked = match[1] === 'x';

                    if (silent) { // 解析異常不做反應
                        return true;
                    }

                    token = state.push('task_list_item_open', 'label', 1);
                    token.attrs = [['class', 'task-list--item']];

                    token = state.push('inline', '', 0);
                    token.content = `
                        <input class="task-list--input" type="checkbox" ${checked ? 'checked' : ''} />
                        <span class="task-list--text">${content.replace(reg, '')}</span>
                    `;
                    token.block = true;
                    token.level = state.level;
                    token.children = [];

                    token = state.push('task_list_item_close', 'label', -1);
                }

                state.line = startLine + 1;
                return true;
            }, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });

            md.renderer.rules.task_list_item_open = (tokens, idx, options, env, slf) => {
                return tokens[idx - 1].type !== 'task_list_item_close'
                    ? `<div class="task-list"><label class="task-list--item">`
                    : `<label class="task-list--item">`;
            };
            md.renderer.rules.task_list_item_close = (tokens, idx, options, env, slf) => {
                return tokens[idx + 1].type !== 'task_list_item_open' ? '</label></div>' : '</label>';
            };
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
                '@': path.resolve(__dirname, '../'), // docs 當根目錄
                '@vitepress': path.resolve(__dirname), // .vitepress 目錄
                '@components': path.resolve(__dirname, '../', 'components'),
                '@data': path.resolve(__dirname, '../', 'data'),
                '@hooks': path.resolve(__dirname, '../', 'hooks'),
                '@pages': path.resolve(__dirname, '../', 'pages')

                // '@': new URL('../', import.meta.url).pathname, // docs 當根目錄
                // '@vitepress': new URL('../.vitepress', import.meta.url).pathname, // .vitepress 目錄
                // '@components': new URL('../components', import.meta.url).pathname,
                // '@data': new URL('../data', import.meta.url).pathname,
                // '@pages': new URL('../pages', import.meta.url).pathname
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
                extensions: ['vue', 'md'], // allow auto load markdown components under dirs
                include: [/\.vue$/, /\.vue\?vue/, /\.md$/], // allow auto import and register components used in markdown
                directoryAsNamespace: true, // 允許子目錄作為命名空間
                resolvers: [] // 解析規則
            }),
            createSvgIconsPlugin({
                iconDirs: [path.resolve(__dirname, '../', 'public/icons')], // 指定需要占存的Icon目錄
                // iconDirs: [`${new URL('../public/icons', import.meta.url).href}`], // 指定需要占存的Icon目錄
                symbolId: '[name]', // 指定symbolId格式 預設：'icon-[dir]-[name]
                inject: 'body-last', // | 'body-first' sprite插入位置
                customDomId: '__svg__icons__dom__' // 自訂 Dom ID
            })
        ],
        // 共用全域 SCSS
        css: {
            devSourcemap: true, // scss sourcemap
            preprocessorOptions: {
                scss: {
                    additionalData: `@import "@vitepress/theme/scss/mixin.scss";`,
                    charset: false
                }
            }
        }
    },

    ignoreDeadLinks: true
});
