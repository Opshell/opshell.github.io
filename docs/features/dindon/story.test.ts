import { describe, expect, it } from 'vitest';
import { STORY_MS, STORY_SCENES, storyFeed, storyTotal } from './story';

describe('宣傳頁「一天的帳」', () => {
    it('整段 10～15 秒；最後一幕停住', () => {
        expect(STORY_MS).toBeGreaterThanOrEqual(10_000);
        expect(STORY_MS).toBeLessThanOrEqual(15_000);
        expect(STORY_SCENES.at(-1)!.ms).toBe(0);
    });

    it('帳本一幕一幕記滿，新的在最上面、只有這一幕記的會亮', () => {
        expect(storyFeed(0)[0]).toMatchObject({ id: 'cvs', isNew: true });
        const voice = storyFeed(1);
        expect(voice.slice(0, 2).map(row => row.id)).toEqual(['soy', 'egg']);
        expect(voice.find(row => row.id === 'cvs')!.isNew).toBe(false);
        expect(storyFeed(5)).toHaveLength(2 + 4);
    });

    it('今天花了：只算今天的；退刷抵銷的是昨天那筆，今天的數字不變', () => {
        expect(storyTotal(0)).toBe(15 + 85);
        expect(storyTotal(2)).toBe(15 + 85 + 45 + 25 + 400);
        expect(storyTotal(3)).toBe(storyTotal(2));
        expect(storyFeed(3)[0]).toMatchObject({ id: 'uniqlo', void: true }); // 浮到最上面才看得到被劃掉
        expect(storyFeed(2).find(row => row.id === 'uniqlo')!.void).toBeUndefined();
    });

    it('每日預算 800 還有剩：結尾不會出現負數', () => {
        expect(800 - storyTotal(4)).toBeGreaterThan(0);
    });

    it('字幕短到一眼看完', () => {
        for (const scene of STORY_SCENES) {
            expect([...scene.caption].length, scene.id).toBeLessThanOrEqual(14);
            expect([...scene.sub].length, scene.id).toBeLessThanOrEqual(26);
        }
    });
});
