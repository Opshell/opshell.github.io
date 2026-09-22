<script setup lang="ts">
    import type { PromoCode, PromoPayload, PromoRedemption } from '../api';
    import { computed, onMounted, reactive, ref } from 'vue';
    import { adminApi } from '../api';
    import { formatDateTime, formatInt, PLAN_LABELS } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 優惠碼管理（api.md 第 8 節「優惠碼」，溝通板 #38）。
    // 一組碼可以送方案時間、送額度點數，或兩者都送，至少一種——表單用兩個勾選框表示，
    // 勾了才出現那一組欄位，這樣「選了 pro 才要填幾個月」就不用另外解釋。
    const call = useAdminCall();

    // 後端的上限，先在這裡擋掉，不用等 400
    const MAX_MONTHS = 24;
    const MAX_DAYS = 366;
    const MAX_TOKENS = 1_000_000;

    const codes = ref<PromoCode[]>([]);
    const redemptions = ref<PromoRedemption[]>([]);
    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    const notice = ref('');
    /** null = 沒開表單；'' = 新增；其他 = 正在改那一組碼 */
    const editing = ref<string | null>(null);
    const isNew = computed(() => editing.value === '');

    const form = reactive({
        code: '',
        givesPlan: true,
        planTier: 'pro' as 'lite' | 'pro',
        months: 1,
        days: 0,
        givesTokens: false,
        tokens: 100,
        unlimitedSeats: true,
        seats: 50,
        unlimitedExpiry: true,
        /** datetime-local 的值（當地時間），送出前轉成 RFC3339 */
        expiresAt: '',
        note: '',
        active: true
    });

    function resetForm() {
        Object.assign(form, {
            code: '',
            givesPlan: true,
            planTier: 'pro',
            months: 1,
            days: 0,
            givesTokens: false,
            tokens: 100,
            unlimitedSeats: true,
            seats: 50,
            unlimitedExpiry: true,
            expiresAt: '',
            note: '',
            active: true
        });
    }

    /** RFC3339（UTC）→ datetime-local 要的當地時間字串 */
    function toLocalInput(iso: string): string {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    const rewardText = (promo: PromoCode) => [
        promo.plan_tier ? `${PLAN_LABELS[promo.plan_tier] ?? promo.plan_tier} ${[promo.months ? `${promo.months} 個月` : '', promo.days ? `${promo.days} 天` : ''].filter(Boolean).join(' ')}` : '',
        promo.tokens ? `${formatInt(promo.tokens)} 點` : ''
    ].filter(Boolean).join('＋');

    const seatsText = (promo: PromoCode) =>
        promo.max_redemptions === null ? `${formatInt(promo.redeemed)} / 不限` : `${formatInt(promo.redeemed)} / ${formatInt(promo.max_redemptions)}`;

    /** 用完了、過期了，即使 active 還是 true 也兌換不到 */
    function stateOf(promo: PromoCode): { label: string; kind: string } {
        if (!promo.active) return { label: '已停用', kind: 'is-frozen' };
        if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) return { label: '已過期', kind: 'is-frozen' };
        if (promo.max_redemptions !== null && promo.redeemed >= promo.max_redemptions) return { label: '名額用完', kind: 'is-frozen' };
        return { label: '● 可兌換', kind: 'is-active' };
    }

    // 送出前先自己驗一遍，錯誤訊息比後端那句長長的規則好懂
    const formError = computed(() => {
        if (isNew.value && form.code.trim() && !/^[A-Z0-9]{6,32}$/i.test(form.code.trim())) return '優惠碼要是 6～32 個英數字（留空就自動產生）';
        if (!form.givesPlan && !form.givesTokens) return '至少要送一種：方案時間或額度點數';
        if (form.givesPlan && form.months + form.days === 0) return '選了方案就要給時間，月數和天數不能都是 0';
        if (form.givesPlan && (form.months < 0 || form.months > MAX_MONTHS || form.days < 0 || form.days > MAX_DAYS)) return `月數 0～${MAX_MONTHS}、天數 0～${MAX_DAYS}`;
        if (form.givesTokens && (form.tokens < 1 || form.tokens > MAX_TOKENS)) return `點數要是 1～${formatInt(MAX_TOKENS)}`;
        if (!form.unlimitedSeats && form.seats < 1) return '名額要是 1 以上，或勾「不限」';
        if (!form.unlimitedExpiry && !form.expiresAt) return '請填到期時間，或勾「不限」';
        return '';
    });

    function payload(): PromoPayload {
        const body: PromoPayload = {
            plan_tier: form.givesPlan ? form.planTier : '',
            months: form.givesPlan ? Number(form.months) : 0,
            days: form.givesPlan ? Number(form.days) : 0,
            tokens: form.givesTokens ? Number(form.tokens) : 0,
            max_redemptions: form.unlimitedSeats ? null : Number(form.seats),
            expires_at: form.unlimitedExpiry ? null : new Date(form.expiresAt).toISOString(),
            note: form.note.trim()
        };
        if (isNew.value) {
            if (form.code.trim()) body.code = form.code.trim();
        } else {
            body.active = form.active;
        }
        return body;
    }

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            codes.value = await call(token => adminApi.listPromoCodes(token));
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    function startCreate() {
        resetForm();
        redemptions.value = [];
        notice.value = '';
        error.value = '';
        editing.value = '';
    }

    /** 點列表上的一組碼：把設定填進表單，同時抓誰兌換過 */
    async function open(promo: PromoCode) {
        notice.value = '';
        error.value = '';
        editing.value = promo.code;
        Object.assign(form, {
            code: promo.code,
            givesPlan: !!promo.plan_tier,
            planTier: promo.plan_tier || 'pro',
            months: promo.months,
            days: promo.days,
            givesTokens: promo.tokens > 0,
            tokens: promo.tokens || 100,
            unlimitedSeats: promo.max_redemptions === null,
            seats: promo.max_redemptions ?? 50,
            unlimitedExpiry: !promo.expires_at,
            expiresAt: promo.expires_at ? toLocalInput(promo.expires_at) : '',
            note: promo.note,
            active: promo.active
        });
        redemptions.value = [];
        try {
            redemptions.value = (await call(token => adminApi.getPromoCode(token, promo.code))).redemptions;
        } catch (e) {
            error.value = errorMessage(e);
        }
    }

    async function submit() {
        if (formError.value || busy.value) return;
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            if (isNew.value) {
                const created = await call(token => adminApi.createPromoCode(token, payload()));
                await load();
                await open(created);
                notice.value = `已建立 ${created.code}`;
            } else {
                const saved = await call(token => adminApi.updatePromoCode(token, editing.value!, payload()));
                await load();
                notice.value = `已儲存 ${saved.code}（已經兌換過的人不受影響）`;
            }
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }

    /** 停用／啟用單獨一顆按鈕：這是最常用的動作，不用先改別的欄位 */
    async function toggleActive() {
        if (busy.value || isNew.value) return;
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const next = !form.active;
            const saved = await call(token => adminApi.updatePromoCode(token, editing.value!, { active: next }));
            form.active = saved.active;
            await load();
            notice.value = next ? '已停用，之後不能再兌換（已經兌換過的人不受影響）' : '已啟用';
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }

    async function copyCode(code: string) {
        try {
            await navigator.clipboard.writeText(code);
            notice.value = `已複製 ${code}`;
        } catch {
            notice.value = `複製失敗，請手動選取：${code}`;
        }
    }

    onMounted(load);
