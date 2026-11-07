/**
 * 後台的徽章（#570）。
 *
 * App 會把解鎖狀態上傳（api.md 第 28 節，裝置物件的 `badges`）；有上傳過就用上傳的（`uploadedWall`）。
 * 沒上傳過（兩個空陣列：舊版 App、或 App 還沒送）才用後端現有的原料推算「看得出來的那幾顆」當備援（`inferBadges`）。
 * 上傳的等級是 App 自己算的，伺服器驗證不了，只拿來看。
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

/** 紀念徽章（沒有等級） */
export const MEMORIAL_LABELS = {
    BETA_TESTER: '勇敢白老鼠',
    BETA_FULL_ATTENDANCE: '全勤小鐵人'
} as const;
export type MemorialKey = keyof typeof MEMORIAL_LABELS;

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
    key: MemorialKey;
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
        { key: 'BETA_TESTER', label: MEMORIAL_LABELS.BETA_TESTER, earned: sources.betaTesterSince !== null, on: sources.betaTesterSince },
        { key: 'BETA_FULL_ATTENDANCE', label: MEMORIAL_LABELS.BETA_FULL_ATTENDANCE, earned: iron, on: sources.ironAchievedOn }
    ];
}

// #region [P] App 上傳的（api.md 第 28 節）

/** 裝置物件的 `badges`，解析過的形狀 */
export interface UploadedBadges {
    badges: { id: string; tier: string; unlockedOn: string }[];
    memorials: { id: string; unlockedOn: string }[];
}

/** 兩個陣列都空 = 沒上傳過（後端不送 null）。上傳過但一顆都還沒解鎖也是空的，分不出來，一律當沒上傳 */
export const hasUploaded = (uploaded: UploadedBadges) => uploaded.badges.length + uploaded.memorials.length > 0;

export interface WallBadge {
    key: string;
    label: string;
    /** 不認得的等級原樣放（App 比後台新的時候）；沒解鎖是 null */
    tier: string | null;
    tierLabel: string;
    on: string | null;
}

export interface WallMemorial {
    key: string;
    label: string;
    earned: boolean;
    on: string | null;
}

/**
 * 上傳的牆：12 顆照 App 的順序全列（沒解鎖的也列，看得出缺哪幾顆），紀念徽章兩顆。
 * 不認得的代號接在後面、原樣顯示，不丟掉——App 加了新徽章、後台還沒跟上時也看得到
 */
export function uploadedWall(uploaded: UploadedBadges): { badges: WallBadge[]; memorials: WallMemorial[] } {
    const byId = new Map(uploaded.badges.map(badge => [badge.id, badge]));
    const known = Object.keys(BADGE_LABELS) as BadgeKey[];
    const ids = [...known, ...uploaded.badges.map(badge => badge.id).filter(id => !(id in BADGE_LABELS))];
    const badges = ids.map((id) => {
        const found = byId.get(id);
        const tier = found?.tier ?? null;
        return {
            key: id,
            label: BADGE_LABELS[id as BadgeKey] ?? id,
            tier,
            tierLabel: tier ? `${TIER_LABELS[tier as BadgeTier] ?? tier}級` : '還沒解鎖',
            on: found?.unlockedOn ?? null
        };
    });

    const memorialById = new Map(uploaded.memorials.map(memorial => [memorial.id, memorial]));
    const memorialIds = [...Object.keys(MEMORIAL_LABELS), ...uploaded.memorials.map(m => m.id).filter(id => !(id in MEMORIAL_LABELS))];
    const memorials = memorialIds.map((id) => {
        const found = memorialById.get(id);
        return { key: id, label: MEMORIAL_LABELS[id as MemorialKey] ?? id, earned: !!found, on: found?.unlockedOn ?? null };
    });
    return { badges, memorials };
}

// #endregion
