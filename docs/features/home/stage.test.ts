import type { StageLayout } from './stage';
import { describe, expect, it } from 'vitest';
import { ORB, SOURCE_Y } from './prism';
import { hitRay, lightPath, localMatrix, toLocal, toScreen } from './stage';

const layout: StageLayout = {
    orb: { x: 900, y: 400, r: 140 },
    landings: [100, 300, 500, 700, 900, 1100].map(x => ({ x, y: 760 }))
};

describe('光從天上來', () => {
    it('o 裡的座標與畫面互換：圓心對圓心，原本往右流變成往下流', () => {
        expect(toScreen(layout, { x: ORB.cx, y: ORB.cy })).toEqual({ x: 900, y: 400 });
        const right = toScreen(layout, { x: ORB.cx + ORB.r, y: ORB.cy });
        expect(right.x).toBeCloseTo(900);
        expect(right.y).toBeCloseTo(540);
        const p = { x: 123, y: 456 };
        const back = toLocal(layout, toScreen(layout, p));
        expect(back.x).toBeCloseTo(p.x);
        expect(back.y).toBeCloseTo(p.y);
    });

    it('canvas 的矩陣跟 toScreen 算的一樣', () => {
        const [a, b, c, d, e, f] = localMatrix(layout);
        const p = { x: 200, y: 300 };
        const s = toScreen(layout, p);
        expect(a * p.x + c * p.y + e).toBeCloseTo(s.x);
        expect(b * p.x + d * p.y + f).toBeCloseTo(s.y);
    });

    it('光從畫面最上面射進 O 的上半部，從下緣由左往右分開出去', () => {
        const path = lightPath(layout, SOURCE_Y.rest);
        expect(path.sky.y).toBe(0);
        expect(path.entry.y).toBeLessThan(layout.orb.y);
        // 天上的起點、入口在同一條線上，往下走
        expect(path.entry.y).toBeGreaterThan(path.sky.y);
        for (const exit of path.exits) {
            expect(exit.y).toBeGreaterThan(layout.orb.y);
            expect(Math.hypot(exit.x - 900, exit.y - 400)).toBeCloseTo(140, 0);
        }
        const xs = path.exits.map(exit => exit.x);
        expect([...xs].sort((a, b) => a - b)).toEqual(xs);
        expect(path.localEnds).toHaveLength(6);
    });

    it('點中一道光：三角形裡面是，外面不是；越近出口越窄', () => {
        const exit = { x: 900, y: 540 };
        const landing = { x: 300, y: 760 };
        expect(hitRay({ x: 600, y: 650 }, exit, landing, 20)).toBe(true);
        expect(hitRay({ x: 600, y: 700 }, exit, landing, 20)).toBe(false);
        expect(hitRay({ x: 300, y: 800 }, exit, landing, 20)).toBe(false);
        expect(hitRay({ x: 880, y: 545 }, exit, landing, 20, 0)).toBe(false);
    });
});
