export interface TypeSpec {
    tag: string;       // HTML 標籤 (h1, p, a...)
    name: string;      // 顯示名稱 (Heading 1)
    specs: Record<string, string>; // CSS 變數對照表
    description?: string; // 用法說明
    sample: string;    // 範例文本
}

export const typeScales: TypeSpec[] = [
    {
        tag: 'h1',
        name: 'Heading 1',
        specs: {
            'color': '--color-gray-900',
            'font-size': '--font-size-xxl (36px)',
            'font-weight': '600',
            'line-height': '1.25',
        },
        description: '頁面主標題，每頁僅使用一次。',
        sample: 'The quick brown fox jumps over the lazy dog. 永和九年，歲在癸丑，暮春之初，會于會稽山陰之蘭亭。'
    },
    {
        tag: 'h2',
        name: 'Heading 2',
        specs: {
            'padding-top': '1.5rem',
            'border-top': '1px solid --color-gray-300',
            'color': '--color-gray-850',
            'font-size': '--font-size-xl (26px)',
            'font-weight': '500',
            'line-height': '1.4',
        },
        description: '主要章節標題，上方帶有分隔線。',
        sample: 'The quick brown fox jumps over the lazy dog永和九年，歲在癸丑，暮春之初，會于會稽山陰之蘭亭。'
    },
    {
        tag: 'h3',
        name: 'Heading 3',
        specs: {
            'color': '--color-gray-850',
            'font-size': '--font-size-l (20px)',
            'font-weight': '500',
            'line-height': '1.5'
        },
        sample: 'The quick brown fox jumps over the lazy dog永和九年，歲在癸丑，暮春之初，會于會稽山陰之蘭亭。'
    },
    {
        tag: 'h4',
        name: 'Heading 4',
        specs: {
            'color': '--color-gray-850',
            'font-size': '--font-size-l (20px)',
            'font-weight': '500',
            'line-height': '1.5'
        },
        description: '與 H3 字級相同，但語意層級較低。',
        sample: 'The quick brown fox jumps over the lazy dog永和九年，歲在癸丑，暮春之初，會于會稽山陰之蘭亭。'
    },
    {
        tag: 'h5',
        name: 'Heading 5',
        specs: {
            'color': '--color-gray-850',
            'font-size': '--font-size-l (20px)',
            'font-weight': '500',
            'line-height': '1.625'
        },
        description: '基本上很少用到',
        sample: 'The quick brown fox jumps over the lazy dog永和九年，歲在癸丑，暮春之初，會于會稽山陰之蘭亭。'
    },
    {
        tag: 'h6',
        name: 'Heading 6',
        specs: {
            'color': '--color-gray-850',
            'font-size': '--font-size-l (20px)',
            'font-weight': '500',
            'line-height': '1.625'
        },
        description: '與 H5 設計相同，但語意層級較低。',
        sample: 'The quick brown fox jumps over the lazy dog永和九年，歲在癸丑，暮春之初，會于會稽山陰之蘭亭。'
    },
    {
        tag: 'p',
        name: 'Body Text',
        specs: {
            'font-size': '--font-size-m (16px)',
            'font-weight': '400',
            'line-height': '1.8',
            'color': '--color-gray-800'
        },
        description: '文章主要內文，注重閱讀舒適度與行高。',
        sample: 'The quick brown fox jumps over the lazy dog. 永和九年，歲在癸丑，暮春之初，會于會稽山陰之蘭亭。這是一段中文測試文字。即使是在長篇文章中，這樣的行高與字距也能保持良好的閱讀體驗。'
    },
    {
        tag: 'a',
        name: 'Link',
        specs: {
            'color': '--color-primary-2',
            'font-weight': '400',
        },
        sample: '這是一個超連結樣式 (Hyperlink)'
    },
];

export const fontFamilies = [
    { name: 'Base (Sans-Serif)', var: '--font-sans-serif' },
    { name: 'Monospace (Code)', var: '--font-monospace' },
];

export const fontSizes = [
    { name: '2X Large', var: '--font-size-xxl', val: '2.25rem (36px)', sample: 'Ag' },
    { name: 'Extra Large', var: '--font-size-xl', val: '1.625rem (26px)', sample: 'Ag' },
    { name: 'Large', var: '--font-size-l', val: '1.25rem (20px)', sample: 'Ag' },
    { name: 'Medium', var: '--font-size-m', val: '1rem (16px)', sample: 'Ag' },
    { name: 'Small', var: '--font-size-s', val: '0.875rem (14px)', sample: 'Ag' },
    { name: 'Extra Small', var: '--font-size-xs', val: '0.75rem (12px)', sample: 'Ag' },
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