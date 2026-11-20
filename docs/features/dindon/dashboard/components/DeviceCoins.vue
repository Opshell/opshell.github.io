<script setup lang="ts">
    import type { CoinAdjustDraft } from '../coins';
    import type { DeviceCoins } from '../schemas/admin.schema';
    import { computed, onMounted, reactive, ref } from 'vue';
    import { adminApi } from '../api';
    import { COIN_KIND_LABELS, COIN_REASON_MAX, coinAdjustError, emptyCoinAdjustDraft, signedCoins } from '../coins';
    import { formatDateTime, formatInt } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 裝置詳情的「金幣」（api.md 30.7，Flowsker #791）：餘額、買到的東西、帳本，以及手動調整。
    // 賺到的不記帳、每次照採計動態算（30.1），所以帳本只有買的與調整的；改判、合併問題之後餘額會跟著變，可能變成負的。
    const { deviceId } = defineProps<{ deviceId: number }>();
    const call = useAdminCall();

    const data = ref<DeviceCoins | null>(null);
    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    const notice = ref('');

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            data.value = await call(token => adminApi.deviceCoins(token, deviceId));
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    // #region [P] 手動調整：補登寄信來的回報算進排行榜；補償、退回、作弊收回只動餘額
    const draft = reactive<CoinAdjustDraft>(emptyCoinAdjustDraft());
    const confirming = ref(false);
    const formError = computed(() => coinAdjustError(draft));
    const reasonLength = computed(() => [...draft.reason.trim()].length);
    const amount = computed(() => Number(draft.amount.trim()));
    const after = computed(() => (data.value ? data.value.coins.balance + amount.value : 0));

    function edited() {
        confirming.value = false;
    }

    async function submit() {
        if (formError.value || busy.value) return;
        if (!confirming.value) {
            confirming.value = true;
            return;
        }
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const entry = await call(token => adminApi.adjustCoins(token, deviceId, {
                amount: amount.value,
                reason: draft.reason.trim(),
                countsForRank: draft.countsForRank
            }));
            notice.value = `已調整 ${signedCoins(entry.amount)} 枚${entry.countsForRank ? '，算進這一季的排行榜' : ''}`;
            Object.assign(draft, emptyCoinAdjustDraft());
            await load();
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
            confirming.value = false;
        }
    }
    // #endregion

    onMounted(load);
</script>

