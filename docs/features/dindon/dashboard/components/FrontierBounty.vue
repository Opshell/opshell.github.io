<script setup lang="ts">
    import type { BountyDraft } from '../frontier';
    import type { AdminTerritory, BountyResult, FeedbackReport } from '../schemas/admin.schema';
    import { computed, reactive, ref, watch } from 'vue';
    import { adminApi, AdminApiError } from '../api';
    import { formatDateTime } from '../format';
    import { BOUNTY_DAYS_MAX, BOUNTY_TITLE_MAX, BOUNTY_UNCHANGED, bountyBlocked, bountyBody, bountyError, cancelBountyBody, daysPaid, defaultBountyTitle, targetError, targetOf } from '../frontier';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import BountyTargetPicker from './BountyTargetPicker.vue';

    // 拓荒季賞金卡（api.md 29.5，Flowsker #706、#871）。2026-11-24 起採計時在審核卡就能直接設懸賞（#855），
    // 這張卡留給「改懸賞對象」與「補發天數」，而且可以重按：同一塊重按回 200、什麼都不變，所以 409 不再代表「已經發過」。
    // 採計的獎勵是金幣（30.1，後端照計分自動算，Flowsker #791），進階方案 N 天收進「特例」。
    // 還沒審的回報後端會一起採計，所以按完要叫回報頁重抓這一則與領地（changed）。
    // 不代寫回報串的訊息：按完提醒在上面的「來往訊息」告訴他。
    interface Props {
        report: FeedbackReport;
        /** 領地清單由回報頁抓一次，審核卡與這張共用 */
        territories: AdminTerritory[];
        territoriesError?: string;
    }
    const props = withDefaults(defineProps<Props>(), { territoriesError: '' });
    const emit = defineEmits<{ changed: [] }>();
    const call = useAdminCall();

    const busy = ref(false);
    const error = ref('');
    const result = ref<BountyResult | null>(null);
    const confirming = ref(false);
    const cancelling = ref(false);
    const cancelled = ref(false);

    const draft = reactive<BountyDraft>({ days: '0', title: '', ...targetOf(props.report.bounty) });
    /** 特例才打開：天數不再是每次都要決定的事 */
    const extraOpen = ref(false);
    const current = computed(() => props.report.bounty);
    /** 沒綁 App 的回報者（LINE 上建的）：沒有裝置可以掛權益，只能署名 */
    const unbound = computed(() => props.report.reporterName !== null);
    const blocked = computed(() => bountyBlocked(props.report));
    const formError = computed(() => targetError(draft, props.territories) || bountyError(draft, unbound.value, current.value));
    const chosen = computed(() => props.territories.find(t => String(t.id) === draft.territoryId) ?? null);
    const titlePlaceholder = computed(() => defaultBountyTitle(chosen.value?.name ?? null));
    const nameOf = (id: number | null) => (id ? props.territories.find(t => t.id === id)?.name ?? `#${id}` : '');
    const memberName = (territoryId: number | null, memberId: number | null) =>
        (memberId ? props.territories.find(t => t.id === territoryId)?.members.find(m => m.id === memberId)?.name ?? `成員 #${memberId}` : '');
    /** 現在的懸賞一句話 */
    const currentLine = computed(() => {
        const bounty = current.value;
        if (!bounty) return '';
        const member = memberName(bounty.territoryId, bounty.memberId);
        const target = bounty.territoryId ? `懸賞「${nameOf(bounty.territoryId)}」${member ? `的${member}` : ''}` : '沒有設領地';
        return `${target}${bounty.days ? `、發過進階方案 ${bounty.days} 天` : ''}`;
    });
    /** 已經有懸賞時沒有「不署名」：要取消另外按 */
    const noneLabel = computed(() => (current.value?.territoryId ? '' : '不署名'));
    const summary = computed(() => {
        const days = Number(draft.days);
        const member = memberName(chosen.value?.id ?? null, draft.memberId ? Number(draft.memberId) : null);
        const was = current.value?.territoryId ?? null;
        const memberPart = member ? `的${member}` : '';
        let target = '';
        if (chosen.value && !was) target = `設成「${chosen.value.name}」${memberPart}的懸賞`;
        else if (chosen.value && was !== chosen.value.id) target = `懸賞改到「${chosen.value.name}」${memberPart}`;
        else if (chosen.value && String(current.value?.memberId ?? '') !== draft.memberId) target = member ? `成員改成「${member}」` : '不記成員';
        const parts = [days ? `進階方案 ${days} 天` : '', target].filter(Boolean);
        const accept = props.report.status === 'pending' ? `，這則會一起採計為${props.report.kind === 'suggestion' ? '建議' : ' bug'}` : '';
        return `${parts.join('、')}${accept}`;
    });

    // 按完、或別人改了，回報頁重抓這一則：表單換成那一則現在的懸賞
    watch(current, (next) => {
        Object.assign(draft, { days: '0', title: '', ...targetOf(next) });
        extraOpen.value = false;
        confirming.value = false;
    });

    function edited() {
        confirming.value = false;
        cancelling.value = false;
    }

    /** 收起特例就當作沒有要發天數，不留一個看不見的 7 在表單裡 */
    function toggleExtra(event: Event) {
        extraOpen.value = (event.target as HTMLDetailsElement).open;
        if (!extraOpen.value) {
            draft.days = '0';
            draft.title = '';
        }
        confirming.value = false;
    }

    async function submit() {
        if (formError.value || blocked.value || busy.value) return;
        if (!confirming.value) {
            confirming.value = true;
            return;
        }
        busy.value = true;
        error.value = '';
        cancelled.value = false;
        try {
            result.value = await call(token => adminApi.bounty(token, props.report.id, bountyBody(draft)));
            emit('changed');
        } catch (e) {
            // 409（不採計、天數發過、剛被別人審過或改了懸賞）與 404 的中文訊息直接顯示
            error.value = errorMessage(e);
            // 409 多半是另一位管理員剛改過：重抓這一則，表單換成現在的懸賞
            if (e instanceof AdminApiError && e.status === 409) emit('changed');
        } finally {
            busy.value = false;
            confirming.value = false;
        }
    }

    /** 取消懸賞走審核的 territory_id: null（第 8 節）：沒發過天數的整筆刪，發過的留著、只清領地 */
    async function cancelBounty() {
        if (busy.value) return;
        if (!cancelling.value) {
            cancelling.value = true;
            return;
        }
        busy.value = true;
        error.value = '';
        try {
            await call(token => adminApi.reviewFeedback(token, props.report.id, cancelBountyBody()));
            result.value = null;
            cancelled.value = true;
            emit('changed');
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
            cancelling.value = false;
        }
    }
