<script setup lang="ts">
    import type { Dist, UsageReport } from '../api';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import { FEATURE_LABELS, FEATURE_ORDER, formatDateTime, formatInt, formatMs, formatPercent, formatUsd } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 報表格式與怎麼讀：DinDon_BackEnd/docs/usage-analytics.md 第 4 節
    const call = useAdminCall();
    const days = ref(30);
    const report = ref<UsageReport | null>(null);
    const loading = ref(false);
    const error = ref('');

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            report.value = await call(token => adminApi.usage(token, days.value));
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    // 功能固定照「分類 → 照片 → 語音」排，不跟著數字大小換位置
    const features = computed(() => [...(report.value?.features ?? [])]
        .sort((a, b) => FEATURE_ORDER.indexOf(a.feature) - FEATURE_ORDER.indexOf(b.feature)));

    const tiles = computed(() => {
        const r = report.value;
        if (!r) return [];
        const sum = (pick: (f: UsageReport['features'][number]) => number) => features.value.reduce((acc, f) => acc + pick(f), 0);
        return [
            { label: 'AI 請求', value: formatInt(sum(f => f.requests)), hint: `成功 ${formatInt(sum(f => f.ok))}` },
            { label: '活躍裝置', value: formatInt(r.devices.active_devices), hint: '期間內至少用過一次 AI' },
            { label: 'Gemini 成本', value: formatUsd(sum(f => f.total_cost_usd)), hint: '依後端價目表估算' },
            { label: 'Beta 免扣點', value: formatInt(sum(f => f.quota_waived)), hint: '原本會扣的請求數' },
            { label: '撞到付費牆', value: formatInt(r.devices.devices_hit_quota), hint: '台裝置' },
            { label: '撞到每日上限', value: formatInt(r.devices.devices_hit_daily_limit), hint: '台裝置' }
        ];
    });

    const distRows = computed(() => {
        const d = report.value?.devices;
        if (!d) return [];
        return [
            { label: '每台請求數', dist: d.requests_per_device, fmt: formatInt },
            { label: '每台額度點數', dist: d.quota_charged_per_device, fmt: formatInt },
            { label: '每台成本', dist: d.cost_usd_per_device, fmt: formatUsd }
        ] satisfies { label: string, dist: Dist, fmt: (v: number) => string }[];
    });

    onMounted(load);
</script>

