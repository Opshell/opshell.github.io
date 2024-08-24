import { h } from 'vue';
import { Theme, useRoute } from 'vitepress';
import DefaultTheme from 'vitepress/theme-without-fonts';
import mediumZoom from 'medium-zoom'

import ExpandLayout from './layout/expandLayout.vue';
import LayoutResume from './layout/resume.vue';

// https://vitepress.dev/guide/custom-theme

// [-]字體引用
import './fonts/font.css';

// [-]全局樣式引用
import './scss/style.scss';

// [-]Svg Icon引用
import 'virtual:svg-icons-register';


function reloadBusuanzi() {
    const busuanziScriptId = "busuanzi-script";

    // Remove the existing script if it exists
    const existingScript = document.getElementById(busuanziScriptId);
    if (existingScript) {
      existingScript.remove();
    }

    // Create a new script element
    const script = document.createElement("script");
    script.id = busuanziScriptId;
    script.src = "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";
    script.async = true;

    // Append the script to the document body
    document.body.appendChild(script);
}

export default {
    ...DefaultTheme,
    Layout: ExpandLayout,
    // Layout: () => {
    //     return h(DefaultTheme.Layout, null, {
    //         // https://vitepress.dev/guide/extending-default-theme#layout-slots
    //     });
    // },
    setup() {
        const route = useRoute();

        // 為所有圖片添加縮放功能
        const initZoom = () => {
            mediumZoom('.main img', { background: 'var(--vp-c-bg)' })
        }

        onMounted(async () => {
            initZoom();
            reloadBusuanzi();
        });
        watch(() => route.path, () => {
            nextTick(() => {
                initZoom();
                reloadBusuanzi();
            });
        });
    },
    enhanceApp({ app }) {
        app.component('resume', LayoutResume);
    }
} satisfies Theme;
