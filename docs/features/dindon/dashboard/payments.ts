import type { AdminDevice } from './schemas/admin.schema';

/**
 * 後台的付款資訊（#570，後端 Flowsker #568）：訂閱狀態、贊助級距，以及裝置列表「付過款的」篩選。
 * 規格是 api.md 第 7 節（商品、狀態）與第 8 節（裝置物件、`paid`、`payments/summary`）。
 * 後端不存金額，這裡的金額只是照 7.1 的價目表標給人看的，營收以 Play Console 為準。
 */

/** 列表的「付過款的」篩選，值照 api.md 第 8 節的 `paid` */
export type PaidFilter = 'all' | 'any' | 'subscribed' | 'subscribing' | 'donated';

export const PAID_FILTER_LABELS: Record<PaidFilter, string> = {
    all: '不管有沒有付款',
    any: '訂閱過或贊助過',
    subscribed: '訂閱過（含過期）',
    subscribing: '現在訂閱中',
    donated: '贊助過'
};

/** 第 7.3 節的 subscription_state */
export const SUBSCRIPTION_STATE_LABELS: Record<string, string> = {
    active: '訂閱中',
    canceled: '已取消續訂（到期前有效）',
    grace: '扣款失敗，寬限期',
    on_hold: '扣不到款，暫停權益',
    paused: '使用者暫停',
    expired: '已過期',
    pending: '付款處理中'
};

/** 總覽上狀態的排列：有權益的在前 */
export const SUBSCRIPTION_STATE_ORDER = ['active', 'canceled', 'grace', 'on_hold', 'paused', 'pending', 'expired'];

/** 有權益的三種狀態（7.6）；還要加上沒到期才算 */
const ENTITLED_STATES = new Set(['active', 'canceled', 'grace']);

/** unknown 是 000021 以前訂的、沒記 base plan（payments/summary 的 by_base_plan） */
export const BASE_PLAN_LABELS: Record<string, string> = { monthly: '月繳', yearly: '年繳', unknown: '沒記到' };

/**
 * 贊助的六階（7.1），照金額由低到高。
 * 商品 ID 的順序不等於金額順序：tip_6 是後加的 NT$ 700，排在 tip_4 與 tip_5 之間（Flowsker #598）
 */
export const DONATION_TIERS = [
    { id: 'dindon_tip_1', amount: 60 },
    { id: 'dindon_tip_2', amount: 150 },
    { id: 'dindon_tip_3', amount: 250 },
    { id: 'dindon_tip_4', amount: 450 },
    { id: 'dindon_tip_6', amount: 700 },
    { id: 'dindon_tip_5', amount: 1000 }
] as const;

/** 「NT$ 250」；不認得的商品 ID 原樣顯示（Play 多開一階、文件還沒寫時不要整格空白） */
export function tipLabel(productId: string): string {
    const tier = DONATION_TIERS.find(item => item.id === productId);
    return tier ? `NT$ ${tier.amount}` : productId;
}

/** 照金額排，不認得的放最後 */
export function sortByTier<T>(items: T[], idOf: (item: T) => string): T[] {
    const rank = (id: string) => {
        const index = DONATION_TIERS.findIndex(item => item.id === id);
        return index === -1 ? DONATION_TIERS.length : index;
    };
    return [...items].sort((a, b) => rank(idOf(a)) - rank(idOf(b)));
}

type PaidFields = Pick<AdminDevice, 'subscriptionState' | 'subscriptionExpiresAt' | 'supporter'>;

/** 現在有訂閱權益：狀態是 active／canceled／grace 而且還沒到期（同後端 7.6 的判斷） */
export function isSubscribing(device: PaidFields, now = Date.now()): boolean {
    if (!device.subscriptionState || !ENTITLED_STATES.has(device.subscriptionState)) return false;
    return !!device.subscriptionExpiresAt && Date.parse(device.subscriptionExpiresAt) > now;
}

/**
 * 跟後端 `paid` 同一個規則，給「在全部裝置裡比對暱稱」那條路用（那條路不打列表 API，篩選要自己做）。
 * subscribed 看 subscription_state 有沒有值，含過期與 pending；贊助一律不算退款的（後端已經算好在 supporter）
 */
export function matchesPaid(device: PaidFields, filter: PaidFilter, now = Date.now()): boolean {
    switch (filter) {
        case 'all': return true;
        case 'any': return device.subscriptionState !== null || device.supporter;
        case 'subscribed': return device.subscriptionState !== null;
        case 'subscribing': return isSubscribing(device, now);
        case 'donated': return device.supporter;
    }
}

export type PaymentTone = 'active' | 'trial' | 'warn' | 'ended' | 'donor';

export interface PaymentChip {
    label: string;
    tone: PaymentTone;
    /** 滑過去看的完整說明 */
    title: string;
}

type ChipFields = PaidFields & Pick<AdminDevice, 'subscriptionBasePlan' | 'subscriptionInTrial' | 'autoRenewing' | 'donations' | 'donatedTiers'>;

/**
 * 列表上「付款」那格的小標籤：一眼看出誰在訂閱、誰贊助過。沒付過款回空陣列。
 * 狀態寫成字不只靠顏色；到期了但狀態還沒更新的（Google 通知還沒來），照到期日當成已過期
 */
export function paymentChips(device: ChipFields, now = Date.now()): PaymentChip[] {
    const chips: PaymentChip[] = [];
    const state = device.subscriptionState;
    if (state) {
        const plan = device.subscriptionBasePlan ? BASE_PLAN_LABELS[device.subscriptionBasePlan] ?? device.subscriptionBasePlan : '';
        const stateLabel = SUBSCRIPTION_STATE_LABELS[state] ?? state;
        if (isSubscribing(device, now)) {
            const trial = device.subscriptionInTrial === true;
            const label = trial ? '試用中' : state === 'active' ? '訂閱中' : state === 'canceled' ? '不續訂' : '寬限期';
            chips.push({
                label: plan ? `${label}・${plan}` : label,
                tone: trial ? 'trial' : state === 'active' ? 'active' : 'warn',
                title: `${stateLabel}${trial ? '，免費試用中' : ''}${device.autoRenewing === false ? '，到期不續訂' : ''}`
            });
        } else {
            const ended = ENTITLED_STATES.has(state) || state === 'expired' ? '已過期' : stateLabel;
            chips.push({ label: ended, tone: state === 'pending' || state === 'on_hold' ? 'warn' : 'ended', title: `訂閱：${stateLabel}（現在沒有權益）` });
        }
    }
    if (device.supporter) {
        const tiers = sortByTier(device.donatedTiers, id => id).map(tipLabel).join('、');
        chips.push({ label: `贊助 ${device.donations} 筆`, tone: 'donor', title: tiers ? `買過：${tiers}（不算退款的）` : '不算退款的筆數' });
    }
    return chips;
}

/** 物件裡的數量照指定順序排成列；順序裡沒有的 key 接在後面，0 不列 */
export function orderedCounts(counts: Record<string, number>, order: readonly string[]): { key: string; count: number }[] {
    const keys = [...order.filter(key => key in counts), ...Object.keys(counts).filter(key => !order.includes(key))];
    return keys.map(key => ({ key, count: counts[key] })).filter(row => row.count > 0);
}
