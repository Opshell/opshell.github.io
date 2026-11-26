import type { GlobalSettingItem, GlobalSettingReadonly, SettingSource } from './schemas/admin.schema';
import { formatInt, formatUsd } from './format';

// 「全域設定」分頁的純邏輯（api.md 第 8 節「全域設定」，Flowsker #885）。畫面在 components/GlobalSettingsPanel.vue。
// 範圍檢查只管「這次要送的值」：現在的值可能來自環境變數而超出 min～max，那不是錯誤（後端也只擋後台送的值）。

export type SettingValue = number | boolean;
/** 畫面上的修改：數字框是輸入的字（還沒驗過）、開關是 true／false、null 是清掉後台的設定 */
export type SettingEdit = string | boolean | null;
export type SettingsPatch = Record<string, SettingValue | null>;

export const SOURCE_LABELS: Record<SettingSource, string> = { admin: '後台設的', env: '環境變數', default: '預設' };

/** 全服務每日 AI 上限：只有它帶 used_today 與 cost_estimate，調到今天已用次數以下要確認 */
export const TOTAL_LIMIT_KEY = 'ai_daily_limit_total';
/** 邀請好友：開關前要確認（api.md 要先看「上線前注意」的前提） */
export const REFERRAL_KEY = 'referral_active';

export function formatSettingValue(item: Pick<GlobalSettingItem, 'type' | 'unit'>, value: SettingValue): string {
    if (item.type === 'bool' || typeof value === 'boolean') return value ? '開' : '關';
    return item.unit ? `${formatInt(value)} ${item.unit}` : formatInt(value);
}

/** 唯讀項目：機密只說有沒有設，值一律不顯示（後端本來就不給） */
export function formatReadonlyValue(item: GlobalSettingReadonly): string {
    if (item.secret) return item.set ? '有設' : '沒設';
    if (item.value === null) return '沒設';
    if (typeof item.value === 'boolean') return item.value ? '開' : '關';
    if (typeof item.value === 'number') return formatInt(item.value);
    return item.value;
}

/** 現在的值在不在後台能設的範圍內；不在的是環境變數設的，只提示、不算錯 */
export function outOfRange(item: Pick<GlobalSettingItem, 'type' | 'min' | 'max' | 'value'>): boolean {
    if (item.type !== 'int' || typeof item.value !== 'number') return false;
    return (item.min !== null && item.value < item.min) || (item.max !== null && item.value > item.max);
}

/** 數字框的字 → 整數；不是整數回 null */
export function parseIntEdit(text: string): number | null {
    const trimmed = text.trim();
    return /^-?\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** 這一項的修改哪裡不對（空字串＝沒問題）。訊息跟後端的 400 同一條規則，只是先講 */
export function editProblem(item: Pick<GlobalSettingItem, 'type' | 'min' | 'max'>, edit: SettingEdit | undefined): string {
    if (edit === undefined || edit === null || item.type !== 'int' || typeof edit !== 'string') return '';
    const value = parseIntEdit(edit);
    if (value === null) return '要填整數';
    if ((item.min !== null && value < item.min) || (item.max !== null && value > item.max)) {
        return `範圍是 ${formatInt(item.min ?? 0)}～${item.max === null ? '不限' : formatInt(item.max)}`;
    }
    return '';
}

/**
 * 只收真的會改到東西的項目。
 * 跟後台現在存的一樣不送；後台沒設、改成跟現在生效的值一樣也不送——那只是點了一下又改回來，
 * 送出去會把環境變數的值釘成後台的值，之後改環境變數就不生效了。
 */
export function buildPatch(items: readonly GlobalSettingItem[], edits: Record<string, SettingEdit>): SettingsPatch {
    const patch: SettingsPatch = {};
    for (const item of items) {
        if (!(item.key in edits)) continue;
        const edit = edits[item.key];
        let next: SettingValue | null;
        if (edit === null) {
            next = null;
        } else if (item.type === 'bool') {
            next = Boolean(edit);
        } else {
            if (typeof edit !== 'string' || editProblem(item, edit)) continue;
            next = parseIntEdit(edit);
            if (next === null) continue;
        }
        if (next === item.adminValue) continue;
        if (item.adminValue === null && next === item.value) continue;
        patch[item.key] = next;
    }
    return patch;
}

/** 送出之後這一項會生效的值：清掉就回到環境變數或預設 */
export const valueAfter = (item: Pick<GlobalSettingItem, 'fallback'>, next: SettingValue | null): SettingValue => next ?? item.fallback;

export interface SettingChange {
    key: string;
    name: string;
    from: string;
    to: string;
}

/** 確認列上的「從什麼改成什麼」 */
export function changeSummary(items: readonly GlobalSettingItem[], patch: SettingsPatch): SettingChange[] {
    return items
        .filter(item => item.key in patch)
        .map((item) => {
            const next = patch[item.key];
            const after = formatSettingValue(item, valueAfter(item, next));
            return {
                key: item.key,
                name: item.name,
                from: `${formatSettingValue(item, item.value)}（${SOURCE_LABELS[item.source]}）`,
                to: next === null ? `清掉，回到 ${after}（${SOURCE_LABELS[item.fallbackSource]}）` : after
            };
        });
}

/**
 * 送出前要多按一次確認的理由；空陣列就直接送。
 * - 全服務上限調到今天已用次數（含）以下：已用 ≥ 上限就擋，所以等於也算——沒付費的下一個請求起 429
 * - 邀請好友：開或關都確認（開之前要先看上線前注意的前提）
 */
export function confirmReasons(items: readonly GlobalSettingItem[], patch: SettingsPatch): string[] {
    const reasons: string[] = [];
    const total = items.find(item => item.key === TOTAL_LIMIT_KEY);
    if (total && TOTAL_LIMIT_KEY in patch && total.usedToday !== undefined) {
        const after = valueAfter(total, patch[TOTAL_LIMIT_KEY]);
        if (typeof after === 'number' && after <= total.usedToday) {
            reasons.push(`${total.name}改成 ${formatInt(after)}，今天已經用了 ${formatInt(total.usedToday)} 次：`
                + '下一個請求起，沒付費的裝置就用不到 AI（付費的照常）。');
        }
    }
    const referral = items.find(item => item.key === REFERRAL_KEY);
    if (referral && REFERRAL_KEY in patch) {
        const after = valueAfter(referral, patch[REFERRAL_KEY]);
        reasons.push(after
            ? `打開「${referral.name}」：先確認後端 docs/上線前注意.md「邀請好友什麼時候開」的前提都做到了。`
            : `關掉「${referral.name}」：App 從 /v1/me 拿到的開關會變成關。`);
    }
    return reasons;
}

/** 照上限次數算一天最多花多少（平常與最壞）。估算，以 Google Cloud 帳單為準 */
export function dailyCost(estimate: { typicalUsdPer1000: number; worstUsdPer1000: number }, limit: number): { typical: string; worst: string } {
    return {
        typical: formatUsd((estimate.typicalUsdPer1000 * limit) / 1000),
        worst: formatUsd((estimate.worstUsdPer1000 * limit) / 1000)
    };
}
