<script setup lang="ts">
    import type { AdminDevice, AuditEntry, DevicePatch, PlanTier } from '../api';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import { formatDateTime, formatInt, formatRelative, PLAN_LABELS } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    const { deviceId } = defineProps<{ deviceId: number }>();
    const emit = defineEmits<{ updated: [device: AdminDevice], close: [] }>();
    const call = useAdminCall();

    const device = ref<AdminDevice | null>(null);
    const audit = ref<AuditEntry[]>([]);
    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    const notice = ref('');

    // #region [P] 調整表單
    const tokensMode = ref<'keep' | 'set' | 'delta'>('keep');
    const tokensValue = ref(0);
    const plan = ref<PlanTier>('free');
    const hasBeta = ref(false);
    const betaDate = ref('');
    const confirming = ref<'patch' | 'freeze' | null>(null);

    const todayInTaipei = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());

    function resetForm() {
        if (!device.value) return;
        tokensMode.value = 'keep';
        tokensValue.value = 0;
        plan.value = device.value.plan_tier;
        hasBeta.value = device.value.beta_tester_since !== null;
        betaDate.value = device.value.beta_tester_since ?? todayInTaipei();
        confirming.value = null;
    }

    /** 只送真的有變的欄位；後端也會忽略沒變的，但畫面上的確認摘要要準 */
    const patch = computed<DevicePatch>(() => {
        const current = device.value;
        if (!current) return {};
        const result: DevicePatch = {};
        if (tokensMode.value === 'set' && tokensValue.value !== current.tokens) result.tokens = tokensValue.value;
        if (tokensMode.value === 'delta' && tokensValue.value !== 0) result.tokens_delta = tokensValue.value;
        if (plan.value !== current.plan_tier) result.plan_tier = plan.value;
        const nextBeta = hasBeta.value ? betaDate.value : null;
        if (nextBeta !== current.beta_tester_since) result.beta_tester_since = nextBeta;
        return result;
    });

    const formError = computed(() => {
        const current = device.value;
        if (!current || tokensMode.value === 'keep') return '';
        if (!Number.isInteger(tokensValue.value)) return '額度要是整數';
        if (tokensMode.value === 'set' && tokensValue.value < 0) return '額度不能小於 0';
        if (tokensMode.value === 'delta' && current.tokens + tokensValue.value < 0) return `目前只有 ${current.tokens} 點，扣完會變負數`;
        return hasBeta.value && !betaDate.value ? '請選 beta 資格的日期' : '';
    });

    const changeSummary = computed(() => {
        const current = device.value;
        const p = patch.value;
        if (!current) return [];
        const lines: string[] = [];
        if (p.tokens !== undefined) lines.push(`額度 ${current.tokens} → ${p.tokens}`);
        if (p.tokens_delta !== undefined) lines.push(`額度 ${current.tokens} → ${current.tokens + p.tokens_delta}（${p.tokens_delta > 0 ? '+' : ''}${p.tokens_delta}）`);
        if (p.plan_tier !== undefined) lines.push(`方案 ${PLAN_LABELS[current.plan_tier]} → ${PLAN_LABELS[p.plan_tier]}`);
        if (p.beta_tester_since !== undefined) lines.push(p.beta_tester_since === null ? 'beta 資格 取消' : `beta 資格 ${current.beta_tester_since ?? '無'} → ${p.beta_tester_since}`);
        return lines;
    });
    // #endregion

    // 清除身分：做不回來，要輸入裝置 id 才能按
    const eraseConfirmText = ref('');
    const canErase = computed(() => eraseConfirmText.value.trim() === String(deviceId));

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            const result = await call(token => adminApi.getDevice(token, deviceId));
            device.value = result.device;
            audit.value = result.audit;
            resetForm();
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    /** 所有寫入共用：送出 → 重新載入（拿到新的操作紀錄）→ 通知列表更新那一列 */
    async function mutate(action: (token: string) => Promise<{ device: AdminDevice }>, doneMessage: string) {
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const result = await call(action);
            emit('updated', result.device);
            await load();
            notice.value = doneMessage;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
            confirming.value = null;
        }
    }

    const submitPatch = () => mutate(token => adminApi.updateDevice(token, deviceId, patch.value), '已儲存變更');
    const toggleFreeze = () => {
        const frozen = !device.value?.frozen;
        return mutate(token => adminApi.updateDevice(token, deviceId, { frozen }), frozen ? '已凍結這台裝置' : '已解凍這台裝置');
    };
    async function eraseIdentity() {
        await mutate(token => adminApi.eraseIdentity(token, deviceId), '已清除身分，這台裝置也已凍結');
        eraseConfirmText.value = '';
    }

    // #region [P] 操作紀錄的顯示
    const ACTION_LABELS: Record<string, string> = { 'update': '調整', 'erase_identity': '清除身分', 'erase-identity': '清除身分' };
    const FIELD_LABELS: Record<string, string> = {
        tokens: '額度',
        plan_tier: '方案',
        beta_tester_since: 'beta 資格',
        frozen_at: '凍結',
        linked: '綁定 Google',
        had_email: '有 email'
    };

    function formatValue(value: unknown): string {
        if (value === null || value === undefined) return '無';
        if (typeof value === 'boolean') return value ? '是' : '否';
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
        return String(value);
    }

    function auditChanges(entry: AuditEntry): string[] {
        const keys = [...new Set([...Object.keys(entry.before ?? {}), ...Object.keys(entry.after ?? {})])];
        return keys.map(key => `${FIELD_LABELS[key] ?? key}：${formatValue(entry.before?.[key])} → ${formatValue(entry.after?.[key])}`);
    }
    // #endregion

    onMounted(load);
