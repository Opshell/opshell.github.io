import type { SpectrumHue } from '@shared/utils/spectrum';
import type { Chapter } from './contents';
import { categoryHue, SPECTRUM } from '@shared/utils/spectrum';

// 首頁的光學台（2026-10 翻新第二版，使用者：「概念很棒，但視覺粗糙，不一定要用 AI 生成的圖」）。
// 一道白光（原初）從左邊射進玻璃 O，在裡面演化成六種元素的光絲，各自從 O 的右緣稍微分開的地方出去，成為各分類的光。
// 滑鼠上下是在「瞄準」入射光：光從哪個高度進來，出射的位置就往反方向偏一點，整把光跟著轉。
// 這裡只算幾何（純函式、有測試），畫在 components/LightBench.vue。

/** SVG 與畫布共用的座標系：寬 760、高 520 */
export const VIEW = { width: 760, height: 520 } as const;
/** 玻璃 O */
export const ORB = { cx: 236, cy: 262, r: 112 } as const;
/** 入射光從畫面外的這個 x 射進來；高度可以變 */
export const SOURCE_X = -60;
/** 入射光高度的範圍與預設（從左下方斜斜打進來） */
export const SOURCE_Y = { min: 120, max: 420, rest: 360 } as const;
/** 出射角是入射角的幾倍、反向：0.55 看得出偏折，又不會把光甩出畫面 */
const BEND = 0.55;
/** 各道光的出口沿著 O 的右緣分開多少（弧度，全部加起來）：不擠在同一點 */
const EXIT_FAN = 0.62;
export const END_X = 520;
const TOP = 52;
const BOTTOM = VIEW.height - 52;
const MIN_WIDTH = 3;
const MAX_WIDTH = 15;
export const LABEL_X = END_X + 18;

export interface Point {
    x: number;
    y: number;
}

// #region [P] 元素（2026-10-05，使用者：「光束有不同的特性，有的剛硬會在裡面折射、有的圓滑、有的柔軟，像五行或地水火風」）

export type ElementKey = 'metal' | 'earth' | 'fire' | 'wood' | 'wind' | 'water';

export interface Element {
    key: ElementKey;
    /** 一個字，標在光的標籤前面 */
    glyph: string;
    /** 在玻璃裡的樣子（給螢幕閱讀器與滑過時看） */
    trait: string;
}

/**
 * 光由上往下照這個順序分到元素：金、土、火、木、風、水。
 * 照順序而不是照顏色：分類的顏色會重複（「其他」跟 TypeScript 都是靛），照顏色分會有兩道水、少了木。
 */
export const ELEMENTS: readonly Element[] = [
    { key: 'metal', glyph: '金', trait: '剛硬，在玻璃裡直來直往地折射' },
    { key: 'earth', glyph: '土', trait: '沉重，往下墜' },
    { key: 'fire', glyph: '火', trait: '跳動、閃爍' },
    { key: 'wood', glyph: '木', trait: '兩股藤蔓互相纏繞著長' },
    { key: 'wind', glyph: '風', trait: '柔軟，幾縷細絲飄著' },
    { key: 'water', glyph: '水', trait: '圓滑地流動' }
];

// #endregion

export interface Ray {
    key: string;
    label: string;
    count: number;
    href: string;
    hue: SpectrumHue;
    element: Element;
    /** 這道光包含哪些分類：一般的就是自己，「其他」是併進來的那幾個 */
    members: string[];
    /** 這一類最新的一篇：滑過那道光時顯示 */
    latest: { title: string; url: string; date: string };
    /** 光的終點高度（標籤也對齊這裡） */
    y: number;
    /** 終點那一端的半寬 */
    spread: number;
    /** 光點的數量：文章越多越熱鬧 */
    photons: number;
}

const round = (n: number) => Math.round(n * 10) / 10;
const round2 = (point: Point) => ({ x: round(point.x), y: round(point.y) });
const unit = (v: Point): Point => {
    const length = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / length, y: v.y / length };
};
const onOrb = (angle: number, radius: number = ORB.r): Point => ({ x: ORB.cx + radius * Math.cos(angle), y: ORB.cy + radius * Math.sin(angle) });

/** 入射光從圓心看的角度、打在 O 上的那一點、出射的中心角度 */
export function refract(sourceY: number): { entry: Point; exitAngle: number } {
    const incoming = Math.atan2(sourceY - ORB.cy, SOURCE_X - ORB.cx); // 接近 π
    const tilt = Math.atan2(Math.sin(incoming), -Math.cos(incoming)); // 入射光偏離水平的角度（下方為正）
    return { entry: round2(onOrb(incoming)), exitAngle: -tilt * BEND };
}

/** 每道光的出口：以出射中心角度為中心，沿右緣均勻分開，由上往下（跟光的順序一樣） */
export function exitsFor(sourceY: number, count: number): Point[] {
    const { exitAngle } = refract(sourceY);
    if (count <= 1) return [round2(onOrb(exitAngle))];
    return Array.from({ length: count }, (_, index) => round2(onOrb(exitAngle - EXIT_FAN / 2 + (EXIT_FAN * index) / (count - 1))));
}

