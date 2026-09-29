<script setup lang="ts">
    import type { Draft } from '../lineImport';
    import type { AdminDevice, FeedbackIssue, TriageResult } from '../schemas/admin.schema';
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { adminApi, AdminApiError } from '../api';
    import { formatInt } from '../format';
    import { draftFrom, draftProblem, planImport, quickPicks, rememberPick, searchDevices } from '../lineImport';
    import { REPORT_DESCRIPTION_MAX, TRIAGE_IMAGE_BYTES, TRIAGE_IMAGE_MAX, TRIAGE_TEXT_MAX } from '../schemas/admin.schema';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 匯入 LINE（或信件）上的回報（api.md 第 8 節，溝通板 #0068）。
    // 兩步，中間一定有人：AI 整理（不寫入）→ 管理員逐則選是誰、改內容、決定合併 → 建成正式回報。
    // AI 整理出來的文字是別人在 LINE 上打的字，照一般使用者輸入處理：只用 {{ }} 顯示，不用 v-html。
    const emit = defineEmits<{ done: [created: number]; close: [] }>();
    const call = useAdminCall();

    const KIND_TEXT = { bug: 'bug', suggestion: '建議', not_feedback: '不是回報' } as const;
    const CONFIDENCE_TEXT = { high: '有把握', medium: '大概', low: '不太確定' } as const;

    // #region [P] 第一步：貼上對話與截圖

    interface Shot { base64: string; url: string; bytes: number; name: string }

    const source = ref<'line' | 'email'>('line');
    const text = ref('');
    const shots = ref<Shot[]>([]);
    const busy = ref(false);
    const error = ref('');
    const textLength = computed(() => [...text.value].length);
    const canTriage = computed(() => !busy.value && (text.value.trim() !== '' || shots.value.length > 0) && textLength.value <= TRIAGE_TEXT_MAX);

    async function blobToBase64(blob: Blob): Promise<string> {
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
        return dataUrl.slice(dataUrl.indexOf(',') + 1);
    }

    /** 手機截圖常常超過 1 MB 或是 webp：縮小、轉成 JPEG，直到 1 MB 以內 */
    async function shrink(file: File): Promise<Blob> {
        if ((file.type === 'image/jpeg' || file.type === 'image/png') && file.size <= TRIAGE_IMAGE_BYTES) return file;
        const bitmap = await createImageBitmap(file);
        let scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
        for (let attempt = 0; attempt < 6; attempt++) {
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(bitmap.width * scale);
            canvas.height = Math.round(bitmap.height * scale);
            canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
            if (blob && blob.size <= TRIAGE_IMAGE_BYTES) return blob;
            scale *= 0.75;
        }
        throw new Error(`${file.name} 縮不到 1 MB 以內`);
    }

    async function addFiles(files: Iterable<File>) {
        error.value = '';
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            if (shots.value.length >= TRIAGE_IMAGE_MAX) {
                error.value = `截圖最多 ${TRIAGE_IMAGE_MAX} 張，多的請分批整理`;
                return;
            }
            try {
                const blob = await shrink(file);
                shots.value.push({ base64: await blobToBase64(blob), url: URL.createObjectURL(blob), bytes: blob.size, name: file.name || '貼上的圖片' });
            } catch (e) {
                error.value = errorMessage(e);
            }
        }
    }

    function removeShot(index: number) {
        URL.revokeObjectURL(shots.value[index].url);
        shots.value.splice(index, 1);
    }

    const onPick = (event: Event) => {
        const input = event.target as HTMLInputElement;
        void addFiles(input.files ?? []);
        input.value = '';
    };
    const onDrop = (event: DragEvent) => void addFiles(event.dataTransfer?.files ?? []);
    /** 直接 Ctrl+V 貼截圖；貼的是文字就照常進輸入框 */
    const onPaste = (event: ClipboardEvent) => {
        const files = [...(event.clipboardData?.files ?? [])].filter(file => file.type.startsWith('image/'));
        if (!files.length) return;
        event.preventDefault();
        void addFiles(files);
    };

    // #endregion

    // #region [P] 第二步：逐則確認

    const result = ref<TriageResult | null>(null);
    const drafts = ref<Draft[]>([]);
    const devices = ref<AdminDevice[]>([]);
    const issues = ref<FeedbackIssue[]>([]);
    /** 每一則選裝置的搜尋字 */
    const queries = ref<string[]>([]);
    /** 建立的結果：成功的記回報 id，失敗的記原因 */
    const outcomes = ref<({ id: number } | { error: string } | null)[]>([]);

    const deviceById = computed(() => new Map(devices.value.map(device => [device.id, device])));
    const deviceLabel = (id: number | null) => {
        const device = id === null ? undefined : deviceById.value.get(id);
        return device ? `#${device.id} ${device.displayName}${device.email ? ` · ${device.email}` : ''}` : '';
    };
    const pending = computed(() => drafts.value.map((draft, index) => ({ draft, index })).filter(({ draft, index }) => draft.include && !isCreated(index)));
    const problems = computed(() => pending.value.map(({ draft, index }) => ({ index, problem: draftProblem(draft) })).filter(p => p.problem));
    const plan = computed(() => planImport(drafts.value.map((draft, index) => (isCreated(index) ? { ...draft, include: false } : draft)), source.value));
    const skipped = computed(() => result.value?.items.filter(item => item.kind === 'not_feedback').length ?? 0);

    function isCreated(index: number) {
        const outcome = outcomes.value[index];
        return !!outcome && 'id' in outcome;
    }

    async function triage() {
        if (!canTriage.value) return;
        busy.value = true;
        error.value = '';
        try {
            const [triaged, allDevices, allIssues] = await call(async token => Promise.all([
                adminApi.triageFeedback(token, { text: text.value, images: shots.value.map(shot => shot.base64) }),
                devices.value.length ? Promise.resolve({ devices: devices.value }) : adminApi.listAllDevices(token),
                adminApi.listIssues(token)
            ]));
            devices.value = allDevices.devices;
            issues.value = [...allIssues].sort((a, b) => b.id - a.id);
            result.value = triaged;
            drafts.value = triaged.items.map(item => draftFrom(item, devices.value));
            queries.value = triaged.items.map(() => '');
            outcomes.value = triaged.items.map(() => null);
        } catch (e) {
            const hint = e instanceof AdminApiError && e.status === 502 ? '（內容很長時最常見：分段貼再試一次）' : '';
            error.value = `${errorMessage(e)}${hint}`;
        } finally {
            busy.value = false;
        }
    }

    function backToInput() {
        result.value = null;
        error.value = '';
    }

    // #region [P] 快選人選：這批選過的、這個瀏覽器最近選過的、常回報的

    // 最近選過的只是這個瀏覽器的方便，存不了（無痕、被擋）就當沒有
    const RECENT_KEY = 'dd-admin-line-import-recent';
    function loadRecent(): number[] {
        try {
            const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
            return Array.isArray(saved) ? saved.filter((id): id is number => Number.isInteger(id)) : [];
        } catch {
            return [];
        }
    }
    const recent = ref<number[]>([]);

    /** 第 index 則的快選：其他幾則已經選好的人排最前面 */
    const picksFor = (index: number) => quickPicks(devices.value, {
        pickedInBatch: drafts.value.flatMap((draft, other) => (other !== index && draft.deviceId !== null ? [draft.deviceId] : [])),
        recent: recent.value
    });

    function pickDevice(index: number, device: AdminDevice) {
        drafts.value[index].deviceId = device.id;
        queries.value[index] = '';
        recent.value = rememberPick(recent.value, device.id);
        try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(recent.value));
        } catch {
            // 存不了就算了，下次只是少了「最近選過的」
        }
    }

    // #endregion

    const created = computed(() => outcomes.value.filter(outcome => outcome && 'id' in outcome).length);

    /** 先開新問題（同一個標題只開一個），再一則一則建回報。失敗的留著可以改了再按一次 */
    async function createAll() {
        if (busy.value || !pending.value.length || problems.value.length) return;
        busy.value = true;
        error.value = '';
        const current = plan.value;
        const issueIds = new Map<string, number>();
        try {
            for (const issue of current.issues) {
                const saved = await call(async token => adminApi.createIssue(token, { title: issue.title, weight: 1, reportIds: issue.reportIds }));
                issueIds.set(issue.title, saved.id);
                issues.value.unshift(saved);
            }
        } catch (e) {
            error.value = `開新問題失敗，回報都還沒建：${errorMessage(e)}`;
            busy.value = false;
            return;
        }
        // 問題開好了：同一組的每一則都改成「併到這個問題」。有一則建失敗、改了再按一次時，才不會又開一個同名的問題
        for (const draft of drafts.value) {
            const id = draft.merge === 'new' ? issueIds.get(draft.newIssueTitle.trim()) : undefined;
            if (id) Object.assign(draft, { merge: 'attach', issueId: id });
        }
        for (const report of current.reports) {
            const issueId = report.newIssueTitle ? issueIds.get(report.newIssueTitle) : undefined;
            try {
                const saved = await call(async token => adminApi.createFeedback(token, { ...report.payload, ...(issueId ? { issueId } : {}) }));
                outcomes.value[report.index] = { id: saved.id };
            } catch (e) {
                outcomes.value[report.index] = { error: errorMessage(e) };
            }
        }
        busy.value = false;
        if (!pending.value.length) emit('done', created.value);
    }

    // #endregion

    onMounted(async () => {
        recent.value = loadRecent();
        // 先把裝置抓好，按「交給 AI 整理」時就不用等
        try {
            devices.value = (await call(async token => adminApi.listAllDevices(token))).devices;
        } catch {
            // 整理時會再抓一次，錯誤在那時候顯示
        }
    });
    onBeforeUnmount(() => shots.value.forEach(shot => URL.revokeObjectURL(shot.url)));
