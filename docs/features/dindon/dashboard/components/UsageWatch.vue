<script setup lang="ts">
    import type { DeviceUsage, UsageFlag } from '../api';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import { FEATURE_LABELS, formatInt, formatRelative, formatUsd } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 誰在大量使用（api.md 第 8 節，舊板溝通板 #47）。
    //
    // 使用者決定 beta 不加新的限制（要真實流量），改成「看得見、隨時停得掉」：
    // 這一頁就是「看得見」，每一列的停用鈕就是「停得掉」。
    // 後端給的 flags 是**提示不是判決**，每一種都有正當的解釋——畫面上的語氣要跟著這樣寫，
    // 不寫「濫用者」，也不自動做任何事。
    const call = useAdminCall();

    const FLAG_INFO: Record<UsageFlag, { label: string, why: string, fair: string, loud?: boolean }> = {
        heavy_today: { label: '今天用很多', why: '今天 80 次以上', fair: '可能在補一整個月的帳' },
        burst: { label: '一小時內很密集', why: '單一小時 40 次以上', fair: '可能一次拍了一疊收據' },
        new_and_heavy: { label: '剛註冊就用很多', why: '註冊 24 小時內超過 50 次', fair: '可能拿到新手機在試功能' },
        // 後端說這個最值得看：一直被判定「不是單據」，通常是有人拿 AI 入口當通用助理
        many_rejected: { label: '常被判定不是單據', why: '10 次以上、三成以上不是單據', fair: '也可能拍了一疊模糊的收據', loud: true }
    };

    const days = ref(7);
    const onlyFlagged = ref(false);
    const rows = ref<DeviceUsage[]>([]);
    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    const notice = ref('');
    /** 正在確認要停用／解凍哪一台 */
    const confirming = ref<number | null>(null);

    const flagged = computed(() => rows.value.filter(r => r.flags?.length));
    const shown = computed(() => (onlyFlagged.value ? flagged.value : rows.value));
    const totalCost = computed(() => rows.value.reduce((sum, r) => sum + r.cost_usd, 0));

    const rejectedRatio = (r: DeviceUsage) => (r.requests ? r.rejected / r.requests : 0);
    const featureText = (r: DeviceUsage) =>
        Object.entries(r.by_feature ?? {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${FEATURE_LABELS[k] ?? k} ${formatInt(v)}`).join('、');

    async function load() {
        loading.value = true;
        error.value = '';
        confirming.value = null;
        try {
            rows.value = (await call(token => adminApi.usageByDevice(token, days.value))).devices ?? [];
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    /** 停用＝那台之後所有請求回 403（App 的 AI 功能整個不能用）；解凍就恢復。兩個都留操作紀錄 */
    async function setFrozen(row: DeviceUsage, frozen: boolean) {
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const result = await call(token => adminApi.updateDevice(token, row.device_id, { frozen }));
            row.frozen = result.device.frozen;
            row.frozen_at = result.device.frozen_at;
            notice.value = frozen
                ? `已停用 #${row.device_id}（${row.name}）。他的 App 現在不能用 AI，隨時可以解凍`
                : `已解凍 #${row.device_id}（${row.name}）`;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
            confirming.value = null;
        }
    }

    onMounted(load);
</script>

