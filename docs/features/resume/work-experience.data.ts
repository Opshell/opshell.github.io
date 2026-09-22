import { defineLoader } from 'vitepress';

// 工作經歷的基本資料（公司、職稱、期間）。內容條列在 pages/resume.md 的 <WorkExperience> slot 裡，
// 因為那是 markdown，比塞在 TS 字串裡好寫。順序：新的在前。期間格式 'YYYY.MM - YYYY.MM' 或 'YYYY.MM - Now'。
export interface iWork {
    logo: string;
    company: string;
    /** 公司的英文或簡稱，顯示在名稱下方 */
    companyAlt?: string;
    location: string;
    jobTitle: string;
    period: string;
}

declare const data: iWork[];
export { data };

export default defineLoader({
    load(): iWork[] {
        return [
            {
                logo: '/images/resume/ai4dt.webp',
                company: '國立成功大學 人工智能數位轉型研究中心',
                companyAlt: 'NCKU AI4DT',
                location: 'Tainan, Taiwan',
                jobTitle: 'Senior Front-End Developer',
                period: '2023.09 - Now'
            },
            {
                logo: '/images/resume/iware.webp',
                company: '馬亞科技股份有限公司',
                companyAlt: 'iWare',
                location: 'Tainan, Taiwan',
                jobTitle: 'Full-Stack Developer',
                period: '2019.10 - 2023.08'
            },
            {
                logo: '/images/resume/iron.webp',
                company: '鐵人創意行銷',
                location: 'Tainan, Taiwan',
                jobTitle: 'Full-Stack Developer',
                period: '2017.08 - 2019.09'
            },
            {
                logo: '/images/resume/ezone.webp',
                company: '逸中軟體設計',
                location: 'Tainan, Taiwan',
                jobTitle: 'Software Engineer',
                period: '2016.08 - 2017.02'
            }
        ];
    }
});
