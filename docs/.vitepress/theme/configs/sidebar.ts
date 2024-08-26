import { DefaultTheme } from 'vitepress';

export default {
    '/article/code-sea/': [
        { text: 'Why is Typescript', link: '/article/code-sea/typescript/day-2' },
        { text: 'Why is Vitepress', link: '/article/code-sea/vitepress/day-2' }
    ],
    '/article/code-sea/typescript/': [
        {
            text: 'Typescript',
            items: [
                { text: '1. 前言', link: '/article/code-sea/typescript/day-1' },
                { text: 'Enum & 使用情境', link: '/article/code-sea/typescript/enum' }
            ]
        }
    ],
    '/article/code-sea/vitepress/': [
        {
            text: 'Vitepress',
            items: [
                { text: '1. Opshell 碎碎念', link: '/article/code-sea/vitepress/day-1' },
                { text: '2. Why is Vitepress', link: '/article/code-sea/vitepress/day-2' },
                { text: '3. Home from init', link: '/article/code-sea/vitepress/day-3' },
                { text: '4. Stylelint', link: '/article/code-sea/vitepress/day-4' }
            ]
        }
    ],
    '/article/life-murmurs/': [
        {
            text: 'Life Mumurs',
            items: [
                { text: 'Life is it', link: '/article/life-murmurs/life' }
            ]
        }
    ]
} as DefaultTheme.Sidebar;
