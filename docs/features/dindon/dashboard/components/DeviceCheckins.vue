<script setup lang="ts">
    import type { DeviceCheckins } from '../schemas/admin.schema';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import { addDays, buildCalendar, CHECKIN_SOURCE_LABELS, daysBetween, lastOpened, rangeError } from '../checkins';
    import { formatDateTime } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 裝置詳情的「打開 App」：App 0.6.7 起每天第一次打開就是當天的打卡（台灣時間，溝通板 #0067）。
    // 看最近 12 週哪幾天有開、連續幾天，也能手動給或收回（例如使用者回報「我那天有開，但沒記到」）。
    // 給的會算進獎勵、收回不會收回已經達成的鐵人，所以兩個都要先確認。
    const { deviceId } = defineProps<{ deviceId: number }>();
    const emit = defineEmits<{ changed: [] }>();
    const call = useAdminCall();

    const data = ref<DeviceCheckins | null>(null);
    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    const notice = ref('');

    const WEEKS = 12;
    const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

    const today = computed(() => data.value?.state.today ?? '');
    const calendar = computed(() => (data.value ? buildCalendar(today.value, data.value.checkins, WEEKS) : []));
    const last = computed(() => (data.value ? lastOpened(today.value, data.value.checkins) : null));
    const receivedAt = computed(() => data.value?.checkins[0]?.receivedAt ?? null);
    /** 每一欄上面標月份：那一週有某月 1 號，或是第一欄 */
    const monthLabels = computed(() => calendar.value.map((week, index) => {
        const first = week.find(cell => cell.day.endsWith('-01'));
        const day = first?.day ?? (index === 0 ? week[0].day : '');
        return day ? `${Number(day.slice(5, 7))}月` : '';
    }));

    function lastText() {
        if (!last.value) return '從來沒有';
        const { day, daysAgo } = last.value;
        if (daysAgo === 0) return `今天（${day}）`;
        if (daysAgo === 1) return `昨天（${day}）`;
        return `${daysAgo} 天前（${day}）`;
    }

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            data.value = await call(token => adminApi.deviceCheckins(token, deviceId));
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    // #region [P] 給／收回
    const from = ref('');
    const to = ref('');
    const confirming = ref<'grant' | 'revoke' | null>(null);
    const formError = computed(() => (data.value ? rangeError(from.value, to.value, today.value) : ''));
    const span = computed(() => (formError.value ? 0 : daysBetween(from.value, to.value) + 1));
    const rangeText = computed(() => (from.value === to.value ? from.value : `${from.value}～${to.value}`));

    /** 點月曆上的一格：第一次點當開始、第二次點當結束（點到比開始早的就換成新的開始） */
    function pick(day: string) {
        confirming.value = null;
        if (!from.value || from.value !== to.value || day < from.value) {
            from.value = day;
            to.value = day;
            return;
        }
        to.value = day;
    }

    async function change(kind: 'grant' | 'revoke') {
        if (confirming.value !== kind) {
            confirming.value = kind;
            return;
        }
        confirming.value = null;
        busy.value = true;
        error.value = '';
        notice.value = '';
        const body = { from: from.value, to: to.value };
        try {
            const result = await call(token => (kind === 'grant' ? adminApi.grantCheckins(token, deviceId, body) : adminApi.revokeCheckins(token, deviceId, body)));
            data.value = result;
            const { added, upgraded, removed } = result.changed;
            notice.value = kind === 'grant'
                ? `給了 ${added} 天${upgraded ? `，另外 ${upgraded} 天從「匯入」改成「後台給的」` : ''}${added + upgraded < span.value ? '；其他幾天本來就有' : ''}`
                : `收回 ${removed} 天${removed < span.value ? '；其他幾天本來就沒有' : ''}`;
            emit('changed');
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }
    // #endregion

    onMounted(() => {
        void load().then(() => {
            // 預設選昨天：最常見的是「昨天有開但沒記到」
            if (data.value && !from.value) from.value = to.value = addDays(today.value, -1);
        });
    });
</script>

<template>
    <section class="dd-detail__card dd-checkins" aria-labelledby="dd-checkins-title">
        <h3 id="dd-checkins-title">打開 App</h3>
        <p v-if="loading && !data" class="dd-detail__muted">載入中…</p>
        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>

        <template v-if="data">
            <dl class="dd-detail__info">
                <div><dt>最近一次</dt><dd>{{ lastText() }}</dd></div>
                <div><dt>今天</dt><dd>{{ data.state.checkedInToday ? '有開' : '還沒開' }}</dd></div>
                <div><dt>連續</dt><dd>{{ data.state.streak }} 天（最長 {{ data.state.bestStreak }}）</dd></div>
                <div><dt>總共</dt><dd>{{ data.state.totalDays }} 天</dd></div>
                <div><dt>活動的連續</dt><dd>{{ data.state.eventStreak }} 天{{ data.state.iron ? '・鐵人' : '' }}</dd></div>
                <div><dt>補送額度</dt><dd>這 30 天剩 {{ data.state.offlineLeft }} / {{ data.state.offlineQuota }} 天</dd></div>
            </dl>
            <p v-if="receivedAt" class="dd-detail__muted">最近一筆後端收到的時間：{{ formatDateTime(receivedAt) }}</p>
            <p v-if="!data.state.imported" class="dd-checkins__hint">
                這台還沒匯入手機上的舊紀錄，多半還在用 0.6.6 以前的 App：那之前只有活動期間的打卡，沒開活動的日子不會出現在這裡。
            </p>

            <!-- #region [P] 月曆：一欄一週、週一在上；點一格選開始、再點一格選結束 -->
            <div class="dd-checkins__calendar" role="group" aria-label="最近 12 週打開 App 的日子">
                <div class="dd-checkins__weekdays" aria-hidden="true">
                    <span />
                    <span v-for="name in WEEKDAYS" :key="name">{{ name }}</span>
                </div>
                <div v-for="(week, index) in calendar" :key="week[0].day" class="dd-checkins__week">
                    <span class="month" aria-hidden="true">{{ monthLabels[index] }}</span>
                    <button
                        v-for="cell in week"
                        :key="cell.day"
                        type="button"
                        class="dd-checkins__cell"
                        :class="[
                            cell.source ? `is-${cell.source}` : '',
                            { 'is-today': cell.isToday, 'is-picked': !cell.isFuture && cell.day >= from && cell.day <= to },
                        ]"
                        :disabled="cell.isFuture"
                        :title="`${cell.day}：${cell.source ? CHECKIN_SOURCE_LABELS[cell.source] ?? cell.source : '沒開'}`"
                        :aria-label="`${cell.day}，${cell.source ? CHECKIN_SOURCE_LABELS[cell.source] ?? cell.source : '沒開'}`"
                        @click="pick(cell.day)"
                    />
                </div>
            </div>
            <ul class="dd-checkins__legend">
                <li v-for="(label, source) in CHECKIN_SOURCE_LABELS" :key="source"><span class="dd-checkins__cell" :class="`is-${source}`" />{{ label }}</li>
                <li><span class="dd-checkins__cell" />沒開</li>
            </ul>
            <!-- #endregion -->

            <!-- #region [P] 手動給／收回 -->
            <fieldset class="dd-detail__field">
                <legend>手動修正</legend>
                <input v-model="from" type="date" :max="today" aria-label="開始日期" @change="confirming = null" />
                <span>到</span>
                <input v-model="to" type="date" :max="today" aria-label="結束日期" @change="confirming = null" />
            </fieldset>
            <p v-if="formError" class="dd-admin__error">{{ formError }}</p>
            <div class="dd-detail__actions">
                <button
                    type="button"
                    class="dd-admin__btn"
                    :disabled="busy || !!formError"
                    @click="change('grant')"
                >
                    {{ confirming === 'grant' ? `確定給 ${rangeText}（${span} 天）` : '給打卡' }}
                </button>
                <button
                    type="button"
                    class="dd-admin__btn"
                    :class="confirming === 'revoke' ? 'dd-admin__btn--danger' : 'dd-admin__btn--ghost'"
                    :disabled="busy || !!formError"
                    @click="change('revoke')"
                >
                    {{ confirming === 'revoke' ? `確定收回 ${rangeText}（${span} 天）` : '收回打卡' }}
                </button>
                <button v-if="confirming" type="button" class="dd-admin__btn dd-admin__btn--ghost" @click="confirming = null">取消</button>
            </div>
            <p class="dd-detail__muted">
                給的打卡記成「後台給的」，<strong>算進獎勵</strong>（鐵人）；收回不管來源，但已經達成的鐵人不會跟著收回（要改上面的鐵人達成日）。
                本來就有的日子不會被改。
            </p>
            <p v-if="notice" class="dd-detail__notice" role="status">✓ {{ notice }}</p>
            <!-- #endregion -->
        </template>
    </section>
