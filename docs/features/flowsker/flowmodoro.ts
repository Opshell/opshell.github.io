// 反向番茄鐘的算法（跟產品一樣：休息 = 專注 ÷ 5），介紹頁的互動示範用。純函式，有測試。

/** 休息與專注的比例：專注 5 分鐘換 1 分鐘休息 */
export const REST_RATIO = 5;

/** 專注幾分鐘可以休息幾分鐘（無條件捨去到分鐘，跟產品一樣不給零頭） */
export function restMinutes(focusMinutes: number): number {
    if (!Number.isFinite(focusMinutes) || focusMinutes <= 0) return 0;
    return Math.floor(focusMinutes / REST_RATIO);
}

/** 「1 小時 12 分」「45 分」「0 分」 */
export function formatMinutes(minutes: number): string {
    const whole = Math.max(0, Math.floor(minutes));
    const hours = Math.floor(whole / 60);
    const rest = whole % 60;
    if (!hours) return `${rest} 分`;
    return rest ? `${hours} 小時 ${rest} 分` : `${hours} 小時`;
}

/** 示範用的滑桿範圍與預設：預設 45 分是沙漏截圖上那個數字 */
export const DEMO_MIN = 5;
export const DEMO_MAX = 180;
export const DEMO_DEFAULT = 45;

/** 沙漏裡的沙堆高度（0～1）：照專注時間佔上限的比例，開根號讓前段變化看得見 */
export function sandLevel(focusMinutes: number, max = DEMO_MAX): number {
    if (!Number.isFinite(focusMinutes) || focusMinutes <= 0) return 0;
    return Math.min(1, Math.sqrt(focusMinutes / max));
}

/** 開始專注後幾分鐘內轉成夜晚（產品的做法）：5 分是白晝、15 分全暗，中間線性過渡；示範面板的夜色用它 */
export const NIGHT_FROM = 5;
export const NIGHT_UNTIL = 15;
export function nightLevel(focusMinutes: number): number {
    if (!Number.isFinite(focusMinutes)) return 0;
    return Math.min(1, Math.max(0, (focusMinutes - NIGHT_FROM) / (NIGHT_UNTIL - NIGHT_FROM)));
}
