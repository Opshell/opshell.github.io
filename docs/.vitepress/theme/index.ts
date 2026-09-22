import type { Component } from 'vue';
import Tres from '@tresjs/core';
import mediumZoom from 'medium-zoom';
import { Theme, useRoute } from 'vitepress';
import { Sandbox } from 'vitepress-plugin-sandpack';

import DefaultTheme from 'vitepress/theme-without-fonts';

import ExpandLayout from './layout/ExpandLayout.vue';
import LayoutResume from './layout/Resume.vue';

// https://vitepress.dev/guide/custom-theme

import 'vitepress-plugin-sandpack/dist/style.css';

// [-] 字體引用
import './fonts/font.css';

// [-] 全局樣式引用
import './scss/style.scss';

// [-] Svg Icon引用
import 'virtual:svg-icons-register';

const elComponents = import.meta.glob('../../shared/components/el/*.vue', { eager: true });

// 這些頁面不載入第三方的計數腳本：它們手上有 Google 的登入憑證（後台是管理員、帳號頁是使用者本人），
// 不讓外部腳本跑在同一頁。
// 直接打開後台網址時完全不會載入；從別頁點進來的話，前一頁已經執行過的腳本卸不掉，只能不再重新載入。
const NO_THIRD_PARTY_PATHS = ['/dindon/dashboard/', '/dindon/account/'];

function reloadBusuanzi(path: string) {
    const busuanziScriptId = 'busuanzi-script';

    // Remove the existing script if it exists
    const existingScript = document.getElementById(busuanziScriptId);
    if (existingScript) {
        existingScript.remove();
    }

    if (NO_THIRD_PARTY_PATHS.some(prefix => path.startsWith(prefix))) return;

    // Create a new script element
    const script = document.createElement('script');
    script.id = busuanziScriptId;
    script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
    script.async = true;

    // Append the script to the document body
    document.body.appendChild(script);
}

function initZoom() {
    mediumZoom('.vp-doc img', { background: 'var(--vp-c-bg)' });
}

export default {
    extends: DefaultTheme, // 使用 extends 而不是展開運算符 (...) 展開會破壞 DefaultTheme 的結構，特別是 enhanceApp
    Layout: ExpandLayout,
    setup() {
        const route = useRoute();

        onMounted(async () => {
            initZoom();
            reloadBusuanzi(route.path);
        });
        watch(() => route.path, () => {
            void nextTick(() => {
                initZoom();
                reloadBusuanzi(route.path);
            });
        });
    },
    enhanceApp({ app }) {
        // shared/components/el 全域註冊成 <ElXxx>。unplugin-vue-components 在 .vue 裡會自動 import，
        // 但在 markdown 頁面裡解析不到（resume.md 的 ElBtn、文章裡的 ElCheckbox 都變成未知標籤），所以這裡再註冊一次
        for (const [path, module] of Object.entries(elComponents)) {
            const name = path.split('/').pop()!.replace('.vue', '');
            app.component(`El${name}`, (module as { default: Component }).default);
        }
        app.component('resume', LayoutResume);
        app.component('Sandbox', Sandbox);
        app.use(Tres);
    }
} satisfies Theme;
