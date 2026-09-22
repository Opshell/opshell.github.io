<script setup lang="ts">
    import type { AdminDevice, AuditEntry, DevicePatch, Perk, PlanTier } from '../api';
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { adminApi, MAX_TOKENS } from '../api';
    import {
        AVATAR_KIND_LABELS,
        formatDateTime,
        formatInt,
        formatRelative,
        PERK_SOURCE_LABELS,
        PERK_STATUS_LABELS,
        perkLength,
        PLAN_LABELS,
        PLAN_SOURCE_LABELS,
        presetLabel
    } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    const { deviceId } = defineProps<{ deviceId: number }>();
    const emit = defineEmits<{ updated: [device: AdminDevice]; close: [] }>();
    const call = useAdminCall();

    const device = ref<AdminDevice | null>(null);
    const audit = ref<AuditEntry[]>([]);
    // beta 貢獻活動的東西（api.md 第 8 節「裝置頁多的東西」）
    const perks = ref<Perk[]>([]);
    const realPlan = ref<{ plan_tier: string; plan_source: string } | null>(null);
    const referrals = ref<{ pending: number; qualified: number } | null>(null);
    const referralCode = ref('');

    // 使用者上傳的大頭貼：要帶登入憑證取回、轉成 blob URL（新板溝通板 #48 的 /admin/devices/:id/avatar）。
    // 清掉之後沒有備份，所以清之前一定要看得到
    const avatarUrl = ref('');
    const avatarError = ref('');
    function releaseAvatar() {
        if (avatarUrl.value.startsWith('blob:')) URL.revokeObjectURL(avatarUrl.value);
        avatarUrl.value = '';
    }
    async function loadAvatar(target: AdminDevice) {
        releaseAvatar();
        avatarError.value = '';
        if (target.avatar?.kind === 'google') {
            avatarUrl.value = target.avatar.url ?? ''; // Google 的公開網址，直接載入
        } else if (target.avatar?.kind === 'upload') {
            try {
                const image = await call(token => adminApi.deviceAvatar(token, deviceId));
                avatarUrl.value = URL.createObjectURL(image);
            } catch (e) {
                avatarError.value = errorMessage(e);
            }
        }
    }
    onBeforeUnmount(releaseAvatar);
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
    const confirming = ref<'patch' | 'freeze' | 'reject-pending' | null>(null);

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
        const next = tokensMode.value === 'set' ? tokensValue.value : current.tokens + tokensValue.value;
        if (tokensMode.value === 'set' && next < 0) return '額度不能小於 0';
        if (tokensMode.value === 'delta' && next < 0) return `目前只有 ${current.tokens} 點，扣完會變負數`;
        if (next > MAX_TOKENS) return `額度最多 ${formatInt(MAX_TOKENS)} 點`; // 後端的上限，多半是打錯了
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
            perks.value = result.perks ?? [];
            realPlan.value = result.plan ?? null;
            referrals.value = result.referrals ?? null;
            referralCode.value = result.referral_code ?? '';
            resetForm();
            resetEventForm();
            loadAvatar(result.device);
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
    /**
     * 這台還在待審的回報一次不採計（api.md 第 8 節 batch，溝通板 #0053）。
     * 不走 mutate：批次端點回的是件數不是裝置。後端刻意沒把凍結包進批次，這裡也分成兩顆按鈕。
     */
    async function rejectPending() {
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const { updated } = await call(token => adminApi.batchReviewFeedback(token, { device_id: deviceId, status: 'rejected' }));
            await load(); // 操作紀錄多了幾筆
            notice.value = updated ? `已把 ${formatInt(updated)} 則待審改成「不採計」` : '這台沒有待審的回報';
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
            confirming.value = null;
        }
    }
    const toggleFreeze = () => {
        const frozen = !device.value?.frozen;
        return mutate(token => adminApi.updateDevice(token, deviceId, { frozen }), frozen ? '已凍結這台裝置' : '已解凍這台裝置');
    };
    /**
     * 清除身分。兩個強度（api.md 第 8 節，溝通板 #35）：
     * 停用 = 連這台裝置都不要了；保留 = 只是不想讓伺服器留著 email，App 要繼續用
     */
    // #region [P] beta 活動的個別操作
    // 每一個都是單獨一顆按鈕、按了就送：件數與鐵人日期是「修正資料」，
    // 清暱稱與清頭像是「處理不當內容」，都不該跟上面那張調整表單綁在一起送
    const bonusBugs = ref(0);
    const bonusSuggestions = ref(0);
    const ironDate = ref('');

    function resetEventForm() {
        if (!device.value) return;
        bonusBugs.value = device.value.bonus_bugs ?? 0;
        bonusSuggestions.value = device.value.bonus_suggestions ?? 0;
        ironDate.value = device.value.iron_achieved_on ?? '';
    }

    const bonusChanged = computed(() =>
        !!device.value && (bonusBugs.value !== (device.value.bonus_bugs ?? 0) || bonusSuggestions.value !== (device.value.bonus_suggestions ?? 0)));
    const bonusError = computed(() => {
        const bad = (n: number) => !Number.isInteger(n) || n < 0 || n > 1000;
        return bad(bonusBugs.value) || bad(bonusSuggestions.value) ? '手動加的件數要是 0～1000 的整數' : '';
    });

    const saveBonus = () => mutate(
        token => adminApi.updateDevice(token, deviceId, { bonus_bugs: bonusBugs.value, bonus_suggestions: bonusSuggestions.value }),
        '已更新手動加的件數，分數與名次會跟著變'
    );
    const saveIron = () => mutate(
        token => adminApi.updateDevice(token, deviceId, { iron_achieved_on: ironDate.value || null }),
        ironDate.value ? `已把鐵人達成日設成 ${ironDate.value}` : '已取消鐵人'
    );
    const clearNickname = () => mutate(
        token => adminApi.updateDevice(token, deviceId, { nickname: null }),
        '已清掉暱稱，排行榜上會顯示「白老鼠 #編號」（原本的暱稱留在操作紀錄裡）'
    );
    const clearTitle = () => mutate(
        token => adminApi.updateDevice(token, deviceId, { title: null }),
        '已清掉稱號（原本的字留在操作紀錄裡）'
    );
    const clearAvatar = () => mutate(
        token => adminApi.updateDevice(token, deviceId, { avatar: null }),
        '已清掉大頭貼，退回 App 內建圖案'
    );
    // #endregion

    async function eraseIdentity(freeze: boolean) {
        await mutate(
            token => adminApi.eraseIdentity(token, deviceId, freeze),
            freeze ? '已清除身分，這台裝置也已停用' : '已清除身分，這台裝置可以繼續使用'
        );
        eraseConfirmText.value = '';
    }

    // #region [P] 操作紀錄的顯示
    const ACTION_LABELS: Record<string, string> = {
        'update': '調整',
        'erase_identity': '清除身分',
        'erase-identity': '清除身分（並停用）',
        'erase-identity-keep-active': '清除身分（不停用）',
        // 使用者自己在 /dindon/account/ 做的（api.md 第 16 節）；操作者記成 self-delete
        'account-delete-link': '本人解除綁定（網頁）',
        'account-delete-account': '本人刪除帳戶資料（網頁）'
    };
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

            <!-- #region [P] 垃圾回報：這台的待審全部不採計（溝通板 #0053） -->
            <section class="dd-detail__card">
                <h3>回報</h3>
                <p class="dd-detail__muted">
                    一直送垃圾回報的話，這裡一次把這台還在「待審」的全部改成不採計；已經採計的不會翻掉，一次最多 200 則。
                    要停掉這台裝置是下面另一顆按鈕，分開按。
                </p>
                <div v-if="confirming === 'reject-pending'" class="dd-detail__actions">
                    <button type="button" class="dd-admin__btn is-danger" :disabled="busy" @click="rejectPending">確定：#{{ deviceId }} 的待審全部不採計</button>
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="confirming = null">取消</button>
                </div>
                <div v-else class="dd-detail__actions">
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="confirming = 'reject-pending'">這台的待審全部不採計…</button>
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

            <!-- #region [P] beta 貢獻活動 -->
            <section class="dd-detail__card">
                <h3>Beta 貢獻活動</h3>
                <dl class="dd-detail__info">
                    <div><dt>排行榜名字</dt><dd>{{ device.display_name || '—' }}</dd></div>
                    <div><dt>採計件數</dt><dd>bug {{ formatInt(device.bugs ?? 0) }} · 建議 {{ formatInt(device.suggestions ?? 0) }}</dd></div>
                    <div><dt>鐵人</dt><dd>{{ device.iron_achieved_on ?? '還沒達成' }}</dd></div>
                    <div v-if="realPlan">
                        <dt>現在實際方案</dt>
                        <dd>{{ PLAN_LABELS[realPlan.plan_tier] ?? realPlan.plan_tier }}（{{ PLAN_SOURCE_LABELS[realPlan.plan_source] ?? realPlan.plan_source }}）</dd>
                    </div>
                    <div>
                        <dt>稱號</dt>
                        <dd>{{ device.title || '沒設' }}</dd>
                    </div>
                    <div v-if="device.avatar">
                        <dt>大頭貼</dt>
                        <!-- 寫在同一行：換行會在「圖案」與「（」之間多出一個空格 -->
                        <dd>{{ AVATAR_KIND_LABELS[device.avatar.kind] ?? device.avatar.kind }}{{ device.avatar.kind === 'preset' ? `（${presetLabel(device.avatar.preset)}）` : '' }}</dd>
                    </div>
                </dl>
                <div v-if="avatarUrl" class="dd-detail__avatar">
                    <img :src="avatarUrl" alt="這台裝置的大頭貼" referrerpolicy="no-referrer" />
                    <span class="dd-detail__muted">{{ device.avatar?.kind === 'google' ? 'Google 帳號的大頭貼' : '使用者上傳的照片' }}：排行榜上別人看得到的就是這張</span>
                </div>
                <p v-else-if="avatarError" class="dd-admin__error">大頭貼載不出來：{{ avatarError }}</p>
                <p class="dd-detail__muted">
                    採計件數已經含手動加的。改件數或鐵人都會影響<strong>所有人的名次</strong>。
                    暱稱、稱號、大頭貼都會出現在別人的排行榜上，不當的可以清掉（只能清、不能改）。
                </p>

                <fieldset class="dd-detail__field">
                    <legend>手動加的件數</legend>
                    <span>bug</span>
                    <input v-model.number="bonusBugs" type="number" min="0" max="1000" aria-label="手動加的 bug 件數" />
                    <span>建議</span>
                    <input v-model.number="bonusSuggestions" type="number" min="0" max="1000" aria-label="手動加的建議件數" />
                    <button type="button" class="dd-admin__btn" :disabled="!bonusChanged || !!bonusError || busy" @click="saveBonus">儲存件數</button>
                </fieldset>
                <p v-if="bonusError" class="dd-admin__error">{{ bonusError }}</p>

                <fieldset class="dd-detail__field">
                    <legend>鐵人達成日</legend>
                    <input v-model="ironDate" type="date" aria-label="鐵人達成日" />
                    <button type="button" class="dd-admin__btn" :disabled="busy || ironDate === (device.iron_achieved_on ?? '')" @click="saveIron">
                        {{ ironDate ? '儲存' : '取消鐵人' }}
                    </button>
                </fieldset>

                <div class="dd-detail__actions">
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="busy || !device.nickname" @click="clearNickname">清掉暱稱</button>
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="busy || !device.title" @click="clearTitle">清掉稱號</button>
                    <button
                        type="button"
                        class="dd-admin__btn is-ghost"
                        :disabled="busy || !device.avatar || device.avatar.kind === 'preset'"
                        @click="clearAvatar"
                    >
                        清掉大頭貼
                    </button>
                </div>
            </section>
            <!-- #endregion -->

            <!-- #region [P] 權益與邀請 -->
            <section v-if="perks.length" class="dd-detail__card">
                <h3>權益</h3>
                <p class="dd-detail__muted">時間不重疊，一筆接一筆排；「等上線日」是還沒定正式版上線日的。</p>
                <!-- 詳情欄只有 300px 寬，表格會被切掉，一筆一列比較讀得完 -->
                <ul class="dd-detail__perks">
                    <li v-for="perk in perks" :key="perk.id">
                        <p class="title">
                            {{ perk.title }}
                            <span class="dd-status" :class="perk.status === 'active' ? 'is-active' : perk.status === 'revoked' ? 'is-frozen' : 'is-pending'">
                                {{ PERK_STATUS_LABELS[perk.status] ?? perk.status }}
                            </span>
                        </p>
                        <p class="dd-detail__muted">
                            {{ PLAN_LABELS[perk.plan_tier] ?? perk.plan_tier }} ·
                            {{ perkLength(perk.months, perk.days) }} ·
                            {{ PERK_SOURCE_LABELS[perk.source] ?? perk.source }}
                        </p>
                        <p class="dd-detail__muted">{{ perk.starts_on ? `${perk.starts_on} → ${perk.ends_on ?? '?'}` : '等正式版上線日定下來' }}</p>
                    </li>
                </ul>
            </section>

            <section v-if="referrals || referralCode" class="dd-detail__card">
                <h3>邀請好友</h3>
                <dl class="dd-detail__info">
                    <div v-if="referralCode"><dt>邀請碼</dt><dd>{{ referralCode }}</dd></div>
                    <div v-if="referrals"><dt>已達標</dt><dd>{{ formatInt(referrals.qualified) }} 人</dd></div>
                    <div v-if="referrals"><dt>還沒達標</dt><dd>{{ formatInt(referrals.pending) }} 人</dd></div>
                </dl>
            </section>
            <!-- #endregion -->

            <!-- #region [P] 清除身分（隱私權的刪除請求） -->
            <section v-if="device.linked || device.email" class="dd-detail__card is-danger">
                <h3>清除身分</h3>
                <p class="dd-detail__muted">
                    處理寫信來的刪除請求：清空這台裝置的 email、Google 綁定、購買憑證、暱稱、大頭貼、
                    打卡紀錄與所有回報的內容（採計的件數不變）。
                    <strong>做不回來</strong>——清掉的資料沒有備份，清完之後用這個 email 也搜尋不到。
                </p>
                <p class="dd-detail__muted">
                    <strong>強度看對方要什麼</strong>：只是不想讓伺服器留著 email、App 還要繼續用的，
                    選「保留使用」；連這台裝置都不要了的，選「並停用」（停用之後不能再用 AI 功能）。
                    對方自己在 <a href="/dindon/account/" target="_blank" rel="noopener">刪除頁</a>
                    也做得到這兩件事，不一定要經過這裡。
                </p>
                <label class="dd-detail__field">
                    <span>輸入裝置 id「{{ deviceId }}」確認</span>
                    <input v-model="eraseConfirmText" type="text" inputmode="numeric" autocomplete="off" />
                </label>
                <div class="dd-detail__actions">
                    <button type="button" class="dd-admin__btn" :disabled="!canErase || busy" @click="eraseIdentity(false)">清除身分，保留使用</button>
                    <button type="button" class="dd-admin__btn is-danger" :disabled="!canErase || busy" @click="eraseIdentity(true)">清除身分並停用</button>
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
        &__scroll { overflow-x: auto; }
        &__avatar {
            @include setFlex(flex-start, center, 12px);

            img {
                flex: none;
                width: 64px;
                height: 64px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 50%;
                object-fit: cover;
            }
        }
        &__perks {
            @include setFlex(flex-start, stretch, 10px, column);
            padding: 0;
            margin: 0;
            list-style: none;

            li {
                background: var(--vp-c-bg-soft);
                padding: 10px 12px;
                border-radius: 10px;
                font-size: var(--font-size-s);
            }
            .title {
                @include setFlex(space-between, center, 8px);
                flex-wrap: wrap;
                margin: 0 0 2px;
                font-weight: 600;
            }
            p { margin: 0; }
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
