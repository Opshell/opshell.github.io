import { defineConfig } from 'vitepress'

import nav from './theme/configs/nav';
import sidebar from './theme/configs/sidebar';
import socialLinks from './theme/configs/socialLinks';
import search from './theme/configs/search';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-Hant',
  title: "Opshell's Blog",
  description: "Opshell's life records.",
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
    [ 'Roboto', 'NotoSansTC', 'FiraCode' ].map(fontName => {

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
        ]
      }
    });
  },
})
