// 後台的管理 API（/v1/admin/*）。規格以 DinDon_BackEnd/docs/api.md 第 8 節為準，這裡只是照著接。
// 權限全部由後端把關：這個頁面是公開的靜態網頁，這裡沒有、也不能有任何祕密。

import { apiBase } from '../apiBase';

// #region [P] 型別（對應 api.md 第 8 節的「裝置物件」與用量報表）
export type PlanTier = 'free' | 'pro';
export type DeviceStatus = 'all' | 'active' | 'frozen';

/** 大頭貼（api.md 第 13 節）。upload 的 url 是相對路徑，而且要帶**裝置的** API key 才拿得到 */
export interface Avatar {
    kind: 'preset' | 'upload' | 'google'
    preset: string | null
    url: string | null
}

export interface AdminDevice {
    id: number
    plan_tier: PlanTier
    tokens: number
    beta_tester_since: string | null
    linked: boolean
    email: string | null
    subscription_expires_at: string | null
    frozen: boolean
    frozen_at: string | null
    created_at: string
    updated_at: string
    last_ai_at: string | null
    ai_calls_30d: number
    // 以下是 beta 貢獻活動加的（api.md 第 8 節「裝置物件」）
    nickname: string | null
    /** 排行榜上顯示的名字：暱稱，或「白老鼠 #編號」 */
    display_name: string
    /** 採計的件數，**已經含** bonus_*（後台手動加的） */
    bugs: number
    suggestions: number
    bonus_bugs: number
    bonus_suggestions: number
    iron_achieved_on: string | null
    avatar?: Avatar
    /** 使用者用徽章組出來的稱號，會顯示在**別人的**排行榜上（新板溝通板 #48） */
    title?: string | null
}

/** 「免費用某個方案多久」的一筆權益（api.md 第 14 節） */
export interface Perk {
    id: number
    title: string
    source: 'beta-rank' | 'beta-iron' | 'promo' | 'referral' | 'admin'
    plan_tier: string
    months: number
    days: number
    status: 'waiting_launch' | 'scheduled' | 'active' | 'ended' | 'revoked'
    starts_on: string | null
    ends_on: string | null
}

// #region [P] 誰在大量使用（api.md 第 8 節，舊板溝通板 #47）
/** 提示，不是判決；也不會擋任何請求。每一種都有正當的解釋 */
export type UsageFlag = 'heavy_today' | 'burst' | 'new_and_heavy' | 'many_rejected';

export interface DeviceUsage {
    device_id: number
    name: string
    plan_tier: string
    tokens: number
    linked: boolean
    frozen: boolean
    frozen_at: string | null
    device_created_at: string
    /** 真的打了 Gemini 的次數；被額度或每日上限擋下來的算在 failed */
    requests: number
    today: number
    /** 模型判定「這不是可以記帳的東西」 */
    rejected: number
    failed: number
    peak_hour: number
    /** 台灣時間的那一個小時，例如 2026-09-20 14:00 */
    peak_hour_at: string | null
    active_days: number
    /** beta 期間是「原本會扣的」，實際沒扣 */
    quota_points: number
    /** 用價目表估的，不是 Google 的實際帳單 */
    cost_usd: number
    by_feature: Record<string, number>
    first_at: string | null
    last_at: string | null
    flags: UsageFlag[] | null
}
// #endregion

export interface DeviceDetailResponse {
    device: AdminDevice
    audit: AuditEntry[]
    perks?: Perk[]
    /** 現在實際的方案：訂閱與使用中的權益取高的 */
    plan?: { plan_tier: string, plan_source: 'subscription' | 'perk' | 'free' }
    referrals?: { pending: number, qualified: number }
    referral_code?: string
}

export interface DeviceListResponse {
    devices: AdminDevice[]
    total: number
    page: number
    per_page: number
}

export interface AuditEntry {
    actor: string
    action: string
    before: Record<string, unknown>
    after: Record<string, unknown>
    created_at: string
}

