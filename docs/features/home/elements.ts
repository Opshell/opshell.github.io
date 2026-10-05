import type { ElementKey, Point } from './prism';
import { ORB, unit } from './prism';

// 首頁光學台：白光（原初）在玻璃 O 裡演化成元素（2026-10-05，使用者回饋兩輪）。純函式、有測試，畫在 components/LightBench.vue。
//
// 每股光絲有自己的「軌道」（由上往下分開，給彼此空間），再疊上元素的性質：
// - 金：剛硬。直線，碰到玻璃內壁反射四次；每段像刀刃（中間厚、兩端薄），畫的時候中間一條白色高光、反射點閃一下
// - 土：厚重。往下沉，厚度有慢慢起伏的層次；不受別人影響，也不影響別人
// - 火：熱。往上飄（熱氣蒸騰），粗細像火舌一樣跳；靠近它的光絲會被熱氣扭曲（土例外）
// - 木：生命。DNA 雙螺旋：兩股反相，轉到前面變粗、轉到後面變細，中間一節節的鹼基對
// - 風：柔軟。三縷細絲一個大而慢的弧；經過火的時候被扭得特別厲害
// - 水：順應。保有自己的波浪，靠近別的光絲時會順著它的形狀貼過去，離開了又回到自己
// 所有擾動都乘上兩端是 0 的包絡：每股都從入口出發、在自己的出口結束，最後一段對準自己那道光。

export interface Thread {
    points: Point[];
    /** 每一點的粗細（畫成一條帶子） */
    widths: number[];
}

export interface Strand {
    element: ElementKey;
    threads: Thread[];
    /** 金：反射點，畫的時候閃一下 */
    glints: Point[];
    /** 木：鹼基對（兩股之間的橫線），depth 0～1 是亮度 */
    rungs: { a: Point; b: Point; depth: number }[];
}

const SAMPLES = 40;
const { PI, sin, cos, abs } = Math;

/** 底線：入口 → 出口的三次貝茲，出口的切線就是那道光的方向（收束成光束） */
function baseCurve(entry: Point, exit: Point, end: Point) {
    const flow = unit({ x: exit.x - entry.x, y: exit.y - entry.y });
    const out = unit({ x: end.x - exit.x, y: end.y - exit.y });
    const c1 = { x: entry.x + flow.x * ORB.r * 0.6, y: entry.y + flow.y * ORB.r * 0.6 };
    const c2 = { x: exit.x - out.x * ORB.r * 0.6, y: exit.y - out.y * ORB.r * 0.6 };
    return (s: number) => {
        const u = 1 - s;
        const point = {
            x: u * u * u * entry.x + 3 * u * u * s * c1.x + 3 * u * s * s * c2.x + s * s * s * exit.x,
            y: u * u * u * entry.y + 3 * u * u * s * c1.y + 3 * u * s * s * c2.y + s * s * s * exit.y
        };
        const tangent = unit({
            x: 3 * u * u * (c1.x - entry.x) + 6 * u * s * (c2.x - c1.x) + 3 * s * s * (exit.x - c2.x),
            y: 3 * u * u * (c1.y - entry.y) + 6 * u * s * (c2.y - c1.y) + 3 * s * s * (exit.y - c2.y)
        });
        // 法線：光往右走時指向下方
        return { point, normal: { x: -tangent.y, y: tangent.x } };
    };
}

/** 兩端收細：入口是一條細白光、出口接上那道光的尖端 */
const taper = (s: number) => 0.3 + 0.7 * sin(PI * s);

/**
 * 散開的包絡：前半段用 sin(πs)（從入口很快地散開），後半段用 sin²(πs)（在出口斜率是 0）。
 * 出口斜率是 0，擾動才不會把出口的方向帶歪——光要對準自己那道光收束。
 */
const spread = (s: number) => (s < 0.5 ? sin(PI * s) : sin(PI * s) ** 2);

// #region [P] 各元素的形狀

