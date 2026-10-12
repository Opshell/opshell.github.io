import type { Work } from './workExperience.data';
import { defineLoader } from 'vitepress';

// 自己做的產品，放在工作經歷前面：這是履歷上最新、而且當場打得開的東西。
// 跟工作經歷共用 Work 介面與 <WorkExperience>，差別只在用 link 取代 location。順序：新的在前。
declare const data: Work[];
export { data };

export default defineLoader({
    load(): Work[] {
        return [
            {
                logo: '/images/flowsker/icon.svg',
                company: 'Flowsker',
                companyAlt: 'Flowmodoro 任務與專注力管理器',
                jobTitle: 'Vue 3 ＋ Go・自己做 Google 登入與 Calendar 授權',
                period: '2026.10 - Now',
                link: 'https://flowsker.com',
                linkText: 'flowsker.com'
            },
            {
                logo: '/images/dindon/icon.webp',
                company: '叮咚記帳',
                companyAlt: 'DinDon',
                jobTitle: 'Android App ＋ Go 後端 ＋ 官網與後台',
                period: '2026.08 - Now',
                link: '/dindon/',
                linkText: 'opshell.me/dindon'
            },
            {
                logo: '/logo.jpg',
                company: '部落格翻新',
                companyAlt: 'opshell.me',
                jobTitle: 'VitePress 1.6 ＋ Vue 3.5 的技術部落格',
                period: '2026.09 - Now',
                link: '/',
                linkText: 'opshell.me'
            }
        ];
    }
});