</script>

<template>
    <section class="dd-promo">
        <div class="dd-promo__bar">
            <p class="dd-promo__muted">
                一組碼可以送方案時間、送額度點數，或兩者都送。停用或改設定<strong>不影響已經兌換過的人</strong>——
                權益和點數已經發出去了。沒有刪除，只有停用。
            </p>
            <button type="button" class="dd-admin__btn" @click="startCreate">新增優惠碼</button>
        </div>

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-promo__notice" role="status">✓ {{ notice }}</p>

        <!-- #region [P] 新增／修改的表單 -->
        <form v-if="editing !== null" class="dd-promo__form" @submit.prevent="submit">
            <h3>{{ isNew ? '新增優惠碼' : `修改 ${editing}` }}</h3>

            <fieldset class="dd-promo__field">
                <span>優惠碼</span>
                <input v-if="isNew" v-model="form.code" type="text" placeholder="留空＝自動產生 10 碼" autocomplete="off" />
                <template v-else>
                    <strong class="dd-promo__code">{{ editing }}</strong>
                    <button type="button" class="dd-admin__btn is-ghost" @click="copyCode(editing!)">複製</button>
                    <span class="dd-promo__muted">建好之後不能改碼</span>
                </template>
            </fieldset>

            <fieldset class="dd-promo__gives">
                <legend>兌換得到什麼？（至少一種）</legend>

                <label class="dd-promo__check">
                    <input v-model="form.givesPlan" type="checkbox" /><span>方案時間</span>
                </label>
                <div v-if="form.givesPlan" class="dd-promo__sub">
                    <label class="dd-promo__field">
                        <span>方案</span>
                        <select v-model="form.planTier">
                            <option value="lite">Lite</option>
                            <option value="pro">Pro</option>
                        </select>
                    </label>
                    <label class="dd-promo__field">
                        <span>月數</span>
                        <input v-model.number="form.months" type="number" min="0" :max="MAX_MONTHS" />
                    </label>
                    <label class="dd-promo__field">
                        <span>天數</span>
                        <input v-model.number="form.days" type="number" min="0" :max="MAX_DAYS" />
                    </label>
                    <span class="dd-promo__muted">月數和天數會相加，兩個不能都是 0</span>
                </div>

                <label class="dd-promo__check">
                    <input v-model="form.givesTokens" type="checkbox" /><span>額度點數</span>
                </label>
                <div v-if="form.givesTokens" class="dd-promo__sub">
                    <label class="dd-promo__field">
                        <span>點數</span>
                        <input v-model.number="form.tokens" type="number" min="1" :max="MAX_TOKENS" />
                    </label>
                    <span class="dd-promo__muted">兌換當下直接加進額度，補償用得到</span>
                </div>
            </fieldset>

            <fieldset class="dd-promo__field">
                <legend>兌換人數</legend>
                <label class="dd-promo__check"><input v-model="form.unlimitedSeats" type="checkbox" /><span>不限</span></label>
                <input v-if="!form.unlimitedSeats" v-model.number="form.seats" type="number" min="1" aria-label="最多幾人可兌換" />
            </fieldset>

            <fieldset class="dd-promo__field">
                <legend>可兌換期限</legend>
                <label class="dd-promo__check"><input v-model="form.unlimitedExpiry" type="checkbox" /><span>不限</span></label>
                <input v-if="!form.unlimitedExpiry" v-model="form.expiresAt" type="datetime-local" aria-label="到期時間" />
            </fieldset>

            <label class="dd-promo__field">
                <span>備註</span>
                <input v-model="form.note" type="text" class="is-wide" placeholder="會顯示在使用者的權益清單上，例如「開發者社群活動」" />
            </label>

            <p v-if="formError" class="dd-admin__error">{{ formError }}</p>

            <div class="dd-promo__actions">
                <button type="submit" class="dd-admin__btn" :disabled="!!formError || busy">{{ isNew ? '建立' : '儲存變更' }}</button>
                <button v-if="!isNew" type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="toggleActive">
                    {{ form.active ? '停用這組碼' : '重新啟用' }}
                </button>
                <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="editing = null">關閉</button>
            </div>
        </form>
        <!-- #endregion -->

        <!-- #region [P] 誰兌換過 -->
        <div v-if="editing && redemptions.length" class="dd-promo__scroll">
            <h3 class="dd-promo__sub-title">兌換過的人（{{ redemptions.length }}）</h3>
            <table class="dd-table">
                <thead>
                    <tr>
                        <th scope="col">裝置</th>
                        <th scope="col">名稱</th>
                        <th scope="col" class="is-num">點數</th>
                        <th scope="col">權益</th>
                        <th scope="col">時間</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in redemptions" :key="`${row.device_id}-${row.created_at}`">
                        <td>#{{ row.device_id }}</td>
                        <td>{{ row.device_name }}</td>
                        <td class="is-num">{{ row.tokens ? formatInt(row.tokens) : '—' }}</td>
                        <td>{{ row.perk_id ? `#${row.perk_id}` : '—' }}</td>
                        <td>{{ formatDateTime(row.created_at) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p v-else-if="editing && !isNew" class="dd-promo__muted">還沒有人兌換這組碼。</p>
        <!-- #endregion -->

        <div class="dd-promo__scroll">
            <h3 class="dd-promo__sub-title">所有優惠碼（{{ codes.length }}）</h3>
            <table class="dd-table">
                <thead>
                    <tr>
                        <th scope="col">優惠碼</th>
                        <th scope="col">兌換得到</th>
                        <th scope="col">已兌換 / 名額</th>
                        <th scope="col">期限</th>
                        <th scope="col">狀態</th>
                        <th scope="col">備註</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="promo in codes"
                        :key="promo.code"
                        :class="{ 'is-selected': promo.code === editing }"
                        tabindex="0"
                        @click="open(promo)"
                        @keydown.enter="open(promo)"
                    >
                        <td><strong class="dd-promo__code">{{ promo.code }}</strong></td>
                        <td>{{ rewardText(promo) }}</td>
                        <td>{{ seatsText(promo) }}</td>
                        <td>{{ promo.expires_at ? formatDateTime(promo.expires_at) : '不限' }}</td>
                        <td><span class="dd-status" :class="stateOf(promo).kind">{{ stateOf(promo).label }}</span></td>
                        <td>{{ promo.note || '—' }}</td>
                    </tr>
                    <tr v-if="!loading && !codes.length">
                        <td colspan="6" class="dd-table__empty">還沒有任何優惠碼</td>
                    </tr>
                </tbody>
            </table>
            <p v-if="loading" class="dd-promo__muted">載入中…</p>
        </div>
    </section>
</template>

<style lang="scss">
    .dd-promo {
        @include setFlex(flex-start, stretch, 16px, column);

        &__bar {
            @include setFlex(space-between, center, 12px);
            flex-wrap: wrap;
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
        &__code {
            font-family: var(--vp-font-family-mono);
            letter-spacing: .05em;
        }

        &__form {
            @include setFlex(flex-start, stretch, 14px, column);
            padding: 16px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 12px;

            h3 {
                margin: 0;
                font-size: var(--font-size-m);
            }
        }
        &__gives {
            @include setFlex(flex-start, stretch, 8px, column);
            background: var(--vp-c-bg-soft);
            padding: 12px 14px;
            border: 0;
            border-radius: 10px;
            margin: 0;
        }
        &__sub {
            @include setFlex(flex-start, center, 8px 16px);
            flex-wrap: wrap;
            padding-left: 26px;
            padding-bottom: 4px;
        }
        &__sub-title {
            margin: 0 0 8px;
            font-size: var(--font-size-m);
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
                margin-right: 10px;
                color: var(--vp-c-text-2);
            }
            > span { color: var(--vp-c-text-2); }
        }
        &__check {
            @include setFlex(flex-start, center, 6px);
            font-size: var(--font-size-s);
            cursor: pointer;
        }
        &__actions {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
        }
        &__scroll { overflow-x: auto; }

        input[type=number], input[type=text], input[type=datetime-local], select {
            background: var(--vp-c-bg-soft);
            width: 150px;
            padding: 4px 10px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);

            &.is-wide { width: min(420px, 100%); }
        }
        input[type=checkbox] { cursor: pointer; }
    }
</style>
