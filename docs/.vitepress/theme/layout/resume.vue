<script setup lang="ts">
    import { useData } from 'vitepress';

    const { frontmatter } = useData();

    // 物件值相加
    function sumObjectValues(obj: Record<string, number>) {
        return Object.values(obj).reduce((acc, cur) => acc + cur, 0);
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
    <article class="article-block">
        <div class="left-block">
            <header class="header-block">
                <div class="image-box">
                    <img src="/images/resume/portrait.png" alt="Opshell 大頭貼" />
                </div>
                <h1 class="name">
                    <!-- <span class="zh">劉 育瑋</span> -->
                    <span class="en">{{ frontmatter.name }}</span>
                </h1>
                <!-- <span class="job-title">
                    {{ frontmatter.jobTitle }}
                </span> -->
            </header>
            <div class="mbti">
                <img src="/images/resume/mbti.png" alt="MBTI：INTP-A" />
            </div>

            <hr class="divider" />

            <div class="skills-block">
                <OrgaSectionBlock
                    v-for="skills in frontmatter.skills"
                    :key="skills.type"
                    :title="skills.type"
                >
                    <MoleSkillBox>
                        <ElSkill
                            v-for="skill in skills.items"
                            :key="skill.text"
                            :style="{ '--color-skill': `#${skill.color}` }"
                        >
                            <template #icon>
                                <ElSvgIcon :name="skill.icon" />
                            </template>
                            <span class="text">{{ skill.text }}</span>
                        </ElSkill>
                    </MoleSkillBox>
                </OrgaSectionBlock>
            </div>

            <hr class="divider" />

            <OrgaSectionBlock class="contact-block" title="Contact">
                <ul class="contact-box">
                    <li v-for="contact in frontmatter.contact" :key="`contact-${contact.text}`" class="contact">
                        <ElSvgIcon :name="contact.icon" />
                        <a :href="contact.href" target="_blank" rel="noopener noreferrer">{{ contact.text }}</a>
                    </li>
                </ul>
            </OrgaSectionBlock>
        </div>

        <hr class="divider" />

        <main class="right-block">
            <Content />
        </main>
    </article>
</template>

<style lang="scss">
    .article-block {
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
            span {
                display: block;
            }
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

        .section-block {
            gap: 0;

        }

        .left-block,
        .right-block {
            display: flex;
            flex-direction: column;
            gap: 20px;
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
            hr {
                margin: 2.5rem 0;
            }
        }
        > .divider {
            margin: 0 20px;
        }

    }

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
            @include setSize(250px, 250px);
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

            .image-box {
                // @include setSize(150px, 150px);
            }
        }
    }
    .mbti {
        grid-area: mbti;
        width: 296px;
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
        top: 430px;
        padding: 20px 0 0;
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
