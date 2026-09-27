import { camelToSnake, snakeToCamel } from '@shared/utils/zod';
import { z } from 'zod';

// 後台管理 API（/v1/admin/*）的資料層（前端開發規範五章）。
// 規格以 DinDon_BackEnd/docs/api.md 第 8 節為準；Raw 的欄位與能不能是 null 照後端的 Go 結構（controllers/admin_*.go、usage/、perks/）。
// Go 的 slice、map 沒有資料時會送 null：Raw 接受 null，Parser 在 snake_case 上補成空陣列／空物件，元件拿到的一定是陣列。

// #region [P] 共用列舉與小物件

/** 裝置現在實際的方案（api.md 第 8 節）。訂閱或權益到期會自動變回 free */
export const PlanTierSchema = z.enum(['free', 'lite', 'pro']);
export type PlanTier = z.infer<typeof PlanTierSchema>;

/** 優惠碼送的方案：空字串 = 這組碼只送點數 */
export const PromoPlanTierSchema = z.enum(['', 'lite', 'pro']);

export const FeedbackStatusSchema = z.enum(['pending', 'accepted_bug', 'accepted_suggestion', 'rejected']);
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>;

/** crash 是 App 當掉後自動產生、使用者按了才送的（溝通板 #39） */
export const FeedbackReportKindSchema = z.enum(['bug', 'suggestion', 'crash']);

/** 提示，不是判決；也不會擋任何請求。每一種都有正當的解釋（api.md 第 8 節，舊板溝通板 #47） */
export const UsageFlagSchema = z.enum(['heavy_today', 'burst', 'new_and_heavy', 'many_rejected']);
export type UsageFlag = z.infer<typeof UsageFlagSchema>;

/** 大頭貼（api.md 第 13 節）。upload 的 url 是相對路徑，而且要帶**裝置的** API key 才拿得到 */
export const AvatarSchema = z.object({
    kind: z.enum(['preset', 'upload', 'google']),
    preset: z.string().nullable(),
    url: z.string().nullable()
});
export type Avatar = z.infer<typeof AvatarSchema>;

/** 分布：平均與百分位數 */
export const DistSchema = z.object({ avg: z.number(), p50: z.number(), p90: z.number(), p95: z.number(), max: z.number() });
export type Dist = z.infer<typeof DistSchema>;

/** Go 的 nil slice 會送 null */
const nullableList = <T extends z.ZodType>(item: T) => z.array(item).nullish().transform(list => list ?? []);
/** Go 的 nil map 會送 null */
const nullableRecord = <T extends z.ZodType>(value: T) => z.record(z.string(), value).nullish().transform(record => record ?? {});

// #endregion

// #region [P] 裝置

/** 後台看到的一台裝置（api.md 第 8 節「裝置物件」） */
export const AdminDeviceSchema = z.object({
    id: z.number().int(),
    planTier: PlanTierSchema,
    tokens: z.number().int(),
    betaTesterSince: z.string().nullable(),
    linked: z.boolean(),
    email: z.string().nullable(),
    subscriptionExpiresAt: z.string().nullable(),
    frozen: z.boolean(),
    frozenAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lastAiAt: z.string().nullable(),
    aiCalls30d: z.number().int(),
    nickname: z.string().nullable(),
    /** 使用者用徽章組出來的稱號，會顯示在**別人的**排行榜上（新板溝通板 #48） */
    title: z.string().nullable(),
    /** 排行榜上顯示的名字：暱稱，或「白老鼠 #編號」 */
    displayName: z.string(),
    /** 採計的件數，**已經含** bonus（後台手動加的） */
    bugs: z.number().int(),
    suggestions: z.number().int(),
    bonusBugs: z.number().int(),
    bonusSuggestions: z.number().int(),
    ironAchievedOn: z.string().nullable(),
    avatar: AvatarSchema.nullable()
});
export type AdminDevice = z.infer<typeof AdminDeviceSchema>;

