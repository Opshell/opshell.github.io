import { DefaultTheme } from 'vitepress';

export default [
    {
        text: 'Article',
        items: [
            {
                // AI 專區：技術與心得都在這，首頁可以切分類（pages/article/ai/index.md）
                text: 'AI',
                link: '/article/ai/'
            },
            {
                text: 'Life\'s Mumurs',
                link: '/article/life-murmurs/life'
            },
            // [+] Front-End Basic（HTML／CSS／JavaScript 的索引頁還沒做，做好再放回來）
            {
                text: 'Code Sea',
                items: [
                    {
                        text: 'developer',
                        link: '/article/code-sea/developer/authenticate/01-session-cookie'
                    },
                    {
                        text: 'javascript',
                        link: '/article/code-sea/javascript/how-is-this'
                    },
                    {
                        text: 'typescript',
                        link: '/article/code-sea/typescript/enum'
                    },
                    {
                        text: 'vue',
                        link: '/article/code-sea/vue/version-upgrade'
                    },
                    {
                        text: 'vitepress',
                        link: '/article/code-sea/vitepress/2024鐵人賽/day01-preface'
                    }
                ]
            }
        ]
    },
    {
        text: 'Portfolio',
        items: [
            // [+] 活動&賽事：/article/portfolio/competition/ 還沒有頁面
            {
                text: 'Side Projects',
                items: [
                    {
                        text: 'Blog Design System',
                        link: '/design-system'
                    },
                    {
                        text: '3D Galaxy Posts（beta）',
                        link: '/galaxy-posts'
                    },
                    // [+] Flosker：頁面還沒做，做好再放回來（/flosker）
                    {
                        text: 'DinDon 記帳',
                        link: '/dindon/' // 頁面是 dindon/index.md，沒開 cleanUrls，少了結尾斜線會 404
                    }
                ]
            },
            {
                text: 'photography',
                link: '/gallery' // /article/portfolio/photography/
            }
        ]
    },
    {
        // 叮咚記帳自己一個大項：Google Play 會把隱私權與刪除帳號的網址交出去給使用者，
        // 從導覽列也要找得到（頁面都沒開 cleanUrls，連結一定要留結尾斜線，少了會 404）
        text: 'DinDon 記帳',
        items: [
            {
                text: '關於叮咚記帳',
                link: '/dindon/'
            },
            {
                text: '隱私權政策',
                link: '/dindon/privacy/'
            },
            {
                text: '刪除資料與帳號',
                link: '/dindon/account/'
            }
        ]
    },
    {
        text: 'Archive',
        items: [
            {
                text: 'Tags List',
                link: '/tags-list'
            },
            {
                text: 'Timeline',
                link: '/timeline'
            }
        ]
    },
    {
        text: 'Resume',
        link: '/resume'
    }
] as DefaultTheme.NavItem[];
