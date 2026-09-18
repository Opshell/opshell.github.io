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
                        text: '3D Galaxy Posts',
                        link: '/galaxy-posts'
                    },
                    {
                        text: 'Flosker',
                        link: '/flosker'
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
