export interface TypeSpec {
    tag: string; // HTML 標籤 (h1, p, a...)
    name: string; // 顯示名稱 (Heading 1)
    specs: Record<string, string>; // CSS 變數對照表
    description?: string; // 用法說明
    sample: string; // 範例文本
}

/**
 * 文章內文的排版（2026-10 翻新「筆記本」，樣式在 theme/scss/_notebook.scss）。
 * 範例放在 .nb-prose 裡，跟文章頁用的是同一份樣式。
 */
export const typeScales: TypeSpec[] = [
    {
        tag: 'h2',
        name: '段落標題 h2',
        specs: {
            'font-family': '--nb-font-sans',
            'font-size': '--nb-step-3 (24px)',
            'font-weight': '700',
            'border-top': '1px solid --nb-rule'
        },
        description: '無襯線，跟襯線內文分得開；前面一條紙上的線，像筆記換一個主題。',
        sample: '為什麼要先防守？永和九年，歲在癸丑。'
    },
    {
        tag: 'h3',
        name: '小節標題 h3',
        specs: {
            'font-family': '--nb-font-sans',
            'font-size': '--nb-step-2 (21px)',
            'font-weight': '700'
        },
        sample: '邊界意識：建立你的海關'
    },
    {
        tag: 'h4',
        name: '細項標題 h4',
        specs: {
            'font-family': '--nb-font-sans',
            'font-size': '--nb-step-1 (18px)',
            'font-weight': '700'
        },
        sample: '預期失敗：為 undefined 寫程式'
    },
    {
        tag: 'p',
        name: '內文',
        specs: {
            'font-family': '--nb-font-serif（Noto Serif TC）',
            'font-size': '--nb-read-size (17px)',
            'line-height': '--nb-read-leading (1.9)',
            'max-width': '--nb-measure (38em)'
        },
        description: '襯線字、行高 1.9、一行約 38 個中文字，長文讀起來不累。',
        sample: '寫程式，真的是一趟不斷學習如何「不要 Gank 未來的自己」的旅程。永和九年，歲在癸丑，暮春之初，會于會稽山陰之蘭亭，修禊事也。The quick brown fox jumps over the lazy dog.'
    },
    {
        tag: 'strong',
        name: '重點（螢光筆）',
        specs: {
            'background': 'linear-gradient(transparent 58%, --nb-marker-soft 58%)',
            'font-weight': '700'
        },
        description: '粗體就是用螢光筆畫過的重點。整頁只有這裡和「目前位置」會用到黃色。',
        sample: '防守，是為了創造一個絕對安全的環境'
    },
    {
        tag: 'code',
        name: '行內程式碼',
        specs: {
            'font-family': '--nb-font-mono',
            'background': '--nb-paper-2',
            'border': '1px solid --nb-rule'
        },
        description: '跟內文同一個墨色，不再是橘色；它是程式碼，不是強調。',
        sample: 'useQuery'
    },
    {
        tag: 'a',
        name: '連結（藍墨水）',
        specs: {
            'color': '--nb-link',
            'text-decoration': 'underline 40%'
        },
        sample: '看完整的說明'
    }
];

export const fontFamilies = [
    { name: '內文襯線 Noto Serif TC', var: '--nb-font-serif' },
    { name: '介面無襯線 Roboto＋Noto Sans TC', var: '--nb-font-sans' },
    { name: '等寬 Fira Code（程式碼、後台）', var: '--nb-font-mono' }
];

/** 字級：古典比例 12／14／16／18／21／24／36／48（2026-10 翻新）。舊的 --font-size-* 還在，叮咚宣傳頁與舊元件在用 */
export const fontSizes = [
    { name: '書名', var: '--nb-step-5', val: '3rem (48px)', sample: '筆記' },
    { name: '文章標題', var: '--nb-step-4', val: '2.25rem (36px)', sample: '筆記' },
    { name: '段落標題', var: '--nb-step-3', val: '1.5rem (24px)', sample: '筆記' },
    { name: '小節標題', var: '--nb-step-2', val: '1.3125rem (21px)', sample: '筆記' },
    { name: '清單標題', var: '--nb-step-1', val: '1.125rem (18px)', sample: '筆記' },
    { name: '內文（文章）', var: '--nb-read-size', val: '1.0625rem (17px)', sample: '筆記' },
    { name: '介面', var: '--nb-step-0', val: '1rem (16px)', sample: '筆記' },
    { name: '頁邊、說明', var: '--nb-step--1', val: '.875rem (14px)', sample: '筆記' },
    { name: '最小', var: '--nb-step--2', val: '.75rem (12px)', sample: '筆記' }
];

export const animations = [
    {
        name: 'Fast In, Slow Out',
        var: '--cubic-FiSo',
        desc: '本站最主要使用用的，適合進、出場動畫，快速出現後緩慢定位。',
        bezier: 'cubic-bezier(.37, .99, .92, .96)'
    },
    {
        name: 'Fast In, Fast Out',
        var: '--cubic-FiFo',
        desc: '快進快出，快速轉換狀態。',
        bezier: 'cubic-bezier(.25, .65, .85, .45)'
    },
    {
        name: 'S In, R Out',
        var: '--cubic-SiRo',
        desc: '快速回彈。',
        bezier: 'cubic-bezier(.31, 1.26, .19, 1.11)'
    },
    {
        name: 'S In, M Out',
        var: '--cubic-SiMo',
        desc: '緩進微彈。',
        bezier: 'cubic-bezier(.3, 1, .94, 1.1)'
    }
];
