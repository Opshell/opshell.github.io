import type { Component } from 'vue';
import { recordHit } from '@features/visitor';
import mediumZoom from 'medium-zoom';
import { Theme, useRoute } from 'vitepress';

import DefaultTheme from 'vitepress/theme-without-fonts';

import ExpandLayout from './layout/ExpandLayout.vue';
import LayoutResume from './layout/Resume.vue';

// https://vitepress.dev/guide/custom-theme

// [-] 字體引用
import './fonts/font.css';

// [-] 全局樣式引用
import './scss/style.scss';

// [-] Svg Icon引用
import 'virtual:svg-icons/register';

const elComponents = import.meta.glob('../../shared/components/el/*.vue', { eager: true });

// `::: sandbox` 建置時變成 <Sandbox>，只有兩篇文章用到。Sandpack 很大，不放進每頁都下載的主題 JS，用到才載入。
// 不用 defineClientComponent：它不會把插槽傳下去，Sandbox 的程式碼就在插槽裡
const Sandbox = defineAsyncComponent(async () => {
    const [{ Sandbox }] = await Promise.all([
        import('vitepress-plugin-sandpack'),
        import('vitepress-plugin-sandpack/dist/style.css')
    ]);
    return Sandbox;
});

function initZoom() {
    mediumZoom('.vp-doc img', { background: 'var(--vp-c-bg)' });
}

export default {
    extends: DefaultTheme, // 使用 extends 而不是展開運算符 (...) 展開會破壞 DefaultTheme 的結構，特別是 enhanceApp
    Layout: ExpandLayout,
    setup() {
        const route = useRoute();

        // 瀏覽計數走自家後端（溝通板 #0090）。以前用不蒜子，2026-10 它的 API 回 502 之後就拿掉了
        onMounted(() => {
            initZoom();
            void recordHit(route.path);
        });
        watch(() => route.path, (path) => {
            void recordHit(path);
            void nextTick(initZoom);
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
        // 不全域 app.use(Tres)：它只註冊 TresCanvas，而星系頁的 GalaxyBack 自己 import，而且整支延後載入
    }
} satisfies Theme;
