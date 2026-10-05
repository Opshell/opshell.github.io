import { describe, expect, it } from 'vitest';
import { easeOut, INTRO, phase } from './intro';

describe('開場時間軸', () => {
    it('照順序：LOGO → 收成光點 → 飛到 O → 綻開 → 白光 → 演化 → 光落下 → 落地 → 定格', () => {
        const order = [INTRO.logo, INTRO.gather, INTRO.fly, INTRO.bloom, INTRO.beam, INTRO.inner, INTRO.rays, INTRO.land, INTRO.done];
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        // 使用者：原本 4.7 秒，再加 2～3 秒
        expect(INTRO.done).toBeGreaterThanOrEqual(6700);
        expect(INTRO.done).toBeLessThanOrEqual(7700);
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