</script>

<template>
    <aside class="dd-detail" aria-label="裝置詳細資料">
        <header class="dd-detail__header">
            <h2>裝置 #{{ deviceId }}</h2>
            <span v-if="device" class="dd-status" :class="device.frozen ? 'is-frozen' : 'is-active'">
                {{ device.frozen ? '❄ 已凍結' : '● 啟用' }}
            </span>
            <button type="button" class="dd-detail__close" aria-label="關閉" @click="emit('close')">✕</button>
        </header>

        <p v-if="loading && !device" class="dd-detail__muted">載入中…</p>
        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-detail__notice" role="status">✓ {{ notice }}</p>

        <template v-if="device">
            <dl class="dd-detail__info">
                <div><dt>方案</dt><dd>{{ PLAN_LABELS[device.plan_tier] ?? device.plan_tier }}</dd></div>
                <div><dt>剩餘額度</dt><dd>{{ formatInt(device.tokens) }}</dd></div>
                <div><dt>Beta 資格</dt><dd>{{ device.beta_tester_since ?? '無' }}</dd></div>
                <div><dt>Google</dt><dd>{{ device.linked ? device.email ?? '已綁定' : '未綁定' }}</dd></div>
                <div><dt>訂閱到期</dt><dd>{{ formatDateTime(device.subscription_expires_at) }}</dd></div>
                <div><dt>近 30 天 AI</dt><dd>{{ formatInt(device.ai_calls_30d) }} 次</dd></div>
                <div><dt>最近使用</dt><dd>{{ formatRelative(device.last_ai_at) }}</dd></div>
                <div><dt>建立</dt><dd>{{ formatDateTime(device.created_at) }}</dd></div>
                <div v-if="device.frozen"><dt>凍結於</dt><dd>{{ formatDateTime(device.frozen_at) }}</dd></div>
            </dl>

            <!-- #region [P] 調整 -->
            <section class="dd-detail__card">
                <h3>調整</h3>
                <fieldset class="dd-detail__field">
                    <legend>額度</legend>
                    <label><input v-model="tokensMode" type="radio" value="keep" /> 不變</label>
                    <label><input v-model="tokensMode" type="radio" value="set" /> 設定為</label>
                    <label><input v-model="tokensMode" type="radio" value="delta" /> 增減</label>
                    <input
                        v-if="tokensMode !== 'keep'"
                        v-model.number="tokensValue"
                        type="number"
                        step="1"
                        :aria-label="tokensMode === 'set' ? '新的額度' : '要增減的點數（負數是扣）'"
                    />
                </fieldset>
                <label class="dd-detail__field">
                    <span>方案</span>
                    <select v-model="plan">
                        <option value="free">免費</option>
                        <option value="pro">Pro</option>
                    </select>
                </label>
                <div class="dd-detail__field">
                    <label><input v-model="hasBeta" type="checkbox" /> Beta 資格（勇敢白老鼠）</label>
                    <input v-if="hasBeta" v-model="betaDate" type="date" aria-label="beta 資格的日期" />
                </div>
                <p v-if="formError" class="dd-admin__error">{{ formError }}</p>

                <div v-if="confirming === 'patch'" class="dd-detail__confirm" role="alertdialog" aria-label="確認變更">
                    <p>即將變更：</p>
                    <ul><li v-for="line in changeSummary" :key="line">{{ line }}</li></ul>
                    <div class="dd-detail__actions">
                        <button type="button" class="dd-admin__btn" :disabled="busy" @click="submitPatch">確認送出</button>
                        <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="confirming = null">返回</button>
                    </div>
                </div>
                <div v-else class="dd-detail__actions">
                    <button type="button" class="dd-admin__btn" :disabled="!changeSummary.length || !!formError || busy" @click="confirming = 'patch'">送出變更…</button>
                    <button v-if="changeSummary.length" type="button" class="dd-admin__btn is-ghost" @click="resetForm">還原</button>
                </div>
            </section>
            <!-- #endregion -->

            <!-- #region [P] 凍結（軟刪除） -->
            <section class="dd-detail__card">
                <h3>{{ device.frozen ? '解凍' : '凍結' }}</h3>
                <p class="dd-detail__muted">
                    {{ device.frozen
                        ? '解凍後這台裝置的 AI 功能恢復正常，資料原本就都還在。'
                        : '凍結後這台裝置打任何 API 都會收到 403「這台裝置已停用」，AI 功能停用，也不能用換機恢復把權益搬走。資料都會留著，隨時可以解凍。' }}
                </p>
                <div v-if="confirming === 'freeze'" class="dd-detail__actions">
                    <button type="button" class="dd-admin__btn" :class="{ 'is-danger': !device.frozen }" :disabled="busy" @click="toggleFreeze">
                        確定{{ device.frozen ? '解凍' : '凍結' }} #{{ deviceId }}
                    </button>
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="confirming = null">取消</button>
                </div>
                <div v-else class="dd-detail__actions">
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="confirming = 'freeze'">{{ device.frozen ? '解凍…' : '凍結這台裝置…' }}</button>
                </div>
            </section>
            <!-- #endregion -->

            <!-- #region [P] 清除身分（隱私權的刪除請求） -->
            <section v-if="device.linked || device.email" class="dd-detail__card is-danger">
                <h3>清除身分</h3>
                <p class="dd-detail__muted">
                    處理隱私權政策的刪除請求：清空這台裝置的 email、Google 綁定與購買憑證，並凍結它。
                    <strong>做不回來</strong>——清掉的資料沒有備份，清完之後用這個 email 也搜尋不到。
                </p>
                <label class="dd-detail__field">
                    <span>輸入裝置 id「{{ deviceId }}」確認</span>
                    <input v-model="eraseConfirmText" type="text" inputmode="numeric" autocomplete="off" />
                </label>
                <div class="dd-detail__actions">
                    <button type="button" class="dd-admin__btn is-danger" :disabled="!canErase || busy" @click="eraseIdentity">清除身分</button>
                </div>
            </section>
            <!-- #endregion -->

            <section class="dd-detail__card">
                <h3>操作紀錄</h3>
                <p v-if="!audit.length" class="dd-detail__muted">還沒有任何後台操作</p>
                <ol v-else class="dd-detail__audit">
                    <li v-for="(entry, index) in audit" :key="index">
                        <p class="meta">{{ formatDateTime(entry.created_at) }} · {{ ACTION_LABELS[entry.action] ?? entry.action }} · {{ entry.actor }}</p>
                        <p v-for="line in auditChanges(entry)" :key="line">{{ line }}</p>
                    </li>
                </ol>
            </section>
        </template>
    </aside>
