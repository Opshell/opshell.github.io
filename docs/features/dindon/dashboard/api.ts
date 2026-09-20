// 後台的管理 API（/v1/admin/*）。規格以 DinDon_BackEnd/docs/api.md 第 8 節為準，這裡只是照著接。
// 權限全部由後端把關：這個頁面是公開的靜態網頁，這裡沒有、也不能有任何祕密。

import { apiBase } from '../apiBase';

// #region [P] 型別（對應 api.md 第 8 節的「裝置物件」與用量報表）
export type PlanTier = 'free' | 'pro';
export type DeviceStatus = 'all' | 'active' | 'frozen';

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
/**
 * 一組優惠碼。欄位是大寫開頭的——後端直接把 GORM 的 struct 丟出來，沒有加 json 標籤，
 * 所以線上回的就是 `Code`、`PlanTier` 這些名字。這裡照抄，不自己改名。
 */
export interface PromoCode {
    Code: string
    /** 空字串 = 這組碼不送方案時間，只送點數 */
    PlanTier: '' | 'lite' | 'pro'
    Tokens: number
    Months: number
    Days: number
    /** null = 不限人數 */
    MaxRedemptions: number | null
    Redeemed: number
    /** null = 沒有期限 */
    ExpiresAt: string | null
    Active: boolean
    Note: string
    CreatedBy: string
    CreatedAt: string
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
    ID: number
    Title: string
    Weight: number
    Note: string
    CreatedBy: string
    CreatedAt: string
    reports: number
    accepted: number
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
        request<{ device: AdminDevice, audit: AuditEntry[] }>(token, `/v1/admin/devices/${id}`),
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

    // #region [P] 審回報
    feedbackStats: (token: string) => request<FeedbackStats>(token, '/v1/admin/feedback/stats'),
    listFeedback: (token: string, params: { status?: FeedbackFilter, deviceId?: number, page?: number, perPage?: number }) => {
        const query = new URLSearchParams();
        if (params.status && params.status !== 'all') query.set('status', params.status);
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

    listIssues: (token: string) => request<{ issues: FeedbackIssue[] }>(token, '/v1/admin/feedback/issues'),
    createIssue: (token: string, body: { title: string, weight: number, note?: string, report_ids?: number[] }) =>
        request<unknown>(token, '/v1/admin/feedback/issues', { method: 'POST', body }),
    updateIssue: (token: string, id: number, body: { title?: string, weight?: number, note?: string }) =>
        request<unknown>(token, `/v1/admin/feedback/issues/${id}`, { method: 'PATCH', body }),
    addReportsToIssue: (token: string, id: number, reportIds: number[]) =>
        request<unknown>(token, `/v1/admin/feedback/issues/${id}/reports`, { method: 'POST', body: { report_ids: reportIds } }),
    // #endregion

    // #region [P] 優惠碼
    listPromoCodes: (token: string) => request<{ promo_codes: PromoCode[] }>(token, '/v1/admin/promo-codes'),
    /** 單一組，附誰兌換過（最多 200 筆，新的在前） */
    getPromoCode: (token: string, code: string) =>
        request<{ promo_code: PromoCode, redemptions: PromoRedemption[] }>(token, `/v1/admin/promo-codes/${encodeURIComponent(code)}`),
    createPromoCode: (token: string, body: PromoPayload) =>
        request<{ promo_code: PromoCode }>(token, '/v1/admin/promo-codes', { method: 'POST', body }),
    /** code 不能改，所以 body 裡不要帶 */
    updatePromoCode: (token: string, code: string, body: PromoPayload) =>
        request<{ promo_code: PromoCode }>(token, `/v1/admin/promo-codes/${encodeURIComponent(code)}`, { method: 'PATCH', body })
    // #endregion
};