export interface DevicePatch {
    tokens?: number
    tokens_delta?: number
    plan_tier?: PlanTier
    beta_tester_since?: string | null
    frozen?: boolean
    /** 後台手動加的件數（寄信來的回報），0～1,000 */
    bonus_bugs?: number
    bonus_suggestions?: number
    /** **只能給 null**：清掉不當的暱稱。清掉的暱稱會留在操作紀錄裡 */
    nickname?: null
    /** 手動修正鐵人（打卡沒記到），或 null 取消 */
    iron_achieved_on?: string | null
    /** **只能給 null**：清掉不當的大頭貼，不能替使用者換 */
    avatar?: null
    /** **只能給 null**：清掉不當的稱號。操作紀錄會留下被清掉的字 */
    title?: null
}

export interface Dist { avg: number, p50: number, p90: number, p95: number, max: number }

export interface FeatureStats {
    feature: string
    requests: number
    ok: number
    rejected: number
    failed: number
    quota_exceeded: number
    daily_limited: number
    quota_waived: number
    unique_devices: number
    quota_charged: number
    gemini_calls: number
    hedge_rate: number
    prompt_tokens_per_request: Dist
    output_tokens_per_request: Dist
    cost_usd_per_request: Dist
    total_cost_usd: number
    latency_ms: Dist
    cost_usd_per_quota_point: number
}

/** 逐日（台灣時間）。沒有請求的日子不會出現，畫圖的那側自己補 0（usage-analytics.md 最後一節） */
export interface UsageDay {
    date: string
    requests: number
    ok: number
    rejected: number
    /** 含額度不足與撞到每日上限 */
    failed: number
    unique_devices: number
    cost_usd: number
    features: Record<string, { requests: number, ok: number, rejected: number, failed: number, cost_usd: number }>
}

export interface UsageReport {
    from: string
    to: string
    features: FeatureStats[]
    /** 2026-09-20 起才有；舊的回應沒有這個欄位 */
    daily?: UsageDay[]
    devices: {
        active_devices: number
        requests_per_device: Dist
        cost_usd_per_device: Dist
        quota_charged_per_device: Dist
        devices_hit_quota: number
        devices_hit_daily_limit: number
    }
    models: {
        model: string
        calls: number
        ok: number
        errors: number
        canceled: number
        prompt_tokens: number
        output_tokens: number
        thoughts_tokens: number
        cost_usd: number
        price_known: boolean
    }[]
    notes: string[] | null
}
// #endregion

// #region [P] beta 貢獻活動的回報（api.md 第 8 節「審回報」）
export type FeedbackStatus = 'pending' | 'accepted_bug' | 'accepted_suggestion' | 'rejected';
export type FeedbackFilter = 'all' | FeedbackStatus;
/** 回報的類型篩選（溝通板 #41）。crash 是 App 當掉後自動產生、使用者按了才送的 */
export type FeedbackKind = 'all' | 'bug' | 'suggestion' | 'crash';

export interface FeedbackReport {
    id: number
    device_id: number
    device_name: string
    /** crash = App 自動產生的閃退紀錄（溝通板 #39），使用者按了才送 */
    kind: 'bug' | 'suggestion' | 'crash'
    status: FeedbackStatus
    description: string
    app_version: string
    device_model: string
    android_version: string
    /** 截圖的 position，拿去組截圖網址 */
    screenshots: number[]
    reviewed_by: string | null
    reviewed_at: string | null
    /** 有值 = 內容已清除（描述是空的、沒有截圖） */
    content_purged_at: string | null
    created_at: string
    issue_id?: number | null
    /** 只有單則才有，可能 32 KB */
    log?: string
}

// #region [P] 優惠碼（api.md 第 8 節「優惠碼」，溝通板 #38）
/** 一組優惠碼。欄位名稱見下面的 normalize：後端換版期間新舊兩種命名都認 */
export interface PromoCode {
    code: string
    /** 空字串 = 這組碼不送方案時間，只送點數 */
    plan_tier: '' | 'lite' | 'pro'
    tokens: number
    months: number
    days: number
    /** null = 不限人數 */
    max_redemptions: number | null
    redeemed: number
    /** null = 沒有期限 */
    expires_at: string | null
    active: boolean
    note: string
    created_by: string
    created_at: string
}

