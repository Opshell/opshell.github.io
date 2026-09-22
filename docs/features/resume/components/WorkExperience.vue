<script setup lang="ts">
    import type { iWork } from '../work-experience.data';
    import { computed, ref, watch } from 'vue';
    import { formatMonths, monthsOf } from '../period';

    // 一段工作經歷：左邊 logo、右邊公司與職稱、下面條列（slot 是 markdown）。可以收合，預設由父層決定。
    const { work, open = true } = defineProps<{
        work: iWork;
        open?: boolean;
    }>();

    const isOpen = ref(open);
    watch(() => open, v => isOpen.value = v);

    const duration = computed(() => formatMonths(monthsOf(work.period)));
    const isCurrent = computed(() => work.period.endsWith('Now'));
</script>

<template>
    <article class="work" :class="{ 'is-open': isOpen, 'is-current': isCurrent }">
        <header class="work__header" @click="isOpen = !isOpen">
            <div class="work__logo">
                <img :src="work.logo" :alt="`${work.company} logo`" loading="lazy" />
            </div>
            <div class="work__title">
                <h3 class="work__company">
                    {{ work.company }}
                    <span v-if="work.companyAlt" class="work__company-alt">{{ work.companyAlt }}</span>
                </h3>
                <p class="work__job">{{ work.jobTitle }}</p>
            </div>
            <div class="work__meta">
                <span class="work__period">
                    {{ work.period }}
                    <span class="work__duration">{{ duration }}</span>
                </span>
                <span class="work__location">
                    <ElSvgIcon name="location_on" />
                    {{ work.location }}
                </span>
            </div>
            <ElSvgIcon class="work__toggle" :name="isOpen ? 'zoom_in_map' : 'zoom_out_map'" :title="isOpen ? '收合' : '展開'" />
        </header>

        <div v-show="isOpen" class="work__body vp-doc">
            <slot />
        </div>
    </article>
</template>

<style lang="scss">
    .work {
        --work-logo: 56px;
        position: relative;
        padding: 1.25rem 0 1.5rem;
        border-bottom: 1px solid var(--vp-c-divider);

        &:last-child { border-bottom: 0; }

        &__header {
            display: grid;
            grid-template:
                'logo title meta toggle' auto /
                var(--work-logo) minmax(0, 1fr) auto 24px;
            gap: 4px 1rem;
            align-items: start;
            cursor: pointer;
        }
        &__logo {
            grid-area: logo;
            @include setSize(var(--work-logo), var(--work-logo));
            background: var(--color-gray-000);
            padding: 4px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 12px;
            transition: border-color .2s var(--cubic-FiSo);
            overflow: hidden;

            img {
                @include setSize(100%, 100%);
                object-fit: contain;
            }
        }
        &__title {
            grid-area: title;
            min-width: 0;
        }
        &__company {
            @include setFlex(flex-start, baseline, 8px);
            flex-wrap: wrap;
            padding: 0;
            border: 0;
            margin: 0;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-l);
            font-weight: 700;
            line-height: 1.4;
            transition: color .2s var(--cubic-FiSo);

            &-alt {
                color: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: var(--font-size-xs);
                font-weight: 400;
            }
        }
        &__job {
            margin: 2px 0 0;
            color: var(--vp-c-brand-1);
            font-size: var(--font-size-s);
            font-weight: 600;
        }
        &__meta {
            grid-area: meta;
            @include setFlex(flex-start, flex-end, 4px, column);
            color: var(--vp-c-text-2);
            font-size: var(--font-size-xs);
            white-space: nowrap;
        }
        &__period {
            font-family: var(--vp-font-family-mono);
        }
        &__duration {
            background: var(--vp-c-bg-soft);
            padding: 1px 6px;
            border-radius: 999px;
            margin-left: 4px;
            color: var(--vp-c-text-3);
        }
        &__location {
            @include setFlex(flex-start, center, 2px);
            color: var(--vp-c-text-3);

            .icon {
                @include setSize(14px, 14px);
                padding: 0;
            }
        }
        &__toggle {
            grid-area: toggle;
            @include setSize(24px, 24px);
            padding: 2px;
            color: var(--vp-c-text-3);
            transition: color .2s var(--cubic-FiSo);
        }

        &__body {
            padding: 1rem 0 0 calc(var(--work-logo) + 1rem);
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            line-height: 1.8;

            h4 {
                padding: 0;
                border: 0;
                margin: 1rem 0 .25rem;
                color: var(--vp-c-text-1);
                font-size: var(--font-size-s);
                font-weight: 700;

                &:first-child { margin-top: 0; }
            }
            ul {
                padding-left: 1.2em;
                margin: 0;
            }
            li { margin: .15em 0; }
            strong {
                background: none;
                padding: 0;
                color: var(--vp-c-text-1);
                font-size: inherit;
                font-weight: 600;
            }
        }

        &:hover {
            .work__company { color: var(--vp-c-brand-1); }
            .work__toggle { color: var(--vp-c-brand-1); }
        }
        &.is-current .work__logo { border-color: var(--vp-c-brand-1); }
        @include setRWD(640px) {
            &__header {
                grid-template:
                    'logo title toggle' auto
                    'meta meta meta' auto /
                    var(--work-logo) minmax(0, 1fr) 24px;
            }
            &__meta {
                flex-flow: row wrap;
                gap: 4px 12px;
                align-items: center;
                margin-top: 4px;
            }
            &__body { padding-left: 0; }
        }
    }
</style>
