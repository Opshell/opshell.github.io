<script setup lang="ts">
    import type { SettingEdit } from '../globalSettings';
    import type { GlobalSettingItem, GlobalSettings } from '../schemas/admin.schema';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import { formatDateTime, formatInt } from '../format';
    import { buildPatch, changeSummary, confirmReasons, dailyCost, editProblem, formatReadonlyValue, formatSettingValue, outOfRange, parseIntEdit, SOURCE_LABELS, valueAfter } from '../globalSettings';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import AdminActions from './AdminActions.vue';

    // 「全域設定」分頁（api.md 第 8 節「全域設定」，Flowsker #885）：以前要改環境變數、重新部署的上限與開關，在這裡改。
    // 項目、分組、範圍、單位都照 GET 回的畫，後端加一項這裡不用改。
    // 一次可以改好幾項、按一次儲存送一個 PATCH；後端一項不對就整份退回（error 是中文，直接顯示），所以前端也先擋一遍範圍。
    // 會立刻擋到人的改動（全服務上限調到今天已用次數以下、邀請開關）先跳確認，確認的寫法跟 AppPanel／DeviceDetail 一樣是畫面上的一列，不用 window.confirm。
    const call = useAdminCall();

    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    /** 儲存失敗的訊息放在送出列裡：送出列吸在底部，錯誤放頁頂的話捲下來就看不到 */
    const saveError = ref('');
    const notice = ref('');
    const settings = ref<GlobalSettings | null>(null);
    /** key → 修改。沒有 key 的是沒動過 */
    const edits = ref<Record<string, SettingEdit>>({});
    const confirming = ref(false);

    const groups = computed(() => {
        if (!settings.value) return [];
        const { groups: list, items } = settings.value;
        const known = new Set(list.map(group => group.key));
        const result = list
            .map(group => ({ key: group.key, name: group.name, items: items.filter(item => item.group === group.key) }))
            .filter(group => group.items.length);
        // 後端加了項目卻沒在 groups 裡登記時，不要讓它從畫面上消失
        const orphans = items.filter(item => !known.has(item.group));
        if (orphans.length) result.push({ key: '_other', name: '其他', items: orphans });
        return result;
    });
    const items = computed(() => settings.value?.items ?? []);
    const problems = computed(() => Object.fromEntries(items.value.map(item => [item.key, editProblem(item, edits.value[item.key])])));
    const hasProblem = computed(() => Object.values(problems.value).some(Boolean));
    const patch = computed(() => buildPatch(items.value, edits.value));
    const changes = computed(() => changeSummary(items.value, patch.value));
    const reasons = computed(() => confirmReasons(items.value, patch.value));

    function setEdit(key: string, edit: SettingEdit) {
        edits.value = { ...edits.value, [key]: edit };
        confirming.value = false;
        notice.value = '';
        saveError.value = '';
    }

    function undoEdit(key: string) {
        const { [key]: _, ...rest } = edits.value;
        edits.value = rest;
        confirming.value = false;
    }

    function resetEdits() {
        edits.value = {};
        confirming.value = false;
        saveError.value = '';
    }

    /** 數字框顯示的字：改過就是改的字，清掉或沒改過就是現在的值 */
    function inputText(item: GlobalSettingItem): string {
        const edit = edits.value[item.key];
        return typeof edit === 'string' ? edit : String(item.value);
    }

    function switchOn(item: GlobalSettingItem): boolean {
        const edit = edits.value[item.key];
        return typeof edit === 'boolean' ? edit : Boolean(item.value);
    }

    /** 估算花費用的上限：輸入框裡是合法的數字就跟著輸入算，不然用現在的值 */
    function limitForCost(item: GlobalSettingItem): number {
        const edit = edits.value[item.key];
        if (edit === null) return Number(item.fallback);
        if (typeof edit === 'string' && !problems.value[item.key]) return parseIntEdit(edit) ?? Number(item.value);
        return Number(item.value);
    }

    async function save() {
        if (!changes.value.length || hasProblem.value) return;
        if (reasons.value.length && !confirming.value) {
            confirming.value = true;
            return;
        }
        busy.value = true;
        saveError.value = '';
        notice.value = '';
        try {
            const count = changes.value.length;
            settings.value = await call(token => adminApi.updateGlobalSettings(token, patch.value));
            resetEdits();
            notice.value = `已更新 ${count} 項：這台伺服器立刻生效，其他執行個體最多 ${settings.value.cacheTtlSeconds} 秒後生效`;
        } catch (e) {
            // 400 的 error 是後端寫好的中文（哪一項、為什麼），直接顯示；整份退回，一項都沒改
            saveError.value = errorMessage(e);
            confirming.value = false;
        } finally {
            busy.value = false;
        }
    }

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            settings.value = await call(token => adminApi.getGlobalSettings(token));
            resetEdits();
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    onMounted(load);
</script>

