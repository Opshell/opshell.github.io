<script setup lang="ts">
    import type { FeedbackIssue, FeedbackKind, FeedbackReport, FeedbackStatus } from '../api';
    import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { adminApi, AdminApiError } from '../api';
    import { formatDateTime, KIND_LABELS } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import MergePicker from './MergePicker.vue';

    // 快速審核：一次只看一則待審的，用鍵盤判完就自動跳下一則。
    //
    // 為什麼另外做一個畫面：列表那邊是「找某一則」用的，一則要點三次（選列、讀、按判定）；
    // beta 期間待審的會一次進來幾十則，那樣一則要十幾秒。這裡把一則需要的東西一次攤開，
    // 判定只要按一個鍵，下一則的截圖在背景先抓好，所以按完幾乎沒有等待。
    //
    // **一則盡量只打一次 API**：後台每個 IP 每分鐘只能打 30 次（後端 main.go 的限流），
    // 手速快的話很容易撞到。列表回來的資料已經含內容、機型、截圖清單，所以這裡不再逐則打
    // `GET /v1/admin/feedback/:id`——只有截圖（一張一次）與展開除錯紀錄時才多打。
    // 沒有截圖的一則＝只花一次 PATCH，一分鐘判 30 則不會被擋。
    const { issues, kind } = defineProps<{ issues: FeedbackIssue[]; kind: FeedbackKind }>();
    const emit = defineEmits<{ 'close': [changed: boolean]; 'issues-changed': [] }>();

    const call = useAdminCall();

    /** 一批最多 50 則；審完這批會自己再抓下一批 */
    const PER_PAGE = 50;

    const queue = ref<FeedbackReport[]>([]);
    const index = ref(0);
    const shots = ref<{ position: number; url: string }[]>([]);
    /** 除錯紀錄只有單則 API 才有，展開才抓 */
    const log = ref('');
    const logLoading = ref(false);
    const loading = ref(true);
    const busy = ref(false);
    const error = ref('');
    const done = ref(0);
    /** 剛剛做了什麼，可以按 U 復原 */
    const lastAction = ref<{ id: number; from: FeedbackStatus; to: FeedbackStatus } | null>(null);

    const current = computed(() => queue.value[index.value] ?? null);
    /** 還沒判的則數。跳過不會讓它變少——跳過的還在佇列裡，只是先往後看 */
    const left = computed(() => queue.value.length);
    const canPrev = computed(() => index.value > 0);
    const canNext = computed(() => index.value < queue.value.length - 1);

    const DECISIONS: { key: string; status: FeedbackStatus; label: string }[] = [
        { key: '1', status: 'accepted_bug', label: '採計為 bug' },
        { key: '2', status: 'accepted_suggestion', label: '採計為建議' },
        { key: '3', status: 'rejected', label: '不採計' }
    ];

    // #region [P] 抓資料
    function releaseShots() {
        shots.value.forEach(s => URL.revokeObjectURL(s.url));
        shots.value = [];
    }

    /** 下一則的截圖先抓好放這裡，按完判定就不用等 */
    const prefetched = new Map<number, { position: number; url: string }[]>();

    /** 截圖要帶登入憑證，不能直接 <img src>：取回來轉成 blob URL */
    async function fetchShots(report: FeedbackReport) {
        const loaded: { position: number; url: string }[] = [];
        for (const position of report.screenshots ?? []) {
            const blob = await call(token => adminApi.feedbackScreenshot(token, report.id, position));
            loaded.push({ position, url: URL.createObjectURL(blob) });
        }
        return loaded;
    }

    async function show(report: FeedbackReport) {
        releaseShots();
        log.value = '';
        error.value = '';
        const ready = prefetched.get(report.id);
        if (ready) {
            prefetched.delete(report.id);
            shots.value = ready;
        } else if (report.screenshots?.length) {
            try {
                const fresh = await fetchShots(report);
                if (current.value?.id !== report.id) return fresh.forEach(s => URL.revokeObjectURL(s.url)); // 期間又跳走了
                shots.value = fresh;
            } catch (e) {
                error.value = errorMessage(e);
            }
        }
        prefetchNext();
    }

    /** 背景抓下一則的截圖，失敗就算了（輪到它時會再抓一次） */
    async function prefetchNext() {
        const next = queue.value[index.value + 1];
        if (!next || !next.screenshots?.length || prefetched.has(next.id)) return;
        try {
            prefetched.set(next.id, await fetchShots(next));
        } catch {
            prefetched.delete(next.id);
        }
    }

    /** 展開「附加的除錯紀錄」才抓單則——只有它在列表裡沒有 */
    async function loadLog() {
        const report = current.value;
        if (!report || log.value || logLoading.value) return;
        logLoading.value = true;
        try {
            log.value = (await call(token => adminApi.getFeedback(token, report.id))).report.log || '（這一則沒有附除錯紀錄）';
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            logLoading.value = false;
        }
    }

    async function loadQueue() {
        loading.value = true;
        error.value = '';
        try {
            const list = await call(token => adminApi.listFeedback(token, { status: 'pending', kind, page: 1, perPage: PER_PAGE }));
            queue.value = list.reports;
            index.value = 0;
            if (queue.value.length) await show(queue.value[0]);
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }
    // #endregion

    // #region [P] 操作
    function step(delta: number) {
        const next = index.value + delta;
        if (next < 0 || next >= queue.value.length) return;
        index.value = next;
        show(queue.value[next]);
    }

    async function decide(status: FeedbackStatus) {
        const report = current.value;
        if (!report || busy.value) return;
        busy.value = true;
        error.value = '';
        try {
            await call(token => adminApi.reviewFeedback(token, report.id, { status }));
            lastAction.value = { id: report.id, from: report.status, to: status };
            done.value += 1;
            // 判完就從佇列拿掉：留著只會讓「剩幾則」對不上，也容易重複判
            queue.value.splice(index.value, 1);
            if (index.value >= queue.value.length) index.value = Math.max(queue.value.length - 1, 0);
            if (queue.value.length) await show(queue.value[index.value]);
            else releaseShots();
        } catch (e) {
            error.value = e instanceof AdminApiError && e.status === 429
                ? '手太快了：後台每分鐘最多 30 次請求，等一下下再繼續（剛剛那一則沒有判到）'
                : errorMessage(e);
        } finally {
            busy.value = false;
        }
    }

    /**
     * 判錯了按 U：把狀態改回原本的，那一則**放回它原本的位置**（也就是現在這一格），
     * 畫面直接跳回那一則。放到佇列最後面的話，人會卡在結尾，按下一則也沒反應
     */
    async function undo() {
        const last = lastAction.value;
        if (!last || busy.value) return;
        busy.value = true;
        try {
            const result = await call(token => adminApi.reviewFeedback(token, last.id, { status: last.from }));
            lastAction.value = null;
            done.value = Math.max(done.value - 1, 0);
            if (last.from === 'pending') {
                queue.value.splice(index.value, 0, result.report);
                await show(result.report);
            }
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }

    /**
     * 合併完（MergePicker）：只更新這一列的 issue_id，**不自動判定**——
     * 合併與採不採計是兩件事，有時候要先看完同一件事的其他則。問題清單由上一層重抓
     */
    function onMerged(issueId: number) {
        const report = current.value;
        if (report) queue.value[index.value] = { ...report, issue_id: issueId };
        emit('issues-changed');
    }
    // #endregion

    // #region [P] 鍵盤
    /** 在輸入框裡打字時不要把 1、3 當成判定 */
    const typing = (target: EventTarget | null) => {
        const el = target as HTMLElement | null;
        return !!el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    };

    function onKey(event: KeyboardEvent) {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === 'Escape') return emit('close', done.value > 0);
        if (typing(event.target)) return;

        const decision = DECISIONS.find(d => d.key === event.key);
        if (decision) {
            event.preventDefault();
            return void decide(decision.status);
        }
        if (event.key === 'ArrowRight' || event.key.toLowerCase() === 's') {
            event.preventDefault();
            return step(1);
        }
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            return step(-1);
        }
        if (event.key.toLowerCase() === 'u') {
            event.preventDefault();
            return void undo();
        }
    }
    // #endregion

    watch(() => kind, loadQueue);

    onMounted(() => {
        window.addEventListener('keydown', onKey);
        loadQueue();
    });
    onBeforeUnmount(() => {
        window.removeEventListener('keydown', onKey);
        releaseShots();
        prefetched.forEach(entry => entry.forEach(s => URL.revokeObjectURL(s.url))); // 之前寫成 entry.shots，關閉時會 TypeError
        prefetched.clear();
    });
