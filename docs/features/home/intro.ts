// 首頁的開場（2026-10-06，使用者：「現代、簡潔、引人注目，用網站 LOGO、呈現 Slogan」；
// 第二版：「全部破碎雖然酷，但跟前後沒有關聯、太突然；動畫可以再長 2～3 秒」）。
//
// 故事跟網站的名字走（〈Opshell 的哲學意義〉：O 是大爆炸之前的奇點、唯一的圓滿）：
// LOGO 與 Slogan 出現 → 名字與 Slogan 被吸回 LOGO、LOGO 收成一個白色的光點（奇點）→ 光點落到右邊、綻開成玻璃 O →
// 白光從天上射進 O、在裡面演化 → 一道道光落到底下的分類上 → 最近在忙的、文章依序出現。
//
// 時間軸（ms，從開始播算）：CSS 的 animation-delay（HomeIntro.vue、HomeContents.vue 的「開場」區段）與 LightStage 的畫布都照這張表，改一邊要改另一邊。
export const INTRO = {
    /** LOGO 描邊 → 填色 → 黃色兩槓滑進來；名字、Slogan 接著出來 */
    logo: 0,
    /** 名字與 Slogan 被吸回 LOGO，LOGO 收成一個光點 */
    gather: 2700,
    /** 光點飛到 O 的位置（底色同時淡掉） */
    fly: 3400,
    /** 光點綻開成玻璃 O */
    bloom: 4000,
    /** 白光從天上射進 O */
    beam: 4300,
    /** O 裡開始演化 */
    inner: 4700,
    /** 一道道光往下落到分類 */
    rays: 5000,
    /** 光落地：分類亮、分隔線畫出來、文章一張張出現 */
    land: 5800,
    /** 拿掉開場的 class，定格 */
    done: 7300
} as const;

const clamp = (n: number) => Math.min(1, Math.max(0, n));
/** 跟 --cubic-FiSo 差不多的手感：前段快、尾巴慢慢停 */
export const easeOut = (t: number) => 1 - (1 - clamp(t)) ** 3;
/** 開場的第幾段播到哪（0～1）；沒有在播（introAt 是 null）就是 1 */
export function phase(introAt: number | null, now: number, from: number, length: number): number {
    if (introAt === null) return 1;
    return clamp((now - introAt - from) / length);
}

/** 網站 LOGO（public/logo.jpg）重畫成路徑：600×600，可以描邊、換深淺色 */
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

/** 一個分頁只播一次：在站內點回首頁時直接定格（模組層級，重新整理才會再播） */
export const introState = { played: false };
