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
                text: '工作專案',
                link: '/article/portfolio/works/'
            },
            {
                text: '活動&賽事',
                link: '/article/portfolio/competition/'
            },
            {
                text: 'Side Project',
                link: '/article/portfolio/side-project/'
            },
            {
                text: 'photography',
                link: '/article/portfolio/photography/'
            }
        ]
    },
    {
        text: 'Tags',
        link: '/tags-list'
    },
    {
        text: 'Resume',
        link: '/resume-layout'
    }
] as DefaultTheme.NavItem[];