</script>

<template>
    <section class="dd-triage" aria-label="快速審核">
        <header class="dd-triage__bar">
            <div class="dd-triage__progress">
                <strong>快速審核</strong>
                <span v-if="!loading && left">這批審了 {{ done }} 則 · 還剩 {{ left }} 則 · 現在第 {{ index + 1 }} 則</span>
                <span v-else-if="!loading">這批審了 {{ done }} 則</span>
                <span v-else>載入中…</span>
            </div>
            <div class="dd-triage__keys" aria-hidden="true">
                <kbd>1</kbd> bug<kbd>2</kbd>建議<kbd>3</kbd>不採計<kbd>S</kbd>跳過<kbd>U</kbd>復原<kbd>Esc</kbd>離開
            </div>
            <button type="button" class="dd-admin__btn is-ghost" @click="emit('close', done > 0)">離開</button>
        </header>

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>

        <p v-if="!loading && !queue.length" class="dd-triage__empty" role="status">
            待審的都審完了 🎉
            <button type="button" class="dd-admin__btn" :disabled="busy" @click="loadQueue">再抓一批</button>
        </p>

        <article v-else-if="current" class="dd-triage__card">
            <header class="dd-triage__head">
                <span class="dd-status is-pending">待審</span>
                <strong>#{{ current.id }}</strong>
                <span>{{ KIND_LABELS[current.kind] ?? current.kind }}</span>
                <span>{{ current.device_name || `裝置 #${current.device_id}` }}</span>
                <span class="dd-triage__muted">{{ current.app_version || '?' }} · {{ current.device_model || '?' }} · Android {{ current.android_version || '?' }}</span>
                <span class="dd-triage__muted">{{ formatDateTime(current.created_at) }}</span>
            </header>

            <div class="dd-triage__body">
                <div class="dd-triage__text">
                    <p v-if="current.content_purged_at" class="dd-triage__muted">內容已清除，只留下計數。</p>
                    <p v-else class="dd-feedback__desc">{{ current.description }}</p>

                    <details @toggle="loadLog">
                        <summary>附加的除錯紀錄</summary>
                        <p v-if="logLoading" class="dd-triage__muted">載入中…</p>
                        <pre v-else-if="log" class="dd-feedback__log">{{ log }}</pre>
                    </details>
                </div>

                <div v-if="shots.length" class="dd-triage__shots">
                    <a v-for="shot in shots" :key="shot.position" :href="shot.url" target="_blank" rel="noopener">
                        <img :src="shot.url" :alt="`截圖 ${shot.position + 1}`" />
                    </a>
                </div>
            </div>

            <footer class="dd-triage__foot">
                <div class="dd-triage__actions">
                    <button
                        v-for="d in DECISIONS"
                        :key="d.status"
                        type="button"
                        class="dd-admin__btn"
                        :class="{ 'is-ghost': d.status === 'rejected' }"
                        :disabled="busy"
                        @click="decide(d.status)"
                    >
                        <kbd aria-hidden="true">{{ d.key }}</kbd>{{ d.label }}
                    </button>
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="busy || !canPrev" @click="step(-1)">
                        <kbd aria-hidden="true">←</kbd>上一則
                    </button>
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="busy || !canNext" @click="step(1)">
                        <kbd aria-hidden="true">S</kbd>跳過
                    </button>
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="busy || !lastAction" @click="undo">
                        <kbd aria-hidden="true">U</kbd>復原
                    </button>
                </div>

                <div class="dd-triage__merge">
                    <p v-if="current.issue_id" class="dd-triage__muted">
                        已經合併到「{{ issues.find(i => i.id === current!.issue_id)?.title ?? `#${current.issue_id}` }}」
                    </p>
                    <MergePicker v-else :key="current.id" :report="current" :issues="issues" @merged="onMerged" />
                </div>
            </footer>
        </article>
    </section>
