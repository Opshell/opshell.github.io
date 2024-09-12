// docs/.vitepress/config.mts
import path3 from "node:path";
import fs3 from "node:fs";
import { defineConfig } from "file:///C:/wamp64/www/opshell.github.io/node_modules/vitepress/dist/node/index.js";
import container from "file:///C:/wamp64/www/opshell.github.io/node_modules/markdown-it-container/index.js";
import { renderSandbox } from "file:///C:/wamp64/www/opshell.github.io/node_modules/vitepress-plugin-sandpack/dist/esm/index.mjs";
import AutoImport from "file:///C:/wamp64/www/opshell.github.io/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///C:/wamp64/www/opshell.github.io/node_modules/unplugin-vue-components/dist/vite.js";
import { createSvgIconsPlugin } from "file:///C:/wamp64/www/opshell.github.io/node_modules/vite-plugin-svg-icons/dist/index.mjs";
import footnote from "file:///C:/wamp64/www/opshell.github.io/node_modules/markdown-it-footnote/index.mjs";

// docs/hooks/useGetSidebar.ts
import path from "node:path";
import fs from "node:fs";
import matter from "file:///C:/wamp64/www/opshell.github.io/node_modules/gray-matter/index.js";
var __vite_injected_original_dirname = "C:\\wamp64\\www\\opshell.github.io\\docs\\hooks";
var PAGES_PATH = path.resolve(__vite_injected_original_dirname, "../pages");
var WHITE_LIST = ["index.md"];
var isDirectory = (path4) => fs.lstatSync(path4).isDirectory();
var intersections = (arr1, arr2) => Array.from(new Set(arr1.filter((item) => !new Set(arr2).has(item))));
function getFrontMatter(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const { data } = matter(content);
  return data;
}
function getList(params, absolutePath, startPath) {
  const res = [];
  for (const file of params) {
    const dir = path.join(absolutePath, file);
    const isDir = isDirectory(dir);
    if (isDir) {
      const files = fs.readdirSync(dir);
      res.push({
        text: file,
        collapsed: true,
        items: getList(files, dir, `${startPath}/${file}`)
      });
    } else {
      const fileName = path.basename(file);
      const suffix = path.extname(file);
      if (suffix !== ".md") {
        continue;
      }
      const frontmatter = getFrontMatter(`${absolutePath}/${file}`);
      if (frontmatter.isPublished) {
        res.push({
          text: frontmatter.title || fileName.replace(".md", ""),
          link: `${startPath}/${fileName.replace(".md", "")}`
        });
      }
    }
  }
  return res;
}
async function getSidebar(startPath) {
  const absolutePath = path.join(PAGES_PATH, startPath);
  const files = fs.readdirSync(absolutePath);
  const items = intersections(files, WHITE_LIST);
  return getList(items, absolutePath, startPath);
}

// docs/hooks/useArticleClassification.ts
import path2 from "node:path";
import fs2 from "node:fs";
import matter2 from "file:///C:/wamp64/www/opshell.github.io/node_modules/gray-matter/index.js";
var isDirectory2 = (path4) => fs2.lstatSync(path4).isDirectory();
function getFrontMatter2(filePath) {
  const content = fs2.readFileSync(filePath, "utf-8");
  const { data } = matter2(content);
  return data;
}
async function getArticleClassification(files, startPathName, res = null) {
  if (!res) {
    res = {
      tags: {},
      category: ""
    };
  }
  for (const file of files) {
    const dir = path2.join(startPathName, file);
    const isDir = isDirectory2(dir);
    if (isDir) {
      const nextfiles = fs2.readdirSync(dir);
      res = await getArticleClassification(nextfiles, `${startPathName}/${file}`, res);
    } else {
      const fileName = path2.basename(file);
      const suffix = path2.extname(file);
      if (suffix !== ".md") {
        continue;
      }
      const frontmatter = getFrontMatter2(`${startPathName}/${fileName}`);
      if (frontmatter.tags && frontmatter.isPublished) {
        const url = `${startPathName.split("pages")[1]}/${fileName.replace(".md", ".html")}`;
        for (const tag of frontmatter.tags) {
          res.tags[tag] = res.tags[tag] ?? { count: 0, group: [] };
          res.tags[tag].count++;
          res.tags[tag].group.push({
            title: frontmatter.title,
            image: frontmatter.image ?? "/images/no_image.svg",
            category: frontmatter.categories ?? "",
            date: frontmatter.createdAt ?? "",
            url
          });
        }
      }
    }
  }
  return res;
}

// docs/.vitepress/theme/configs/nav.ts
var nav_default = [
  // {
  //     text: 'About Ops',
  //     link: '/about-opshell'
  // },
  {
    text: "\u2728\uFE0F Vitepress Thirty Day",
    link: "/vitepress-thirty-days"
  },
  {
    text: "Article",
    items: [
      {
        text: "Life's Mumurs",
        link: "/article/life-murmurs/life"
      },
      {
        text: "Code Sea",
        items: [
          {
            text: "developer",
            link: "/article/code-sea/developer/authenticate/01-session-cookie"
          },
          {
            text: "javascript",
            link: "/article/code-sea/javascript/how-is-this"
          },
          {
            text: "typescript",
            link: "/article/code-sea/typescript/enum"
          },
          {
            text: "vitepress",
            link: "/article/code-sea/vitepress/2024\u9435\u4EBA\u8CFD/day01-preface"
          }
        ]
      }
    ]
  },
  {
    text: "Tags",
    link: "/tags-list"
  },
  {
    text: "Resume",
    link: "/resume-layout"
  },
  {
    text: "Resume-vue",
    link: "/resume-vue"
  }
  // {
  //     text: 'Resume',
  //     items: [
  //         {
  //             text: 'resume-vue',
  //             link: '/resume-vue'
  //         },
  //         {
  //             text: 'resume-md',
  //             link: '/resume-md'
  //         },
  //         {
  //             text: 'resume-layout',
  //             link: '/resume-layout'
  //         }
  //     ]
  // }
];

// docs/.vitepress/theme/configs/socialLinks.ts
var socialLinks_default = [
  {
    icon: "github",
    link: "https://github.com/Opshell",
    ariaLabel: "opshell's github"
  },
  {
    icon: "instagram",
    link: "https://www.instagram.com/phenomx9990/",
    ariaLabel: "opshell's instagram"
  }
  // {
  //     icon: {
  //         svg: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M22.5217 7.07507V17.0435C16.8406 16.4368 11.1594 15.8281 5.47827 15.2194V5.25913C5.47827 5.25913 5.47827 5.2571 5.4803 5.25507C6.45016 3.07594 9.12436 1.20725 12.7846 0L22.5217 7.07507Z" "/> <path d="M6.45817 25.7509L7.52136 26.8141C6.78889 27.5465 5.77542 28 4.65846 28C2.42252 28 0.609619 26.1871 0.609619 23.9512C0.609619 21.7152 2.42252 19.9023 4.65846 19.9023C5.77643 19.9023 6.78991 20.3558 7.52136 21.0883L6.45817 22.1515C5.99759 21.6909 5.3615 21.4068 4.65846 21.4068C3.25237 21.4068 2.1131 22.5461 2.1131 23.9522C2.1131 25.3583 3.25237 26.4976 4.65846 26.4976C5.3615 26.4976 5.9986 26.2125 6.45817 25.7529V25.7509Z" "/> <path d="M12.7561 22.2154V22.7014C12.2834 22.254 11.6493 21.9841 10.9047 21.9841C9.24296 21.9841 7.89673 23.3304 7.89673 24.9921C7.89673 26.6538 9.24296 28.0001 10.9047 28.0001C11.6483 28.0001 12.2824 27.7302 12.7561 27.2828V27.7688H14.144V22.2154H12.7561ZM10.9047 26.6122C10.0099 26.6122 9.28455 25.8879 9.28455 24.9921C9.28455 24.0963 10.0099 23.372 10.9047 23.372C11.7995 23.372 12.5248 24.0973 12.5248 24.9921C12.5248 25.8869 11.7995 26.6122 10.9047 26.6122Z" "/> <path d="M27.3333 25.5704C27.3718 25.3857 27.3911 25.1909 27.3911 24.9921C27.3911 23.3304 26.1879 21.9841 24.3253 21.9841C22.4627 21.9841 21.2595 23.3304 21.2595 24.9921C21.2595 26.6538 22.6331 28.0001 24.3253 28.0001C25.4281 28.0001 26.4121 27.6754 27.0594 27.0312L26.121 26.0928C25.7608 26.4773 25.1602 26.6975 24.3253 26.6975C23.4904 26.6975 22.9416 26.2278 22.7539 25.5693H27.3333V25.5704ZM24.3253 23.2857C25.1826 23.2857 25.7091 23.7564 25.8968 24.4138H22.7549C22.9426 23.7564 23.4701 23.2857 24.3263 23.2857H24.3253Z" "/> <path d="M21.3032 27.7687H19.3492L16.9205 25.34V27.7687H15.5327V19.9054C15.9953 19.9551 16.4579 20.0038 16.9205 20.0535V24.4148L19.12 22.2154H21.0739L18.4118 24.8774L21.3032 27.7687Z" "/> </svg>'
  //     },
  //     link: 'https://www.cakeresume.com/me/Opshell',
  //     ariaLabel: 'opshell\'s cakeresume'
  // }
];

// docs/.vitepress/theme/configs/search.ts
var ignorePath = [
  "pages/article/life-murmurs"
];
var search_default = {
  provider: "local",
  // 啟動 miniSearch
  options: {
    translations: {
      button: {
        buttonText: "\u641C\u5C0B\u6587\u7AE0",
        buttonAriaLabel: "\u641C\u5C0B\u6587\u7AE0"
      },
      modal: {
        noResultsText: "\u627E\u4E0D\u5230\u76F8\u95DC\u5167\u5BB9",
        displayDetails: "\u8A73\u7D30\u8A0A\u606F",
        resetButtonTitle: "\u6E05\u9664\u641C\u5C0B\u689D\u4EF6",
        backButtonTitle: "\u8FD4\u56DE\u641C\u5C0B\u7ED3\u679C",
        footer: {
          selectText: "\u9078\u64C7",
          selectKeyAriaLabel: "enter",
          navigateText: "\u5207\u63DB",
          navigateUpKeyAriaLabel: "up arrow",
          navigateDownKeyAriaLabel: "down arrow",
          closeKeyAriaLabel: "escape"
        }
      }
    },
    _render(src, env, md) {
      const html = md.render(src, env);
      if (env.frontmatter?.search === false || !env.frontmatter?.isPublished)
        return "";
      for (const path4 of ignorePath) {
        if (env.relativePath.startsWith(path4)) {
          return "";
        }
      }
      if (env.frontmatter?.title)
        return md.render(`# ${env.frontmatter.title}`) + html;
      return html;
    }
  }
};

