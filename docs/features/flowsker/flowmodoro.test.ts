import { describe, expect, it } from 'vitest';
import { DEMO_MAX, formatMinutes, nightLevel, restMinutes, sandLevel } from './flowmodoro';

describe('restMinutes', () => {
    it('專注 ÷ 5，捨去零頭', () => {
        expect(restMinutes(45)).toBe(9);
        expect(restMinutes(47)).toBe(9);
        expect(restMinutes(5)).toBe(1);
        expect(restMinutes(4)).toBe(0);
    });
    it('不合理的輸入回 0', () => {
        expect(restMinutes(0)).toBe(0);
        expect(restMinutes(-10)).toBe(0);
        expect(restMinutes(Number.NaN)).toBe(0);
    });
});

describe('formatMinutes', () => {
    it('不到一小時只寫分', () => {
        expect(formatMinutes(0)).toBe('0 分');
        expect(formatMinutes(45)).toBe('45 分');
    });
    it('整點不寫 0 分', () => {
        expect(formatMinutes(60)).toBe('1 小時');
        expect(formatMinutes(72)).toBe('1 小時 12 分');
        expect(formatMinutes(180)).toBe('3 小時');
    });
});

describe('sandLevel', () => {
    it('0 到 1 之間，上限時是 1', () => {
        expect(sandLevel(0)).toBe(0);
        expect(sandLevel(DEMO_MAX)).toBe(1);
        expect(sandLevel(DEMO_MAX * 2)).toBe(1);
    });
    it('前段變化比線性大（開根號）', () => {
        expect(sandLevel(DEMO_MAX / 4)).toBeCloseTo(0.5);
    });
});

describe('nightLevel', () => {
    it('5 分以前是白晝，15 分之後全暗', () => {
        expect(nightLevel(0)).toBe(0);
        expect(nightLevel(5)).toBe(0);
        expect(nightLevel(10)).toBeCloseTo(0.5);
        expect(nightLevel(15)).toBe(1);
        expect(nightLevel(45)).toBe(1);
    });
});
