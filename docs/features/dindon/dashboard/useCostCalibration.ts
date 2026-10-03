import type { ReconcileDay } from './billingCalibration';
import type { GeminiBilling, UsageReport } from './schemas/admin.schema';
import { computed, ref, shallowRef } from 'vue';
import { adminApi } from './api';
import { billingRate, breakdown, reconcileDays } from './billingCalibration';
import { formatUsd } from './format';
import { formatMoney } from './googleData';
import { errorMessage, useAdminCall } from './useAdminCall';

// 全後台共用的「估算 → 台幣」換算：總覽、用量報表、用量監看的每一個金額都走這裡。
// 抓近 90 天的帳單與用量各一次（模組層級，同一個分頁共用）。
// 2026-10-03 起乘的是**帳單上的匯率**，不是「實付 ÷ 估算」的係數：後端量過，估算本身是準的，
// 帳單多出來的是清庫前、本機開發這些後端看不到的用量，不能算到使用者頭上（溝通板 #0085，見 billingCalibration.ts）。

const CALIBRATION_DAYS = 90;

const billing = shallowRef<GeminiBilling | null>(null);
const usage = shallowRef<UsageReport | null>(null);
const loading = ref(false);
const error = ref('');
let started = false;

/** 1 美元換多少台幣：Google 帳單上的匯率 */
const rate = computed(() => (billing.value && usage.value ? billingRate(billing.value, usage.value.pricesUsed) : null));
const days = computed<ReconcileDay[]>(() => (billing.value && usage.value && rate.value ? reconcileDays(billing.value, usage.value.dailyModels, rate.value) : []));
const split = computed(() => breakdown(days.value));

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

    /** 估算的美元 → 台幣；還沒拿到帳單的匯率時是 null */
    const toTwd = (usd: number) => (rate.value === null ? null : usd * rate.value);

    /** 畫面上的金額：有匯率就是台幣，沒有就是美元估算加「（估）」 */
    const formatCost = (usd: number) => {
        const twd = toTwd(usd);
        return twd === null ? `${formatUsd(usd)}（估）` : formatMoney(twd);
    };

    /** 某一天的成本：帳單已經匯出的日子用帳單實付（含後端看不到的），之後的日子用估算 × 匯率 */
    const formatDayCost = (date: string, usd: number) => {
        const through = billing.value?.dataThrough;
        if (billing.value && through && date <= through && date >= billing.value.since) {
            return formatMoney(billing.value.daily.find(day => day.date === date)?.paid ?? 0);
        }
        return formatCost(usd);
    };

    // 金額的說明一律寫原始資料加算式（2026-10-02，使用者：「要呈現的應該是資料庫原始資料是什麼，下面備註用原始資料搭配算式」）。
    const rateText = computed(() => (rate.value === null ? '' : rate.value.toFixed(2)));

    /** 一個金額的完整算式，三行：資料庫原始值、乘法、匯率的來源 */
    const costFormula = (usd: number) => {
        const twd = toTwd(usd);
        if (twd === null) return `資料庫估算 ${formatUsd(usd)}\n還沒拿到帳單的匯率，先顯示估算`;
        return `資料庫估算 ${formatUsd(usd)}\n${formatUsd(usd)} × ${rateText.value} ＝ ${formatMoney(twd)}\n${rateText.value} 是 Google 帳單上的匯率`;
    };

    /** 接在「金額」「成本」後面的說明：用在段落、表頭 */
    const costNote = computed(() => (rate.value === null
        ? '＝資料庫估算（美元）：還沒拿到帳單的匯率'
        : `＝資料庫估算（美元）× ${rateText.value}（Google 帳單上的匯率）`));

    return { billing, usage, loading, error, rate, days, split, load, toTwd, formatCost, formatDayCost, costFormula, costNote };
}
