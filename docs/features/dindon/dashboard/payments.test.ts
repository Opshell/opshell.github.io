import { describe, expect, it } from 'vitest';
import { isSubscribing, matchesPaid, orderedCounts, paymentChips, sortByTier, tipLabel } from './payments';

const NOW = Date.parse('2026-11-07T00:00:00Z');
const FUTURE = '2026-12-01T00:00:00Z';
const PAST = '2026-11-01T00:00:00Z';

const base = {
    subscriptionState: null as string | null,
    subscriptionExpiresAt: null as string | null,
    subscriptionBasePlan: null as string | null,
    subscriptionInTrial: null as boolean | null,
    autoRenewing: null as boolean | null,
    supporter: false,
    donations: 0,
    donatedTiers: [] as string[]
};

describe('isSubscribing', () => {
    it('active／canceled／grace 而且沒到期才算', () => {
        expect(isSubscribing({ ...base, subscriptionState: 'active', subscriptionExpiresAt: FUTURE }, NOW)).toBe(true);
        expect(isSubscribing({ ...base, subscriptionState: 'canceled', subscriptionExpiresAt: FUTURE }, NOW)).toBe(true);
        expect(isSubscribing({ ...base, subscriptionState: 'grace', subscriptionExpiresAt: FUTURE }, NOW)).toBe(true);
    });

    it('狀態還是 active 但已經到期、沒有到期日、或沒權益的狀態都不算', () => {
        expect(isSubscribing({ ...base, subscriptionState: 'active', subscriptionExpiresAt: PAST }, NOW)).toBe(false);
        expect(isSubscribing({ ...base, subscriptionState: 'active' }, NOW)).toBe(false);
        expect(isSubscribing({ ...base, subscriptionState: 'on_hold', subscriptionExpiresAt: FUTURE }, NOW)).toBe(false);
        expect(isSubscribing({ ...base, subscriptionState: 'pending', subscriptionExpiresAt: FUTURE }, NOW)).toBe(false);
    });
});

describe('matchesPaid（跟後端的 paid 同一個規則）', () => {
    const expired = { ...base, subscriptionState: 'expired', subscriptionExpiresAt: PAST };
    const donor = { ...base, supporter: true, donations: 1 };
    const live = { ...base, subscriptionState: 'active', subscriptionExpiresAt: FUTURE };

    it('subscribed 含過期的，subscribing 不含', () => {
        expect(matchesPaid(expired, 'subscribed', NOW)).toBe(true);
        expect(matchesPaid(expired, 'subscribing', NOW)).toBe(false);
        expect(matchesPaid(live, 'subscribing', NOW)).toBe(true);
    });

    it('any 是訂閱過或贊助過；donated 只看贊助；all 全收', () => {
        expect([base, expired, donor, live].map(device => matchesPaid(device, 'any', NOW))).toEqual([false, true, true, true]);
        expect([base, expired, donor, live].map(device => matchesPaid(device, 'donated', NOW))).toEqual([false, false, true, false]);
        expect(matchesPaid(base, 'all', NOW)).toBe(true);
    });
});

describe('贊助級距', () => {
    it('照金額排：tip_6（700）在 tip_4 與 tip_5 中間，不認得的放最後', () => {
        expect(sortByTier(['dindon_tip_5', 'dindon_tip_x', 'dindon_tip_6', 'dindon_tip_1'], id => id))
            .toEqual(['dindon_tip_1', 'dindon_tip_6', 'dindon_tip_5', 'dindon_tip_x']);
    });

    it('標金額，不認得的原樣', () => {
        expect(tipLabel('dindon_tip_6')).toBe('NT$ 700');
        expect(tipLabel('dindon_tip_9')).toBe('dindon_tip_9');
    });
});

describe('paymentChips', () => {
    it('沒付過款是空的', () => {
        expect(paymentChips(base, NOW)).toEqual([]);
    });

    it('試用、訂閱中、不續訂、寬限期分得出來，帶 base plan', () => {
        const live = { ...base, subscriptionExpiresAt: FUTURE, subscriptionBasePlan: 'yearly' };
        expect(paymentChips({ ...live, subscriptionState: 'active', subscriptionInTrial: true }, NOW)[0]).toMatchObject({ label: '試用中・年繳', tone: 'trial' });
        expect(paymentChips({ ...live, subscriptionState: 'active', subscriptionInTrial: false }, NOW)[0]).toMatchObject({ label: '訂閱中・年繳', tone: 'active' });
        expect(paymentChips({ ...live, subscriptionState: 'canceled', autoRenewing: false }, NOW)[0]).toMatchObject({ label: '不續訂・年繳', tone: 'warn' });
        expect(paymentChips({ ...live, subscriptionState: 'grace', subscriptionBasePlan: null }, NOW)[0]).toMatchObject({ label: '寬限期', tone: 'warn' });
    });

    it('狀態還是 active 但過了到期日，當成已過期；pending 照實寫', () => {
        expect(paymentChips({ ...base, subscriptionState: 'active', subscriptionExpiresAt: PAST }, NOW)[0]).toMatchObject({ label: '已過期', tone: 'ended' });
        expect(paymentChips({ ...base, subscriptionState: 'pending' }, NOW)[0]).toMatchObject({ label: '付款處理中', tone: 'warn' });
    });

    it('贊助過另外一個標籤，說明列出買過的級距（照金額排）', () => {
        const chips = paymentChips({ ...base, supporter: true, donations: 3, donatedTiers: ['dindon_tip_5', 'dindon_tip_1'] }, NOW);
        expect(chips).toEqual([{ label: '贊助 3 筆', tone: 'donor', title: '買過：NT$ 60、NT$ 1000（不算退款的）' }]);
    });
});

describe('orderedCounts', () => {
    it('照順序排、順序外的接後面、0 不列', () => {
        expect(orderedCounts({ expired: 4, weird: 1, active: 2, grace: 0 }, ['active', 'grace', 'expired']))
            .toEqual([{ key: 'active', count: 2 }, { key: 'expired', count: 4 }, { key: 'weird', count: 1 }]);
    });
});
