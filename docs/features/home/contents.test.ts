import type { Post } from '@shared/schemas/post.schema';
import { normalizeCategory } from '@shared/utils/spectrum';
import { describe, expect, it } from 'vitest';
import { chapters, latestPosts, postsInCategories, seriesOf, yearlyCounts } from './contents';

const post = (url: string, date: string, category = 'typescript-thirty-days'): Post =>
    ({ url, title: url, date, image: '', category: [category], tags: [], excerpt: '' });

describe('首頁目錄', () => {
    const posts = [
        post('/a', '2024-09-01'),
        post('/b', '2024-09-30'),
        post('/c', '2026-01-08', '\'Belief\''),
        post('/d', '2025-09-10', 'Belief '),
        post('/e', '2025-01-01', '未分類')
    ];

    it('最近寫的：新的在前、取前幾篇', () => {
        expect(latestPosts(posts, 3).map(p => p.url)).toEqual(['/c', '/d', '/e']);
    });

    it('分類裡的引號與空白合併；文章多的在前、未分類最後；第一篇與最新一篇', () => {
        expect(normalizeCategory(' \'developer \' ')).toBe('developer');
        const list = chapters(posts);
        // 篇數一樣時照名字排
        expect(list.map(c => [c.key, c.count])).toEqual([['typescript-thirty-days', 2], ['Belief', 2], ['未分類', 1]]);
        expect(list[0]).toMatchObject({ label: 'TypeScript 三十天', first: { url: '/a' }, latest: { url: '/b' } });
        expect(list[1].label).toBe('靈魂財富');
    });

    it('稜鏡選了一道光：只看那幾類；null 是全部', () => {
        expect(postsInCategories(posts, ['Belief'], 5).map(p => p.url)).toEqual(['/c', '/d']);
        expect(postsInCategories(posts, null, 2).map(p => p.url)).toEqual(['/c', '/d']);
    });

    it('連載：篇數夠多的分類，由舊到新', () => {
        const series = seriesOf(posts, 2);
        expect(series.map(s => s.key)).toEqual(['typescript-thirty-days', 'Belief']);
        expect(series[0].posts.map(p => p.url)).toEqual(['/a', '/b']);
    });
});

describe('yearlyCounts', () => {
    it('從第一篇那年到最新一篇那年，中間沒寫的年是 0', () => {
        const list = ['2022-09-01', '2022-10-01', '2024-09-01', '2026-01-08'].map(date => post(`/${date}`, date));
        expect(yearlyCounts(list)).toEqual([
            { year: '2022', count: 2 },
            { year: '2023', count: 0 },
            { year: '2024', count: 1 },
            { year: '2025', count: 0 },
            { year: '2026', count: 1 }
        ]);
        expect(yearlyCounts([])).toEqual([]);
    });
});
