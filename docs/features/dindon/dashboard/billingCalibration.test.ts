import type { DayModel, GeminiBilling, UsageReport } from './schemas/admin.schema';
import { describe, expect, it } from 'vitest';
import { billingRate, breakdown, impliedRate, reconcileDays, skuModel, skuRates } from './billingCalibration';

const prices: UsageReport['pricesUsed'] = {
    'gemini-3.1-flash-lite': { inputPerMillionUsd: 0.25, outputPerMillionUsd: 1.5 },
    'gemini-3.5-flash-lite': { inputPerMillionUsd: 0.3, outputPerMillionUsd: 2.5 }
};

// 照 2026-10-02 查到的真實帳單：3.1 的輸出 34,356 token 收 NT$1.6338（匯率 31.708）
const skus: GeminiBilling['skus'] = [
    { sku: 'Generate content output token count gemini 3.1 flash lite preview text', amount: 34356, unit: 'count', cost: 1.6338, credits: 0, paid: 1.6338 },
    { sku: 'Generate content input token count gemini 3.1 flash lite preview text', amount: 103131, unit: 'count', cost: 0.8175, credits: 0, paid: 0.8175 },
    { sku: 'Grounding with Google Search', amount: 3, unit: 'count', cost: 1, credits: 0, paid: 1 }
];

describe('skuModel', () => {
    it('計價項目對到後端的模型名稱', () => {
        expect(skuModel('Generate content output token count gemini 3.1 flash lite preview text')).toEqual({ model: 'gemini-3.1-flash-lite', direction: 'output' });
        expect(skuModel('Generate content input token count gemini 3.5 flash lite image')).toEqual({ model: 'gemini-3.5-flash-lite', direction: 'input' });
        expect(skuModel('Grounding with Google Search')).toBeNull();
    });
});

describe('impliedRate', () => {
    it('從帳單反推匯率，認不得的計價項目不算', () => {
        expect(impliedRate(skus, prices)).toBeCloseTo(31.7, 1);
        expect(impliedRate([], prices)).toBeNull();
    });

    it('每個計價項目各自反推：單價對的話都差不多', () => {
        const rates = skuRates(skus, prices);
        expect(rates).toHaveLength(2);
        expect(rates.every(r => Math.abs(r.rate - 31.7) < 0.1)).toBe(true);
    });
});

describe('帳單的匯率', () => {
    it('有 usd_rate 用它，舊的後端沒給就用反推的', () => {
        const base = { skus, usdRate: 31.735 } as unknown as GeminiBilling;
        expect(billingRate(base, prices)).toBe(31.735);
        expect(billingRate({ ...base, usdRate: 0 }, prices)).toBeCloseTo(31.7, 1);
    });
});

describe('reconcileDays／breakdown', () => {
    // 照後端 10-03 量的：9/25 清庫前（後端 0）、9/29 有測試與取消、10/01 完全對上、10/02 還沒匯出
    const billing = {
        since: '2026-09-03',
        dataThrough: '2026-10-01',
        daily: [
            { date: '2026-10-01', cost: 0.32, credits: 0, paid: 0.32, items: [] },
            { date: '2026-09-29', cost: 1, credits: 0, paid: 1, items: [] },
            { date: '2026-09-25', cost: 0.2, credits: 0, paid: 0.2, items: [] }
        ]
    } as unknown as GeminiBilling;
    const row = (date: string, group: 'users' | 'test', costUsd: number, canceledCostEstUsd = 0) =>
        ({ date, model: 'gemini-3.1-flash-lite', group, costUsd, canceledCostEstUsd }) as DayModel;
    const models = [
        row('2026-10-02', 'users', 0.01),
        row('2026-10-01', 'users', 0.01),
        row('2026-09-29', 'users', 0.02, 0.001),
        row('2026-09-29', 'test', 0.005)
    ];

    it('只拆帳單已經匯出的日子，新的在前；其他是帳單扣掉三塊剩下的', () => {
        const days = reconcileDays(billing, models, 32);
        expect(days.map(day => day.date)).toEqual(['2026-10-01', '2026-09-29', '2026-09-25']);
        expect(days[0]).toMatchObject({ paidTwd: 0.32, usersTwd: 0.32, testTwd: 0, canceledTwd: 0, beforeReset: false });
        expect(days[0].otherTwd).toBeCloseTo(0);
        expect(days[1].usersTwd).toBeCloseTo(0.64);
        expect(days[1].testTwd).toBeCloseTo(0.16);
        expect(days[1].canceledTwd).toBeCloseTo(0.032);
        expect(days[1].otherTwd).toBeCloseTo(1 - 0.64 - 0.16 - 0.032);
        expect(days[2]).toMatchObject({ usersTwd: 0, beforeReset: true });
    });

    it('清庫前整天的帳單另外一塊，不算進「其他」', () => {
        const total = breakdown(reconcileDays(billing, models, 32));
        expect(total.paidTwd).toBeCloseTo(1.52);
        expect(total.resetTwd).toBeCloseTo(0.2);
        expect(total.otherTwd).toBeCloseTo(1 - 0.64 - 0.16 - 0.032);
        expect(total.usersTwd + total.testTwd + total.canceledTwd + total.resetTwd + total.otherTwd).toBeCloseTo(total.paidTwd);
    });
});
