<script setup lang="ts">
    import type { FeedbackFilter, FeedbackIssue, FeedbackReport, FeedbackStats, FeedbackStatus } from '../api';
    import type { BarSeries } from '../charts/BarChart.vue';
    import type { ColumnPoint } from '../charts/ColumnChart.vue';
    import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { adminApi } from '../api';
    import ColumnChart from '../charts/ColumnChart.vue';
    import { formatDateTime, formatInt, formatRelative } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // beta 貢獻活動的回報審核（api.md 第 8 節）。
    // 計分規則在後端：同一個問題裡最早的那則採計回報拿全額權重、之後的拿一半；沒掛問題的採計回報算 1 分。
    // 所以這裡兩件事都要做得順：判採不採計，以及把講同一件事的回報合併成一個「問題」。
    const call = useAdminCall();

    const STATUS_LABELS: Record<FeedbackStatus, string> = {
        pending: '待審',
        accepted_bug: '採計為 bug',
        accepted_suggestion: '採計為建議',
        rejected: '不採計'
    };
    const STATUSES = Object.keys(STATUS_LABELS) as FeedbackStatus[];

    const status = ref<FeedbackFilter>('pending');
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

    const PER_PAGE = 50;
    const page = ref(1);
    const pageCount = computed(() => Math.max(Math.ceil(total.value / PER_PAGE), 1));

    async function load(nextPage = page.value) {
        loading.value = true;
        error.value = '';
        try {
            const [list, statsResult, issueList] = await call(token => Promise.all([
                adminApi.listFeedback(token, { status: status.value, page: nextPage, perPage: PER_PAGE }),
                adminApi.feedbackStats(token),
                adminApi.listIssues(token)
            ]));
            reports.value = list.reports;
            total.value = list.total;
            page.value = list.page;
            stats.value = statsResult;
            issues.value = issueList.issues ?? [];
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

    watch(selectedId, (next, prev) => { if (next !== prev) releaseShots(); });
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
            issues.value = issueList.issues ?? [];
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

    const issuePick = ref<number | ''>('');
    async function attachIssue() {
        if (!issuePick.value) return;
        const id = Number(issuePick.value);
        await mutate(async token => {
            await adminApi.addReportsToIssue(token, id, [selectedId.value!]);
            return adminApi.getFeedback(token, selectedId.value!);
        }, '已掛到問題上');
        issuePick.value = '';
    }

    const newIssue = ref({ title: '', weight: 1 });
    const newIssueError = computed(() => {
        const { title, weight } = newIssue.value;
        if (!title.trim()) return '';
        if (!Number.isInteger(weight) || weight < 1 || weight > 100) return '權重要是 1～100 的整數';
        return '';
    });
    async function createIssue() {
        if (!newIssue.value.title.trim() || newIssueError.value) return;
        await mutate(async token => {
            await adminApi.createIssue(token, { title: newIssue.value.title.trim(), weight: newIssue.value.weight, report_ids: [selectedId.value!] });
            return adminApi.getFeedback(token, selectedId.value!);
        }, '已建立問題並掛上這則');
        newIssue.value = { title: '', weight: 1 };
    }

    /** 改權重會立刻影響所有人的分數與名次，所以改完提示一下 */
    async function saveWeight(issue: FeedbackIssue, weight: number) {
        if (!Number.isInteger(weight) || weight < 1 || weight > 100 || weight === issue.Weight) return;
        busy.value = true;
        error.value = '';
        try {
            await call(token => adminApi.updateIssue(token, issue.ID, { weight }));
            const issueList = await call(token => adminApi.listIssues(token));
            issues.value = issueList.issues ?? [];
            notice.value = `「${issue.Title}」的權重改成 ${weight}，所有人的分數與名次都會跟著變`;
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
        <ul v-if="stats" class="dd-overview__tiles">
            <li v-for="tile in statTiles" :key="tile.label">
                <p class="label">{{ tile.label }}</p>
                <p class="value">{{ tile.value }}</p>
                <p class="hint">{{ tile.hint }}</p>
            </li>
        </ul>

        <article v-if="stats" class="dd-overview__card">
            <h3>每天的回報件數</h3>
            <p class="sub">近 14 天</p>
            <ColumnChart :points="perDayPoints" :series="perDaySeries" unit=" 則" :height="120" />
        </article>

        <div class="dd-feedback__toolbar">
            <label>
                狀態
                <select v-model="status" @change="load(1)">
                    <option value="all">全部</option>
                    <option v-for="s in STATUSES" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
                </select>
            </label>
            <button type="button" class="dd-admin__btn is-ghost" :disabled="loading" @click="load()">重新整理</button>
            <span class="dd-overview__muted">共 {{ formatInt(total) }} 則</span>
        </div>
        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-detail__notice" role="status">✓ {{ notice }}</p>

        <div class="dd-devices__layout" :class="{ 'has-detail': selectedId !== null }">
            <div class="dd-devices__table-wrap">
                <table class="dd-table">
                    <thead>
                        <tr>
                            <th scope="col">ID</th>
                            <th scope="col">裝置</th>
                            <th scope="col">類型</th>
                            <th scope="col">狀態</th>
                            <th scope="col">內容</th>
                            <th scope="col">送出</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="report in reports"
                            :key="report.id"
                            :class="{ 'is-selected': report.id === selectedId }"
                            tabindex="0"
                            @click="openReport(report.id)"
                            @keydown.enter="openReport(report.id)"
                        >
                            <td>#{{ report.id }}</td>
                            <td>{{ report.device_name || `#${report.device_id}` }}</td>
                            <td>{{ report.kind === 'bug' ? 'bug' : '建議' }}</td>
                            <td>
                                <span class="dd-status" :class="report.status === 'pending' ? 'is-pending' : report.status === 'rejected' ? 'is-frozen' : 'is-active'">
                                    {{ STATUS_LABELS[report.status] }}
                                </span>
                            </td>
                            <td class="is-summary">{{ report.content_purged_at ? '（內容已清除）' : report.description }}</td>
                            <td>{{ formatRelative(report.created_at) }}</td>
                        </tr>
                        <tr v-if="!loading && reports.length === 0">
                            <td colspan="6" class="dd-table__empty">沒有符合的回報</td>
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
                        <div><dt>類型</dt><dd>{{ detail.kind === 'bug' ? 'bug' : '建議' }}</dd></div>
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
                        <h3>合併成問題</h3>
                        <p class="dd-detail__muted">
                            同一個問題裡，最早的那則採計回報拿全額權重、之後的拿一半。沒掛問題的採計回報算 1 分。
                        </p>

                        <template v-if="detail.issue_id">
                            <p>目前掛在：<strong>{{ issues.find(i => i.ID === detail.issue_id)?.Title ?? `#${detail.issue_id}` }}</strong></p>
                            <div class="dd-detail__actions">
                                <button type="button" class="dd-admin__btn is-ghost" :disabled="busy" @click="detachIssue">從問題上拿下來</button>
                            </div>
                        </template>

                        <template v-else>
                            <div class="dd-detail__field">
                                <span>掛到既有問題</span>
                                <select v-model="issuePick">
                                    <option value="">選一個…</option>
                                    <option v-for="issue in issues" :key="issue.ID" :value="issue.ID">{{ issue.Title }}（權重 {{ issue.Weight }}）</option>
                                </select>
                                <button type="button" class="dd-admin__btn" :disabled="!issuePick || busy" @click="attachIssue">掛上去</button>
                            </div>

                            <div class="dd-detail__field">
                                <span>或建立新問題</span>
                                <input v-model="newIssue.title" type="text" placeholder="問題標題" />
                                <input v-model.number="newIssue.weight" type="number" min="1" max="100" aria-label="權重 1～100" />
                                <button type="button" class="dd-admin__btn" :disabled="!newIssue.title.trim() || !!newIssueError || busy" @click="createIssue">建立並掛上</button>
                            </div>
                            <p v-if="newIssueError" class="dd-admin__error">{{ newIssueError }}</p>
                        </template>
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
                        <tr v-for="issue in issues" :key="issue.ID">
                            <th scope="row">{{ issue.Title }}</th>
                            <td class="is-num">{{ formatInt(issue.reports) }}</td>
                            <td class="is-num">{{ formatInt(issue.accepted) }}</td>
                            <td class="is-num">
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    :value="issue.Weight"
                                    :disabled="busy"
                                    :aria-label="`${issue.Title} 的權重`"
                                    @change="saveWeight(issue, Number(($event.target as HTMLInputElement).value))"
                                />
                            </td>
                            <td>{{ formatDateTime(issue.CreatedAt) }}</td>
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