</script>

<template>
    <section class="dd-detail__card dd-bounty">
        <h3>拓荒季賞金</h3>

        <!-- #region [P] 按完的結果 -->
        <div v-if="result" class="dd-bounty__result" role="status">
            <p><strong>✓ 已存</strong>（賞金紀錄 #{{ result.bounty.id }}）</p>
            <ul>
                <li v-if="result.perk">
                    權益「{{ result.perk.title }}」：進階方案 {{ result.perk.days }} 天，從 {{ result.perk.startsOn?.slice(0, 10) ?? '上線日' }} 起，接在他其他權益後面
                </li>
                <li>採計的金幣後端照計分自動算（季內送出的才算；懸賞基數 6），不用另外發</li>
                <li v-if="result.territory && result.pioneerSet">他是「{{ result.territory.name }}」的開拓者：{{ result.territory.pioneer }}</li>
                <li v-else-if="result.territory">「{{ result.territory.name }}」的開拓者是更早送出的「{{ result.territory.pioneer }}」，這則照樣算懸賞</li>
            </ul>
            <p class="dd-detail__muted">記得在上面的來往訊息告訴他（這裡不代寫）。天數發錯了到裝置頁撤銷權益。</p>
        </div>
        <p v-else-if="cancelled" class="dd-bounty__result" role="status">✓ 已取消懸賞，金幣回到 bug 3／建議 2 的算法</p>
        <!-- #endregion -->

        <template v-if="current">
            <p>現在：{{ currentLine }}</p>
            <p class="dd-detail__muted">{{ current.createdBy }}，{{ formatDateTime(current.createdAt) }} 建的。可以改領地、改成員、補發天數。</p>
        </template>

        <p v-if="blocked" class="dd-detail__muted">{{ blocked }}</p>

        <!-- #region [P] 表單 -->
        <form v-else class="dd-bounty__form" @submit.prevent="submit">
            <p v-if="!current" class="dd-detail__muted">
                <template v-if="unbound">沒綁 App 的回報者沒有裝置，拿不到金幣也掛不了權益，只能署名（名字是他的回報者名稱）。</template>
                <template v-else>一般在上面採計時選領地就好；這裡給「只發天數」或採計之後才補設的。</template>
            </p>

            <BountyTargetPicker
                v-model:territory-id="draft.territoryId"
                v-model:member-id="draft.memberId"
                :territories="territories"
                :disabled="busy"
                :none-label="noneLabel"
                @edited="edited"
            />
            <p class="dd-detail__muted">
                署名照回報送出時間最早的那位（已經有開拓者的，這則更早送出才換人）。
                <template v-if="report.description.trim()">回報內容在上面，看是哪一家。</template>
            </p>
            <p v-if="territoriesError" class="dd-admin__error">{{ territoriesError }}</p>

            <details v-if="!unbound && !daysPaid(current)" class="dd-bounty__extra" :open="extraOpen" @toggle="toggleExtra">
                <summary>特例：另外發進階方案天數</summary>
                <p class="dd-detail__muted">想額外獎勵、或回報是季前送的才用；一般的採計用金幣，他自己到商店買。一則只發一次。</p>
                <div class="dd-bounty__row">
                    <span class="dd-bounty__label">天數</span>
                    <input
                        v-model="draft.days"
                        type="text"
                        inputmode="numeric"
                        class="dd-bounty__days"
                        aria-label="另外發的進階方案天數"
                        :disabled="busy"
                        @input="edited"
                    />
                    <span class="dd-detail__muted">天（0～{{ BOUNTY_DAYS_MAX }}，0＝不發）</span>
                </div>
                <label class="dd-bounty__row">
                    <span class="dd-bounty__label">名稱</span>
                    <input v-model="draft.title" type="text" class="dd-bounty__title" :placeholder="titlePlaceholder" :maxlength="BOUNTY_TITLE_MAX + 10" :disabled="busy || draft.days.trim() === '0'" @input="edited" />
                </label>
                <p class="dd-detail__muted">權益清單上的名稱，選填，最多 {{ BOUNTY_TITLE_MAX }} 字；沒填用上面灰字那個。</p>
            </details>

            <p v-if="formError && formError !== BOUNTY_UNCHANGED" class="dd-admin__error">{{ formError }}</p>
            <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>

            <div v-if="confirming" class="dd-bounty__confirm" role="alertdialog" aria-label="確認賞金">
                <p>{{ report.reporterName ?? (report.deviceName || `#${report.deviceId}`) }}：{{ summary }}。</p>
                <div class="dd-detail__actions">
                    <button type="submit" class="dd-admin__btn" :disabled="busy">確定</button>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirming = false">返回</button>
                </div>
            </div>
            <div v-else-if="cancelling" class="dd-bounty__confirm" role="alertdialog" aria-label="確認取消懸賞">
                <p>取消「{{ nameOf(current?.territoryId ?? null) }}」的懸賞？那塊的署名會重算，這則的金幣回到 bug 3／建議 2。{{ current?.days ? '發過的天數留著。' : '' }}</p>
                <div class="dd-detail__actions">
                    <button type="button" class="dd-admin__btn dd-admin__btn--danger" :disabled="busy" @click="cancelBounty">確定取消</button>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="cancelling = false">返回</button>
                </div>
            </div>
            <div v-else class="dd-detail__actions">
                <button type="submit" class="dd-admin__btn" :disabled="busy || !!formError">
                    {{ current ? (Number(draft.days) > 0 ? '更新並補發天數…' : '更新懸賞…') : (Number(draft.days) > 0 ? '署名並發天數…' : '設懸賞…') }}
                </button>
                <button v-if="current?.territoryId" type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="cancelBounty">取消懸賞…</button>
            </div>
        </form>
        <!-- #endregion -->
    </section>
