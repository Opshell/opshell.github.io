import { describe, expect, it } from 'vitest';
import { easeOut, INTRO, particleAt, phase, scatter, seeded } from './intro';

describe('開場時間軸', () => {
    it('照順序：LOGO → 打散 → 光從天上來 → O 裡演化 → 光落下 → 極光 → 定格', () => {
        const order = [INTRO.logo, INTRO.scatter, INTRO.beam, INTRO.inner, INTRO.rays, INTRO.aurora, INTRO.done];
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        // 使用者：3～5 秒
        expect(INTRO.done).toBeGreaterThanOrEqual(3000);
        expect(INTRO.done).toBeLessThanOrEqual(5000);
        // 光點在定格前都到了
        expect(INTRO.scatter + INTRO.flight + 220).toBeLessThan(INTRO.done);
    });

    it('phase：還沒到是 0、播完是 1；沒在播一律是 1', () => {
        expect(phase(1000, 1000 + 400, 500, 200)).toBe(0);
        expect(phase(1000, 1000 + 600, 500, 200)).toBeCloseTo(0.5);
        expect(phase(1000, 1000 + 900, 500, 200)).toBe(1);
        expect(phase(null, 0, 500, 200)).toBe(1);
        expect(easeOut(0)).toBe(0);
        expect(easeOut(1)).toBe(1);
        expect(easeOut(0.5)).toBeGreaterThan(0.5);
    });
});

describe('打散', () => {
    const points = Array.from({ length: 200 }, (_, i) => ({ x: 500 + (i % 20), y: 300 + Math.floor(i / 20), color: '#fff' }));
    const big = { left: 0, top: 600, width: 1000, height: 400 };
    const small = { left: 900, top: 100, width: 50, height: 50 };

    it('每一區都分得到；大的區塊分得多；落點在區塊裡', () => {
        const particles = scatter(points, [big, small], seeded(3));
        const inBig = particles.filter(p => p.to.y >= 600);
        const inSmall = particles.filter(p => p.to.y < 600);
        expect(inSmall.length).toBeGreaterThan(0);
        expect(inBig.length).toBeGreaterThan(inSmall.length * 10);
        for (const p of inSmall) {
            expect(p.to.x).toBeGreaterThanOrEqual(900);
            expect(p.to.x).toBeLessThanOrEqual(950);
        }
    });

    it('從自己的位置出發、到目標結束；沒有目標就不打散', () => {
        const [particle] = scatter(points, [small], seeded(5));
        expect(particleAt(particle, 0)).toEqual(particle.from);
        const end = particleAt(particle, 1);
        expect(end.x).toBeCloseTo(particle.to.x);
        expect(end.y).toBeCloseTo(particle.to.y);
        expect(scatter(points, [])).toEqual([]);
    });
});
