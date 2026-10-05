import type { Post } from '@shared/schemas/post.schema';
import type { Chapter } from './contents';
import { describe, expect, it } from 'vitest';
import { aimFromPointer, along, buildRays, exitsFor, ORB, rayFor, refract, SOURCE_Y, stars } from './prism';

const post = (url: string, date = '2026-01-01'): Post => ({ title: url, url, date, category: [], tags: [], excerpt: '' } as unknown as Post);
const chapter = (key: string, count: number, date?: string): Chapter => ({ key, label: key, count, first: post(`/${key}/1`), latest: post(`/${key}/2`, date) });
const fromCenter = (p: { x: number; y: number }) => Math.hypot(p.x - ORB.cx, p.y - ORB.cy);

describe('buildRays', () => {
    it('照光譜順序排，少於兩篇的併成「其他」', () => {
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
    });

    it('由上往下照順序分到不同的元素，顏色重複也不會重複元素', () => {
        const rays = buildRays([chapter('vitepress-thirty-days', 30), chapter('typescript-thirty-days', 31), chapter('vue', 1)]);
        expect(rays.map(ray => ray.hue)).toEqual(['amber', 'indigo', 'indigo']);
        expect(rays.map(ray => ray.element.glyph)).toEqual(['金', '土', '火']);
    });

    it('文章越多光越寬、光點越多', () => {
        const [big, small] = buildRays([chapter('vitepress-thirty-days', 30), chapter('Git', 3)]);
        expect(big.spread).toBeGreaterThan(small.spread);
        expect(big.photons).toBeGreaterThan(small.photons);
    });

    it('最多幾道光：超過的都進「其他」', () => {
        const list = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((key, index) => chapter(key, 10 - index));
        const rays = buildRays(list, 4);
        expect(rays).toHaveLength(4);
        expect(rays.at(-1)).toMatchObject({ key: '其他', count: 7 + 6 + 5 + 4 });
    });
});

describe('入射與出口', () => {
    it('入射點在 O 的左半邊、在圓上', () => {
        const { entry } = refract(SOURCE_Y.rest);
        expect(entry.x).toBeLessThan(ORB.cx);
        expect(fromCenter(entry)).toBeCloseTo(ORB.r, 0);
    });

    it('從下面進來就從上面出去；水平進來水平出去', () => {
        expect(refract(SOURCE_Y.max).exitAngle).toBeLessThan(0);
        expect(refract(SOURCE_Y.min).exitAngle).toBeGreaterThan(0);
        expect(refract(ORB.cy).exitAngle).toBeCloseTo(0);
    });

    it('每道光的出口沿右緣分開、由上往下，不擠在同一點', () => {
        const exits = exitsFor(SOURCE_Y.rest, 6);
        expect(exits).toHaveLength(6);
        for (const exit of exits) {
            expect(exit.x).toBeGreaterThan(ORB.cx);
            expect(fromCenter(exit)).toBeCloseTo(ORB.r, 0);
        }
        const ys = exits.map(exit => exit.y);
        expect([...ys].sort((a, b) => a - b)).toEqual(ys);
        expect(ys[5] - ys[0]).toBeGreaterThan(ORB.r * 0.5);
    });
});

describe('along', () => {
    it('照折線取點', () => {
        const line = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
        expect(along(line, 0)).toEqual({ x: 0, y: 0 });
        expect(along(line, 0.5)).toEqual({ x: 10, y: 0 });
        expect(along(line, 0.75)).toEqual({ x: 10, y: 5 });
    });
});

describe('瞄準、星塵、文章屬於哪道光', () => {
    it('滑鼠的高度換成入射光的高度，超出範圍的夾住', () => {
        expect(aimFromPointer(0)).toBe(SOURCE_Y.min);
        expect(aimFromPointer(1.4)).toBe(SOURCE_Y.max);
    });

    it('星塵每次都一樣', () => {
        expect(stars(5, 800, 400)).toEqual(stars(5, 800, 400));
        expect(stars(5, 800, 400)).toHaveLength(5);
        for (const star of stars(30, 800, 400)) expect(star.y).toBeLessThanOrEqual(400);
    });

    it('rayFor：找自己那道光；併進「其他」的也找得到；沒分類算未分類', () => {
        const rays = buildRays([chapter('Git', 7), chapter('vue', 1), chapter('未分類', 1)]);
        expect(rayFor(rays, 'Git')?.key).toBe('Git');
        expect(rayFor(rays, 'vue')?.key).toBe('其他');
        expect(rayFor(rays, undefined)?.key).toBe('其他');
        expect(rayFor(rays, 'nope')).toBeUndefined();
    });
});