</template>

<style lang="scss">
    .dd-bounty {
        &__form {
            @include setFlex(flex-start, stretch, 8px, column);
        }
        &__row {
            @include setFlex(flex-start, center, 6px 8px);
            flex-wrap: wrap;
            font-size: var(--font-size-s);
        }
        &__label {
            min-width: 3em;
            color: var(--vp-c-text-2);
        }
        &__days { width: 4.5em; }
        &__extra {
            @include setFlex(flex-start, stretch, 8px, column);
            background: var(--vp-c-bg-soft);
            padding: 8px 12px;
            border-radius: 8px;
            font-size: var(--font-size-s);

            summary {
                color: var(--vp-c-text-2);
                cursor: pointer;
            }
        }
        &__title { width: min(260px, 100%); }
        &__confirm {
            @include setFlex(flex-start, stretch, 8px, column);
            background: var(--vp-c-warning-soft);
            padding: 10px 12px;
            border-radius: 8px;
            font-size: var(--font-size-s);

            p { margin: 0; }
        }
        &__result {
            background: var(--vp-c-green-soft);
            padding: 10px 12px;
            border-radius: 8px;
            font-size: var(--font-size-s);

            p { margin: 0; }
            ul {
                padding-left: 1.2em;
                margin: 6px 0;
            }
        }

        input[type=text] {
            background: var(--vp-c-bg);
            padding: 4px 10px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
        }
    }
</style>
