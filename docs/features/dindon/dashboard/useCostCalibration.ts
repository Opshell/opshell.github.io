import type { ReconcileDay } from './billingCalibration';
import type { GeminiBilling, UsageReport } from './schemas/admin.schema';
import { computed, ref, shallowRef } from 'vue';
import { adminApi } from './api';
import { calibrationFactor, costBasis, gapMultiple, impliedRate, reconcileDays } from './billingCalibration';
import { formatUsd } from './format';
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
/** 係數怎麼來的：帳單實付 ÷ 資料庫估算 */
const basis = computed(() => costBasis(days.value));
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
        return twd === null ? `${formatUsd(usd)}（估）` : formatMoney(twd);
    };

    /** 某一天的成本：帳單已經匯出的日子用帳單實付，之後的日子用估算 × 係數 */
    const formatDayCost = (date: string, usd: number) => {
        const through = billing.value?.dataThrough;
        if (billing.value && through && date <= through && date >= billing.value.since) {
            return formatMoney(billing.value.daily.find(day => day.date === date)?.paid ?? 0);
        }
        return formatCost(usd);
    };

    // 金額的說明一律寫原始資料加算式（2026-10-02，使用者：「要呈現的應該是資料庫原始資料是什麼，下面備註用原始資料搭配算式」）。
    // 資料庫記的是後端照價目表估的美元；台幣是乘上係數算出來的，係數＝帳單實付 ÷ 同期資料庫估算，不是匯率。
    const factorText = computed(() => (factor.value === null ? '' : factor.value.toFixed(2)));
    /** 係數的來源，寫成「帳單 NT$… ÷ 資料庫 US$…（9/21～10/1）」；數字卡片很窄，字要短 */
    const shortDate = (date: string) => date.slice(5).split('-').map(Number).join('/');
    const basisText = computed(() => {
        const b = basis.value;
        return b ? `帳單 ${formatMoney(b.paidTwd)} ÷ 資料庫 ${formatUsd(b.estimateUsd)}（${shortDate(b.from)}～${shortDate(b.to)}）` : '';
    });

    /** 一個金額的完整算式，三行：資料庫原始值、乘法、係數的來源 */
    const costFormula = (usd: number) => {
        const twd = toTwd(usd);
        if (twd === null) return `資料庫估算 ${formatUsd(usd)}\n帳單還沒對上，先顯示估算`;
        return `資料庫估算 ${formatUsd(usd)}\n${formatUsd(usd)} × ${factorText.value} ＝ ${formatMoney(twd)}\n${factorText.value} ＝ ${basisText.value}`;
    };

    /** 接在「金額」「成本」後面的說明：用在段落、表頭 */
    const costNote = computed(() => (factor.value === null
        ? '＝資料庫估算（美元）：帳單還沒對上'
        : `＝資料庫估算（美元）× ${factorText.value}；${factorText.value} ＝ ${basisText.value}，近 90 天帳單實付 ÷ 同期資料庫估算`));

    return { billing, usage, loading, error, rate, days, factor, basis, multiple, load, toTwd, formatCost, formatDayCost, costFormula, costNote };
}
