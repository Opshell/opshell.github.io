/**
 * y 軸刻度：取好讀的整數（1、2、5 的倍數），回傳由 0 開始、最後一個 >= max 的刻度。
 * 例如 max = 37 → [0, 10, 20, 30, 40]；max = 0 → [0, 1]；max = 1 且 integer → [0, 1]。
 */
export function niceTicks(max: number, { count = 4, integer = false } = {}): number[] {
    if (max <= 0) return [0, 1];
    const rough = max / count;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const nice = [1, 2, 5, 10].map(m => m * magnitude).find(s => s >= rough) ?? 10 * magnitude;
    // 計數（台、次）沒有 0.5 台，刻度間距至少 1
    const step = integer ? Math.max(1, Math.round(nice)) : nice;
    const ticks: number[] = [];
    for (let v = 0; v < max + step; v += step) {
        ticks.push(Number(v.toPrecision(12))); // 避免 0.1 + 0.2 這種浮點尾巴
        if (v >= max) break;
    }
    return ticks;
}
