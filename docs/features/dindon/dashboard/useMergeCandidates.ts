import type { FeedbackReport } from './api';
import { ref } from 'vue';
import { adminApi } from './api';
import { useAdminCall } from './useAdminCall';

// 「跟哪一則算同一件事」的候選回報。回報列表那一頁與快速審核共用一份，
// 一分鐘內不重抓：後台每分鐘只能打 30 次 API，選單每開一次就抓一次會很快撞到。
const candidates = ref<FeedbackReport[]>([]);
let loadedAt = 0;
let pending: Promise<void> | null = null;

export function useMergeCandidates() {
    const call = useAdminCall();

    async function ensure(force = false) {
        if (!force && Date.now() - loadedAt < 60_000) return;
        pending ??= (async () => {
            try {
                const list = await call(token => adminApi.listFeedback(token, { status: 'all', page: 1, perPage: 50 }));
                // 被退回的不會算分、內容清掉的也認不出是哪件事，列出來只是雜訊
                candidates.value = list.reports.filter(r => r.status !== 'rejected' && !r.content_purged_at);
                loadedAt = Date.now();
            } finally {
                pending = null;
            }
        })();
        return pending;
    }

    /** 合併過之後候選的 issue_id 變了，下次要重抓 */
    const invalidate = () => { loadedAt = 0; };

    return { candidates, ensure, invalidate };
}