const AdminDeviceRawSchema = z.object({
    id: z.number(),
    plan_tier: PlanTierSchema,
    tokens: z.number(),
    beta_tester_since: z.string().nullable(),
    linked: z.boolean(),
    email: z.string().nullish(),
    subscription_expires_at: z.string().nullish(),
    frozen: z.boolean(),
    frozen_at: z.string().nullish(),
    created_at: z.string(),
    updated_at: z.string(),
    last_ai_at: z.string().nullish(),
    ai_calls_30d: z.number(),
    nickname: z.string().nullish(),
    title: z.string().nullish(),
    display_name: z.string(),
    bugs: z.number(),
    suggestions: z.number(),
    bonus_bugs: z.number(),
    bonus_suggestions: z.number(),
    iron_achieved_on: z.string().nullish(),
    avatar: AvatarSchema.nullish()
});

export const AdminDeviceParser = AdminDeviceRawSchema
    .transform(data => ({
        ...data,
        email: data.email ?? null,
        subscription_expires_at: data.subscription_expires_at ?? null,
        frozen_at: data.frozen_at ?? null,
        last_ai_at: data.last_ai_at ?? null,
        nickname: data.nickname ?? null,
        title: data.title ?? null,
        iron_achieved_on: data.iron_achieved_on ?? null,
        avatar: data.avatar ?? null
    }))
    .transform(snakeToCamel)
    .pipe(AdminDeviceSchema);

/** 「免費用某個方案多久」的一筆權益（api.md 第 14 節，後端 perks.View） */
export const PerkSchema = z.object({
    id: z.number().int(),
    title: z.string(),
    source: z.enum(['beta-rank', 'beta-iron', 'promo', 'referral', 'admin']),
    planTier: PlanTierSchema,
    months: z.number().int(),
    days: z.number().int(),
    status: z.enum(['waiting_launch', 'scheduled', 'active', 'ended', 'revoked']),
    startsOn: z.string().nullable(),
    endsOn: z.string().nullable()
});
export type Perk = z.infer<typeof PerkSchema>;

const PerkParser = z
    .object({
        id: z.number(),
        title: z.string(),
        source: PerkSchema.shape.source,
        plan_tier: PlanTierSchema,
        months: z.number(),
        days: z.number(),
        status: PerkSchema.shape.status,
        starts_on: z.string().nullish(),
        ends_on: z.string().nullish()
    })
    .transform(data => ({ ...data, starts_on: data.starts_on ?? null, ends_on: data.ends_on ?? null }))
    .transform(snakeToCamel)
    .pipe(PerkSchema);