/** 金：從入口直直射進去，碰到內壁鏡面反射四次，再直直對準出口；方向隨時間慢慢轉 */
function metal(entry: Point, exit: Point, end: Point, time: number, seed: number): Strand {
    const wall = ORB.r * 0.88;
    const flow = unit({ x: exit.x - entry.x, y: exit.y - entry.y });
    const turn = 0.7 * sin(time * 0.4 + seed) + 0.3;
    let dir = unit({ x: flow.x * cos(turn) - flow.y * sin(turn), y: flow.x * sin(turn) + flow.y * cos(turn) });
    let p = { x: entry.x + flow.x * 6, y: entry.y + flow.y * 6 };
    const corners: Point[] = [entry, p];
    const glints: Point[] = [];
    for (let bounce = 0; bounce < 4; bounce++) {
        // 射線與圓（半徑 wall）的交點：解 |p + t·dir − c|² = wall²
        const ox = p.x - ORB.cx;
        const oy = p.y - ORB.cy;
        const b = ox * dir.x + oy * dir.y;
        const c = ox * ox + oy * oy - wall * wall;
        const t = -b + Math.sqrt(Math.max(0, b * b - c));
        p = { x: p.x + dir.x * t, y: p.y + dir.y * t };
        corners.push(p);
        glints.push(p);
        const n = unit({ x: p.x - ORB.cx, y: p.y - ORB.cy });
        const dot = dir.x * n.x + dir.y * n.y;
        dir = { x: dir.x - 2 * dot * n.x, y: dir.y - 2 * dot * n.y };
    }
    const out = unit({ x: end.x - exit.x, y: end.y - exit.y });
    corners.push({ x: exit.x - out.x * ORB.r * 0.3, y: exit.y - out.y * ORB.r * 0.3 }, exit);
    // 每一段切成幾點，粗細像刀刃：中間厚、兩端（反射點）薄
    const points: Point[] = [];
    const widths: number[] = [];
    for (let i = 0; i < corners.length - 1; i++) {
        const a = corners[i];
        const z = corners[i + 1];
        for (let k = 0; k < 6; k++) {
            const u = k / 6;
            points.push({ x: a.x + (z.x - a.x) * u, y: a.y + (z.y - a.y) * u });
            widths.push(0.4 + 2.8 * sin(PI * u));
        }
    }
    points.push(exit);
    widths.push(0.4);
    return { element: 'metal', threads: [{ points, widths }], glints, rungs: [] };
}

/**
 * 其他五種：在底線上，先放到自己的軌道（lane -1 在上、1 在下），再疊元素的形狀。
 * 回傳每一縷的點與粗細；木另外回傳鹼基對。
 */
function flowing(element: Exclude<ElementKey, 'metal'>, entry: Point, exit: Point, end: Point, lane: number, time: number, seed: number): Strand {
    const curve = baseCurve(entry, exit, end);
    const r = ORB.r;
    const threads = element === 'wood' ? [1, -1] : element === 'wind' ? [0, 1, -1] : [0];
    const rungs: Strand['rungs'] = [];
    const result = threads.map((thread) => {
        const points: Point[] = [];
        const widths: number[] = [];
        for (let i = 0; i <= SAMPLES; i++) {
            const s = i / SAMPLES;
            const e1 = sin(PI * s);
            const e2 = e1 * e1;
            const { point, normal } = curve(s);
            let offset = lane * r * 0.62 * spread(s);
            let rise = 0;
            let width = 2;
            if (element === 'water') {
                offset += 0.18 * r * sin(PI * 3 * s - time * 1.8 + seed) * e2;
                width = 1.6 + 1.4 * sin(PI * 3 * s - time * 1.8 + seed + 1) ** 2;
            } else if (element === 'fire') {
                offset += (0.08 * sin(PI * 7 * s - time * 6.5 + seed) + 0.05 * sin(PI * 13 * s + time * 9.7 + seed)) * r * e2;
                // 熱氣往上：越往後飄越高
                rise = r * 0.38 * spread(s) * (0.6 + 0.4 * s) * (0.85 + 0.15 * sin(time * 3 + seed));
                width = 1.2 + 2.8 * abs(sin(PI * 8 * s - time * 8 + seed));
            } else if (element === 'wind') {
                offset += 0.3 * r * sin(PI * s + time * 0.6 + seed) * sin(time * 0.4 + seed) * e2;
                offset += thread * 0.08 * r * e2 * (1 + 0.5 * sin(time * 0.9 + thread * 3 + seed));
                width = 0.6 + 0.6 * sin(PI * 2 * s + time + thread) ** 2;
            } else if (element === 'wood') {
                // 雙螺旋：兩股反相；cos 是「在前面還是後面」，前面粗、後面細
                const phase = PI * 5 * s + time * 1.4 + seed;
                offset += thread * 0.16 * r * sin(phase) * spread(s);
                const front = 0.5 + 0.5 * cos(phase) * thread;
                width = 0.7 + 1.8 * front;
            } else {
                // 土：沉、厚，厚度慢慢起伏；不太動
                rise = -r * 0.78 * e2 * (0.96 + 0.04 * sin(time * 0.4 + seed));
                offset += 0.03 * r * sin(PI * 2 * s + time * 0.3 + seed) * e2;
                width = 3.5 + 3.5 * sin(PI * 3 * s + time * 0.3 + seed) ** 2;
            }
            points.push({ x: point.x + normal.x * offset, y: point.y + normal.y * offset - rise });
            widths.push(width * taper(s));
        }
        return { points, widths };
    });
    if (element === 'wood') {
        const [a, b] = result;
        for (let i = 3; i < SAMPLES - 2; i += 3) {
            const phase = PI * 5 * (i / SAMPLES) + time * 1.4 + seed;
            rungs.push({ a: a.points[i], b: b.points[i], depth: abs(sin(phase)) });
        }
    }
    return { element, threads: result, glints: [], rungs };
}

