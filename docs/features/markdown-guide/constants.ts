// Markdown 語法圖鑑的資料：四道光（層）與每個語法在文章裡的使用篇數。
// 篇數是 2026-10-05 用 grep 掃 docs/pages/article 底下 262 個 md（含草稿）得到的，
// 是「有幾篇用過」不是「用了幾次」，重掃時一起更新 SCAN_DATE。

export type LayerKey = 'text' | 'block' | 'code' | 'live' | 'off';

export interface Layer {
    key: LayerKey;
    name: string;
    en: string;
    desc: string;
}

export type TabKey = 'overview' | LayerKey;

export interface GuideTab {
    key: TabKey;
    name: string;
    // 這一頁裡面的小節（h3 的 id），照頁面上的順序；側邊導覽拿來當目錄
    items: { id: string; name: string }[];
}

// 卡片裡「寫法｜呈現」的寬度比例：三段開關切換，預設各半
export type SplitMode = 'source' | 'even' | 'render';

export const SPLIT_MODES: { key: SplitMode; label: string }[] = [
    { key: 'source', label: '寫法 70%、呈現 30%' },
    { key: 'even', label: '寫法與呈現各半' },
    { key: 'render', label: '寫法 30%、呈現 70%' }
];

export interface Usage {
    id: string;
    name: string;
    layer: LayerKey;
    posts: number;
}

export const SCAN_DATE = '2026-10-05';
export const TOTAL_POSTS = 262;

// 顏色在 MdPrism 的 SCSS 裡（--md-layer-*），四色經過色盲與深淺色驗證，順序固定不要對調
export const LAYERS: Layer[] = [
    { key: 'text', name: '文字層', en: 'Inline', desc: '一句話裡面：強調、註記、語氣' },
    { key: 'block', name: '區塊層', en: 'Block', desc: '一段話的外框：提醒、引言、表格' },
    { key: 'code', name: '程式碼層', en: 'Code', desc: '程式碼本身：高亮、增刪、分頁' },
    { key: 'live', name: '互動層', en: 'Live', desc: '會動的東西：Vue 元件、線上沙盒' }
];

export const LAYER_OFF: Layer = { key: 'off', name: '還沒折射', en: 'Off', desc: '裝了或寫了，但還沒啟用' };

export const USAGES: Usage[] = [
    { id: 'heading', name: '標題 ## / ###', layer: 'block', posts: 127 },
    { id: 'inline-code', name: '行內程式碼', layer: 'text', posts: 114 },
    { id: 'code-block', name: '程式碼區塊', layer: 'code', posts: 95 },
    { id: 'image', name: '圖片', layer: 'block', posts: 61 },
    { id: 'bold', name: '粗體 **', layer: 'text', posts: 45 },
    { id: 'container', name: '提示容器 :::', layer: 'block', posts: 36 },
    { id: 'blockquote', name: '一般引用 >', layer: 'block', posts: 36 },
    { id: 'strike', name: '刪除線 ~~', layer: 'text', posts: 33 },
    { id: 'vue', name: 'Vue 元件', layer: 'live', posts: 21 },
    { id: 'diff', name: '增刪標記 [!code ++]', layer: 'code', posts: 17 },
    { id: 'code-group', name: '程式碼分頁', layer: 'code', posts: 15 },
    { id: 'attrs', name: '屬性著色 {.class}', layer: 'text', posts: 13 },
    { id: 'table', name: '表格', layer: 'block', posts: 7 },
    { id: 'highlight', name: '行高亮與錯誤標記', layer: 'code', posts: 2 },
    { id: 'quote', name: '引言 ::: quote', layer: 'block', posts: 2 },
    { id: 'sandbox', name: '沙盒 ::: sandbox', layer: 'live', posts: 2 },
    { id: 'task', name: '任務清單 [ ]', layer: 'block', posts: 1 },
    { id: 'footnote-math', name: '腳註、數學式', layer: 'off', posts: 2 },
    { id: 'mark', name: '螢光標記', layer: 'text', posts: 0 }
];

// 頁面分頁：總覽放光譜，其他照四道光＋還沒折射。items 的 id 要跟 guide.md 裡 h3 的 {#id} 一致
const name = (id: string) => USAGES.find(usage => usage.id === id)?.name ?? id;
const items = (...ids: string[]) => ids.map(id => ({ id, name: name(id) }));

export const GUIDE_TABS: GuideTab[] = [
    { key: 'overview', name: '光譜總覽', items: [] },
    { key: 'text', name: '文字層', items: items('bold', 'attrs', 'mark', 'strike', 'inline-code') },
    { key: 'block', name: '區塊層', items: items('heading', 'container', 'quote', 'blockquote', 'table', 'task', 'image') },
    { key: 'code', name: '程式碼層', items: items('code-block', 'diff', 'highlight', 'code-group') },
    { key: 'live', name: '互動層', items: items('vue', 'sandbox') },
    {
        key: 'off',
        name: '還沒折射',
        items: [
            { id: 'footnote-math', name: '腳註、數學式' },
            { id: 'builtin-unused', name: '內建但還沒用過的' }
        ]
    }
];
