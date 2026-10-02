import type { GeminiBilling, UsageReport } from './schemas/admin.schema';
import { describe, expect, it } from 'vitest';
import { calibrationFactor, costBasis, gapMultiple, impliedRate, reconcileDays, skuModel, skuRates } from './billingCalibration';

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

describe('reconcileDays／calibrationFactor', () => {
    const billing = {
        since: '2026-09-03',
        dataThrough: '2026-10-01',
        daily: [
            { date: '2026-10-01', cost: 0.6, credits: 0, paid: 0.6, items: [] },
            { date: '2026-09-25', cost: 0.2, credits: 0, paid: 0.2, items: [] }
        ]
    } as unknown as GeminiBilling;
    const usageDaily = [
        { date: '2026-10-02', costUsd: 0.01 },
        { date: '2026-10-01', costUsd: 0.01 },
        { date: '2026-09-25', costUsd: 0.005 }
    ] as unknown as UsageReport['daily'];

    it('只對帳單已經匯出的日子，新的在前；估算換成台幣算差額', () => {
        const days = reconcileDays(billing, usageDaily, 30);
        expect(days.map(day => day.date)).toEqual(['2026-10-01', '2026-09-25']);
        expect(days[0]).toMatchObject({ estimateUsd: 0.01, actualTwd: 0.6 });
        expect(days[0].estimateTwd).toBeCloseTo(0.3);
        expect(days[0].gapTwd).toBeCloseTo(0.3);
    });

    it('係數＝實付 ÷ 估算；除以匯率就是差了幾倍', () => {
        const days = reconcileDays(billing, usageDaily, 30);
        const factor = calibrationFactor(days);
        expect(factor).toBeCloseTo(0.8 / 0.015);
        expect(gapMultiple(factor, 30)).toBeCloseTo(0.8 / 0.015 / 30);
        expect(calibrationFactor([])).toBeNull();
    });

    it('係數的來源：期間實付與資料庫估算的加總，舊到新的日期', () => {
        expect(costBasis(reconcileDays(billing, usageDaily, 30))).toEqual({ paidTwd: 0.8, estimateUsd: 0.015, from: '2026-09-25', to: '2026-10-01' });
        expect(costBasis([])).toBeNull();
    });
});
