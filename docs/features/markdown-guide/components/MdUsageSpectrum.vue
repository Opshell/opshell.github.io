<script setup lang="ts">
    import { LAYER_OFF, LAYERS, SCAN_DATE, TOTAL_POSTS, USAGES } from '../constants';

    // 長條長度以最多的那一項為滿格，數字一律直接標在旁邊，顏色只負責分層
    const max = Math.max(...USAGES.map(usage => usage.posts));
    const legend = [...LAYERS, LAYER_OFF];
    const layerName = Object.fromEntries(legend.map(layer => [layer.key, layer.name]));

    const rows = USAGES.map(usage => ({
        ...usage,
        width: `${(usage.posts / max) * 100}%`,
        percent: Math.round((usage.posts / TOTAL_POSTS) * 100)
    }));
</script>

<template>
    <figure class="md-spectrum">
        <figcaption class="md-spectrum__header">
            <span class="md-spectrum__title">這個部落格的語法光譜</span>
            <span class="md-spectrum__note">{{ TOTAL_POSTS }} 篇文章（含草稿）裡，有幾篇用過 · {{ SCAN_DATE }} 掃描</span>
        </figcaption>

        <ul class="md-spectrum__legend">
            <li v-for="layer in legend" :key="layer.key" :class="`is-${layer.key}`">{{ layer.name }}</li>
        </ul>

        <ol class="md-spectrum__list">
            <li v-for="row in rows" :key="row.id">
                <a class="md-spectrum__row" :class="`is-${row.layer}`" :href="`#${row.id}`">
                    <span class="md-spectrum__name">{{ row.name }}</span>
                    <span class="md-spectrum__track">
                        <span class="md-spectrum__bar" :style="{ width: row.width }" />
                    </span>
                    <span class="md-spectrum__value">{{ row.posts }}</span>
                    <span class="md-spectrum__tip" role="tooltip">
                        {{ layerName[row.layer] }} · {{ row.posts }} / {{ TOTAL_POSTS }} 篇（{{ row.percent }}%）
                    </span>
                </a>
            </li>
        </ol>
    </figure>
</template>

<style lang="scss">
    .md-spectrum {
        padding: 1.25rem 0;
        margin: 1.5rem 0 2rem;

        &__header {
            display: flex;
            flex-wrap: wrap;
            gap: .25rem 1rem;
            align-items: baseline;
            justify-content: space-between;
        }

        &__title {
            color: var(--vp-c-text-1);
            font-size: var(--font-size-l);
            font-weight: 600;
        }

        &__note {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-xs);
        }

        &__legend {
            display: flex;
            flex-wrap: wrap;
            gap: .25rem 1rem;
            padding: 0 !important;
            margin: .75rem 0 1rem !important;
            list-style: none !important;

            li {
                display: flex;
                gap: .375rem;
                align-items: center;
                padding: 0 !important;
                margin: 0 !important;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);

                &::before {
                    content: '';
                    background-color: var(--md-layer);
                    width: 10px;
                    height: 10px;
                    border-radius: 2px;
                }
            }
        }

        &__list {
            padding: 0 !important;
            margin: 0 !important;
            list-style: none !important;

            li {
                padding: 0 !important;
                margin: 0 !important;
                list-style: none !important;
            }
        }

        &__row {
            position: relative;
            display: grid;
            grid-template-columns: minmax(7rem, 11rem) minmax(0, 1fr) 2.5rem;
            gap: .75rem;
            align-items: center;
            padding: .3rem .5rem;
            border-radius: 6px;
            color: var(--vp-c-text-1) !important;
            font-size: var(--font-size-s);

            // 設計系統頁沒有文章版型，.vp-doc 預設會給連結畫底線
            text-decoration: none !important;

            &:hover,
            &:focus-visible {
                background-color: var(--vp-c-default-soft);

                .md-spectrum__tip { opacity: 1; }
            }
        }

        &__name {
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
        }

        &__track {
            display: block;
            height: 12px;
        }

        // 長條從基準線長出去，末端 4px 圓角；0 篇的就只剩基準線
        &__bar {
            display: block;
            background-color: var(--md-layer);
            min-width: 2px;
            height: 100%;
            border-radius: 0 4px 4px 0;
        }

        &__value {
            color: var(--vp-c-text-2);
            font-variant-numeric: tabular-nums;
            text-align: right;
        }

        &__tip {
            position: absolute;
            top: -1.75rem;
            right: .5rem;
            background-color: var(--vp-c-bg-elv);
            padding: .125rem .5rem;
            border-radius: 4px;
            box-shadow: var(--vp-shadow-2);
            color: var(--vp-c-text-1);
            font-size: var(--font-size-xs);
            white-space: nowrap;
            pointer-events: none;
            transition: opacity .15s var(--cubic-FiSo);
            opacity: 0;
            z-index: 2;
        }
    }
    @media (width <= 480px) {
        .md-spectrum__row {
            grid-template-columns: minmax(0, 1fr) 2.5rem;

            .md-spectrum__track {
                grid-row: 2;
                grid-column: 1 / -1;
            }
        }
    }
</style>
