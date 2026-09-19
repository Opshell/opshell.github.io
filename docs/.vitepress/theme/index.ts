import mediumZoom from 'medium-zoom';
import { Theme, useRoute } from 'vitepress';
import { Sandbox } from 'vitepress-plugin-sandpack';
import DefaultTheme from 'vitepress/theme-without-fonts';

import ExpandLayout from './layout/expandLayout.vue';

import LayoutResume from './layout/resume.vue';
import 'vitepress-plugin-sandpack/dist/style.css';

// https://vitepress.dev/guide/custom-theme

// [-] 字體引用
import './fonts/font.css';

// [-] 全局樣式引用
import './scss/style.scss';

// [-] Svg Icon引用
import 'virtual:svg-icons-register';

import Tres from '@tresjs/core'

// 這些頁面不載入第三方的計數腳本：後台拿著管理員的登入憑證，不讓外部腳本跑在同一頁。
// 直接打開後台網址時完全不會載入；從別頁點進來的話，前一頁已經執行過的腳本卸不掉，只能不再重新載入。
const NO_THIRD_PARTY_PATHS = ['/dindon/dashboard/'];

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
        app.component('resume', LayoutResume);
        app.component('Sandbox', Sandbox);
        app.use(Tres);
    }
} satisfies Theme;
