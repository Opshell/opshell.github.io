import type { AdminCoinItem, CoinItemKind, CoinPlanTier, CreateCoinItemInput, UpdateCoinItemInput } from './schemas/admin.schema';

// 金幣與商店的純邏輯（api.md 第 30 節，Flowsker #791）。畫面在 components/CoinShop.vue 與 DeviceCoins.vue。
// 欄位規則照後端 controllers/coins_controller.go：先在前端講清楚，後端才是真正的把關。

export const COIN_KIND_LABELS: Record<CoinItemKind, string> = { plan: '方案', badge: '徽章', title_prefix: '稱號前綴', title_suffix: '稱號後綴' };
export const COIN_KINDS = Object.keys(COIN_KIND_LABELS) as CoinItemKind[];
export const COIN_PLAN_TIERS: CoinPlanTier[] = ['lite', 'pro', 'max'];

export const COIN_CODE_MAX = 40;
export const COIN_NAME_MAX = 20;
/** 價格與手動調整的上限都是 100000（coinMaxAmount） */
export const COIN_AMOUNT_MAX = 100_000;
export const COIN_PLAN_DAYS_MAX = 366;
export const COIN_REASON_MAX = 100;

/** 後端照字元數算（Go 的 rune），emoji 算一個字 */
const runes = (value: string) => [...value].length;
/** 後端擋 unicode.IsControl（Cc，含換行）與 Cf（零寬字元、文字方向覆寫）：名稱與原因 App 都會顯示 */
const BAD_CHARS = /[\p{Cc}\p{Cf}]/u;
const INTEGER = /^-?\d+$/;

function intProblem(text: string, label: string, min: number, max: number): string {
    const trimmed = text.trim();
    if (!INTEGER.test(trimmed)) return `${label}要是 ${min}～${max} 的整數`;
    const value = Number(trimmed);
    if (value < min || value > max) return `${label}要是 ${min}～${max} 的整數`;
    return '';
}

// #region [P] 商品（30.7）

export interface CoinItemDraft {
    code: string;
    kind: CoinItemKind;
    name: string;
    price: string;
    planTier: CoinPlanTier;
    days: string;
    active: boolean;
    /** 新增時留空＝0（後端預設） */
    sortOrder: string;
}

export const emptyCoinItemDraft = (): CoinItemDraft => ({ code: '', kind: 'plan', name: '', price: '', planTier: 'pro', days: '7', active: false, sortOrder: '' });

export const coinItemDraftOf = (item: AdminCoinItem): CoinItemDraft => ({
    code: item.code,
    kind: item.kind,
    name: item.name,
    price: String(item.price),
    planTier: item.planTier ?? 'pro',
    days: item.kind === 'plan' ? String(item.days) : '7',
    active: item.active,
    sortOrder: String(item.sortOrder)
});

export function coinCodeProblem(code: string): string {
    if (!code.trim()) return '代號不能空白';
    if (!new RegExp(`^[a-z0-9_]{1,${COIN_CODE_MAX}}$`).test(code.trim())) return `代號只能用小寫英數與底線，最多 ${COIN_CODE_MAX} 字`;
    return '';
}

export function coinNameProblem(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return '名稱不能空白';
    if (runes(trimmed) > COIN_NAME_MAX) return `名稱最多 ${COIN_NAME_MAX} 字`;
    if (BAD_CHARS.test(trimmed)) return '名稱不能換行，也不能有看不見的字元';
    return '';
}

/** isNew：新增時才檢查代號（建了就不能改），排序可以留空 */
export function coinItemFormError(draft: CoinItemDraft, isNew: boolean): string {
    if (isNew) {
        const code = coinCodeProblem(draft.code);
        if (code) return code;
    }
    const name = coinNameProblem(draft.name);
    if (name) return name;
    const price = intProblem(draft.price, '價格', 1, COIN_AMOUNT_MAX);
    if (price) return price;
    if (draft.kind === 'plan') {
        const days = intProblem(draft.days, '天數', 1, COIN_PLAN_DAYS_MAX);
        if (days) return days;
    }
    if (draft.sortOrder.trim() || !isNew) {
        if (!INTEGER.test(draft.sortOrder.trim()) || !Number.isSafeInteger(Number(draft.sortOrder.trim()))) return '排序要是整數';
    }
    return '';
}

/** 新增的 body：只有方案帶 plan_tier 與 days（其他種類給了回 400） */
export function coinItemCreateBody(draft: CoinItemDraft): CreateCoinItemInput {
    const sortOrder = draft.sortOrder.trim();
    return {
        code: draft.code.trim(),
        kind: draft.kind,
        name: draft.name.trim(),
        price: Number(draft.price.trim()),
        ...(draft.kind === 'plan' ? { planTier: draft.planTier, days: Number(draft.days.trim()) } : {}),
        active: draft.active,
        ...(sortOrder ? { sortOrder: Number(sortOrder) } : {})
    };
}

/** 只送真的變了的欄位（後端的操作紀錄記前後） */
export function coinItemPatch(current: AdminCoinItem, draft: CoinItemDraft): UpdateCoinItemInput {
    const patch: UpdateCoinItemInput = {};
    const name = draft.name.trim();
    const price = Number(draft.price.trim());
    const sortOrder = Number(draft.sortOrder.trim());
    if (name !== current.name) patch.name = name;
    if (price !== current.price) patch.price = price;
    if (draft.active !== current.active) patch.active = draft.active;
    if (sortOrder !== current.sortOrder) patch.sortOrder = sortOrder;
    if (current.kind === 'plan') {
        const days = Number(draft.days.trim());
        if (draft.planTier !== current.planTier) patch.planTier = draft.planTier;
        if (days !== current.days) patch.days = days;
    }
    return patch;
}

// #endregion

// #region [P] 手動調整（30.7）

export interface CoinAdjustDraft {
    amount: string;
    reason: string;
    countsForRank: boolean;
}

export const emptyCoinAdjustDraft = (): CoinAdjustDraft => ({ amount: '', reason: '', countsForRank: false });

export function coinAdjustError(draft: CoinAdjustDraft): string {
    const amount = draft.amount.trim();
    if (!INTEGER.test(amount)) return `金額要是整數，正的是加、負的是收回`;
    const value = Number(amount);
    if (value === 0) return '金額不能是 0';
    if (Math.abs(value) > COIN_AMOUNT_MAX) return `金額正負 ${COIN_AMOUNT_MAX} 以內`;
    const reason = draft.reason.trim();
    if (!reason) return '原因必填（App 看得到，寫給使用者看的話）';
    if (runes(reason) > COIN_REASON_MAX) return `原因最多 ${COIN_REASON_MAX} 字`;
    if (BAD_CHARS.test(reason)) return '原因不能換行，也不能有看不見的字元';
    return '';
}

/** 「+10」「-5」：帳本與確認框都用，正的也帶號，一眼分得出加減 */
export const signedCoins = (amount: number) => (amount > 0 ? `+${amount}` : String(amount));

// #endregion
