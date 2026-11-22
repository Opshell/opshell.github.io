import type { AdminCoinItem } from './schemas/admin.schema';
import { describe, expect, it } from 'vitest';
import { coinAdjustError, coinItemCreateBody, coinItemDraftOf, coinItemFormError, coinItemPatch, emptyCoinItemDraft, signedCoins } from './coins';

const plan: AdminCoinItem = {
    id: 1,
    code: 'plan_pro_7',
    kind: 'plan',
    name: '進階方案 7 天',
    price: 10,
    planTier: 'pro',
    days: 7,
    active: true,
    sortOrder: 0,
    createdAt: '',
    updatedAt: ''
};
const badge: AdminCoinItem = { ...plan, id: 5, code: 'badge_gold_star', kind: 'badge', name: '金星徽章', price: 50, planTier: null, days: 0, active: false };

describe('商品的欄位（api.md 30.7）', () => {
    const draft = { ...emptyCoinItemDraft(), code: 'plan_max_7', name: '深度方案 7 天', price: '20', planTier: 'max' as const, days: '7' };

    it('新增：代號小寫英數底線、名稱 20 字、價格 1～100000', () => {
        expect(coinItemFormError(draft, true)).toBe('');
        expect(coinItemFormError({ ...draft, code: 'Plan-7' }, true)).toContain('小寫');
        expect(coinItemFormError({ ...draft, code: 'a'.repeat(41) }, true)).toContain('40');
        expect(coinItemFormError({ ...draft, name: '字'.repeat(21) }, true)).toContain('20');
        expect(coinItemFormError({ ...draft, name: '金星\n徽章' }, true)).toContain('換行');
        expect(coinItemFormError({ ...draft, price: '0' }, true)).toContain('價格');
        expect(coinItemFormError({ ...draft, price: '100001' }, true)).toContain('價格');
        expect(coinItemFormError({ ...draft, price: '1.5' }, true)).toContain('價格');
    });

    it('方案要 1～366 天，其他種類不看天數', () => {
        expect(coinItemFormError({ ...draft, days: '0' }, true)).toContain('天數');
        expect(coinItemFormError({ ...draft, days: '367' }, true)).toContain('天數');
        expect(coinItemFormError({ ...draft, kind: 'badge', days: '' }, true)).toBe('');
    });

    it('修改時不看代號，排序要填', () => {
        const edit = coinItemDraftOf(plan);
        expect(coinItemFormError({ ...edit, code: 'X' }, false)).toBe('');
        expect(coinItemFormError({ ...edit, sortOrder: '' }, false)).toContain('排序');
        expect(coinItemFormError({ ...draft, sortOrder: '' }, true)).toBe('');
    });

    it('新增的 body：只有方案帶 plan_tier 與 days，排序留空不送', () => {
        expect(coinItemCreateBody(draft)).toEqual({ code: 'plan_max_7', kind: 'plan', name: '深度方案 7 天', price: 20, planTier: 'max', days: 7, active: false });
        expect(coinItemCreateBody({ ...draft, kind: 'title_prefix', code: 'prefix_sheriff', name: ' 警長 ', sortOrder: '3', active: true }))
            .toEqual({ code: 'prefix_sheriff', kind: 'title_prefix', name: '警長', price: 20, active: true, sortOrder: 3 });
    });

    it('修改只送變了的欄位；非方案不送 plan_tier 與 days', () => {
        expect(coinItemPatch(plan, coinItemDraftOf(plan))).toEqual({});
        expect(coinItemPatch(plan, { ...coinItemDraftOf(plan), price: '12', active: false })).toEqual({ price: 12, active: false });
        expect(coinItemPatch(plan, { ...coinItemDraftOf(plan), planTier: 'max', days: '30' })).toEqual({ planTier: 'max', days: 30 });
        expect(coinItemPatch(badge, { ...coinItemDraftOf(badge), active: true, planTier: 'max', days: '30' })).toEqual({ active: true });
    });
});

describe('手動調整（api.md 30.7）', () => {
    const draft = { amount: '10', reason: '補登 11-25 寄信來的回報', countsForRank: true };

    it('金額不能是 0、正負 100000 以內，可以是負的', () => {
        expect(coinAdjustError(draft)).toBe('');
        expect(coinAdjustError({ ...draft, amount: '-30' })).toBe('');
        expect(coinAdjustError({ ...draft, amount: '0' })).toContain('0');
        expect(coinAdjustError({ ...draft, amount: '100001' })).toContain('100000');
        expect(coinAdjustError({ ...draft, amount: '+5' })).toContain('整數');
        expect(coinAdjustError({ ...draft, amount: '' })).toContain('整數');
    });

    it('原因必填、最多 100 字、不能換行', () => {
        expect(coinAdjustError({ ...draft, reason: ' ' })).toContain('必填');
        expect(coinAdjustError({ ...draft, reason: '字'.repeat(100) })).toBe('');
        expect(coinAdjustError({ ...draft, reason: '字'.repeat(101) })).toContain('100');
        expect(coinAdjustError({ ...draft, reason: '補登\n回報' })).toContain('換行');
    });

    it('帳本的金額帶正負號', () => {
        expect(signedCoins(10)).toBe('+10');
        expect(signedCoins(-10)).toBe('-10');
    });
});
