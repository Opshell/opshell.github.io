// 首頁（目錄頁）的文案。部落格自己的介紹沿用舊首頁的 hero 與四個主題（2026-10 翻新時從 pages/index.md 搬過來）。

export const BLOG_NAME = 'Opshell\'s Blog';
export const BLOG_INTRO = '一個藉由分享前端開發、各種想法、奇怪技能及其他雜項來與世界互動的部落格。';
export const BLOG_MOTTO = '平凡即卓越。';

/** 這本筆記寫些什麼（舊首頁的四張卡片，改成頁邊的一段說明） */
export const topics: { title: string; text: string }[] = [
    { title: '程式技巧與除錯', text: '踩雷、填坑、除蟲，寫成技術筆記來對抗我的健忘。' },
    { title: '靈魂財富', text: '「萬般帶不走，唯有業隨身」，記下銘刻在靈魂裡的收穫。' },
    { title: '三分鐘熱度', text: '一時興起的興趣，成不成功都是一種人生體驗。' },
    { title: '生活雜記', text: '柴、米、油、鹽、醬、醋、茶。' }
];

/** 頁首的幾個入口：時間軸是全部文章，其他是站上的作品 */
export const shortcuts: { text: string; href: string }[] = [
    { text: '全部文章（時間軸）', href: '/timeline.html' },
    { text: '標籤', href: '/tags-list.html' },
    { text: '履歷', href: '/resume.html' },
    { text: '叮咚記帳', href: '/dindon/' },
    { text: '設計系統', href: '/design-system.html' }
];

/** 分類（frontmatter 的 categories）在目錄上顯示的名字；沒列的照原樣顯示 */
export const CATEGORY_LABELS: Record<string, string> = {
    'typescript-thirty-days': 'TypeScript 三十天',
    'vitepress-thirty-days': 'VitePress 三十天',
    'Belief': '靈魂財富',
    'developer': '開發者的日常',
    'Web Application': 'Web 應用',
    'vue': 'Vue'
};

/** 首頁「最近寫的」列幾篇 */
export const LATEST_COUNT = 6;