export interface PromoRedemption {
    device_id: number
    device_name: string
    tokens: number
    perk_id: number | null
    created_at: string
}

/** 建立與修改共用。`max_redemptions`／`expires_at` 給 null 就是改回「不限」 */
export interface PromoPayload {
    /** 只有建立時能給；不給就由後端產生 10 碼 */
    code?: string
    plan_tier?: '' | 'lite' | 'pro'
    months?: number
    days?: number
    tokens?: number
    max_redemptions?: number | null
    expires_at?: string | null
    active?: boolean
    note?: string
}
// #endregion

export interface FeedbackStats {
    total: number
    by_status: Record<string, number>
    by_kind: Record<string, number>
    per_day: { date: string, count: number }[]
    participants: number
    /** 採計了、還沒歸到任何問題的件數，也就是合併的待辦數量 */
    accepted_without_issue: number
}

/** 後端這支回的是 Go 的欄位名（大寫開頭），照抄 */
export interface FeedbackIssue {
    id: number
    title: string
    weight: number
    note: string
    created_by: string
    created_at: string
    reports: number
    accepted: number
}
// #endregion

// #region [P] 欄位命名的換版（溝通板 #41）
// 後端原本把三個 model 直接丟進 c.JSON，欄位就是 Go 的 `Code`、`PlanTier`；
// 已經補上 json 標籤改成小寫底線，但那一版還沒部署。這裡兩種都認，換版就沒有空窗期。
// 線上換完之後，可以把 legacy 的那半刪掉，元件不用動。
type Raw = Record<string, unknown>;

/** 不能用 ??：`max_redemptions: null`（不限）會被當成沒有這個欄位 */
function field<T>(raw: Raw, lower: string, legacy: string, fallback: T): T {
    if (lower in raw) return raw[lower] as T;
    if (legacy in raw) return raw[legacy] as T;
    return fallback;
}

function normalizePromo(raw: Raw): PromoCode {
    return {
        code: field(raw, 'code', 'Code', ''),
        plan_tier: field(raw, 'plan_tier', 'PlanTier', '' as PromoCode['plan_tier']),
        tokens: field(raw, 'tokens', 'Tokens', 0),
        months: field(raw, 'months', 'Months', 0),
        days: field(raw, 'days', 'Days', 0),
        max_redemptions: field(raw, 'max_redemptions', 'MaxRedemptions', null),
        redeemed: field(raw, 'redeemed', 'Redeemed', 0),
        expires_at: field(raw, 'expires_at', 'ExpiresAt', null),
        active: field(raw, 'active', 'Active', true),
        note: field(raw, 'note', 'Note', ''),
        created_by: field(raw, 'created_by', 'CreatedBy', ''),
        created_at: field(raw, 'created_at', 'CreatedAt', '')
    };
}

function normalizeIssue(raw: Raw): FeedbackIssue {
    return {
        id: field(raw, 'id', 'ID', 0),
        title: field(raw, 'title', 'Title', ''),
        weight: field(raw, 'weight', 'Weight', 1),
        note: field(raw, 'note', 'Note', ''),
        created_by: field(raw, 'created_by', 'CreatedBy', ''),
        created_at: field(raw, 'created_at', 'CreatedAt', ''),
        reports: field(raw, 'reports', 'Reports', 0),
        accepted: field(raw, 'accepted', 'Accepted', 0)
    };
}
// #endregion

export class AdminApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }

    /** 後端的 401「登入已過期，請重新登入」：重新拿一次 ID token 就好 */
    get needsLogin() { return this.status === 401; }
}

/** 後端沒給 error 時，依狀態碼補一句看得懂的話 */
function fallbackMessage(status: number): string {
    switch (status) {
        case 401: return '登入已過期，請重新登入';
        case 403: return '這個 Google 帳號不在管理員名單上';
        case 404: return '找不到（後台 API 可能還沒部署）';
        case 429: return '操作太頻繁，請稍後再試';
        case 502: return '後端暫時連不上 Google 驗證登入，請稍後再試';
        default: return `伺服器錯誤（HTTP ${status}）`;
    }
}

