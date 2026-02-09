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

function reloadBusuanzi() {
    const busuanziScriptId = 'busuanzi-script';

    // Remove the existing script if it exists
    const existingScript = document.getElementById(busuanziScriptId);
    if (existingScript) {
        existingScript.remove();
    }

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
            reloadBusuanzi();
        });
        watch(() => route.path, () => {
            void nextTick(() => {
                initZoom();
                reloadBusuanzi();
            });
        });
    },
    enhanceApp({ app }) {
        app.component('resume', LayoutResume);
        app.component('Sandbox', Sandbox);
        app.use(Tres);
    }
} satisfies Theme;
