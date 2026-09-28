import type { DeviceUsage, FeatureCandidate, FeedbackStats } from './schemas/admin.schema';
import { computed, ref, shallowRef } from 'vue';
import { adminApi } from './api';
import { errorMessage, useAdminCall } from './useAdminCall';

// 後台的「現在要處理什麼」：側欄的數字與總覽最上面那一排共用這一份。
// 三個來源各自抓、各自失敗：用量那支掛了，待審回報的數字照樣要看得到。
// 狀態放在模組層：側欄和總覽拿到的是同一份，不會各打一次 API。

/** 用量提示看近幾天。跟「用量監看」分頁的預設一致 */
export const PULSE_USAGE_DAYS = 7;

const feedback = shallowRef<FeedbackStats | null>(null);
const usage = shallowRef<DeviceUsage[] | null>(null);
const features = shallowRef<FeatureCandidate[] | null>(null);
const errors = ref<string[]>([]);
const loading = ref(false);
const loadedAt = ref<Date | null>(null);

// 數量是 0 的狀態後端不會放進 by_status：有統計、沒有 pending 就是 0，不是「還不知道」
const pendingReports = computed(() => (feedback.value ? feedback.value.byStatus.pending ?? 0 : null));
const toMerge = computed(() => feedback.value?.acceptedWithoutIssue ?? null);
const flaggedDevices = computed(() => usage.value?.filter(row => row.flags.length && !row.frozen) ?? null);
const activeToday = computed(() => usage.value?.filter(row => row.today > 0).length ?? null);
const voting = computed(() => features.value?.filter(feature => feature.status === 'voting') ?? null);
/** 後端已經照票數排好：投票中的第一個就是領先的 */
const leadingFeature = computed(() => voting.value?.[0] ?? null);

export function usePulse() {
    const call = useAdminCall();

    async function refresh() {
        if (loading.value) return;
        loading.value = true;
        const results = await Promise.allSettled([
            call(async token => adminApi.feedbackStats(token)),
            call(async token => adminApi.usageByDevice(token, PULSE_USAGE_DAYS)),
            call(async token => adminApi.listFeatureCandidates(token))
        ]);
        const [stats, byDevice, candidates] = results;
        if (stats.status === 'fulfilled') feedback.value = stats.value;
        if (byDevice.status === 'fulfilled') usage.value = byDevice.value.devices;
        if (candidates.status === 'fulfilled') features.value = candidates.value.features;
        errors.value = results.flatMap(result => (result.status === 'rejected' ? [errorMessage(result.reason)] : []));
        loadedAt.value = new Date();
        loading.value = false;
    }

    return { pendingReports, toMerge, flaggedDevices, activeToday, voting, leadingFeature, errors, loading, loadedAt, refresh };
}
