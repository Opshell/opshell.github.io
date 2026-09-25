import type { Ref } from 'vue';
import type { iDemoStep } from '../types';
import { computed } from 'vue';

// 手指在碰到螢幕前多久出現、放開後多久淡掉（秒）
const LEAD = 0.35;
const TAIL = 0.35;
// tap 按下去的長度。實際的點擊只有幾十毫秒，畫這麼短看不出來
const TAP = 0.18;
// 紅框在手指碰到螢幕前多久出現：先看到「要點哪裡」，手指再落下去
const BOX_LEAD = 0.7;
// 紅框放開後很快就收掉：點下去常常馬上換頁，框留著會框在新畫面不相干的地方
const BOX_TAIL = 0.12;
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

/** 被點的元件範圍，0～1 的比例 */
export interface iBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    opacity: number;
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

/**
 * 手指的軌跡：[秒數（從碰到螢幕算起）, x, y]，最後一點是放開的時間與位置。
 * drag 用錄影時量到的 pathMs；swipe 是等速直線；tap、longpress 停在原地。
 */
function trackOf(step: iDemoStep): [number, number, number][] {
    const { x, y } = step as Required<iDemoStep>;
    if (step.type === 'drag' && step.path?.length && step.pathMs?.length === step.path.length) {
        const track = step.path.map(([px, py], i): [number, number, number] => [step.pathMs![i] / 1000, px, py]);
        const release = (step.ms ?? step.pathMs.at(-1)!) / 1000;
        if (release > track.at(-1)![0]) track.push([release, track.at(-1)![1], track.at(-1)![2]]);
        return track;
    }
    if (step.type === 'swipe' || step.type === 'drag') return [[0, x, y], [(step.ms ?? 350) / 1000, step.toX ?? x, step.toY ?? y]];
    if (step.type === 'longpress') return [[0, x, y], [(step.ms ?? 800) / 1000, x, y]];
    return [[0, x, y], [TAP, x, y]];
}

/** 走到第 elapsed 秒時，經過的點（最後一點是現在的位置） */
function walk(track: [number, number, number][], elapsed: number): tPoint[] {
    const passed: tPoint[] = [[track[0][1], track[0][2]]];
    for (let i = 1; i < track.length; i++) {
        const [t0, ax, ay] = track[i - 1];
        const [t1, bx, by] = track[i];
        if (elapsed >= t1) {
            passed.push([bx, by]);
            continue;
        }
        const local = t1 > t0 ? Math.max(0, (elapsed - t0) / (t1 - t0)) : 1;
        passed.push([ax + (bx - ax) * local, ay + (by - ay) * local]);
        break;
    }
    return passed;
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

        const track = trackOf(step);
        const end = step.t + track.at(-1)![0];
        if (now > end + TAIL) return null;

        const walked = walk(track, now - step.t);
        const [x, y] = walked.at(-1)!;
        let opacity = 1;
        if (now < step.t) opacity = (now - (step.t - LEAD)) / LEAD;
        else if (now > end) opacity = 1 - (now - end) / TAIL;
        const moves = track.some(([, px, py]) => px !== track[0][1] || py !== track[0][2]);

        return {
            x,
            y,
            opacity: Math.max(0, Math.min(1, opacity)),
            pressed: now >= step.t && now <= end,
            // 只保留真的有移動的點，按住不動的那一段不畫線
            trail: moves && now >= step.t ? walked : []
        };
    });

    /** 紅框：手指落下前先框出要點的元件，放開後跟手指一起淡掉 */
    const box = computed<iBox | null>(() => {
        const now = time.value;
        const step = steps.value.filter(s => s.box && s.t - BOX_LEAD <= now).at(-1);
        if (!step) return null;

        const end = step.t + trackOf(step).at(-1)![0];
        if (now > end + BOX_TAIL) return null;

        let opacity = 1;
        if (now < step.t - BOX_LEAD + 0.15) opacity = (now - (step.t - BOX_LEAD)) / 0.15;
        else if (now > end) opacity = 1 - (now - end) / BOX_TAIL;
        const [x1, y1, x2, y2] = step.box!;
        return { x1, y1, x2, y2, opacity: Math.max(0, Math.min(1, opacity)) };
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

    return { finger, box, bubble };
}
