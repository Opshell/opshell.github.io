import type { SpectrumHue } from '@shared/utils/spectrum';
import type { Chapter } from './contents';
import { categoryHue, SPECTRUM } from '@shared/utils/spectrum';

// 首頁的光學台（2026-10 翻新第二版，使用者：「概念很棒，但視覺粗糙，不一定要用 AI 生成的圖」）。
// 一道白光從左邊射進玻璃 O，在 O 裡折一下，從右邊散成各分類的光。滑鼠上下是在「瞄準」入射光：
// 光從哪個高度進來，出射點就往反方向偏一點，整把光跟著轉——像真的透鏡。這裡只算幾何，畫在 components/LightBench.vue。

/** SVG 的座標系：寬 760、高 520 */
export const VIEW = { width: 760, height: 520 } as const;
/** 玻璃 O */
export const ORB = { cx: 236, cy: 262, r: 112 } as const;
/** 入射光從畫面外的這個 x 射進來；高度可以變 */
export const SOURCE_X = -60;
/** 入射光高度的範圍與預設（從左下方斜斜打進來，跟舊版一樣） */
export const SOURCE_Y = { min: 120, max: 420, rest: 360 } as const;
/** 出射角是入射角的幾倍、反向：0.55 看得出偏折，又不會把光甩出畫面 */
const BEND = 0.55;
const END_X = 520;
const TOP = 52;
const BOTTOM = VIEW.height - 52;
const MIN_WIDTH = 3;
const MAX_WIDTH = 15;
export const LABEL_X = END_X + 18;

export interface Point {
    x: number;
    y: number;
}

export interface Ray {
    key: string;
    label: string;
    count: number;
    href: string;
    hue: SpectrumHue;
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

/** 入射光打在 O 上的那一點、在 O 裡折完從哪裡出去 */
export function refract(sourceY: number): { entry: Point; exit: Point } {
    const incoming = Math.atan2(sourceY - ORB.cy, SOURCE_X - ORB.cx); // 從圓心看光源的方向，接近 π
    const entry = { x: ORB.cx + ORB.r * Math.cos(incoming), y: ORB.cy + ORB.r * Math.sin(incoming) };
    // 從下面進來的光，往上面出去：偏離水平的角度反向、縮小
    const tilt = Math.atan2(Math.sin(incoming), -Math.cos(incoming)); // 入射光偏離水平的角度（下方為正）
    const outgoing = -tilt * BEND;
    const exit = { x: ORB.cx + ORB.r * Math.cos(outgoing), y: ORB.cy + ORB.r * Math.sin(outgoing) };
    return { entry: round2(entry), exit: round2(exit) };
}

/** 一道光的多邊形：從出射點細細的，到終點張開 */
export function rayPolygon(exit: Point, ray: Pick<Ray, 'y' | 'spread'>): string {
    return [
        `${round(exit.x)},${round(exit.y - 1.2)}`,
        `${END_X},${round(ray.y - ray.spread)}`,
        `${END_X},${round(ray.y + ray.spread)}`,
        `${round(exit.x)},${round(exit.y + 1.2)}`
    ].join(' ');
}

/**
 * 一顆光點在第 t（0～1）的位置：從出射點走到終點，橫向在那道光的寬度裡（lane -1～1）。
 * 越靠近終點，光越寬，光點也跟著散開。
 */
export function photonAt(exit: Point, ray: Pick<Ray, 'y' | 'spread'>, t: number, lane: number): Point {
    return {
        x: exit.x + (END_X - exit.x) * t,
        y: exit.y + (ray.y - exit.y) * t + lane * ray.spread * t * 0.8
    };
}

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

    const entries = major.map(chapter => ({
        key: chapter.key,
        label: chapter.label,
        count: chapter.count,
        href: chapter.first.url,
        hue: categoryHue(chapter.key),
        members: [chapter.key],
        latest: pick(chapter)
    }));
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
            y: round(y),
            spread: round(MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * weight),
            photons: Math.round(2 + 5 * weight)
        };
    });
}

/** 背景的星塵：固定的亂數（每次渲染同一片天空，伺服器和瀏覽器也一樣） */
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

const round = (n: number) => Math.round(n * 10) / 10;
const round2 = (point: Point) => ({ x: round(point.x), y: round(point.y) });
