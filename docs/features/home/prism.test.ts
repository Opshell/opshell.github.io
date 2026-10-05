import type { Post } from '@shared/schemas/post.schema';
import type { Chapter } from './contents';
import type { ElementKey } from './prism';
import { describe, expect, it } from 'vitest';
import { aimFromPointer, along, buildRays, END_X, exitsFor, ORB, photonAt, refract, SOURCE_Y, stars, strandPoints } from './prism';

const post = (url: string, date = '2026-01-01'): Post => ({ title: url, url, date, category: [], tags: [], excerpt: '' } as unknown as Post);
const chapter = (key: string, count: number, date?: string): Chapter => ({ key, label: key, count, first: post(`/${key}/1`), latest: post(`/${key}/2`, date) });
const fromCenter = (p: { x: number; y: number }) => Math.hypot(p.x - ORB.cx, p.y - ORB.cy);

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

describe('光絲：白光在玻璃裡演化成元素', () => {
    const { entry } = refract(SOURCE_Y.rest);
    const [exit] = exitsFor(SOURCE_Y.rest, 1);
    const end = { x: END_X, y: 80 };
    const all: ElementKey[] = ['metal', 'earth', 'fire', 'wood', 'wind', 'water'];

    it('每種元素都從入口出發、到自己的出口結束，最後一段對準那道光', () => {
        for (const element of all) {
            for (const thread of strandPoints(element, entry, exit, end, 2.3, 1)) {
                expect(thread[0]).toEqual(entry);
                expect(thread.at(-1)).toEqual(exit);
                const before = thread.at(-2)!;
                const tangent = Math.atan2(exit.y - before.y, exit.x - before.x);
                expect(tangent, element).toBeCloseTo(Math.atan2(end.y - exit.y, end.x - exit.x), 0);
            }
        }
    });

    it('金是直線段（點很少）、在玻璃裡反射，不會跑出 O', () => {
        const [path] = strandPoints('metal', entry, exit, end, 4, 0);
        expect(path.length).toBeLessThan(8);
        for (const p of path) expect(fromCenter(p)).toBeLessThanOrEqual(ORB.r + 0.5);
    });

    it('木兩股、風三縷、其他一股；土往下墜', () => {
        expect(strandPoints('wood', entry, exit, end, 1)).toHaveLength(2);
        expect(strandPoints('wind', entry, exit, end, 1)).toHaveLength(3);
        expect(strandPoints('water', entry, exit, end, 1)).toHaveLength(1);
        const [earth] = strandPoints('earth', entry, exit, end, 1);
        const [water] = strandPoints('water', entry, exit, end, 0);
        const middle = Math.floor(earth.length / 2);
        expect(earth[middle].y).toBeGreaterThan(water[middle].y - 30);
        expect(earth[middle].y - (entry.y + exit.y) / 2).toBeGreaterThan(ORB.r * 0.2);
    });

    it('會動：同一種元素在不同時間形狀不一樣', () => {
        for (const element of all) {
            expect(strandPoints(element, entry, exit, end, 0, 0), element).not.toEqual(strandPoints(element, entry, exit, end, 0.9, 0));
        }
    });

    it('along 照折線取點', () => {
        const line = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
        expect(along(line, 0)).toEqual({ x: 0, y: 0 });
        expect(along(line, 0.5)).toEqual({ x: 10, y: 0 });
        expect(along(line, 0.75)).toEqual({ x: 10, y: 5 });
    });
});

describe('光點、瞄準、星塵', () => {
    it('光點從出口走到終點，越遠越散', () => {
        const exit = { x: 340, y: 262 };
        const ray = { y: 100, spread: 10 };
        expect(photonAt(exit, ray, 0, 1)).toEqual(exit);
        const end = photonAt(exit, ray, 1, 1);
        expect(end.x).toBe(END_X);
        expect(end.y).toBeCloseTo(108);
    });

    it('滑鼠的高度換成入射光的高度，超出範圍的夾住', () => {
        expect(aimFromPointer(0)).toBe(SOURCE_Y.min);
        expect(aimFromPointer(1.4)).toBe(SOURCE_Y.max);
    });

    it('星塵每次都一樣', () => {
        expect(stars(5)).toEqual(stars(5));
        expect(stars(5)).toHaveLength(5);
    });
});
