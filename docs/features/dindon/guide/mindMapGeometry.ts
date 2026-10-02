// 心智圖的連線（FeatureMindMap.vue）。節點是 HTML，量出位置後在底下的 SVG 畫線；這裡只管「兩點之間怎麼彎」。

export interface Point {
    x: number;
    y: number;
}

export interface Box {
    left: number;
    top: number;
    width: number;
    height: number;
}

const round = (value: number) => Math.round(value * 10) / 10;

/** 節點左右兩側的中點：線從靠近對方的那一側接出去 */
export function edgeToward(box: Box, target: Point): Point {
    const centerX = box.left + box.width / 2;
    return {
        x: target.x >= centerX ? box.left + box.width : box.left,
        y: box.top + box.height / 2
    };
}

export const centerOf = (box: Box): Point => ({ x: box.left + box.width / 2, y: box.top + box.height / 2 });

/** 樹枝：水平出、水平進的 S 形曲線，兩個控制點在水平距離的一半 */
export function branchPath(from: Point, to: Point): string {
    const midX = from.x + (to.x - from.x) / 2;
    return `M${round(from.x)},${round(from.y)} C${round(midX)},${round(from.y)} ${round(midX)},${round(to.y)} ${round(to.x)},${round(to.y)}`;
}

/**
 * 跨分支的關聯線：兩端都往中心拉，線會從核心附近繞過去，而不是直直穿過別的分支。
 * pull 是控制點往中心靠的比例，0 是直線、1 是兩個控制點都在中心。
 */
export function linkPath(from: Point, to: Point, hub: Point, pull = 0.55): string {
    const toward = (point: Point) => ({ x: point.x + (hub.x - point.x) * pull, y: point.y + (hub.y - point.y) * pull });
    const c1 = toward(from);
    const c2 = toward(to);
    return `M${round(from.x)},${round(from.y)} C${round(c1.x)},${round(c1.y)} ${round(c2.x)},${round(c2.y)} ${round(to.x)},${round(to.y)}`;
}
