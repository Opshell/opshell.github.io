import type { Post } from '@shared/schemas/post.schema';
import type { Chapter } from './contents';
import { describe, expect, it } from 'vitest';
import { buildRays, ORB } from './prism';

const post = (url: string): Post => ({ title: url, url, date: '2026-01-01', category: [], tags: [], excerpt: '' } as unknown as Post);
const chapter = (key: string, count: number): Chapter => ({ key, label: key, count, first: post(`/${key}/1`), latest: post(`/${key}/2`) });

describe('buildRays', () => {
    it('照光譜順序由上往下排，少於兩篇的併成「其他」', () => {
        const rays = buildRays([
            chapter('typescript-thirty-days', 31),
            chapter('vitepress-thirty-days', 30),
            chapter('Git', 7),
            chapter('vue', 1),
            chapter('未分類', 1)
        ]);
        expect(rays.map(ray => ray.key)).toEqual(['vitepress-thirty-days', 'Git', 'typescript-thirty-days', '其他']);
        expect(rays.at(-1)).toMatchObject({ count: 2, href: '/timeline.html', members: ['vue', '未分類'] });
        expect(rays[0].members).toEqual(['vitepress-thirty-days']);
        const ys = rays.map(ray => ray.y);
        expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    });

    it('文章越多光越寬', () => {
        const [big, small] = buildRays([chapter('vitepress-thirty-days', 30), chapter('Git', 3)]);
        expect(big.spread).toBeGreaterThan(small.spread);
    });

    it('只有一道光時放在 O 的正右方', () => {
        const [only] = buildRays([chapter('Git', 5)]);
        expect(only.y).toBe(ORB.cy);
    });

    it('最多幾道光：超過的都進「其他」', () => {
        const list = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((key, index) => chapter(key, 10 - index));
        const rays = buildRays(list, 4);
        expect(rays).toHaveLength(4);
        expect(rays.at(-1)).toMatchObject({ key: '其他', count: 7 + 6 + 5 + 4 });
    });
});
