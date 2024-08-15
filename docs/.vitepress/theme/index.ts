import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme-without-fonts';

import LayoutResume from './layout/resume.vue';

// https://vitepress.dev/guide/custom-theme

// [-]字體引用
import './fonts/font.css';

// [-]全局樣式引用
import './scss/style.scss';

// [-]Svg Icon引用
import 'virtual:svg-icons-register';

export default {
    ...DefaultTheme,
    Layout: () => {
        return h(DefaultTheme.Layout, null, {
            // https://vitepress.dev/guide/extending-default-theme#layout-slots
        });
    },
    enhanceApp({ app, router, siteData }) {
        app.component('resume', LayoutResume);
    }
} satisfies Theme;