<template>
    <section class="dd-settings">
        <AdminActions>
            <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="loading || busy" @click="load">重新整理</button>
        </AdminActions>

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-settings__notice" role="status">✓ {{ notice }}</p>
        <p v-if="loading && !settings" class="dd-settings__muted">讀取中…</p>

        <template v-if="settings">
            <p class="dd-settings__muted">
                每一項照「後台設的 → 環境變數 → 程式預設」取第一個有的。改了之後這台伺服器立刻生效，
                <strong>其他執行個體最多 {{ settings.cacheTtlSeconds }} 秒後生效</strong>。清掉就回到環境變數或預設。
                <span v-if="settings.updatedAt">上次在這頁改：{{ formatDateTime(settings.updatedAt) }}・{{ settings.updatedBy }}</span>
            </p>

            <!-- #region [P] 可以改的，照後端的分組 -->
            <section v-for="group in groups" :key="group.key" class="dd-settings__card" :aria-labelledby="`dd-settings-${group.key}`">
                <h2 :id="`dd-settings-${group.key}`">{{ group.name }}</h2>
                <div
                    v-for="item in group.items"
                    :key="item.key"
                    class="dd-settings__item"
                    :class="{ 'is-edited': item.key in patch }"
                >
                    <div class="dd-settings__info">
                        <p class="dd-settings__name">
                            {{ item.name }}
                            <code v-if="item.env" class="dd-settings__env">{{ item.env }}</code>
                        </p>
                        <p v-if="item.description" class="dd-settings__desc">{{ item.description }}</p>
                        <p class="dd-settings__now">
                            現在：<strong>{{ formatSettingValue(item, item.value) }}</strong>
                            <span class="dd-settings__source" :class="`is-${item.source}`">{{ SOURCE_LABELS[item.source] }}</span>
                            <span v-if="item.source === 'admin'" class="dd-settings__muted">清掉會回到 {{ formatSettingValue(item, item.fallback) }}（{{ SOURCE_LABELS[item.fallbackSource] }}）</span>
                        </p>
                        <p v-if="outOfRange(item)" class="dd-settings__muted">
                            現在的值超出後台能設的範圍，是環境變數設的，照常生效；要設更大的值改環境變數、重新部署。
                        </p>
                        <!-- 全服務上限：今天用了多少、照上限算一天最多花多少（只有這項有） -->
                        <p v-if="item.usedToday !== undefined" class="dd-settings__now">
                            今天已用 <strong>{{ formatInt(item.usedToday) }}</strong> 次（台灣時間，全服務真的打了 Gemini 的）
                        </p>
                        <p v-if="item.costEstimate" class="dd-settings__cost">
                            照上限 {{ formatInt(limitForCost(item)) }} 次估算一天：平常約 <strong>{{ dailyCost(item.costEstimate, limitForCost(item)).typical }}</strong>、
                            最壞約 <strong>{{ dailyCost(item.costEstimate, limitForCost(item)).worst }}</strong>
                            <span class="dd-settings__muted">（估算。{{ item.costEstimate.note }}）</span>
                        </p>
                    </div>

                    <div class="dd-settings__control">
                        <template v-if="edits[item.key] === null">
                            <span class="dd-settings__muted">會清掉，回到 {{ formatSettingValue(item, valueAfter(item, null)) }}（{{ SOURCE_LABELS[item.fallbackSource] }}）</span>
                            <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="busy" @click="undoEdit(item.key)">復原</button>
                        </template>
                        <template v-else>
                            <label v-if="item.type === 'int'" class="dd-settings__field">
                                <input
                                    type="text"
                                    inputmode="numeric"
                                    :value="inputText(item)"
                                    :aria-label="item.name"
                                    :aria-invalid="!!problems[item.key]"
                                    :disabled="busy"
                                    @input="setEdit(item.key, ($event.target as HTMLInputElement).value)"
                                />
                                <span v-if="item.unit">{{ item.unit }}</span>
                            </label>
                            <label v-else class="dd-settings__switch">
                                <input
                                    type="checkbox"
                                    role="switch"
                                    :checked="switchOn(item)"
                                    :aria-label="item.name"
                                    :disabled="busy"
                                    @change="setEdit(item.key, ($event.target as HTMLInputElement).checked)"
                                />
                                <span>{{ switchOn(item) ? '開' : '關' }}</span>
                            </label>
                            <button
                                v-if="item.adminValue !== null"
                                type="button"
                                class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small"
                                :disabled="busy"
                                :title="`清掉後台的設定，回到${SOURCE_LABELS[item.fallbackSource]}`"
                                @click="setEdit(item.key, null)"
                            >
                                清掉
                            </button>
                            <button
                                v-else-if="item.key in edits"
                                type="button"
                                class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small"
                                :disabled="busy"
                                @click="undoEdit(item.key)"
                            >
                                復原
                            </button>
                        </template>
                        <span v-if="item.type === 'int' && item.min !== null" class="dd-settings__range">
                            可設 {{ formatInt(item.min) }}～{{ item.max === null ? '不限' : formatInt(item.max) }}
                        </span>
                        <p v-if="problems[item.key]" class="dd-admin__error">{{ problems[item.key] }}</p>
                    </div>
                </div>
            </section>
            <!-- #endregion -->

            <!-- #region [P] 送出：先列出要改什麼，會擋到人的要多按一次 -->
            <section v-if="changes.length || hasProblem || saveError" class="dd-settings__submit" aria-label="送出變更">
                <ul v-if="changes.length" class="dd-settings__changes">
                    <li v-for="change in changes" :key="change.key">
                        <strong>{{ change.name }}</strong>：{{ change.from }} → <strong>{{ change.to }}</strong>
                    </li>
                </ul>
                <p v-if="saveError" class="dd-admin__error" role="alert">{{ saveError }}</p>
                <div v-if="confirming" class="dd-settings__confirm" role="alertdialog" aria-label="確認變更">
                    <p v-for="reason in reasons" :key="reason">{{ reason }}</p>
                </div>
                <div class="dd-settings__actions">
                    <button
                        type="button"
                        class="dd-admin__btn"
                        :class="{ 'dd-admin__btn--danger': confirming }"
                        :disabled="busy || !changes.length || hasProblem"
                        @click="save"
                    >
                        {{ confirming ? `確定，儲存 ${changes.length} 項` : reasons.length ? `儲存 ${changes.length} 項…` : `儲存 ${changes.length} 項` }}
                    </button>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="resetEdits">全部還原</button>
                    <span v-if="hasProblem" class="dd-settings__muted">有一項的值不對，改好才能儲存</span>
                </div>
            </section>
            <!-- #endregion -->

            <!-- #region [P] 唯讀：只給看，說為什麼不能在後台改 -->
            <section v-if="settings.readonly.length" class="dd-settings__card" aria-labelledby="dd-settings-readonly">
                <h2 id="dd-settings-readonly">不能在後台改的</h2>
                <p class="dd-settings__muted">這些要改環境變數、重新部署。機密只顯示有沒有設。</p>
                <div class="dd-settings__table">
                    <table>
                        <thead>
                            <tr><th>項目</th><th>現在</th><th>為什麼不能在這裡改</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="entry in settings.readonly" :key="entry.key">
                                <td>
                                    {{ entry.name }}
                                    <code class="dd-settings__env">{{ entry.env }}</code>
                                </td>
                                <td class="value">
                                    {{ formatReadonlyValue(entry) }}
                                    <span v-if="!entry.secret && !entry.set && entry.value !== null" class="dd-settings__muted">（沒設環境變數，用預設）</span>
                                </td>
                                <td class="reason">{{ entry.reason }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
            <!-- #endregion -->
        </template>
    </section>
</template>

<style lang="scss">
    .dd-settings {
        @include setFlex(flex-start, stretch, 20px, column);

        &__muted {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            line-height: 1.7;
        }
        &__notice {
            background: var(--vp-c-green-soft);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: var(--font-size-s);
        }
        &__card {
            @include setFlex(flex-start, stretch, 12px, column);
            padding: 18px 20px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 12px;

            h2 { font-size: var(--font-size-m); }
        }

        // 一項一列：左邊說明與現況，右邊輸入；窄螢幕上下疊
        &__item {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
            gap: 8px 20px;
            padding: 12px 0;
            border-top: 1px solid var(--vp-c-divider);

            &.is-edited { box-shadow: inset 3px 0 0 var(--vp-c-brand-1); }
            &.is-edited .dd-settings__info { padding-left: 12px; }
        }
        &__info {
            @include setFlex(flex-start, stretch, 4px, column);
            min-width: 0;
        }
        &__name {
            @include setFlex(flex-start, baseline, 4px 8px);
            flex-wrap: wrap;
            font-size: var(--font-size-m);
            font-weight: 700;
        }
        &__env {
            color: var(--vp-c-text-3);
            font-family: var(--dd-mono);
            font-size: 12px;
            font-weight: 400;
        }
        &__desc {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            line-height: 1.6;
        }
        &__now,
        &__cost {
            font-size: var(--font-size-s);
            line-height: 1.7;
        }
        &__source {
            background: var(--vp-c-default-soft);
            padding: 1px 8px;
            border-radius: 999px;
            margin: 0 4px;
            font-size: 12px;

            &.is-admin { background: var(--vp-c-brand-soft); }
        }
        &__control {
            @include setFlex(flex-start, center, 6px 8px);
            flex-wrap: wrap;
            align-content: flex-start;

            .dd-admin__error {
                width: 100%;
                margin: 0;
            }
        }
        &__field,
        &__switch {
            @include setFlex(flex-start, center, 6px);
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
        &__field input {
            background: var(--vp-c-bg-soft);
            width: 7.5rem;
            padding: 6px 10px;
            border: 1px solid var(--vp-c-divider);
            color: var(--vp-c-text-1);
            font: inherit;
            font-family: var(--dd-mono);

            &[aria-invalid=true] { border-color: var(--vp-c-danger-1); }
        }
        &__switch input {
            width: 18px;
            height: 18px;
            accent-color: var(--vp-c-brand-1);
        }
        &__range {
            width: 100%;
            color: var(--vp-c-text-3);
            font-size: 12px;
        }

        &__submit {
            @include setFlex(flex-start, stretch, 10px, column);
            position: sticky;
            bottom: 0;
            background: var(--vp-c-bg);
            padding: 14px 20px;
            border: 1px solid var(--vp-c-brand-1);
            border-radius: 12px;
            z-index: 1;
        }
        &__changes {
            @include setFlex(flex-start, stretch, 4px, column);
            padding-left: 1.2em;
            margin: 0;
            font-size: var(--font-size-s);
        }
        &__confirm {
            @include setFlex(flex-start, stretch, 4px, column);
            background: var(--vp-c-danger-soft);
            padding: 10px 12px;
            border-radius: 8px;
            font-size: var(--font-size-s);
        }
        &__actions {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
        }

        &__table {
            overflow-x: auto;

            table {
                width: 100%;
                border-collapse: collapse;
                font-size: var(--font-size-s);
            }
            th,
            td {
                padding: 8px 10px;
                border-top: 1px solid var(--vp-c-divider);
                text-align: left;
                vertical-align: top;
            }
            th {
                color: var(--vp-c-text-2);
                font-weight: 400;
            }
            td.value {
                font-family: var(--dd-mono);
                white-space: nowrap;
            }
            td.reason {
                min-width: 16rem;
                color: var(--vp-c-text-2);
                line-height: 1.6;
            }
        }
        @include setRWD(720px) {
            &__item { grid-template-columns: minmax(0, 1fr); }
        }
    }
</style>
