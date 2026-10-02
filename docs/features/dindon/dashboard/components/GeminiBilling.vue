<script setup lang="ts">
    import type { GeminiBilling } from '../schemas/admin.schema';
    import { computed, onMounted, ref, watch } from 'vue';
    import { adminApi } from '../api';
    import { formatDateTime, formatInt, formatUsd } from '../format';
    import { formatMoney, skuLabel } from '../googleData';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import BillingReconcile from './BillingReconcile.vue';

    // 用量報表裡的「Google 實際帳單」（溝通板 #0084）：Cloud Billing 匯出到 BigQuery 的 Gemini 費用，後端快取 3 小時。
    // 跟上面的估算（美元、照價目表算）幣別不同、也不是同一個來源，所以分開標，不硬並成一個數字。
    // 帳單不是即時的：data_through 之後的日子是「還沒匯出」，不是沒花錢。
    const props = defineProps<{ days: number; estimateUsd: number }>();
    const call = useAdminCall();

    const billing = ref<GeminiBilling | null>(null);
    const loading = ref(false);
    const error = ref('');
    /** 帳單最多查 90 天；用量報表選「近 1 年」時只拿得到近 90 天 */
    const billingDays = computed(() => Math.min(props.days, 90));

    async function load(refresh = false) {
        loading.value = true;
        error.value = '';
        try {
            billing.value = await call(token => adminApi.geminiBilling(token, billingDays.value, refresh));
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    const maxSkuPaid = computed(() => Math.max(0.0001, ...(billing.value?.skus.map(s => Math.abs(s.paid)) ?? [])));

    watch(billingDays, () => load());
    onMounted(() => load());
</script>

<template>
    <section class="dd-billing" aria-labelledby="dd-billing-title">
        <header class="dd-billing__head">
            <h2 id="dd-billing-title" class="dd-usage__title">Google 實際帳單（Gemini）</h2>
            <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="loading" title="不用 3 小時的快取，重新問 Google" @click="load(true)">
                重新查帳單
            </button>
        </header>
        <p v-if="loading && !billing" class="dd-usage__desc t-shimmer" data-text="查帳單中…">查帳單中…</p>
        <p v-if="error" class="dd-admin__error" role="alert">帳單查不到：{{ error }}</p>

        <template v-if="billing">
            <p class="dd-usage__desc">
                近 {{ billing.days }} 天（{{ billing.since }} 起）。
                <strong>帳單資料到 {{ billing.dataThrough ?? '—' }}</strong>：之後的日子是 Google 還沒匯出，不是沒花錢（匯出平常晚大約一天，當天的數字還會被修正）。
                <span v-if="days > 90">帳單最多查 90 天。</span>
            </p>
            <ul class="dd-billing__totals">
                <li>
                    <span class="label">實付</span>
                    <span class="value">{{ formatMoney(billing.total.paid, billing.currency) }}</span>
                    <span class="hint">原價 {{ formatMoney(billing.total.cost, billing.currency) }}，抵免 {{ formatMoney(billing.total.credits, billing.currency) }}</span>
                </li>
                <li>
                    <span class="label">同期的資料庫估算（原始）</span>
                    <span class="value">{{ formatUsd(estimateUsd) }}</span>
                    <span class="hint">照價目表算的美元；後台其他金額都已經依帳單換算，原始估算只在這裡</span>
                </li>
                <li>
                    <span class="label">有用量的日子</span>
                    <span class="value">{{ formatInt(billing.daily.length) }} 天</span>
                    <span class="hint">Google 最後寫入：{{ formatDateTime(billing.exportedAt) }}</span>
                </li>
            </ul>

            <p v-if="!billing.skus.length" class="dd-usage__desc">這段期間帳單上沒有 Gemini 的費用。</p>
            <div v-else class="dd-usage__scroll dd-table-scroll">
                <table class="dd-table dd-table--static">
                    <thead>
                        <tr>
                            <th scope="col">計價項目</th>
                            <th scope="col" class="num">用量</th>
                            <th scope="col" class="num">原價</th>
                            <th scope="col" class="num">實付</th>
                            <th scope="col" aria-label="占比" />
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in billing.skus" :key="item.sku">
                            <th scope="row" :title="item.sku">{{ skuLabel(item.sku) }}</th>
                            <td class="num">{{ formatInt(item.amount) }}{{ item.unit === 'count' ? ' tokens' : ` ${item.unit}` }}</td>
                            <td class="num">{{ formatMoney(item.cost, billing.currency) }}</td>
                            <td class="num">{{ formatMoney(item.paid, billing.currency) }}</td>
                            <td class="bar"><span :style="{ width: `${(Math.abs(item.paid) / maxSkuPaid) * 100}%` }" /></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <details v-if="billing.daily.length" class="dd-billing__daily">
                <summary>每天</summary>
                <table class="dd-table dd-table--static">
                    <thead>
                        <tr>
                            <th scope="col">日期（台灣）</th>
                            <th scope="col" class="num">原價</th>
                            <th scope="col" class="num">抵免</th>
                            <th scope="col" class="num">實付</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="day in billing.daily" :key="day.date">
                            <th scope="row">{{ day.date }}</th>
                            <td class="num">{{ formatMoney(day.cost, billing.currency) }}</td>
                            <td class="num">{{ formatMoney(day.credits, billing.currency) }}</td>
                            <td class="num">{{ formatMoney(day.paid, billing.currency) }}</td>
                        </tr>
                    </tbody>
                </table>
            </details>
        </template>

        <BillingReconcile />
    </section>
</template>

<style lang="scss">
    .dd-billing {
        @include setFlex(flex-start, stretch, 10px, column);

        &__head {
            @include setFlex(space-between, center, 12px);
        }
        &__totals {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 12px;
            padding: 0;
            margin: 0;
            list-style: none;

            li {
                @include setFlex(flex-start, flex-start, 2px, column);
                padding: 12px 14px;
                border: 1px solid var(--vp-c-divider);
                border-radius: var(--dd-corner);
            }
            .label {
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
            }
            .value {
                font-family: var(--dd-mono);
                font-size: var(--font-size-l);
                font-weight: 700;
            }
            .hint {
                color: var(--vp-c-text-3);
                font-size: 12px;
            }
        }
        .dd-table .bar {
            width: 30%;

            span {
                display: block;
                background: var(--vp-c-brand-1);
                height: 6px;
                border-radius: 3px;
            }
        }
        &__daily summary {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            cursor: pointer;
        }
    }
</style>
