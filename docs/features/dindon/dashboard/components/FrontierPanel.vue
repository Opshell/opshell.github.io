<script setup lang="ts">
    import type { TerritoryDraft } from '../frontier';
    import type { AdminTerritory, FrontierSeason, TerritoryKind, TerritoryStatus } from '../schemas/admin.schema';
    import { computed, onMounted, reactive, ref } from 'vue';
    import { adminApi } from '../api';
    import { formatDateTime, formatInt } from '../format';
    import { draftOf, emptyDraft, KIND_LABELS, KINDS, moveTerritory, pioneerOrigin, seasonLine, STATUS_LABELS, STATUSES, TERRITORY_NAME_MAX, TERRITORY_NOTE_MAX, territoryFormError, territoryPatch } from '../frontier';
    import { reporterNameProblem } from '../schemas/admin.schema';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import AdminActions from './AdminActions.vue';

    // 拓荒季的領地（api.md 29.4，Flowsker #706）：上架首 30 天的活動，每家銀行／支付／電信是一塊地。
    // 「已馴服」要出版：那一版上架之後才翻、填 tamed_in。開拓者通常是回報頁發賞金時自動設的，這裡是補登與更正。
    const call = useAdminCall();

    const territories = ref<AdminTerritory[]>([]);
    const season = ref<FrontierSeason | null>(null);
    const progress = ref({ tamed: 0, total: 0 });
    const loaded = ref(false);
    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    const notice = ref('');

    // #region [P] 篩選：44 塊一頁看得完，篩選只在前端
    const kindFilter = ref<TerritoryKind | 'all'>('all');
    const statusFilter = ref<TerritoryStatus | 'all'>('all');
    const openOnly = ref(false);
    const filtered = computed(() => kindFilter.value !== 'all' || statusFilter.value !== 'all' || openOnly.value);
    const shown = computed(() => territories.value.filter(t =>
        (kindFilter.value === 'all' || t.kind === kindFilter.value)
        && (statusFilter.value === 'all' || t.status === statusFilter.value)
        && (!openOnly.value || !t.pioneer)));
    const percent = computed(() => (progress.value.total ? Math.round(progress.value.tamed / progress.value.total * 100) : 0));
    // #endregion

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            const result = await call(token => adminApi.listTerritories(token));
            territories.value = result.territories;
            season.value = result.season;
            progress.value = result.progress;
            loaded.value = true;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    // #region [P] 新增／修改
    /** null = 沒開表單；0 = 新增；其他 = 正在改那一塊 */
    const editing = ref<number | null>(null);
    const isNew = computed(() => editing.value === 0);
    const current = computed(() => territories.value.find(t => t.id === editing.value));
    const form = reactive<TerritoryDraft>(emptyDraft());
    const formError = computed(() => territoryFormError(form, isNew.value));
    const patch = computed(() => (current.value ? territoryPatch(current.value, form) : {}));
    const hasChanges = computed(() => isNew.value || Object.keys(patch.value).length > 0);
    /** 翻成已馴服卻沒寫版本：beta 期間就驗過的才留空，提醒一下，不擋 */
    const tamedWithoutVersion = computed(() => form.status === 'tamed' && !form.tamedIn.trim());
    const confirmingDelete = ref(false);
    const nameLength = computed(() => [...form.name.trim()].length);
    const noteLength = computed(() => [...form.note.trim()].length);

    function resetMessages() {
        notice.value = '';
        error.value = '';
        confirmingDelete.value = false;
        confirmingClear.value = false;
    }

    function startCreate() {
        Object.assign(form, emptyDraft());
        resetMessages();
        editing.value = 0;
    }

    function open(territory: AdminTerritory) {
        Object.assign(form, draftOf(territory));
        pioneerDeviceDraft.value = '';
        pioneerNameDraft.value = '';
        resetMessages();
        editing.value = territory.id;
    }

    function close() {
        editing.value = null;
        confirmingDelete.value = false;
    }

    async function submit() {
        if (formError.value || busy.value || !hasChanges.value) return;
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const created = isNew.value;
            const saved = created
                ? await call(token => adminApi.createTerritory(token, {
                    name: form.name.trim(),
                    kind: form.kind,
                    status: form.status,
                    tamedIn: form.tamedIn.trim() || null,
                    note: form.note.trim(),
                    // 留空不送：後端排在最後
                    ...(form.sortOrder.trim() ? { sortOrder: Number(form.sortOrder.trim()) } : {})
                }))
                : await call(token => adminApi.updateTerritory(token, editing.value!, patch.value));
            await load();
            open(saved); // open 會清掉訊息，所以訊息放在後面
            notice.value = created ? `已新增「${saved.name}」，App 的活動頁馬上看得到` : `已儲存「${saved.name}」`;
        } catch (e) {
            // 409 同名（不分大小寫）的中文訊息直接顯示
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }

    async function remove() {
        const target = current.value;
        if (!target || busy.value) return;
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            await call(token => adminApi.deleteTerritory(token, target.id));
            close();
            await load();
            notice.value = `已刪除「${target.name}」`;
        } catch (e) {
            // 發過賞金的不能刪（409），後端的訊息講了要改用 PATCH
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
            confirmingDelete.value = false;
        }
    }
    // #endregion

    // #region [P] 開拓者（29.4）：照裝置現在的名字、手打、或清掉；手動設的會蓋掉原本的
    const pioneerDeviceDraft = ref('');
    const pioneerDeviceId = computed(() => (/^\d+$/.test(pioneerDeviceDraft.value.trim()) && Number(pioneerDeviceDraft.value) > 0 ? Number(pioneerDeviceDraft.value.trim()) : null));
    const pioneerNameDraft = ref('');
    const pioneerNameProblem = computed(() => reporterNameProblem(pioneerNameDraft.value));
    const confirmingClear = ref(false);

    async function setPioneer(body: { pioneerDeviceId: number | null } | { pioneerName: string | null }, message: (saved: AdminTerritory) => string) {
        const target = current.value;
        if (!target || busy.value) return;
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const saved = await call(token => adminApi.updateTerritory(token, target.id, body));
            await load();
            open(saved);
            notice.value = message(saved);
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }
    const pioneerByDevice = () => pioneerDeviceId.value !== null
        && setPioneer({ pioneerDeviceId: pioneerDeviceId.value }, saved => `開拓者改成「${saved.pioneer}」（裝置 #${saved.pioneerDeviceId} 現在的名字）`);
    const pioneerByName = () => !pioneerNameProblem.value
        && setPioneer({ pioneerName: pioneerNameDraft.value.trim() }, saved => `開拓者改成「${saved.pioneer}」`);
    const clearPioneer = () => setPioneer({ pioneerName: null }, saved => `已清掉「${saved.name}」的開拓者`);
    // #endregion

    // #region [P] 排序：上下移一格＝跟鄰居交換 sort_order（29.4 的 PATCH）。篩選時鄰居不是真的鄰居，所以不給移
    async function move(territory: AdminTerritory, direction: -1 | 1) {
        const changes = moveTerritory(territories.value, territory.id, direction);
        if (!changes.length || busy.value) return;
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            for (const change of changes) await call(token => adminApi.updateTerritory(token, change.id, { sortOrder: change.sortOrder }));
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            // 第二筆失敗的話第一筆已經改了：一律重抓，畫面照後端現在的順序
            await load();
            busy.value = false;
        }
    }
    // #endregion

    onMounted(load);
