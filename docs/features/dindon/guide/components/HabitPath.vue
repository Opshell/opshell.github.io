<script setup lang="ts">
    import { findFeature, stages } from '../featureMap';

    // 養成路線：六段，由「什麼都不用改」到「每月回顧」。每一段的功能點了會回到地圖上選中它；
    // 「在地圖上標出來」把這一段用到的功能全部標亮。全部展開不收合：這是要從頭讀到尾的東西。
    interface Props {
        /** 正在地圖上標出來的那一段 */
        active?: string;
    }
    withDefaults(defineProps<Props>(), { active: '' });
    const emit = defineEmits<{
        select: [id: string];
        focus: [stageId: string];
    }>();
</script>

<template>
    <ol class="dd-habit-path">
        <li v-for="(stage, index) in stages" :id="`stage-${stage.id}`" :key="stage.id" class="dd-habit-path__stage" :class="{ 'is-active': stage.id === active }">
            <span class="dd-habit-path__step" aria-hidden="true">{{ index + 1 }}</span>
            <article class="dd-habit-path__card">
                <header>
                    <p class="when">{{ stage.when }}</p>
                    <h3>{{ stage.title }}</h3>
                    <p class="goal">{{ stage.goal }}</p>
                </header>

                <div class="dd-habit-path__body">
                    <section class="dd-habit-path__concept">
                        <h4>理財觀念：{{ stage.concept }}</h4>
                        <p>{{ stage.conceptText }}</p>
                    </section>

                    <section>
                        <h4>這段時間做這些就好</h4>
                        <ul class="dd-habit-path__actions">
                            <li v-for="action in stage.actions" :key="action">{{ action }}</li>
                        </ul>
                    </section>
                </div>

                <footer>
                    <p class="dd-habit-path__features">
                        <button
                            v-for="id in stage.features"
                            :key="id"
                            type="button"
                            :style="{ '--branch': `var(--g-${findFeature(id)!.branch})` }"
                            @click="emit('select', id)"
                        >
                            {{ findFeature(id)!.name }}
                        </button>
                    </p>
                    <p class="dd-habit-path__signal"><strong>做到了的訊號</strong>{{ stage.signal }}</p>
                    <button type="button" class="dd-habit-path__focus" :aria-pressed="stage.id === active" @click="emit('focus', stage.id)">
                        {{ stage.id === active ? '地圖上已標出 ✓' : '在地圖上標出這一段' }}
                    </button>
                </footer>
            </article>
        </li>
    </ol>
</template>

<style lang="scss">
    .dd-habit-path {
        position: relative;
        @include setFlex(flex-start, stretch, 20px, column);
        padding: 0;
        margin: 0;
        list-style: none;

        // 一條縱線把六段串起來
        &::before {
            content: '';
            position: absolute;
            top: 18px;
            bottom: 18px;
            left: 17px;
            background: var(--dd-border);
            width: 2px;
        }
        &__stage {
            position: relative;
            display: grid;
            grid-template-columns: 36px minmax(0, 1fr);
            gap: 16px;
            scroll-margin-top: calc(var(--vp-nav-height) + 24px);
        }
        &__step {
            position: relative;
            @include setFlex(center, center);
            background: var(--dd-surface);
            @include setSize(36px, 36px);
            border: 2px solid var(--dd-border);
            border-radius: 50%;
            color: var(--dd-muted);
            font-weight: 800;
        }
        &__stage.is-active &__step {
            background: var(--dd-accent);
            border-color: #1B1815;
            color: #1B1815;
        }
        &__card {
            @include setFlex(flex-start, stretch, 14px, column);
            background: var(--dd-surface);
            padding: 18px 20px;
            border: 1px solid var(--dd-border);
            border-radius: var(--dd-radius);
            transition: border-color .25s var(--cubic-FiSo), box-shadow .25s var(--cubic-FiSo);

            .when {
                color: var(--dd-accent-border);
                font-size: var(--font-size-xs);
                font-weight: 800;
            }
            h3 {
                font-size: var(--font-size-l);
                font-weight: 800;
                line-height: 1.4;
            }
            .goal { color: var(--dd-muted); }
            h4 {
                margin-bottom: 4px;
                font-size: var(--font-size-s);
                font-weight: 800;
            }
            footer {
                @include setFlex(flex-start, stretch, 10px, column);
                padding-top: 14px;
                border-top: 1px dashed var(--dd-border);
            }
        }
        &__stage.is-active &__card {
            border-color: var(--dd-accent-border);
            box-shadow: 0 0 0 3px var(--dd-accent-tint);
        }
        &__body {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 14px 24px;
            font-size: var(--font-size-s);
            line-height: 1.75;
        }
        &__concept {
            background: var(--dd-accent-tint);
            padding: 12px 14px;
            border-radius: 14px;
            color: #1B1815; // 淡黃底兩個模式都一樣，字固定深色
        }
        &__actions {
            @include setFlex(flex-start, stretch, 4px, column);
            padding-left: 1.2em;
            margin: 0;
            list-style: disc; // 站台的 reset 把清單符號拿掉了
        }
        &__features {
            @include setFlex(flex-start, center, 6px);
            flex-wrap: wrap;

            button {
                background: transparent;
                padding: 2px 12px;
                border: 1.5px solid var(--branch);
                border-radius: 999px;
                color: var(--dd-text);
                font: inherit;
                font-size: var(--font-size-xs);
                cursor: pointer;
                @media (hover: hover) {
                    &:hover { background: var(--dd-sunken); }
                }
                &:focus-visible { outline: 3px solid var(--dd-primary); }
            }
        }
        &__signal {
            @include setFlex(flex-start, baseline, 8px);
            flex-wrap: wrap;
            font-size: var(--font-size-s);

            strong {
                color: var(--dd-muted);
                font-size: var(--font-size-xs);
            }
        }
        &__focus {
            align-self: flex-start;
            background: transparent;
            padding: 4px 14px;
            border: 1.5px solid var(--dd-primary);
            border-radius: 999px;
            color: var(--dd-primary);
            font: inherit;
            font-size: var(--font-size-s);
            font-weight: 700;
            cursor: pointer;

            &[aria-pressed=true] {
                background: var(--dd-primary);
                color: var(--dd-on-primary);
            }
            &:focus-visible { outline: 3px solid var(--dd-accent); }
        }
        @include setRWD(500px) {
            &::before { left: 13px; }
            &__stage {
                grid-template-columns: 28px minmax(0, 1fr);
                gap: 10px;
            }
            &__step { @include setSize(28px, 28px); }
            &__card { padding: 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
            &__card { transition: none; }
        }
    }
</style>
