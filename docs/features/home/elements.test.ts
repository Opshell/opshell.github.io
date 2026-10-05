import type { ElementKey } from './prism';
import { describe, expect, it } from 'vitest';
import { evolve, ribbon } from './elements';
import { END_X, exitsFor, ORB, refract, SOURCE_Y } from './prism';

const ALL: ElementKey[] = ['metal', 'earth', 'fire', 'wood', 'wind', 'water'];
const { entry } = refract(SOURCE_Y.rest);
const setup = (elements: ElementKey[]) => {
    const exits = exitsFor(SOURCE_Y.rest, elements.length);
    const ends = elements.map((_, index) => ({ x: END_X, y: 60 + index * 80 }));
    return { exits, ends, run: (time: number) => evolve(elements, entry, exits, ends, time) };
};
const fromCenter = (p: { x: number; y: number }) => Math.hypot(p.x - ORB.cx, p.y - ORB.cy);

describe('evolve：白光在玻璃裡演化成元素', () => {
    it('每一縷都從入口出發、在自己的出口結束，最後一段對準那道光（互相影響之後也是）', () => {
        const { exits, ends, run } = setup(ALL);
        run(2.7).forEach((strand, index) => {
            for (const { points } of strand.threads) {
                expect(points[0].x).toBeCloseTo(entry.x, 5);
                expect(points[0].y).toBeCloseTo(entry.y, 5);
                const last = points.at(-1)!;
                expect(last.x).toBeCloseTo(exits[index].x, 5);
                expect(last.y).toBeCloseTo(exits[index].y, 5);
                const before = points.at(-2)!;
                const tangent = Math.atan2(last.y - before.y, last.x - before.x);
                const toRay = Math.atan2(ends[index].y - exits[index].y, ends[index].x - exits[index].x);
                expect(tangent, strand.element).toBeCloseTo(toRay, 0);
            }
        });
    });

    it('金反射四次，反射點都在玻璃裡；粗細像刀刃（有厚有薄）', () => {
        const [metal] = setup(['metal']).run(1.2);
        expect(metal.glints).toHaveLength(4);
        for (const glint of metal.glints) expect(fromCenter(glint)).toBeLessThan(ORB.r);
        const widths = metal.threads[0].widths;
        expect(Math.max(...widths)).toBeGreaterThan(2.5);
        expect(Math.min(...widths)).toBeLessThan(0.6);
    });

    it('土往下沉、比別人厚；而且不受火影響', () => {
        const withFire = setup(['fire', 'earth']).run(3)[1];
        const withWater = setup(['water', 'earth']).run(3)[1];
        expect(withFire.threads[0].points).toEqual(withWater.threads[0].points);
        const middle = withFire.threads[0].points[20];
        expect(middle.y).toBeGreaterThan(ORB.cy + ORB.r * 0.2);
        expect(Math.max(...withFire.threads[0].widths)).toBeGreaterThan(5);
    });

    it('火往上飄', () => {
        const [fire] = setup(['fire']).run(1);
        const { exits } = setup(['fire']);
        const middle = fire.threads[0].points[20];
        expect(middle.y).toBeLessThan((entry.y + exits[0].y) / 2 - ORB.r * 0.15);
    });

    it('風經過火會被扭；換成水在同一個位置就不會', () => {
        const nearFire = setup(['fire', 'wind']).run(2)[1];
        const nearWater = setup(['water', 'wind']).run(2)[1];
        expect(nearFire.threads[0].points).not.toEqual(nearWater.threads[0].points);
    });

    it('木是雙螺旋：兩股、有鹼基對，一股在前（粗）時另一股在後（細）', () => {
        const [wood] = setup(['wood']).run(0.5);
        expect(wood.threads).toHaveLength(2);
        expect(wood.rungs.length).toBeGreaterThan(5);
        const [a, b] = wood.threads;
        // 有的地方 A 粗、有的地方 B 粗（輪流轉到前面）
        const diffs = a.widths.map((width, i) => width - b.widths[i]);
        expect(Math.max(...diffs)).toBeGreaterThan(0.5);
        expect(Math.min(...diffs)).toBeLessThan(-0.5);
    });

    it('木有深度：同一點一股在前、另一股就在後（畫的時候前後分開畫，才有立體感）', () => {
        const [wood] = setup(['wood']).run(0.8);
        const [a, b] = wood.threads;
        expect(a.depths).toHaveLength(a.points.length);
        a.depths!.forEach((depth, i) => expect(depth + b.depths![i]).toBeCloseTo(1, 5));
        expect(Math.max(...a.depths!)).toBeGreaterThan(0.9);
        expect(Math.min(...a.depths!)).toBeLessThan(0.1);
    });

    it('風三縷、水一股；會動', () => {
        const { run } = setup(['wind', 'water']);
        const [wind, water] = run(1);
        expect(wind.threads).toHaveLength(3);
        expect(water.threads).toHaveLength(1);
        expect(run(1)[1].threads[0].points).not.toEqual(run(1.5)[1].threads[0].points);
    });

    it('水靠近別的光絲時順著它貼過去：旁邊有沒有光絲，形狀不一樣', () => {
        const alone = setup(['water']).run(1)[0].threads[0].points;
        const exits = exitsFor(SOURCE_Y.rest, 1);
        const ends = [{ x: END_X, y: 60 }];
        // 同一股水（同樣的出口與終點），旁邊多一股剛好貼著它的風
        const withWind = evolve(['water', 'wind'], entry, [exits[0], exits[0]], [ends[0], ends[0]], 1)[0].threads[0].points;
        expect(withWind).not.toEqual(alone);
    });
});

describe('ribbon', () => {
    it('一條水平線加粗細 2：上下各 1，左邊順著、右邊倒回來', () => {
        const outline = ribbon([{ x: 0, y: 0 }, { x: 10, y: 0 }], [2, 2]);
        expect(outline).toHaveLength(4);
        expect(outline[0]).toEqual({ x: 0, y: 1 });
        expect(outline[1]).toEqual({ x: 10, y: 1 });
        expect(outline[2]).toEqual({ x: 10, y: -1 });
        expect(outline[3]).toEqual({ x: 0, y: -1 });
    });
});
