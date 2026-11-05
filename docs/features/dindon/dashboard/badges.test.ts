import { describe, expect, it } from 'vitest';
import { inferBadges, inferMemorials, STREAK_THRESHOLDS, tierFor } from './badges';

const base = { bestStreak: null, iron: false, betaTesterSince: null, ironAchievedOn: null };

describe('tierFor', () => {
    it('剛好到門檻就算那一階，沒到銅是 null', () => {
        expect(tierFor(2, STREAK_THRESHOLDS)).toBeNull();
        expect(tierFor(3, STREAK_THRESHOLDS)).toBe('BRONZE');
        expect(tierFor(13, STREAK_THRESHOLDS)).toBe('SILVER');
        expect(tierFor(365, STREAK_THRESHOLDS)).toBe('RAINBOW');
        expect(tierFor(999, STREAK_THRESHOLDS)).toBe('RAINBOW');
    });
});

describe('inferBadges', () => {
    it('只有天天打開推得出來，其餘標只在手機上', () => {
        const badges = inferBadges({ ...base, bestStreak: 20 });
        expect(badges).toHaveLength(12);
        expect(badges.find(b => b.key === 'STREAK')).toMatchObject({ basis: 'inferred', tier: 'GOLD', progress: 20, next: 30 });
        expect(badges.filter(b => b.basis === 'phone-only')).toHaveLength(11);
    });

    it('最高階沒有下一階；打卡還沒讀到就不推', () => {
        expect(inferBadges({ ...base, bestStreak: 400 }).find(b => b.key === 'STREAK')?.next).toBeNull();
        expect(inferBadges(base).find(b => b.key === 'STREAK')).toMatchObject({ tier: null, progress: null });
    });
});

describe('inferMemorials', () => {
    it('白老鼠看 beta 資格，鐵人看達成日或活動的鐵人', () => {
        expect(inferMemorials(base).map(m => m.earned)).toEqual([false, false]);
        const [beta, iron] = inferMemorials({ ...base, betaTesterSince: '2026-09-19', iron: true });
        expect(beta).toMatchObject({ earned: true, on: '2026-09-19' });
        expect(iron).toMatchObject({ earned: true, on: null });
        expect(inferMemorials({ ...base, ironAchievedOn: '2026-10-03' })[1]).toMatchObject({ earned: true, on: '2026-10-03' });
    });
});
