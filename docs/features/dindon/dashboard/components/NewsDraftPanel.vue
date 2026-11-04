<script setup lang="ts">
    import type { NewsDraftEdit } from '../appAdmin';
    import type { Announcement, NewsDraft, NewsDraftStatus, NewsScanReport } from '../schemas/admin.schema';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi, AdminApiError } from '../api';
    import { fromTaipeiLocal, newsDraftError, splitList, toTaipeiLocal } from '../appAdmin';
    import { formatDateTime } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 新聞示警草稿（Flowsker #532，後端 #531）。排程每 30 分鐘抓金融詐騙新聞、AI 擬一句示警，
    // 一定要人按發佈才變成示警公告：示警點名銀行，誤判會嚇到使用者、點錯名也有風險，所以發佈前讓人改字、改機構與代碼。
    // 發佈出去的公告交給外層的公告列表（emit published），之後改字、提早下架照一般公告做。
    const emit = defineEmits<{ published: [announcement: Announcement] }>();
    const call = useAdminCall();

    const loading = ref(false);
    const scanning = ref(false);
    /** 正在發佈或丟掉的那一則 */
    const busyId = ref<number | null>(null);
    const error = ref('');
    const notice = ref('');
    const scanReport = ref<NewsScanReport | null>(null);

    const filter = ref<'pending' | 'all'>('pending');
    const drafts = ref<NewsDraft[]>([]);
    const pendingCount = ref(0);
    const messageMax = ref(80);
    /** 每則待處理草稿發佈前改的內容；重新整理時沒動過的照新的草稿重填（排程會把新報導併進來） */
    const edits = ref<Record<number, NewsDraftEdit>>({});
    const touched = new Set<number>();
    /** 按過一次「發佈」、等確認的那一則 */
    const confirmingId = ref<number | null>(null);

    const STATUS_LABELS: Record<NewsDraftStatus, string> = { pending: '待處理', published: '已發佈', discarded: '已丟掉' };
    const errors = computed(() => Object.fromEntries(
        Object.entries(edits.value).map(([id, edit]) => [id, newsDraftError(edit, messageMax.value)])
    ) as Record<number, string>);

    function editFrom(draft: NewsDraft): NewsDraftEdit {
        const fallbackEnd = new Date(Date.now() + 3 * 86_400_000).toISOString();
        return {
            message: draft.message,
            institutions: draft.institutions.join('、'),
            bankCodes: draft.bankCodes.join(' '),
            // 後端沒給 link 時也是用第一篇來源；這裡先填好讓人看得到、清空就是不帶連結
            link: draft.sources[0]?.url.startsWith('https://') ? draft.sources[0].url : '',
            endsAt: toTaipeiLocal(draft.suggestedEndsAt ?? fallbackEnd)
        };
    }

    function syncEdits(list: NewsDraft[]) {
        const next: Record<number, NewsDraftEdit> = {};
        for (const draft of list) {
            if (draft.status !== 'pending') continue;
            next[draft.id] = touched.has(draft.id) && edits.value[draft.id] ? edits.value[draft.id] : editFrom(draft);
        }
        edits.value = next;
    }

    function markTouched(id: number) {
        touched.add(id);
        if (confirmingId.value === id) confirmingId.value = null;
    }

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            const list = await call(token => adminApi.listNewsDrafts(token, filter.value));
            drafts.value = list.drafts;
            pendingCount.value = list.pendingCount;
            messageMax.value = list.messageMax;
            syncEdits(list.drafts);
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    async function scan() {
        scanning.value = true;
        error.value = '';
        notice.value = '';
        scanReport.value = null;
        try {
            scanReport.value = await call(token => adminApi.scanNews(token));
            await load();
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            scanning.value = false;
        }
    }

    /** 換掉列表裡的那一則；只看待處理時，處理完的就拿掉 */
    function replaceDraft(saved: NewsDraft) {
        drafts.value = filter.value === 'pending' && saved.status !== 'pending'
            ? drafts.value.filter(item => item.id !== saved.id)
            : drafts.value.map(item => (item.id === saved.id ? saved : item));
        if (saved.status !== 'pending') pendingCount.value = Math.max(0, pendingCount.value - 1);
        syncEdits(drafts.value);
    }

    async function decide(draft: NewsDraft, action: 'publish' | 'discard') {
        const edit = edits.value[draft.id];
        if (!edit || busyId.value !== null) return;
        if (action === 'publish') {
            if (errors.value[draft.id]) return;
            // 兩段式：第一次按只顯示提醒，再按一次才發
            if (confirmingId.value !== draft.id) {
                confirmingId.value = draft.id;
                return;
            }
        }
        confirmingId.value = null;
        busyId.value = draft.id;
        error.value = '';
        notice.value = '';
        try {
            if (action === 'publish') {
                const body = {
                    message: edit.message.trim(),
                    institutions: splitList(edit.institutions),
                    bankCodes: splitList(edit.bankCodes),
                    // 一律明確送：空字串是不帶連結，不讓後端再補第一篇來源
                    link: edit.link.trim(),
                    endsAt: fromTaipeiLocal(edit.endsAt)
                };
                const result = await call(token => adminApi.publishNewsDraft(token, draft.id, body));
                replaceDraft(result.draft);
                emit('published', result.announcement);
                notice.value = `草稿 #${draft.id} 已發佈成示警公告 #${result.announcement.id}`;
            } else {
                const result = await call(token => adminApi.discardNewsDraft(token, draft.id));
                replaceDraft(result.draft);
                notice.value = `草稿 #${draft.id} 已丟掉`;
            }
        } catch (e) {
            const message = errorMessage(e);
            // 409：另一個管理員先發了或丟了，重拿一次看現況；load 會清掉錯誤，拿完再放回去
            if (e instanceof AdminApiError && e.status === 409) await load();
            error.value = message;
        } finally {
            busyId.value = null;
        }
    }

    /** 「發佈成公告 #3・boss@…・2026/11/04 10:07」 */
    function decisionText(draft: NewsDraft) {
        const head = draft.status === 'published' ? `發佈成公告 #${draft.announcementId}` : '丟掉了';
        return [head, draft.decidedBy, draft.decidedAt ? formatDateTime(draft.decidedAt) : ''].filter(Boolean).join('・');
    }

    function messageLength(id: number) {
        return [...(edits.value[id]?.message.trim() ?? '')].length;
    }

    onMounted(load);