</script>

<template>
    <section class="dd-line-import" @paste="onPaste">
        <header class="dd-line-import__head">
            <h3>匯入 LINE／信件上的回報</h3>
            <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="busy" @click="emit('close')">關閉</button>
        </header>

        <!-- #region [P] 第一步：貼上 -->
        <template v-if="!result">
            <p class="dd-line-import__muted">
                把對話整段貼上、截圖拖進來（或直接 Ctrl+V），AI 會拆成一則一則，並建議要併到哪個問題。這一步<strong>不會寫入任何東西</strong>，截圖也不會保存。
                LINE 聊天室右上角「≡ → 設定 → 傳送聊天紀錄」匯出的文字有每句的時間，分數算得比較準。
            </p>
            <div class="dd-line-import__row">
                <label>
                    來源
                    <select v-model="source" :disabled="busy">
                        <option value="line">LINE</option>
                        <option value="email">信件</option>
                    </select>
                </label>
            </div>
            <label class="dd-line-import__field">
                <span>對話</span>
                <textarea v-model="text" rows="10" :disabled="busy" placeholder="2026/09/28（一）&#10;21:03&#9;阿明&#9;我拍發票之後按儲存都沒反應欸" />
                <span class="count" :class="{ 'is-over': textLength > TRIAGE_TEXT_MAX }">{{ formatInt(textLength) }} / {{ formatInt(TRIAGE_TEXT_MAX) }}</span>
            </label>

            <div class="dd-line-import__drop" @dragover.prevent @drop.prevent="onDrop">
                <span>截圖拖到這裡，或</span>
                <label class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small">
                    選擇檔案
                    <input type="file" accept="image/*" multiple hidden :disabled="busy" @change="onPick" />
                </label>
                <span class="dd-line-import__muted">最多 {{ TRIAGE_IMAGE_MAX }} 張；超過 1 MB 的會自動縮小</span>
            </div>
            <ul v-if="shots.length" class="dd-line-import__shots">
                <li v-for="(shot, index) in shots" :key="shot.url">
                    <img :src="shot.url" :alt="shot.name" />
                    <button type="button" :aria-label="`移除 ${shot.name}`" :disabled="busy" @click="removeShot(index)">✕</button>
                </li>
            </ul>

            <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
            <div class="dd-line-import__row">
                <button type="button" class="dd-admin__btn" :disabled="!canTriage" @click="triage">{{ busy ? 'AI 整理中…' : '交給 AI 整理' }}</button>
                <span v-if="busy" class="dd-line-import__muted">通常 5 秒左右，長的對話最多 25 秒</span>
            </div>
        </template>
        <!-- #endregion -->

        <!-- #region [P] 第二步：逐則確認 -->
        <template v-else>
            <p class="dd-line-import__muted">
                拆出 {{ formatInt(result.items.length) }} 則<template v-if="skipped">，其中 {{ formatInt(skipped) }} 則不是回報（預設不匯入）</template>。
                AI 比對了 {{ formatInt(result.compared.issues) }} 個問題、{{ formatInt(result.compared.reports) }} 則回報，更舊的它沒看到。
                <button type="button" class="dd-line-import__link" :disabled="busy" @click="backToInput">← 改對話重新整理</button>
            </p>

            <ol class="dd-line-import__items">
                <li
                    v-for="(item, index) in result.items"
                    :key="index"
                    class="dd-line-import__item"
                    :class="{ 'is-off': !drafts[index].include, 'is-created': isCreated(index) }"
                >
                    <div class="dd-line-import__item-head">
                        <label class="dd-line-import__check">
                            <input v-model="drafts[index].include" type="checkbox" :disabled="busy || isCreated(index)" />
                            <strong>{{ item.title }}</strong>
                        </label>
                        <span class="dd-line-import__tag" :class="`dd-line-import__tag--${item.kind.replace('_', '-')}`">{{ KIND_TEXT[item.kind] }}</span>
                        <span class="dd-line-import__muted">{{ item.speaker || '看不出是誰' }} · AI {{ CONFIDENCE_TEXT[item.confidence] }}</span>
                    </div>
                    <p class="dd-line-import__reason">{{ item.reason }}</p>

                    <p v-if="isCreated(index)" class="dd-line-import__done">✓ 已建立回報 #{{ (outcomes[index] as { id: number }).id }}（{{ deviceLabel(drafts[index].deviceId) }}）</p>

                    <div v-else-if="drafts[index].include" class="dd-line-import__form">
                        <div class="dd-line-import__field">
                            <span>是誰</span>
                            <div class="dd-line-import__picker">
                                <p v-if="drafts[index].deviceId !== null" class="picked">
                                    {{ deviceLabel(drafts[index].deviceId) }}
                                    <button type="button" aria-label="重選" :disabled="busy" @click="drafts[index].deviceId = null">✕</button>
                                </p>
                                <template v-else>
                                    <input v-model="queries[index]" type="search" :placeholder="item.speaker ? `找「${item.speaker}」：暱稱、email、裝置 id` : '暱稱、email、裝置 id'" :disabled="busy" />
                                    <ul v-if="queries[index]" class="options">
                                        <li v-for="device in searchDevices(queries[index], devices)" :key="device.id">
                                            <button type="button" @click="pickDevice(index, device)">{{ deviceLabel(device.id) }}</button>
                                        </li>
                                        <li v-if="!searchDevices(queries[index], devices).length" class="none">找不到</li>
                                    </ul>
                                    <div v-else-if="picksFor(index).length" class="quick" role="group" aria-label="快選">
                                        <button v-for="device in picksFor(index)" :key="device.id" type="button" :disabled="busy" :title="deviceLabel(device.id)" @click="pickDevice(index, device)">
                                            {{ device.displayName }}<span>#{{ device.id }}</span>
                                        </button>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <div class="dd-line-import__grid">
                            <label class="dd-line-import__field">
                                <span>類型</span>
                                <select v-model="drafts[index].kind" :disabled="busy">
                                    <option value="bug">bug</option>
                                    <option value="suggestion">建議</option>
                                </select>
                            </label>
                            <label class="dd-line-import__field">
                                <span>審核</span>
                                <select v-model="drafts[index].review" :disabled="busy">
                                    <option value="accept">採計</option>
                                    <option value="pending">待審</option>
                                    <option value="rejected">不採計</option>
                                </select>
                            </label>
                            <label class="dd-line-import__field">
                                <span>他講的時間（台灣）</span>
                                <input v-model="drafts[index].saidAt" type="datetime-local" :disabled="busy" />
                            </label>
                        </div>
                        <p v-if="!drafts[index].saidAt" class="dd-line-import__warn">沒填時間就算「現在」：同一個問題最早講的人拿全額權重，他可能因此少拿分數</p>

                        <div class="dd-line-import__grid">
                            <label class="dd-line-import__field">
                                <span>合併</span>
                                <select v-model="drafts[index].merge" :disabled="busy">
                                    <option value="none">單獨一則</option>
                                    <option value="attach">併到既有問題</option>
                                    <option value="new">開新問題</option>
                                </select>
                            </label>
                            <label v-if="drafts[index].merge === 'attach'" class="dd-line-import__field dd-line-import__field--wide">
                                <span>問題</span>
                                <select v-model="drafts[index].issueId" :disabled="busy">
                                    <option :value="null" disabled>選一個問題</option>
                                    <option v-for="issue in issues" :key="issue.id" :value="issue.id">#{{ issue.id }} {{ issue.title }}（{{ formatInt(issue.reports) }} 則）</option>
                                </select>
                            </label>
                            <label v-if="drafts[index].merge === 'new'" class="dd-line-import__field dd-line-import__field--wide">
                                <span>新問題標題（同標題的會併成一個）</span>
                                <input v-model="drafts[index].newIssueTitle" type="text" :disabled="busy" />
                            </label>
                        </div>
                        <label v-if="drafts[index].duplicateReportIds.length" class="dd-line-import__check dd-line-import__muted">
                            <input v-model="drafts[index].withDuplicates" type="checkbox" :disabled="busy || drafts[index].merge !== 'new'" />
                            AI 說跟回報 {{ drafts[index].duplicateReportIds.map(id => `#${id}`).join('、') }} 講同一件事（它們還沒歸到問題）。
                            選「開新問題」時一起掛上去
                        </label>

                        <label class="dd-line-import__field dd-line-import__field--block">
                            <span>描述（會存成回報內容，照他的口吻）</span>
                            <textarea v-model="drafts[index].description" rows="3" :disabled="busy" />
                            <span class="count" :class="{ 'is-over': [...drafts[index].description].length > REPORT_DESCRIPTION_MAX }">
                                {{ formatInt([...drafts[index].description].length) }} / {{ formatInt(REPORT_DESCRIPTION_MAX) }}
                            </span>
                        </label>

                        <p v-if="draftProblem(drafts[index])" class="dd-line-import__warn">還不能建立：{{ draftProblem(drafts[index]) }}</p>
                        <p v-if="outcomes[index] && 'error' in outcomes[index]!" class="dd-admin__error">建立失敗：{{ (outcomes[index] as { error: string }).error }}</p>
                    </div>
                </li>
            </ol>

            <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
            <div class="dd-line-import__footer">
                <button type="button" class="dd-admin__btn" :disabled="busy || !pending.length || problems.length > 0" @click="createAll">
                    {{ busy ? '建立中…' : `建立 ${formatInt(pending.length)} 則回報` }}
                </button>
                <span class="dd-line-import__muted">
                    <template v-if="plan.issues.length">會先開 {{ formatInt(plan.issues.length) }} 個新問題（權重 1，之後在「問題」裡調）。</template>
                    <template v-if="problems.length">還有 {{ formatInt(problems.length) }} 則沒填完。</template>
                    <template v-if="created">已建立 {{ formatInt(created) }} 則。</template>
                </span>
            </div>
        </template>
        <!-- #endregion -->
    </section>