/** 回傳圖片本身的端點（截圖）。錯誤處理跟 request 一樣，只是不解析 JSON */
async function blob(token: string, path: string): Promise<Blob> {
    let response: Response;
    try {
        response = await fetch(`${apiBase()}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    } catch {
        throw new AdminApiError(0, '連不上後端，請檢查網路');
    }
    if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new AdminApiError(response.status, (data && typeof data.error === 'string') ? data.error : fallbackMessage(response.status));
    }
    return response.blob();
}

async function request<T>(token: string, path: string, init: { method?: string, body?: unknown } = {}): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${apiBase()}${path}`, {
            method: init.method ?? 'GET',
            // 後台看到的必須是當下的狀態：不要讓瀏覽器拿快取回應（審完回來還看到舊的就會判錯）
            cache: 'no-store',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {})
            },
            body: init.body !== undefined ? JSON.stringify(init.body) : undefined
        });
    } catch {
        throw new AdminApiError(0, '連不上後端，請檢查網路');
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new AdminApiError(response.status, (data && typeof data.error === 'string') ? data.error : fallbackMessage(response.status));
    }
    return data as T;
}

/** 後端能設定的額度上限（api.md 第 8 節）：tokens 與加減之後的結果都要在 0～這個數 */
export const MAX_TOKENS = 1_000_000;

