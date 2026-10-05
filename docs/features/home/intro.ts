import type { Point } from './prism';

// 首頁的開場（2026-10-06，使用者：「進首頁時跑一段現代、簡潔、引人注目的動畫，要用網站的 LOGO、呈現 Slogan，最後打散分佈到首頁的各個區域」）。
// 時間軸（ms，從開始播算）：CSS 的 animation-delay 與 LightStage 的畫布都照這張表，改一邊要改另一邊（HomeContents.vue 的「開場」區段）。
export const INTRO = {
    /** LOGO 描邊 → 填色 → 黃色兩槓滑進來、名字、Slogan 一個字一個字 */
    logo: 0,
    /** LOGO 與字變成光點，飛到首頁各區（大卡、O、分類、文章） */
    scatter: 1900,
    /** 光點飛行的時間（每顆再依距離錯開一點） */
    flight: 1000,
    /** 光從天上射進 O */
    beam: 2500,
    /** O 裡開始演化 */
    inner: 2900,
    /** 一道道光往下落到分隔線 */
    rays: 3100,
    /** 分隔線亮起、極光往下長 */
    aurora: 3700,
    /** 拿掉開場的 class，定格 */
    done: 4700
} as const;

/** 網站 LOGO（public/logo.jpg）重畫成路徑：600×600，可以描邊、換深淺色、打散成光點 */
export const LOGO = {
    size: 600,
    /** 白（深色模式）／黑（淺色模式）的部分：左邊的拱與斜槓、底下的 L */
    body: [
        'M127 470V200Q127 122 205 122H290L360 410H302L240 182H207Q187 182 187 202V470Z',
        'M215 410H417V298H475V470H215Z'
    ],
    /** 黃色的兩槓 */
    accent: ['M317 122H475V182H332Z', 'M340 210H475V270H355Z']
} as const;

const clamp = (n: number) => Math.min(1, Math.max(0, n));
/** 跟 --cubic-FiSo 差不多的手感：前段快、尾巴慢慢停 */
export const easeOut = (t: number) => 1 - (1 - clamp(t)) ** 3;
/** 開場的第幾段播到哪（0～1）；沒有在播（introAt 是 null）就是 1 */
export function phase(introAt: number | null, now: number, from: number, length: number): number {
    if (introAt === null) return 1;
    return clamp((now - introAt - from) / length);
}

export interface Particle {
    from: Point;
    to: Point;
    color: string;
    /** 出發的延遲（ms）：離目標遠的先走，一起到 */
    delay: number;
    /** 往旁邊彎的程度：不走直線，像被吹散 */
    swirl: number;
}

/** 固定的亂數：每次打散的樣子一樣（測試也用得到） */
export function seeded(seed = 11) {
    let state = seed;
    return () => {
        state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
        return state / 2_147_483_648;
    };
}

/**
 * 把光點分到首頁的各區：每區照面積分，至少幾顆；落點是區塊裡的亂數位置。
 * points 是 LOGO 與字取樣出來的點（畫面座標），targets 是各區的範圍。
 */
export function scatter(points: readonly { x: number; y: number; color: string }[], targets: readonly DOMRectLike[], random = seeded()): Particle[] {
    if (!targets.length) return [];
    const areas = targets.map(rect => Math.max(1, rect.width * rect.height));
    const total = areas.reduce((sum, area) => sum + area, 0);
    // 累積的比例：亂數落在哪一段就去哪一區，但先保證每區都有
    const cumulative = areas.map((_, i) => areas.slice(0, i + 1).reduce((sum, area) => sum + area, 0) / total);
    return points.map((point, index) => {
        const target = index < targets.length ? index : cumulative.findIndex(edge => random() <= edge);
        const rect = targets[Math.max(0, target)];
        const to = { x: rect.left + random() * rect.width, y: rect.top + random() * rect.height };
        return { from: { x: point.x, y: point.y }, to, color: point.color, delay: random() * 220, swirl: (random() - 0.5) * 2 };
    });
}

export interface DOMRectLike {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** 光點在第 t（0～1）的位置：二次曲線，中間往旁邊彎 */
export function particleAt(particle: Particle, t: number): Point {
    const e = easeOut(t);
    const dx = particle.to.x - particle.from.x;
    const dy = particle.to.y - particle.from.y;
    const bend = Math.sin(Math.PI * e) * particle.swirl * 0.25;
    return { x: particle.from.x + dx * e - dy * bend, y: particle.from.y + dy * e + dx * bend };
}

/** 一個分頁只播一次：在站內點回首頁時直接定格（模組層級，重新整理才會再播） */
export const introState = { played: false };