</template>

<style lang="scss">
    .dd-line-import {
        @include setFlex(flex-start, stretch, 14px, column);
        background: var(--vp-c-bg-soft);
        padding: 18px 20px;
        border: 1px solid var(--vp-c-divider);
        border-radius: 12px;
        margin-bottom: 20px;
        font-size: var(--font-size-s);

        &__head {
            @include setFlex(space-between, center, 12px);

            h3 { font-size: var(--font-size-m); }
        }
        &__muted {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
        &__row {
            @include setFlex(flex-start, center, 12px);
            flex-wrap: wrap;
        }
        &__field {
            @include setFlex(flex-start, flex-start, 4px, column);
            min-width: 0;

            > span:first-child { color: var(--vp-c-text-2); }
            .count {
                align-self: flex-end;
                color: var(--vp-c-text-3);
                font-size: 12px;

                &.is-over { color: var(--vp-c-danger-1); }
            }

            &--wide { flex: 1; }
            &--block { width: 100%; }
        }
        &__drop {
            @include setFlex(flex-start, center, 10px);
            flex-wrap: wrap;
            padding: 14px;
            border: 1px dashed var(--vp-c-divider);
            border-radius: 10px;
            color: var(--vp-c-text-2);
        }
        &__shots {
            @include setFlex(flex-start, flex-start, 8px);
            flex-wrap: wrap;
            padding: 0;
            margin: 0;
            list-style: none;

            li { position: relative; }
            img {
                display: block;
                @include setSize(72px, 120px);
                border: 1px solid var(--vp-c-divider);
                border-radius: 6px;
                object-fit: cover;
            }
            button {
                position: absolute;
                top: -6px;
                right: -6px;
                @include setSize(20px, 20px);
                background: var(--vp-c-bg);
                padding: 0;
                border: 1px solid var(--vp-c-divider);
                border-radius: 50%;
                color: var(--vp-c-text-1);
                font-size: 11px;
                cursor: pointer;
            }
        }
        &__link {
            background: transparent;
            padding: 0;
            border: 0;
            margin-left: 6px;
            color: var(--vp-c-brand-1);
            font-weight: 600;
            cursor: pointer;
        }

        // #region [P] 逐則
        &__items {
            @include setFlex(flex-start, stretch, 10px, column);
            padding: 0;
            margin: 0;
            list-style: none;
        }
        &__item {
            @include setFlex(flex-start, stretch, 10px, column);
            background: var(--vp-c-bg);
            padding: 14px 16px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 10px;

            &.is-off { opacity: .6; }
            &.is-created { border-color: var(--vp-c-green-2); }
        }
        &__item-head {
            @include setFlex(flex-start, center, 10px);
            flex-wrap: wrap;
        }
        &__check {
            @include setFlex(flex-start, center, 8px);
            cursor: pointer;

            input { flex-shrink: 0; }
        }
        &__tag {
            padding: 1px 8px;
            border-radius: 999px;
            font-size: 12px;

            &--bug { background: var(--vp-c-danger-soft); }
            &--suggestion { background: var(--vp-c-brand-soft); }
            &--not-feedback {
                background: var(--vp-c-default-soft);
                color: var(--vp-c-text-2);
            }
        }
        &__reason {
            padding-left: 10px;
            border-left: 3px solid var(--vp-c-divider);
            color: var(--vp-c-text-2);
        }
        &__form {
            @include setFlex(flex-start, stretch, 10px, column);
        }
        &__grid {
            @include setFlex(flex-start, flex-end, 10px 16px);
            flex-wrap: wrap;
        }
        &__picker {
            position: relative;
            width: min(460px, 100%);

            .picked {
                @include setFlex(flex-start, center, 8px);
                background: var(--vp-c-green-soft);
                padding: 4px 10px;
                border-radius: 8px;

                button {
                    background: transparent;
                    border: 0;
                    color: var(--vp-c-text-2);
                    cursor: pointer;
                }
            }
            input { width: 100%; }

            // 快選：這批選過的、最近選過的、常回報的
            .quick {
                @include setFlex(flex-start, center, 6px);
                flex-wrap: wrap;
                margin-top: 6px;

                button {
                    background: var(--vp-c-default-soft);
                    padding: 2px 10px;
                    border: 1px solid transparent;
                    border-radius: 999px;
                    color: var(--vp-c-text-1);
                    font-size: 12px;
                    cursor: pointer;

                    &:hover { border-color: var(--vp-c-brand-1); }
                    span {
                        margin-left: 4px;
                        color: var(--vp-c-text-3);
                    }
                }
            }
            .options {
                position: absolute;
                top: 100%;
                right: 0;
                left: 0;
                background: var(--vp-c-bg);
                max-height: 240px;
                padding: 4px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                margin: 4px 0 0;
                box-shadow: var(--vp-shadow-3);
                list-style: none;
                overflow: auto;
                z-index: 5;

                button {
                    background: transparent;
                    width: 100%;
                    padding: 6px 8px;
                    border: 0;
                    border-radius: 6px;
                    color: var(--vp-c-text-1);
                    text-align: left;
                    cursor: pointer;

                    &:hover { background: var(--vp-c-default-soft); }
                }
                .none {
                    padding: 6px 8px;
                    color: var(--vp-c-text-2);
                }
            }
        }
        &__warn { color: var(--vp-c-warning-1); }
        &__done { color: var(--vp-c-green-1); }
        &__footer {
            @include setFlex(flex-start, center, 12px);
            flex-wrap: wrap;
        }

        // #endregion

        input[type=text], input[type=search], input[type=datetime-local], select, textarea {
            background: var(--vp-c-bg);
            max-width: 100%;
            padding: 4px 10px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
        }
        textarea {
            width: 100%;
            font-family: inherit;
            line-height: 1.6;
            resize: vertical;
        }
        &__field--wide select, &__field--wide input { width: 100%; }
    }
</style>
