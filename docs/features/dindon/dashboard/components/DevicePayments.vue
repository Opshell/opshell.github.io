<script setup lang="ts">
    import type { AdminDevice, DonationRecord } from '../schemas/admin.schema';
    import { computed } from 'vue';
    import { formatDateTime } from '../format';
    import { BASE_PLAN_LABELS, isSubscribing, sortByTier, SUBSCRIPTION_STATE_LABELS, tipLabel } from '../payments';

    // 裝置詳情的「訂閱與贊助」（#570，後端 Flowsker #568）。
    // 訂閱的真相在 Google Play，這裡是後端快取的驗證結果；贊助的完整紀錄含退款，orderId 拿去 Play Console 的「訂單管理」對照、退款。
    // 後端不存金額，標的金額是照 api.md 7.1 的價目表，營收以 Play Console 為準
    const { device, records } = defineProps<{ device: AdminDevice; records: DonationRecord[] }>();

    const subscribing = computed(() => isSubscribing(device));
    const expired = computed(() => !!device.subscriptionExpiresAt && Date.parse(device.subscriptionExpiresAt) <= Date.now());
    const yesNo = (value: boolean | null, yes: string, no: string) => (value === null ? '—' : value ? yes : no);
    const tiers = computed(() => sortByTier(device.donatedTiers, id => id).map(tipLabel).join('、'));
    const refunded = computed(() => records.filter(record => record.refundedAt).length);
</script>

<template>
    <section class="dd-detail__card dd-pays" aria-labelledby="dd-pays-title">
        <h3 id="dd-pays-title">訂閱與贊助</h3>

        <!-- 沒從 Play 訂過、也沒有到期日（後台直接設的方案才會有）就一句話帶過，不列一排「—」 -->
        <p v-if="!device.subscriptionState && !device.subscriptionExpiresAt" class="dd-detail__muted">沒從 Play 訂過</p>
        <dl v-else class="dd-detail__info">
            <div>
                <dt>訂閱</dt>
                <dd>{{ device.subscriptionState ? SUBSCRIPTION_STATE_LABELS[device.subscriptionState] ?? device.subscriptionState : '沒從 Play 訂過' }}</dd>
            </div>
            <div><dt>現在有權益</dt><dd>{{ device.subscriptionState ? (subscribing ? '有' : '沒有') : '—' }}</dd></div>
            <div>
                <dt>繳費方式</dt>
                <dd>{{ device.subscriptionBasePlan ? BASE_PLAN_LABELS[device.subscriptionBasePlan] ?? device.subscriptionBasePlan : '—' }}</dd>
            </div>
            <div><dt>免費試用</dt><dd>{{ yesNo(device.subscriptionInTrial, '試用中', '沒有') }}</dd></div>
            <div><dt>自動續訂</dt><dd>{{ yesNo(device.autoRenewing, '會續訂', '關掉了，到期就停') }}</dd></div>
            <div>
                <dt>到期</dt>
                <dd>{{ formatDateTime(device.subscriptionExpiresAt) }}{{ expired ? '（已過）' : '' }}</dd>
            </div>
        </dl>

        <p class="dd-pays__sum">
            贊助 <strong>{{ device.donations }}</strong> 筆（不算退款的）{{ tiers ? `・買過 ${tiers}` : '' }}{{ refunded ? `・退款 ${refunded} 筆` : '' }}
        </p>
        <p v-if="!records.length" class="dd-detail__muted">沒有贊助紀錄</p>
        <ul v-else class="dd-pays__list">
            <li v-for="record in records" :key="record.orderId" :class="{ 'is-refunded': record.refundedAt }">
                <p class="row">
                    <strong>{{ tipLabel(record.productId) }}</strong>
                    <span class="dd-detail__muted">{{ formatDateTime(record.createdAt) }}</span>
                    <span v-if="record.refundedAt" class="dd-pays__refund">已退款 {{ formatDateTime(record.refundedAt).slice(0, 10) }}</span>
                </p>
                <code class="order">{{ record.orderId }}</code>
            </li>
        </ul>
        <p class="dd-detail__muted">訂單編號拿去 Play Console 的「訂單管理」查、退款。金額是照價目表標的，實收看 Play Console。</p>
    </section>
</template>

<style lang="scss">
    .dd-pays {
        &__sum {
            margin: 0;
            font-size: var(--font-size-s);
        }
        &__list {
            @include setFlex(flex-start, stretch, 8px, column);
            padding: 0;
            margin: 0;
            list-style: none;

            li {
                background: var(--vp-c-bg-soft);
                padding: 8px 12px;
                border-radius: 8px;
                font-size: var(--font-size-s);

                // 退款的不算數：淡掉，但不刪掉線，訂單編號還要看得清楚
                &.is-refunded strong { color: var(--vp-c-text-3); }
            }
            .row {
                @include setFlex(flex-start, baseline, 4px 10px);
                flex-wrap: wrap;
                margin: 0;
            }
            .order {
                background: transparent;
                padding: 0;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-xs);
                word-break: break-all;
            }
        }
        &__refund {
            background: var(--vp-c-danger-soft);
            padding: 1px 8px;
            border-radius: 999px;
            font-size: var(--font-size-xs);
            font-weight: 600;
        }
    }
</style>
