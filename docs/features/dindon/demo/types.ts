// 功能演示的資料格式。來源是 Android 倉庫的 store/demos/index.json，由 pnpm dindon:demos 複製成 demos.json
// 欄位的意思以那邊的 README.md 為準（溝通板 #0055），這裡只寫網頁用到的

/** ready 能播；phone 等使用者用手機錄；diagram 由網頁畫圖解；todo 前端還沒錄 */
export type tDemoStatus = 'ready' | 'todo' | 'phone' | 'diagram';

export type tStepType = 'tap' | 'longpress' | 'swipe' | 'drag' | 'type' | 'back' | 'caption';

/** 座標都是 0～1 的比例，以影片畫面的左上角為原點 */
export interface iDemoStep {
    /** 發生在影片的第幾秒 */
    t: number;
    type: tStepType;
    x?: number;
    y?: number;
    toX?: number;
    toY?: number;
    /** longpress 按住、swipe 滑動、drag 按下到放開的毫秒數 */
    ms?: number;
    /** drag 移動前先按住的毫秒數 */
    holdMs?: number;
    /** drag 經過的點，第一點是按下的位置 */
    path?: [number, number][];
    /** drag 第 i 點在按下後幾毫秒到（ms 則是按下到放開） */
    pathMs?: number[];
    /** 被點的元件範圍 [x1, y1, x2, y2]，點下去之前用紅框標出來；tap、longpress、drag 才有，也不一定每步都有 */
    box?: [number, number, number, number];
    /** 說明泡泡；type 步驟是打的字 */
    label?: string;
}

export interface iDemoItem {
    /** 也是檔名與錨點：16-record-fan */
    id: string;
    /** 對應 App 倉庫「功能巧思清單」的編號 */
    no: number;
    title: string;
    summary: string;
    /** 1～3，3 是一定要演示的 */
    stars: number;
    status: tDemoStatus;
    video?: string;
    poster?: string;
    duration?: number;
    steps?: iDemoStep[];
}

export interface iDemoSection {
    id: string;
    title: string;
    items: iDemoItem[];
}

export interface iDemoIndex {
    version: number;
    appVersion: string;
    generatedAt: string;
    video: { width: number; height: number; format: string };
    sections: iDemoSection[];
}
