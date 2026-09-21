<script setup lang="ts">
    import type { FeedbackIssue, FeedbackReport } from '../api';
    import { computed, onMounted, ref, watch } from 'vue';
    import { adminApi, AdminApiError } from '../api';
    import { KIND_LABELS } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import { useMergeCandidates } from '../useMergeCandidates';

    // 「這則跟哪一則是同一件事？」
    //
    // 原本的做法是「先建一個問題，再把回報掛上去」：還沒有任何問題的時候下拉是空的，
    // 想把兩則合併的人根本不知道要先去建一個（使用者 2026-09-21 回報「下拉打開沒東西」）。
    // 現在下拉直接列出其他回報：
    // - 選的那則已經在某個問題裡 → 這則掛過去
    // - 選的那則還沒合併過 → 用兩則開一個新問題（一次 API 就好，後端的 report_ids 收陣列）
    // 已經有的問題也列在最上面，可以直接掛。
    const { report, issues } = defineProps<{ report: FeedbackReport, issues: FeedbackIssue[] }>();
    const emit = defineEmits<{ merged: [issueId: number] }>();

    const call = useAdminCall();
    const { candidates, ensure, invalidate } = useMergeCandidates();

    /** `issue:3` 或 `report:12` */
    const pick = ref('');
    const title = ref('');
    const busy = ref(false);
    const error = ref('');

    const others = computed(() => candidates.value.filter(r => r.id !== report.id));
    const pickedReport = computed(() => {
        const match = pick.value.match(/^report:(\d+)$/);
        return match ? others.value.find(r => r.id === Number(match[1])) ?? null : null;
    });
    /** 選了一則還沒合併過的回報，就會開新問題，要有標題 */
    const needsTitle = computed(() => !!pickedReport.value && !pickedReport.value.issue_id);

    const short = (text: string, length = 28) => (text.length > length ? `${text.slice(0, length)}…` : text);
    const issueTitle = (id: number | null | undefined) => issues.find(i => i.id === id)?.title ?? `#${id}`;

    // 開新問題時的預設標題：用比較早的那一則的描述，通常寫得比較完整
    watch(pickedReport, target => {
        if (!target || target.issue_id) return;
        const earlier = new Date(target.created_at) < new Date(report.created_at) ? target : report;
        title.value = short(earlier.description.replace(/\s+/g, ' ').trim(), 24);
    });

    async function merge() {
        if (!pick.value || busy.value) return;
        busy.value = true;
        error.value = '';
        try {
            let issueId: number;
            if (pick.value.startsWith('issue:')) {
                issueId = Number(pick.value.slice(6));
                await call(token => adminApi.addReportsToIssue(token, issueId, [report.id]));
            } else if (pickedReport.value?.issue_id) {
                issueId = pickedReport.value.issue_id;
                await call(token => adminApi.addReportsToIssue(token, issueId, [report.id]));
            } else if (pickedReport.value) {
                if (!title.value.trim()) throw new Error('幫這件事取個名字');
                const created = await call(token => adminApi.createIssue(token, {
                    title: title.value.trim(),
                    weight: 1,
                    report_ids: [pickedReport.value!.id, report.id]
                }));
                issueId = created.id;
            } else {
                return;
            }
            invalidate();
            pick.value = '';
            title.value = '';
            emit('merged', issueId);
        } catch (e) {
            error.value = e instanceof AdminApiError && e.status === 429
                ? '手太快了：後台每分鐘最多 30 次請求，等一下再按'
                : errorMessage(e);
        } finally {
            busy.value = false;
        }
    }

    onMounted(() => { ensure(); });
</script>

<template>
    <div class="dd-merge">
        <div class="dd-merge__row">
            <select v-model="pick" aria-label="跟哪一則算同一件事" :disabled="busy">
                <option value="">跟哪一則是同一件事？</option>
                <optgroup v-if="issues.length" label="已經合併過的">
                    <option v-for="issue in issues" :key="`i${issue.id}`" :value="`issue:${issue.id}`">
                        📎 {{ issue.title }}（{{ issue.reports }} 則・權重 {{ issue.weight }}）
                    </option>
                </optgroup>
                <optgroup v-if="others.length" label="其他回報">
                    <option v-for="r in others" :key="`r${r.id}`" :value="`report:${r.id}`">
                        #{{ r.id }} {{ KIND_LABELS[r.kind] ?? r.kind }}・{{ short(r.description) }}{{ r.issue_id ? `（已在「${issueTitle(r.issue_id)}」）` : '' }}
                    </option>
                </optgroup>
            </select>
            <input v-if="needsTitle" v-model="title" type="text" placeholder="這件事叫什麼" aria-label="合併之後的名字" />
            <button type="button" class="dd-admin__btn" :disabled="!pick || busy || (needsTitle && !title.trim())" @click="merge">
                {{ busy ? '合併中…' : '算同一件' }}
            </button>
        </div>
        <p v-if="!issues.length && !others.length" class="dd-merge__hint">目前沒有其他可以合併的回報。</p>
        <p v-else-if="needsTitle" class="dd-merge__hint">兩則都還沒合併過，會用這兩則開一個新的，權重先給 1，之後在下面的表格改。</p>
        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
    </div>
</template>

<style lang="scss">
    .dd-merge {
        @include setFlex(flex-start, stretch, 6px, column);

        &__row {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;

            select, input {
                background: var(--vp-c-bg-soft);
                padding: 4px 10px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                color: var(--vp-c-text-1);
                font-size: var(--font-size-s);
            }
            select {
                flex: 1 1 260px;
                min-width: 0;
                max-width: 100%;
            }
            input { width: 180px; }
        }
        &__hint {
            margin: 0;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-xs);
        }
    }
</style>