export const AuditEntrySchema = z.object({
    actor: z.string(),
    action: z.string(),
    before: z.record(z.string(), z.unknown()),
    after: z.record(z.string(), z.unknown()),
    createdAt: z.string()
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

const AuditEntryParser = z
    .object({
        actor: z.string(),
        action: z.string(),
        before: z.record(z.string(), z.unknown()).nullish(),
        after: z.record(z.string(), z.unknown()).nullish(),
        created_at: z.string()
    })
    // before／after 是紀錄當下的原始值，裡面的 key 不轉
    .transform(data => ({ actor: data.actor, action: data.action, before: data.before ?? {}, after: data.after ?? {}, createdAt: data.created_at }))
    .pipe(AuditEntrySchema);

// #region [P] 列出裝置 GET /v1/admin/devices、POST /v1/admin/devices/search

export const GetDeviceListParser = z
    .object({
        devices: nullableList(AdminDeviceParser),
        total: z.number(),
        page: z.number(),
        per_page: z.number()
    })
    .transform(data => ({ devices: data.devices, total: data.total, page: data.page, perPage: data.per_page }));

export type DeviceList = z.output<typeof GetDeviceListParser>;
export type GetDeviceListOutput = z.input<typeof GetDeviceListParser>;

// #endregion

// #region [P] 裝置詳情 GET /v1/admin/devices/:id

export const GetDeviceDetailParser = z
    .object({
        device: AdminDeviceParser,
        audit: nullableList(AuditEntryParser),
        perks: nullableList(PerkParser),
        /** 現在實際的方案：訂閱與使用中的權益取高的 */
        plan: z.object({ plan_tier: PlanTierSchema, plan_source: z.enum(['subscription', 'perk', 'free']) }).nullish(),
        /** 邀請的狀態計數，沒有的狀態不會出現 */
        referrals: nullableRecord(z.number()),
        referral_code: z.string().nullish()
    })
    .transform(data => ({
        device: data.device,
        audit: data.audit,
        perks: data.perks,
        plan: data.plan ? { planTier: data.plan.plan_tier, planSource: data.plan.plan_source } : null,
        referrals: { pending: data.referrals.pending ?? 0, qualified: data.referrals.qualified ?? 0 },
        referralCode: data.referral_code ?? null
    }));

export type DeviceDetail = z.output<typeof GetDeviceDetailParser>;
export type GetDeviceDetailOutput = z.input<typeof GetDeviceDetailParser>;

// #endregion

// #region [P] 修改裝置 PATCH /v1/admin/devices/:id、清除身分 POST /v1/admin/devices/:id/erase-identity

export const UpdateDeviceFormSchema = z.object({
    tokens: z.number().int(),
    tokensDelta: z.number().int(),
    planTier: PlanTierSchema,
    betaTesterSince: z.string().nullable(),
    frozen: z.boolean(),
    /** 後台手動加的件數（寄信來的回報），0～1,000 */
    bonusBugs: z.number().int(),
    bonusSuggestions: z.number().int(),
    /** **只能給 null**：清掉不當的暱稱。清掉的暱稱會留在操作紀錄裡 */
    nickname: z.null(),
    /** 手動修正鐵人（打卡沒記到），或 null 取消 */
    ironAchievedOn: z.string().nullable(),
    /** **只能給 null**：清掉不當的大頭貼，不能替使用者換 */
    avatar: z.null(),
    /** **只能給 null**：清掉不當的稱號。操作紀錄會留下被清掉的字 */
    title: z.null()
}).partial();

export const UpdateDevicePayload = UpdateDeviceFormSchema.transform(camelToSnake);
export const UpdateDeviceParser = z.object({ device: AdminDeviceParser }).transform(data => data.device);

export type UpdateDeviceInput = z.input<typeof UpdateDevicePayload>;

// #endregion

// #endregion

// #region [P] 用量

const DeviceUsageRawSchema = z.object({
    device_id: z.number(),
    name: z.string(),
    plan_tier: z.string(),
    tokens: z.number(),
    linked: z.boolean(),
    frozen: z.boolean(),
    frozen_at: z.string().nullish(),
    device_created_at: z.string(),
    /** 真的打了 Gemini 的次數；被額度或每日上限擋下來的算在 failed */
    requests: z.number(),
    today: z.number(),
    /** 模型判定「這不是可以記帳的東西」 */
    rejected: z.number(),
    failed: z.number(),
    peak_hour: z.number(),
    /** 台灣時間的那一個小時，例如 2026-09-20 14:00 */
    peak_hour_at: z.string(),
    active_days: z.number(),
    /** beta 期間是「原本會扣的」，實際沒扣 */
    quota_points: z.number(),
    /** 用價目表估的，不是 Google 的實際帳單 */
    cost_usd: z.number(),
    by_feature: z.record(z.string(), z.number()).nullish(),
    first_at: z.string(),
    last_at: z.string(),
    flags: z.array(UsageFlagSchema).nullish()
});

/** 一台裝置的用量加上它的身分與狀態（後台「用量異常」頁） */
export const DeviceUsageParser = DeviceUsageRawSchema
    // by_feature 的 key 是功能名稱，原樣保留：snakeToCamel 會把名稱裡的底線也轉掉
    .transform(({ by_feature: byFeature, ...data }) => ({
        ...snakeToCamel({ ...data, frozen_at: data.frozen_at ?? null, flags: data.flags ?? [] }),
        byFeature: byFeature ?? {}
    }));

export type DeviceUsage = z.output<typeof DeviceUsageParser>;

// #region [P] 逐台用量 GET /v1/admin/usage/devices

export const GetUsageByDeviceParser = z.object({
    from: z.string(),
    to: z.string(),
    days: z.number(),
    devices: nullableList(DeviceUsageParser)
});

export type UsageByDevice = z.output<typeof GetUsageByDeviceParser>;

// #endregion

const DayFeatureParser = z
    .object({ requests: z.number(), ok: z.number(), rejected: z.number(), failed: z.number(), cost_usd: z.number() })
    .transform(snakeToCamel);

const FeatureStatsRawSchema = z.object({
    feature: z.string(),
    requests: z.number(),
    ok: z.number(),
    rejected: z.number(),
    failed: z.number(),
    quota_exceeded: z.number(),
    daily_limited: z.number(),
    quota_waived: z.number(),
    unique_devices: z.number(),
    quota_charged: z.number(),
    gemini_calls: z.number(),
    hedge_rate: z.number(),
    prompt_tokens_per_request: DistSchema,
    output_tokens_per_request: DistSchema,
    cost_usd_per_request: DistSchema,
    total_cost_usd: z.number(),
    latency_ms: DistSchema,
    cost_usd_per_quota_point: z.number()
});

// #region [P] 用量報表 GET /v1/admin/usage

export const GetUsageReportParser = z
    .object({
        from: z.string(),
        to: z.string(),
        features: nullableList(FeatureStatsRawSchema),
        /** 逐日（台灣時間）。沒有請求的日子不會出現，畫圖的那側自己補 0 */
        daily: nullableList(z.object({
            date: z.string(),
            requests: z.number(),
            ok: z.number(),
            rejected: z.number(),
            /** 含額度不足與撞到每日上限 */
            failed: z.number(),
            unique_devices: z.number(),
            cost_usd: z.number(),
            features: nullableRecord(DayFeatureParser)
        // features 的 key 是功能名稱，原樣保留
        }).transform(({ features, ...day }) => ({ ...snakeToCamel(day), features }))),
        devices: z.object({
            active_devices: z.number(),
            requests_per_device: DistSchema,
            cost_usd_per_device: DistSchema,
            quota_charged_per_device: DistSchema,
            devices_hit_quota: z.number(),
            devices_hit_daily_limit: z.number()
        }),
        models: nullableList(z.object({
            model: z.string(),
            calls: z.number(),
            ok: z.number(),
            errors: z.number(),
            canceled: z.number(),
            prompt_tokens: z.number(),
            output_tokens: z.number(),
            thoughts_tokens: z.number(),
            cost_usd: z.number(),
            price_known: z.boolean()
        })),
        notes: nullableList(z.string())
    })
    // daily 已經轉好（裡面有要保留原樣的 key），其他照常轉駝峰
    .transform(({ daily, ...report }) => ({ ...snakeToCamel(report), daily }));

export type UsageReport = z.output<typeof GetUsageReportParser>;
export type FeatureStats = UsageReport['features'][number];
export type UsageDay = UsageReport['daily'][number];

// #endregion

// #endregion

// #region [P] 審回報（api.md 第 8 節「審回報」）

export const FeedbackReportSchema = z.object({
    id: z.number().int(),
    deviceId: z.number().int(),
    deviceName: z.string(),
    kind: FeedbackReportKindSchema,
    status: FeedbackStatusSchema,
    description: z.string(),
    appVersion: z.string(),
    deviceModel: z.string(),
    androidVersion: z.string(),
    /** 截圖的 position，拿去組截圖網址 */
    screenshots: z.array(z.number().int()),
    reviewedBy: z.string().nullable(),
    reviewedAt: z.string().nullable(),
    /** 有值 = 內容已清除（描述是空的、沒有截圖） */
    contentPurgedAt: z.string().nullable(),
    createdAt: z.string(),
    issueId: z.number().int().nullable(),
    /** 只有單則才有，可能 32 KB */
    log: z.string().optional()
});
export type FeedbackReport = z.infer<typeof FeedbackReportSchema>;

const FeedbackReportParser = z
    .object({
        id: z.number(),
        device_id: z.number(),
        device_name: z.string(),
        kind: FeedbackReportKindSchema,
        status: FeedbackStatusSchema,
        description: z.string(),
        log: z.string().nullish(),
        app_version: z.string(),
        device_model: z.string(),
        android_version: z.string(),
        screenshots: z.array(z.number()).nullish(),
        issue_id: z.number().nullish(),
        reviewed_by: z.string().nullish(),
        reviewed_at: z.string().nullish(),
        content_purged_at: z.string().nullish(),
        created_at: z.string()
    })
    .transform(({ log, ...data }) => ({
        ...data,
        ...(log == null ? {} : { log }),
        screenshots: data.screenshots ?? [],
        issue_id: data.issue_id ?? null,
        reviewed_by: data.reviewed_by ?? null,
        reviewed_at: data.reviewed_at ?? null,
        content_purged_at: data.content_purged_at ?? null
    }))
    .transform(snakeToCamel)
    .pipe(FeedbackReportSchema);

// #region [P] 列出回報 GET /v1/admin/feedback

export const GetFeedbackListParser = z
    .object({ reports: nullableList(FeedbackReportParser), total: z.number(), page: z.number(), per_page: z.number() })
    .transform(data => ({ reports: data.reports, total: data.total, page: data.page, perPage: data.per_page }));

export type FeedbackList = z.output<typeof GetFeedbackListParser>;

// #endregion

// #region [P] 單則回報 GET、審一則 PATCH /v1/admin/feedback/:id

export const GetFeedbackParser = z.object({ report: FeedbackReportParser }).transform(data => data.report);

export const ReviewFeedbackPayload = z
    .object({ status: FeedbackStatusSchema, issueId: z.number().int().nullable() })
    .partial()
    .transform(camelToSnake);

export type ReviewFeedbackInput = z.input<typeof ReviewFeedbackPayload>;

// #endregion

// #region [P] 批次審 POST /v1/admin/feedback/batch

/** `reportIds` 與 `deviceId` 擇一（溝通板 #0053） */
export const BatchReviewFeedbackPayload = z
    .union([
        z.object({ reportIds: z.array(z.number().int()).min(1), status: FeedbackStatusSchema }),
        z.object({ deviceId: z.number().int(), status: FeedbackStatusSchema })
    ])
    .transform(camelToSnake);

export const BatchReviewFeedbackParser = z.object({ updated: z.number() });

export type BatchReviewFeedbackInput = z.input<typeof BatchReviewFeedbackPayload>;

// #endregion

// #region [P] 統計 GET /v1/admin/feedback/stats

export const GetFeedbackStatsParser = z
    .object({
        total: z.number(),
        by_status: nullableRecord(z.number()),
        by_kind: nullableRecord(z.number()),
        per_day: nullableList(z.object({ date: z.string(), count: z.number() })),
        participants: z.number(),
        /** 採計了、還沒歸到任何問題的件數，也就是合併的待辦數量 */
        accepted_without_issue: z.number()
    })
    // by_status 的 key 是狀態值（accepted_bug），不能轉駝峰：手動搬欄位
    .transform(data => ({
        total: data.total,
        byStatus: data.by_status,
        byKind: data.by_kind,
        perDay: data.per_day,
        participants: data.participants,
        acceptedWithoutIssue: data.accepted_without_issue
    }));

export type FeedbackStats = z.output<typeof GetFeedbackStatsParser>;

// #endregion

// #region [P] 問題（合併回報）/v1/admin/feedback/issues

export const FeedbackIssueSchema = z.object({
    id: z.number().int(),
    title: z.string(),
    weight: z.number().int(),
    note: z.string(),
    createdBy: z.string(),
    createdAt: z.string(),
    /** 掛在這個問題上的回報數；剛建立的問題回應裡沒有，當 0 */
    reports: z.number().int(),
    /** 其中被採計的 */
    accepted: z.number().int()
});
export type FeedbackIssue = z.infer<typeof FeedbackIssueSchema>;

const FeedbackIssueParser = z
    .object({
        id: z.number(),
        title: z.string(),
        weight: z.number(),
        note: z.string(),
        created_by: z.string(),
        created_at: z.string(),
        reports: z.number().optional(),
        accepted: z.number().optional()
    })
    .transform(data => ({ ...data, reports: data.reports ?? 0, accepted: data.accepted ?? 0 }))
    .transform(snakeToCamel)
    .pipe(FeedbackIssueSchema);

export const GetFeedbackIssueListParser = z.object({ issues: nullableList(FeedbackIssueParser) }).transform(data => data.issues);
export const CreateFeedbackIssueParser = z.object({ issue: FeedbackIssueParser }).transform(data => data.issue);

export const CreateFeedbackIssuePayload = z
    .object({ title: z.string(), weight: z.number().int(), note: z.string().optional(), reportIds: z.array(z.number().int()).optional() })
    .transform(camelToSnake);

export const UpdateFeedbackIssuePayload = z
    .object({ title: z.string(), weight: z.number().int(), note: z.string() })
    .partial()
    .transform(camelToSnake);

export type CreateFeedbackIssueInput = z.input<typeof CreateFeedbackIssuePayload>;
export type UpdateFeedbackIssueInput = z.input<typeof UpdateFeedbackIssuePayload>;

// #endregion

// #endregion

// #region [P] 優惠碼（api.md 第 8 節「優惠碼」，溝通板 #38）

export const PromoCodeSchema = z.object({
    code: z.string(),
    /** 空字串 = 這組碼不送方案時間，只送點數 */
    planTier: PromoPlanTierSchema,
    tokens: z.number().int(),
    months: z.number().int(),
    days: z.number().int(),
    /** null = 不限人數 */
    maxRedemptions: z.number().int().nullable(),
    redeemed: z.number().int(),
    /** null = 沒有期限 */
    expiresAt: z.string().nullable(),
    active: z.boolean(),
    note: z.string(),
    createdBy: z.string(),
    createdAt: z.string()
});
export type PromoCode = z.infer<typeof PromoCodeSchema>;

const PromoCodeParser = z
    .object({
        code: z.string(),
        plan_tier: PromoPlanTierSchema,
        tokens: z.number(),
        months: z.number(),
        days: z.number(),
        max_redemptions: z.number().nullish(),
        redeemed: z.number(),
        expires_at: z.string().nullish(),
        active: z.boolean(),
        note: z.string(),
        created_by: z.string(),
        created_at: z.string()
    })
    .transform(data => ({ ...data, max_redemptions: data.max_redemptions ?? null, expires_at: data.expires_at ?? null }))
    .transform(snakeToCamel)
    .pipe(PromoCodeSchema);

export const PromoRedemptionSchema = z.object({
    deviceId: z.number().int(),
    deviceName: z.string(),
    tokens: z.number().int(),
    perkId: z.number().int().nullable(),
    createdAt: z.string()
});
export type PromoRedemption = z.infer<typeof PromoRedemptionSchema>;

const PromoRedemptionParser = z
    .object({ device_id: z.number(), device_name: z.string(), tokens: z.number(), perk_id: z.number().nullish(), created_at: z.string() })
    .transform(data => ({ ...data, perk_id: data.perk_id ?? null }))
    .transform(snakeToCamel)
    .pipe(PromoRedemptionSchema);

export const GetPromoCodeListParser = z.object({ promo_codes: nullableList(PromoCodeParser) }).transform(data => data.promo_codes);

/** 單一組，附誰兌換過（最多 200 筆，新的在前） */
export const GetPromoCodeParser = z
    .object({ promo_code: PromoCodeParser, redemptions: nullableList(PromoRedemptionParser) })
    .transform(data => ({ promoCode: data.promo_code, redemptions: data.redemptions }));

export type PromoCodeDetail = z.output<typeof GetPromoCodeParser>;

/** 建立與修改共用的回應 */
export const SavePromoCodeParser = z.object({ promo_code: PromoCodeParser }).transform(data => data.promo_code);

/** 建立與修改共用。`maxRedemptions`／`expiresAt` 給 null 就是改回「不限」；`code` 只有建立時能給，不給由後端產生 10 碼 */
export const SavePromoCodePayload = z
    .object({
        code: z.string(),
        planTier: PromoPlanTierSchema,
        months: z.number().int(),
        days: z.number().int(),
        tokens: z.number().int(),
        maxRedemptions: z.number().int().nullable(),
        expiresAt: z.string().nullable(),
        active: z.boolean(),
        note: z.string()
    })
    .partial()
    .transform(camelToSnake);

export type SavePromoCodeInput = z.input<typeof SavePromoCodePayload>;

// #endregion

// #region [P] 新功能投票的候選（api.md 第 8 節「新功能投票的候選」、規則第 19 節，溝通板 #0061）

export const FeatureCandidateStatusSchema = z.enum(['voting', 'in_progress', 'shipped', 'dropped']);
export type FeatureCandidateStatus = z.infer<typeof FeatureCandidateStatusSchema>;

export const FeatureCandidateSchema = z.object({
    id: z.number().int(),
    title: z.string(),
    /** 可能是空字串，可能有換行 */
    description: z.string(),
    status: FeatureCandidateStatusSchema,
    /** 不含被停用裝置的票。看不到是誰投的，後台也一樣 */
    votes: z.number().int(),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export type FeatureCandidate = z.infer<typeof FeatureCandidateSchema>;

const FeatureCandidateParser = z
    .object({
        id: z.number(),
        title: z.string(),
        description: z.string().nullish(),
        status: FeatureCandidateStatusSchema,
        votes: z.number(),
        created_by: z.string(),
        created_at: z.string(),
        updated_at: z.string()
    })
    .transform(data => ({ ...data, description: data.description ?? '' }))
    .transform(snakeToCamel)
    .pipe(FeatureCandidateSchema);

/** 順序後端排好了（投票中、票多的在前），照著顯示 */
export const GetFeatureCandidateListParser = z
    .object({ max_votes: z.number(), features: nullableList(FeatureCandidateParser) })
    .transform(data => ({ maxVotes: data.max_votes, features: data.features }));

export type FeatureCandidateList = z.output<typeof GetFeatureCandidateListParser>;

/** 建立與修改共用的回應 */
export const SaveFeatureCandidateParser = z.object({ feature: FeatureCandidateParser }).transform(data => data.feature);

/** 後端的上限（api.md），表單先擋。後端照字元數算（Go 的 rune），emoji 算一個字，不能用 .length */
export const FEATURE_TITLE_MAX = 40;
export const FEATURE_DESCRIPTION_MAX = 300;
export const countChars = (value: string) => [...value].length;

const FeatureTitleInput = z
    .string()
    .trim()
    .min(1, '標題不能空白')
    .refine(value => countChars(value) <= FEATURE_TITLE_MAX, `標題最多 ${FEATURE_TITLE_MAX} 字`)
    .refine(value => !/[\r\n]/.test(value), '標題不能換行');

const FeatureDescriptionInput = z
    .string()
    .trim()
    .refine(value => countChars(value) <= FEATURE_DESCRIPTION_MAX, `說明最多 ${FEATURE_DESCRIPTION_MAX} 字`);

/** 建立與修改共用，都是選填、只送有給的。標題不能換行；說明可以。控制字元由後端擋，它的錯誤訊息可以直接顯示 */
export const SaveFeatureCandidatePayload = z
    .object({ title: FeatureTitleInput, description: FeatureDescriptionInput, status: FeatureCandidateStatusSchema })
    .partial();

export type SaveFeatureCandidateInput = z.input<typeof SaveFeatureCandidatePayload>;

// #endregion
