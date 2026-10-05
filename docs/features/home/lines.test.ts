import type { ElementKey, Ray } from './prism';
import { describe, expect, it } from 'vitest';
import { LINE_HEIGHT, lineStyle, rayFor, TILES, tileSvg } from './lines';

const ALL = Object.keys(TILES) as ElementKey[];

describe('元素的線', () => {
    it('六種元素都有', () => {
        expect(ALL.sort()).toEqual(['earth', 'fire', 'metal', 'water', 'wind', 'wood']);
    });

    it('重複的接縫對得起來：每條帶子、細線在一段的頭尾高度與粗細一樣', () => {
        for (const key of ALL) {
            const { period, parts } = TILES[key];
            for (const part of parts) {
                if (part.kind === 'mark') continue;
                expect(part.center(0), key).toBeCloseTo(part.center(period), 5);
                if (part.kind === 'band') expect(part.width(0), key).toBeCloseTo(part.width(period), 5);
            }
        }
    });

    it('都畫在線的高度裡面', () => {
        for (const key of ALL) {
            const { period, parts } = TILES[key];
            for (const part of parts) {
                if (part.kind === 'mark') continue;
                for (let x = 0; x <= period; x += 1) {
                    const half = part.kind === 'band' ? part.width(x) / 2 : part.width / 2;
                    expect(part.center(x) - half, `${key} @${x}`).toBeGreaterThanOrEqual(0);
                    expect(part.center(x) + half, `${key} @${x}`).toBeLessThanOrEqual(LINE_HEIGHT);
                }
            }
        }
    });

    it('土比水厚、沉在下面；火往上長', () => {
        const earth = TILES.earth.parts[0];
        const water = TILES.water.parts[0];
        const fire = TILES.fire.parts[0];
        if (earth.kind !== 'band' || water.kind !== 'band' || fire.kind !== 'band') throw new Error('應該是帶子');
        expect(earth.width(48)).toBeGreaterThan(water.width(12) + 2);
        expect(earth.center(0)).toBeGreaterThan(LINE_HEIGHT / 2);
        // 火舌：上緣比底部高很多，底部固定
        const top = (x: number) => fire.center(x) - fire.width(x) / 2;
        const bottom = (x: number) => fire.center(x) + fire.width(x) / 2;
        expect(top(5)).toBeLessThan(top(0) - 4);
        expect(bottom(5)).toBeCloseTo(bottom(0), 5);
    });

    it('sVG 與 style：寬度是一段的長度、可以放進 url()', () => {
        expect(tileSvg('wood')).toContain('viewBox="0 0 44 14"');
        const style = lineStyle('water');
        expect(style['--line-w']).toBe('48px');
        expect(style['--line-mask']).toMatch(/^url\("data:image\/svg\+xml,%3Csvg/);
        expect(style['--line-mask'].slice(5, -2)).not.toContain('"');
    });
});

describe('rayFor', () => {
    const ray = (key: string, members: string[]) => ({ key, members } as unknown as Ray);
    const rays = [ray('Git', ['Git']), ray('其他', ['vue', '未分類'])];

    it('找自己那道光；併進「其他」的也找得到；沒分類算未分類', () => {
        expect(rayFor(rays, 'Git')?.key).toBe('Git');
        expect(rayFor(rays, 'vue')?.key).toBe('其他');
        expect(rayFor(rays, undefined)?.key).toBe('其他');
        expect(rayFor(rays, 'nope')).toBeUndefined();
    });
});
