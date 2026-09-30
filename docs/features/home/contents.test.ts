import type { Post } from '@shared/schemas/post.schema';
import { normalizeCategory } from '@shared/utils/spectrum';
import { describe, expect, it } from 'vitest';
import { chapters, latestPosts } from './contents';

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
});