/** 一道光的多邊形：從自己的出口細細的，到終點張開 */
export function rayPolygon(exit: Point, ray: Pick<Ray, 'y' | 'spread'>): string {
    return [
        `${round(exit.x)},${round(exit.y - 1.2)}`,
        `${END_X},${round(ray.y - ray.spread)}`,
        `${END_X},${round(ray.y + ray.spread)}`,
        `${round(exit.x)},${round(exit.y + 1.2)}`
    ].join(' ');
}

/** 光上的一顆光點在第 t（0～1）的位置：橫向在那道光的寬度裡（lane -1～1），越遠越散 */
export function photonAt(exit: Point, ray: Pick<Ray, 'y' | 'spread'>, t: number, lane: number): Point {
    return {
        x: exit.x + (END_X - exit.x) * t,
        y: exit.y + (ray.y - exit.y) * t + lane * ray.spread * t * 0.8
    };
}

// #region [P] 光絲：白光在玻璃裡演化成元素，每種元素有自己的樣子

const SAMPLES = 36;

/**
 * 底線：入口 → 出口的三次貝茲。最後一個控制點在「那道光的反方向」，所以出口的切線就是光的方向（收束成光束）。
 * 元素的擾動疊在這條線的法線上，用 sin(πs)² 當包絡：兩端是 0、而且斜率也是 0，出入口的方向不會被擾動弄歪。
 */
function baseCurve(entry: Point, exit: Point, rayEnd: Point) {
    const flow = unit({ x: exit.x - entry.x, y: exit.y - entry.y });
    const out = unit({ x: rayEnd.x - exit.x, y: rayEnd.y - exit.y });
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
        return { point, normal: { x: -tangent.y, y: tangent.x } };
    };
}

/** 各元素在第 s 的位置、第 time 秒，法線方向擾動多少（乘上 r） */
const WAVES: Record<Exclude<ElementKey, 'metal'>, (s: number, time: number, seed: number) => number> = {
    // 水：一個半波長的正弦，順著流
    water: (s, time, seed) => 0.32 * Math.sin(Math.PI * 3 * s - time * 1.8 + seed),
    // 火：短波長、快、兩個頻率疊起來的抖動
    fire: (s, time, seed) => 0.16 * Math.sin(Math.PI * 7 * s - time * 6.5 + seed) + 0.1 * Math.sin(Math.PI * 13 * s + time * 9.7 + seed * 2),
    // 風：大而慢的一個弧，整條飄來飄去
    wind: (s, time, seed) => 0.5 * Math.sin(Math.PI * s + time * 0.6 + seed) * Math.sin(time * 0.4 + seed),
    // 木：越往後越大的螺旋（第二股藤蔓是反相）
    wood: (s, time, seed) => 0.3 * s * Math.sin(Math.PI * 4 * s + time * 1.4 + seed),
    // 土：法線方向不動，往下墜的部分另外加（見 strandPoints）
    earth: (s, time, seed) => 0.04 * Math.sin(Math.PI * 2 * s + time * 0.5 + seed)
};

/** 金：從入口直直射進去，碰到玻璃內壁就反射，兩次之後直直對準出口（方向隨時間慢慢轉） */
function metalPath(entry: Point, exit: Point, rayEnd: Point, time: number, seed: number): Point[] {
    const wall = ORB.r * 0.9;
    const flow = unit({ x: exit.x - entry.x, y: exit.y - entry.y });
    const turn = 0.75 * Math.sin(time * 0.45 + seed) + 0.35;
    let dir = unit({ x: flow.x * Math.cos(turn) - flow.y * Math.sin(turn), y: flow.x * Math.sin(turn) + flow.y * Math.cos(turn) });
    // 從入口往裡面走一點再開始，免得一開始就貼著牆
    let p = { x: entry.x + flow.x * 6, y: entry.y + flow.y * 6 };
    const points: Point[] = [entry, p];
    for (let bounce = 0; bounce < 2; bounce++) {
        // 射線與圓（半徑 wall）的交點：解 |p + t·dir − c|² = wall²
        const ox = p.x - ORB.cx;
        const oy = p.y - ORB.cy;
        const b = ox * dir.x + oy * dir.y;
        const c = ox * ox + oy * oy - wall * wall;
        const t = -b + Math.sqrt(Math.max(0, b * b - c));
        p = { x: p.x + dir.x * t, y: p.y + dir.y * t };
        points.push(p);
        const n = unit({ x: p.x - ORB.cx, y: p.y - ORB.cy });
        const dot = dir.x * n.x + dir.y * n.y;
        dir = { x: dir.x - 2 * dot * n.x, y: dir.y - 2 * dot * n.y };
    }
    const out = unit({ x: rayEnd.x - exit.x, y: rayEnd.y - exit.y });
    points.push({ x: exit.x - out.x * ORB.r * 0.3, y: exit.y - out.y * ORB.r * 0.3 }, exit);
    return points.map(round2);
}