// #endregion

// #region [P] 元素之間

/** 點到一串點裡最近的那一點（只看每隔 step 的點，夠用了） */
function nearest(p: Point, list: readonly Point[], step = 2): { q: Point; d: number } {
    let best = list[0];
    let bestD = Infinity;
    for (let i = 0; i < list.length; i += step) {
        const d = Math.hypot(p.x - list[i].x, p.y - list[i].y);
        if (d < bestD) {
            bestD = d;
            best = list[i];
        }
    }
    return { q: best, d: bestD };
}

/** 熱氣：靠近火的地方被扭一下（風扭得最兇、金幾乎不動）；土不受影響 */
const HEAT: Record<ElementKey, number> = { metal: 0.8, earth: 0, fire: 0, wood: 3, wind: 10, water: 3 };
const HEAT_RANGE = 26;
/** 水：靠近別的光絲時順著它貼過去 */
const FOLLOW_RANGE = 30;

function interact(strands: Strand[], time: number) {
    const fire = strands.find(strand => strand.element === 'fire')?.threads[0].points;
    if (fire) {
        for (const strand of strands) {
            const amount = HEAT[strand.element];
            if (!amount) continue;
            for (const thread of strand.threads) {
                const last = thread.points.length - 1;
                thread.points = thread.points.map((p, i) => {
                    const { d } = nearest(p, fire);
                    if (d > HEAT_RANGE) return p;
                    const k = (1 - d / HEAT_RANGE) * sin(PI * (i / last));
                    return {
                        x: p.x + cos(time * 17 + p.y * 0.3) * amount * 0.4 * k,
                        y: p.y + sin(time * 22 + p.x * 0.35 + i) * amount * k
                    };
                });
            }
        }
    }
    const others = strands.filter(strand => strand.element !== 'water').flatMap(strand => strand.threads.map(thread => thread.points));
    for (const strand of strands.filter(found => found.element === 'water')) {
        for (const thread of strand.threads) {
            const last = thread.points.length - 1;
            thread.points = thread.points.map((p, i) => {
                let closest = { q: p, d: Infinity };
                for (const list of others) {
                    const found = nearest(p, list);
                    if (found.d < closest.d) closest = found;
                }
                if (closest.d > FOLLOW_RANGE) return p;
                const w = 0.45 * (1 - closest.d / FOLLOW_RANGE) * sin(PI * (i / last));
                return { x: p.x + (closest.q.x - p.x) * w, y: p.y + (closest.q.y - p.y) * w };
            });
        }
    }
}

// #endregion

/**
 * 第 time 秒，所有光絲的樣子。elements 由上往下，exits／ends 是每道光的出口與終點中心（同樣的順序）。
 * 元素之間會互相影響（熱氣、水的順應），所以一次算全部。
 */
export function evolve(elements: readonly ElementKey[], entry: Point, exits: readonly Point[], ends: readonly Point[], time: number): Strand[] {
    const count = elements.length;
    const strands = elements.map((element, index) => {
        const seed = index * 1.37;
        if (element === 'metal') return metal(entry, exits[index], ends[index], time, seed);
        const lane = count > 1 ? -1 + (2 * index) / (count - 1) : 0;
        return flowing(element, entry, exits[index], ends[index], lane, time, seed);
    });
    interact(strands, time);
    return strands;
}

/** 一串點加上每點的粗細 → 一條帶子的外框（多邊形）：左邊順著走、右邊倒回來 */
export function ribbon(points: readonly Point[], widths: readonly number[], scale = 1): Point[] {
    const left: Point[] = [];
    const right: Point[] = [];
    const last = points.length - 1;
    for (let i = 0; i <= last; i++) {
        const a = points[Math.max(0, i - 1)];
        const b = points[Math.min(last, i + 1)];
        const t = unit({ x: b.x - a.x, y: b.y - a.y });
        const half = (widths[i] * scale) / 2;
        left.push({ x: points[i].x - t.y * half, y: points[i].y + t.x * half });
        right.push({ x: points[i].x + t.y * half, y: points[i].y - t.x * half });
    }
    return [...left, ...right.reverse()];
}
