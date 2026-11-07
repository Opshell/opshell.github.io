import { describe, expect, it } from 'vitest';
import { hasUploaded, inferBadges, inferMemorials, STREAK_THRESHOLDS, tierFor, uploadedWall } from './badges';

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

describe('uploadedWall（App 上傳的）', () => {
    it('兩個空陣列是沒上傳過，要用推算的', () => {
        expect(hasUploaded({ badges: [], memorials: [] })).toBe(false);
        expect(hasUploaded({ badges: [], memorials: [{ id: 'BETA_TESTER', unlockedOn: '2026-09-20' }] })).toBe(true);
    });

    it('12 顆照 App 的順序全列，有上傳的帶等級與日期，沒上傳的是還沒解鎖', () => {
        const wall = uploadedWall({ badges: [{ id: 'STREAK', tier: 'SILVER', unlockedOn: '2026-10-05' }, { id: 'RECORDS', tier: 'GOLD', unlockedOn: '2026-10-01' }], memorials: [] });
        expect(wall.badges).toHaveLength(12);
        expect(wall.badges[0]).toEqual({ key: 'RECORDS', label: '勤勞記帳', tier: 'GOLD', tierLabel: '金級', on: '2026-10-01' });
        expect(wall.badges[1]).toMatchObject({ key: 'STREAK', tierLabel: '銀級' });
        expect(wall.badges[2]).toMatchObject({ key: 'AUTO', tier: null, tierLabel: '還沒解鎖', on: null });
    });

    it('紀念徽章看有沒有上傳；不認得的代號與等級原樣接在後面', () => {
        const wall = uploadedWall({
            badges: [{ id: 'NEW_ONE', tier: 'COSMIC', unlockedOn: '2026-11-01' }],
            memorials: [{ id: 'BETA_FULL_ATTENDANCE', unlockedOn: '2026-10-03' }]
        });
        expect(wall.badges.at(-1)).toEqual({ key: 'NEW_ONE', label: 'NEW_ONE', tier: 'COSMIC', tierLabel: 'COSMIC級', on: '2026-11-01' });
        expect(wall.memorials).toEqual([
            { key: 'BETA_TESTER', label: '勇敢白老鼠', earned: false, on: null },
            { key: 'BETA_FULL_ATTENDANCE', label: '全勤小鐵人', earned: true, on: '2026-10-03' }
        ]);
    });
});
