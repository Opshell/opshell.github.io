<script setup lang="ts">
    import { useData, withBase } from 'vitepress';

    const { frontmatter } = useData();
</script>

<template>
    <article class="article-block">
        <div class="left-block">
            <header class="header-block">
                <div class="image-box">
                    <img :src="withBase('images/resume/portrait.png')" alt="Opshell 大頭貼" />
                </div>

                <h1 class="name">
                    <!-- <span class="zh">YuWei Liu</span> -->
                    <span class="en">{{ frontmatter.name }}</span>
                </h1>

                <span class="job-title">
                    {{ frontmatter.jobTitle }}
                </span>
            </header>

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

            <OrgaSectionBlock title="Contact">
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
        max-width: 1520px;
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
