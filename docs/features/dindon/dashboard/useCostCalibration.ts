import type { ReconcileDay } from './billingCalibration';
import type { GeminiBilling, UsageReport } from './schemas/admin.schema';
import { computed, ref, shallowRef } from 'vue';
import { adminApi } from './api';
import { calibrationFactor, gapMultiple, impliedRate, reconcileDays } from './billingCalibration';
import { formatMoney } from './googleData';
import { errorMessage, useAdminCall } from './useAdminCall';

// 全後台共用的「估算 → 實際帳單」換算（2026-10-02）：總覽、用量報表、用量監看的每一個金額都走這裡，同一個係數。
// 抓近 90 天的帳單與用量各一次（模組層級，同一個分頁共用），算出 k；抓不到時退回估算、並標「（估）」。

const CALIBRATION_DAYS = 90;

const billing = shallowRef<GeminiBilling | null>(null);
const usage = shallowRef<UsageReport | null>(null);
const loading = ref(false);
const error = ref('');
let started = false;

const rate = computed(() => (billing.value && usage.value ? impliedRate(billing.value.skus, usage.value.pricesUsed) : null));
const days = computed<ReconcileDay[]>(() => (billing.value && usage.value ? reconcileDays(billing.value, usage.value.daily, rate.value) : []));
/** 每 1 美元的估算，實際是多少台幣（含匯率與估算漏掉的部分） */
const factor = computed(() => calibrationFactor(days.value));
/** 同一個幣別比，實際是估算的幾倍 */
const multiple = computed(() => gapMultiple(factor.value, rate.value));

export function useCostCalibration() {
    const call = useAdminCall();

    async function load(refresh = false) {
        if (loading.value) return;
        loading.value = true;
        error.value = '';
        try {
            const [billingResult, usageResult] = await call(async token => Promise.all([
                adminApi.geminiBilling(token, CALIBRATION_DAYS, refresh),
                adminApi.usage(token, CALIBRATION_DAYS)
            ]));
            billing.value = billingResult;
            usage.value = usageResult;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    if (!started && typeof window !== 'undefined') {
        started = true;
        void load();
    }

    /** 估算的美元 → 依帳單換算的台幣；還沒有係數時是 null */
    const toTwd = (usd: number) => (factor.value === null ? null : usd * factor.value);

    /** 畫面上的金額：有係數就是台幣（依帳單），沒有就是美元估算加「（估）」 */
    const formatCost = (usd: number) => {
        const twd = toTwd(usd);
        return twd === null ? `US$${usd.toFixed(usd < 0.01 ? 4 : 2)}（估）` : formatMoney(twd);
    };

    /** 某一天的成本：帳單已經匯出的日子用帳單實付，之後的日子用估算 × 係數 */
    const formatDayCost = (date: string, usd: number) => {
        const through = billing.value?.dataThrough;
        if (billing.value && through && date <= through && date >= billing.value.since) {
            return formatMoney(billing.value.daily.find(day => day.date === date)?.paid ?? 0);
        }
        return formatCost(usd);
    };

    /** 金額欄位的說明：用在表頭與小字 */
    const costNote = computed(() => (factor.value === null
        ? '依價目表估算（美元）：實際帳單還沒算出換算係數'
        : `依實際帳單換算（每 US$1 估算＝${formatMoney(factor.value)}）`));

    return { billing, usage, loading, error, rate, days, factor, multiple, load, toTwd, formatCost, formatDayCost, costNote };
}
