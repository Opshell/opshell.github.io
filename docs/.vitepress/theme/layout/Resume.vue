<script setup lang="ts">
    import { Skill, SkillBox } from '@features/resume';
    import { useData } from 'vitepress';

    // 履歷版型：左欄（大頭貼、名字、一句話、聯絡、技能）固定；右欄是 resume.md 的內容。
    // 內容寬度跟文章頁一樣收在 1080px 內，不再滿版。960px 以下左欄改到上面，不做抽屜。
    const { frontmatter } = useData();
</script>

<template>
    <div class="resume">
        <aside class="resume__side">
            <header class="resume__profile">
                <div class="resume__portrait">
                    <img :src="frontmatter.portrait" :alt="`${frontmatter.name} 的照片`" />
                </div>
                <h1 class="resume__name">{{ frontmatter.name }}</h1>
                <p class="resume__job">{{ frontmatter.jobTitle }}</p>
                <p v-if="frontmatter.tagline" class="resume__tagline">{{ frontmatter.tagline }}</p>
            </header>

            <section class="resume__section">
                <h2 class="resume__section-title">Contact</h2>
                <ul class="resume__contact">
                    <li v-for="contact in frontmatter.contact" :key="contact.text">
                        <a :href="contact.href" target="_blank" rel="noopener noreferrer">
                            <ElSvgIcon :name="contact.icon" />
                            <span>{{ contact.text }}</span>
                        </a>
                    </li>
                </ul>
            </section>

            <section v-for="group in frontmatter.skills" :key="group.type" class="resume__section">
                <h2 class="resume__section-title">{{ group.type }}</h2>
                <SkillBox>
                    <Skill
                        v-for="skill in group.items"
                        :key="skill.text"
                        :icon="skill.icon"
                        :style="skill.color ? { '--color-skill': `#${skill.color}` } : undefined"
                    >
                        {{ skill.text }}
                    </Skill>
                </SkillBox>
            </section>
        </aside>

        <main class="resume__main vp-doc">
            <Content />
        </main>
    </div>
</template>

<style lang="scss">
    .resume {
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr);
        gap: 3rem;
        align-items: start;
        max-width: 1080px;
        padding: 3rem 1.5rem 5rem;
        margin: 0 auto;

        // #region [P] 左欄
        &__side {
            position: sticky;
            top: calc(var(--vp-nav-height) + 1.5rem);
            @include setFlex(flex-start, stretch, 1.75rem, column);
        }
        &__profile {
            @include setFlex(flex-start, flex-start, 4px, column);
        }
        &__portrait {
            @include setSize(140px, 140px);
            border: 3px solid var(--vp-c-bg-soft);
            border-radius: 50%;
            margin-bottom: .75rem;
            box-shadow: 0 0 0 1px var(--vp-c-divider);
            overflow: hidden;

            img {
                @include setSize(100%, 100%);
                object-fit: cover;
            }
        }
        &__name {
            display: inline-block;
            background: var(--vp-home-hero-name-background);
            -webkit-background-clip: text;
            background-clip: text;
            padding: 0;
            border: 0;
            margin: 0;
            font-size: var(--font-size-xxl);
            font-weight: 800;
            line-height: 1.2;
            -webkit-text-fill-color: transparent;
        }
        &__job {
            margin: 0;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-m);
            font-weight: 600;
        }
        &__tagline {
            margin: .25rem 0 0;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            line-height: 1.6;
        }

        &__section-title {
            padding: 0 0 .5rem;
            border: 0;
            border-bottom: 1px solid var(--vp-c-divider);
            margin: 0 0 .75rem;
            color: var(--vp-c-text-3);
            font-size: var(--font-size-xs);
            font-weight: 700;
            letter-spacing: .08em;
            text-transform: uppercase;
        }
        &__contact {
            @include setFlex(flex-start, stretch, 6px, column);
            padding: 0;
            margin: 0;
            list-style: none;

            a {
                @include setFlex(flex-start, center, 8px);
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
                text-decoration: none;
                transition: color .2s var(--cubic-FiSo);

                .icon {
                    flex-shrink: 0;
                    @include setSize(16px, 16px);
                    padding: 0;
                    fill: var(--vp-c-text-3);
                }
                span {
                    min-width: 0;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    overflow: hidden;
                }
                &:hover {
                    color: var(--vp-c-brand-1);

                    .icon { fill: var(--vp-c-brand-1); }
                }
            }
        }

        // #endregion

        // #region [P] 右欄：內容是 markdown，標題與段落的字級收斂到 token
        &__main {
            min-width: 0;

            h2 {
                padding: 0 0 .5rem;
                border: 0;
                border-bottom: 1px solid var(--vp-c-divider);
                margin: 0 0 1rem;
                font-size: var(--font-size-xl);
                font-weight: 800;
                line-height: 1.3;
            }
            > p,
            > div > p {
                color: var(--vp-c-text-2);
                font-size: var(--font-size-m);
                line-height: 1.9;
            }
            strong {
                background: none;
                padding: 0;
                color: var(--vp-c-text-1);
                font-size: inherit;
                font-weight: 600;
            }
        }

        // #endregion

        // 手機：左欄拆開，順序變成 頭像 → 內容 → 聯絡與技能，不然一整欄技能會把 About 推到很下面
        @include setRWD(960px) {
            grid-template-columns: 1fr;
            gap: 2rem;
            padding: 2rem 1rem 4rem;

            &__side { display: contents; }
            &__profile {
                order: 1;
                align-items: center;
                text-align: center;
            }
            &__main { order: 2; }
            &__section { order: 3; }
        }
    }
</style>
