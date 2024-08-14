import { DefaultTheme } from 'vitepress';

export default {
    provider: 'local',
    options: {
        translations: {
            button: {
                buttonText: "搜尋文章",
                buttonAriaLabel: "搜尋文章",
            },
            modal: {
                noResultsText: "找不到相關內容",
                displayDetails: '詳細訊息',
                resetButtonTitle: "清除搜尋條件",
                backButtonTitle: '返回搜尋结果',
                footer: {
                    selectText: "選擇",
                    selectKeyAriaLabel: 'enter',
                    navigateText: "切換",
                    navigateUpKeyAriaLabel: 'up arrow',
                    navigateDownKeyAriaLabel: 'down arrow',
                    closeKeyAriaLabel: 'escape'
                },
            },
        },
        _render(src, env, md) {
            const html = md.render(src, env);
            if (env.frontmatter?.search === false) return ''

            // 要排除的頁面
            if (env.relativePath.startsWith('some/path')) return ''

            // 新增錨點
            if (env.frontmatter?.title) return md.render(`# ${env.frontmatter.title}`) + html

            return html
        },
    },
} as DefaultTheme.Config["search"];






