<script setup lang="ts">
    import {
        Skill,
        SkillBox
    } from '@features/resume';

    import { useData } from 'vitepress';

    const { frontmatter } = useData();

    // 物件值相加
    function sumObjectValues(obj: Record<string, number>) {
        return Object.values(obj).reduce((acc, cur) => acc + cur, 0);
    }

    const isLeftBlockOpen = ref(false);
    function leftBlockTrigger() {
        isLeftBlockOpen.value = !isLeftBlockOpen.value;
        if (isLeftBlockOpen.value) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    // get the sticky element
    onMounted(() => {
        const headerBlock = document.querySelector('.header-block');
        const headerObserver = new IntersectionObserver(
            ([entries]) => {
                entries.target.classList.toggle('--fixed', entries.intersectionRatio < 1);
            },
            {
                rootMargin: '-65px',
                threshold: [1]
            }
        );

        if (headerBlock) {
            headerObserver.observe(headerBlock);
        }
    });
</script>

<template>
    <article class="resume-block" :class="{ '--open-menu': isLeftBlockOpen }">
        <div class="cover" @click="leftBlockTrigger" />
        <div class="left-block">
            <header class="header-block">
                <div class="image-box">
                    <img :src="frontmatter.portrait" :alt="`${frontmatter.name}大頭貼`" />
                </div>
                <h1 class="name">
                    <!-- <span class="zh">劉 育瑋</span> -->
                    <span class="en">{{ frontmatter.name }}</span>
                </h1>
                <span class="job-title">
                    {{ frontmatter.jobTitle }}
                </span>
            </header>
            <div class="mbti">
                <img src="/images/resume/mbti.png" alt="MBTI：INTP-A" />
            </div>

            <hr class="divider" />

            <div class="skills-block">
                <ElSectionBlock
                    v-for="skills in frontmatter.skills"
                    :key="skills.type"
                    :title="skills.type"
                >
                    <SkillBox>
                        <Skill
                            v-for="skill in skills.items"
                            :key="skill.text"
                            :style="{ '--color-skill': `#${skill.color}` }"
                        >
                            <template #icon>
                                <ElSvgIcon :name="skill.icon" />
                            </template>
                            <span class="text">{{ skill.text }}</span>
                        </Skill>
                    </SkillBox>
                </ElSectionBlock>
            </div>

            <hr class="divider" />

            <ElSectionBlock class="contact-block" title="Contact">
                <ul class="contact-box">
                    <li v-for="contact in frontmatter.contact" :key="`contact-${contact.text}`" class="contact">
                        <ElSvgIcon :name="contact.icon" />
                        <a :href="contact.href" target="_blank" rel="noopener noreferrer">{{ contact.text }}</a>
                    </li>
                </ul>
            </ElSectionBlock>
        </div>
        <div class="left-block-switch" @click="leftBlockTrigger">
            <ElSvgIcon name="arrow_forward_ios" />
        </div>

        <hr class="divider" />

        <main class="right-block">
            <Content />
        </main>
    </article>
</template>

<style lang="scss">
    .resume-block {
        display: flex;
        width: 100%;
        max-width: 1360px;
        height: 100%;
        padding: 5rem 0;
        margin: 0 auto;

        h1 {
            color: var(--vp-c-text-1);
            font-size: 36px;
            font-weight: 500;
            font-style: normal;
            line-height: 48px;
            span { display: block; }
        }
        h2 {
            margin: 0 0 2.5rem;
            color: var(--vp-c-text-1);
            font-size: 1.75rem;
            font-weight: 500;
            line-height: 2rem;
        }
        p {
            color: var(--vp-c-text-1);
            font-size: 1.25rem;
            font-weight: 400;
            line-height: 2rem;
        }

        .section-block { gap: 0; }

        .cover {
            position: absolute;
            inset: 0;
            background: rgb(0, 0, 0, 15%);
            backdrop-filter: blur(5px);
            opacity: 0;
            z-index: -1;
        }
        .left-block,
        .right-block {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            .divider {
                display: inline-block;
                background: var(--vp-c-text-1);
                width: 100%;
                height: 1px;
            }
        }
        .left-block {
            position: relative;
            flex-shrink: 0;
            width: 300px;
        }

        .left-block-switch {
            position: fixed;
            top: calc(var(--vp-nav-height) + 2rem);
            left: 0;
            display: none;
            background: var(--vp-c-text-3);
            border-radius: 0 8px 8px 0;
            transition: .2s $cubic-FiSo;
            @include setSize(50px, 50px);
        }

        .right-block {
            width: 100%;
            padding: 0 1.25rem;
            hr { margin: 2.5rem 0; }
        }
        > .divider { margin: 0 1.25rem; }

        // [-] Left Block
        .header-block {
            position: sticky;
            top: calc(var(--vp-nav-height) - 1px);
            display: flex;
            flex-direction: column;
            gap: 20px;
            background-color: var(--vp-c-bg);
            z-index: 1;
            .image-box {
                background: #d3bba4;
                @include setSize(250px, 250px);
                border-radius: 50%;
                transition: .25s $cubic-FiSo;
                overflow: hidden;
                img {
                    @include setSize(100%, 100%);
                    object-fit: cover;
                }
            }
            .name {
                @include setFlex(flex-start, baseline, 20px);
            }

            &.--fixed {
                background-color: var(--vp-c-bg);
                padding: 20px 0;
                border-bottom: 2px solid var(--vp-c-divider);
            }
        }
        .mbti {
            width: calc(100% - 4px);
            border-radius: 10px;
            box-shadow: 0 0 1px 1px var(--vp-c-brand-3);
            transform: translateX(2px);
            overflow: hidden;
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
        .contact-block {
            position: sticky;
            top: 470px;
            padding: 20px 0 0;
        }
        .contact-box {
            display: flex;
            flex-direction: column;
            gap: 20px;

            .contact {
                @include setFlex(flex-start, center , 10px);
                transition: .2s $cubic-FiSo;
                &:hover {
                    color: var(--vp-c-brand-1);
                }
            }
        }

        // [-] Right Block
        .work-experience-block {
            @include setFlex(flex-start, flex-start, 20px, column);
            width: 100%;
        }
    }
    @include setRWD(1400px) {
        .resume-block {
            max-width: unset;
            padding: 1.875rem;
            .left-block {
                width: 250px;
            }
        }
    }
    @include setRWD(1200px) {
        .resume-block {

            .left-block {
                position: fixed;
                top: var(--vp-nav-height);
                left: 0;
                background: var(--vp-c-bg-soft);
                width: 300px;
                height: calc(100% - var(--vp-nav-height));
                padding: 0;
                box-shadow: 0 0 10px 1px var(--vp-c-text-3);
                transform: translateX(-100%);
                transform-origin: left top;
                transition: .2s $cubic-FiSo;
                overflow: hidden;
                overflow-y: auto;
                z-index: 1;
            }
            .left-block-switch {
                @include setFlex();
            }
            .header-block,
            .header-block.--fixed {
                position: relative;
                top: 0;
                flex-shrink: 0;
                background: var(--vp-c-bg-soft);
            }
            > .divider {
                display: none;
            }

            &.--open-menu {
                .cover {
                    opacity: 1;
                    z-index: 1;
                }
                .left-block {
                    padding: 1rem 1rem 2.5rem;
                    transform: translateX(0%);
                    direction: rtl;
                    > * {
                        direction: ltr;
                    }
                }
                .left-block-switch {
                    transform: translateX(300px);
                    z-index: 1;
                }

            }
        }
    }
    @include setRWD(768px) {
        .resume-block {
            padding: 1rem;
            .work-experience-box {
                .work-experience {
                    grid-template: "img-box company company" 45px
                                   "img-box job-title job-title" 45px
                                   "location location period" auto / 110px 1fr;

                    .location,
                    .period { justify-content: flex-start; }
                }
                .description { padding: 0; }
            }
        }
    }
    @include setRWD(550px) {
        .resume-block {
            .work-experience-box {
                .work-experience {
                    grid-template: "img-box company " 45px
                                   "img-box job-title " 45px
                                   "period period" auto
                                   "location location" auto / 110px 1fr;

                    .location,
                    .period { justify-content: flex-start; }
                }
                .description { padding: 0; }
            }
        }
    }
</style>
