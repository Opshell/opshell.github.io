// 後台的管理 API（/v1/admin/*）。規格以 DinDon_BackEnd/docs/api.md 第 8 節為準，這裡只是照著接。
// 權限全部由後端把關：這個頁面是公開的靜態網頁，這裡沒有、也不能有任何祕密。

const PRODUCTION_API = 'https://dindon-backend-851099261403.asia-southeast1.run.app';

/** 本機開發時可以用 ?api=http://localhost:8090 改接本機後端；正式網站一律打正式後端 */
function apiBase(): string {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        const override = new URLSearchParams(window.location.search).get('api');
        if (override) return override.replace(/\/$/, '');
    }
    return PRODUCTION_API;
}

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

async function request<T>(token: string, path: string, init: { method?: string, body?: unknown } = {}): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${apiBase()}${path}`, {
            method: init.method ?? 'GET',
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
    eraseIdentity: (token: string, id: number) =>
        request<{ device: AdminDevice }>(token, `/v1/admin/devices/${id}/erase-identity`, { method: 'POST' }),
    usage: (token: string, days: number) =>
        request<UsageReport>(token, `/v1/admin/usage?days=${days}`)
};
