// 首頁的文案。hero 的三句與入口沿用舊首頁（VitePress home 版型）的內容，2026-10「稜鏡」翻新時搬進來。

export const BLOG_NAME = 'Opshell\'s Blog';
export const BLOG_INTRO = '一個藉由分享前端開發、各種想法、奇怪技能及其他雜項來與世界互動的部落格。';
export const BLOG_MOTTO = '平凡即卓越.';

/** hero 底下的入口（舊首頁的那排按鈕）；primary 是實心的那顆 */
export const shortcuts: { text: string; href: string; primary?: boolean }[] = [
    { text: 'Timeline', href: '/timeline.html', primary: true },
    { text: 'Resume', href: '/resume.html' },
    { text: '✨ DinDon 記帳', href: '/dindon/' },
    { text: 'Vitepress Thirty Days', href: '/article/code-sea/vitepress/2024鐵人賽/day01-preface.html' },
    { text: 'Design system', href: '/design-system.html' }
];

/** 首頁「最近寫的」列幾篇 */
export const LATEST_COUNT = 6;

/** 名字的由來：摘自〈Opshell 的哲學意義〉，首頁最底下那一段 */
export const PHILOSOPHY_URL = '/article/life-murmurs/opshell-的哲學意義.html';
export const nameParts: { part: string; title: string; text: string }[] = [
    { part: 'O', title: '唯一的圓滿', text: '大爆炸之前的奇點、禪宗的圓相，一切都還在那個「一」裡。' },
    { part: 'P', title: '指向現實的指標', text: '像光經過三稜鏡：你就是其中一抹獨特的顏色。' },
    { part: 'Shell', title: '與核心溝通的介面', text: '殼不是束縛，是接收器。透過它，「全」才體會得到冷熱與悲歡。' }
];
