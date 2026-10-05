import type { SpectrumHue } from '@shared/utils/spectrum';
import type { Chapter } from './contents';
import { categoryHue, SPECTRUM } from '@shared/utils/spectrum';

// 首頁的稜鏡（2026-10 翻新）：一道白光射進 O（那張「筆記本裡的宇宙」），從另一邊散成各分類的光。
// 光越寬、那個分類的文章越多。這裡只算幾何，畫在 components/PrismHero.vue。

/** SVG 的座標系：寬 760、高 460。O 的圓心與半徑、光線的終點都照這個量 */
export const VIEW = { width: 760, height: 460 } as const;
export const ORB = { cx: 205, cy: 230, r: 132 } as const;
/** 光從 O 的右緣射出的那一點 */
export const EXIT = { x: ORB.cx + ORB.r - 6, y: ORB.cy } as const;
const END_X = 492;
const TOP = 46;
const BOTTOM = VIEW.height - 46;
const MIN_WIDTH = 2.5;
const MAX_WIDTH = 13;

export interface Ray {
    key: string;
    label: string;
    count: number;
    href: string;
    hue: SpectrumHue;
    /** 這道光包含哪些分類：一般的就是自己，「其他」是併進來的那幾個 */
    members: string[];
    /** 光的終點高度（標籤也對齊這裡） */
    y: number;
    /** 終點那一端的半寬 */
    spread: number;
    /** 多邊形的頂點，直接給 <polygon points> */
    points: string;
}

/**
 * 篇數夠多的分類各一道光，其他併成「其他」一道（連到時間軸）。
 * 光照光譜的順序由上往下排（琥珀在上、靛在下），像真的三稜鏡；同色的照篇數。
 */
export function buildRays(list: readonly Chapter[], maxRays = 6): Ray[] {
    const named = list.filter(chapter => chapter.key !== '未分類');
    const major = named.filter(chapter => chapter.count >= 2).slice(0, maxRays - 1);
    const rest = list.filter(chapter => !major.includes(chapter));
    const restCount = rest.reduce((sum, chapter) => sum + chapter.count, 0);

    const entries = major.map(chapter => ({
        key: chapter.key,
        label: chapter.label,
        count: chapter.count,
        href: chapter.first.url,
        hue: categoryHue(chapter.key),
        members: [chapter.key]
    }));
    entries.sort((a, b) => SPECTRUM.indexOf(a.hue) - SPECTRUM.indexOf(b.hue) || b.count - a.count);
    if (restCount) entries.push({ key: '其他', label: '其他', count: restCount, href: '/timeline.html', hue: 'indigo', members: rest.map(chapter => chapter.key) });

    const max = Math.max(...entries.map(entry => entry.count), 1);
    const step = entries.length > 1 ? (BOTTOM - TOP) / (entries.length - 1) : 0;
    return entries.map((entry, index) => {
        const y = entries.length > 1 ? TOP + step * index : ORB.cy;
        // 用開根號：31 篇跟 2 篇差 15 倍，直接比例的話小的會細到看不見
        const spread = MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * Math.sqrt(entry.count / max);
        const points = [
            `${EXIT.x},${EXIT.y - 1.5}`,
            `${END_X},${round(y - spread)}`,
            `${END_X},${round(y + spread)}`,
            `${EXIT.x},${EXIT.y + 1.5}`
        ].join(' ');
        return { ...entry, y: round(y), spread: round(spread), points };
    });
}

export const LABEL_X = END_X + 16;

const round = (n: number) => Math.round(n * 10) / 10;
