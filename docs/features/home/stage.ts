import type { Point } from './prism';
import { exitsFor, ORB, refract, SOURCE_X } from './prism';

// 首頁的光（2026-10-06 第三版，使用者：「光束從天上下來、透過圓玻璃、連結到下方文章區塊，應該更合理」）。
// 光從畫面上方射進玻璃 O，在裡面演化（elements.ts），從 O 的下緣分開出去，一道道落在文章區塊的分隔線上（每一類的標籤正上方）。
//
// O 裡面的演化沿用原本「由左往右」的座標（prism.ts 的 ORB、refract、exitsFor 與 elements.ts 都不用改），
// 畫的時候把 x、y 對調（沿 y＝x 鏡射）：原本往右流變成往下流，原本由上往下排的出口變成由左往右排，跟底下的標籤同一個順序。
// 這裡都是螢幕座標（CSS px，相對於首頁的最外層），純函式、有測試；畫在 components/LightStage.vue。

export interface StageLayout {
    /** O 在畫面上的圓心與半徑 */
    orb: { x: number; y: number; r: number };
    /** 每道光落在分隔線上的位置（標籤的正上方），由左往右 */
    landings: Point[];
}

const scaleOf = (layout: StageLayout) => layout.orb.r / ORB.r;

/** O 裡的座標 → 畫面（x、y 對調） */
export function toScreen(layout: StageLayout, p: Point): Point {
    const k = scaleOf(layout);
    return { x: layout.orb.x + (p.y - ORB.cy) * k, y: layout.orb.y + (p.x - ORB.cx) * k };
}

/** 畫面 → O 裡的座標 */
export function toLocal(layout: StageLayout, p: Point): Point {
    const k = scaleOf(layout);
    return { x: ORB.cx + (p.y - layout.orb.y) / k, y: ORB.cy + (p.x - layout.orb.x) / k };
}

/** 給 canvas 的 setTransform：之後用 O 裡的座標畫，就會畫在畫面上對的位置 */
export function localMatrix(layout: StageLayout): [number, number, number, number, number, number] {
    const k = scaleOf(layout);
    return [0, k, k, 0, layout.orb.x - k * ORB.cy, layout.orb.y - k * ORB.cx];
}

/** 一個時刻的光：天上的起點、打在 O 上的入口、每道光的出口（畫面座標）與 O 裡座標的出口、終點（給 evolve） */
export function lightPath(layout: StageLayout, sourceY: number) {
    const { entry } = refract(sourceY);
    const localExits = exitsFor(sourceY, layout.landings.length);
    const source = toScreen(layout, { x: SOURCE_X, y: sourceY });
    const entryOnScreen = toScreen(layout, entry);
    // 天上的起點：從入口往來的方向延長到畫面最上面（y = 0）
    const dy = entryOnScreen.y - source.y || 1;
    const sky = { x: entryOnScreen.x - (entryOnScreen.x - source.x) * (entryOnScreen.y / dy), y: 0 };
    return {
        sky,
        entry: entryOnScreen,
        localEntry: entry,
        exits: localExits.map(exit => toScreen(layout, exit)),
        localExits,
        localEnds: layout.landings.map(landing => toLocal(layout, landing))
    };
}

/** 一道光落地時的半寬：文章越多越寬（spread 是 3～15） */
export const landingHalf = (spread: number) => spread * 1.6;

/** 點在不在一道光（出口到落點的三角形）裡；tolerance 讓細的光也點得到 */
export function hitRay(point: Point, exit: Point, landing: Point, half: number, tolerance = 6): boolean {
    const span = landing.y - exit.y;
    if (span <= 0) return false;
    const t = (point.y - exit.y) / span;
    if (t < 0 || t > 1) return false;
    const center = exit.x + (landing.x - exit.x) * t;
    return Math.abs(point.x - center) <= half * t + tolerance;
}