<template>
    <section class="dd-usage">
        <div class="dd-usage__toolbar">
            <label>
                期間
                <select v-model.number="days" @change="load">
                    <option :value="7">近 7 天</option>
                    <option :value="30">近 30 天</option>
                    <option :value="90">近 90 天</option>
                    <option :value="365">近 1 年</option>
                </select>
            </label>
            <button type="button" class="dd-admin__btn is-ghost" :disabled="loading" @click="load">重新整理</button>
            <span v-if="report" class="dd-usage__range">{{ formatDateTime(report.from) }} ～ {{ formatDateTime(report.to) }}</span>
            <span v-if="loading" class="dd-usage__range">載入中…</span>
        </div>
        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>

        <template v-if="report">
            <ul class="dd-usage__tiles">
                <li v-for="tile in tiles" :key="tile.label">
                    <p class="label">{{ tile.label }}</p>
                    <p class="value">{{ tile.value }}</p>
                    <p class="hint">{{ tile.hint }}</p>
                </li>
            </ul>

            <h2 class="dd-usage__title">各功能</h2>
            <p class="dd-usage__desc">「每點額度值」三個功能應該差不多；哪個明顯偏高，代表它的點數訂便宜了。延遲與成本看 P95，不看平均。</p>
            <div class="dd-usage__scroll">
                <table class="dd-table is-static">
                    <thead>
                        <tr>
                            <th scope="col">功能</th>
                            <th scope="col" class="is-num">請求</th>
                            <th scope="col" class="is-num">成功</th>
                            <th scope="col" class="is-num">拒絕</th>
                            <th scope="col" class="is-num">失敗</th>
                            <th scope="col" class="is-num">付費牆</th>
                            <th scope="col" class="is-num">每日上限</th>
                            <th scope="col" class="is-num">裝置</th>
                            <th scope="col" class="is-num">加問率</th>
                            <th scope="col" class="is-num">延遲 P50／P95</th>
                            <th scope="col" class="is-num">每次成本 P95</th>
                            <th scope="col" class="is-num">每點額度值</th>
                            <th scope="col" class="is-num">總成本</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="f in features" :key="f.feature">
                            <th scope="row">{{ FEATURE_LABELS[f.feature] ?? f.feature }}</th>
                            <td class="is-num">{{ formatInt(f.requests) }}</td>
                            <td class="is-num">{{ formatInt(f.ok) }}</td>
                            <td class="is-num">{{ formatInt(f.rejected) }}</td>
                            <td class="is-num">{{ formatInt(f.failed) }}</td>
                            <td class="is-num">{{ formatInt(f.quota_exceeded) }}</td>
                            <td class="is-num">{{ formatInt(f.daily_limited) }}</td>
                            <td class="is-num">{{ formatInt(f.unique_devices) }}</td>
                            <td class="is-num">{{ formatPercent(f.hedge_rate) }}</td>
                            <td class="is-num">{{ formatMs(f.latency_ms.p50) }}／{{ formatMs(f.latency_ms.p95) }}</td>
                            <td class="is-num">{{ formatUsd(f.cost_usd_per_request.p95) }}</td>
                            <td class="is-num is-key">{{ formatUsd(f.cost_usd_per_quota_point) }}</td>
                            <td class="is-num">{{ formatUsd(f.total_cost_usd) }}</td>
                        </tr>
                        <tr v-if="!features.length">
                            <td colspan="13" class="dd-table__empty">這段期間沒有 AI 請求</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h2 class="dd-usage__title">每台裝置的用量分布</h2>
            <p class="dd-usage__desc">免費額度看「每台額度點數」的 P50；訂閱價看「每台成本」的 P95（重度使用者）。</p>
            <div class="dd-usage__scroll">
                <table class="dd-table is-static">
                    <thead>
                        <tr>
                            <th scope="col"></th>
                            <th scope="col" class="is-num">平均</th>
                            <th scope="col" class="is-num">P50</th>
                            <th scope="col" class="is-num">P90</th>
                            <th scope="col" class="is-num">P95</th>
                            <th scope="col" class="is-num">最大</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in distRows" :key="row.label">
                            <th scope="row">{{ row.label }}</th>
                            <td class="is-num">{{ row.fmt(row.dist.avg) }}</td>
                            <td class="is-num">{{ row.fmt(row.dist.p50) }}</td>
                            <td class="is-num">{{ row.fmt(row.dist.p90) }}</td>
                            <td class="is-num is-key">{{ row.fmt(row.dist.p95) }}</td>
                            <td class="is-num">{{ row.fmt(row.dist.max) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h2 class="dd-usage__title">模型</h2>
            <div class="dd-usage__scroll">
                <table class="dd-table is-static">
                    <thead>
                        <tr>
                            <th scope="col">模型</th>
                            <th scope="col" class="is-num">呼叫</th>
                            <th scope="col" class="is-num">成功</th>
                            <th scope="col" class="is-num">錯誤</th>
                            <th scope="col" class="is-num">被取消</th>
                            <th scope="col" class="is-num">輸入 token</th>
                            <th scope="col" class="is-num">輸出 token</th>
                            <th scope="col" class="is-num">成本</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="m in report.models" :key="m.model">
                            <th scope="row">
                                {{ m.model }}
                                <span v-if="!m.price_known" class="dd-usage__warn">⚠ 價目表沒有這個模型，成本算成 0</span>
                            </th>
                            <td class="is-num">{{ formatInt(m.calls) }}</td>
                            <td class="is-num">{{ formatInt(m.ok) }}</td>
                            <td class="is-num">{{ formatInt(m.errors) }}</td>
                            <td class="is-num">{{ formatInt(m.canceled) }}</td>
                            <td class="is-num">{{ formatInt(m.prompt_tokens) }}</td>
                            <td class="is-num">{{ formatInt(m.output_tokens + m.thoughts_tokens) }}</td>
                            <td class="is-num">{{ formatUsd(m.cost_usd) }}</td>
                        </tr>
                        <tr v-if="!report.models.length">
                            <td colspan="8" class="dd-table__empty">這段期間沒有呼叫 Gemini</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ul v-if="report.notes?.length" class="dd-usage__notes">
                <li v-for="note in report.notes" :key="note">{{ note }}</li>
            </ul>
        </template>
    </section>
</template>

<style lang="scss">
    .dd-usage {
        &__toolbar {
            @include setFlex(flex-start, center, 12px);
            flex-wrap: wrap;
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
        &__range { color: var(--vp-c-text-2); }

        // 數字卡片：標題、數字、說明都用文字色，不用系列色
        &__tiles {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
            gap: 12px;
            padding: 0;
            margin: 20px 0 8px;
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
                line-height: 1.4;
            }
            .hint {
                color: var(--vp-c-text-3);
                font-size: var(--font-size-xs);
            }
        }
        &__title {
            margin-top: 32px !important;
            font-size: var(--font-size-l);
        }
        &__desc {
            margin: 4px 0 12px !important;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
        &__scroll { overflow-x: auto; }
        &__warn {
            display: block;
            color: var(--vp-c-warning-1);
            font-size: var(--font-size-xs);
            font-weight: 400;
        }
        &__notes {
            padding-left: 18px;
            margin-top: 24px;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }

        // 報表表格不能點，拿掉列表那套游標與 hover
        .dd-table.is-static {
            tbody tr {
                cursor: default;

                &:hover { background: transparent !important; }
            }
            tbody th { font-weight: 600; }
            .is-key { font-weight: 700; }
        }
    }
</style>
