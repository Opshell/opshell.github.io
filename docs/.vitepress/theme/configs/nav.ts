import { DefaultTheme } from 'vitepress';

export default [
    {
        text: 'Article',
        items: [
            {
                text: 'Life\'s Mumurs',
                link: '/article/life-murmurs/life'
            },
            {
                text: 'Front-End Basic',
                items: [
                    {
                        text: 'HTML',
                        link: '/article/code-sea/html'
                    },
                    {
                        text: 'CSS',
                        link: '/article/code-sea/css'
                    },
                    {
                        text: 'Javascript',
                        link: '/article/code-sea/javascript'
                    }
                ]
            },
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
            {
                text: '活動&賽事',
                link: '/article/portfolio/competition/'
            },
            {
                text: 'Side Projects',
                items: [
                    {
                        text: 'Blog Design System',
                        link: '/design-system'
                    },
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
