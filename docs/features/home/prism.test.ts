import type { Post } from '@shared/schemas/post.schema';
import type { Chapter } from './contents';
import { describe, expect, it } from 'vitest';
import { aimFromPointer, buildRays, ORB, photonAt, refract, SOURCE_Y, stars } from './prism';

const post = (url: string, date = '2026-01-01'): Post => ({ title: url, url, date, category: [], tags: [], excerpt: '' } as unknown as Post);
const chapter = (key: string, count: number, date?: string): Chapter => ({ key, label: key, count, first: post(`/${key}/1`), latest: post(`/${key}/2`, date) });

describe('buildRays', () => {
    it('照光譜順序由上往下排，少於兩篇的併成「其他」', () => {
        const rays = buildRays([
            chapter('typescript-thirty-days', 31),
            chapter('vitepress-thirty-days', 30),
            chapter('Git', 7),
            chapter('vue', 1, '2026-03-01'),
            chapter('未分類', 1, '2026-02-01')
        ]);
        expect(rays.map(ray => ray.key)).toEqual(['vitepress-thirty-days', 'Git', 'typescript-thirty-days', '其他']);
        expect(rays.at(-1)).toMatchObject({ count: 2, href: '/timeline.html', members: ['vue', '未分類'] });
        expect(rays.at(-1)!.latest.url).toBe('/vue/2');
        const ys = rays.map(ray => ray.y);
        expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    });

    it('文章越多光越寬、光點越多', () => {
        const [big, small] = buildRays([chapter('vitepress-thirty-days', 30), chapter('Git', 3)]);
        expect(big.spread).toBeGreaterThan(small.spread);
        expect(big.photons).toBeGreaterThan(small.photons);
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

describe('refract', () => {
    const onCircle = (p: { x: number; y: number }) => Math.hypot(p.x - ORB.cx, p.y - ORB.cy);

    it('入射點在 O 的左半邊、出射點在右半邊，都在圓上', () => {
        const { entry, exit } = refract(SOURCE_Y.rest);
        expect(entry.x).toBeLessThan(ORB.cx);
        expect(exit.x).toBeGreaterThan(ORB.cx);
        expect(onCircle(entry)).toBeCloseTo(ORB.r, 0);
        expect(onCircle(exit)).toBeCloseTo(ORB.r, 0);
    });

    it('從下面進來就從上面出去，反過來也是；水平進來水平出去', () => {
        expect(refract(SOURCE_Y.max).exit.y).toBeLessThan(ORB.cy);
        expect(refract(SOURCE_Y.min).exit.y).toBeGreaterThan(ORB.cy);
        expect(refract(ORB.cy).exit.y).toBeCloseTo(ORB.cy, 0);
    });
});

describe('光點與瞄準', () => {
    it('光點從出射點走到終點，越遠越散', () => {
        const exit = { x: 340, y: 262 };
        const ray = { y: 100, spread: 10 };
        expect(photonAt(exit, ray, 0, 1)).toEqual(exit);
        const end = photonAt(exit, ray, 1, 1);
        expect(end.x).toBe(520);
        expect(end.y).toBeCloseTo(108);
    });

    it('滑鼠的高度換成入射光的高度，超出範圍的夾住', () => {
        expect(aimFromPointer(0)).toBe(SOURCE_Y.min);
        expect(aimFromPointer(1.4)).toBe(SOURCE_Y.max);
    });

    it('星塵每次都一樣（伺服器與瀏覽器畫同一片天空）', () => {
        expect(stars(5)).toEqual(stars(5));
        expect(stars(5)).toHaveLength(5);
    });
});
