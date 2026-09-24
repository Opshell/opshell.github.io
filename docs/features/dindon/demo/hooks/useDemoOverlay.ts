import type { Ref } from 'vue';
import type { iDemoStep } from '../types';
import { computed } from 'vue';

// 手指在碰到螢幕前多久出現、放開後多久淡掉（秒）
const LEAD = 0.35;
const TAIL = 0.35;
// tap 按下去的長度。實際的點擊只有幾十毫秒，畫這麼短看不出來
const TAP = 0.18;
// drag 每一段移動的時間。錄影工具每段 sleep 60ms，加上 adb 每下一個指令的延遲，一段約 0.2 秒；
// 按住之後畫面上的東西也比 holdMs 晚約 0.25 秒才開始動（2026-09-25 對照第 17 支的影格）
const DRAG_SEGMENT = 0.2;
const DRAG_LAG = 0.25;
// 說明泡泡最少停多久；字多的再依字數加長
const BUBBLE_MIN = 2.2;
const BUBBLE_PER_CHAR = 0.1;

type tPoint = [number, number];

export interface iFinger {
    x: number;
    y: number;
    opacity: number;
    pressed: boolean;
    /** swipe、drag 手指走過的路，畫成一條淡淡的線 */
    trail: tPoint[];
}

export interface iBubble {
    text: string;
    kind: iDemoStep['type'];
    /** 有座標的步驟貼著手指；沒有的（caption、type、back）放在畫面中下方 */
    x: number;
    y: number;
    /** 泡泡在手指上方還是下方 */
    above: boolean;
}

const hasPoint = (step: iDemoStep) => step.x !== undefined && step.y !== undefined;

/** 手指從按下到放開經過的點。tap、longpress 只有一點 */
function pathOf(step: iDemoStep): tPoint[] {
    const start: tPoint = [step.x!, step.y!];
    if (step.type === 'drag') return step.path?.length ? step.path : [start, [step.toX!, step.toY!]];
    if (step.type === 'swipe') return [start, [step.toX!, step.toY!]];
    return [start];
}

/** [按住不動的秒數, 移動的秒數] */
function timingOf(step: iDemoStep): [number, number] {
    if (step.type === 'longpress') return [(step.ms ?? 800) / 1000, 0];
    if (step.type === 'swipe') return [0.05, (step.ms ?? 350) / 1000];
    if (step.type === 'drag') return [(step.holdMs ?? 700) / 1000 + DRAG_LAG, (pathOf(step).length - 1) * DRAG_SEGMENT];
    return [TAP, 0];
}

/** 沿著折線走到 progress（0～1）的位置，回傳走過的點 */
function walk(points: tPoint[], progress: number): tPoint[] {
    if (points.length < 2 || progress <= 0) return [points[0]];
    const segments = points.length - 1;
    const exact = Math.min(progress, 1) * segments;
    const index = Math.min(Math.floor(exact), segments - 1);
    const local = exact - index;
    const [ax, ay] = points[index];
    const [bx, by] = points[index + 1];
    return [...points.slice(0, index + 1), [ax + (bx - ax) * local, ay + (by - ay) * local]];
}

/**
 * 泡泡放在手指上方還是下方：貼著畫面上下緣的往內放；
 * 會移動的（swipe、drag）放在移動方向的反側，才不會蓋住被拖的東西；其他的在下半部就放上面，免得擋到底部按鈕
 */
function bubbleAbove(step: iDemoStep) {
    const y = step.y!;
    if (y > 0.8) return true;
    if (y < 0.2) return false;
    const dy = (step.toY ?? y) - y;
    if (Math.abs(dy) > 0.05) return dy > 0;
    return y > 0.5;
}

/**
 * 依影片目前的秒數，算出手指與說明泡泡該畫在哪。
 * 純函式的計算，影片每一格（requestAnimationFrame）更新一次 time 就好。
 */
export function useDemoOverlay(time: Ref<number>, steps: Ref<iDemoStep[]>) {
    const finger = computed<iFinger | null>(() => {
        const now = time.value;
        // 同一時間只會有一根手指：挑已經開始的最後一個有座標的步驟
        const step = steps.value.filter(s => hasPoint(s) && s.t - LEAD <= now).at(-1);
        if (!step) return null;

        const [hold, move] = timingOf(step);
        const end = step.t + hold + move;
        if (now > end + TAIL) return null;

        const points = pathOf(step);
        const walked = walk(points, move ? (now - step.t - hold) / move : 0);
        const [x, y] = walked.at(-1)!;
        let opacity = 1;
        if (now < step.t) opacity = (now - (step.t - LEAD)) / LEAD;
        else if (now > end) opacity = 1 - (now - end) / TAIL;

        return {
            x,
            y,
            opacity: Math.max(0, Math.min(1, opacity)),
            pressed: now >= step.t && now <= end,
            trail: points.length > 1 && now >= step.t ? walked : []
        };
    });

    const bubble = computed<iBubble | null>(() => {
        const now = time.value;
        const labeled = steps.value.filter(s => s.label || s.type === 'back');
        const index = labeled.findLastIndex(s => s.t - 0.1 <= now);
        if (index < 0) return null;

        const step = labeled[index];
        const next = labeled[index + 1];
        const text = step.label ?? '返回';
        const stay = Math.max(BUBBLE_MIN, text.length * BUBBLE_PER_CHAR + 1.2);
        if (now > step.t + stay || (next && now >= next.t - 0.1)) return null;

        if (!hasPoint(step)) return { text, kind: step.type, x: 0.5, y: 0.7, above: true };
        return { text, kind: step.type, x: step.x!, y: step.y!, above: bubbleAbove(step) };
    });

    return { finger, bubble };
}