</template>

<style lang="scss">
    .dd-detail {
        @include setFlex(flex-start, stretch, 16px, column);
        padding: 20px;
        border: 1px solid var(--vp-c-divider);
        border-radius: 16px;

        &__header {
            @include setFlex(flex-start, center, 10px);

            h2 { font-size: var(--font-size-l); }
        }
        &__close {
            background: transparent;
            border: 0;
            margin-left: auto;
            color: var(--vp-c-text-2);
            font-size: 1.1rem;
            cursor: pointer;
        }
        &__muted {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
        &__notice {
            background: var(--vp-c-green-soft);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: var(--font-size-s);
        }
        &__info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px 16px;
            margin: 0;
            font-size: var(--font-size-s);

            dt { color: var(--vp-c-text-2); }
            dd {
                margin: 0;
                font-weight: 600;
                word-break: break-all;
            }
        }
        &__card {
            @include setFlex(flex-start, stretch, 10px, column);
            padding: 16px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 12px;

            h3 { font-size: var(--font-size-m); }
            &.is-danger { border-color: var(--vp-c-danger-1); }
        }
        &__field {
            @include setFlex(flex-start, center, 8px 14px);
            flex-wrap: wrap;
            padding: 0;
            border: 0;
            margin: 0;
            font-size: var(--font-size-s);

            legend {
                float: left;
                margin-right: 4px;
                color: var(--vp-c-text-2);
            }
            > span { color: var(--vp-c-text-2); }
            input[type=number], input[type=date], input[type=text], select {
                background: var(--vp-c-bg-soft);
                width: 150px;
                padding: 4px 10px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                color: var(--vp-c-text-1);
            }
        }
        &__actions {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
        }
        &__confirm {
            @include setFlex(flex-start, stretch, 8px, column);
            background: var(--vp-c-warning-soft);
            padding: 12px;
            border-radius: 10px;
            font-size: var(--font-size-s);

            ul {
                padding-left: 18px;
                margin: 0;
            }
        }
        &__audit {
            @include setFlex(flex-start, stretch, 10px, column);
            padding: 0;
            margin: 0;
            font-size: var(--font-size-s);
            list-style: none;

            li {
                padding-bottom: 10px;
                border-bottom: 1px solid var(--vp-c-divider);
            }
            .meta { color: var(--vp-c-text-2); }
        }
    }
</style>