</script>

<template>
    <section class="dd-app__card dd-news" aria-labelledby="dd-news-title">
        <header class="dd-app__head">
            <h2 id="dd-news-title">
                新聞示警草稿
                <span v-if="pendingCount" class="dd-news__count">{{ pendingCount }} 則待處理</span>
            </h2>
            <span class="dd-app__muted">排程每 30 分鐘抓金融詐騙新聞、AI 擬稿；要你按發佈才會發出去</span>
        </header>

        <div class="dd-news__bar">
            <select v-model="filter" aria-label="篩選草稿" @change="load">
                <option value="pending">只看待處理</option>
                <option value="all">全部（含已發佈、已丟掉）</option>
            </select>
            <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="loading" @click="load">重新整理</button>
            <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="scanning" @click="scan">
                {{ scanning ? '掃描中…' : '現在掃一輪新聞' }}
            </button>
        </div>

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-app__notice" role="status">✓ {{ notice }}</p>
        <p v-if="scanReport" class="dd-app__muted" role="status">
            這輪抓到 {{ scanReport.fetched }} 篇（新的 {{ scanReport.new }}），AI 判了 {{ scanReport.judged }} 篇、{{ scanReport.alerts }} 篇要示警；
            新草稿 {{ scanReport.draftsCreated.length }} 則，併進既有草稿 {{ scanReport.draftsMerged }} 篇{{ scanReport.waiting ? `，還有 ${scanReport.waiting} 篇留給下一輪` : '' }}。
        </p>

        <p v-if="!drafts.length && !loading" class="dd-app__empty">
            {{ filter === 'pending' ? '沒有待處理的草稿。' : '還沒有草稿。' }}
        </p>

        <article v-for="draft in drafts" :key="draft.id" class="dd-news__item" :class="`is-${draft.status}`">
            <header class="dd-news__item-head">
                <span class="dd-status" :class="`is-${draft.status}`">{{ STATUS_LABELS[draft.status] }}</span>
                <strong>#{{ draft.id }}</strong>
                <!-- 處理過的草稿 updatedAt 是處理的時間，只有待處理的才是併進新報導 -->
                <span class="dd-app__muted">擬於 {{ formatDateTime(draft.createdAt) }}{{ draft.status === 'pending' && draft.updatedAt !== draft.createdAt ? `，${formatDateTime(draft.updatedAt)} 併進新報導` : '' }}</span>
            </header>
            <p v-if="draft.reason" class="dd-news__reason">AI 的理由：{{ draft.reason }}</p>

            <form v-if="draft.status === 'pending' && edits[draft.id]" class="dd-announce__form" @submit.prevent="decide(draft, 'publish')">
                <label class="wide">
                    示警內容
                    <textarea v-model="edits[draft.id].message" rows="2" :maxlength="messageMax + 20" @input="markTouched(draft.id)" />
                    <span class="counter" :class="{ 'is-danger': messageLength(draft.id) > messageMax }">{{ messageLength(draft.id) }} / {{ messageMax }}（不能換行）</span>
                </label>
                <label>
                    相關機構
                    <input v-model="edits[draft.id].institutions" type="text" placeholder="永豐銀行、國泰世華" @input="markTouched(draft.id)" />
                    <span class="counter">頓號或逗號分開，最多 10 個</span>
                </label>
                <label>
                    銀行代碼
                    <input v-model="edits[draft.id].bankCodes" type="text" inputmode="numeric" placeholder="807 013" @input="markTouched(draft.id)" />
                    <span class="counter">三碼，空白分開。富邦、元大、國泰可能是證券或人壽，要改掉</span>
                </label>
                <label class="wide">
                    按下去去哪裡
                    <input v-model="edits[draft.id].link" type="url" placeholder="清空就是不帶連結" @input="markTouched(draft.id)" />
                    <span class="counter">預設第一篇來源，使用者點通知看得到原文</span>
                </label>
                <label>
                    結束（台灣時間）
                    <input v-model="edits[draft.id].endsAt" type="datetime-local" @input="markTouched(draft.id)" />
                    <span class="counter">按下發佈就開始</span>
                </label>

                <p v-if="errors[draft.id]" class="wide dd-admin__error">{{ errors[draft.id] }}</p>
                <p v-if="confirmingId === draft.id" class="wide dd-news__warn" role="alert">
                    這會讓所有使用者的手機跳通知。內容與機構確定沒寫錯再按一次。
                </p>
                <div class="wide dd-app__actions">
                    <button
                        type="submit"
                        class="dd-admin__btn"
                        :class="{ 'dd-admin__btn--danger': confirmingId === draft.id }"
                        :disabled="busyId !== null || !!errors[draft.id]"
                    >
                        {{ busyId === draft.id ? '處理中…' : confirmingId === draft.id ? '確定發佈示警' : '發佈' }}
                    </button>
                    <button v-if="confirmingId === draft.id" type="button" class="dd-admin__btn dd-admin__btn--ghost" @click="confirmingId = null">取消</button>
                    <button v-else type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busyId !== null" @click="decide(draft, 'discard')">丟掉</button>
                </div>
            </form>

            <template v-else>
                <p class="dd-news__message">{{ draft.message }}</p>
                <p class="dd-app__muted">{{ decisionText(draft) }}</p>
            </template>

            <p v-if="draft.status !== 'pending' && (draft.institutions.length || draft.bankCodes.length)" class="dd-app__muted">
                相關：{{ draft.institutions.join('、') || '—' }}{{ draft.bankCodes.length ? `（${draft.bankCodes.join('、')}）` : '' }}
            </p>

            <details class="dd-news__sources" :open="draft.status === 'pending'">
                <summary>來源 {{ draft.sources.length }} 篇</summary>
                <ul>
                    <li v-for="source in draft.sources" :key="source.url">
                        <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a>
                        <small>{{ source.source }}{{ source.publishedAt ? `・${formatDateTime(source.publishedAt)}` : '' }}</small>
                    </li>
                </ul>
            </details>
            <details v-if="draft.laterReports" class="dd-news__sources">
                <summary>
                    之後又有 {{ draft.laterReports }} 篇報導{{ draft.status === 'discarded' ? '：還在發酵，要示警的話照一般公告新增一則「示警」' : '' }}
                </summary>
                <ul>
                    <li v-for="source in draft.laterSources" :key="source.url">
                        <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a>
                        <small>{{ source.source }}{{ source.publishedAt ? `・${formatDateTime(source.publishedAt)}` : '' }}</small>
                    </li>
                </ul>
            </details>
        </article>
    </section>