</script>

<template>
    <section class="dd-frontier">
        <!-- #region [P] 季與全體進度 -->
        <div class="dd-frontier__head">
            <p class="dd-frontier__season" :class="`dd-frontier__season--${season?.state ?? 'unset'}`">
                {{ loaded ? seasonLine(season) : '載入中…' }}
            </p>
            <div class="dd-frontier__progress" :aria-label="`已馴服 ${progress.tamed} 塊，共 ${progress.total} 塊`">
                <span class="dd-frontier__count">已馴服 {{ formatInt(progress.tamed) }} / {{ formatInt(progress.total) }}</span>
                <span class="dd-frontier__track"><span class="dd-frontier__fill" :style="{ width: `${percent}%` }" /></span>
                <span class="dd-frontier__muted">{{ percent }}%</span>
            </div>
        </div>
        <p class="dd-frontier__muted">
            已馴服＝通知語料庫裡有那家的真實推播、正式管線跑對了；那一版上架之後才翻，並填「馴服於」。開拓者是第一位回報那家有效樣本的人，通常在回報頁發賞金時自動設，這裡是補登與更正。
        </p>
        <!-- #endregion -->

        <AdminActions>
            <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="loading" @click="load">重新整理</button>
            <button type="button" class="dd-admin__btn" @click="startCreate">新增領地</button>
        </AdminActions>

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-frontier__notice" role="status">✓ {{ notice }}</p>

        <!-- #region [P] 新增／修改的表單 -->
        <form v-if="editing !== null" class="dd-frontier__form" @submit.prevent="submit">
            <h3>{{ isNew ? '新增領地' : `修改「${current?.name}」` }}</h3>

            <div class="dd-frontier__grid">
                <label class="dd-frontier__field">
                    <span>名稱</span>
                    <input v-model="form.name" type="text" class="wide" placeholder="例如「街口支付」" autocomplete="off" :disabled="busy" />
                    <span class="count" :class="{ 'is-over': nameLength > TERRITORY_NAME_MAX }">{{ nameLength }} / {{ TERRITORY_NAME_MAX }}</span>
                </label>
                <label class="dd-frontier__field">
                    <span>種類</span>
                    <select v-model="form.kind" :disabled="busy">
                        <option v-for="kind in KINDS" :key="kind" :value="kind">{{ KIND_LABELS[kind] }}</option>
                    </select>
                </label>
                <label class="dd-frontier__field">
                    <span>狀態</span>
                    <select v-model="form.status" :disabled="busy">
                        <option v-for="status in STATUSES" :key="status" :value="status">{{ STATUS_LABELS[status] }}</option>
                    </select>
                </label>
                <label class="dd-frontier__field">
                    <span>馴服於</span>
                    <input v-model="form.tamedIn" type="text" class="version" placeholder="例如 1.0.0" autocomplete="off" :disabled="busy" />
                    <span v-if="tamedWithoutVersion" class="dd-frontier__muted">沒填＝beta 期間就驗過</span>
                </label>
                <label class="dd-frontier__field">
                    <span>備註</span>
                    <input v-model="form.note" type="text" class="wide" placeholder="例如「只驗過儲值，付款還缺」（App 會顯示）" autocomplete="off" :disabled="busy" />
                    <span class="count" :class="{ 'is-over': noteLength > TERRITORY_NOTE_MAX }">{{ noteLength }} / {{ TERRITORY_NOTE_MAX }}</span>
                </label>
                <label class="dd-frontier__field">
                    <span>排序</span>
                    <input v-model="form.sortOrder" type="text" inputmode="numeric" class="version" :placeholder="isNew ? '留空排最後' : ''" :disabled="busy" />
                    <span class="dd-frontier__muted">小的在前，App 照這個順序顯示</span>
                </label>
            </div>

            <p v-if="formError" class="dd-admin__error">{{ formError }}</p>

            <div v-if="confirmingDelete && current" class="dd-frontier__confirm" role="alertdialog" aria-label="確認刪除">
                <p>刪除「{{ current.name }}」？只用在打錯、重複；App 的活動頁會少這一塊。發過賞金的刪不掉，改名或改狀態就好。</p>
                <div class="dd-frontier__actions">
                    <button type="button" class="dd-admin__btn dd-admin__btn--danger" :disabled="busy" @click="remove">確定刪除</button>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirmingDelete = false">返回</button>
                </div>
            </div>
            <div v-else class="dd-frontier__actions">
                <button type="submit" class="dd-admin__btn" :disabled="!!formError || !hasChanges || busy">{{ isNew ? '新增' : '儲存變更' }}</button>
                <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="close">關閉</button>
                <button v-if="!isNew" type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirmingDelete = true">刪除…</button>
            </div>

            <!-- 開拓者另外存：每一種都是一次 PATCH，不跟上面的欄位混在一起 -->
            <section v-if="current" class="dd-frontier__pioneer">
                <h4>開拓者</h4>
                <p v-if="current.pioneer" class="dd-frontier__muted">
                    現在是 <strong>{{ current.pioneer }}</strong>（{{ pioneerOrigin(current) }}，{{ formatDateTime(current.pioneerSetAt) }} 設的）。手動設定會蓋掉，用在更正。
                </p>
                <p v-else class="dd-frontier__muted">還沒有開拓者。回報頁採計時發賞金會自動設；beta 的回報者在這裡補登。</p>
                <div class="dd-frontier__actions">
                    <label class="dd-frontier__field">
                        <span>照裝置 #</span>
                        <input v-model="pioneerDeviceDraft" type="text" inputmode="numeric" class="version" placeholder="裝置 id" :disabled="busy" />
                    </label>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy || pioneerDeviceId === null" @click="pioneerByDevice">用那台現在的名字署名</button>
                </div>
                <div class="dd-frontier__actions">
                    <label class="dd-frontier__field">
                        <span>手打名字</span>
                        <input v-model="pioneerNameDraft" type="text" placeholder="沒綁 App 的人" :disabled="busy" />
                    </label>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy || !!pioneerNameProblem" @click="pioneerByName">署名</button>
                </div>
                <p v-if="pioneerNameDraft.trim() && pioneerNameProblem" class="dd-admin__error">{{ pioneerNameProblem }}</p>
                <div v-if="current.pioneer" class="dd-frontier__actions">
                    <template v-if="confirmingClear">
                        <button type="button" class="dd-admin__btn dd-admin__btn--danger" :disabled="busy" @click="clearPioneer">確定清掉「{{ current.pioneer }}」</button>
                        <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirmingClear = false">返回</button>
                    </template>
                    <button v-else type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirmingClear = true">清掉署名…</button>
                </div>
                <p class="dd-frontier__muted">名字會給所有 App 使用者看到。</p>
            </section>
        </form>
        <!-- #endregion -->

        <!-- #region [P] 領地清單 -->
        <div class="dd-frontier__filters">
            <label>
                種類
                <select v-model="kindFilter">
                    <option value="all">全部</option>
                    <option v-for="kind in KINDS" :key="kind" :value="kind">{{ KIND_LABELS[kind] }}</option>
                </select>
            </label>
            <label>
                狀態
                <select v-model="statusFilter">
                    <option value="all">全部</option>
                    <option v-for="status in STATUSES" :key="status" :value="status">{{ STATUS_LABELS[status] }}</option>
                </select>
            </label>
            <label class="dd-frontier__check">
                <input v-model="openOnly" type="checkbox" />
                只看還沒有開拓者的
            </label>
            <span class="dd-frontier__muted">{{ filtered ? `${formatInt(shown.length)} / ` : '' }}{{ formatInt(territories.length) }} 塊{{ filtered ? '（篩選時不能調順序）' : '' }}</span>
        </div>

        <div class="dd-table-scroll">
            <table class="dd-table dd-frontier__table">
                <thead>
                    <tr>
                        <th scope="col" class="num">排序</th>
                        <th scope="col">名稱</th>
                        <th scope="col">種類</th>
                        <th scope="col">狀態</th>
                        <th scope="col">馴服於</th>
                        <th scope="col">開拓者</th>
                        <th scope="col">備註</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="territory in shown"
                        :key="territory.id"
                        :class="{ 'is-selected': territory.id === editing }"
                        tabindex="0"
                        @click="open(territory)"
                        @keydown.enter.self="open(territory)"
                    >
                        <td class="num">
                            <span class="dd-frontier__order">
                                <template v-if="!filtered">
                                    <button
                                        type="button"
                                        class="dd-frontier__move"
                                        :disabled="busy || territory.id === territories[0]?.id"
                                        :aria-label="`${territory.name} 往前移`"
                                        @click.stop="move(territory, -1)"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        class="dd-frontier__move"
                                        :disabled="busy || territory.id === territories[territories.length - 1]?.id"
                                        :aria-label="`${territory.name} 往後移`"
                                        @click.stop="move(territory, 1)"
                                    >
                                        ↓
                                    </button>
                                </template>
                                {{ territory.sortOrder }}
                            </span>
                        </td>
                        <td><strong>{{ territory.name }}</strong></td>
                        <td>{{ KIND_LABELS[territory.kind] }}</td>
                        <td><span class="dd-frontier__status" :class="`dd-frontier__status--${territory.status}`">{{ STATUS_LABELS[territory.status] }}</span></td>
                        <td>{{ territory.tamedIn ?? '—' }}</td>
                        <td>
                            <template v-if="territory.pioneer">
                                {{ territory.pioneer }}
                                <span class="dd-frontier__muted">{{ pioneerOrigin(territory) }}</span>
                            </template>
                            <span v-else class="dd-frontier__muted">—</span>
                        </td>
                        <td class="note">{{ territory.note }}</td>
                    </tr>
                    <tr v-if="loaded && !shown.length">
                        <td colspan="7" class="dd-table__empty">{{ territories.length ? '沒有符合的領地' : '還沒有領地，按「新增領地」開始' }}</td>
                    </tr>
                </tbody>
            </table>
            <p v-if="loading && !loaded" class="dd-frontier__muted t-shimmer" data-text="載入中…">載入中…</p>
        </div>
        <!-- #endregion -->
    </section>
