<script setup lang="ts">
    import { computed } from 'vue';
    import { DEMO_PATH } from '../../constants';
    import { branches, findFeature, PLAN_LABEL, relatedOf, stagesOf } from '../featureMap';

    // 功能地圖右邊（手機是從底下拉上來）的說明：為什麼有它、怎麼用、小訣竅、跟誰一起用、出現在養成路線哪一段。
    // 沒選功能時是「怎麼看這張圖」。
    interface Props {
        id?: string;
    }
    const props = withDefaults(defineProps<Props>(), { id: '' });
    const emit = defineEmits<{
        select: [id: string];
        stage: [id: string];
        close: [];
    }>();

    const feature = computed(() => findFeature(props.id));
    const branch = computed(() => branches.find(b => b.id === feature.value?.branch));
    const related = computed(() => relatedOf(props.id));
    const inStages = computed(() => stagesOf(props.id));
</script>

<template>
    <div class="dd-feature-detail">
        <template v-if="feature && branch">
            <button type="button" class="dd-feature-detail__close" aria-label="關閉說明" @click="emit('close')">✕</button>
            <p class="dd-feature-detail__branch" :style="{ '--branch': `var(--g-${branch.id})` }">{{ branch.title }}</p>
            <h3 class="dd-feature-detail__title">{{ feature.name }}</h3>
            <p v-if="feature.plan || feature.hidden" class="dd-feature-detail__tags">
                <span v-if="feature.hidden">藏起來的操作</span>
                <span v-if="feature.plan">{{ PLAN_LABEL[feature.plan] }}</span>
            </p>

            <h4>為什麼有它</h4>
            <p>{{ feature.purpose }}</p>

            <h4>怎麼用</h4>
            <p>{{ feature.how }}</p>

            <h4>小訣竅</h4>
            <ul class="dd-feature-detail__tips">
                <li v-for="tip in feature.tips" :key="tip">{{ tip }}</li>
            </ul>

            <template v-if="related.length">
                <h4>一起用</h4>
                <p class="dd-feature-detail__chips">
                    <button
                        v-for="item in related"
                        :key="item.id"
                        type="button"
                        :style="{ '--branch': `var(--g-${item.branch})` }"
                        @click="emit('select', item.id)"
                    >
                        {{ item.name }}
                    </button>
                </p>
            </template>

            <template v-if="inStages.length">
                <h4>養成路線</h4>
                <p class="dd-feature-detail__chips">
                    <button v-for="stage in inStages" :key="stage.id" type="button" class="stage" @click="emit('stage', stage.id)">
                        {{ stage.when }}・{{ stage.title }}
                    </button>
                </p>
            </template>

            <a v-if="feature.demo" class="dd-feature-detail__demo" :href="`${DEMO_PATH}#${feature.demo}`">▶ 看演示影片</a>
        </template>

        <template v-else>
            <h3 class="dd-feature-detail__title">怎麼看這張圖</h3>
            <p>中間是叮咚，往外是七件事：右邊三支是每天都在做的「記下來、整理、看懂」，左邊四支是熟了之後的「規劃、帳戶與代墊、養成、安心」。</p>
            <ul class="dd-feature-detail__legend">
                <li><span class="dot is-selected" />點一個功能：看它為什麼存在、怎麼用、有什麼小訣竅</li>
                <li><span class="dot is-related" />虛線框的是會一起用的功能，地圖上也會連線</li>
                <li><span class="play">▶</span>有演示影片可以看</li>
            </ul>
            <p class="dd-feature-detail__muted">不知道從哪開始？看下面的養成路線，一段一段來。</p>
        </template>
    </div>
</template>

<style lang="scss">
    .dd-feature-detail {
        position: relative;
        @include setFlex(flex-start, stretch, 8px, column);
        font-size: var(--font-size-s);
        line-height: 1.7;

        h4 {
            margin-top: 8px;
            color: var(--dd-muted);
            font-size: var(--font-size-xs);
            font-weight: 700;
        }
        &__close {
            position: absolute;
            top: -4px;
            right: -4px;
            background: transparent;
            @include setSize(36px, 36px);
            border: 0;
            border-radius: 50%;
            color: var(--dd-muted);
            font-size: var(--font-size-m);
            cursor: pointer;
            @media (hover: hover) {
                &:hover { background: var(--dd-sunken); }
            }
            &:focus-visible { outline: 3px solid var(--dd-primary); }
        }
        &__branch {
            @include setFlex(flex-start, center, 6px);
            color: var(--dd-muted);
            font-size: var(--font-size-xs);
            font-weight: 700;

            &::before {
                content: '';
                background: var(--branch);
                @include setSize(10px, 10px);
                border-radius: 50%;
            }
        }
        &__title {
            padding-right: 32px;
            font-size: var(--font-size-l);
            font-weight: 800;
            line-height: 1.4;
        }
        &__tags {
            @include setFlex(flex-start, center, 6px);
            flex-wrap: wrap;

            span {
                background: var(--dd-sunken);
                padding: 0 10px;
                border-radius: 999px;
                color: var(--dd-muted);
                font-size: var(--font-size-xs);
                font-weight: 700;
            }
        }
        &__tips {
            @include setFlex(flex-start, stretch, 4px, column);
            padding-left: 1.2em;
            margin: 0;
            list-style: disc; // 站台的 reset 把清單符號拿掉了
        }
        &__chips {
            @include setFlex(flex-start, center, 6px);
            flex-wrap: wrap;

            button {
                background: var(--dd-surface);
                padding: 2px 12px;
                border: 1.5px dashed var(--branch, var(--dd-border));
                border-radius: 999px;
                color: var(--dd-text);
                font: inherit;
                font-size: var(--font-size-xs);
                cursor: pointer;
                @media (hover: hover) {
                    &:hover { border-style: solid; }
                }
                &:focus-visible { outline: 3px solid var(--dd-primary); }
            }
            .stage {
                border-style: solid;
                border-color: var(--dd-accent-border);
            }
        }
        &__demo {
            align-self: flex-start;
            background: var(--dd-primary);
            padding: 6px 16px;
            border-radius: 999px;
            margin-top: 8px;
            color: var(--dd-on-primary);
            font-weight: 700;
            text-decoration: none;
            &:focus-visible { outline: 3px solid var(--dd-accent); }
        }
        &__legend {
            @include setFlex(flex-start, stretch, 6px, column);
            padding: 0;
            margin: 4px 0;
            list-style: none;

            li {
                @include setFlex(flex-start, center, 10px);
            }
            .dot {
                flex-shrink: 0;
                background: var(--dd-surface);
                @include setSize(22px, 14px);
                border: 1.5px solid var(--dd-border);
                border-radius: 999px;

                &.is-selected {
                    background: var(--dd-accent);
                    border-color: #1B1815;
                }
                &.is-related { border-style: dashed; }
            }
            .play {
                flex-shrink: 0;
                width: 22px;
                color: var(--dd-accent-border);
                font-size: 10px;
                text-align: center;
            }
        }
        &__muted { color: var(--dd-muted); }
    }
</style>
