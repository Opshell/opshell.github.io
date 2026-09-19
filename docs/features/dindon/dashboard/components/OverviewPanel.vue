<script setup lang="ts">
    import type { AdminDevice, UsageReport } from '../api';
    import type { BarRow, BarSeries } from '../charts/BarChart.vue';
    import type { ColumnPoint } from '../charts/ColumnChart.vue';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import BarChart from '../charts/BarChart.vue';
    import ColumnChart from '../charts/ColumnChart.vue';
    import { FEATURE_LABELS, FEATURE_ORDER, formatInt, formatUsd } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 後台的第一頁：打開就看得到「有多少人、在不在用、有沒有出問題、花了多少錢」。
    // 裝置的數字來自裝置列表（全部抓回來在瀏覽器算），AI 的數字來自用量報表；兩者都跟著上方的期間走。
    const call = useAdminCall();
    const days = ref(30);
    const devices = ref<AdminDevice[]>([]);
    const deviceTotal = ref(0);
    const report = ref<UsageReport | null>(null);
    const loading = ref(false);
    const error = ref('');

    // 裝置列表一頁最多 100 台。beta 限額 100 人加上測試裝置，20 頁（2,000 台）綽綽有餘；超過就只統計前 2,000 台並註明
    const PER_PAGE = 100;
    const MAX_PAGES = 20;

    async function loadDevices(token: string) {
        const all: AdminDevice[] = [];
        let total = 0;
        for (let page = 1; page <= MAX_PAGES; page++) {
            const result = await adminApi.listDevices(token, { page, perPage: PER_PAGE });
            all.push(...result.devices);
            total = result.total;
            if (all.length >= total || result.devices.length === 0) break;
        }
        return { all, total };
    }

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            const [deviceResult, usage] = await call(token => Promise.all([loadDevices(token), adminApi.usage(token, days.value)]));
            devices.value = deviceResult.all;
            deviceTotal.value = deviceResult.total;
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

    // #region [P] 數字卡片
    const tiles = computed(() => {
        const now = Date.now();
        const list = devices.value;
        const since = now - days.value * DAY_MS;
        const features = report.value?.features ?? [];
        return [
            { label: '裝置總數', value: formatInt(deviceTotal.value), hint: `期間新增 ${formatInt(list.filter(d => new Date(d.created_at).getTime() >= since).length)} 台` },
            { label: '近 7 天用過 AI', value: formatInt(list.filter(d => d.last_ai_at && now - new Date(d.last_ai_at).getTime() <= 7 * DAY_MS).length), hint: '台裝置' },
            { label: 'AI 請求', value: formatInt(features.reduce((sum, f) => sum + f.requests, 0)), hint: `近 ${days.value} 天` },
            { label: 'Gemini 成本', value: formatUsd(features.reduce((sum, f) => sum + f.total_cost_usd, 0)), hint: `近 ${days.value} 天，依價目表估算` },
            { label: '綁定 Google', value: formatInt(list.filter(d => d.linked).length), hint: '台裝置' },
            { label: '已凍結', value: formatInt(list.filter(d => d.frozen).length), hint: '台裝置' }
        ];
    });
    // #endregion

    // #region [P] 每日新裝置（直條，時間序列）
    const newDevicePoints = computed<ColumnPoint[]>(() => {
        const counts = new Map<string, number>();
        for (const d of devices.value) {
            const key = dayKey(new Date(d.created_at));
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        const points: ColumnPoint[] = [];
        for (let i = days.value - 1; i >= 0; i--) {
            const date = new Date(Date.now() - i * DAY_MS);
            const key = dayKey(date);
            const [, month, day] = key.split('-');
            points.push({ label: `${Number(month)}/${Number(day)}`, full: `${key.replace(/-/g, '/')}（${weekday.format(date)}）`, value: counts.get(key) ?? 0 });
        }
        return points;
    });
    // #endregion

    // #region [P] 裝置最近一次用 AI（橫條，有順序的分組）
    const recencyRows = computed<BarRow[]>(() => {
        const today = dayKey(new Date());
        const now = Date.now();
        const buckets = { today: 0, week: 0, month: 0, older: 0, never: 0 };
        for (const d of devices.value) {
            if (!d.last_ai_at) buckets.never++;
            else if (dayKey(new Date(d.last_ai_at)) === today) buckets.today++;
            else {
                const age = now - new Date(d.last_ai_at).getTime();
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
        values: { ok: f.ok, rejected: f.rejected, failed: f.failed + f.quota_exceeded + f.daily_limited }
    })));
    const costRows = computed<BarRow[]>(() => sortedFeatures.value.map(f => ({
        label: FEATURE_LABELS[f.feature] ?? f.feature,
        values: { cost: f.total_cost_usd }
    })));
    const costSeries: BarSeries[] = [{ key: 'cost', label: 'Gemini 成本', color: 'var(--dd-series-1)' }];
    // #endregion

    onMounted(load);
</script>

<template>
    <section class="dd-overview" :class="{ 'is-loading': loading }">
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
            <button type="button" class="dd-admin__btn is-ghost" :disabled="loading" @click="load">重新整理</button>
            <span v-if="loading" class="dd-overview__muted">載入中…</span>
        </div>
        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="devices.length < deviceTotal" class="dd-overview__muted">裝置超過 {{ formatInt(MAX_PAGES * PER_PAGE) }} 台，裝置相關的圖表只統計最新的 {{ formatInt(devices.length) }} 台。</p>

        <template v-if="report">
            <ul class="dd-overview__tiles">
                <li v-for="tile in tiles" :key="tile.label">
                    <p class="label">{{ tile.label }}</p>
                    <p class="value">{{ tile.value }}</p>
                    <p class="hint">{{ tile.hint }}</p>
                </li>
            </ul>

            <div class="dd-overview__grid">
                <article class="dd-overview__card is-wide">
                    <h3>每日新裝置</h3>
                    <p class="sub">第一次用到 AI 功能時才會建立裝置，所以這是「開始用 AI 的新裝置」</p>
                    <ColumnChart :points="newDevicePoints" unit=" 台" />
                    <details>
                        <summary>看數字</summary>
                        <table class="dd-table is-static">
                            <thead><tr><th scope="col">日期</th><th scope="col" class="is-num">新裝置</th></tr></thead>
                            <tbody>
                                <tr v-for="p in newDevicePoints" :key="p.full"><td>{{ p.full }}</td><td class="is-num">{{ formatInt(p.value) }}</td></tr>
                            </tbody>
                        </table>
                    </details>
                </article>

                <article class="dd-overview__card">
                    <h3>裝置最近一次用 AI</h3>
                    <p class="sub">還在用的人有多少。算的是最近一次 AI 請求（失敗的也算）；「從沒用過」是領了 key 之後一次請求都沒有</p>
                    <BarChart :rows="recencyRows" :series="singleSeries" unit=" 台" />
                    <details>
                        <summary>看數字</summary>
                        <table class="dd-table is-static">
                            <tbody>
                                <tr v-for="r in recencyRows" :key="r.label"><th scope="row">{{ r.label }}</th><td class="is-num">{{ formatInt(r.values.count) }} 台</td></tr>
                            </tbody>
                        </table>
                    </details>
                </article>

                <article class="dd-overview__card">
                    <h3>各功能的請求結果</h3>
                    <p class="sub">近 {{ days }} 天。橙色多代表 Gemini 出錯，或撞到額度、每日上限</p>
                    <BarChart v-if="outcomeRows.length" :rows="outcomeRows" :series="outcomeSeries" unit=" 次" />
                    <p v-else class="dd-overview__muted">這段期間沒有 AI 請求</p>
                    <details>
                        <summary>看數字</summary>
                        <table class="dd-table is-static">
                            <thead>
                                <tr>
                                    <th scope="col">功能</th>
                                    <th v-for="s in outcomeSeries" :key="s.key" scope="col" class="is-num">{{ s.label }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in outcomeRows" :key="r.label">
                                    <th scope="row">{{ r.label }}</th>
                                    <td v-for="s in outcomeSeries" :key="s.key" class="is-num">{{ formatInt(r.values[s.key]) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </details>
                </article>

                <article class="dd-overview__card">
                    <h3>錢花在哪個功能</h3>
                    <p class="sub">近 {{ days }} 天的 Gemini 成本，依後端價目表估算</p>
                    <BarChart v-if="costRows.length" :rows="costRows" :series="costSeries" :format="formatUsd" />
                    <p v-else class="dd-overview__muted">這段期間沒有 AI 請求</p>
                    <details>
                        <summary>看數字</summary>
                        <table class="dd-table is-static">
                            <tbody>
                                <tr v-for="r in costRows" :key="r.label"><th scope="row">{{ r.label }}</th><td class="is-num">{{ formatUsd(r.values.cost) }}</td></tr>
                            </tbody>
                        </table>
                    </details>
                </article>
            </div>
        </template>
    </section>
</template>

<style lang="scss">
    // 圖表的顏色：參考色票（dataviz palette.md）的前三格，深色模式用同色相、為深底調過的那一階。
    // 已用 validate_palette.js 驗證：淺色對 #ffffff、深色對 #1b1b1f，CVD 與正常視覺的色差都過門檻。
    // 淺色的湖水綠對白底只有 2.82:1，所以每張圖都有圖例或數字標籤，加上「看數字」表格。
    .dd-overview {
        --dd-series-1: #2a78d6;
        --dd-series-2: #1baf7a;
        --dd-series-3: #eb6834;
        --dd-chart-ink: var(--vp-c-text-1);
        --dd-chart-ink-2: var(--vp-c-text-2);
        --dd-chart-muted: #898781;
        --dd-chart-grid: #e1e0d9;
        --dd-chart-axis: #c3c2b7;
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

        // 數字卡片：大數字用比例字寬，不用等寬（等寬數字放大後會鬆散）
        &__tiles {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
            padding: 0;
            margin: 0 0 20px;
            list-style: none;

            li {
                padding: 16px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 12px;
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

            &.is-wide { grid-column: 1 / -1; }
            h3 { font-size: var(--font-size-m); }
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
        box-shadow: 0 4px 14px rgb(0, 0, 0, 12%);
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
        &.is-bar {
            left: 0;
            transform: none;
        }
    }

    .dark .dd-overview {
        --dd-series-1: #3987e5;
        --dd-series-2: #199e70;
        --dd-series-3: #d95926;
        --dd-chart-grid: #2c2c2a;
        --dd-chart-axis: #383835;
    }
</style>