</template>

<style lang="scss">
    .dd-frontier {
        @include setFlex(flex-start, stretch, 16px, column);

        &__head {
            @include setFlex(space-between, center, 12px 24px);
            flex-wrap: wrap;
        }
        &__season {
            background: var(--vp-c-default-soft);
            padding: 6px 12px;
            border-radius: 8px;
            margin: 0;
            font-size: var(--font-size-s);

            &--active { background: var(--vp-c-green-soft); }
            &--upcoming { background: var(--vp-c-brand-soft); }
            &--unset { background: var(--vp-c-warning-soft); }
        }
        &__progress {
            @include setFlex(flex-start, center, 10px);
            font-size: var(--font-size-s);
        }
        &__count { font-variant-numeric: tabular-nums; }
        &__track {
            display: block;
            background: var(--vp-c-default-soft);
            width: 160px;
            height: 8px;
            border-radius: 999px;
            overflow: hidden;
        }
        &__fill {
            display: block;
            background: var(--vp-c-green-1);
            height: 100%;
            border-radius: 999px;
            transition: width .3s var(--cubic-FiSo, ease-out);
        }
        &__muted {
            margin: 0;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
        &__notice {
            background: var(--vp-c-green-soft);
            padding: 6px 12px;
            border-radius: 8px;
            margin: 0;
            font-size: var(--font-size-s);
        }

        &__form {
            @include setFlex(flex-start, stretch, 14px, column);
            background: var(--vp-c-bg-soft);
            padding: 16px;
            border-radius: 12px;

            h3 {
                margin: 0;
                font-size: var(--font-size-m);
            }
        }
        &__grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr));
            gap: 12px 24px;
        }
        &__field {
            @include setFlex(flex-start, center, 6px 10px);
            flex-wrap: wrap;
            font-size: var(--font-size-s);

            > span:first-child {
                min-width: 4em;
                color: var(--vp-c-text-2);
            }
            .count {
                color: var(--vp-c-text-2);
                font-variant-numeric: tabular-nums;

                &.is-over { color: var(--vp-c-danger-1); }
            }
        }
        &__pioneer {
            @include setFlex(flex-start, stretch, 10px, column);
            background: var(--vp-c-bg);
            padding: 12px 14px;
            border-radius: 10px;

            h4 {
                margin: 0;
                font-size: var(--font-size-s);
            }
        }
        &__confirm {
            @include setFlex(flex-start, stretch, 10px, column);
            background: var(--vp-c-danger-soft);
            padding: 12px 14px;
            border-radius: 10px;
            font-size: var(--font-size-s);

            p { margin: 0; }
        }
        &__actions {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
        }

        &__filters {
            @include setFlex(flex-start, center, 8px 16px);
            flex-wrap: wrap;
            font-size: var(--font-size-s);
        }
        &__check {
            @include setFlex(flex-start, center, 6px);
        }

        &__table {
            td.note {
                min-width: 12em;
                max-width: 320px;
                color: var(--vp-c-text-2);
            }
        }
        &__order {
            @include setFlex(flex-end, center, 4px);
            white-space: nowrap;
        }
        &__move {
            background: var(--vp-c-default-soft);
            width: 24px;
            height: 24px;
            border-radius: 6px;
            color: var(--vp-c-text-1);
            font-size: 12px;
            line-height: 1;
            cursor: pointer;

            &:disabled {
                cursor: not-allowed;
                opacity: .35;
            }
        }

        // 狀態是資料決定的固定分類，用 --
        &__status {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 999px;
            font-size: var(--font-size-s);
            white-space: nowrap;

            &--tamed { background: var(--vp-c-green-soft); }
            &--wanted { background: var(--vp-c-warning-soft); }
        }

        input[type=text], select {
            background: var(--vp-c-bg);
            padding: 4px 10px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
        }
        input[type=text].wide { width: min(240px, 100%); }
        input[type=text].version { width: 8em; }
    }
</style>
