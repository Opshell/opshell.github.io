import { defineLoader } from 'vitepress';

export interface Data {
    compImg: string
    company: string
    location: string
    jobTitle: string
    period: string
    description: string
}

declare const data: Data[];
export { data };

export default defineLoader({
    load() {
        return [
            {
                compImg: 'images/resume/ai4dt.webp',
                company: '不正常人類研究中心',
                location: 'Tainan, Taiwan',
                jobTitle: 'Front-End Developer',
                period: '2023.09 - Now'
            },
            {
                compImg: 'images/resume/iware.webp',
                company: '馬亞動物園',
                location: 'Tainan, Taiwan',
                jobTitle: 'Full-Stack Developer',
                period: '2019.10 - 2023.08' // 3y 11m
            },
            {
                compImg: 'images/resume/iron.webp',
                company: '碼農花園',
                location: 'Tainan, Taiwan',
                jobTitle: 'Full-Stack Developer',
                period: '2017.08 - 2019.09' // 2y 2m
            },
            {
                compImg: 'images/resume/ezone.webp',
                company: '外星觀測所',
                location: 'Tainan, Taiwan',
                jobTitle: 'Software Engineer',
                period: '2016.08 - 2017.02' // 7m
            }
        ];
    }
});
