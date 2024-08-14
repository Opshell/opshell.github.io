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
                link: '/article/life-mumurs/life'
            },
            {
                text: 'Code Sea',
                items: [
                    {
                        text: 'typescript',
                        link: '/article/code-sea/typescript/day-1'
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
        text: 'Resume',
        link: '/resume'
    }
] as DefaultTheme.NavItem[];
