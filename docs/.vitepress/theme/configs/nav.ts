import { DefaultTheme } from 'vitepress';

export default [
    {
        text: 'About Ops',
        link: '/about-opshell'
    },
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
                        link: '/article/code-sea/vitepress/day-1'
                    }
                ]
            }
        ]
    },
    {
        text: 'Tags',
        link: '/tags-list'
    },
    {
        text: 'Resume',
        items: [
            {
                text: 'resume-vue',
                link: '/resume-vue'
            },
            {
                text: 'resume-md',
                link: '/resume-md'
            },
            {
                text: 'resume-layout',
                link: '/resume-layout'
            }
        ]
    }
] as DefaultTheme.NavItem[];
