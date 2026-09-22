/* eslint-disable antfu/no-top-level-await */
import fs from 'node:fs';
import path from 'node:path';
import container from 'markdown-it-container';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';

import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import { DefaultTheme, defineConfig } from 'vitepress';
import { renderSandbox } from 'vitepress-plugin-sandpack';

import { buildSiteData, iSiteData } from '../shared/hooks/useBuildSiteData';
import { absolutePath, getFrontMatter, isDirectory } from '../shared/hooks/useFrontMatter';
import { getSidebar } from '../shared/hooks/useGetSidebar';

import nav from './theme/configs/nav';
import search from './theme/configs/search';
import socialLinks from './theme/configs/socialLinks';

const startPathDir = path.resolve(__dirname, '../pages'); // 把pages 設定成根目錄
const mdFiles = fs.readdirSync(startPathDir); // 讀取目錄下的資料夾&文件

interface iThemeConfig extends DefaultTheme.Config {
    siteData: iSiteData
}

const siteData = await buildSiteData(startPathDir);
// const themeLocalStorageKey = 'vitepress-theme-appearance';

// https://vitepress.dev/reference/site-config
export default defineConfig({
    // lang: 'en',
    lang: 'zh-Hant',
    title: 'Opshell\'s Blog',
    description: 'Opshell\'s work and life records.',
    sitemap: {
        hostname: 'https://opshell.github.io',
        transformItems: (items) => {
            return items.map((item) => {
                const { url } = item;
                const filepath = absolutePath(url.replace('.html', '.md'));

                if (!isDirectory(filepath)) {
                    const frontmatter = getFrontMatter(filepath);

                    if (frontmatter.isPublished) {
                        const { sitemap } = frontmatter as { sitemap?: { changefreq?: string, priority?: number } };
                        item.changefreq = (sitemap?.changefreq as any) || 'yearly';
                        item.priority = sitemap?.priority || 0.6;

                        return item;
                    }
                }
                return false;
            })
            // 利用 typeof items[number] 抓取引數 items 的元素型別
            // 用 NonNullable 排除掉 false / null / undefined
            .filter((item): item is NonNullable<typeof items[number]> => !!item);
        }
    },
    head: [
        ['link', { rel: 'icon', href: '/favicon.ico' }],
        ['meta', { name: 'google-site-verification', content: 'dGLNijJ_wb3p1_OyBLI_t8GbiJ4W8CdjIlbB7N8pkt8' }]
        // [
        //     'script',
        //     { id: 'check-theme' },
        //     `
        //         const theme = localStorage.getItem('${themeLocalStorageKey}');
        //         if (!theme) {
        //             localStorage.setItem('${themeLocalStorageKey}', 'light');
        //         }
        //     `
        // ],
        // ['script', {defer: 'true', src: 'https://vercount.one/js'}] // vercount
    ],
    rewrites: { // 我们在nav設定的連結應該要是重寫後的路徑
        'pages/(.*)': '(.*)'
    },
    // features/ 裡的 md 是元件的開發說明，不是頁面；不排除的話 sitemap 會照 pages/ 的路徑去找它而 ENOENT
    // devlog/ 是跟 Claude 的開發記錄，有後台的細節，不建成頁面
    srcExclude: ['features/**/*.md', 'devlog/**'],
    themeConfig: {
        siteData,
        // siteTitle: 'Opshell\'s Blog',
        logo: {
            light: '/logo.jpg',
            dark: '/logo-w.jpg',
            alt: 'Opshell Logo'
        },

        nav,
        socialLinks,
        search,
        sidebar: {
            '/article/code-sea/developer/': [{
                text: 'Developer',
                items: await getSidebar('/article/code-sea/developer')
            }],
            '/article/code-sea/html/': [{
                text: 'HTML',
                items: await getSidebar('/article/code-sea/html')
            }],
            '/article/code-sea/css/': [{
                text: 'CSS',
                items: await getSidebar('/article/code-sea/css')
            }],
            '/article/code-sea/javascript/': [{
                text: 'Javascript',
                items: await getSidebar('/article/code-sea/javascript')
            }],
            '/article/code-sea/typescript/': [{
                text: 'Typescript',
                items: await getSidebar('/article/code-sea/typescript')
            }],
            '/article/code-sea/vue/': [{
                text: 'Vue',
                items: await getSidebar('/article/code-sea/vue')
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
    } as unknown as iThemeConfig,
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
            // 避開 markdown-it 版本差異造成的深層型別檢查錯誤 (jump 屬性缺失)
            md.use(container as any, 'sandbox', {
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

            // [-]添加一個把 -|文字|- 轉成 <span class="mark">文字</span> 的規則
            md.inline.ruler.before('emphasis', 'mark', (state, silent) => {
                const start = state.pos;

                // 確認當前字符是否是 `-|`
                if (state.src.charCodeAt(start) !== 0x2D) { return false; } /* - */
                if (state.src.charCodeAt(start + 1) !== 0x7C) { return false; }/* | */ // 2D

                // 使用正則表達式匹配 `-|文字|-`
                const match = state.src.slice(start).match(/-\|([^|]+)\|-/);
                if (!match) { return false; }
                if (silent) { return true; }

                // 計算結束位置
                const end = start + match[0].length;

                // 插入開頭和文字 token
                const tokenOpen = state.push('mark_open', 'span', 1);
                tokenOpen.markup = '-|';

                const tokenText = state.push('text', '', 0);
                tokenText.content = match[1]; // 這裡是匹配到的內容

                const tokenClose = state.push('mark_close', 'span', -1);
                tokenClose.markup = '|-';

                // 更新狀態位置
                state.pos = end;
                return true;
            });
            md.renderer.rules.span_open = (tokens, idx, options, env, slf) => {
                return `<span class="mark">`; // 這裡可以自定義 class
            };
            md.renderer.rules.span_close = (tokens, idx, options, env, slf) => {
                return `</span>`;
            };

            // [-] 自定義 Quote 容器
            md.use(container as any, 'quote', {
                render(tokens: any[], idx: number) {
                    const m = tokens[idx].info.trim().match(/^quote\s*(.*)$/);

                    if (tokens[idx].nesting === 1) {
                        const author = m ? m[1] : '';
                        // 注意：這裡我把 figcaption 放在最上面，帶有 data-text
                        return `<figure class="custom-quote">
                                    <figcaption class="quote-author">${author}</figcaption>
                                    <blockquote class="quote-body">`;
                    } else {
                        return `</blockquote></figure>`;
                    }
                }
            });

            // md.renderer.rules.image = (tokens, idx, options, env, self) => {

            //     // console.log('-1', tokens[idx-1]);
            //     // console.log('+1', tokens[idx+1]);

            //     return `<img src="${tokens[idx].attrs![0][1]}" alt="${tokens[idx].content}" />`;
            // };

            // 單行圖片處理
            // md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
            //     return (tokens[idx + 1].type === 'image') ? '' : '<p>';
            // };
            // md.renderer.rules.paragraph_close = (tokens, idx, options, env, self) => {
            //     return (tokens[idx - 1].type === 'image') ? '' : '</p>';
            // };
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
                '@theme': path.resolve(__dirname, './theme'), // .vitepress 目錄

                '@shared': path.resolve(__dirname, '../', 'shared'),
                '@components': path.resolve(__dirname, '../shared/', 'components'),
                '@data': path.resolve(__dirname, '../shared/', 'data'),
                '@hooks': path.resolve(__dirname, '../shared/', 'hooks'),
                '@directives': path.resolve(__dirname, '../shared/', 'directives'),
                '@utils': path.resolve(__dirname, '../shared/', 'utils'),

                '@features': path.resolve(__dirname, '../', 'features'),
                '@pages': path.resolve(__dirname, '../', 'pages'),
                '@photos': path.resolve(__dirname, '../../', 'photos'),
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
                        // vue 3.5.x
                        vue: ['useTemplateRef', 'onWatcherCleanup', 'useId']
                    }
                ],
                dirs: [
                    '../shared/hooks',
                    '../shared/utils'
                ],
                dts: './types/auto-imports.d.ts', // typescript 宣告檔案位置
                vueTemplate: true,
                eslintrc: {
                    enabled: true, // Default `false`
                    filepath: './.eslintrc-auto-import.json',
                    globalsPropValue: true
                }
            }),
            Components({
                dirs: [
                    './shared/components'
                ], // 指定components位置
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
        // 代理伺服器
        server: {
            // https: true,
            // https: {
            //     key: fs.readFileSync('./certs/localhost+2-key.pem'),
            //     cert: fs.readFileSync('./certs/localhost+2.pem'),
            // },
            host: true, // [!]預設是掛載 localhost，設定為 true 可以允許外部連接 (Vite 才能連 Docker Container 的 port)
            port: 8086,
            strictPort: false, // Port被占用時直接退出， false會嘗試連接下一個可用Port
            open: true, // dev時自動打開網頁，也可以給網址指定。
            // 自訂代理規則，配合後端進行Api呼叫等。
            // 預設使用 [http-proxy](https://github.com/http-party/node-http-proxy) 完整設定請見官方
            proxy: {
                '/api': {
                    target: 'http://opshell.info/api/', // Opshell 後端
                    ws: true, // 代理的WebSockets
                    changeOrigin: true, // 允許websockets跨域
                    rewrite: path => path.replace(/^\/api/, '')
                },
                '/oauth': {
                    target: 'https://tzuchi.incku.com.tw/oauth/', // Docker Container 串接
                    ws: true, // 代理的WebSockets
                    changeOrigin: true, // 允許websockets跨域
                    rewrite: path => path.replace(/^\/oauth/, '')
                }
            }
        },
        // 共用全域 SCSS
        css: {
            devSourcemap: true, // scss sourcemap
            preprocessorOptions: {
                scss: {
                    // 啟用現代編譯器 API
                    api: 'modern-compiler',
                    // 加上 as * 保持全域引用
                    additionalData: `@use "@vitepress/theme/scss/mixin.scss" as *;`,
                    // [#] 如果未來有時間：建議建立一個 index.scss 使用 @forward 匯出所有變數與 mixin，然後在需要的地方顯式地 @use
                    charset: false
                    // 如果有第三方套件還是拋出 legacy-js-api 警告，可以強制關閉
                    // silenceDeprecations: ['legacy-js-api'],
                }
            }
        },
        ssr: {
            noExternal: [
                'three',
                '@tresjs/core',
                '@tresjs/cientos',
                '@tresjs/post-processing', // 強制 VitePress 處理
                'postprocessing',
                'd3-force-3d'
            ]
        }
    },
    vue: {
        template: {
            compilerOptions: {
                isCustomElement: (tag) => tag.startsWith('Tres') && tag !== 'TresCanvas',
            },
        },
    } as any,

    ignoreDeadLinks: true
});
