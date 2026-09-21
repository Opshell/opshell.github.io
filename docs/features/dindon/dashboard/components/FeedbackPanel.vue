<script setup lang="ts">
    import type { FeedbackFilter, FeedbackIssue, FeedbackKind, FeedbackReport, FeedbackStats, FeedbackStatus } from '../api';
    import type { BarSeries } from '../charts/BarChart.vue';
    import type { ColumnPoint } from '../charts/ColumnChart.vue';
    import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { adminApi } from '../api';
    import ColumnChart from '../charts/ColumnChart.vue';
    import FeedbackTriage from './FeedbackTriage.vue';
    import MergePicker from './MergePicker.vue';
    import { formatDateTime, formatInt, formatRelative, KIND_LABELS } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // beta 貢獻活動的回報審核（api.md 第 8 節）。
    // 計分規則在後端：同一個問題裡最早的那則採計回報拿全額權重、之後不同的人拿一半；
    // 同一台裝置在同一個問題裡只有最早那則算（之後的 0 分、也不算件數，但還是可以採計掛上去）；沒掛問題的採計回報算 1 分。
    // 所以這裡三件事都要做得順：判採不採計、把講同一件事的回報合併成一個「問題」，
    // 以及垃圾回報多的時候一次審很多則（溝通板 #0053）。
    const call = useAdminCall();

    const STATUS_LABELS: Record<FeedbackStatus, string> = {
        pending: '待審',
        accepted_bug: '採計為 bug',
        accepted_suggestion: '採計為建議',
        rejected: '不採計'
    };
    const STATUSES = Object.keys(STATUS_LABELS) as FeedbackStatus[];

    const status = ref<FeedbackFilter>('pending');
    // 類型篩選（溝通板 #41）。crash 是 App 當掉後自動產生的，跟手寫的回報意義差很多
    const kind = ref<FeedbackKind>('all');
    const reports = ref<FeedbackReport[]>([]);
    const total = ref(0);
    const stats = ref<FeedbackStats | null>(null);
    const issues = ref<FeedbackIssue[]>([]);
    const selectedId = ref<number | null>(null);
    const detail = ref<FeedbackReport | null>(null);
    const shots = ref<{ position: number, url: string }[]>([]);
    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    const notice = ref('');

    /** 快速審核：一次一則、用鍵盤判，判完自動跳下一則 */
    const triage = ref(false);
    function closeTriage(changed: boolean) {
        triage.value = false;
        if (changed) load(1); // 審過的狀態變了，列表與統計要重抓
    }

    const PER_PAGE = 50;
    const page = ref(1);
    const pageCount = computed(() => Math.max(Math.ceil(total.value / PER_PAGE), 1));

    // #region [P] 批次審核（api.md 第 8 節 batch，溝通板 #0053）：垃圾回報一則一則審太慢
    /** 勾選的回報 id。整個 Set 換掉而不是就地改，讓 computed 一定會重算；重抓列表就清掉，免得勾到看不見的 */
    const checked = ref<Set<number>>(new Set());
    const batchStatus = ref<FeedbackStatus>('rejected');
    const allOnPageChecked = computed(() => reports.value.length > 0 && reports.value.every(r => checked.value.has(r.id)));
    function setChecked(ids: number[], on: boolean) {
        const next = new Set(checked.value);
        for (const id of ids) {
            if (on) next.add(id);
            else next.delete(id);
        }
        checked.value = next;
    }
    /** 正在確認的動作。凍結刻意跟批次分開按：後端也沒把它包進 batch，因為那是更重的動作 */
    const confirming = ref<'checked' | 'freeze' | null>(null);
    /** 正在確認「這台的待審全部不採計」的裝置 id（列表的群組列與單則側欄都會用） */
    const confirmingDevice = ref<number | null>(null);

    async function batch(body: { report_ids: number[] } | { device_id: number }, status: FeedbackStatus, label: string) {
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const { updated } = await call(token => adminApi.batchReviewFeedback(token, { ...body, status }));
            notice.value = updated ? `${label}：${formatInt(updated)} 則改成「${STATUS_LABELS[status]}」` : `${label}：沒有要改的`;
            await load(); // 狀態變了，列表、統計、問題的件數都要重抓
            if (selectedId.value !== null && detail.value) { // 正在看的那一則可能也在裡面；截圖不會變，不用重抓
                detail.value = (await call(token => adminApi.getFeedback(token, selectedId.value!))).report;
            }
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
            confirming.value = null;
            confirmingDevice.value = null;
        }
    }
    const reviewChecked = () => batch({ report_ids: [...checked.value] }, batchStatus.value, '勾選的回報');
    const rejectDevice = (deviceId: number, name: string) => batch({ device_id: deviceId }, 'rejected', `${name} 的待審`);

    /** 凍結是另一件事：這裡只是讓「看到垃圾回報」到「停掉那台」不用換分頁。解凍到裝置頁 */
    async function freezeDevice(deviceId: number) {
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            await call(token => adminApi.updateDevice(token, deviceId, { frozen: true }));
            notice.value = `已凍結裝置 #${deviceId}，要解凍到「裝置」分頁`;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
            confirming.value = null;
        }
    }
    // #endregion

    // #region [P] 同一台裝置的回報摺起來（純前端，只看這一頁的 50 則；相似度後端沒提供，只依 device_id）
    interface iGroup {
        deviceId: number
        name: string
        reports: FeedbackReport[]
        pending: number
    }
    const grouped = ref(true);
    /** 展開的裝置 id；重抓列表就收起來 */
    const expanded = ref<Set<number>>(new Set());
    const groups = computed<iGroup[]>(() => {
        const map = new Map<number, iGroup>();
        for (const report of reports.value) {
            let group = map.get(report.device_id);
            if (!group) {
                group = { deviceId: report.device_id, name: report.device_name || `#${report.device_id}`, reports: [], pending: 0 };
                map.set(report.device_id, group);
            }
            group.reports.push(report);
            if (report.status === 'pending') group.pending++;
        }
        return [...map.values()]; // Map 保留插入順序：第一次出現的裝置在前，跟後端「新的在前」一致
    });
    /** 只有一則的不摺：摺了反而多一次點擊 */
    const isFolded = (group: iGroup) => group.reports.length > 1 && !expanded.value.has(group.deviceId);
    function toggleExpanded(deviceId: number) {
        const next = new Set(expanded.value);
        if (next.has(deviceId)) next.delete(deviceId);
        else next.add(deviceId);
        expanded.value = next;
    }
    const groupAllChecked = (group: iGroup) => group.reports.every(r => checked.value.has(r.id));
    // #endregion

    async function load(nextPage = page.value) {
        loading.value = true;
        error.value = '';
        try {
            const [list, statsResult, issueList] = await call(token => Promise.all([
                adminApi.listFeedback(token, { status: status.value, kind: kind.value, page: nextPage, perPage: PER_PAGE }),
                adminApi.feedbackStats(token),
                adminApi.listIssues(token)
            ]));
            reports.value = list.reports;
            total.value = list.total;
            page.value = list.page;
            stats.value = statsResult;
            issues.value = issueList;
            checked.value = new Set();
            expanded.value = new Set();
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    // #region [P] 單則：內容、除錯日誌、截圖
    function releaseShots() {
        shots.value.forEach(s => URL.revokeObjectURL(s.url)); // blob URL 不收回會一直佔記憶體
        shots.value = [];
    }

    async function openReport(id: number) {
        selectedId.value = id;
        detail.value = null;
        releaseShots();
        error.value = '';
        notice.value = '';
        try {
            const result = await call(token => adminApi.getFeedback(token, id));
            detail.value = result.report;
            // 截圖要帶登入憑證，不能直接 <img src>：取回來再轉成 blob URL
            for (const position of result.report.screenshots ?? []) {
                const blob = await call(token => adminApi.feedbackScreenshot(token, id, position));
                if (selectedId.value !== id) return URL.revokeObjectURL(URL.createObjectURL(blob)); // 期間又換了一則
                shots.value.push({ position, url: URL.createObjectURL(blob) });
            }
        } catch (e) {
            error.value = errorMessage(e);
        }
    }

    watch(selectedId, (next, prev) => {
        if (next === prev) return;
        releaseShots();
        confirming.value = null;
        confirmingDevice.value = null;
    });
    onBeforeUnmount(releaseShots);
    // #endregion

    // #region [P] 審核與合併
    async function mutate(action: (token: string) => Promise<{ report: FeedbackReport }>, message: string) {
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const result = await call(action);
            detail.value = result.report;
            const index = reports.value.findIndex(r => r.id === result.report.id);
            if (index !== -1) reports.value[index] = { ...reports.value[index], ...result.report };
            notice.value = message;
            // 統計與問題的件數會跟著變
            const [statsResult, issueList] = await call(token => Promise.all([adminApi.feedbackStats(token), adminApi.listIssues(token)]));
            stats.value = statsResult;
            issues.value = issueList;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }

    const review = (next: FeedbackStatus) =>
        mutate(token => adminApi.reviewFeedback(token, selectedId.value!, { status: next }), `已改成「${STATUS_LABELS[next]}」`);
    const detachIssue = () =>
        mutate(token => adminApi.reviewFeedback(token, selectedId.value!, { issue_id: null }), '已從問題上拿下來');

    /** 快速審核裡合併過：只重抓問題清單（一次 API），列表與統計等離開時再一起抓 */
    async function reloadIssues() {
        try {
            issues.value = await call(token => adminApi.listIssues(token));
        } catch (e) {
            error.value = errorMessage(e);
        }
    }

    /** MergePicker 合併完：這一則已經掛上去了，重抓這一則、統計與問題清單 */
    async function onMerged(issueId: number) {
        await mutate(token => adminApi.getFeedback(token, selectedId.value!), '已經合併');
        // 新開的問題要等清單重抓完才叫得出名字
        const title = issues.value.find(i => i.id === issueId)?.title;
        if (title && notice.value) notice.value = `已經跟「${title}」合併`;
    }

    /** 改權重會立刻影響所有人的分數與名次，所以改完提示一下 */
    async function saveWeight(issue: FeedbackIssue, weight: number) {
        if (!Number.isInteger(weight) || weight < 1 || weight > 100 || weight === issue.weight) return;
        busy.value = true;
        error.value = '';
        try {
            await call(token => adminApi.updateIssue(token, issue.id, { weight }));
            const issueList = await call(token => adminApi.listIssues(token));
            issues.value = issueList;
            notice.value = `「${issue.title}」的權重改成 ${weight}，所有人的分數與名次都會跟著變`;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }
    // #endregion

    // #region [P] 統計
    const statTiles = computed(() => {
        const s = stats.value;
        if (!s) return [];
        return [
            { label: '待審', value: formatInt(s.by_status.pending ?? 0), hint: '還沒判的回報' },
            { label: '採計為 bug', value: formatInt(s.by_status.accepted_bug ?? 0), hint: '' },
            { label: '採計為建議', value: formatInt(s.by_status.accepted_suggestion ?? 0), hint: '' },
            { label: '不採計', value: formatInt(s.by_status.rejected ?? 0), hint: '' },
            { label: '參與人數', value: formatInt(s.participants), hint: '送出過回報的裝置' },
            { label: '待合併', value: formatInt(s.accepted_without_issue), hint: '採計了、還沒歸到問題' }
        ];
    });

    const perDaySeries: BarSeries[] = [{ key: 'count', label: '回報', color: 'var(--dd-series-1)' }];
    const perDayPoints = computed<ColumnPoint[]>(() => {
        const counts = new Map((stats.value?.per_day ?? []).map(d => [d.date, d.count]));
        const taipei = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' });
        const points: ColumnPoint[] = [];
        for (let i = 13; i >= 0; i--) {
            const date = new Date(Date.now() - i * 86_400_000);
            const key = taipei.format(date);
            const [, month, day] = key.split('-');
            points.push({ label: `${Number(month)}/${Number(day)}`, full: key.replace(/-/g, '/'), values: { count: counts.get(key) ?? 0 } });
        }
        return points;
    });
    // #endregion

    onMounted(() => load(1));
</script>

<template>
    <section class="dd-feedback">
        <ul v-if="stats && !triage" class="dd-overview__tiles">
            <li v-for="tile in statTiles" :key="tile.label">
                <p class="label">{{ tile.label }}</p>
                <p class="value">{{ tile.value }}</p>
                <p class="hint">{{ tile.hint }}</p>
            </li>
        </ul>

        <article v-if="stats && !triage" class="dd-overview__card">
            <h3>每天的回報件數</h3>
            <p class="sub">近 14 天</p>
            <ColumnChart :points="perDayPoints" :series="perDaySeries" unit=" 則" :height="120" />
        </article>

        <div class="dd-feedback__toolbar">
            <label v-if="!triage">
                狀態
                <select v-model="status" @change="load(1)">
                    <option value="all">全部</option>
                    <option v-for="s in STATUSES" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
                </select>
            </label>
            <label>
                類型
                <select v-model="kind" @change="load(1)">
                    <option value="all">全部</option>
                    <option v-for="(label, value) in KIND_LABELS" :key="value" :value="value">{{ label }}</option>
                </select>
            </label>
            <label v-if="!triage" class="dd-feedback__check">
                <input v-model="grouped" type="checkbox" />
                同一台的摺起來
            </label>
            <button v-if="!triage" type="button" class="dd-admin__btn is-ghost" :disabled="loading" @click="load()">重新整理</button>
            <span v-if="!triage" class="dd-overview__muted">共 {{ formatInt(total) }} 則</span>
            <button
                v-if="!triage"
                type="button"
                class="dd-admin__btn"
                :disabled="loading || !(stats?.by_status.pending ?? 0)"
                @click="triage = true"
            >
                快速審核{{ stats?.by_status.pending ? `（${formatInt(stats.by_status.pending)} 則待審）` : '' }}
            </button>
        </div>
        <!-- #region [P] 批次：勾了才出現 -->
        <div v-if="!triage && checked.size" class="dd-feedback__batch" role="region" aria-label="批次審核">
            <strong>已勾 {{ formatInt(checked.size) }} 則</strong>
            <label>
                改成
                <select v-model="batchStatus" :disabled="busy">
                    <option v-for="s in STATUSES" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
                </select>
            </label>
            <template v-if="confirming === 'checked'">
                <button type="button" class="dd-admin__btn" :class="{ 'is-danger': batchStatus === 'rejected' }" :disabled="busy" @click="reviewChecked">
                    確定把 {{ formatInt(checked.size) }} 則改成「{{ STATUS_LABELS[batchStatus] }}」
                </button>
                <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="confirming = null">取消</button>
            </template>
            <button v-else type="button" class="dd-admin__btn" :disabled="busy" @click="confirming = 'checked'">套用…</button>
            <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="checked = new Set()">清除勾選</button>
            <span class="dd-overview__muted">每則各記一筆操作紀錄；一次最多 200 則</span>
        </div>
        <!-- #endregion -->
        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-detail__notice" role="status">✓ {{ notice }}</p>

        <FeedbackTriage v-if="triage" :issues="issues" :kind="kind" @close="closeTriage" @issues-changed="reloadIssues" />

        <div v-else class="dd-devices__layout" :class="{ 'has-detail': selectedId !== null }">
            <div class="dd-devices__table-wrap">
                <table class="dd-table dd-feedback__table">
                    <thead>
                        <tr>
                            <th scope="col" class="is-check">
                                <input
                                    type="checkbox"
                                    :checked="allOnPageChecked"
                                    :disabled="!reports.length"
                                    aria-label="勾選本頁全部"
                                    @change="setChecked(reports.map(r => r.id), ($event.target as HTMLInputElement).checked)"
                                />
                            </th>
                            <th scope="col">ID</th>
                            <th scope="col">裝置</th>
                            <th scope="col">類型</th>
                            <th scope="col">狀態</th>
                            <th scope="col">內容</th>
                            <th scope="col">送出</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- 摺疊時一台一組：群組列可以整組勾、整組展開、整台的待審一鍵不採計 -->
                        <template v-for="group in (grouped ? groups : [])" :key="`g-${group.deviceId}`">
                            <tr
                                v-if="group.reports.length > 1"
                                class="is-group"
                                tabindex="0"
                                :aria-expanded="!isFolded(group)"
                                @click="toggleExpanded(group.deviceId)"
                                @keydown.enter="toggleExpanded(group.deviceId)"
                            >
                                <td class="is-check" @click.stop>
                                    <input
                                        type="checkbox"
                                        :checked="groupAllChecked(group)"
                                        :aria-label="`勾選 ${group.name} 的全部`"
                                        @change="setChecked(group.reports.map(r => r.id), ($event.target as HTMLInputElement).checked)"
                                    />
                                </td>
                                <td colspan="6">
                                    <span class="caret" :class="{ 'is-open': !isFolded(group) }" aria-hidden="true">▸</span>
                                    {{ group.name }}
                                    <span class="dd-overview__muted">
                                        · 本頁 {{ formatInt(group.reports.length) }} 則{{ group.pending ? `，${formatInt(group.pending)} 則待審` : '' }}
                                    </span>
                                    <template v-if="group.pending">
                                        <template v-if="confirmingDevice === group.deviceId">
                                            <button type="button" class="dd-admin__btn is-danger" :disabled="busy" @click.stop="rejectDevice(group.deviceId, group.name)">
                                                確定：{{ group.name }} 的待審全部不採計
                                            </button>
                                            <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click.stop="confirmingDevice = null">取消</button>
                                        </template>
                                        <button v-else type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click.stop="confirmingDevice = group.deviceId">
                                            這台的待審全部不採計…
                                        </button>
                                    </template>
                                </td>
                            </tr>
                            <tr
                                v-for="report in (isFolded(group) ? [] : group.reports)"
                                :key="report.id"
                                :class="{ 'is-selected': report.id === selectedId, 'is-child': group.reports.length > 1 }"
                                tabindex="0"
                                @click="openReport(report.id)"
                                @keydown.enter="openReport(report.id)"
                            >
                                <td class="is-check" @click.stop>
                                    <input type="checkbox" :checked="checked.has(report.id)" :aria-label="`勾選 #${report.id}`" @change="setChecked([report.id], ($event.target as HTMLInputElement).checked)" />
                                </td>
                                <td>#{{ report.id }}</td>
                                <td>{{ report.device_name || `#${report.device_id}` }}</td>
                                <td>{{ KIND_LABELS[report.kind] ?? report.kind }}</td>
                                <td>
                                    <span class="dd-status" :class="report.status === 'pending' ? 'is-pending' : report.status === 'rejected' ? 'is-frozen' : 'is-active'">
                                        {{ STATUS_LABELS[report.status] }}
                                    </span>
                                </td>
                                <td class="is-summary">{{ report.content_purged_at ? '（內容已清除）' : report.description }}</td>
                                <td>{{ formatRelative(report.created_at) }}</td>
                            </tr>
                        </template>
                        <!-- 不摺疊：照後端的順序一則一列 -->
                        <tr
                            v-for="report in (grouped ? [] : reports)"
                            :key="report.id"
                            :class="{ 'is-selected': report.id === selectedId }"
                            tabindex="0"
                            @click="openReport(report.id)"
                            @keydown.enter="openReport(report.id)"
                        >
                            <td class="is-check" @click.stop>
                                <input type="checkbox" :checked="checked.has(report.id)" :aria-label="`勾選 #${report.id}`" @change="setChecked([report.id], ($event.target as HTMLInputElement).checked)" />
                            </td>
                            <td>#{{ report.id }}</td>
                            <td>{{ report.device_name || `#${report.device_id}` }}</td>
                            <td>{{ KIND_LABELS[report.kind] ?? report.kind }}</td>
                            <td>
                                <span class="dd-status" :class="report.status === 'pending' ? 'is-pending' : report.status === 'rejected' ? 'is-frozen' : 'is-active'">
                                    {{ STATUS_LABELS[report.status] }}
                                </span>
                            </td>
                            <td class="is-summary">{{ report.content_purged_at ? '（內容已清除）' : report.description }}</td>
                            <td>{{ formatRelative(report.created_at) }}</td>
                        </tr>
                        <tr v-if="!loading && reports.length === 0">
                            <td colspan="7" class="dd-table__empty">沒有符合的回報</td>
                        </tr>
                    </tbody>
                </table>

                <div class="dd-devices__pager">
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="page <= 1 || loading" @click="load(page - 1)">上一頁</button>
                    <span>第 {{ page }} / {{ pageCount }} 頁</span>
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="page >= pageCount || loading" @click="load(page + 1)">下一頁</button>
                </div>
            </div>

            <!-- #region [P] 單則 -->
            <aside v-if="selectedId !== null" class="dd-detail" aria-label="回報內容">
                <header class="dd-detail__header">
                    <h2>回報 #{{ selectedId }}</h2>
                    <button type="button" class="dd-detail__close" aria-label="關閉" @click="selectedId = null">✕</button>
                </header>

                <p v-if="!detail" class="dd-detail__muted">載入中…</p>
                <template v-else>
                    <dl class="dd-detail__info">
                        <div><dt>裝置</dt><dd>{{ detail.device_name || '未命名' }}（#{{ detail.device_id }}）</dd></div>
                        <div><dt>類型</dt><dd>{{ KIND_LABELS[detail.kind] ?? detail.kind }}</dd></div>
                        <div><dt>App 版本</dt><dd>{{ detail.app_version || '—' }}</dd></div>
                        <div><dt>手機</dt><dd>{{ detail.device_model || '—' }}（Android {{ detail.android_version || '?' }}）</dd></div>
                        <div><dt>送出</dt><dd>{{ formatDateTime(detail.created_at) }}</dd></div>
                        <div><dt>審核</dt><dd>{{ detail.reviewed_by ? `${detail.reviewed_by}（${formatDateTime(detail.reviewed_at)}）` : '還沒審' }}</dd></div>
                    </dl>

                    <section class="dd-detail__card">
                        <h3>內容</h3>
                        <p v-if="detail.content_purged_at" class="dd-detail__muted">內容已於 {{ formatDateTime(detail.content_purged_at) }} 清除，只留下計數。</p>
                        <p v-else class="dd-feedback__desc">{{ detail.description }}</p>

                        <div v-if="shots.length" class="dd-feedback__shots">
                            <a v-for="shot in shots" :key="shot.position" :href="shot.url" target="_blank" rel="noopener">
                                <img :src="shot.url" :alt="`截圖 ${shot.position + 1}`" loading="lazy" />
                            </a>
                        </div>

                        <details v-if="detail.log">
                            <summary>附加的除錯紀錄</summary>
                            <pre class="dd-feedback__log">{{ detail.log }}</pre>
                        </details>
                    </section>

                    <section class="dd-detail__card">
                        <h3>採計</h3>
                        <p class="dd-detail__muted">跟使用者選的類型無關：選 bug 的也可以採計為建議。改判會記一筆操作紀錄。</p>
                        <div class="dd-detail__actions">
                            <button
                                v-for="s in STATUSES"
                                :key="s"
                                type="button"
                                class="dd-admin__btn"
                                :class="{ 'is-ghost': detail.status !== s }"
                                :disabled="busy || detail.status === s"
                                @click="review(s)"
                            >
                                {{ STATUS_LABELS[s] }}
                            </button>
                        </div>
                    </section>

                    <section class="dd-detail__card">
                        <h3>這台裝置</h3>
                        <p class="dd-detail__muted">
                            同一台一直送垃圾回報的話，這裡一次處理：只動還在「待審」的，已經採計的不會翻掉，一次最多 200 則。
                            凍結是另一件事、分開按。
                        </p>
                        <div v-if="confirmingDevice === detail.device_id" class="dd-detail__actions">
                            <button type="button" class="dd-admin__btn is-danger" :disabled="busy" @click="rejectDevice(detail.device_id, detail.device_name || `#${detail.device_id}`)">
                                確定：{{ detail.device_name || `#${detail.device_id}` }} 的待審全部不採計
                            </button>
                            <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="confirmingDevice = null">取消</button>
                        </div>
                        <div v-else-if="confirming === 'freeze'" class="dd-detail__actions">
                            <button type="button" class="dd-admin__btn is-danger" :disabled="busy" @click="freezeDevice(detail.device_id)">確定凍結 #{{ detail.device_id }}</button>
                            <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="confirming = null">取消</button>
                        </div>
                        <div v-else class="dd-detail__actions">
                            <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="confirmingDevice = detail.device_id">這台的待審全部不採計…</button>
                            <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="confirming = 'freeze'">凍結這台裝置…</button>
                        </div>
                    </section>

                    <section class="dd-detail__card">
                        <h3>跟哪一則是同一件事？</h3>
                        <p class="dd-detail__muted">
                            講同一件事的回報合併在一起：最早的那則採計回報拿全額權重、之後不同的人拿一半；
                            同一個人在同一個問題裡只算最早那一則，之後的 0 分、也不算件數（還是可以採計掛上來，看得出多少人反映）。
                            沒合併的採計回報算 1 分。
                        </p>

                        <template v-if="detail.issue_id">
                            <p>已經合併到：<strong>{{ issues.find(i => i.id === detail.issue_id)?.title ?? `#${detail.issue_id}` }}</strong></p>
                            <div class="dd-detail__actions">
                                <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="detachIssue">拆開（不算同一件）</button>
                            </div>
                        </template>

                        <MergePicker v-else :report="detail" :issues="issues" @merged="onMerged" />
                    </section>
                </template>
            </aside>
            <!-- #endregion -->
        </div>

        <!-- #region [P] 問題清單：權重直接改 -->
        <section class="dd-overview__card dd-feedback__issues">
            <h3>問題（合併後的）</h3>
            <p class="sub">權重 1～100。改了之後所有人的分數與名次立刻跟著變。</p>
            <div class="dd-feedback__scroll">
                <table class="dd-table is-static">
                    <thead>
                        <tr>
                            <th scope="col">問題</th>
                            <th scope="col" class="is-num">回報</th>
                            <th scope="col" class="is-num">採計</th>
                            <th scope="col" class="is-num">權重</th>
                            <th scope="col">建立</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="issue in issues" :key="issue.id">
                            <th scope="row">{{ issue.title }}</th>
                            <td class="is-num">{{ formatInt(issue.reports) }}</td>
                            <td class="is-num">{{ formatInt(issue.accepted) }}</td>
                            <td class="is-num">
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    :value="issue.weight"
                                    :disabled="busy"
                                    :aria-label="`${issue.title} 的權重`"
                                    @change="saveWeight(issue, Number(($event.target as HTMLInputElement).value))"
                                />
                            </td>
                            <td>{{ formatDateTime(issue.created_at) }}</td>
                        </tr>
                        <tr v-if="!issues.length">
                            <td colspan="5" class="dd-table__empty">還沒有合併過的問題</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
        <!-- #endregion -->
    </section>
</template>

<style lang="scss">
    .dd-feedback {
        @include setFlex(flex-start, stretch, 16px, column);

        // 問題清單的欄位多，窄螢幕讓它自己左右捲，不要撐破版面
        &__scroll { overflow-x: auto; }
        &__check {
            @include setFlex(flex-start, center, 6px);
            cursor: pointer;
        }

        // 勾了才出現的批次列：用品牌淡色跟一般工具列分開，讓人知道現在有東西被勾著
        &__batch {
            @include setFlex(flex-start, center, 12px);
            flex-wrap: wrap;
            background: var(--vp-c-brand-soft);
            padding: 8px 12px;
            border-radius: 8px;
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
        &__table {
            input[type=checkbox] {
                accent-color: var(--vp-c-brand-1);
                cursor: pointer;
            }
            .is-check {
                width: 32px;
                padding-right: 0;
            }

            // 同一台的群組列：底色稍深、粗體，按鈕放在同一列的右邊
            tr.is-group {
                background: var(--vp-c-bg-soft) !important;
                font-weight: 600;

                &:hover { background: var(--vp-c-default-soft) !important; }
                .caret {
                    display: inline-block;
                    width: 1em;
                    transition: transform .2s var(--cubic-FiSo);

                    &.is-open { transform: rotate(90deg); }
                }
                .dd-admin__btn {
                    margin-left: 12px;
                    font-weight: 400;
                }
            }

            // 群組底下的回報縮一點，看得出是同一台的
            tr.is-child td:nth-child(2) { padding-left: 28px; }
        }
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

        // 列表上的內容只露一行，點進去看全部
        .is-summary {
            max-width: 22em;
            text-overflow: ellipsis;
            overflow: hidden;
        }
        &__desc {
            white-space: pre-wrap; // 使用者打的換行要留著
            overflow-wrap: anywhere; // break-word 已棄用
        }
        &__shots {
            @include setFlex(flex-start, flex-start, 8px);
            flex-wrap: wrap;

            img {
                width: 88px;
                height: 160px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                object-fit: cover;
                object-position: top;
            }
        }
        &__log {
            max-height: 240px;
            padding: 10px;
            border-radius: 8px;
            font-size: var(--font-size-xs);
            overflow: auto;
        }
        &__issues {
            input[type=number] {
                background: var(--vp-c-bg-soft);
                width: 68px;
                padding: 2px 8px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 6px;
                color: var(--vp-c-text-1);
                text-align: right;
            }
        }

        .dd-detail__field {
            input[type=text] { width: 180px; }
            select {
                background: var(--vp-c-bg-soft);
                padding: 4px 10px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                color: var(--vp-c-text-1);
            }
        }
    }

    // 待審用中性的底色：它不是好也不是壞，只是還沒處理
    .dd-status.is-pending { background: var(--vp-c-default-soft); }
</style>
