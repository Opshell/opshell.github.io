// 首頁的文案。hero 的三句與入口沿用舊首頁（VitePress home 版型）的內容，2026-10「稜鏡」翻新時搬進來。

export const BLOG_NAME = 'Opshell\'s Blog';
export const BLOG_INTRO = '一個藉由分享前端開發、各種想法、奇怪技能及其他雜項來與世界互動的部落格。';
export const BLOG_MOTTO = '平凡即卓越.';

/**
 * 「最近在忙的」三張大卡（2026-10 翻新第二版，使用者：「timeline、Resume、DinDon 記帳這種，目前最想快速連到、或最近在開發的東西」；
 * 2026-10-11 Timeline 換成 Flowsker）。換主力專案時改這裡。
 */
export const launchpads = {
    dindon: {
        title: 'DinDon 記帳',
        status: '開發中',
        text: '付款的那一刻，帳就記好了。我正在做的 Android 記帳 App，封閉測試中。',
        href: '/dindon/',
        icon: '/images/dindon/icon.webp',
        screen: '/images/dindon/home.webp',
        /** 卡片左下的小標籤：它會做什麼，一眼看完 */
        features: ['付款通知自動記帳', '拍照', '用說的', '帳單截圖', '小精靈提醒', '徽章'],
        links: [
            { text: '功能地圖', href: '/dindon/guide/' },
            { text: '功能演示', href: '/dindon/demo/' }
        ]
    },
    // 2026-10-11 使用者：Timeline 那張換成 Flowsker（剛上線的反向番茄鐘）；Timeline 退到底下那排小入口
    flowsker: {
        title: 'Flowsker',
        status: '剛上線',
        text: '專注到你想停為止，休息按比例給你。反向番茄鐘的任務與專注力管理器，AI 小精靈能直接開任務給你。',
        href: '/flowsker/',
        icon: '/images/flowsker/icon.svg',
        screen: '/images/flowsker/tasks-small.webp',
        features: ['休息 = 專注 ÷ 5', '任務累積心流', '小精靈開任務', 'AI 辦公室', 'Google Calendar'],
        links: [
            { text: '打開 flowsker.com', href: 'https://flowsker.com/' }
        ]
    },
    resume: {
        title: 'Resume',
        role: 'Senior Front-End Developer',
        text: '熱衷於「解決混亂」與「提升團隊產能」的前端工程師。',
        href: '/resume.html',
        portrait: '/images/resume/portrait.webp'
    }
} as const;

/** 大卡底下一排小的入口（舊首頁那排按鈕剩下的） */
export const moreLinks: { text: string; href: string }[] = [
    { text: 'Timeline', href: '/timeline.html' },
    { text: 'VitePress 三十天', href: '/article/code-sea/vitepress/2024鐵人賽/day01-preface.html' },
    { text: 'Design system', href: '/design-system.html' },
    { text: 'Tags', href: '/tags-list.html' }
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
