<script setup lang="ts">
    import type { PaidFilter } from '../payments';
    import type { PaymentsSummary } from '../schemas/admin.schema';
    import { computed } from 'vue';
    import { formatInt } from '../format';
    import { BASE_PLAN_LABELS, DONATION_TIERS, orderedCounts, SUBSCRIPTION_STATE_LABELS, SUBSCRIPTION_STATE_ORDER, tipLabel } from '../payments';

    // 總覽的付款卡片（#570，api.md 第 8 節 payments/summary）。
    // 後端不算測試裝置、凍結的照算、沒有金額；點進名單是裝置列表的 paid 篩選，那邊**含**測試裝置，所以兩邊可能差幾台
    const { summary, error } = defineProps<{ summary: PaymentsSummary | null; error: string }>();
    const emit = defineEmits<{ open: [paid: PaidFilter] }>();

    const subs = computed(() => summary?.subscriptions);
    const states = computed(() => orderedCounts(subs.value?.byState ?? {}, SUBSCRIPTION_STATE_ORDER));
    const plans = computed(() => orderedCounts(subs.value?.byBasePlan ?? {}, ['monthly', 'yearly', 'unknown']));
    const tiers = computed(() => orderedCounts(summary?.donations.byTier ?? {}, DONATION_TIERS.map(tier => tier.id)));
</script>

<template>
    <article class="dd-overview__card dd-paycard">
        <h3>付款<button type="button" class="more" @click="emit('open', 'any')">名單 →</button></h3>
        <p class="sub">不算測試裝置，凍結的照算。沒有金額：後端不存，營收看 Play Console</p>

        <p v-if="error" class="dd-admin__error" role="alert">付款數字抓不到：{{ error }}</p>
        <template v-else-if="summary && subs">
            <div class="dd-paycard__stats">
                <button type="button" @click="emit('open', 'subscribing')">
                    <span class="label">訂閱中</span>
                    <span class="value">{{ formatInt(subs.subscribing) }}</span>
                    <span class="hint">試用 {{ formatInt(subs.inTrial) }}・關掉續訂 {{ formatInt(subs.autoRenewOff) }}</span>
                </button>
                <button type="button" @click="emit('open', 'donated')">
                    <span class="label">贊助過的人</span>
                    <span class="value">{{ formatInt(summary.donations.supporters) }}</span>
                    <span class="hint">退款 {{ formatInt(summary.donations.refunded) }} 筆</span>
                </button>
            </div>

            <div class="dd-paycard__groups">
                <section>
                    <h4>訂過的（含過期）</h4>
                    <p v-if="!states.length" class="dd-overview__muted">還沒有人從 Play 訂過</p>
                    <dl v-else>
                        <div v-for="row in states" :key="row.key">
                            <dt>{{ SUBSCRIPTION_STATE_LABELS[row.key] ?? row.key }}</dt><dd>{{ formatInt(row.count) }}</dd>
                        </div>
                    </dl>
                </section>
                <section>
                    <h4>訂閱中的繳費方式</h4>
                    <p v-if="!plans.length" class="dd-overview__muted">沒有訂閱中的</p>
                    <dl v-else>
                        <div v-for="row in plans" :key="row.key">
                            <dt>{{ BASE_PLAN_LABELS[row.key] ?? row.key }}</dt><dd>{{ formatInt(row.count) }}</dd>
                        </div>
                    </dl>
                </section>
                <section>
                    <h4>各階贊助（筆，不含退款）</h4>
                    <p v-if="!tiers.length" class="dd-overview__muted">還沒有人贊助</p>
                    <dl v-else>
                        <div v-for="row in tiers" :key="row.key">
                            <dt>{{ tipLabel(row.key) }}</dt><dd>{{ formatInt(row.count) }}</dd>
                        </div>
                    </dl>
                </section>
            </div>
            <p class="dd-overview__muted">點進名單是裝置列表，那邊含測試裝置（標 ⚙），數字可能比這裡多幾台。</p>
        </template>
        <p v-else class="dd-overview__muted t-shimmer" data-text="載入中…">載入中…</p>
    </article>
</template>

<style lang="scss">
    .dd-paycard {
        &__stats {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;

            button {
                @include setFlex(flex-start, flex-start, 0, column);
                background: var(--vp-c-bg-soft);
                padding: 12px 16px;
                border: 1px solid transparent;
                border-radius: 12px;
                color: var(--vp-c-text-1);
                text-align: left;
                cursor: pointer;
                transition: border-color .15s;

                &:hover { border-color: var(--vp-c-brand-1); }
                &:focus-visible {
                    outline: 2px solid var(--vp-c-brand-1);
                    outline-offset: 2px;
                }
            }
            .label {
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
            }
            .value {
                font-size: var(--font-size-xl);
                font-weight: 700;
                line-height: 1.4;
            }
            .hint {
                color: var(--vp-c-text-3);
                font-size: var(--font-size-xs);
            }
        }
        &__groups {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px 20px;
            font-size: var(--font-size-s);

            h4 {
                margin: 0 0 4px;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-xs);
                font-weight: 600;
            }
            dl { margin: 0; }
            dl div {
                @include setFlex(space-between, baseline, 8px);
                padding: 2px 0;
                border-bottom: 1px solid var(--vp-c-divider);
            }
            dd {
                margin: 0;
                font-weight: 600;
                font-variant-numeric: tabular-nums;
            }
        }
    }
</style>