</template>

<style lang="scss">
    .dd-news {
        &__count {
            background: var(--vp-c-danger-soft);
            padding: 2px 8px;
            border-radius: 999px;
            margin-left: 8px;
            color: var(--vp-c-danger-1);
            font-size: 12px;
            font-weight: 500;
        }
        &__bar {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;

            select {
                background: var(--vp-c-bg-soft);
                padding: 4px 8px;
                border: 1px solid var(--vp-c-divider);
                color: var(--vp-c-text-1);
                font: inherit;
                font-size: var(--font-size-s);
            }
        }
        &__item {
            @include setFlex(flex-start, stretch, 8px, column);
            padding: 12px 0;
            border-top: 1px solid var(--vp-c-divider);

            &.is-published,
            &.is-discarded { opacity: .8; }
        }
        &__item-head {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
        }
        &__reason,
        &__message {
            font-size: var(--font-size-s);
        }
        &__message { color: var(--vp-c-text-1); }
        &__warn {
            background: var(--vp-c-danger-soft);
            padding: 8px 12px;
            border-radius: 8px;
            color: var(--vp-c-danger-1);
            font-size: var(--font-size-s);
        }
        &__sources {
            font-size: var(--font-size-s);

            summary {
                color: var(--vp-c-text-2);
                cursor: pointer;
            }
            ul {
                padding-left: 1.2em;
                margin: 6px 0 0;
            }
            li { margin: 4px 0; }
            small {
                display: block;
                color: var(--vp-c-text-3);
            }
        }

        .dd-status {
            &.is-pending { background: var(--vp-c-warning-soft); }
            &.is-published { background: var(--vp-c-green-soft); }
            &.is-discarded { background: var(--vp-c-default-soft); }
        }
    }
</style>