<template>
    <section class="dd-detail__card dd-device-coins" aria-labelledby="dd-device-coins-title">
        <h3 id="dd-device-coins-title">金幣</h3>
        <p v-if="loading && !data" class="dd-detail__muted t-shimmer" data-text="載入中…">載入中…</p>
        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>

        <template v-if="data">
            <p class="dd-device-coins__balance" :class="{ 'is-negative': data.coins.balance < 0 }">
                <strong>{{ formatInt(data.coins.balance) }}</strong> 枚能花
            </p>
            <dl class="dd-detail__info">
                <div><dt>回報賺到</dt><dd>{{ formatInt(data.coins.earned) }}</dd></div>
                <div><dt>手動調整</dt><dd>{{ signedCoins(data.coins.adjusted) }}</dd></div>
                <div><dt>花掉</dt><dd>{{ formatInt(data.coins.spent) }}</dd></div>
                <div><dt>這一季（排行榜）</dt><dd>{{ formatInt(data.coins.seasonEarned) }}</dd></div>
            </dl>
            <p v-if="data.coins.balance < 0" class="dd-detail__muted">
                餘額是負的：賺到的照採計動態算，改判或合併問題之後會變少。負的時候買不了東西，已經買的不收回。
            </p>

            <template v-if="data.owned.length">
                <h4>買到的</h4>
                <ul class="dd-device-coins__owned">
                    <li v-for="item in data.owned" :key="item.code">
                        {{ item.name }} <span class="dd-detail__muted">{{ COIN_KIND_LABELS[item.kind] }} · {{ formatDateTime(item.acquiredAt) }}</span>
                    </li>
                </ul>
            </template>

            <h4>帳本</h4>
            <p v-if="!data.ledger.length" class="dd-detail__muted">還沒有買過東西，也沒有手動調整過。</p>
            <!-- 詳情欄只有 300px 寬，一筆一列 -->
            <ul v-else class="dd-device-coins__ledger">
                <li v-for="entry in data.ledger" :key="entry.id">
                    <span class="amount" :class="{ 'is-minus': entry.amount < 0 }">{{ signedCoins(entry.amount) }}</span>
                    <span class="note">{{ entry.note }}</span>
                    <span class="dd-detail__muted">
                        {{ entry.kind === 'purchase' ? '購買' : `調整（${entry.createdBy || '?'}）` }}{{ entry.countsForRank ? ' · 算進排行榜' : '' }} · {{ formatDateTime(entry.createdAt) }}
                    </span>
                </li>
            </ul>

            <!-- #region [P] 手動調整 -->
            <form class="dd-device-coins__form" @submit.prevent="submit">
                <h4>手動調整</h4>
                <label class="dd-detail__field">
                    <span>金額</span>
                    <input v-model="draft.amount" type="text" inputmode="numeric" placeholder="10 或 -10" class="amount" :disabled="busy" @input="edited" />
                    <span class="dd-detail__muted">枚，負的是收回（可以扣成負的）</span>
                </label>
                <label class="dd-detail__field">
                    <span>原因</span>
                    <input v-model="draft.reason" type="text" placeholder="App 看得到，寫給使用者看的話" :disabled="busy" @input="edited" />
                    <span class="dd-detail__muted">{{ reasonLength }} / {{ COIN_REASON_MAX }}</span>
                </label>
                <label class="dd-device-coins__check">
                    <input v-model="draft.countsForRank" type="checkbox" :disabled="busy" @change="edited" />
                    算進這一季的排行榜（補登寄信來的回報才勾；補償、退回、作弊收回不勾）
                </label>
                <p v-if="draft.amount.trim() && formError" class="dd-admin__error">{{ formError }}</p>

                <div v-if="confirming" class="dd-device-coins__confirm" role="alertdialog" aria-label="確認調整金幣">
                    <p>
                        {{ signedCoins(amount) }} 枚，原因「{{ draft.reason.trim() }}」{{ draft.countsForRank ? '，算進排行榜（會動到所有人的名次）' : '' }}。
                        調整後能花 {{ formatInt(after) }} 枚。沒有撤銷，要改就再調一筆反向的。
                    </p>
                    <div class="dd-detail__actions">
                        <button type="submit" class="dd-admin__btn" :disabled="busy">確定調整</button>
                        <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirming = false">返回</button>
                    </div>
                </div>
                <div v-else class="dd-detail__actions">
                    <button type="submit" class="dd-admin__btn" :disabled="busy || !!formError">調整…</button>
                </div>
                <p v-if="notice" class="dd-device-coins__notice" role="status">✓ {{ notice }}</p>
            </form>
            <!-- #endregion -->
        </template>
    </section>
</template>

<style lang="scss">
    .dd-device-coins {
        h4 {
            margin: 12px 0 4px;
            font-size: var(--font-size-s);
        }

        &__balance {
            margin: 0 0 8px;
            font-size: var(--font-size-s);

            strong {
                font-size: var(--font-size-l, 1.4em);
                font-variant-numeric: tabular-nums;
            }
            &.is-negative strong { color: var(--vp-c-danger-1); }
        }
        &__owned, &__ledger {
            @include setFlex(flex-start, stretch, 6px, column);
            padding: 0;
            margin: 0;
            font-size: var(--font-size-s);
            list-style: none;
        }
        &__ledger li {
            display: grid;
            grid-template-columns: 4em 1fr;
            gap: 0 8px;

            .amount {
                font-variant-numeric: tabular-nums;
                text-align: right;

                &.is-minus { color: var(--vp-c-text-2); }
            }
            .dd-detail__muted { grid-column: 2; }
        }
        &__form {
            @include setFlex(flex-start, stretch, 8px, column);

            input[type=text] {
                background: var(--vp-c-bg);
                width: min(260px, 100%);
                padding: 4px 10px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                color: var(--vp-c-text-1);
                font-size: var(--font-size-s);
            }
            input[type=text].amount { width: 7em; }
        }
        &__check {
            @include setFlex(flex-start, flex-start, 6px);
            font-size: var(--font-size-s);
        }
        &__confirm {
            @include setFlex(flex-start, stretch, 8px, column);
            background: var(--vp-c-warning-soft);
            padding: 10px 12px;
            border-radius: 8px;
            font-size: var(--font-size-s);

            p { margin: 0; }
        }
        &__notice {
            background: var(--vp-c-green-soft);
            padding: 6px 12px;
            border-radius: 8px;
            margin: 0;
            font-size: var(--font-size-s);
        }
    }
</style>
