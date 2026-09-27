import type { DemoStep } from '../types';
import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useDemoOverlay } from './useDemoOverlay';

function overlayAt(steps: DemoStep[], time: number) {
    return useDemoOverlay(ref(time), ref(steps));
}

describe('手指', () => {
    const tap: DemoStep = { t: 2, type: 'tap', x: 0.5, y: 0.6 };

    it('碰到螢幕前先淡入，按下時不透明', () => {
        expect(overlayAt([tap], 1).finger.value).toBeNull();
        const before = overlayAt([tap], 1.9).finger.value!;
        expect(before.pressed).toBe(false);
        expect(before.opacity).toBeGreaterThan(0);
        expect(before.opacity).toBeLessThan(1);
        expect(overlayAt([tap], 2.05).finger.value).toMatchObject({ x: 0.5, y: 0.6, opacity: 1, pressed: true });
    });

    it('放開後淡掉、消失', () => {
        expect(overlayAt([tap], 2.3).finger.value?.pressed).toBe(false);
        expect(overlayAt([tap], 3).finger.value).toBeNull();
    });

    it('swipe 等速移動，走過的路畫成線', () => {
        const swipe: DemoStep = { t: 0, type: 'swipe', x: 0.2, y: 0.5, toX: 0.8, toY: 0.5, ms: 400 };
        const half = overlayAt([swipe], 0.2).finger.value!;
        expect(half.x).toBeCloseTo(0.5);
        expect(half.trail).toHaveLength(2);
    });

    it('drag 照錄影量到的 pathMs 走，不是等速', () => {
        const drag: DemoStep = { t: 0, type: 'drag', x: 0.1, y: 0.1, path: [[0.1, 0.1], [0.1, 0.2], [0.9, 0.2]], pathMs: [0, 900, 1000], ms: 1000 };
        // 前 0.9 秒只走了一小段，最後 0.1 秒才橫衝過去
        expect(overlayAt([drag], 0.45).finger.value).toMatchObject({ x: 0.1 });
        expect(overlayAt([drag], 0.45).finger.value!.y).toBeCloseTo(0.15);
        expect(overlayAt([drag], 0.95).finger.value!.x).toBeCloseTo(0.5);
    });

    it('同時只有一根手指：取已經開始的最後一步', () => {
        const steps: DemoStep[] = [tap, { t: 2.1, type: 'tap', x: 0.1, y: 0.1 }];
        expect(overlayAt(steps, 2.1).finger.value).toMatchObject({ x: 0.1, y: 0.1 });
    });
});

describe('紅框', () => {
    const step: DemoStep = { t: 2, type: 'tap', x: 0.5, y: 0.5, box: [0.4, 0.4, 0.6, 0.6] };

    it('比手指早出現，放開後很快收掉', () => {
        expect(overlayAt([step], 1.5).box.value).not.toBeNull();
        expect(overlayAt([step], 1.5).finger.value).toBeNull();
        expect(overlayAt([step], 2.4).box.value).toBeNull();
    });
});

describe('說明泡泡', () => {
    it('下一則出現就換掉', () => {
        const steps: DemoStep[] = [
            { t: 0, type: 'caption', label: '第一則' },
            { t: 1, type: 'caption', label: '第二則' }
        ];
        expect(overlayAt(steps, 0.5).bubble.value?.text).toBe('第一則');
        expect(overlayAt(steps, 1.2).bubble.value?.text).toBe('第二則');
    });

    it('沒有座標的放在畫面中下方；返回鍵沒寫字也有泡泡', () => {
        expect(overlayAt([{ t: 0, type: 'back' }], 0.5).bubble.value).toMatchObject({ text: '返回', x: 0.5, y: 0.7 });
    });

    it('貼著畫面底部的放到手指上方，免得跑出畫面', () => {
        expect(overlayAt([{ t: 0, type: 'tap', x: 0.5, y: 0.9, label: '存檔' }], 0.1).bubble.value?.above).toBe(true);
        expect(overlayAt([{ t: 0, type: 'tap', x: 0.5, y: 0.1, label: '搜尋' }], 0.1).bubble.value?.above).toBe(false);
    });

    it('停留時間到了就收掉', () => {
        expect(overlayAt([{ t: 0, type: 'caption', label: '短' }], 3).bubble.value).toBeNull();
    });
});