<template>
    <section class="dd-watch">
        <p class="dd-watch__lead">
            逐台看 AI 用量，次數多的在前。下面的<strong>提示不是判決</strong>，也不會擋任何請求——
            每一種都有正當的解釋，停用之前先看看他在做什麼。
        </p>

        <div class="dd-watch__toolbar">
            <label>
                期間
                <select v-model.number="days" :disabled="loading" @change="load">
                    <option :value="1">今天</option>
                    <option :value="7">近 7 天</option>
                    <option :value="30">近 30 天</option>
                </select>
            </label>
            <label class="dd-watch__check">
                <input v-model="onlyFlagged" type="checkbox" />
                只看有提示的（{{ flagged.length }}）
            </label>
            <button type="button" class="dd-admin__btn is-ghost" :disabled="loading" @click="load">重新整理</button>
            <span class="dd-watch__muted">{{ rows.length }} 台有用量 · 估計成本 {{ formatUsd(totalCost) }}</span>
        </div>

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-watch__notice" role="status">✓ {{ notice }}</p>

        <details class="dd-watch__legend">
            <summary>提示是什麼意思？</summary>
            <dl>
                <div v-for="(info, flag) in FLAG_INFO" :key="flag">
                    <dt><span class="dd-watch__flag" :class="{ 'is-loud': info.loud }">{{ info.label }}</span></dt>
                    <dd>{{ info.why }}。{{ info.fair }}。</dd>
                </div>
            </dl>
        </details>

        <div class="dd-watch__scroll">
            <table class="dd-table">
                <thead>
                    <tr>
                        <th scope="col">裝置</th>
                        <th scope="col" class="is-num">次數</th>
                        <th scope="col" class="is-num">今天</th>
                        <th scope="col">最密集的一小時</th>
                        <th scope="col" class="is-num">不是單據</th>
                        <th scope="col" class="is-num">估計成本</th>
                        <th scope="col">提示</th>
                        <th scope="col">處理</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in shown" :key="row.device_id" :class="{ 'is-flagged': row.flags?.length }">
                        <td>
                            <strong>{{ row.name }}</strong>
                            <span class="dd-watch__muted"> #{{ row.device_id }}</span>
                            <span v-if="row.frozen" class="dd-status is-frozen">❄ 已停用</span>
                            <p class="dd-watch__sub">
                                註冊 {{ formatRelative(row.device_created_at) }} · {{ row.active_days }} 天有用 · {{ featureText(row) }}
                            </p>
                        </td>
                        <td class="is-num">{{ formatInt(row.requests) }}</td>
                        <td class="is-num">{{ formatInt(row.today) }}</td>
                        <td>{{ row.peak_hour ? `${formatInt(row.peak_hour)} 次 · ${row.peak_hour_at?.slice(5) ?? ''}` : '—' }}</td>
                        <td class="is-num">
                            {{ formatInt(row.rejected) }}
                            <span v-if="row.rejected" class="dd-watch__muted">（{{ Math.round(rejectedRatio(row) * 100) }}%）</span>
                        </td>
                        <td class="is-num">{{ formatUsd(row.cost_usd) }}</td>
                        <td>
                            <!-- v-for 產生的標籤之間沒有空白，不會自己換行；用 flex-wrap 讓它們在欄內排成兩行 -->
                            <div class="dd-watch__flags">
                                <span
                                    v-for="flag in row.flags ?? []"
                                    :key="flag"
                                    class="dd-watch__flag"
                                    :class="{ 'is-loud': FLAG_INFO[flag]?.loud }"
                                    :title="FLAG_INFO[flag] ? `${FLAG_INFO[flag].why}。${FLAG_INFO[flag].fair}` : flag"
                                >
                                    {{ FLAG_INFO[flag]?.label ?? flag }}
                                </span>
                            </div>
                        </td>
                        <td class="dd-watch__action">
                            <template v-if="confirming === row.device_id">
                                <p class="dd-watch__confirm">
                                    {{ row.frozen ? `解凍 #${row.device_id}？` : `停用 #${row.device_id}？他的 App 會整個不能用 AI。` }}
                                </p>
                                <button type="button" class="dd-admin__btn" :class="{ 'is-danger': !row.frozen }" :disabled="busy" @click="setFrozen(row, !row.frozen)">
                                    確定{{ row.frozen ? '解凍' : '停用' }}
                                </button>
                                <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="confirming = null">取消</button>
                            </template>
                            <button v-else type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="confirming = row.device_id">
                                {{ row.frozen ? '解凍…' : '停用…' }}
                            </button>
                        </td>
                    </tr>
                    <tr v-if="!loading && !shown.length">
                        <td colspan="8" class="dd-table__empty">{{ onlyFlagged ? '這段期間沒有任何提示' : '這段期間沒有人用 AI' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p class="dd-watch__muted">次數只算真的打了 Gemini 的；成本是用價目表估的，不是 Google 的實際帳單。beta 期間點數沒有真的扣。</p>
    </section>
</template>

<style lang="scss">
    .dd-watch {
        @include setFlex(flex-start, stretch, 14px, column);

        &__lead {
            margin: 0;
            font-size: var(--font-size-s);
        }
        &__toolbar {
            @include setFlex(flex-start, center, 10px 14px);
            flex-wrap: wrap;
            font-size: var(--font-size-s);

            select {
                background: var(--vp-c-bg-soft);
                padding: 4px 10px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                margin-left: 6px;
                color: var(--vp-c-text-1);
            }
        }
        &__check {
            @include setFlex(flex-start, center, 6px);
            cursor: pointer;
        }
        &__muted {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-xs);
        }
        &__sub {
            margin: 2px 0 0;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-xs);
        }
        &__notice {
            background: var(--vp-c-green-soft);
            padding: 6px 12px;
            border-radius: 8px;
            margin: 0;
            font-size: var(--font-size-s);
        }
        &__legend {
            font-size: var(--font-size-s);

            summary { cursor: pointer; }
            dl {
                display: grid;
                gap: 6px;
                margin: 8px 0 0;
            }
            div {
                @include setFlex(flex-start, baseline, 10px);
                flex-wrap: wrap;
            }
            dd {
                margin: 0;
                color: var(--vp-c-text-2);
            }
        }

        // 提示用中性的黃，不用紅：它不是判決；只有「常被判定不是單據」加重
        &__flag {
            display: inline-block;
            background: var(--vp-c-warning-soft);
            padding: 1px 8px;
            border-radius: 999px;
            font-size: var(--font-size-xs);
            white-space: nowrap;
            cursor: help;

            &.is-loud {
                background: var(--vp-c-danger-soft);
                font-weight: 700;
            }
        }

        // 三個標籤排一行會把表撐寬、疊到右邊的按鈕上；讓它們在欄內換行
        &__flags {
            @include setFlex(flex-start, center, 4px);
            flex-wrap: wrap;
            min-width: 140px;
            max-width: 230px;
        }
        &__action {
            min-width: 120px;
            white-space: nowrap;

            .dd-admin__btn { margin: 2px 4px 2px 0; }
        }
        &__confirm {
            max-width: 220px;
            margin: 0 0 6px;
            font-size: var(--font-size-xs);
        }
        &__scroll { overflow-x: auto; }

        tr.is-flagged td:first-child { box-shadow: inset 3px 0 0 var(--vp-c-warning-1); }
    }
</style>
