<script setup lang="ts">
    import skillsData from '@data/skills';
    import workExperienceData from '@data/works';

    import { withBase } from 'vitepress';
</script>

<template>
    <article class="article-block">
        <div class="left-block">
            <header class="header-block">
                <div class="image-box">
                    <img :src="withBase('images/resume/portrait.png')" alt="Opshell 大頭貼" />
                </div>
                <h1 class="name">
                    <span class="zh">劉 育瑋</span>
                    <span class="en">Opshell</span>
                </h1>

                <h2 class="job-title">
                    Front-End Developer
                </h2>
            </header>

            <hr class="divider" />

            <div class="skills-block">
                <OrgaSectionBlock
                    v-for="skills in skillsData"
                    :key="skills.title"
                    :title="skills.title"
                >
                    <MoleSkillBox>
                        <ElSkill
                            v-for="skill in skills.items"
                            :key="skill.name"
                            :style="{ '--color-skill': skill.color }"
                        >
                            <template #icon>
                                <div class="icon" v-html="skill.icon" />
                            </template>
                            <span class="text">{{ skill.name }}</span>
                        </ElSkill>
                    </MoleSkillBox>
                </OrgaSectionBlock>
            </div>

            <hr class="divider" />

            <OrgaSectionBlock title="Contact">
                <ul class="contact-box">
                    <li class="contact">
                        <ElSvgIcon name="call" />
                        <a href="tel:+886 938643321" target="_blank" rel="noopener noreferrer">+886 938643321</a>
                    </li>
                    <li class="contact">
                        <ElSvgIcon name="mail" />
                        <a href="mailto:phenomx9990@gmail.com" target="_blank" rel="noopener noreferrer">phenomx9990@gmail.com</a>
                    </li>
                    <li class="contact">
                        <ElSvgIcon name="language" />
                        <a href="https://www.opshell.info" target="_blank" rel="noopener noreferrer">Opshell's Website</a>
                    </li>
                    <li class="contact">
                        <ElSvgIcon name="language" />
                        <a href="https://github.com/Opshell" target="_blank" rel="noopener noreferrer">Opshell's Github</a>
                    </li>
                    <li class="contact">
                        <ElSvgIcon name="location_on" />
                        <a href="https://maps.app.goo.gl/9q1aF5LEaEihmDh37" target="_blank" rel="noopener noreferrer">Tainan, Taiwan</a>
                    </li>
                </ul>
            </OrgaSectionBlock>
        </div>

        <hr class="divider" />

        <div class="right-block">
            <OrgaSectionBlock title="About Opshell">
                <p>喜歡交流、學習技術的我， 從高中開始對程式語言萌生興趣，獨立製作了一個RPG畢業專題， 在大學、實習時期確認了喜愛的程式類型，並完成網頁技術相關的國科會計畫。 在之後的工作中，一頭熱的投入了全端網頁技術的海洋， 熟練HTML、CSS、Javascript、Typescript、Vue等前端語言、框架， 使用PHP、SQL撰寫網站後端，串接各式API，用GCP配合LAMP架站。 對設計美感與使用體驗有要求的我， 持續的學習與成長，面對新的挑戰，一步步超越自己。 不喜歡停滯不前，在時代與技術的洪流中， 只有被沖走或逆流而上兩個選項。</p>
            </OrgaSectionBlock>

            <hr class="divider" />

            <OrgaSectionBlock title="Work Experience" subtitle="7y8m">
                <article class="work-experience-block">
                    <MoleWorkExperience
                        v-for="work in workExperienceData"
                        :key="work.company"
                        :comp-img="withBase(work.compImg)"
                        :company="work.company"
                        :location="work.location"
                        :job-title="work.jobTitle"
                        :period="work.period"
                        :description="work.description"
                    />
                </article>
            </OrgaSectionBlock>
        </div>
    </article>
</template>

<style lang="scss">
    .article-block {
        display: flex;
        width: 100%;
        max-width: 1520px;
        height: 100%;
        padding: 5rem 0;
        margin: 0 auto;

        .left-block,
        .right-block {
            display: flex;
            flex-direction: column;
            gap: 50px;
            .divider {
                display: inline-block;
                background: var(--vp-c-text-1);
                width: 100%;
                height: 1px;
            }
        }

        .left-block {
            flex-shrink: 0;
            width: 300px;
        }
        .right-block {
            width: 100%;
            padding: 0 1.25rem;
        }
        > .divider {
            margin: 0 20px;
        }

        h2 {
            color: var(--vp-c-text-1);
            font-size: 36px;
            font-weight: 500;
            font-style: normal;
            line-height: 48px;
        }

        p {
            /* The word "résumé" co */
            color: var(--vp-c-text-1);
            font-size: 20px;
            font-weight: 300;
            font-style: normal;
            line-height: 32px;
        }
    }

    .header-block {
        display: flex;
        flex-direction: column;
        gap: 20px;
        .image-box {
            background: #d3bba4;
            width: 250px;
            height: 250px;
            @include setSize(250px, 250px);
            border-radius: 50%;
            overflow: hidden;
            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        }

        h1 {
            color: var(--vp-c-text-1);
            font-size: 36px;
            font-weight: 500;
            font-style: normal;
            line-height: 48px;
            span {
                display: block;
            }
        }

        h2 {
            color: var(--vp-c-text-1);
            font-size: 20px;
            font-weight: 300;
            font-style: normal;
            line-height: 32px;
        }
    }

    .skills-block {
        .section-block {
            ~ .section-block {
                padding-top: 1.875rem;
                border-top: 1px solid var(--vp-c-text-1);
                margin-top: 1.875rem;
            }
        }
    }

    .contact-box {
        display: flex;
        flex-direction: column;
        gap: 20px;

        .contact {
            @include setFlex(flex-start, center , 10px);
        }
    }

    .work-experience-block {
        @include setFlex(flex-start, flex-start, 20px, column);
        width: 100%;
    }
</style>
