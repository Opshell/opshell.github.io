/**
 * 後台的徽章推算（#570 第 1 點）。
 *
 * 徽章的解鎖狀態只記在手機上（api.md 第 13 節），後端驗不了。這裡用後端現有的原料推算「看得出來的那幾顆」，
 * 等 App 上傳解鎖狀態（#568 第 6 點、#569）之後換成真實資料，這份留作沒上傳過的備援。
 *
 * 門檻與名稱抄自 Android `domain/model/Badge.kt` 與 `res/values/strings.xml`，App 改了這裡要跟著改。
 */

/** 六個等級，由易到難（Android `BadgeTier`） */
export const BADGE_TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'RAINBOW'] as const;
export type BadgeTier = typeof BADGE_TIERS[number];

export const TIER_LABELS: Record<BadgeTier, string> = {
    BRONZE: '銅',
    SILVER: '銀',
    GOLD: '金',
    PLATINUM: '白金',
    DIAMOND: '鑽石',
    RAINBOW: '七彩'
};

/** 會升級的 12 顆，順序照 App 的徽章牆 */
export const BADGE_LABELS = {
    RECORDS: '勤勞記帳',
    STREAK: '天天打開',
    AUTO: '自動駕駛',
    PHOTO: '拍照達人',
    VOICE: '開口記帳',
    INVOICES: '發票收藏家',
    DETAILED: '明細控',
    TAGS: '標籤達人',
    BUDGET: '預算守門員',
    SAVER: '精打細算',
    HOLDINGS: '雞蛋分籃',
    BUYS: '定期定額王'
} as const;
export type BadgeKey = keyof typeof BADGE_LABELS;

/** 天天打開的門檻（App 看手機記的最長連續，這裡用後端打卡的最長連續） */
export const STREAK_THRESHOLDS = [3, 7, 14, 30, 100, 365] as const;

/** 以數值看到哪一階；連銅都沒到是 null */
export function tierFor(value: number, thresholds: readonly number[]): BadgeTier | null {
    let reached: BadgeTier | null = null;
    thresholds.forEach((threshold, index) => {
        if (value >= threshold) reached = BADGE_TIERS[index];
    });
    return reached;
}

export interface BadgeSources {
    /** 後端打卡的最長連續；打卡還沒讀到是 null */
    bestStreak: number | null;
    /** 後端算的活動是否達成鐵人 */
    iron: boolean;
    betaTesterSince: string | null;
    ironAchievedOn: string | null;
}

export interface InferredBadge {
    key: BadgeKey;
    label: string;
    /** 'inferred'：後端原料推得出來；'phone-only'：只在手機上，後台看不到 */
    basis: 'inferred' | 'phone-only';
    tier: BadgeTier | null;
    /** 推算用的數字（天天打開的最長連續） */
    progress: number | null;
    /** 下一階的門檻；已經最高階或推不出來是 null */
    next: number | null;
}

export interface InferredMemorial {
    key: 'BETA_TESTER' | 'BETA_FULL_ATTENDANCE';
    label: string;
    earned: boolean;
    /** 拿到的日子（後端記的那天），不知道是 null */
    on: string | null;
}

export function inferBadges(sources: BadgeSources): InferredBadge[] {
    return (Object.keys(BADGE_LABELS) as BadgeKey[]).map((key) => {
        if (key !== 'STREAK' || sources.bestStreak === null) {
            return { key, label: BADGE_LABELS[key], basis: key === 'STREAK' ? 'inferred' : 'phone-only', tier: null, progress: null, next: null };
        }
        const tier = tierFor(sources.bestStreak, STREAK_THRESHOLDS);
        const nextIndex = tier ? BADGE_TIERS.indexOf(tier) + 1 : 0;
        return {
            key,
            label: BADGE_LABELS[key],
            basis: 'inferred',
            tier,
            progress: sources.bestStreak,
            next: STREAK_THRESHOLDS[nextIndex] ?? null
        };
    });
}

/**
 * 紀念徽章。
 * - 勇敢白老鼠：App 看「beta 版上打開過」，這裡看後端的 beta 資格。資格後台改得動，兩邊可能對不上，畫面上標「推算」
 * - 全勤小鐵人：App 看後端活動的鐵人（`event.iron`），跟這裡同一份；寫進裝置的達成日優先
 */
export function inferMemorials(sources: BadgeSources): InferredMemorial[] {
    const iron = sources.ironAchievedOn !== null || sources.iron;
    return [
        { key: 'BETA_TESTER', label: '勇敢白老鼠', earned: sources.betaTesterSince !== null, on: sources.betaTesterSince },
        { key: 'BETA_FULL_ATTENDANCE', label: '全勤小鐵人', earned: iron, on: sources.ironAchievedOn }
    ];
}