export const adminApi = {
    listDevices: (token: string, params: { q?: string, status?: DeviceStatus, page?: number, perPage?: number }) => {
        const q = params.q?.trim() ?? '';
        const status = params.status ?? 'all';
        const page = params.page ?? 1;
        const perPage = params.perPage ?? 50;

        // email 不能放在網址上：Cloud Run 的連線紀錄會記下完整網址、保存 30 天，
        // 處理刪除請求時，要清除的 email 反而會留在日誌裡。改放 body（api.md 第 8 節）
        if (q.includes('@')) {
            return request<DeviceListResponse>(token, '/v1/admin/devices/search', {
                method: 'POST',
                body: { q, status, page, per_page: perPage }
            });
        }

        const query = new URLSearchParams();
        if (q) query.set('q', q);
        if (status !== 'all') query.set('status', status);
        query.set('page', String(page));
        query.set('per_page', String(perPage));
        return request<DeviceListResponse>(token, `/v1/admin/devices?${query}`);
    },
    getDevice: (token: string, id: number) =>
        request<DeviceDetailResponse>(token, `/v1/admin/devices/${id}`),
    updateDevice: (token: string, id: number, patch: DevicePatch) =>
        request<{ device: AdminDevice }>(token, `/v1/admin/devices/${id}`, { method: 'PATCH', body: patch }),
    /**
     * 清除身分。`freeze` 決定強度（api.md 第 8 節，溝通板 #35）：
     * true = 連這台裝置都不要了，清資料並停用；false = 只是不想留著 email，App 繼續用
     */
    eraseIdentity: (token: string, id: number, freeze: boolean) =>
        request<{ device: AdminDevice }>(token, `/v1/admin/devices/${id}/erase-identity`, { method: 'POST', body: { freeze } }),
    usage: (token: string, days: number) =>
        request<UsageReport>(token, `/v1/admin/usage?days=${days}`),
    /** 逐台的用量，次數多的在前 */
    usageByDevice: (token: string, days: number) =>
        request<{ from: string, to: string, days: number, devices: DeviceUsage[] | null }>(token, `/v1/admin/usage/devices?days=${days}`),
    /** 後台看使用者上傳的大頭貼（使用者那支要裝置的 API key，後台拿不到）。沒上傳過回 404 */
    deviceAvatar: (token: string, id: number) =>
        blob(token, `/v1/admin/devices/${id}/avatar`),

    // #region [P] 審回報
    feedbackStats: (token: string) => request<FeedbackStats>(token, '/v1/admin/feedback/stats'),
    listFeedback: (token: string, params: { status?: FeedbackFilter, kind?: FeedbackKind, deviceId?: number, page?: number, perPage?: number }) => {
        const query = new URLSearchParams();
        if (params.status && params.status !== 'all') query.set('status', params.status);
        if (params.kind && params.kind !== 'all') query.set('kind', params.kind);
        if (params.deviceId) query.set('device_id', String(params.deviceId));
        query.set('page', String(params.page ?? 1));
        query.set('per_page', String(params.perPage ?? 50));
        return request<{ reports: FeedbackReport[], total: number, page: number, per_page: number }>(token, `/v1/admin/feedback?${query}`);
    },
    getFeedback: (token: string, id: number) => request<{ report: FeedbackReport }>(token, `/v1/admin/feedback/${id}`),
    /** 截圖要帶 Authorization，不能直接 <img src>；呼叫端自己轉 blob URL、用完 revoke */
    feedbackScreenshot: (token: string, id: number, position: number) =>
        blob(token, `/v1/admin/feedback/${id}/screenshots/${position}`),
    reviewFeedback: (token: string, id: number, patch: { status?: FeedbackStatus, issue_id?: number | null }) =>
        request<{ report: FeedbackReport }>(token, `/v1/admin/feedback/${id}`, { method: 'PATCH', body: patch }),
    /**
     * 一次審很多則（垃圾回報用，溝通板 #0053）。`report_ids` 與 `device_id` 擇一：
     * 依裝置的只動那台**還在待審**的、最多 200 則，已經採計的不會翻掉。
     * `report_ids` 有任何一個不存在就 404、整批不動。回實際改了幾則（狀態本來就一樣的不算）。
     * 凍結刻意不包在裡面，要另外用 updateDevice。
     */
    batchReviewFeedback: (token: string, body: ({ report_ids: number[] } | { device_id: number }) & { status: FeedbackStatus }) =>
        request<{ updated: number }>(token, '/v1/admin/feedback/batch', { method: 'POST', body }),

    listIssues: async (token: string) =>
        ((await request<{ issues: Raw[] | null }>(token, '/v1/admin/feedback/issues')).issues ?? []).map(normalizeIssue),
    /** 建立問題，可以同時把幾則回報掛上去——這就是「合併」。回傳新問題（含 id） */
    createIssue: async (token: string, body: { title: string, weight: number, note?: string, report_ids?: number[] }) =>
        normalizeIssue((await request<{ issue: Raw }>(token, '/v1/admin/feedback/issues', { method: 'POST', body })).issue),
    updateIssue: (token: string, id: number, body: { title?: string, weight?: number, note?: string }) =>
        request<unknown>(token, `/v1/admin/feedback/issues/${id}`, { method: 'PATCH', body }),
    addReportsToIssue: (token: string, id: number, reportIds: number[]) =>
        request<unknown>(token, `/v1/admin/feedback/issues/${id}/reports`, { method: 'POST', body: { report_ids: reportIds } }),
    // #endregion

    // #region [P] 優惠碼
    listPromoCodes: async (token: string) =>
        (await request<{ promo_codes: Raw[] }>(token, '/v1/admin/promo-codes')).promo_codes.map(normalizePromo),
    /** 單一組，附誰兌換過（最多 200 筆，新的在前） */
    getPromoCode: async (token: string, code: string) => {
        const result = await request<{ promo_code: Raw, redemptions: PromoRedemption[] }>(token, `/v1/admin/promo-codes/${encodeURIComponent(code)}`);
        return { promo_code: normalizePromo(result.promo_code), redemptions: result.redemptions };
    },
    createPromoCode: async (token: string, body: PromoPayload) =>
        normalizePromo((await request<{ promo_code: Raw }>(token, '/v1/admin/promo-codes', { method: 'POST', body })).promo_code),
    /** code 不能改，所以 body 裡不要帶 */
    updatePromoCode: async (token: string, code: string, body: PromoPayload) =>
        normalizePromo((await request<{ promo_code: Raw }>(token, `/v1/admin/promo-codes/${encodeURIComponent(code)}`, { method: 'PATCH', body })).promo_code)
    // #endregion
};
