import type { FeatureCandidate } from './schemas/admin.schema';
import { describe, expect, it } from 'vitest';
import { buildFeaturePatch, countByEvent, defaultEventFor, filterByEvent } from './featureVotes';
import { SaveFeatureCandidatePayload } from './schemas/admin.schema';

const base: FeatureCandidate = {
    id: 1,
    title: '匯出 CSV',
    description: '',
    status: 'voting',
    event: 'beta',
    votes: 3,
    createdBy: 'admin@example.com',
    createdAt: '2026-09-27T00:00:00Z',
    updatedAt: '2026-09-27T00:00:00Z'
};
const list: FeatureCandidate[] = [
    { ...base, id: 4, event: 'frontier', votes: 12 },
    { ...base, id: 1 },
    { ...base, id: 2, event: 'frontier', votes: 1 }
];

describe('照活動篩', () => {
    it('全部就原樣回傳', () => {
        expect(filterByEvent(list, 'all')).toBe(list);
    });

    it('只留那個活動的，保留後端的順序', () => {
        expect(filterByEvent(list, 'frontier').map(feature => feature.id)).toEqual([4, 2]);
        expect(filterByEvent(list, 'beta').map(feature => feature.id)).toEqual([1]);
    });

    it('算每個活動各幾個，沒有的是 0', () => {
        expect(countByEvent(list)).toEqual({ beta: 1, frontier: 2 });
        expect(countByEvent([])).toEqual({ beta: 0, frontier: 0 });
    });

    it('新增預設建在正在看的活動，看全部時建在拓荒季', () => {
        expect(defaultEventFor('beta')).toBe('beta');
        expect(defaultEventFor('frontier')).toBe('frontier');
        expect(defaultEventFor('all')).toBe('frontier');
    });
});

describe('組送出內容', () => {
    const form = { title: '匯出 CSV', description: '', status: 'voting' as const, event: 'beta' as const };

    it('新增一定帶 event：後端沒帶會當 beta', () => {
        expect(buildFeaturePatch({ ...form, event: 'frontier' })).toEqual({ ...form, event: 'frontier' });
    });

    it('修改只送變了的欄位', () => {
        expect(buildFeaturePatch(form, base)).toEqual({});
        expect(buildFeaturePatch({ ...form, event: 'frontier' }, base)).toEqual({ event: 'frontier' });
        expect(buildFeaturePatch({ ...form, title: ' 匯出 CSV ', status: 'dropped' }, base)).toEqual({ status: 'dropped' });
    });

    it('送出前的 Schema 認得兩個活動，其他擋下', () => {
        expect(SaveFeatureCandidatePayload.parse({ event: 'frontier' })).toEqual({ event: 'frontier' });
        expect(SaveFeatureCandidatePayload.safeParse({ event: 'Frontier' }).success).toBe(false);
    });
});