</template>

<style lang="scss">
    .dd-triage {
        @include setFlex(flex-start, stretch, 12px, column);

        &__bar {
            @include setFlex(space-between, center, 12px);
            flex-wrap: wrap;
            background: var(--vp-c-bg-soft);
            padding: 10px 14px;
            border-radius: 12px;
        }
        &__progress {
            @include setFlex(flex-start, baseline, 10px);
            flex-wrap: wrap;
            font-size: var(--font-size-s);
        }
        &__keys {
            @include setFlex(flex-start, center, 4px);
            flex-wrap: wrap;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-xs);

            kbd { margin-left: 8px; }
            @include setRWD(700px) { display: none; } // 手機沒有鍵盤，提示只會佔位置
        }
        &__muted {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
        &__empty {
            @include setFlex(center, center, 12px);
            padding: 48px 16px;
            font-size: var(--font-size-l);
        }

        &__card {
            @include setFlex(flex-start, stretch, 14px, column);
            padding: 16px 18px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 12px;
        }
        &__head {
            @include setFlex(flex-start, center, 6px 12px);
            flex-wrap: wrap;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vp-c-divider);
            font-size: var(--font-size-s);
        }
        &__body {
            @include setFlex(flex-start, flex-start, 20px);
            flex-wrap: wrap;
            @include setRWD(900px) { flex-direction: column; }
        }
        &__text {
            flex: 1 1 340px;
            min-width: 0;

            .dd-feedback__desc { font-size: var(--font-size-l); }
            details { margin-top: 12px; }

            // 換成上下排之後，flex-basis 會變成「高度」，文字下面會多出一大塊空白
            @include setRWD(900px) { flex: 0 0 auto; }
        }
        &__shots {
            @include setFlex(flex-start, flex-start, 8px);
            flex-wrap: wrap;

            img {
                max-height: 260px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
            }
        }
        &__foot {
            @include setFlex(flex-start, stretch, 10px, column);
            padding-top: 12px;
            border-top: 1px solid var(--vp-c-divider);
        }
        &__actions {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;

            .dd-admin__btn {
                @include setFlex(center, center, 6px);
            }
        }
        &__merge { font-size: var(--font-size-s); }

        kbd {
            display: inline-block;
            background: var(--vp-c-bg);
            min-width: 20px;
            padding: 1px 5px;
            border: 1px solid var(--vp-c-divider);
            border-bottom-width: 2px;
            border-radius: 5px;
            color: var(--vp-c-text-1);
            font-family: var(--vp-font-family-mono);
            font-size: var(--font-size-xs);
            text-align: center;
        }
    }
</style>
