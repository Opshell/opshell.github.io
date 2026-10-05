import type { ElementKey, Ray } from './prism';
import { normalizeCategory } from '@shared/utils/spectrum';

// 文章卡片頂端與「最近寫的」分隔線：畫成那一類的元素在玻璃 O 裡的樣子
// （2026-10-05，使用者：「讓六塊文章與上面圓玻璃有更明確的連動，例如邊框的線條變成該元素的特性」）。
// 做法：每種元素一小段會重複的圖（SVG），當 CSS 的 mask 用。顏色由底下的漸層決定（白光→那一類的顏色），
// 所以一張圖六種顏色都能用；不用畫布、不用每格重畫。重複的接縫要對得起來：每個形狀都是週期函式，測試會檢查。

export const LINE_HEIGHT = 14;
const TAU = Math.PI * 2;

type Curve = (x: number) => number;
/** band：粗細會變的帶子；stroke：固定粗細的細線；mark：不跨接縫的小東西（反射點、鹼基對、火星） */
type Part
    = | { kind: 'band'; center: Curve; width: Curve; opacity?: number }
        | { kind: 'stroke'; center: Curve; width: number; opacity?: number }
        | { kind: 'mark'; d: string; opacity?: number; line?: number };

export interface Tile {
    period: number;
    parts: Part[];
}

const sin = Math.sin;
const cos = Math.cos;
/** 0～1 的三角波：金是直來直往的折線 */
const tri = (u: number) => 1 - Math.abs(((u % 1) + 1) % 1 * 2 - 1);

function sparkle(x: number, y: number, r: number): string {
    return `M${x} ${y - r}L${x + r * 0.3} ${y}L${x} ${y + r}L${x - r * 0.3} ${y}Z M${x - r} ${y}L${x} ${y - r * 0.3}L${x + r} ${y}L${x} ${y + r * 0.3}Z`;
}

/** 每種元素的一段圖。註解是元素名稱，畫面上不寫（使用者：「元素名稱不用顯示在標籤前面，但程式碼註解可以有」） */
export const TILES: Record<ElementKey, Tile> = {
    // 金：剛硬的折線，每段像刀刃（中間厚兩端薄），轉折的頂點有一顆反射的閃光
    metal: {
        period: 40,
        parts: [
            { kind: 'band', center: x => 11 - 8 * tri(x / 40), width: x => 0.5 + 2.2 * sin(Math.PI * ((x / 20) % 1)) },
            { kind: 'mark', d: sparkle(20, 3, 3) }
        ]
    },
    // 土：沉在下面、又寬又厚，厚度慢慢起伏；上面一層淡淡的地層
    earth: {
        period: 96,
        parts: [
            { kind: 'band', center: x => 9 + 0.6 * sin(TAU * x / 96), width: x => 3.5 + 3 * sin(Math.PI * x / 96) ** 2 },
            { kind: 'stroke', center: x => 3.5 + 0.5 * sin(TAU * x / 48), width: 0.6, opacity: 0.45 }
        ]
    },
    // 火：底下一道，往上竄出高低不同的火舌，上面幾點火星
    fire: {
        period: 60,
        parts: [
            {
                kind: 'band',
                center: x => 12 - tongue(x) / 2,
                width: x => 1.6 + tongue(x)
            },
            { kind: 'mark', d: 'M11 2.2a.9 .9 0 1 0 .01 0Z M41 1.4a.7 .7 0 1 0 .01 0Z', opacity: 0.7 }
        ]
    },
    // 木：雙螺旋，兩股輪流轉到前面（前面的粗），中間一節節鹼基對
    wood: {
        period: 44,
        parts: [
            { kind: 'band', center: x => 7 + 4.5 * sin(TAU * x / 44), width: x => 0.7 + 1.3 * (0.5 + 0.5 * cos(TAU * x / 44)) },
            { kind: 'band', center: x => 7 - 4.5 * sin(TAU * x / 44), width: x => 0.7 + 1.3 * (0.5 - 0.5 * cos(TAU * x / 44)) },
            { kind: 'mark', d: [1, 2, 3, 5, 6, 7].map(k => k * 44 / 8).map(x => `M${x} ${round(7 - 4.5 * sin(TAU * x / 44))}V${round(7 + 4.5 * sin(TAU * x / 44))}`).join(' '), opacity: 0.45, line: 0.8 }
        ]
    },
    // 風：三縷細絲，各飄各的
    wind: {
        period: 80,
        parts: [
            { kind: 'stroke', center: x => 4 + 1.3 * sin(TAU * x / 80), width: 0.9 },
            { kind: 'stroke', center: x => 7 + 1.6 * sin(TAU * x / 40 + 1), width: 0.7, opacity: 0.75 },
            { kind: 'stroke', center: x => 10 + 1.1 * sin(TAU * x / 80 + 2.5), width: 0.6, opacity: 0.55 }
        ]
    },
    // 水：圓滑的波，波峰波谷粗一點
    water: {
        period: 48,
        parts: [
            { kind: 'band', center: x => 7 + 3 * sin(TAU * x / 48), width: x => 1.6 + 1.4 * sin(TAU * x / 48) ** 2 }
        ]
    }
};

