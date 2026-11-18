<script setup lang="ts">
    import type { BountyDraft } from '../frontier';
    import type { AdminTerritory, BountyResult, FeedbackReport } from '../schemas/admin.schema';
    import { computed, onMounted, reactive, ref } from 'vue';
    import { adminApi, AdminApiError } from '../api';
    import { formatDateTime } from '../format';
    import { BOUNTY_DAYS_NEW_FORMAT, BOUNTY_DAYS_NORMAL, BOUNTY_TITLE_MAX, bountyBlocked, bountyBody, bountyError, defaultBountyTitle, KIND_LABELS, KINDS, openTerritories, STATUS_LABELS } from '../frontier';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 採計時一鍵發拓荒季賞金（api.md 29.5，Flowsker #706）：進階方案 N 天，並把回報者設成某塊領地的開拓者。
    // 還沒審的回報後端會一起採計，所以發完要叫回報頁重抓這一則（changed）。
    // 不代寫回報串的訊息：發完提醒在上面的「來往訊息」告訴他。
    interface Props {
        report: FeedbackReport;
    }
    const props = defineProps<Props>();
    const emit = defineEmits<{ changed: [] }>();
    const call = useAdminCall();

    const territories = ref<AdminTerritory[]>([]);
    const loadError = ref('');
    const busy = ref(false);
    const error = ref('');
    const result = ref<BountyResult | null>(null);
    const confirming = ref(false);

    const draft = reactive<BountyDraft>({ days: String(BOUNTY_DAYS_NORMAL), territoryId: '', title: '' });
    /** 沒綁 App 的回報者（LINE 上建的）：沒有裝置可以掛權益，只能署名 */
    const unbound = computed(() => props.report.reporterName !== null);
    const blocked = computed(() => bountyBlocked(props.report));
    const formError = computed(() => bountyError(draft, unbound.value));
    const options = computed(() => openTerritories(territories.value));
    const groups = computed(() => KINDS.map(kind => ({ kind, list: options.value.filter(t => t.kind === kind) })).filter(group => group.list.length));
    const chosen = computed(() => territories.value.find(t => String(t.id) === draft.territoryId) ?? null);
    const titlePlaceholder = computed(() => defaultBountyTitle(chosen.value?.name ?? null));
    /** 已經發過的那筆是哪塊地 */
    const paidTerritory = computed(() => territories.value.find(t => t.id === props.report.bounty?.territoryId) ?? null);
    const summary = computed(() => {
        const days = Number(draft.days);
        const parts = [days ? `進階方案 ${days} 天` : '', chosen.value ? `署名「${chosen.value.name}」` : ''].filter(Boolean);
        const accept = props.report.status === 'pending' ? `，這則會一起採計為${props.report.kind === 'suggestion' ? '建議' : ' bug'}` : '';
        return `${parts.join('、')}${accept}`;
    });

    async function loadTerritories() {
        loadError.value = '';
        try {
            territories.value = (await call(token => adminApi.listTerritories(token))).territories;
        } catch (e) {
            // 領地抓不到還是能只發天數
            loadError.value = `領地清單抓不到：${errorMessage(e)}`;
        }
    }

    function presetDays(days: number) {
        draft.days = String(days);
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
        try {
            result.value = await call(token => adminApi.bounty(token, props.report.id, bountyBody(draft)));
            emit('changed');
            void loadTerritories(); // 署名之後那塊就不在可選清單裡了
        } catch (e) {
            // 409（不採計、已經發過、剛被別人審過）與 404 的中文訊息直接顯示
            error.value = errorMessage(e);
            // 409 多半是另一位管理員剛發過或審過：重抓這一則，畫面才會換成「已經發過」那段，不停在表單
            if (e instanceof AdminApiError && e.status === 409) emit('changed');
        } finally {
            busy.value = false;
            confirming.value = false;
        }
    }

    onMounted(() => {
        if (unbound.value) draft.days = '0';
        void loadTerritories();
    });
</script>