</template>

<style lang="scss">
    .dd-checkins {
        --dd-cell: 14px;
        --dd-cell-gap: 3px;

        &__hint {
            background: var(--vp-c-warning-soft);
            padding: 6px 10px;
            border-radius: 8px;
            font-size: var(--font-size-s);
        }

        // #region [P] 月曆
        &__calendar {
            display: flex;
            gap: var(--dd-cell-gap);
            padding-bottom: 4px;
            overflow-x: auto;
        }
        &__weekdays,
        &__week {
            flex-shrink: 0;
            display: grid;
            grid-template-rows: 16px repeat(7, var(--dd-cell));
            gap: var(--dd-cell-gap);
        }
        &__weekdays span {
            color: var(--vp-c-text-3);
            font-size: 10px;
            line-height: var(--dd-cell);
        }
        &__week .month {
            color: var(--vp-c-text-2);
            font-size: 10px;
            line-height: 16px;
            white-space: nowrap;
        }
        &__cell {
            flex-shrink: 0;
            display: inline-block;
            background: var(--vp-c-default-soft);
            width: var(--dd-cell);
            height: var(--dd-cell);
            padding: 0;
            border: 1px solid transparent;
            border-radius: 3px;
            cursor: pointer;

            // 來源：當天連線最實、補送淡一點、後台給的用品牌色、匯入的只是灰（不算獎勵）
            &.is-online { background: var(--vp-c-green-1); }
            &.is-offline { background: var(--vp-c-green-3); }
            &.is-admin { background: var(--vp-c-brand-1); }
            &.is-imported { background: var(--vp-c-gray-1); }
            &.is-today { border-color: var(--vp-c-text-1); }
            &.is-picked { box-shadow: 0 0 0 2px var(--vp-c-warning-1); }
            &:disabled {
                background: transparent;
                cursor: default;
            }
            &:focus-visible {
                outline: 2px solid var(--vp-c-brand-1);
                outline-offset: 1px;
            }
        }
        &__legend {
            @include setFlex(flex-start, center, 6px 14px);
            flex-wrap: wrap;
            padding: 0;
            margin: 0;
            color: var(--vp-c-text-2);
            font-size: 12px;
            list-style: none;

            li { @include setFlex(flex-start, center, 6px); }
            .dd-checkins__cell { cursor: default; }
        }

        // #endregion
    }
</style>