/** 火舌的高度：三條一組、一高兩低，只往上長 */
function tongue(x: number): number {
    return 7 * Math.max(0, sin(TAU * 3 * x / 60)) ** 2 * (0.65 + 0.35 * cos(TAU * x / 60));
}

function round(n: number): number {
    return Math.round(n * 100) / 100;
}

const STEP = 2;

function samples(period: number): number[] {
    return Array.from({ length: period / STEP + 1 }, (_, i) => i * STEP);
}

/** 帶子：上緣由左往右、下緣由右往左，圍成一塊 */
function bandPath(period: number, center: Curve, width: Curve): string {
    const xs = samples(period);
    const top = xs.map(x => `${x} ${round(center(x) - width(x) / 2)}`);
    const bottom = xs.reverse().map(x => `${x} ${round(center(x) + width(x) / 2)}`);
    return `M${top.join('L')}L${bottom.join('L')}Z`;
}

function strokePath(period: number, center: Curve): string {
    return `M${samples(period).map(x => `${x} ${round(center(x))}`).join('L')}`;
}

/** 一段圖的 SVG（黑色＝要顯示的地方，透明度就是 mask 的透明度） */
export function tileSvg(key: ElementKey): string {
    const { period, parts } = TILES[key];
    const body = parts.map((part) => {
        const opacity = part.opacity === undefined ? '' : ` opacity="${part.opacity}"`;
        if (part.kind === 'band') return `<path d="${bandPath(period, part.center, part.width)}"${opacity}/>`;
        if (part.kind === 'stroke') return `<path d="${strokePath(period, part.center)}" fill="none" stroke="#000" stroke-width="${part.width}"${opacity}/>`;
        return part.line
            ? `<path d="${part.d}" fill="none" stroke="#000" stroke-width="${part.line}"${opacity}/>`
            : `<path d="${part.d}"${opacity}/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${period}" height="${LINE_HEIGHT}" viewBox="0 0 ${period} ${LINE_HEIGHT}">${body}</svg>`;
}

const styles = new Map<ElementKey, Record<string, string>>();

/** 給元素的 style：mask 的圖與一段的寬度（每種只組一次字串） */
export function lineStyle(key: ElementKey): Record<string, string> {
    if (!styles.has(key)) {
        styles.set(key, {
            '--line-mask': `url("data:image/svg+xml,${encodeURIComponent(tileSvg(key))}")`,
            '--line-w': `${TILES[key].period}px`
        });
    }
    return styles.get(key)!;
}

/** 一篇文章屬於哪一道光（「其他」那道包含好幾個分類） */
export function rayFor(rays: readonly Ray[], category: string | undefined): Ray | undefined {
    const key = normalizeCategory(category ?? '未分類') || '未分類';
    return rays.find(ray => ray.members.includes(key));
}