// docs/.vitepress/config.mts
var __vite_injected_original_dirname2 = "C:\\wamp64\\www\\opshell.github.io\\docs\\.vitepress";
var startPathDir = path3.resolve(__vite_injected_original_dirname2, "../pages");
var mdFiles = fs3.readdirSync(startPathDir);
var classification = await getArticleClassification(mdFiles, startPathDir);
var config_default = defineConfig({
  // lang: 'zh-Hant',
  lang: "en",
  title: "Opshell's Blog",
  description: "Opshell's work and life records.",
  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }]
    // ['script', {defer: 'true', src: 'https://vercount.one/js'}] // vercount
  ],
  rewrites: {
    // 我们在nav設定的連結應該要是重寫後的路徑
    "pages/(.*)": "(.*)"
  },
  themeConfig: {
    classification,
    // siteTitle: 'Opshell\'s Blog',
    logo: {
      light: "/logo.jpg",
      dark: "/logo-w.jpg",
      alt: "Opshell Logo"
    },
    // https://vitepress.dev/reference/default-theme-config
    nav: nav_default,
    socialLinks: socialLinks_default,
    search: search_default,
    sidebar: {
      "/article/code-sea/developer/": [{
        text: "Developer",
        items: await getSidebar("/article/code-sea/developer")
      }],
      "/article/code-sea/javascript/": [{
        text: "Jypescript",
        items: await getSidebar("/article/code-sea/javascript")
      }],
      "/article/code-sea/typescript/": [{
        text: "Typescript",
        items: await getSidebar("/article/code-sea/typescript")
      }],
      "/article/code-sea/vitepress/": [{
        text: "Vitepress",
        items: await getSidebar("/article/code-sea/vitepress")
      }],
      "/article/life-murmurs/": [{
        text: "Life's Mumurs",
        items: await getSidebar("/article/life-murmurs")
      }]
    },
    outline: {
      level: [2, 4],
      label: "\u76EE\u9304"
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright \xA9 2024-present Opshell"
    },
    lastUpdated: {
      text: "Last Updated at",
      formatOptions: {
        dateStyle: "medium",
        timeStyle: "medium"
      }
    },
    notFound: {
      // 404
      title: "Page Not Found ~!!",
      quote: "\u8ACB\u6AA2\u67E5\u7DB2\u5740\u6216\u76EE\u524D\u9801\u9762\u4E0D\u958B\u653E\u89C0\u770B\uFF0C\u4F7F\u7528\u4E0B\u65B9\u6309\u9215\u56DE\u5230\u9996\u9801\u3002",
      linkText: "\u56DE\u5230\u9996\u9801"
    },
    externalLinkIcon: true
  },
  markdown: {
    theme: "one-dark-pro",
    lineNumbers: true,
    attrs: {
      // optional, these are default options
      leftDelimiter: "{",
      rightDelimiter: "}",
      allowedAttributes: []
      // empty array = all attributes are allowed
    },
    container: {
      infoLabel: "\u7D30\u7BC0\uFF1A",
      tipLabel: "\u{1F4A1} \u9326\u56CA [Tips]\uFF1A",
      warningLabel: "\u26A0\uFE0F \u6CE8\u610F [Warning]\uFF1A",
      dangerLabel: "\u26D4 \u932F\u8AA4 [Error]\uFF1A",
      detailsLabel: "\u8A73\u7D30\u8CC7\u6599 [Details]\uFF1A"
    },
    config: (md) => {
      md.use(footnote);
      md.renderer.rules.footnote_anchor = function render_footnote_anchor(tokens, idx, options, env, slf) {
        let id = slf.rules.footnote_anchor_name?.(tokens, idx, options, env, slf);
        if (tokens[idx].meta.subId > 0) {
          id += `:${tokens[idx].meta.subId}`;
        }
        return ` <a href="#fnref${id}" class="footnote-backref"> \u2B06\uFE0F </a>`;
      };
      md.use(container, "sandbox", {
        render(tokens, idx) {
          return renderSandbox(tokens, idx, "sandbox");
        }
      });
    }
  },
  transformHead({ assets }) {
    ["Roboto", "NotoSansTC", "FiraCode"].map((fontName) => {
      const fontFile = assets.find((file) => new RegExp(`${fontName}\\-\\w+\\.ttf`).test(file));
      if (fontFile) {
        return [
          [
            "link",
            {
              rel: "preload",
              href: fontFile,
              as: "fonts",
              type: "fonts/ttf",
              crossorigin: ""
            }
          ]
        ];
      }
      return [];
    });
  },
  vite: {
    resolve: {
      alias: {
        // 設定別名
        "@": path3.resolve(__vite_injected_original_dirname2, "../"),
        // docs 當根目錄
        "@vitepress": path3.resolve(__vite_injected_original_dirname2),
        // .vitepress 目錄
        "@components": path3.resolve(__vite_injected_original_dirname2, "../", "components"),
        "@data": path3.resolve(__vite_injected_original_dirname2, "../", "data"),
        "@hooks": path3.resolve(__vite_injected_original_dirname2, "../", "hooks"),
        "@pages": path3.resolve(__vite_injected_original_dirname2, "../", "pages")
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
          /\.[tj]sx?$/,
          // .ts, .tsx, .js, .jsx
          /\.vue$/,
          /\.vue\?vue/,
          // .vue
          /\.md$/
          // .md
        ],
        // global imports to register
        imports: [
          // presets
          "vue",
          {
            // custom
            "@vueuse/core": [
              // named imports
              "useMouse",
              // import { useMouse } from '@vueuse/core',
              // alias
              ["useFetch", "useMyFetch"]
            ],
            "axios": [
              // default imports
              ["default", "axios"]
            ],
            "vue": ["PropType", "defineProps", "InjectionKey", "Ref"]
          }
        ],
        dirs: [],
        dts: "./types/auto-imports.d.ts",
        // typescript 宣告檔案位置
        vueTemplate: false,
        eslintrc: {
          enabled: false,
          // Default `false`
          filepath: "./.eslintrc-auto-import.json",
          globalsPropValue: true
        }
      }),
      Components({
        dirs: ["./components"],
        // 指定components位置 預設是'src/components'
        dts: "./types/components.d.ts",
        // .d.ts生成位置
        extensions: ["vue", "md"],
        // allow auto load markdown components under dirs
        include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
        // allow auto import and register components used in markdown
        directoryAsNamespace: true,
        // 允許子目錄作為命名空間
        resolvers: []
        // 解析規則
      }),
      createSvgIconsPlugin({
        iconDirs: [path3.resolve(__vite_injected_original_dirname2, "../", "public/icons")],
        // 指定需要占存的Icon目錄
        // iconDirs: [`${new URL('../public/icons', import.meta.url).href}`], // 指定需要占存的Icon目錄
        symbolId: "[name]",
        // 指定symbolId格式 預設：'icon-[dir]-[name]
        inject: "body-last",
        // | 'body-first' sprite插入位置
        customDomId: "__svg__icons__dom__"
        // 自訂 Dom ID
      })
    ],
    // 共用全域 SCSS
    css: {
      devSourcemap: true,
      // scss sourcemap
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
export {
  config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiZG9jcy8udml0ZXByZXNzL2NvbmZpZy5tdHMiLCAiZG9jcy9ob29rcy91c2VHZXRTaWRlYmFyLnRzIiwgImRvY3MvaG9va3MvdXNlQXJ0aWNsZUNsYXNzaWZpY2F0aW9uLnRzIiwgImRvY3MvLnZpdGVwcmVzcy90aGVtZS9jb25maWdzL25hdi50cyIsICJkb2NzLy52aXRlcHJlc3MvdGhlbWUvY29uZmlncy9zb2NpYWxMaW5rcy50cyIsICJkb2NzLy52aXRlcHJlc3MvdGhlbWUvY29uZmlncy9zZWFyY2gudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFx3YW1wNjRcXFxcd3d3XFxcXG9wc2hlbGwuZ2l0aHViLmlvXFxcXGRvY3NcXFxcLnZpdGVwcmVzc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcd2FtcDY0XFxcXHd3d1xcXFxvcHNoZWxsLmdpdGh1Yi5pb1xcXFxkb2NzXFxcXC52aXRlcHJlc3NcXFxcY29uZmlnLm10c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovd2FtcDY0L3d3dy9vcHNoZWxsLmdpdGh1Yi5pby9kb2NzLy52aXRlcHJlc3MvY29uZmlnLm10c1wiO2ltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XHJcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzJztcclxuaW1wb3J0IHsgRGVmYXVsdFRoZW1lLCBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlcHJlc3MnO1xyXG5pbXBvcnQgY29udGFpbmVyIGZyb20gJ21hcmtkb3duLWl0LWNvbnRhaW5lcic7XHJcbmltcG9ydCBtYXJrZG93bkl0QXR0cnMgZnJvbSAnbWFya2Rvd24taXQtYXR0cnMnO1xyXG5pbXBvcnQgeyByZW5kZXJTYW5kYm94IH0gZnJvbSAndml0ZXByZXNzLXBsdWdpbi1zYW5kcGFjayc7XHJcblxyXG5pbXBvcnQgQXV0b0ltcG9ydCBmcm9tICd1bnBsdWdpbi1hdXRvLWltcG9ydC92aXRlJztcclxuaW1wb3J0IENvbXBvbmVudHMgZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvdml0ZSc7XHJcbmltcG9ydCB7IGNyZWF0ZVN2Z0ljb25zUGx1Z2luIH0gZnJvbSAndml0ZS1wbHVnaW4tc3ZnLWljb25zJztcclxuXHJcbi8vIGltcG9ydCBmb290bm90ZV9wbHVnaW4gZnJvbSAnbWFya2Rvd24taXQtZm9vdG5vdGUnO1xyXG5pbXBvcnQgZm9vdG5vdGUgZnJvbSAnbWFya2Rvd24taXQtZm9vdG5vdGUnO1xyXG5cclxuaW1wb3J0IHsgZ2V0U2lkZWJhciB9IGZyb20gJy4uL2hvb2tzL3VzZUdldFNpZGViYXInO1xyXG5pbXBvcnQgeyBnZXRBcnRpY2xlQ2xhc3NpZmljYXRpb24sIGlDbGFzc2lmaWNhdGlvbiB9IGZyb20gJy4uL2hvb2tzL3VzZUFydGljbGVDbGFzc2lmaWNhdGlvbic7XHJcblxyXG5pbXBvcnQgbmF2IGZyb20gJy4vdGhlbWUvY29uZmlncy9uYXYnO1xyXG5pbXBvcnQgc29jaWFsTGlua3MgZnJvbSAnLi90aGVtZS9jb25maWdzL3NvY2lhbExpbmtzJztcclxuaW1wb3J0IHNlYXJjaCBmcm9tICcuL3RoZW1lL2NvbmZpZ3Mvc2VhcmNoJztcclxuXHJcbmNvbnN0IHN0YXJ0UGF0aERpciA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9wYWdlcycpOyAvLyBcdTYyOEFwYWdlcyBcdThBMkRcdTVCOUFcdTYyMTBcdTY4MzlcdTc2RUVcdTkzMDRcclxuY29uc3QgbWRGaWxlcyA9IGZzLnJlYWRkaXJTeW5jKHN0YXJ0UGF0aERpcik7IC8vIFx1OEI4MFx1NTNENlx1NzZFRVx1OTMwNFx1NEUwQlx1NzY4NFx1OENDN1x1NjU5OVx1NTkzRSZcdTY1ODdcdTRFRjZcclxuXHJcbmludGVyZmFjZSBpVGhlbWVDb25maWcgZXh0ZW5kcyBEZWZhdWx0VGhlbWUuQ29uZmlnIHtcclxuICAgIGNsYXNzaWZpY2F0aW9uOiBpQ2xhc3NpZmljYXRpb25cclxufVxyXG5cclxuY29uc3QgY2xhc3NpZmljYXRpb24gPSBhd2FpdCBnZXRBcnRpY2xlQ2xhc3NpZmljYXRpb24obWRGaWxlcywgc3RhcnRQYXRoRGlyKTtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZXByZXNzLmRldi9yZWZlcmVuY2Uvc2l0ZS1jb25maWdcclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICAgIC8vIGxhbmc6ICd6aC1IYW50JyxcclxuICAgIGxhbmc6ICdlbicsXHJcbiAgICB0aXRsZTogJ09wc2hlbGxcXCdzIEJsb2cnLFxyXG4gICAgZGVzY3JpcHRpb246ICdPcHNoZWxsXFwncyB3b3JrIGFuZCBsaWZlIHJlY29yZHMuJyxcclxuICAgIGhlYWQ6IFtcclxuICAgICAgICBbJ2xpbmsnLCB7IHJlbDogJ2ljb24nLCBocmVmOiAnL2Zhdmljb24uaWNvJyB9XVxyXG4gICAgICAgIC8vIFsnc2NyaXB0Jywge2RlZmVyOiAndHJ1ZScsIHNyYzogJ2h0dHBzOi8vdmVyY291bnQub25lL2pzJ31dIC8vIHZlcmNvdW50XHJcbiAgICBdLFxyXG4gICAgcmV3cml0ZXM6IHsgLy8gXHU2MjExXHU0RUVDXHU1NzI4bmF2XHU4QTJEXHU1QjlBXHU3Njg0XHU5MDIzXHU3RDUwXHU2MUM5XHU4QTcyXHU4OTgxXHU2NjJGXHU5MUNEXHU1QkVCXHU1RjhDXHU3Njg0XHU4REVGXHU1RjkxXHJcbiAgICAgICAgJ3BhZ2VzLyguKiknOiAnKC4qKSdcclxuICAgIH0sXHJcbiAgICB0aGVtZUNvbmZpZzoge1xyXG4gICAgICAgIGNsYXNzaWZpY2F0aW9uLFxyXG4gICAgICAgIC8vIHNpdGVUaXRsZTogJ09wc2hlbGxcXCdzIEJsb2cnLFxyXG4gICAgICAgIGxvZ286IHtcclxuICAgICAgICAgICAgbGlnaHQ6ICcvbG9nby5qcGcnLFxyXG4gICAgICAgICAgICBkYXJrOiAnL2xvZ28tdy5qcGcnLFxyXG4gICAgICAgICAgICBhbHQ6ICdPcHNoZWxsIExvZ28nXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy8gaHR0cHM6Ly92aXRlcHJlc3MuZGV2L3JlZmVyZW5jZS9kZWZhdWx0LXRoZW1lLWNvbmZpZ1xyXG4gICAgICAgIG5hdixcclxuICAgICAgICBzb2NpYWxMaW5rcyxcclxuICAgICAgICBzZWFyY2gsXHJcbiAgICAgICAgc2lkZWJhcjoge1xyXG4gICAgICAgICAgICAnL2FydGljbGUvY29kZS1zZWEvZGV2ZWxvcGVyLyc6IFt7XHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRGV2ZWxvcGVyJyxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiBhd2FpdCBnZXRTaWRlYmFyKCcvYXJ0aWNsZS9jb2RlLXNlYS9kZXZlbG9wZXInKVxyXG4gICAgICAgICAgICB9XSxcclxuICAgICAgICAgICAgJy9hcnRpY2xlL2NvZGUtc2VhL2phdmFzY3JpcHQvJzogW3tcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdKeXBlc2NyaXB0JyxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiBhd2FpdCBnZXRTaWRlYmFyKCcvYXJ0aWNsZS9jb2RlLXNlYS9qYXZhc2NyaXB0JylcclxuICAgICAgICAgICAgfV0sXHJcbiAgICAgICAgICAgICcvYXJ0aWNsZS9jb2RlLXNlYS90eXBlc2NyaXB0Lyc6IFt7XHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnVHlwZXNjcmlwdCcsXHJcbiAgICAgICAgICAgICAgICBpdGVtczogYXdhaXQgZ2V0U2lkZWJhcignL2FydGljbGUvY29kZS1zZWEvdHlwZXNjcmlwdCcpXHJcbiAgICAgICAgICAgIH1dLFxyXG4gICAgICAgICAgICAnL2FydGljbGUvY29kZS1zZWEvdml0ZXByZXNzLyc6IFt7XHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnVml0ZXByZXNzJyxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiBhd2FpdCBnZXRTaWRlYmFyKCcvYXJ0aWNsZS9jb2RlLXNlYS92aXRlcHJlc3MnKVxyXG4gICAgICAgICAgICB9XSxcclxuICAgICAgICAgICAgJy9hcnRpY2xlL2xpZmUtbXVybXVycy8nOiBbe1xyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0xpZmVcXCdzIE11bXVycycsXHJcbiAgICAgICAgICAgICAgICBpdGVtczogYXdhaXQgZ2V0U2lkZWJhcignL2FydGljbGUvbGlmZS1tdXJtdXJzJylcclxuICAgICAgICAgICAgfV1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBvdXRsaW5lOiB7XHJcbiAgICAgICAgICAgIGxldmVsOiBbMiwgNF0sXHJcbiAgICAgICAgICAgIGxhYmVsOiAnXHU3NkVFXHU5MzA0J1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGZvb3Rlcjoge1xyXG4gICAgICAgICAgICBtZXNzYWdlOiAnUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLicsXHJcbiAgICAgICAgICAgIGNvcHlyaWdodDogJ0NvcHlyaWdodCBcdTAwQTkgMjAyNC1wcmVzZW50IE9wc2hlbGwnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBsYXN0VXBkYXRlZDoge1xyXG4gICAgICAgICAgICB0ZXh0OiAnTGFzdCBVcGRhdGVkIGF0JyxcclxuICAgICAgICAgICAgZm9ybWF0T3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgZGF0ZVN0eWxlOiAnbWVkaXVtJyxcclxuICAgICAgICAgICAgICAgIHRpbWVTdHlsZTogJ21lZGl1bSdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbm90Rm91bmQ6IHsgLy8gNDA0XHJcbiAgICAgICAgICAgIHRpdGxlOiAnUGFnZSBOb3QgRm91bmQgfiEhJyxcclxuICAgICAgICAgICAgcXVvdGU6ICdcdThBQ0JcdTZBQTJcdTY3RTVcdTdEQjJcdTU3NDBcdTYyMTZcdTc2RUVcdTUyNERcdTk4MDFcdTk3NjJcdTRFMERcdTk1OEJcdTY1M0VcdTg5QzBcdTc3MEJcdUZGMENcdTRGN0ZcdTc1MjhcdTRFMEJcdTY1QjlcdTYzMDlcdTkyMTVcdTU2REVcdTUyMzBcdTk5OTZcdTk4MDFcdTMwMDInLFxyXG4gICAgICAgICAgICBsaW5rVGV4dDogJ1x1NTZERVx1NTIzMFx1OTk5Nlx1OTgwMSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIGV4dGVybmFsTGlua0ljb246IHRydWVcclxuICAgIH0gYXMgaVRoZW1lQ29uZmlnLFxyXG4gICAgbWFya2Rvd246IHtcclxuICAgICAgICB0aGVtZTogJ29uZS1kYXJrLXBybycsXHJcbiAgICAgICAgbGluZU51bWJlcnM6IHRydWUsXHJcbiAgICAgICAgYXR0cnM6IHtcclxuICAgICAgICAgICAgLy8gb3B0aW9uYWwsIHRoZXNlIGFyZSBkZWZhdWx0IG9wdGlvbnNcclxuICAgICAgICAgICAgbGVmdERlbGltaXRlcjogJ3snLFxyXG4gICAgICAgICAgICByaWdodERlbGltaXRlcjogJ30nLFxyXG4gICAgICAgICAgICBhbGxvd2VkQXR0cmlidXRlczogW10gLy8gZW1wdHkgYXJyYXkgPSBhbGwgYXR0cmlidXRlcyBhcmUgYWxsb3dlZFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY29udGFpbmVyOiB7XHJcbiAgICAgICAgICAgIGluZm9MYWJlbDogJ1x1N0QzMFx1N0JDMFx1RkYxQScsXHJcbiAgICAgICAgICAgIHRpcExhYmVsOiAnXHVEODNEXHVEQ0ExIFx1OTMyNlx1NTZDQSBbVGlwc11cdUZGMUEnLFxyXG4gICAgICAgICAgICB3YXJuaW5nTGFiZWw6ICdcdTI2QTBcdUZFMEYgXHU2Q0U4XHU2MTBGIFtXYXJuaW5nXVx1RkYxQScsXHJcbiAgICAgICAgICAgIGRhbmdlckxhYmVsOiAnXHUyNkQ0IFx1OTMyRlx1OEFBNCBbRXJyb3JdXHVGRjFBJyxcclxuICAgICAgICAgICAgZGV0YWlsc0xhYmVsOiAnXHU4QTczXHU3RDMwXHU4Q0M3XHU2NTk5IFtEZXRhaWxzXVx1RkYxQSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNvbmZpZzogKG1kKSA9PiB7XHJcbiAgICAgICAgICAgIG1kLnVzZShmb290bm90ZSk7XHJcbiAgICAgICAgICAgIGludGVyZmFjZSBpRm9vdG5vdGVBbmNob3JUb2tlbk1ldGEge1xyXG4gICAgICAgICAgICAgICAgaWQ6IG51bWJlclxyXG4gICAgICAgICAgICAgICAgc3ViSWQ6IG51bWJlclxyXG4gICAgICAgICAgICAgICAgbGFiZWw6IHN0cmluZ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG1kLnJlbmRlcmVyLnJ1bGVzLmZvb3Rub3RlX2FuY2hvciA9IGZ1bmN0aW9uIHJlbmRlcl9mb290bm90ZV9hbmNob3IodG9rZW5zLCBpZHgsIG9wdGlvbnMsIGVudiwgc2xmKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaWQgPSBzbGYucnVsZXMuZm9vdG5vdGVfYW5jaG9yX25hbWU/Lih0b2tlbnMsIGlkeCwgb3B0aW9ucywgZW52LCBzbGYpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCh0b2tlbnNbaWR4XS5tZXRhIGFzIGlGb290bm90ZUFuY2hvclRva2VuTWV0YSkuc3ViSWQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQgKz0gYDokeyh0b2tlbnNbaWR4XS5tZXRhIGFzIGlGb290bm90ZUFuY2hvclRva2VuTWV0YSkuc3ViSWR9YDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBgIDxhIGhyZWY9XCIjZm5yZWYke2lkfVwiIGNsYXNzPVwiZm9vdG5vdGUtYmFja3JlZlwiPiBcdTJCMDZcdUZFMEYgPC9hPmA7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBtZC51c2UoY29udGFpbmVyLCAnc2FuZGJveCcsIHtcclxuICAgICAgICAgICAgICAgIHJlbmRlcih0b2tlbnM6IGFueVtdLCBpZHg6IG51bWJlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZW5kZXJTYW5kYm94KHRva2VucywgaWR4LCAnc2FuZGJveCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgdHJhbnNmb3JtSGVhZCh7IGFzc2V0cyB9KSB7XHJcbiAgICAgICAgLy8gYWRqdXN0IHRoZSByZWdleCBhY2NvcmRpbmdseSB0byBtYXRjaCB5b3VyIGZvbnRcclxuICAgICAgICBbJ1JvYm90bycsICdOb3RvU2Fuc1RDJywgJ0ZpcmFDb2RlJ10ubWFwKChmb250TmFtZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBmb250RmlsZSA9IGFzc2V0cy5maW5kKGZpbGUgPT4gbmV3IFJlZ0V4cChgJHtmb250TmFtZX1cXFxcLVxcXFx3K1xcXFwudHRmYCkudGVzdChmaWxlKSk7XHJcbiAgICAgICAgICAgIGlmIChmb250RmlsZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgICAgICAgICBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdsaW5rJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVsOiAncHJlbG9hZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBocmVmOiBmb250RmlsZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzOiAnZm9udHMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZvbnRzL3R0ZicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcm9zc29yaWdpbjogJydcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuICAgIHZpdGU6IHtcclxuICAgICAgICByZXNvbHZlOiB7XHJcbiAgICAgICAgICAgIGFsaWFzOiB7IC8vIFx1OEEyRFx1NUI5QVx1NTIyNVx1NTQwRFxyXG4gICAgICAgICAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vJyksIC8vIGRvY3MgXHU3NTc2XHU2ODM5XHU3NkVFXHU5MzA0XHJcbiAgICAgICAgICAgICAgICAnQHZpdGVwcmVzcyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUpLCAvLyAudml0ZXByZXNzIFx1NzZFRVx1OTMwNFxyXG4gICAgICAgICAgICAgICAgJ0Bjb21wb25lbnRzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLycsICdjb21wb25lbnRzJyksXHJcbiAgICAgICAgICAgICAgICAnQGRhdGEnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vJywgJ2RhdGEnKSxcclxuICAgICAgICAgICAgICAgICdAaG9va3MnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vJywgJ2hvb2tzJyksXHJcbiAgICAgICAgICAgICAgICAnQHBhZ2VzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLycsICdwYWdlcycpXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gJ0AnOiBuZXcgVVJMKCcuLi8nLCBpbXBvcnQubWV0YS51cmwpLnBhdGhuYW1lLCAvLyBkb2NzIFx1NzU3Nlx1NjgzOVx1NzZFRVx1OTMwNFxyXG4gICAgICAgICAgICAgICAgLy8gJ0B2aXRlcHJlc3MnOiBuZXcgVVJMKCcuLi8udml0ZXByZXNzJywgaW1wb3J0Lm1ldGEudXJsKS5wYXRobmFtZSwgLy8gLnZpdGVwcmVzcyBcdTc2RUVcdTkzMDRcclxuICAgICAgICAgICAgICAgIC8vICdAY29tcG9uZW50cyc6IG5ldyBVUkwoJy4uL2NvbXBvbmVudHMnLCBpbXBvcnQubWV0YS51cmwpLnBhdGhuYW1lLFxyXG4gICAgICAgICAgICAgICAgLy8gJ0BkYXRhJzogbmV3IFVSTCgnLi4vZGF0YScsIGltcG9ydC5tZXRhLnVybCkucGF0aG5hbWUsXHJcbiAgICAgICAgICAgICAgICAvLyAnQHBhZ2VzJzogbmV3IFVSTCgnLi4vcGFnZXMnLCBpbXBvcnQubWV0YS51cmwpLnBhdGhuYW1lXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHBsdWdpbnM6IFtcclxuICAgICAgICAgICAgQXV0b0ltcG9ydCh7XHJcbiAgICAgICAgICAgICAgICBpbmNsdWRlOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgL1xcLlt0al1zeD8kLywgLy8gLnRzLCAudHN4LCAuanMsIC5qc3hcclxuICAgICAgICAgICAgICAgICAgICAvXFwudnVlJC8sXHJcbiAgICAgICAgICAgICAgICAgICAgL1xcLnZ1ZVxcP3Z1ZS8sIC8vIC52dWVcclxuICAgICAgICAgICAgICAgICAgICAvXFwubWQkLyAvLyAubWRcclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAvLyBnbG9iYWwgaW1wb3J0cyB0byByZWdpc3RlclxyXG4gICAgICAgICAgICAgICAgaW1wb3J0czogWyAvLyBwcmVzZXRzXHJcbiAgICAgICAgICAgICAgICAgICAgJ3Z1ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgeyAvLyBjdXN0b21cclxuICAgICAgICAgICAgICAgICAgICAgICAgJ0B2dWV1c2UvY29yZSc6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5hbWVkIGltcG9ydHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICd1c2VNb3VzZScsIC8vIGltcG9ydCB7IHVzZU1vdXNlIH0gZnJvbSAnQHZ1ZXVzZS9jb3JlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFsaWFzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBbJ3VzZUZldGNoJywgJ3VzZU15RmV0Y2gnXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAnYXhpb3MnOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkZWZhdWx0IGltcG9ydHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFsnZGVmYXVsdCcsICdheGlvcyddXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICd2dWUnOiBbJ1Byb3BUeXBlJywgJ2RlZmluZVByb3BzJywgJ0luamVjdGlvbktleScsICdSZWYnXVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICBkaXJzOiBbXSxcclxuICAgICAgICAgICAgICAgIGR0czogJy4vdHlwZXMvYXV0by1pbXBvcnRzLmQudHMnLCAvLyB0eXBlc2NyaXB0IFx1NUJBM1x1NTQ0QVx1NkE5NFx1Njg0OFx1NEY0RFx1N0Y2RVxyXG4gICAgICAgICAgICAgICAgdnVlVGVtcGxhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgZXNsaW50cmM6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSwgLy8gRGVmYXVsdCBgZmFsc2VgXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZXBhdGg6ICcuLy5lc2xpbnRyYy1hdXRvLWltcG9ydC5qc29uJyxcclxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxzUHJvcFZhbHVlOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBDb21wb25lbnRzKHtcclxuICAgICAgICAgICAgICAgIGRpcnM6IFsnLi9jb21wb25lbnRzJ10sIC8vIFx1NjMwN1x1NUI5QWNvbXBvbmVudHNcdTRGNERcdTdGNkUgXHU5ODEwXHU4QTJEXHU2NjJGJ3NyYy9jb21wb25lbnRzJ1xyXG4gICAgICAgICAgICAgICAgZHRzOiAnLi90eXBlcy9jb21wb25lbnRzLmQudHMnLCAvLyAuZC50c1x1NzUxRlx1NjIxMFx1NEY0RFx1N0Y2RVxyXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uczogWyd2dWUnLCAnbWQnXSwgLy8gYWxsb3cgYXV0byBsb2FkIG1hcmtkb3duIGNvbXBvbmVudHMgdW5kZXIgZGlyc1xyXG4gICAgICAgICAgICAgICAgaW5jbHVkZTogWy9cXC52dWUkLywgL1xcLnZ1ZVxcP3Z1ZS8sIC9cXC5tZCQvXSwgLy8gYWxsb3cgYXV0byBpbXBvcnQgYW5kIHJlZ2lzdGVyIGNvbXBvbmVudHMgdXNlZCBpbiBtYXJrZG93blxyXG4gICAgICAgICAgICAgICAgZGlyZWN0b3J5QXNOYW1lc3BhY2U6IHRydWUsIC8vIFx1NTE0MVx1OEEzMVx1NUI1MFx1NzZFRVx1OTMwNFx1NEY1Q1x1NzBCQVx1NTQ3RFx1NTQwRFx1N0E3QVx1OTU5M1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZXJzOiBbXSAvLyBcdTg5RTNcdTY3OTBcdTg5OEZcdTUyNDdcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIGNyZWF0ZVN2Z0ljb25zUGx1Z2luKHtcclxuICAgICAgICAgICAgICAgIGljb25EaXJzOiBbcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLycsICdwdWJsaWMvaWNvbnMnKV0sIC8vIFx1NjMwN1x1NUI5QVx1OTcwMFx1ODk4MVx1NTM2MFx1NUI1OFx1NzY4NEljb25cdTc2RUVcdTkzMDRcclxuICAgICAgICAgICAgICAgIC8vIGljb25EaXJzOiBbYCR7bmV3IFVSTCgnLi4vcHVibGljL2ljb25zJywgaW1wb3J0Lm1ldGEudXJsKS5ocmVmfWBdLCAvLyBcdTYzMDdcdTVCOUFcdTk3MDBcdTg5ODFcdTUzNjBcdTVCNThcdTc2ODRJY29uXHU3NkVFXHU5MzA0XHJcbiAgICAgICAgICAgICAgICBzeW1ib2xJZDogJ1tuYW1lXScsIC8vIFx1NjMwN1x1NUI5QXN5bWJvbElkXHU2ODNDXHU1RjBGIFx1OTgxMFx1OEEyRFx1RkYxQSdpY29uLVtkaXJdLVtuYW1lXVxyXG4gICAgICAgICAgICAgICAgaW5qZWN0OiAnYm9keS1sYXN0JywgLy8gfCAnYm9keS1maXJzdCcgc3ByaXRlXHU2M0QyXHU1MTY1XHU0RjREXHU3RjZFXHJcbiAgICAgICAgICAgICAgICBjdXN0b21Eb21JZDogJ19fc3ZnX19pY29uc19fZG9tX18nIC8vIFx1ODFFQVx1OEEwMiBEb20gSURcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICBdLFxyXG4gICAgICAgIC8vIFx1NTE3MVx1NzUyOFx1NTE2OFx1NTdERiBTQ1NTXHJcbiAgICAgICAgY3NzOiB7XHJcbiAgICAgICAgICAgIGRldlNvdXJjZW1hcDogdHJ1ZSwgLy8gc2NzcyBzb3VyY2VtYXBcclxuICAgICAgICAgICAgcHJlcHJvY2Vzc29yT3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgc2Nzczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxEYXRhOiBgQGltcG9ydCBcIkB2aXRlcHJlc3MvdGhlbWUvc2Nzcy9taXhpbi5zY3NzXCI7YCxcclxuICAgICAgICAgICAgICAgICAgICBjaGFyc2V0OiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBpZ25vcmVEZWFkTGlua3M6IHRydWVcclxufSk7XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcd2FtcDY0XFxcXHd3d1xcXFxvcHNoZWxsLmdpdGh1Yi5pb1xcXFxkb2NzXFxcXGhvb2tzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFx3YW1wNjRcXFxcd3d3XFxcXG9wc2hlbGwuZ2l0aHViLmlvXFxcXGRvY3NcXFxcaG9va3NcXFxcdXNlR2V0U2lkZWJhci50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovd2FtcDY0L3d3dy9vcHNoZWxsLmdpdGh1Yi5pby9kb2NzL2hvb2tzL3VzZUdldFNpZGViYXIudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xyXG5pbXBvcnQgZnMgZnJvbSAnbm9kZTpmcyc7XHJcbmltcG9ydCBtYXR0ZXIgZnJvbSAnZ3JheS1tYXR0ZXInO1xyXG5cclxuaW1wb3J0IHsgRGVmYXVsdFRoZW1lIH0gZnJvbSAndml0ZXByZXNzJztcclxuXHJcbmNvbnN0IFBBR0VTX1BBVEggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vcGFnZXMnKTsgLy8gXHU2MjhBcGFnZXMgXHU4QTJEXHU1QjlBXHU2MjEwXHU2ODM5XHU3NkVFXHU5MzA0XHJcbmNvbnN0IFdISVRFX0xJU1QgPSBbJ2luZGV4Lm1kJ107IC8vIFx1NzY3RFx1NTQwRFx1NTVBRVx1RkYwQ1x1NEUwRFx1OTcwMFx1ODk4MVx1OTg2Rlx1NzkzQVx1NzY4NFx1NjU4N1x1NEVGNlx1NjIxNlx1NzZFRVx1OTMwNFxyXG5cclxuLy8gXHU1MjI0XHU2NUI3XHU2NjJGXHU1NDI2XHU2NjJGXHU4Q0M3XHU2NTk5XHU1OTNFXHJcbmNvbnN0IGlzRGlyZWN0b3J5ID0gKHBhdGg6IHN0cmluZykgPT4gZnMubHN0YXRTeW5jKHBhdGgpLmlzRGlyZWN0b3J5KCk7XHJcbi8vIFx1NTNENlx1OTY2M1x1NTIxN1x1NURFRVx1NTAzQ1xyXG5jb25zdCBpbnRlcnNlY3Rpb25zID0gKGFycjE6IHN0cmluZ1tdLCBhcnIyOiBzdHJpbmdbXSkgPT4gQXJyYXkuZnJvbShuZXcgU2V0KGFycjEuZmlsdGVyKGl0ZW0gPT4gIW5ldyBTZXQoYXJyMikuaGFzKGl0ZW0pKSkpO1xyXG5cclxuLy8gXHU1M0Q2XHU1Rjk3IEZyb250TWF0dGVyXHJcbmZ1bmN0aW9uIGdldEZyb250TWF0dGVyKGZpbGVQYXRoOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGYtOCcpO1xyXG4gICAgY29uc3QgeyBkYXRhIH0gPSBtYXR0ZXIoY29udGVudCk7XHJcblxyXG4gICAgcmV0dXJuIGRhdGE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldExpc3QocGFyYW1zOiBzdHJpbmdbXSwgYWJzb2x1dGVQYXRoOiBzdHJpbmcsIHN0YXJ0UGF0aDogc3RyaW5nKTogRGVmYXVsdFRoZW1lLlNpZGViYXJJdGVtW10ge1xyXG4gICAgY29uc3QgcmVzID0gW107XHJcblxyXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIHBhcmFtcykge1xyXG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGguam9pbihhYnNvbHV0ZVBhdGgsIGZpbGUpOyAvLyBcdTdENDRcdTU0MDhcdThERUZcdTVGOTFcclxuICAgICAgICBjb25zdCBpc0RpciA9IGlzRGlyZWN0b3J5KGRpcik7IC8vIFx1NTIyNFx1NjVCN1x1NjYyRlx1NTQyNlx1NjYyRlx1OENDN1x1NjU5OVx1NTkzRVxyXG5cclxuICAgICAgICBpZiAoaXNEaXIpIHsgLy8gXHU1OTgyXHU2NzlDXHU2NjJGXHU4Q0M3XHU2NTk5XHU1OTNFXHVGRjBDXHU5MDVFXHU4RkY0XHU5MDMyXHU0RTBCXHU0RTAwXHU2QjIxXHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmMoZGlyKTtcclxuICAgICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgdGV4dDogZmlsZSxcclxuICAgICAgICAgICAgICAgIGNvbGxhcHNlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiBnZXRMaXN0KGZpbGVzLCBkaXIsIGAke3N0YXJ0UGF0aH0vJHtmaWxlfWApXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFx1NjM5Mlx1OTY2NFx1OTc1RW1kXHU2QTk0XHU2ODQ4XHJcbiAgICAgICAgICAgIGNvbnN0IHN1ZmZpeCA9IHBhdGguZXh0bmFtZShmaWxlKTtcclxuICAgICAgICAgICAgaWYgKHN1ZmZpeCAhPT0gJy5tZCcpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmcm9udG1hdHRlciA9IGdldEZyb250TWF0dGVyKGAke2Fic29sdXRlUGF0aH0vJHtmaWxlfWApO1xyXG5cclxuICAgICAgICAgICAgaWYgKGZyb250bWF0dGVyLmlzUHVibGlzaGVkKSB7IC8vIFx1NTIyNFx1NjVCN1x1NjYyRlx1NTQyNlx1NzY3Q1x1NUUwM1xyXG4gICAgICAgICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGZyb250bWF0dGVyLnRpdGxlIGFzIHN0cmluZyB8fCBmaWxlTmFtZS5yZXBsYWNlKCcubWQnLCAnJyksXHJcbiAgICAgICAgICAgICAgICAgICAgbGluazogYCR7c3RhcnRQYXRofS8ke2ZpbGVOYW1lLnJlcGxhY2UoJy5tZCcsICcnKX1gXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0U2lkZWJhcihzdGFydFBhdGg6IHN0cmluZykge1xyXG4gICAgY29uc3QgYWJzb2x1dGVQYXRoID0gcGF0aC5qb2luKFBBR0VTX1BBVEgsIHN0YXJ0UGF0aCk7IC8vIFx1OEY0OVx1NjNEQlx1NTFGQVx1N0Q1NVx1NUMwRFx1OERFRlx1NUY5MVxyXG5cclxuICAgIGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmMoYWJzb2x1dGVQYXRoKTsgLy8gXHU4QjgwXHU1M0Q2XHU3NkVFXHU5MzA0XHU0RTBCXHU3Njg0XHU4Q0M3XHU2NTk5XHU1OTNFJlx1NjU4N1x1NEVGNlxyXG5cclxuICAgIGNvbnN0IGl0ZW1zID0gaW50ZXJzZWN0aW9ucyhmaWxlcywgV0hJVEVfTElTVCk7IC8vIFx1NjM5Mlx1OTY2NFx1NzY3RFx1NTQwRFx1NTVBRVxyXG5cclxuICAgIHJldHVybiBnZXRMaXN0KGl0ZW1zLCBhYnNvbHV0ZVBhdGgsIHN0YXJ0UGF0aCk7XHJcbn1cclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFx3YW1wNjRcXFxcd3d3XFxcXG9wc2hlbGwuZ2l0aHViLmlvXFxcXGRvY3NcXFxcaG9va3NcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXHdhbXA2NFxcXFx3d3dcXFxcb3BzaGVsbC5naXRodWIuaW9cXFxcZG9jc1xcXFxob29rc1xcXFx1c2VBcnRpY2xlQ2xhc3NpZmljYXRpb24udHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L3dhbXA2NC93d3cvb3BzaGVsbC5naXRodWIuaW8vZG9jcy9ob29rcy91c2VBcnRpY2xlQ2xhc3NpZmljYXRpb24udHNcIjtpbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xyXG5pbXBvcnQgZnMgZnJvbSAnbm9kZTpmcyc7XHJcbmltcG9ydCBtYXR0ZXIgZnJvbSAnZ3JheS1tYXR0ZXInO1xyXG5cclxuY29uc3QgaXNEaXJlY3RvcnkgPSAocGF0aDogc3RyaW5nKSA9PiBmcy5sc3RhdFN5bmMocGF0aCkuaXNEaXJlY3RvcnkoKTtcclxuXHJcbmZ1bmN0aW9uIGdldEZyb250TWF0dGVyKGZpbGVQYXRoOiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGYtOCcpO1xyXG4gICAgY29uc3QgeyBkYXRhIH0gPSBtYXR0ZXIoY29udGVudCk7XHJcblxyXG4gICAgcmV0dXJuIGRhdGE7XHJcbn1cclxuXHJcbmludGVyZmFjZSBpVGFncyB7XHJcbiAgICBba2V5OiBzdHJpbmddOiB7XHJcbiAgICAgICAgY291bnQ6IG51bWJlclxyXG4gICAgICAgIGdyb3VwOiB7XHJcbiAgICAgICAgICAgIHRpdGxlOiBzdHJpbmdcclxuICAgICAgICAgICAgaW1hZ2U6IHN0cmluZ1xyXG4gICAgICAgICAgICBjYXRlZ29yeTogc3RyaW5nXHJcbiAgICAgICAgICAgIGRhdGU6IHN0cmluZ1xyXG4gICAgICAgICAgICB1cmw6IHN0cmluZ1xyXG4gICAgICAgIH1bXVxyXG4gICAgfVxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgaUNsYXNzaWZpY2F0aW9uIHtcclxuICAgIHRhZ3M6IGlUYWdzXHJcbiAgICBjYXRlZ29yeTogc3RyaW5nXHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBcnRpY2xlQ2xhc3NpZmljYXRpb24oZmlsZXM6IHN0cmluZ1tdLCBzdGFydFBhdGhOYW1lOiBzdHJpbmcsIHJlczogaUNsYXNzaWZpY2F0aW9uIHwgbnVsbCA9IG51bGwpOiBQcm9taXNlPGlDbGFzc2lmaWNhdGlvbj4ge1xyXG4gICAgaWYgKCFyZXMpIHtcclxuICAgICAgICByZXMgPSB7XHJcbiAgICAgICAgICAgIHRhZ3M6IHt9LFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogJydcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xyXG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGguam9pbihzdGFydFBhdGhOYW1lLCBmaWxlKTsgLy8gXHU3RDQ0XHU1NDA4XHU4REVGXHU1RjkxXHJcbiAgICAgICAgY29uc3QgaXNEaXIgPSBpc0RpcmVjdG9yeShkaXIpOyAvLyBcdTUyMjRcdTY1QjdcdTY2MkZcdTU0MjZcdTY2MkZcdThDQzdcdTY1OTlcdTU5M0VcclxuXHJcbiAgICAgICAgaWYgKGlzRGlyKSB7XHJcbiAgICAgICAgICAgIC8vIFx1NTk4Mlx1Njc5Q1x1NjYyRlx1OENDN1x1NjU5OVx1NTkzRVx1RkYwQ1x1OTA1RVx1OEZGNFx1OTAzMlx1NEUwQlx1NEUwMFx1NkIyMVxyXG4gICAgICAgICAgICBjb25zdCBuZXh0ZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhkaXIpO1xyXG4gICAgICAgICAgICByZXMgPSBhd2FpdCBnZXRBcnRpY2xlQ2xhc3NpZmljYXRpb24obmV4dGZpbGVzLCBgJHtzdGFydFBhdGhOYW1lfS8ke2ZpbGV9YCwgcmVzKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBcdTYzOTJcdTk2NjRcdTk3NUVtZFx1NkE5NFx1Njg0OFxyXG4gICAgICAgICAgICBjb25zdCBzdWZmaXggPSBwYXRoLmV4dG5hbWUoZmlsZSk7XHJcbiAgICAgICAgICAgIGlmIChzdWZmaXggIT09ICcubWQnKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgZnJvbnRtYXR0ZXIgPSBnZXRGcm9udE1hdHRlcihgJHtzdGFydFBhdGhOYW1lfS8ke2ZpbGVOYW1lfWApO1xyXG5cclxuICAgICAgICAgICAgaWYgKGZyb250bWF0dGVyLnRhZ3MgJiYgZnJvbnRtYXR0ZXIuaXNQdWJsaXNoZWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGAke3N0YXJ0UGF0aE5hbWUuc3BsaXQoJ1xccGFnZXMnKVsxXX0vJHtmaWxlTmFtZS5yZXBsYWNlKCcubWQnLCAnLmh0bWwnKX1gO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdGFnIG9mIGZyb250bWF0dGVyLnRhZ3MgYXMgc3RyaW5nW10pIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMudGFnc1t0YWddID0gcmVzLnRhZ3NbdGFnXSA/PyB7IGNvdW50OiAwLCBncm91cDogW10gfTtcclxuICAgICAgICAgICAgICAgICAgICByZXMudGFnc1t0YWddLmNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnRhZ3NbdGFnXS5ncm91cC5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGZyb250bWF0dGVyLnRpdGxlIGFzIHN0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2U6IGZyb250bWF0dGVyLmltYWdlIGFzIHN0cmluZyA/PyAnL2ltYWdlcy9ub19pbWFnZS5zdmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogZnJvbnRtYXR0ZXIuY2F0ZWdvcmllcyBhcyBzdHJpbmcgPz8gJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGU6IGZyb250bWF0dGVyLmNyZWF0ZWRBdCBhcyBzdHJpbmcgPz8gJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBpZiAoZnJvbnRtYXR0ZXIuY2F0ZWdvcnkpIHtcclxuICAgICAgICAgICAgLy8gICAgIHJlcy5jYXRlZ29yeS5wdXNoKGZyb250bWF0dGVyLmNhdGVnb3J5IGFzIHN0cmluZyk7XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlcztcclxufVxyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXHdhbXA2NFxcXFx3d3dcXFxcb3BzaGVsbC5naXRodWIuaW9cXFxcZG9jc1xcXFwudml0ZXByZXNzXFxcXHRoZW1lXFxcXGNvbmZpZ3NcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXHdhbXA2NFxcXFx3d3dcXFxcb3BzaGVsbC5naXRodWIuaW9cXFxcZG9jc1xcXFwudml0ZXByZXNzXFxcXHRoZW1lXFxcXGNvbmZpZ3NcXFxcbmF2LnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi93YW1wNjQvd3d3L29wc2hlbGwuZ2l0aHViLmlvL2RvY3MvLnZpdGVwcmVzcy90aGVtZS9jb25maWdzL25hdi50c1wiO2ltcG9ydCB7IERlZmF1bHRUaGVtZSB9IGZyb20gJ3ZpdGVwcmVzcyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBbXHJcbiAgICAvLyB7XHJcbiAgICAvLyAgICAgdGV4dDogJ0Fib3V0IE9wcycsXHJcbiAgICAvLyAgICAgbGluazogJy9hYm91dC1vcHNoZWxsJ1xyXG4gICAgLy8gfSxcclxuICAgIHtcclxuICAgICAgICB0ZXh0OiAnXHUyNzI4XHVGRTBGIFZpdGVwcmVzcyBUaGlydHkgRGF5JyxcclxuICAgICAgICBsaW5rOiAnL3ZpdGVwcmVzcy10aGlydHktZGF5cydcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgdGV4dDogJ0FydGljbGUnLFxyXG4gICAgICAgIGl0ZW1zOiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdMaWZlXFwncyBNdW11cnMnLFxyXG4gICAgICAgICAgICAgICAgbGluazogJy9hcnRpY2xlL2xpZmUtbXVybXVycy9saWZlJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnQ29kZSBTZWEnLFxyXG4gICAgICAgICAgICAgICAgaXRlbXM6IFtcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6ICdkZXZlbG9wZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rOiAnL2FydGljbGUvY29kZS1zZWEvZGV2ZWxvcGVyL2F1dGhlbnRpY2F0ZS8wMS1zZXNzaW9uLWNvb2tpZSdcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJ2phdmFzY3JpcHQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rOiAnL2FydGljbGUvY29kZS1zZWEvamF2YXNjcmlwdC9ob3ctaXMtdGhpcydcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJ3R5cGVzY3JpcHQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rOiAnL2FydGljbGUvY29kZS1zZWEvdHlwZXNjcmlwdC9lbnVtJ1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiAndml0ZXByZXNzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluazogJy9hcnRpY2xlL2NvZGUtc2VhL3ZpdGVwcmVzcy8yMDI0XHU5NDM1XHU0RUJBXHU4Q0ZEL2RheTAxLXByZWZhY2UnXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICB0ZXh0OiAnVGFncycsXHJcbiAgICAgICAgbGluazogJy90YWdzLWxpc3QnXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIHRleHQ6ICdSZXN1bWUnLFxyXG4gICAgICAgIGxpbms6ICcvcmVzdW1lLWxheW91dCdcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgdGV4dDogJ1Jlc3VtZS12dWUnLFxyXG4gICAgICAgIGxpbms6ICcvcmVzdW1lLXZ1ZSdcclxuICAgIH1cclxuICAgIC8vIHtcclxuICAgIC8vICAgICB0ZXh0OiAnUmVzdW1lJyxcclxuICAgIC8vICAgICBpdGVtczogW1xyXG4gICAgLy8gICAgICAgICB7XHJcbiAgICAvLyAgICAgICAgICAgICB0ZXh0OiAncmVzdW1lLXZ1ZScsXHJcbiAgICAvLyAgICAgICAgICAgICBsaW5rOiAnL3Jlc3VtZS12dWUnXHJcbiAgICAvLyAgICAgICAgIH0sXHJcbiAgICAvLyAgICAgICAgIHtcclxuICAgIC8vICAgICAgICAgICAgIHRleHQ6ICdyZXN1bWUtbWQnLFxyXG4gICAgLy8gICAgICAgICAgICAgbGluazogJy9yZXN1bWUtbWQnXHJcbiAgICAvLyAgICAgICAgIH0sXHJcbiAgICAvLyAgICAgICAgIHtcclxuICAgIC8vICAgICAgICAgICAgIHRleHQ6ICdyZXN1bWUtbGF5b3V0JyxcclxuICAgIC8vICAgICAgICAgICAgIGxpbms6ICcvcmVzdW1lLWxheW91dCdcclxuICAgIC8vICAgICAgICAgfVxyXG4gICAgLy8gICAgIF1cclxuICAgIC8vIH1cclxuXSBhcyBEZWZhdWx0VGhlbWUuTmF2SXRlbVtdO1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXHdhbXA2NFxcXFx3d3dcXFxcb3BzaGVsbC5naXRodWIuaW9cXFxcZG9jc1xcXFwudml0ZXByZXNzXFxcXHRoZW1lXFxcXGNvbmZpZ3NcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXHdhbXA2NFxcXFx3d3dcXFxcb3BzaGVsbC5naXRodWIuaW9cXFxcZG9jc1xcXFwudml0ZXByZXNzXFxcXHRoZW1lXFxcXGNvbmZpZ3NcXFxcc29jaWFsTGlua3MudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L3dhbXA2NC93d3cvb3BzaGVsbC5naXRodWIuaW8vZG9jcy8udml0ZXByZXNzL3RoZW1lL2NvbmZpZ3Mvc29jaWFsTGlua3MudHNcIjtpbXBvcnQgeyBEZWZhdWx0VGhlbWUgfSBmcm9tICd2aXRlcHJlc3MnO1xuXG5leHBvcnQgZGVmYXVsdCBbXG4gICAge1xuICAgICAgICBpY29uOiAnZ2l0aHViJyxcbiAgICAgICAgbGluazogJ2h0dHBzOi8vZ2l0aHViLmNvbS9PcHNoZWxsJyxcbiAgICAgICAgYXJpYUxhYmVsOiAnb3BzaGVsbFxcJ3MgZ2l0aHViJ1xuICAgIH0sXG4gICAge1xuICAgICAgICBpY29uOiAnaW5zdGFncmFtJyxcbiAgICAgICAgbGluazogJ2h0dHBzOi8vd3d3Lmluc3RhZ3JhbS5jb20vcGhlbm9teDk5OTAvJyxcbiAgICAgICAgYXJpYUxhYmVsOiAnb3BzaGVsbFxcJ3MgaW5zdGFncmFtJ1xuICAgIH1cbiAgICAvLyB7XG4gICAgLy8gICAgIGljb246IHtcbiAgICAvLyAgICAgICAgIHN2ZzogJzxzdmcgd2lkdGg9XCIyOFwiIGhlaWdodD1cIjI4XCIgdmlld0JveD1cIjAgMCAyOCAyOFwiIGZpbGw9XCJub25lXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPiA8cGF0aCBkPVwiTTIyLjUyMTcgNy4wNzUwN1YxNy4wNDM1QzE2Ljg0MDYgMTYuNDM2OCAxMS4xNTk0IDE1LjgyODEgNS40NzgyNyAxNS4yMTk0VjUuMjU5MTNDNS40NzgyNyA1LjI1OTEzIDUuNDc4MjcgNS4yNTcxIDUuNDgwMyA1LjI1NTA3QzYuNDUwMTYgMy4wNzU5NCA5LjEyNDM2IDEuMjA3MjUgMTIuNzg0NiAwTDIyLjUyMTcgNy4wNzUwN1pcIiBcIi8+IDxwYXRoIGQ9XCJNNi40NTgxNyAyNS43NTA5TDcuNTIxMzYgMjYuODE0MUM2Ljc4ODg5IDI3LjU0NjUgNS43NzU0MiAyOCA0LjY1ODQ2IDI4QzIuNDIyNTIgMjggMC42MDk2MTkgMjYuMTg3MSAwLjYwOTYxOSAyMy45NTEyQzAuNjA5NjE5IDIxLjcxNTIgMi40MjI1MiAxOS45MDIzIDQuNjU4NDYgMTkuOTAyM0M1Ljc3NjQzIDE5LjkwMjMgNi43ODk5MSAyMC4zNTU4IDcuNTIxMzYgMjEuMDg4M0w2LjQ1ODE3IDIyLjE1MTVDNS45OTc1OSAyMS42OTA5IDUuMzYxNSAyMS40MDY4IDQuNjU4NDYgMjEuNDA2OEMzLjI1MjM3IDIxLjQwNjggMi4xMTMxIDIyLjU0NjEgMi4xMTMxIDIzLjk1MjJDMi4xMTMxIDI1LjM1ODMgMy4yNTIzNyAyNi40OTc2IDQuNjU4NDYgMjYuNDk3NkM1LjM2MTUgMjYuNDk3NiA1Ljk5ODYgMjYuMjEyNSA2LjQ1ODE3IDI1Ljc1MjlWMjUuNzUwOVpcIiBcIi8+IDxwYXRoIGQ9XCJNMTIuNzU2MSAyMi4yMTU0VjIyLjcwMTRDMTIuMjgzNCAyMi4yNTQgMTEuNjQ5MyAyMS45ODQxIDEwLjkwNDcgMjEuOTg0MUM5LjI0Mjk2IDIxLjk4NDEgNy44OTY3MyAyMy4zMzA0IDcuODk2NzMgMjQuOTkyMUM3Ljg5NjczIDI2LjY1MzggOS4yNDI5NiAyOC4wMDAxIDEwLjkwNDcgMjguMDAwMUMxMS42NDgzIDI4LjAwMDEgMTIuMjgyNCAyNy43MzAyIDEyLjc1NjEgMjcuMjgyOFYyNy43Njg4SDE0LjE0NFYyMi4yMTU0SDEyLjc1NjFaTTEwLjkwNDcgMjYuNjEyMkMxMC4wMDk5IDI2LjYxMjIgOS4yODQ1NSAyNS44ODc5IDkuMjg0NTUgMjQuOTkyMUM5LjI4NDU1IDI0LjA5NjMgMTAuMDA5OSAyMy4zNzIgMTAuOTA0NyAyMy4zNzJDMTEuNzk5NSAyMy4zNzIgMTIuNTI0OCAyNC4wOTczIDEyLjUyNDggMjQuOTkyMUMxMi41MjQ4IDI1Ljg4NjkgMTEuNzk5NSAyNi42MTIyIDEwLjkwNDcgMjYuNjEyMlpcIiBcIi8+IDxwYXRoIGQ9XCJNMjcuMzMzMyAyNS41NzA0QzI3LjM3MTggMjUuMzg1NyAyNy4zOTExIDI1LjE5MDkgMjcuMzkxMSAyNC45OTIxQzI3LjM5MTEgMjMuMzMwNCAyNi4xODc5IDIxLjk4NDEgMjQuMzI1MyAyMS45ODQxQzIyLjQ2MjcgMjEuOTg0MSAyMS4yNTk1IDIzLjMzMDQgMjEuMjU5NSAyNC45OTIxQzIxLjI1OTUgMjYuNjUzOCAyMi42MzMxIDI4LjAwMDEgMjQuMzI1MyAyOC4wMDAxQzI1LjQyODEgMjguMDAwMSAyNi40MTIxIDI3LjY3NTQgMjcuMDU5NCAyNy4wMzEyTDI2LjEyMSAyNi4wOTI4QzI1Ljc2MDggMjYuNDc3MyAyNS4xNjAyIDI2LjY5NzUgMjQuMzI1MyAyNi42OTc1QzIzLjQ5MDQgMjYuNjk3NSAyMi45NDE2IDI2LjIyNzggMjIuNzUzOSAyNS41NjkzSDI3LjMzMzNWMjUuNTcwNFpNMjQuMzI1MyAyMy4yODU3QzI1LjE4MjYgMjMuMjg1NyAyNS43MDkxIDIzLjc1NjQgMjUuODk2OCAyNC40MTM4SDIyLjc1NDlDMjIuOTQyNiAyMy43NTY0IDIzLjQ3MDEgMjMuMjg1NyAyNC4zMjYzIDIzLjI4NTdIMjQuMzI1M1pcIiBcIi8+IDxwYXRoIGQ9XCJNMjEuMzAzMiAyNy43Njg3SDE5LjM0OTJMMTYuOTIwNSAyNS4zNFYyNy43Njg3SDE1LjUzMjdWMTkuOTA1NEMxNS45OTUzIDE5Ljk1NTEgMTYuNDU3OSAyMC4wMDM4IDE2LjkyMDUgMjAuMDUzNVYyNC40MTQ4TDE5LjEyIDIyLjIxNTRIMjEuMDczOUwxOC40MTE4IDI0Ljg3NzRMMjEuMzAzMiAyNy43Njg3WlwiIFwiLz4gPC9zdmc+J1xuICAgIC8vICAgICB9LFxuICAgIC8vICAgICBsaW5rOiAnaHR0cHM6Ly93d3cuY2FrZXJlc3VtZS5jb20vbWUvT3BzaGVsbCcsXG4gICAgLy8gICAgIGFyaWFMYWJlbDogJ29wc2hlbGxcXCdzIGNha2VyZXN1bWUnXG4gICAgLy8gfVxuXSBhcyBEZWZhdWx0VGhlbWUuU29jaWFsTGlua1tdO1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFx3YW1wNjRcXFxcd3d3XFxcXG9wc2hlbGwuZ2l0aHViLmlvXFxcXGRvY3NcXFxcLnZpdGVwcmVzc1xcXFx0aGVtZVxcXFxjb25maWdzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFx3YW1wNjRcXFxcd3d3XFxcXG9wc2hlbGwuZ2l0aHViLmlvXFxcXGRvY3NcXFxcLnZpdGVwcmVzc1xcXFx0aGVtZVxcXFxjb25maWdzXFxcXHNlYXJjaC50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovd2FtcDY0L3d3dy9vcHNoZWxsLmdpdGh1Yi5pby9kb2NzLy52aXRlcHJlc3MvdGhlbWUvY29uZmlncy9zZWFyY2gudHNcIjtpbXBvcnQgeyBEZWZhdWx0VGhlbWUgfSBmcm9tICd2aXRlcHJlc3MnO1xuXG4vLyBcdTg5ODFcdTYzOTJcdTk2NjRcdTc2ODRcdTc2RUVcdTkzMDRcbmNvbnN0IGlnbm9yZVBhdGggPSBbXG4gICAgJ3BhZ2VzL2FydGljbGUvbGlmZS1tdXJtdXJzJ1xuXTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIHByb3ZpZGVyOiAnbG9jYWwnLCAvLyBcdTU1NUZcdTUyRDUgbWluaVNlYXJjaFxuICAgIG9wdGlvbnM6IHtcbiAgICAgICAgdHJhbnNsYXRpb25zOiB7XG4gICAgICAgICAgICBidXR0b246IHtcbiAgICAgICAgICAgICAgICBidXR0b25UZXh0OiAnXHU2NDFDXHU1QzBCXHU2NTg3XHU3QUUwJyxcbiAgICAgICAgICAgICAgICBidXR0b25BcmlhTGFiZWw6ICdcdTY0MUNcdTVDMEJcdTY1ODdcdTdBRTAnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbW9kYWw6IHtcbiAgICAgICAgICAgICAgICBub1Jlc3VsdHNUZXh0OiAnXHU2MjdFXHU0RTBEXHU1MjMwXHU3NkY4XHU5NURDXHU1MTY3XHU1QkI5JyxcbiAgICAgICAgICAgICAgICBkaXNwbGF5RGV0YWlsczogJ1x1OEE3M1x1N0QzMFx1OEEwQVx1NjA2RicsXG4gICAgICAgICAgICAgICAgcmVzZXRCdXR0b25UaXRsZTogJ1x1NkUwNVx1OTY2NFx1NjQxQ1x1NUMwQlx1Njg5RFx1NEVGNicsXG4gICAgICAgICAgICAgICAgYmFja0J1dHRvblRpdGxlOiAnXHU4RkQ0XHU1NkRFXHU2NDFDXHU1QzBCXHU3RUQzXHU2NzlDJyxcbiAgICAgICAgICAgICAgICBmb290ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0VGV4dDogJ1x1OTA3OFx1NjRDNycsXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdEtleUFyaWFMYWJlbDogJ2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgbmF2aWdhdGVUZXh0OiAnXHU1MjA3XHU2M0RCJyxcbiAgICAgICAgICAgICAgICAgICAgbmF2aWdhdGVVcEtleUFyaWFMYWJlbDogJ3VwIGFycm93JyxcbiAgICAgICAgICAgICAgICAgICAgbmF2aWdhdGVEb3duS2V5QXJpYUxhYmVsOiAnZG93biBhcnJvdycsXG4gICAgICAgICAgICAgICAgICAgIGNsb3NlS2V5QXJpYUxhYmVsOiAnZXNjYXBlJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgX3JlbmRlcihzcmMsIGVudiwgbWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSBtZC5yZW5kZXIoc3JjLCBlbnYpO1xuICAgICAgICAgICAgLy8gXHU2MzkyXHU5NjY0IFx1NjcwOVx1OEEyRFx1NUI5QVx1NEUwRFx1N0Q2Nlx1NjQxQ1x1NUMwQiBcdTYyMTZcdTgwMDUgXHU2QzkyXHU2NzA5XHU3NjdDXHU1RTAzXHU3Njg0XHU5ODAxXHU5NzYyXG4gICAgICAgICAgICBpZiAoZW52LmZyb250bWF0dGVyPy5zZWFyY2ggPT09IGZhbHNlIHx8ICFlbnYuZnJvbnRtYXR0ZXI/LmlzUHVibGlzaGVkKVxuICAgICAgICAgICAgICAgIHJldHVybiAnJztcblxuICAgICAgICAgICAgLy8gXHU4OTgxXHU2MzkyXHU5NjY0XHU3Mjc5XHU1QjlBXHU3Njg0XHU3NkVFXHU5MzA0XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHBhdGggb2YgaWdub3JlUGF0aCkge1xuICAgICAgICAgICAgICAgIGlmIChlbnYucmVsYXRpdmVQYXRoLnN0YXJ0c1dpdGgocGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gXHU2NUIwXHU1ODlFXHU5MzI4XHU5RURFXG4gICAgICAgICAgICBpZiAoZW52LmZyb250bWF0dGVyPy50aXRsZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gbWQucmVuZGVyKGAjICR7ZW52LmZyb250bWF0dGVyLnRpdGxlfWApICsgaHRtbDtcblxuICAgICAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgICAgIH1cbiAgICB9XG59IGFzIERlZmF1bHRUaGVtZS5Db25maWdbJ3NlYXJjaCddO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtVSxPQUFPQSxXQUFVO0FBQ3BWLE9BQU9DLFNBQVE7QUFDZixTQUF1QixvQkFBb0I7QUFDM0MsT0FBTyxlQUFlO0FBRXRCLFNBQVMscUJBQXFCO0FBRTlCLE9BQU8sZ0JBQWdCO0FBQ3ZCLE9BQU8sZ0JBQWdCO0FBQ3ZCLFNBQVMsNEJBQTRCO0FBR3JDLE9BQU8sY0FBYzs7O0FDWjJTLE9BQU8sVUFBVTtBQUNqVixPQUFPLFFBQVE7QUFDZixPQUFPLFlBQVk7QUFGbkIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTSxhQUFhLEtBQUssUUFBUSxrQ0FBVyxVQUFVO0FBQ3JELElBQU0sYUFBYSxDQUFDLFVBQVU7QUFHOUIsSUFBTSxjQUFjLENBQUNDLFVBQWlCLEdBQUcsVUFBVUEsS0FBSSxFQUFFLFlBQVk7QUFFckUsSUFBTSxnQkFBZ0IsQ0FBQyxNQUFnQixTQUFtQixNQUFNLEtBQUssSUFBSSxJQUFJLEtBQUssT0FBTyxVQUFRLENBQUMsSUFBSSxJQUFJLElBQUksRUFBRSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7QUFHM0gsU0FBUyxlQUFlLFVBQWtCO0FBQ3RDLFFBQU0sVUFBVSxHQUFHLGFBQWEsVUFBVSxPQUFPO0FBQ2pELFFBQU0sRUFBRSxLQUFLLElBQUksT0FBTyxPQUFPO0FBRS9CLFNBQU87QUFDWDtBQUVBLFNBQVMsUUFBUSxRQUFrQixjQUFzQixXQUErQztBQUNwRyxRQUFNLE1BQU0sQ0FBQztBQUViLGFBQVcsUUFBUSxRQUFRO0FBQ3ZCLFVB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O0FBQUEsY0FFWjtBQUFBO0FBQUE7QUFBQSxjQUVBLENBQUMsWUFBWSxZQUFZO0FBQUEsWUFDN0I7QUFBQSxZQUNBLFNBQVM7QUFBQTtBQUFBLGNBRUwsQ0FBQyxXQUFXLE9BQU87QUFBQSxZQUN2QjtBQUFBLFlBQ0EsT0FBTyxDQUFDLFlBQVksZUFBZSxnQkFBZ0IsS0FBSztBQUFBLFVBQzVEO0FBQUEsUUFDSjtBQUFBLFFBQ0EsTUFBTSxDQUFDO0FBQUEsUUFDUCxLQUFLO0FBQUE7QUFBQSxRQUNMLGFBQWE7QUFBQSxRQUNiLFVBQVU7QUFBQSxVQUNOLFNBQVM7QUFBQTtBQUFBLFVBQ1QsVUFBVTtBQUFBLFVBQ1Ysa0JBQWtCO0FBQUEsUUFDdEI7QUFBQSxNQUNKLENBQUM7QUFBQSxNQUNELFdBQVc7QUFBQSxRQUNQLE1BQU0sQ0FBQyxjQUFjO0FBQUE7QUFBQSxRQUNyQixLQUFLO0FBQUE7QUFBQSxRQUNMLFlBQVksQ0FBQyxPQUFPLElBQUk7QUFBQTtBQUFBLFFBQ3hCLFNBQVMsQ0FBQyxVQUFVLGNBQWMsT0FBTztBQUFBO0FBQUEsUUFDekMsc0JBQXNCO0FBQUE7QUFBQSxRQUN0QixXQUFXLENBQUM7QUFBQTtBQUFBLE1BQ2hCLENBQUM7QUFBQSxNQUNELHFCQUFxQjtBQUFBLFFBQ2pCLFVBQVUsQ0FBQ0QsTUFBSyxRQUFRQyxtQ0FBVyxPQUFPLGNBQWMsQ0FBQztBQUFBO0FBQUE7QUFBQSxRQUV6RCxVQUFVO0FBQUE7QUFBQSxRQUNWLFFBQVE7QUFBQTtBQUFBLFFBQ1IsYUFBYTtBQUFBO0FBQUEsTUFDakIsQ0FBQztBQUFBLElBQ0w7QUFBQTtBQUFBLElBRUEsS0FBSztBQUFBLE1BQ0QsY0FBYztBQUFBO0FBQUEsTUFDZCxxQkFBcUI7QUFBQSxRQUNqQixNQUFNO0FBQUEsVUFDRixnQkFBZ0I7QUFBQSxVQUNoQixTQUFTO0FBQUEsUUFDYjtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUFBLEVBRUEsaUJBQWlCO0FBQ3JCLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiLCAiZnMiLCAicGF0aCIsICJwYXRoIiwgImZzIiwgIm1hdHRlciIsICJpc0RpcmVjdG9yeSIsICJwYXRoIiwgImZzIiwgImdldEZyb250TWF0dGVyIiwgIm1hdHRlciIsICJwYXRoIiwgIl9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lIiwgInBhdGgiLCAiX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUiLCAiZnMiXQp9Cg==
