<script setup lang="ts">
    import type { BarRow, BarSeries } from '../charts/BarChart.vue';
    import type { ColumnPoint } from '../charts/ColumnChart.vue';
    import type { DashboardTab, PanelPreset } from '../navigation';
    import type { ActiveDevices, AdminDevice, UsageReport } from '../schemas/admin.schema';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi, ALL_DEVICES_MAX_PAGES, ALL_DEVICES_PER_PAGE } from '../api';
    import BarChart from '../charts/BarChart.vue';
    import ColumnChart from '../charts/ColumnChart.vue';
    import { addDays } from '../checkins';
    import { FEATURE_LABELS, FEATURE_ORDER, formatInt, formatUsd } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import { PULSE_USAGE_DAYS, usePulse } from '../usePulse';
    import AdminActions from './AdminActions.vue';

    // 總覽上每個數字都點得進去：跳到能看細節的那一頁，需要的話先套好篩選
    const emit = defineEmits<{ navigate: [tab: DashboardTab, preset?: PanelPreset] }>();

    // 後台的第一頁：打開就看得到「有多少人、在不在用、有沒有出問題、花了多少錢」。
    // 裝置的數字來自裝置列表（全部抓回來在瀏覽器算），AI 的數字來自用量報表；兩者都跟著上方的期間走。
    const call = useAdminCall();
    const days = ref(30);
    const devices = ref<AdminDevice[]>([]);
    const deviceTotal = ref(0);
    const report = ref<UsageReport | null>(null);
    /** 近 1／7／30 天有打開 App 的裝置數（#0081）；後端的數，不含測試與凍結的 */
    const active = ref<ActiveDevices | null>(null);
    const loading = ref(false);
    const error = ref('');

    // 裝置最多抓 2,000 台（api.ts 的 listAllDevices）；超過就只統計最新的那些並註明
    const MAX_DEVICES = ALL_DEVICES_MAX_PAGES * ALL_DEVICES_PER_PAGE;

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            // 「近幾天有開 App」是附加的數字：抓失敗只讓那兩格顯示「—」，不拖垮整個總覽
            void call(token => adminApi.activeDevices(token)).then(result => (active.value = result), () => (active.value = null));
            const [deviceResult, usage] = await call(async token => Promise.all([adminApi.listAllDevices(token), adminApi.usage(token, days.value)]));
            // 測試裝置（#0074）不算：後端的用量報表也不算它們
            const tests = deviceResult.devices.filter(device => device.isTest).length;
            devices.value = deviceResult.devices.filter(device => !device.isTest);
            deviceTotal.value = deviceResult.total - tests;
            report.value = usage;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    // #region [P] 日期工具：一律用台灣的日期，和後端的 beta_tester_since 同一個時區
    const taipeiDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' });
    const dayKey = (date: Date) => taipeiDate.format(date); // YYYY-MM-DD
    const weekday = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', weekday: 'short' });
    const DAY_MS = 86_400_000;
    // #endregion

    // #region [P] 需要處理：打開後台第一眼要看到的。數字跟側欄共用（usePulse），點了就跳到那個分頁
    const pulse = usePulse();
    type Tone = 'attention' | 'done' | 'info';
    interface Todo { key: string; label: string; value: string; hint: string; tone: Tone; to: DashboardTab; preset?: PanelPreset }

    const countTone = (count: number | null): Tone => (count === null ? 'info' : count > 0 ? 'attention' : 'done');
    const countText = (count: number | null) => (count === null ? '—' : formatInt(count));

    const todos = computed<Todo[]>(() => {
        const pending = pulse.pendingReports.value;
        const merge = pulse.toMerge.value;
        const flagged = pulse.flaggedDevices.value;
        const leading = pulse.leadingFeature.value;
        const voting = pulse.voting.value;
        return [
            { key: 'pending', label: '待審回報', value: countText(pending), hint: pending ? '還沒判的 bug 與建議' : '都審完了', tone: countTone(pending), to: 'feedback', preset: { feedbackStatus: 'pending' } },
            { key: 'merge', label: '待合併', value: countText(merge), hint: merge ? '採計了、還沒歸到問題' : '都歸好了', tone: countTone(merge), to: 'feedback' },
            {
                key: 'flagged',
                label: '用量提示',
                value: countText(flagged?.length ?? null),
                hint: flagged?.length ? flagged.slice(0, 2).map(row => row.name).join('、') + (flagged.length > 2 ? ' 等' : '') : `近 ${PULSE_USAGE_DAYS} 天沒有`,
                tone: countTone(flagged?.length ?? null),
                to: 'watch'
            },
            { key: 'today', label: '今天用 AI', value: countText(pulse.activeToday.value), hint: '台裝置', tone: 'info', to: 'watch' },
            {
                key: 'vote',
                label: '投票領先',
                value: leading ? `${formatInt(leading.votes)} 票` : '—',
                hint: leading ? leading.title : voting ? '沒有投票中的候選' : '',
                tone: 'info',
                to: 'features'
            }
        ];
    });
    // #endregion

    // #region [P] 數字卡片
    const activeCount = (windowDays: number) => {
        const found = active.value?.windows.find(w => w.days === windowDays);
        return found ? formatInt(found.devices) : '—';
    };
    /** 最後一次打開是 N 天前或更早（含從沒打開過），跟後端的 idle_days 同一個算法；凍結的不算 */
    const idleCount = (idle: number) => {
        const cutoff = addDays(taipeiDate.format(new Date()), -idle);
        return devices.value.filter(d => !d.frozen && (!d.lastCheckinDay || d.lastCheckinDay <= cutoff)).length;
    };
    const tiles = computed<{ label: string; value: string; hint: string; to: DashboardTab; preset?: PanelPreset }[]>(() => {
        const now = Date.now();
        const list = devices.value;
        const since = now - days.value * DAY_MS;
        const features = report.value?.features ?? [];
        return [
            { label: '裝置總數', value: formatInt(deviceTotal.value), hint: `期間新增 ${formatInt(list.filter(d => new Date(d.createdAt).getTime() >= since).length)} 台`, to: 'devices' },
            // 有沒有在用看打卡（每天第一次打開 App 就打卡），只記帳不用 AI 的人也算得到（#0081）
            { label: '近 7 天有開 App', value: activeCount(7), hint: `今天 ${activeCount(1)} 台・近 30 天 ${activeCount(30)} 台`, to: 'devices', preset: { deviceSort: 'last_checkin' } },
            { label: '7 天以上沒開', value: formatInt(idleCount(7)), hint: '含從沒打開過的，點了看名單', to: 'devices', preset: { deviceIdleDays: 7, deviceStatus: 'active' } },
            { label: '近 7 天用過 AI', value: formatInt(list.filter(d => d.lastAiAt && now - new Date(d.lastAiAt).getTime() <= 7 * DAY_MS).length), hint: '台裝置', to: 'watch' },
            { label: 'AI 請求', value: formatInt(features.reduce((sum, f) => sum + f.requests, 0)), hint: `近 ${days.value} 天`, to: 'usage' },
            { label: 'Gemini 成本', value: formatUsd(features.reduce((sum, f) => sum + f.totalCostUsd, 0)), hint: `近 ${days.value} 天，依價目表估算`, to: 'usage' },
            // 裝置頁沒有「有綁 Google」的篩選，只能跳到列表
            { label: '綁定 Google', value: formatInt(list.filter(d => d.linked).length), hint: '台裝置', to: 'devices' },
            { label: '已凍結', value: formatInt(list.filter(d => d.frozen).length), hint: '台裝置', to: 'devices', preset: { deviceStatus: 'frozen' } }
        ];
    });
    // #endregion

    /** 期間內的每一天（台灣時間，舊到新），交給 build 決定那天的數值 */
    function eachDay(build: (key: string) => Record<string, number>): ColumnPoint[] {
        const points: ColumnPoint[] = [];
        for (let i = days.value - 1; i >= 0; i--) {
            const date = new Date(Date.now() - i * DAY_MS);
            const key = dayKey(date);
            const [, month, day] = key.split('-');
            points.push({
                label: `${Number(month)}/${Number(day)}`,
                full: `${key.replace(/-/g, '/')}（${weekday.format(date)}）`,
                values: build(key)
            });
        }
        return points;
    }

    // #region [P] 每日新裝置（直條，時間序列）
    const newDevicePoints = computed<ColumnPoint[]>(() => {
        const counts = new Map<string, number>();
        for (const d of devices.value) {
            const key = dayKey(new Date(d.createdAt));
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return eachDay(key => ({ count: counts.get(key) ?? 0 }));
    });
    const newDeviceSeries: BarSeries[] = [{ key: 'count', label: '新裝置', color: 'var(--dd-series-1)' }];
    // #endregion

    // #region [P] 每日 AI 請求（堆疊直條）。後端 2026-09-20 起才有 daily，舊的回應就不畫這張
    const hasDaily = computed(() => Array.isArray(report.value?.daily));
    const dailyPoints = computed<ColumnPoint[]>(() => {
        const byDate = new Map((report.value?.daily ?? []).map(d => [d.date, d]));
        // 沒有請求的日子後端不會回，這裡補 0，趨勢才看得出空檔
        return eachDay((key) => {
            const day = byDate.get(key);
            return { ok: day?.ok ?? 0, rejected: day?.rejected ?? 0, failed: day?.failed ?? 0 };
        });
    });
    // #endregion

    // #region [P] 裝置最近一次用 AI（橫條，有順序的分組）
    const recencyRows = computed<BarRow[]>(() => {
        const today = dayKey(new Date());
        const now = Date.now();
        const buckets = { today: 0, week: 0, month: 0, older: 0, never: 0 };
        for (const d of devices.value) {
            if (!d.lastAiAt) {
                buckets.never++;
            } else if (dayKey(new Date(d.lastAiAt)) === today) {
                buckets.today++;
            } else {
                const age = now - new Date(d.lastAiAt).getTime();
                if (age <= 7 * DAY_MS) buckets.week++;
                else if (age <= 30 * DAY_MS) buckets.month++;
                else buckets.older++;
            }
        }
        return [
            { label: '今天', values: { count: buckets.today } },
            { label: '7 天內', values: { count: buckets.week } },
            { label: '30 天內', values: { count: buckets.month } },
            { label: '更早', values: { count: buckets.older } },
            { label: '從沒用過', values: { count: buckets.never } }
        ];
    });
    const singleSeries: BarSeries[] = [{ key: 'count', label: '裝置數', color: 'var(--dd-series-1)' }];
    // #endregion

    // #region [P] 各功能的請求結果（堆疊橫條：成功／被拒／失敗或被擋）
    // 三色是參考色票的前三格（藍、湖水綠、橙），淺色與深色都用驗證腳本跑過 CVD 與色差
    const outcomeSeries: BarSeries[] = [
        { key: 'ok', label: '成功', color: 'var(--dd-series-1)' },
        { key: 'rejected', label: '被拒（不是記帳內容）', color: 'var(--dd-series-2)' },
        { key: 'failed', label: '失敗或被擋', color: 'var(--dd-series-3)' }
    ];
    const sortedFeatures = computed(() => [...(report.value?.features ?? [])]
        .sort((a, b) => FEATURE_ORDER.indexOf(a.feature) - FEATURE_ORDER.indexOf(b.feature)));
    const outcomeRows = computed<BarRow[]>(() => sortedFeatures.value.map(f => ({
        label: FEATURE_LABELS[f.feature] ?? f.feature,
        values: { ok: f.ok, rejected: f.rejected, failed: f.failed + f.quotaExceeded + f.dailyLimited }
    })));
    const costRows = computed<BarRow[]>(() => sortedFeatures.value.map(f => ({
        label: FEATURE_LABELS[f.feature] ?? f.feature,
        values: { cost: f.totalCostUsd }
    })));
    const costSeries: BarSeries[] = [{ key: 'cost', label: 'Gemini 成本', color: 'var(--dd-series-1)' }];
    // #endregion

    onMounted(load);
</script>

<template>
    <section class="dd-overview" :class="{ 'is-loading': loading }">
        <!-- #region [P] 需要處理 -->
        <ul class="dd-overview__todos" aria-label="需要處理">
            <li v-for="todo in todos" :key="todo.key">
                <button type="button" class="dd-overview__todo" :class="`dd-overview__todo--${todo.tone}`" @click="emit('navigate', todo.to, todo.preset)">
                    <span class="label">{{ todo.label }}</span>
                    <span class="value">{{ todo.value }}</span>
                    <span class="hint">{{ todo.hint }}</span>
                </button>
            </li>
        </ul>
        <p v-for="message in pulse.errors.value" :key="message" class="dd-admin__error" role="alert">待辦數字有一項抓不到：{{ message }}</p>
        <!-- #endregion -->

        <!-- 篩選列：一排、放在所有圖表上面，底下每張圖都跟著它 -->
        <div class="dd-overview__filters">
            <label>
                期間
                <select v-model.number="days" @change="load">
                    <option :value="7">近 7 天</option>
                    <option :value="30">近 30 天</option>
                    <option :value="90">近 90 天</option>
                </select>
            </label>
            <AdminActions>
                <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="loading" @click="load">重新整理</button>
            </AdminActions>
            <span v-if="loading" class="dd-overview__muted t-shimmer" data-text="載入中…">載入中…</span>
        </div>
        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="devices.length < deviceTotal" class="dd-overview__muted">裝置超過 {{ formatInt(MAX_DEVICES) }} 台，裝置相關的圖表只統計最新的 {{ formatInt(devices.length) }} 台。</p>

        <template v-if="report">
            <ul class="dd-overview__tiles">
                <li v-for="tile in tiles" :key="tile.label">
                    <button type="button" @click="emit('navigate', tile.to, tile.preset)">
                        <span class="label">{{ tile.label }}</span>
                        <span class="value">{{ tile.value }}</span>
                        <span class="hint">{{ tile.hint }}</span>
                    </button>
                </li>
            </ul>

            <div class="dd-overview__grid">
                <article v-if="hasDaily" class="dd-overview__card dd-overview__card--wide">
                    <h3>每日 AI 請求<button type="button" class="more" @click="emit('navigate', 'usage')">詳細 →</button></h3>
                    <p class="sub">近 {{ days }} 天。橙色是沒做成的（Gemini 出錯、額度不足、撞到每日上限）</p>
                    <ColumnChart :points="dailyPoints" :series="outcomeSeries" unit=" 次" />
                    <details>
                        <summary>看數字</summary>
                        <table class="dd-table dd-table--static">
                            <thead>
                                <tr>
                                    <th scope="col">日期</th>
                                    <th v-for="s in outcomeSeries" :key="s.key" scope="col" class="num">{{ s.label }}</th>
                                    <th scope="col" class="num">用過的裝置</th>
                                    <th scope="col" class="num">成本</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="day in (report.daily ?? [])" :key="day.date">
                                    <td>{{ day.date }}</td>
                                    <td class="num">{{ formatInt(day.ok) }}</td>
                                    <td class="num">{{ formatInt(day.rejected) }}</td>
                                    <td class="num">{{ formatInt(day.failed) }}</td>
                                    <td class="num">{{ formatInt(day.uniqueDevices) }}</td>
                                    <td class="num">{{ formatUsd(day.costUsd) }}</td>
                                </tr>
                                <tr v-if="!(report.daily ?? []).length">
                                    <td colspan="6" class="dd-table__empty">這段期間沒有 AI 請求</td>
                                </tr>
                            </tbody>
                        </table>
                    </details>
                </article>

                <article class="dd-overview__card">
                    <h3>每日新裝置<button type="button" class="more" @click="emit('navigate', 'devices')">詳細 →</button></h3>
                    <p class="sub">第一次用到 AI 功能時才會建立裝置，所以這是「開始用 AI 的新裝置」</p>
                    <ColumnChart :points="newDevicePoints" :series="newDeviceSeries" unit=" 台" />
                    <details>
                        <summary>看數字</summary>
                        <table class="dd-table dd-table--static">
                            <thead><tr><th scope="col">日期</th><th scope="col" class="num">新裝置</th></tr></thead>
                            <tbody>
                                <tr v-for="p in newDevicePoints" :key="p.full"><td>{{ p.full }}</td><td class="num">{{ formatInt(p.values.count) }}</td></tr>
                            </tbody>
                        </table>
                    </details>
                </article>

                <article class="dd-overview__card">
                    <h3>裝置最近一次用 AI<button type="button" class="more" @click="emit('navigate', 'watch')">詳細 →</button></h3>
                    <p class="sub">還在用的人有多少。算的是最近一次 AI 請求（失敗的也算）；「從沒用過」是領了 key 之後一次請求都沒有</p>
                    <BarChart :rows="recencyRows" :series="singleSeries" unit=" 台" />
                    <details>
                        <summary>看數字</summary>
                        <table class="dd-table dd-table--static">
                            <tbody>
                                <tr v-for="r in recencyRows" :key="r.label"><th scope="row">{{ r.label }}</th><td class="num">{{ formatInt(r.values.count) }} 台</td></tr>
                            </tbody>
                        </table>
                    </details>
                </article>

                <article class="dd-overview__card">
                    <h3>各功能的請求結果<button type="button" class="more" @click="emit('navigate', 'usage')">詳細 →</button></h3>
                    <p class="sub">近 {{ days }} 天。橙色多代表 Gemini 出錯，或撞到額度、每日上限</p>
                    <BarChart v-if="outcomeRows.length" :rows="outcomeRows" :series="outcomeSeries" unit=" 次" />
                    <p v-else class="dd-overview__muted">這段期間沒有 AI 請求</p>
                    <details>
                        <summary>看數字</summary>
                        <table class="dd-table dd-table--static">
                            <thead>
                                <tr>
                                    <th scope="col">功能</th>
                                    <th v-for="s in outcomeSeries" :key="s.key" scope="col" class="num">{{ s.label }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in outcomeRows" :key="r.label">
                                    <th scope="row">{{ r.label }}</th>
                                    <td v-for="s in outcomeSeries" :key="s.key" class="num">{{ formatInt(r.values[s.key]) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </details>
                </article>

                <article class="dd-overview__card">
                    <h3>錢花在哪個功能<button type="button" class="more" @click="emit('navigate', 'usage')">詳細 →</button></h3>
                    <p class="sub">近 {{ days }} 天的 Gemini 成本，依後端價目表估算</p>
                    <BarChart v-if="costRows.length" :rows="costRows" :series="costSeries" :format="formatUsd" />
                    <p v-else class="dd-overview__muted">這段期間沒有 AI 請求</p>
                    <details>
                        <summary>看數字</summary>
                        <table class="dd-table dd-table--static">
                            <tbody>
                                <tr v-for="r in costRows" :key="r.label"><th scope="row">{{ r.label }}</th><td class="num">{{ formatUsd(r.values.cost) }}</td></tr>
                            </tbody>
                        </table>
                    </details>
                </article>
            </div>
        </template>
    </section>
</template>

<style lang="scss">
    // 圖表的顏色定義在 .dd-admin（DashboardApp.vue），兩個分頁共用
    .dd-overview {
        transition: opacity .2s;

        // 重新載入時保留上一次的畫面、淡一點，不閃、不跳版
        &.is-loading { opacity: .55; }

        &__filters {
            @include setFlex(flex-start, center, 12px);
            flex-wrap: wrap;
            margin-bottom: 16px;
            font-size: var(--font-size-s);

            select {
                background: var(--vp-c-bg-soft);
                padding: 6px 12px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                margin-left: 6px;
                color: var(--vp-c-text-1);
            }
        }
        &__muted {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }

        // #region [P] 需要處理：有待辦的用醒目色、處理完的打勾、純資訊的中性
        &__todos {
            display: grid;

            // auto-fit：寬的時候五張撐滿一排；手機一排兩張，不要五張疊成一長條
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
            padding: 0;
            margin: 0 0 24px;
            list-style: none;
        }
        &__todo {
            @include setFlex(flex-start, flex-start, 2px, column);
            position: relative;
            background: var(--vp-c-bg-soft);
            width: 100%;
            height: 100%;
            padding: 14px 16px 14px 20px;
            border: 1px solid transparent;
            border-radius: 12px;
            color: var(--vp-c-text-1);
            text-align: left;
            cursor: pointer;
            transition: border-color .15s, transform .15s;

            // 左邊一條色帶當狀態：不靠顏色也有文字（「都審完了」）
            &::before {
                content: '';
                position: absolute;
                top: 12px;
                bottom: 12px;
                left: 8px;
                background: var(--vp-c-divider);
                width: 4px;
                border-radius: 2px;
            }
            &:hover {
                border-color: var(--vp-c-divider);
                transform: translateY(-1px);
            }
            &:focus-visible {
                outline: 2px solid var(--vp-c-brand-1);
                outline-offset: 2px;
            }
            .label {
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
            }
            .value {
                font-size: var(--font-size-xl);
                font-weight: 800;
                font-variant-numeric: normal;
                line-height: 1.3;
            }
            .hint {
                max-width: 100%;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-xs);
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }

            // 待辦用黃不用紅：是該去處理，不是出事了（紅色留給錯誤訊息）
            &--attention {
                background: var(--vp-c-warning-soft);

                &::before { background: var(--vp-c-warning-1); }
            }
            &--done::before { background: var(--vp-c-green-1); }
            &--info::before { background: var(--vp-c-text-3); }
        }

        // #endregion

        // 數字卡片：大數字用比例字寬，不用等寬（等寬數字放大後會鬆散）
        &__tiles {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
            padding: 0;
            margin: 0 0 20px;
            list-style: none;

            // 卡片外框：點得進去的是按鈕（跳分頁或套篩選），純數字的是 .tile（回報頁的「參與人數」）
            button, .tile {
                @include setFlex(flex-start, flex-start, 0, column);
                background: transparent;
                width: 100%;
                height: 100%;
                padding: 16px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 12px;
                color: var(--vp-c-text-1);
                text-align: left;
                transition: border-color .15s, background .15s;
            }
            button {
                cursor: pointer;

                &.is-active { border-color: var(--vp-c-brand-1); }
                &:hover {
                    background: var(--vp-c-bg-soft);
                    border-color: var(--vp-c-brand-1);
                }
                &:focus-visible {
                    outline: 2px solid var(--vp-c-brand-1);
                    outline-offset: 2px;
                }
            }
            .label {
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
            }
            .value {
                font-size: var(--font-size-xl);
                font-weight: 700;
                font-variant-numeric: normal;
                line-height: 1.4;
            }
            .hint {
                color: var(--vp-c-text-3);
                font-size: var(--font-size-xs);
            }
        }
        &__grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
            @include setRWD(900px) { grid-template-columns: minmax(0, 1fr); }
        }
        &__card {
            @include setFlex(flex-start, stretch, 12px, column);
            background: var(--vp-c-bg);
            padding: 20px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 12px;

            &--wide { grid-column: 1 / -1; }
            h3 {
                @include setFlex(space-between, baseline, 12px);
                font-size: var(--font-size-m);
            }
            .more {
                flex-shrink: 0;
                background: transparent;
                padding: 0;
                border: 0;
                color: var(--vp-c-brand-1);
                font-size: var(--font-size-s);
                font-weight: 600;
                cursor: pointer;

                &:hover { text-decoration: underline; }
            }
            .sub {
                margin-top: -8px !important;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-xs);
            }
            details {
                font-size: var(--font-size-s);

                summary {
                    color: var(--vp-c-text-2);
                    cursor: pointer;
                }
                table { margin-top: 8px; }
            }
        }
    }

    // 提示框：數值在前、粗體；系列名稱在後、次要；用短色條當鍵，不用方塊
    .dd-chart-tip {
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        display: flex;
        flex-direction: column;
        gap: 2px;
        align-items: flex-start;
        background: var(--vp-c-bg);
        padding: 6px 10px;
        border: 1px solid var(--vp-c-divider);
        border-radius: 8px;
        box-shadow: 0 4px 14px rgb(0 0 0 / 12%);
        color: var(--vp-c-text-2);
        font-size: var(--font-size-xs);
        white-space: nowrap;
        pointer-events: none;
        transform: translateX(-50%);
        z-index: 5;

        strong {
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
        }

        // 一次列出那一天每個系列：日期在最上面，接著每列是「數值 + 系列名稱」
        .when {
            padding-bottom: 2px;
            border-bottom: 1px solid var(--vp-c-divider);
            margin-bottom: 2px;
        }
        .row {
            @include setFlex(flex-start, baseline, 8px);

            strong { min-width: 3em; }
        }
        .key {
            @include setFlex(flex-start, center, 6px);

            i {
                display: inline-block;
                width: 12px;
                height: 3px;
                border-radius: 2px;
            }
        }

        // 橫條的提示框放在那一列的上方靠左
        &--bar {
            left: 0;
            transform: none;
        }
    }
</style>