<template>
    <section class="dd-detail__card dd-bounty">
        <h3>拓荒季賞金</h3>

        <!-- #region [P] 發完的結果 -->
        <div v-if="result" class="dd-bounty__result" role="status">
            <p><strong>✓ 已發賞金</strong>（#{{ result.bounty.id }}）</p>
            <ul>
                <li v-if="result.perk">
                    權益「{{ result.perk.title }}」：進階方案 {{ result.perk.days }} 天，從 {{ result.perk.startsOn?.slice(0, 10) ?? '上線日' }} 起，接在他其他權益後面
                </li>
                <li v-else>沒有發天數，只署名</li>
                <li v-if="result.territory && result.pioneerSet">已設成「{{ result.territory.name }}」的開拓者：{{ result.territory.pioneer }}</li>
                <li v-else-if="result.territory">「{{ result.territory.name }}」已經有開拓者「{{ result.territory.pioneer }}」，沒有換人</li>
            </ul>
            <p class="dd-detail__muted">記得在上面的來往訊息告訴他（這裡不代寫）。發錯了到裝置頁撤銷權益、在領地頁改署名。</p>
        </div>
        <!-- #endregion -->

        <template v-else-if="report.bounty">
            <p>
                已經發過：{{ report.bounty.days ? `進階方案 ${report.bounty.days} 天` : '只署名' }}{{ paidTerritory ? `、領地「${paidTerritory.name}」` : report.bounty.territoryId ? `、領地 #${report.bounty.territoryId}` : '' }}
            </p>
            <p class="dd-detail__muted">{{ report.bounty.createdBy }}，{{ formatDateTime(report.bounty.createdAt) }}。一則回報只能發一次。</p>
        </template>

        <p v-else-if="blocked" class="dd-detail__muted">{{ blocked }}</p>

        <!-- #region [P] 表單 -->
        <form v-else class="dd-bounty__form" @submit.prevent="submit">
            <p class="dd-detail__muted">
                <template v-if="unbound">沒綁 App 的回報者沒有裝置可以掛權益，只能署名（名字是他的回報者名稱）。</template>
                <template v-else>發進階方案 N 天（從今天起，直接掛在他的裝置上），並把他設成某塊領地的開拓者。0 天＝只署名。</template>
            </p>

            <div class="dd-bounty__row">
                <span class="dd-bounty__label">天數</span>
                <button
                    type="button"
                    class="dd-admin__btn dd-admin__btn--small"
                    :class="{ 'dd-admin__btn--ghost': draft.days !== String(BOUNTY_DAYS_NORMAL) }"
                    :disabled="busy || unbound"
                    @click="presetDays(BOUNTY_DAYS_NORMAL)"
                >
                    一般 {{ BOUNTY_DAYS_NORMAL }} 天
                </button>
                <button
                    type="button"
                    class="dd-admin__btn dd-admin__btn--small"
                    :class="{ 'dd-admin__btn--ghost': draft.days !== String(BOUNTY_DAYS_NEW_FORMAT) }"
                    :disabled="busy || unbound"
                    @click="presetDays(BOUNTY_DAYS_NEW_FORMAT)"
                >
                    全新格式 {{ BOUNTY_DAYS_NEW_FORMAT }} 天
                </button>
                <input
                    v-model="draft.days"
                    type="text"
                    inputmode="numeric"
                    class="dd-bounty__days"
                    aria-label="天數"
                    :disabled="busy || unbound"
                    @input="confirming = false"
                />
                <span class="dd-detail__muted">天</span>
            </div>

            <label class="dd-bounty__row">
                <span class="dd-bounty__label">領地</span>
                <select v-model="draft.territoryId" :disabled="busy" @change="confirming = false">
                    <option value="">不署名</option>
                    <optgroup v-for="group in groups" :key="group.kind" :label="KIND_LABELS[group.kind]">
                        <option v-for="t in group.list" :key="t.id" :value="String(t.id)">{{ t.name }}（{{ STATUS_LABELS[t.status] }}）</option>
                    </optgroup>
                </select>
            </label>
            <p class="dd-detail__muted">
                只列還沒有開拓者的（{{ options.length }} 塊）：第一位才算，已經有人的不換。
                <template v-if="report.description.trim()">回報內容在上面，看是哪一家。</template>
            </p>
            <p v-if="loadError" class="dd-admin__error">{{ loadError }}</p>

            <label class="dd-bounty__row">
                <span class="dd-bounty__label">名稱</span>
                <input v-model="draft.title" type="text" class="dd-bounty__title" :placeholder="titlePlaceholder" :maxlength="BOUNTY_TITLE_MAX + 10" :disabled="busy || draft.days === '0'" @input="confirming = false" />
            </label>
            <p class="dd-detail__muted">權益清單上的名稱，選填，最多 {{ BOUNTY_TITLE_MAX }} 字；沒填用上面灰字那個。</p>

            <p v-if="formError" class="dd-admin__error">{{ formError }}</p>
            <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>

            <div v-if="confirming" class="dd-bounty__confirm" role="alertdialog" aria-label="確認發賞金">
                <p>發給 {{ report.reporterName ?? (report.deviceName || `#${report.deviceId}`) }}：{{ summary }}。一則只能發一次。</p>
                <div class="dd-detail__actions">
                    <button type="submit" class="dd-admin__btn" :disabled="busy">確定發</button>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirming = false">返回</button>
                </div>
            </div>
            <div v-else class="dd-detail__actions">
                <button type="submit" class="dd-admin__btn" :disabled="busy || !!formError">發賞金…</button>
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

        input[type=text], select {
            background: var(--vp-c-bg);
            padding: 4px 10px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
        }
        select { max-width: 100%; }
    }
</style>
