import type { PlayVitals } from './schemas/admin.schema';
import { describe, expect, it } from 'vitest';
import { formatBytes, formatMoney, latestMetric, reportKind, skuLabel } from './googleData';

describe('skuLabel', () => {
    it('拆成模型、輸入輸出、文字圖片', () => {
        expect(skuLabel('Generate content input token count gemini 3.1 flash lite preview text')).toBe('3.1 flash lite preview・輸入・文字');
        expect(skuLabel('Generate content output token count gemini 3.5 flash lite text')).toBe('3.5 flash lite・輸出・文字');
        expect(skuLabel('Generate content input token count gemini 3.1 flash lite preview image')).toBe('3.1 flash lite preview・輸入・圖片');
    });

    it('認不出來的照原文', () => {
        expect(skuLabel('Grounding with Google Search')).toBe('Grounding with Google Search');
    });
});

describe('latestMetric', () => {
    it('找最近一天有值的；使用者太少時沒有', () => {
        const set: PlayVitals['crash'] = {
            through: '2026-09-30',
            days: [
                { date: '2026-09-29', metrics: { crashRate: 0.01 } },
                { date: '2026-09-30', metrics: {} }
            ]
        };
        expect(latestMetric(set, 'crashRate')).toEqual({ date: '2026-09-29', value: 0.01 });
        expect(latestMetric({ through: null, days: [] }, 'crashRate')).toBeNull();
    });
});

describe('格式', () => {
    it('錢、檔案大小、報表種類', () => {
        expect(formatMoney(2.8)).toBe('NT$2.80');
        expect(formatMoney(1.5, 'USD')).toBe('USD 1.50');
        expect(formatMoney(-0.15)).toBe('-NT$0.15');
        expect(formatMoney(0.00031)).toBe('NT$0.0003');
        expect(formatBytes(512)).toBe('512 B');
        expect(formatBytes(2048)).toBe('2.0 KB');
        expect(reportKind('stats/store_performance/store_performance_me.opshell.dindon_202609_country.csv')).toBe('商店頁成效');
        expect(reportKind('reviews/reviews_me.opshell.dindon_202610.csv')).toBe('評論');
        expect(reportKind('something/else.csv')).toBe('其他');
    });
});
