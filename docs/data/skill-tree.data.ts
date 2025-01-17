import { defineLoader } from 'vitepress';

export interface Data {
    icon: string
    title: string
    summary: string
    href: string
}

declare const data: Data[];
export { data };

export default defineLoader({
    load() {
        return [
            {
                title: 'Front-End basic',
                summary: '頁面基礎還原能力',
                items: [
                    {
                        icon: 'html',
                        title: 'HTML5',
                        summary: '包含 HTML、HTML5、Web標準; W3C 規範介紹，以及前端常用的開發軟件 VSCode 下載安裝。列舉了 16 種常用標籤和一部分語義化標籤。',
                        href: '/article/code-sea/html'
                    },
                    {
                        icon: 'css',
                        title: 'CSS3',
                        summary: 'CSS3 還有選擇器，flex、grid 的使用、RWD 或是一些奇技淫巧。',
                        href: '/article/code-sea/html'
                    },
                    {
                        icon: 'javascript',
                        title: 'Javascript',
                        summary: 'JavaScript 是前端的核心技術，是必須要掌握的。基礎中包含了數據類型、基礎語法、內置對象、事件、BOM、DOM 對象模型。',
                        href: '/article/code-sea/html'
                    },
                ]
            },
        ];
    }
});
