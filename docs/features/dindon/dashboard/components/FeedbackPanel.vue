<script setup lang="ts">
    import type { FeedbackBoundFilter, FeedbackFilter, FeedbackKind, FeedbackProgressFilter, FeedbackSourceFilter } from '../api';
    import type { BarSeries } from '../charts/BarChart.vue';
    import type { ColumnPoint } from '../charts/ColumnChart.vue';
    import type { FeedbackIssue, FeedbackProgress, FeedbackReport, FeedbackReporter, FeedbackStats, FeedbackStatus } from '../schemas/admin.schema';
    import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { adminApi } from '../api';
    import ColumnChart from '../charts/ColumnChart.vue';
    import { formatDateTime, formatInt, formatRelative, KIND_LABELS, PROGRESS_LABELS, PROGRESSES } from '../format';
    import { takePanelPreset } from '../navigation';
    import { FIXED_IN_PATTERN, reporterNameProblem } from '../schemas/admin.schema';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import { usePanelReveal } from '../usePanelReveal';
    import { usePulse } from '../usePulse';
    import AdminActions from './AdminActions.vue';
    import FeedbackTriage from './FeedbackTriage.vue';
    import LineImport from './LineImport.vue';
    import MergePicker from './MergePicker.vue';

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

    const status = ref<FeedbackFilter>(takePanelPreset('feedbackStatus') ?? 'pending');
    // 類型篩選（溝通板 #41）。crash 是 App 當掉後自動產生的，跟手寫的回報意義差很多
    const kind = ref<FeedbackKind>('all');
    // 來源篩選（#0068）：LINE、信件上的回報是後台替使用者建的
    const source = ref<FeedbackSourceFilter>('all');
    const SOURCE_LABELS: Record<string, string> = { app: 'App', line: 'LINE', email: '信件' };
    // 處理狀況（Flowsker #61）：跟採計分開，採計的 bug 可能還沒修
    const progress = ref<FeedbackProgressFilter>(takePanelPreset('feedbackProgress') ?? 'all');
    // 沒綁定的（LINE 上沒裝 App 的人）不算分，採計了列進 App 的「特別感謝」
    const bound = ref<FeedbackBoundFilter>('all');
    /** 只看某一位沒綁定的人的回報；詳情裡按「只看他的」設的，工具列上可以拿掉 */
    const reporterFilter = ref('');
    const reporters = ref<FeedbackReporter[]>([]);
    const importing = ref(false);
    const pulse = usePulse();

    function onImported(created: number) {
        importing.value = false;
        notice.value = `已從 LINE／信件建立 ${formatInt(created)} 則回報`;
        void load(1);
        void pulse.refresh();
    }
    const reports = ref<FeedbackReport[]>([]);
    const total = ref(0);
    const stats = ref<FeedbackStats | null>(null);
    const issues = ref<FeedbackIssue[]>([]);
    const selectedId = ref<number | null>(null);
    // 詳情面板從沒有到有、關掉時有轉場（換看另一則時不重播）
    const panel = usePanelReveal();
    watch(selectedId, (next, prev) => {
        if (next === null) panel.reset();
        else if (prev === null) panel.show();
    });
    const closeDetail = () => panel.hide(() => (selectedId.value = null));
    const detail = ref<FeedbackReport | null>(null);
    const shots = ref<{ position: number; url: string }[]>([]);
    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    const notice = ref('');

    /** 快速審核：一次一則、用鍵盤判，判完自動跳下一則 */
    const triage = ref(takePanelPreset('feedbackTriage') ?? false);
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
    /** 批次要改的：採計（status:…）或處理狀況（progress:…），同一個選單 */
    const batchTarget = ref<`status:${FeedbackStatus}` | `progress:${FeedbackProgress}`>('status:rejected');
    const batchFixedIn = ref('');
    const batchStatus = computed(() => (batchTarget.value.startsWith('status:') ? batchTarget.value.slice(7) as FeedbackStatus : null));
    const batchProgress = computed(() => (batchTarget.value.startsWith('progress:') ? batchTarget.value.slice(9) as FeedbackProgress : null));
    const batchLabel = computed(() => (batchStatus.value ? STATUS_LABELS[batchStatus.value] : PROGRESS_LABELS[batchProgress.value!]));
    const batchFixedInBad = computed(() => batchFixedIn.value.trim() !== '' && !FIXED_IN_PATTERN.test(batchFixedIn.value.trim()));
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

    type BatchBody = { reportIds: number[]; status?: FeedbackStatus; progress?: FeedbackProgress; fixedIn?: string | null } | { deviceId: number; status: FeedbackStatus };
    async function batch(body: BatchBody, target: string, label: string) {
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const { updated } = await call(token => adminApi.batchReviewFeedback(token, body));
            notice.value = updated ? `${label}：${formatInt(updated)} 則改成「${target}」` : `${label}：沒有要改的`;
            await load(); // 狀態變了，列表、統計、問題的件數都要重抓
            if (selectedId.value !== null && detail.value) { // 正在看的那一則可能也在裡面；截圖不會變，不用重抓
                detail.value = await call(token => adminApi.getFeedback(token, selectedId.value!));
            }
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
            confirming.value = null;
            confirmingDevice.value = null;
        }
    }
    function reviewChecked() {
        const reportIds = [...checked.value];
        if (batchStatus.value) return batch({ reportIds, status: batchStatus.value }, batchLabel.value, '勾選的回報');
        // 版本沒填就不動各則原本的版本（不送 fixed_in），填了才一起改
        const fixedIn = batchFixedIn.value.trim();
        return batch({ reportIds, progress: batchProgress.value!, ...(fixedIn ? { fixedIn } : {}) }, `${batchLabel.value}${fixedIn ? `（${fixedIn}）` : ''}`, '勾選的回報');
    }
    const rejectDevice = (deviceId: number, name: string) => batch({ deviceId, status: 'rejected' }, STATUS_LABELS.rejected, `${name} 的待審`);
    /** 側欄那顆：正在看的那一則的裝置（模板裡的事件處理拿不到 detail 非 null 的收窄，所以包一層） */
    const rejectDetailDevice = () => {
        if (detail.value) rejectDevice(detail.value.deviceId, detail.value.deviceName || `#${detail.value.deviceId}`);
    };
    const freezeDetailDevice = () => {
        if (detail.value) void freezeDevice(detail.value.deviceId);
    };

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
    interface Group {
        /** 裝置是 d:id；沒綁定的 device_id 都是 0，改用名字（後端同名不分大小寫算同一個人） */
        key: string;
        /** 沒綁定的是 0：沒有「這台的待審」可以一次處理 */
        deviceId: number;
        name: string;
        reports: FeedbackReport[];
        pending: number;
    }
    const groupKey = (report: FeedbackReport) => (report.reporterName !== null ? `n:${report.reporterName.toLowerCase()}` : `d:${report.deviceId}`);
    /** 列表上誰送的：沒綁定的名字後面標一下，看得出這則不算分 */
    const whoLabel = (report: FeedbackReport) => report.reporterName ?? (report.deviceName || `#${report.deviceId}`);
    const grouped = ref(true);
    /** 展開的群組；重抓列表就收起來 */
    const expanded = ref<Set<string>>(new Set());
    const groups = computed<Group[]>(() => {
        const map = new Map<string, Group>();
        for (const report of reports.value) {
            const key = groupKey(report);
            let group = map.get(key);
            if (!group) {
                group = { key, deviceId: report.reporterName !== null ? 0 : report.deviceId, name: whoLabel(report), reports: [], pending: 0 };
                map.set(key, group);
            }
            group.reports.push(report);
            if (report.status === 'pending') group.pending++;
        }
        return [...map.values()]; // Map 保留插入順序：第一次出現的裝置在前，跟後端「新的在前」一致
    });
    /** 只有一則的不摺：摺了反而多一次點擊 */
    const isFolded = (group: Group) => group.reports.length > 1 && !expanded.value.has(group.key);
    function toggleExpanded(key: string) {
        const next = new Set(expanded.value);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        expanded.value = next;
    }
    const groupAllChecked = (group: Group) => group.reports.every(r => checked.value.has(r.id));
    // #endregion

    async function load(nextPage = page.value) {
        loading.value = true;
        error.value = '';
        try {
            const [list, statsResult, issueList] = await call(token => Promise.all([
                adminApi.listFeedback(token, {
                    status: status.value,
                    kind: kind.value,
                    source: source.value,
                    progress: progress.value,
                    bound: bound.value,
                    reporterName: reporterFilter.value,
                    page: nextPage,
                    perPage: PER_PAGE
                }),
                adminApi.feedbackStats(token),
                adminApi.listIssues(token)
            ]));
            void loadReporters();
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

    /** 沒綁定的名稱只是改名、標成沒綁定時的快選：抓不到（後端還沒部署 #61）不擋整頁 */
    async function loadReporters() {
        try {
            reporters.value = await call(token => adminApi.listReporters(token));
        } catch {
            reporters.value = [];
        }
    }

    function filterReporter(name: string) {
        reporterFilter.value = name;
        closeDetail();
        void load(1);
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
            detail.value = result;
            // 截圖要帶登入憑證，不能直接 <img src>：取回來再轉成 blob URL
            for (const position of result.screenshots) {
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
    async function mutate(action: (token: string) => Promise<FeedbackReport>, message: string) {
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const result = await call(action);
            detail.value = result;
            const index = reports.value.findIndex(r => r.id === result.id);
            if (index !== -1) reports.value[index] = { ...reports.value[index], ...result };
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
    /** 正在看的這一則掛在哪個問題上（模板裡的箭頭函式拿不到 detail 非 null 的收窄，所以算在這） */
    const detailIssueTitle = computed(() => {
        const current = detail.value;
        if (!current?.issueId) return '';
        return issues.value.find(i => i.id === current.issueId)?.title ?? `#${current.issueId}`;
    });
    const detachIssue = () =>
        mutate(token => adminApi.reviewFeedback(token, selectedId.value!, { issueId: null }), '已從問題上拿下來');

    // #region [P] 處理狀況（Flowsker #61）：不影響分數
    const fixedInDraft = ref('');
    const fixedInBad = computed(() => fixedInDraft.value.trim() !== '' && !FIXED_IN_PATTERN.test(fixedInDraft.value.trim()));
    const setProgress = (next: FeedbackProgress) =>
        mutate(token => adminApi.reviewFeedback(token, selectedId.value!, { progress: next }), `處理狀況改成「${PROGRESS_LABELS[next]}」`);
    function saveFixedIn() {
        const value = fixedInDraft.value.trim();
        if (fixedInBad.value || value === (detail.value?.fixedIn ?? '')) return;
        void mutate(token => adminApi.reviewFeedback(token, selectedId.value!, { fixedIn: value || null }), value ? `記下修在 ${value}` : '清掉修在哪一版');
    }
    // #endregion

    // #region [P] 沒有綁定的回報者（Flowsker #61）：LINE 上沒裝 App 的人，不算分、採計了列進 App 的「特別感謝」
    const nameDraft = ref('');
    const nameProblem = computed(() => reporterNameProblem(nameDraft.value));
    const bindDraft = ref('');
    const bindId = computed(() => (/^\d+$/.test(bindDraft.value.trim()) ? Number(bindDraft.value.trim()) : null));
    /** 改成沒有綁定，或沒綁定的改名；後端同名不分大小寫算同一個人、存第一次的寫法 */
    function saveReporterName() {
        if (nameProblem.value) return;
        const name = nameDraft.value.trim();
        const wasBound = detail.value?.reporterName === null;
        void mutate(
            token => adminApi.reviewFeedback(token, selectedId.value!, { reporterName: name }),
            wasBound ? `改成沒有綁定：${name}（不算分，採計了會列進特別感謝）` : `名稱改成「${name}」`
        ).then(loadReporters);
    }
    /** 他之後裝了 App：改綁到他的裝置，分數照原本的規則算進排行榜 */
    function bindToDevice() {
        if (bindId.value === null) return;
        const id = bindId.value;
        void mutate(token => adminApi.reviewFeedback(token, selectedId.value!, { deviceId: id }), `改綁到裝置 #${id}，分數照規則算進排行榜`)
            .then(() => {
                bindDraft.value = '';
                return loadReporters();
            });
    }
    // 換看另一則時，輸入框換成那一則現在的值
    watch(detail, (next, prev) => {
        if (next?.id === prev?.id && next?.fixedIn === prev?.fixedIn && next?.reporterName === prev?.reporterName) return;
        fixedInDraft.value = next?.fixedIn ?? '';
        nameDraft.value = next?.reporterName ?? '';
    });
    // #endregion

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

    /**
     * 問題的處理狀況、修在哪一版：一併改掛在上面的全部回報（同一件事通常一起修好），之後單則還能各自改。
     * 會蓋掉各則原本的狀態，所以提示寫出改了幾則
     */
    async function saveIssueProgress(issue: FeedbackIssue, patch: { progress?: FeedbackProgress; fixedIn?: string | null }) {
        if (patch.fixedIn !== undefined && patch.fixedIn !== null && !FIXED_IN_PATTERN.test(patch.fixedIn)) {
            error.value = `「${patch.fixedIn}」不像版本號：英數開頭，只能有英數、點、加號、減號，最多 20 字`;
            return;
        }
        if ((patch.progress ?? issue.progress) === issue.progress && (patch.fixedIn === undefined || patch.fixedIn === issue.fixedIn)) return;
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const { reportsUpdated } = await call(token => adminApi.updateIssue(token, issue.id, patch));
            const what = patch.progress ? `處理狀況改成「${PROGRESS_LABELS[patch.progress]}」` : patch.fixedIn ? `記下修在 ${patch.fixedIn}` : '清掉修在哪一版';
            notice.value = `「${issue.title}」${what}，掛在上面的 ${formatInt(reportsUpdated)} 則回報一起改了`;
            await load(); // 列表、統計裡的處理狀況都變了
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }
    // #endregion

    // #region [P] 統計
    /** filter：點了就把下面的列表篩成這個狀態 */
    const statTiles = computed<{ label: string; value: string; hint: string; filter?: FeedbackFilter }[]>(() => {
        const s = stats.value;
        if (!s) return [];
        return [
            { label: '待審', value: formatInt(s.byStatus.pending ?? 0), hint: '還沒判的回報', filter: 'pending' },
            { label: '採計為 bug', value: formatInt(s.byStatus.accepted_bug ?? 0), hint: '', filter: 'accepted_bug' },
            { label: '採計為建議', value: formatInt(s.byStatus.accepted_suggestion ?? 0), hint: '', filter: 'accepted_suggestion' },
            { label: '不採計', value: formatInt(s.byStatus.rejected ?? 0), hint: '', filter: 'rejected' },
            {
                label: '參與人數',
                value: formatInt(s.participants),
                hint: s.unboundReporters ? `送出過回報的裝置，另有 ${formatInt(s.unboundReporters)} 位沒綁定` : '送出過回報的裝置'
            },
            { label: '待合併', value: formatInt(s.acceptedWithoutIssue), hint: '採計了、還沒歸到問題' },
            // 舊後端沒有這個數字（#61 部署前），整格不顯示
            ...(s.acceptedOpen === null ? [] : [{ label: '待處理', value: formatInt(s.acceptedOpen), hint: '採計了、還沒修或還沒做' }])
        ];
    });

    const perDaySeries: BarSeries[] = [{ key: 'count', label: '回報', color: 'var(--dd-series-1)' }];
    const perDayPoints = computed<ColumnPoint[]>(() => {
        const counts = new Map((stats.value?.perDay ?? []).map(d => [d.date, d.count]));
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
                <button v-if="tile.filter" type="button" :class="{ 'is-active': status === tile.filter }" @click="status = tile.filter; load(1)">
                    <span class="label">{{ tile.label }}</span>
                    <span class="value">{{ tile.value }}</span>
                    <span class="hint">{{ tile.hint }}</span>
                </button>
                <div v-else class="tile">
                    <span class="label">{{ tile.label }}</span>
                    <span class="value">{{ tile.value }}</span>
                    <span class="hint">{{ tile.hint }}</span>
                </div>
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
            <label>
                來源
                <select v-model="source" @change="load(1)">
                    <option value="all">全部</option>
                    <option v-for="(label, value) in SOURCE_LABELS" :key="value" :value="value">{{ label }}</option>
                </select>
            </label>
            <label v-if="!triage">
                處理
                <select v-model="progress" @change="load(1)">
                    <option value="all">全部</option>
                    <option v-for="p in PROGRESSES" :key="p" :value="p">{{ PROGRESS_LABELS[p] }}</option>
                </select>
            </label>
            <label v-if="!triage && !reporterFilter">
                回報者
                <select v-model="bound" @change="load(1)">
                    <option value="all">全部</option>
                    <option value="true">有綁定裝置</option>
                    <option value="false">沒有綁定</option>
                </select>
            </label>
            <span v-if="!triage && reporterFilter" class="dd-feedback__chip">
                只看「{{ reporterFilter }}」
                <button type="button" aria-label="不只看這位" @click="filterReporter('')">✕</button>
            </span>
            <label v-if="!triage" class="dd-feedback__check">
                <input v-model="grouped" type="checkbox" />
                同一台的摺起來
            </label>
            <span v-if="!triage" class="dd-overview__muted">共 {{ formatInt(total) }} 則</span>
            <AdminActions v-if="!triage">
                <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="loading" @click="load()">重新整理</button>
                <button v-if="!importing" type="button" class="dd-admin__btn dd-admin__btn--ghost" @click="importing = true">匯入 LINE 回報</button>
                <button type="button" class="dd-admin__btn" :disabled="loading || !(stats?.byStatus.pending ?? 0)" @click="triage = true">
                    快速審核{{ stats?.byStatus.pending ? `（${formatInt(stats.byStatus.pending)} 則待審）` : '' }}
                </button>
            </AdminActions>
        </div>
        <LineImport v-if="importing && !triage" @done="onImported" @close="importing = false" />
        <!-- #region [P] 批次：勾了才出現 -->
        <div v-if="!triage && checked.size" class="dd-feedback__batch" role="region" aria-label="批次審核">
            <strong>已勾 {{ formatInt(checked.size) }} 則</strong>
            <label>
                改成
                <select v-model="batchTarget" :disabled="busy">
                    <optgroup label="採計">
                        <option v-for="s in STATUSES" :key="s" :value="`status:${s}`">{{ STATUS_LABELS[s] }}</option>
                    </optgroup>
                    <optgroup label="處理狀況">
                        <option v-for="p in PROGRESSES" :key="p" :value="`progress:${p}`">{{ PROGRESS_LABELS[p] }}</option>
                    </optgroup>
                </select>
            </label>
            <label v-if="batchProgress">
                修在
                <input v-model="batchFixedIn" type="text" class="dd-feedback__version" placeholder="版本（選填）" :disabled="busy" :aria-invalid="batchFixedInBad" />
            </label>
            <template v-if="confirming === 'checked'">
                <button type="button" class="dd-admin__btn" :class="{ 'dd-admin__btn--danger': batchStatus === 'rejected' }" :disabled="busy || batchFixedInBad" @click="reviewChecked">
                    確定把 {{ formatInt(checked.size) }} 則改成「{{ batchLabel }}」
                </button>
                <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirming = null">取消</button>
            </template>
            <button v-else type="button" class="dd-admin__btn" :disabled="busy || batchFixedInBad" @click="confirming = 'checked'">套用…</button>
            <span v-if="batchFixedInBad" class="dd-admin__error">版本號：英數開頭，只能有英數、點、加號、減號，最多 20 字</span>
            <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="checked = new Set()">清除勾選</button>
            <span class="dd-overview__muted">每則各記一筆操作紀錄；一次最多 200 則</span>
        </div>
        <!-- #endregion -->
        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-detail__notice" role="status">✓ {{ notice }}</p>

        <FeedbackTriage v-if="triage" :issues="issues" :kind="kind" @close="closeTriage" @issues-changed="reloadIssues" />

        <div v-else class="dd-devices__layout" :class="{ 'has-detail': selectedId !== null }">
            <div class="dd-devices__table-wrap">
                <div class="dd-table-scroll">
                    <table class="dd-table dd-feedback__table">
                        <thead>
                            <tr>
                                <th scope="col" class="check">
                                    <input
                                        type="checkbox"
                                        :checked="allOnPageChecked"
                                        :disabled="!reports.length"
                                        aria-label="勾選本頁全部"
                                        @change="setChecked(reports.map(r => r.id), ($event.target as HTMLInputElement).checked)"
                                    />
                                </th>
                                <th scope="col">ID</th>
                                <th scope="col">誰</th>
                                <th scope="col">類型</th>
                                <th scope="col">採計</th>
                                <th scope="col">處理</th>
                                <th scope="col">內容</th>
                                <th scope="col">送出</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- 摺疊時一台一組：群組列可以整組勾、整組展開、整台的待審一鍵不採計 -->
                            <template v-for="group in (grouped ? groups : [])" :key="group.key">
                                <tr
                                    v-if="group.reports.length > 1"
                                    class="group"
                                    tabindex="0"
                                    :aria-expanded="!isFolded(group)"
                                    @click="toggleExpanded(group.key)"
                                    @keydown.enter="toggleExpanded(group.key)"
                                >
                                    <td class="check" @click.stop>
                                        <input
                                            type="checkbox"
                                            :checked="groupAllChecked(group)"
                                            :aria-label="`勾選 ${group.name} 的全部`"
                                            @change="setChecked(group.reports.map(r => r.id), ($event.target as HTMLInputElement).checked)"
                                        />
                                    </td>
                                    <td colspan="7">
                                        <span class="caret" :class="{ 'is-open': !isFolded(group) }" aria-hidden="true">▸</span>
                                        {{ group.name }}
                                        <span v-if="!group.deviceId" class="dd-feedback__source">沒綁定</span>
                                        <span class="dd-overview__muted">
                                            · 本頁 {{ formatInt(group.reports.length) }} 則{{ group.pending ? `，${formatInt(group.pending)} 則待審` : '' }}
                                        </span>
                                        <!-- 沒綁定的沒有裝置可以「這台的待審」一次處理 -->
                                        <template v-if="group.pending && group.deviceId">
                                            <template v-if="confirmingDevice === group.deviceId">
                                                <button type="button" class="dd-admin__btn dd-admin__btn--danger" :disabled="busy" @click.stop="rejectDevice(group.deviceId, group.name)">
                                                    確定：{{ group.name }} 的待審全部不採計
                                                </button>
                                                <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click.stop="confirmingDevice = null">取消</button>
                                            </template>
                                            <button v-else type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click.stop="confirmingDevice = group.deviceId">
                                                這台的待審全部不採計…
                                            </button>
                                        </template>
                                    </td>
                                </tr>
                                <tr
                                    v-for="report in (isFolded(group) ? [] : group.reports)"
                                    :key="report.id"
                                    :class="{ 'is-selected': report.id === selectedId, 'child': group.reports.length > 1 }"
                                    tabindex="0"
                                    @click="openReport(report.id)"
                                    @keydown.enter="openReport(report.id)"
                                >
                                    <td class="check" @click.stop>
                                        <input type="checkbox" :checked="checked.has(report.id)" :aria-label="`勾選 #${report.id}`" @change="setChecked([report.id], ($event.target as HTMLInputElement).checked)" />
                                    </td>
                                    <td>#{{ report.id }}</td>
                                    <td>
                                        {{ whoLabel(report) }}
                                        <span v-if="report.reporterName !== null" class="dd-feedback__source">沒綁定</span>
                                    </td>
                                    <td>
                                        {{ KIND_LABELS[report.kind] ?? report.kind }}
                                        <span v-if="report.source !== 'app'" class="dd-feedback__source">{{ SOURCE_LABELS[report.source] }}</span>
                                    </td>
                                    <td>
                                        <span class="dd-status" :class="report.status === 'pending' ? 'is-pending' : report.status === 'rejected' ? 'is-frozen' : 'is-active'">
                                            {{ STATUS_LABELS[report.status] }}
                                        </span>
                                    </td>
                                    <td>
                                        <span class="dd-feedback__progress" :class="`is-${report.progress.replace('_', '-')}`">{{ PROGRESS_LABELS[report.progress] }}</span>
                                        <span v-if="report.fixedIn" class="dd-overview__muted"> {{ report.fixedIn }}</span>
                                    </td>
                                    <td class="summary">{{ report.contentPurgedAt ? '（內容已清除）' : report.description }}</td>
                                    <td>{{ formatRelative(report.createdAt) }}</td>
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
                                <td class="check" @click.stop>
                                    <input type="checkbox" :checked="checked.has(report.id)" :aria-label="`勾選 #${report.id}`" @change="setChecked([report.id], ($event.target as HTMLInputElement).checked)" />
                                </td>
                                <td>#{{ report.id }}</td>
                                <td>
                                    {{ whoLabel(report) }}
                                    <span v-if="report.reporterName !== null" class="dd-feedback__source">沒綁定</span>
                                </td>
                                <td>
                                    {{ KIND_LABELS[report.kind] ?? report.kind }}
                                    <span v-if="report.source !== 'app'" class="dd-feedback__source">{{ SOURCE_LABELS[report.source] }}</span>
                                </td>
                                <td>
                                    <span class="dd-status" :class="report.status === 'pending' ? 'is-pending' : report.status === 'rejected' ? 'is-frozen' : 'is-active'">
                                        {{ STATUS_LABELS[report.status] }}
                                    </span>
                                </td>
                                <td>
                                    <span class="dd-feedback__progress" :class="`is-${report.progress.replace('_', '-')}`">{{ PROGRESS_LABELS[report.progress] }}</span>
                                    <span v-if="report.fixedIn" class="dd-overview__muted"> {{ report.fixedIn }}</span>
                                </td>
                                <td class="summary">{{ report.contentPurgedAt ? '（內容已清除）' : report.description }}</td>
                                <td>{{ formatRelative(report.createdAt) }}</td>
                            </tr>
                            <tr v-if="!loading && reports.length === 0">
                                <td colspan="8" class="dd-table__empty">沒有符合的回報</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="dd-devices__pager">
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="page <= 1 || loading" @click="load(page - 1)">上一頁</button>
                    <span>第 {{ page }} / {{ pageCount }} 頁</span>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="page >= pageCount || loading" @click="load(page + 1)">下一頁</button>
                </div>
            </div>

            <!-- #region [P] 單則 -->
            <aside v-if="selectedId !== null" class="dd-detail t-panel-slide" :data-open="panel.open.value" aria-label="回報內容">
                <header class="dd-detail__header">
                    <h2>回報 #{{ selectedId }}</h2>
                    <button type="button" class="dd-detail__close" aria-label="關閉" @click="closeDetail">✕</button>
                </header>

                <p v-if="!detail" class="dd-detail__muted t-shimmer" data-text="載入中…">載入中…</p>
                <template v-else>
                    <dl class="dd-detail__info">
                        <div v-if="detail.reporterName !== null"><dt>回報者</dt><dd>{{ detail.reporterName }}（沒有綁定裝置）</dd></div>
                        <div v-else><dt>裝置</dt><dd>{{ detail.deviceName || '未命名' }}（#{{ detail.deviceId }}）</dd></div>
                        <div><dt>類型</dt><dd>{{ KIND_LABELS[detail.kind] ?? detail.kind }}</dd></div>
                        <div><dt>App 版本</dt><dd>{{ detail.appVersion || '—' }}</dd></div>
                        <div><dt>手機</dt><dd>{{ detail.deviceModel || '—' }}（Android {{ detail.androidVersion || '?' }}）</dd></div>
                        <div><dt>送出</dt><dd>{{ formatDateTime(detail.createdAt) }}</dd></div>
                        <div><dt>審核</dt><dd>{{ detail.reviewedBy ? `${detail.reviewedBy}（${formatDateTime(detail.reviewedAt)}）` : '還沒審' }}</dd></div>
                    </dl>

                    <section class="dd-detail__card">
                        <h3>內容</h3>
                        <p v-if="detail.contentPurgedAt" class="dd-detail__muted">內容已於 {{ formatDateTime(detail.contentPurgedAt) }} 清除，只留下計數。</p>
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
                                :class="{ 'dd-admin__btn--ghost': detail.status !== s }"
                                :disabled="busy || detail.status === s"
                                @click="review(s)"
                            >
                                {{ STATUS_LABELS[s] }}
                            </button>
                        </div>
                    </section>

                    <section class="dd-detail__card">
                        <h3>處理狀況</h3>
                        <p class="dd-detail__muted">
                            處理到哪了，跟採計分開、不影響分數。
                            <template v-if="detail.issueId">這則掛在「{{ detailIssueTitle }}」上：改那個問題的處理狀況會一起改這則。</template>
                        </p>
                        <div class="dd-detail__actions">
                            <button
                                v-for="p in PROGRESSES"
                                :key="p"
                                type="button"
                                class="dd-admin__btn"
                                :class="{ 'dd-admin__btn--ghost': detail.progress !== p }"
                                :disabled="busy || detail.progress === p"
                                @click="setProgress(p)"
                            >
                                {{ PROGRESS_LABELS[p] }}
                            </button>
                        </div>
                        <form class="dd-detail__actions" @submit.prevent="saveFixedIn">
                            <label class="dd-feedback__inline">
                                修在
                                <input v-model="fixedInDraft" type="text" class="dd-feedback__version" placeholder="例如 0.7.20" :disabled="busy" :aria-invalid="fixedInBad" />
                            </label>
                            <button type="submit" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy || fixedInBad || fixedInDraft.trim() === (detail.fixedIn ?? '')">
                                {{ fixedInDraft.trim() || !detail.fixedIn ? '記下版本' : '清掉版本' }}
                            </button>
                        </form>
                        <p v-if="fixedInBad" class="dd-admin__error">版本號：英數開頭，只能有英數、點、加號、減號，最多 20 字</p>
                    </section>

                    <!-- LINE、信件上的回報是後台替人建的：可以標成沒有綁定（他沒裝 App），之後裝了再綁回去。App 送的不能改 -->
                    <section v-if="detail.source !== 'app'" class="dd-detail__card">
                        <h3>回報者</h3>
                        <template v-if="detail.reporterName !== null">
                            <p class="dd-detail__muted">
                                沒有綁定裝置：不算分、不進名次與獎勵；採計了就列進 App 排行榜下面的「特別感謝」（只顯示名字）。
                                同名（不分大小寫）算同一個人。
                            </p>
                            <form class="dd-detail__actions" @submit.prevent="saveReporterName">
                                <label class="dd-feedback__inline">
                                    名稱
                                    <input v-model="nameDraft" type="text" list="dd-feedback-reporters" :disabled="busy" :aria-invalid="!!nameProblem" />
                                </label>
                                <button type="submit" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy || !!nameProblem || nameDraft.trim() === detail.reporterName">改名</button>
                                <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="filterReporter(detail.reporterName)">只看他的回報</button>
                            </form>
                            <form class="dd-detail__actions" @submit.prevent="bindToDevice">
                                <label class="dd-feedback__inline">
                                    他裝了 App：綁到裝置 #
                                    <input v-model="bindDraft" type="text" inputmode="numeric" class="dd-feedback__version" placeholder="裝置 id" :disabled="busy" />
                                </label>
                                <button type="submit" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy || bindId === null">綁定</button>
                            </form>
                            <p class="dd-detail__muted">綁定後照原本的規則算分（同一個問題裡講得早的照樣拿全額）。裝置 id 在「裝置」分頁找。</p>
                        </template>
                        <template v-else>
                            <p class="dd-detail__muted">
                                現在掛在 {{ detail.deviceName || `#${detail.deviceId}` }} 上。如果是替沒裝 App 的人建的，改成沒有綁定：
                                這則就不算進這台的分數，採計了列進 App 的「特別感謝」。
                            </p>
                            <form class="dd-detail__actions" @submit.prevent="saveReporterName">
                                <label class="dd-feedback__inline">
                                    他的名字
                                    <input v-model="nameDraft" type="text" list="dd-feedback-reporters" placeholder="例如他在 LINE 上的名稱" :disabled="busy" />
                                </label>
                                <button type="submit" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy || !!nameProblem">改成沒有綁定</button>
                            </form>
                        </template>
                        <p v-if="nameDraft.trim() && nameProblem" class="dd-admin__error">{{ nameProblem }}</p>
                        <p class="dd-detail__muted">名字會給所有 App 使用者看到，用他同意公開的稱呼。</p>
                    </section>

                    <section v-if="detail.reporterName === null" class="dd-detail__card">
                        <h3>這台裝置</h3>
                        <p class="dd-detail__muted">
                            同一台一直送垃圾回報的話，這裡一次處理：只動還在「待審」的，已經採計的不會翻掉，一次最多 200 則。
                            凍結是另一件事、分開按。
                        </p>
                        <div v-if="confirmingDevice === detail.deviceId" class="dd-detail__actions">
                            <button type="button" class="dd-admin__btn dd-admin__btn--danger" :disabled="busy" @click="rejectDetailDevice">
                                確定：{{ detail.deviceName || `#${detail.deviceId}` }} 的待審全部不採計
                            </button>
                            <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirmingDevice = null">取消</button>
                        </div>
                        <div v-else-if="confirming === 'freeze'" class="dd-detail__actions">
                            <button type="button" class="dd-admin__btn dd-admin__btn--danger" :disabled="busy" @click="freezeDetailDevice">確定凍結 #{{ detail.deviceId }}</button>
                            <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirming = null">取消</button>
                        </div>
                        <div v-else class="dd-detail__actions">
                            <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirmingDevice = detail.deviceId">這台的待審全部不採計…</button>
                            <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirming = 'freeze'">凍結這台裝置…</button>
                        </div>
                    </section>

                    <section class="dd-detail__card">
                        <h3>跟哪一則是同一件事？</h3>
                        <p class="dd-detail__muted">
                            講同一件事的回報合併在一起：最早的那則採計回報拿全額權重、之後不同的人拿一半；
                            同一個人在同一個問題裡只算最早那一則，之後的 0 分、也不算件數（還是可以採計掛上來，看得出多少人反映）。
                            沒合併的採計回報算 1 分。
                        </p>

                        <template v-if="detail.issueId">
                            <p>已經合併到：<strong>{{ detailIssueTitle }}</strong></p>
                            <div class="dd-detail__actions">
                                <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="detachIssue">拆開（不算同一件）</button>
                            </div>
                        </template>

                        <MergePicker v-else :report="detail" :issues="issues" @merged="onMerged" />
                    </section>
                </template>
            </aside>
            <!-- #endregion -->
        </div>

        <datalist id="dd-feedback-reporters">
            <option v-for="reporter in reporters" :key="reporter.name" :value="reporter.name" />
        </datalist>

        <!-- #region [P] 問題清單：權重直接改 -->
        <section class="dd-overview__card dd-feedback__issues">
            <h3>問題（合併後的）</h3>
            <p class="sub">權重 1～100。改了之後所有人的分數與名次立刻跟著變。處理狀況與版本改了，掛在上面的回報會一起改。</p>
            <div class="dd-feedback__scroll dd-table-scroll">
                <table class="dd-table dd-table--static">
                    <thead>
                        <tr>
                            <th scope="col">問題</th>
                            <th scope="col" class="num">回報</th>
                            <th scope="col" class="num">採計</th>
                            <th scope="col" class="num">權重</th>
                            <th scope="col">處理</th>
                            <th scope="col">修在</th>
                            <th scope="col">建立</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="issue in issues" :key="issue.id">
                            <th scope="row">{{ issue.title }}</th>
                            <td class="num">{{ formatInt(issue.reports) }}</td>
                            <td class="num">{{ formatInt(issue.accepted) }}</td>
                            <td class="num">
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
                            <!-- 改了會一併改掛在上面的全部回報 -->
                            <td>
                                <select
                                    :value="issue.progress"
                                    :disabled="busy"
                                    :aria-label="`${issue.title} 的處理狀況`"
                                    @change="saveIssueProgress(issue, { progress: ($event.target as HTMLSelectElement).value as FeedbackProgress })"
                                >
                                    <option v-for="p in PROGRESSES" :key="p" :value="p">{{ PROGRESS_LABELS[p] }}</option>
                                </select>
                            </td>
                            <td>
                                <input
                                    type="text"
                                    class="dd-feedback__version"
                                    :value="issue.fixedIn ?? ''"
                                    placeholder="版本"
                                    :disabled="busy"
                                    :aria-label="`${issue.title} 修在哪一版`"
                                    @change="saveIssueProgress(issue, { fixedIn: ($event.target as HTMLInputElement).value.trim() || null })"
                                />
                            </td>
                            <td>{{ formatDateTime(issue.createdAt) }}</td>
                        </tr>
                        <tr v-if="!issues.length">
                            <td colspan="7" class="dd-table__empty">還沒有合併過的問題</td>
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
        // LINE、信件的回報：沒有截圖、log、App 版本，看列表就要知道
        &__source {
            padding: 0 6px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 6px;
            margin-left: 4px;
            color: var(--vp-c-text-2);
            font-size: 12px;
        }
        @include setFlex(flex-start, stretch, 16px, column);

        // 問題清單的欄位多，窄螢幕讓它自己左右捲，不要撐破版面
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
            .check {
                width: 32px;
                padding-right: 0;
            }

            // 同一台的群組列：底色稍深、粗體，按鈕放在同一列的右邊
            tr.group {
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
            tr.child td:nth-child(2) { padding-left: 28px; }
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
        .summary {
            max-width: 22em;
            text-overflow: ellipsis;
            overflow: hidden;
        }

        // 詳情打開時列表窄了，內容只露開頭（點開的那則在右邊看得到全文）
        .has-detail .summary { max-width: 9em; }
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

    // 處理狀況：跟採計的徽章同一個形狀，顏色照後台的慣例——黃是在做的事、綠是做完、還沒處理只留字（大部分都是它，上色會吵）
    .dd-feedback__progress {
        padding: 2px 8px;
        border-radius: 999px;
        color: var(--vp-c-text-2);
        font-size: var(--font-size-xs);
        font-weight: 600;
        white-space: nowrap;

        &.is-in-progress {
            background: var(--vp-c-warning-soft);
            color: var(--vp-c-text-1);
        }
        &.is-done {
            background: var(--vp-c-green-soft);
            color: var(--vp-c-text-1);
        }
        &.is-wont-do {
            background: var(--vp-c-default-soft);
            color: var(--vp-c-text-3);
        }
    }

    .dd-feedback {
        // 統計卡多了「待處理」變七張：這頁的卡片字少，最小寬度放窄一點，桌機才排得進一排
        .dd-overview__tiles { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }

        // 版本號的輸入框只要放得下「0.7.20-beta」
        &__version {
            background: var(--vp-c-bg-soft);
            width: 104px;
            padding: 4px 8px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 6px;
            color: var(--vp-c-text-1);

            &[aria-invalid=true] { border-color: var(--vp-c-danger-1); }
        }
        &__inline {
            @include setFlex(flex-start, center, 6px);
            font-size: var(--font-size-s);

            input[type=text]:not(.dd-feedback__version) {
                background: var(--vp-c-bg-soft);
                width: 160px;
                padding: 4px 8px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 6px;
                color: var(--vp-c-text-1);
            }
        }

        // 「只看某一位」的篩選：看得到、一鍵拿掉
        &__chip {
            @include setFlex(flex-start, center, 6px);
            background: var(--vp-c-brand-soft);
            padding: 4px 6px 4px 12px;
            border-radius: 999px;

            button {
                width: 22px;
                height: 22px;
                border-radius: 50%;
                color: var(--vp-c-text-2);

                &:hover { background: var(--vp-c-default-soft); }
            }
        }
        &__issues select {
            background: var(--vp-c-bg-soft);
            padding: 2px 8px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 6px;
            color: var(--vp-c-text-1);
        }
    }
</style>