/**
 * 一股光絲在第 time 秒的樣子：一串點（畫成折線）。起點是入口、終點是自己的出口，最後一段對準自己那道光。
 * 木有兩股（第二股反相），風有三縷（左右錯開），其他一股。回傳的是「一股或幾股」的陣列。
 */
export function strandPoints(element: ElementKey, entry: Point, exit: Point, rayEnd: Point, time: number, seed = 0): Point[][] {
    if (element === 'metal') return [metalPath(entry, exit, rayEnd, time, seed)];
    const curve = baseCurve(entry, exit, rayEnd);
    const wave = WAVES[element];
    const threads = element === 'wood' ? [1, -1] : element === 'wind' ? [0, 0.6, -0.6] : [0];
    return threads.map(thread => Array.from({ length: SAMPLES + 1 }, (_, i) => {
        const s = i / SAMPLES;
        const envelope = Math.sin(Math.PI * s) ** 2;
        const { point, normal } = curve(s);
        let offset = (element === 'wood' ? thread : 1) * wave(s, time, seed) * ORB.r;
        if (element === 'wind') offset += thread * envelope * ORB.r * 0.12 * Math.sin(time * 0.9 + thread * 3 + seed);
        const sag = element === 'earth' ? envelope * ORB.r * (0.42 + 0.06 * Math.sin(time * 0.5 + seed)) : 0;
        return round2({ x: point.x + normal.x * offset * envelope, y: point.y + normal.y * offset * envelope + sag });
    }));
}

/** 折線上第 t（0～1，照點的順序算）的位置：光點沿著光絲走用 */
export function along(points: readonly Point[], t: number): Point {
    const scaled = Math.min(0.9999, Math.max(0, t)) * (points.length - 1);
    const i = Math.floor(scaled);
    const k = scaled - i;
    return { x: points[i].x + (points[i + 1].x - points[i].x) * k, y: points[i].y + (points[i + 1].y - points[i].y) * k };
}

// #endregion

/** 滑鼠在光學台上的高度（0～1）→ 入射光的高度 */
export const aimFromPointer = (ratio: number) => SOURCE_Y.min + (SOURCE_Y.max - SOURCE_Y.min) * Math.min(1, Math.max(0, ratio));

/**
 * 篇數夠多的分類各一道光，其他併成「其他」一道（連到時間軸）。
 * 光照光譜的順序由上往下排（琥珀在上、靛在下），像真的三稜鏡；同色的照篇數。
 */
export function buildRays(list: readonly Chapter[], maxRays = 6): Ray[] {
    const named = list.filter(chapter => chapter.key !== '未分類');
    const major = named.filter(chapter => chapter.count >= 2).slice(0, maxRays - 1);
    const rest = list.filter(chapter => !major.includes(chapter));
    const restCount = rest.reduce((sum, chapter) => sum + chapter.count, 0);
    const pick = (chapter: Chapter) => ({ title: chapter.latest.title, url: chapter.latest.url, date: chapter.latest.date });

    const entries = major.map((chapter) => {
        const hue = categoryHue(chapter.key);
        return { key: chapter.key, label: chapter.label, count: chapter.count, href: chapter.first.url, hue, members: [chapter.key], latest: pick(chapter) };
    });
    entries.sort((a, b) => SPECTRUM.indexOf(a.hue) - SPECTRUM.indexOf(b.hue) || b.count - a.count);
    if (restCount) {
        const newest = [...rest].sort((a, b) => b.latest.date.localeCompare(a.latest.date))[0];
        entries.push({ key: '其他', label: '其他', count: restCount, href: '/timeline.html', hue: 'indigo', members: rest.map(chapter => chapter.key), latest: pick(newest) });
    }

    const max = Math.max(...entries.map(entry => entry.count), 1);
    const step = entries.length > 1 ? (BOTTOM - TOP) / (entries.length - 1) : 0;
    return entries.map((entry, index) => {
        const y = entries.length > 1 ? TOP + step * index : ORB.cy;
        // 用開根號：31 篇跟 2 篇差 15 倍，直接比例的話小的會細到看不見
        const weight = Math.sqrt(entry.count / max);
        return {
            ...entry,
            element: ELEMENTS[index % ELEMENTS.length],
            y: round(y),
            spread: round(MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * weight),
            photons: Math.round(2 + 5 * weight)
        };
    });
}

/** 背景的星塵：固定的亂數（每次渲染同一片天空） */
export function stars(count: number, seed = 7): { x: number; y: number; r: number; delay: number }[] {
    let state = seed;
    const next = () => {
        state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
        return state / 2_147_483_648;
    };
    return Array.from({ length: count }, () => ({
        x: round(next() * VIEW.width),
        y: round(next() * VIEW.height),
        r: round(0.4 + next() * 1.2),
        delay: round(next() * 6)
    }));
}
