// 功能地圖開頭的介紹（2026-10-08，使用者：「功能 sitemap 要酷炫，用 2～3 種檢視方式轉場，每種停 5 秒左右，
// 讓使用者初窺最吸引人的功能，最後才變成 sitemap，讓他們想探索」）。
// 同一組功能晶片在幾種排法之間移動：一天的帳（時間軸）→ 最懶的六招（大卡）→ 全部接在一起（星座）→ 飛回地圖上自己的位置。
// 這裡只算每種排法下，每顆晶片的中心點在哪（相對於介紹舞台的左上角），純函式、有測試；畫在 components/FeatureShowcase.vue。

export interface Spot {
    x: number;
    y: number;
}

export interface Cell extends Spot {
    w: number;
    h: number;
}

/** 介紹每一幕停多久（ms）；最後飛回地圖的那一下另外算 */
export const SHOWCASE_VIEW_MS = 5000;
/** 介紹舞台的高度：寬螢幕／窄螢幕（FeatureGuide 收地圖高度時也用這兩個數字） */
export const SHOWCASE_WIDE_H = 560;
export const SHOWCASE_NARROW_H = 760;
/** 飛回地圖的時間 */
export const SHOWCASE_LAND_MS = 1400;

/** 窄螢幕（手機）改成直的：時間軸由上往下、大卡兩欄 */
export const isNarrow = (width: number) => width < 720;

/** 一天的帳：相鄰兩站的距離（說明字的寬度不能超過它，不然會跟隔壁疊在一起） */
export function dayStep(count: number, width: number): number {
    const margin = Math.min(140, width * 0.1);
    return (width - margin * 2) / Math.max(1, count - 1);
}

/**
 * 一天的帳：寬螢幕是一條橫的時間軸，站點平均分在中間那一段；窄螢幕是一條直的。
 * 回傳每一站晶片的位置（時間與說明字排在晶片上下或左右，元件自己放）。
 */
export function dayLayout(count: number, width: number, height: number): Spot[] {
    if (count <= 0) return [];
    if (isNarrow(width)) {
        const top = 170; // 窄螢幕的標題與章節會換行，比較高
        const step = (height - top - 40) / Math.max(1, count - 1);
        // 時間軸在右邊（72%），左邊留給時間與說明字
        return Array.from({ length: count }, (_, i) => ({ x: width * 0.72, y: top + step * i }));
    }
    const margin = Math.min(140, width * 0.1);
    const step = (width - margin * 2) / Math.max(1, count - 1);
    return Array.from({ length: count }, (_, i) => ({ x: margin + step * i, y: height * 0.56 }));
}

/** 最懶的六招：三欄兩列（窄螢幕兩欄三列），每格一張大卡 */
export function gridLayout(count: number, width: number, height: number): Cell[] {
    const columns = isNarrow(width) ? 2 : 3;
    const rows = Math.ceil(count / columns);
    const gap = isNarrow(width) ? 10 : 18;
    const top = isNarrow(width) ? 160 : 110;
    const side = isNarrow(width) ? 12 : Math.max(24, (width - 1000) / 2);
    const w = (width - side * 2 - gap * (columns - 1)) / columns;
    const h = Math.min(170, (height - top - 24 - gap * (rows - 1)) / rows);
    return Array.from({ length: count }, (_, i) => {
        const column = i % columns;
        const row = Math.floor(i / columns);
        return { x: side + w / 2 + column * (w + gap), y: top + h / 2 + row * (h + gap), w, h };
    });
}

/**
 * 全部接在一起：每個分支一個扇形，功能照分支排在兩圈上（多的放外圈），中心是叮咚。
 * groups 是每個分支有幾個功能（照分支的順序）；回傳照同樣順序攤平的位置，加上每個分支標籤的位置。
 */
export function orbitLayout(groups: readonly number[], width: number, height: number): { spots: Spot[]; labels: Spot[]; center: Spot } {
    // 橢圓：橫的用滿舞台寬，直的扣掉上面的標題（58 個功能塞在正圓裡會疊成一團）
    const narrow = isNarrow(width);
    const top = narrow ? 170 : 80;
    const center = { x: width / 2, y: (height + top) / 2 };
    const rx = width * (narrow ? 0.3 : 0.44); // 窄螢幕的晶片相對比較寬，往內收才不會出界
    const ry = (height - top - 50) / 2;
    const total = groups.reduce((sum, n) => sum + n, 0) || 1;
    const spots: Spot[] = [];
    const labels: Spot[] = [];
    let angle = -Math.PI / 2;
    for (const n of groups) {
        // 每個分支分到的角度跟功能數成正比，前後留一點空隙
        const sweep = (Math.PI * 2 * n) / total;
        const gap = Math.min(0.12, sweep * 0.15);
        const usable = sweep - gap * 2;
        const half = Math.ceil(n / 2);
        for (let i = 0; i < n; i++) {
            const ring = i < half ? 0.62 : 0.94;
            const index = i < half ? i : i - half;
            const count = i < half ? half : n - half;
            const a = angle + gap + (count === 1 ? usable / 2 : (usable * index) / (count - 1));
            spots.push({ x: center.x + Math.cos(a) * rx * ring, y: center.y + Math.sin(a) * ry * ring });
        }
        const mid = angle + sweep / 2;
        labels.push({ x: center.x + Math.cos(mid) * rx * 0.32, y: center.y + Math.sin(mid) * ry * 0.32 });
        angle += sweep;
    }
    return { spots, labels, center };
}
