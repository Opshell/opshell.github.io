import { describe, expect, it } from 'vitest';
import { dayLayout, gridLayout, isNarrow, orbitLayout } from './showcase';

const inside = (p: { x: number; y: number }, width: number, height: number) => p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height;

describe('功能地圖開頭的排法', () => {
    it('一天的帳：寬螢幕由左往右、同一高度；窄螢幕由上往下', () => {
        const wide = dayLayout(5, 1100, 560);
        expect(wide.map(p => p.y)).toEqual(Array.from({ length: 5 }).fill(wide[0].y));
        expect([...wide.map(p => p.x)].sort((a, b) => a - b)).toEqual(wide.map(p => p.x));
        const narrow = dayLayout(5, 360, 640);
        expect(isNarrow(360)).toBe(true);
        expect([...narrow.map(p => p.y)].sort((a, b) => a - b)).toEqual(narrow.map(p => p.y));
        for (const p of [...wide, ...narrow]) expect(inside(p, 1100, 640)).toBe(true);
        expect(dayLayout(0, 1000, 500)).toEqual([]);
    });

    it('最懶的六招：寬螢幕三欄、窄螢幕兩欄；卡片不重疊、都在舞台裡', () => {
        for (const [width, height, columns] of [[1100, 560, 3], [360, 640, 2]] as const) {
            const cells = gridLayout(6, width, height);
            expect(new Set(cells.map(c => Math.round(c.x))).size).toBe(columns);
            for (const c of cells) {
                expect(c.x - c.w / 2).toBeGreaterThanOrEqual(0);
                expect(c.x + c.w / 2).toBeLessThanOrEqual(width);
                expect(c.y + c.h / 2).toBeLessThanOrEqual(height);
            }
            // 同一列相鄰兩張之間有空隙
            expect(cells[1].x - cells[0].x).toBeGreaterThan(cells[0].w);
        }
    });

    it('全部接在一起：每個功能都有位置、都在舞台裡，彼此不會疊在同一點', () => {
        const groups = [9, 8, 7, 6, 8, 6, 7];
        const { spots, labels, center } = orbitLayout(groups, 1100, 600);
        expect(spots).toHaveLength(51);
        expect(labels).toHaveLength(7);
        for (const p of spots) expect(inside(p, 1100, 600)).toBe(true);
        let closest = Infinity;
        for (let i = 0; i < spots.length; i++) {
            for (let j = i + 1; j < spots.length; j++) closest = Math.min(closest, Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y));
        }
        expect(closest).toBeGreaterThan(12);
        // 每個分支的標籤比那個分支的功能靠近中心（橢圓上，所以一支一支比）
        const far = (p: { x: number; y: number }) => Math.hypot(p.x - center.x, p.y - center.y);
        let start = 0;
        groups.forEach((n, i) => {
            const own = spots.slice(start, start + n);
            expect(far(labels[i])).toBeLessThan(Math.min(...own.map(far)));
            start += n;
        });
    });
});
