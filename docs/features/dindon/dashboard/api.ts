// 後台的管理 API（/v1/admin/*）。規格以 DinDon_BackEnd/docs/api.md 第 8 節為準，這裡只是照著接。
// 權限全部由後端把關：這個頁面是公開的靜態網頁，這裡沒有、也不能有任何祕密。
// 回應一律經過 schemas/admin.schema.ts 的 Parser（前端開發規範五章）：元件拿到的是驗證過、camelCase 的資料；
// 後端回的格式對不上就丟 ApiSchemaError，錯誤訊息會指出是哪支 API、哪個欄位。

import type { z } from 'zod';
import type { BatchReviewFeedbackInput, CreateFeedbackIssueInput, ReviewFeedbackInput, SavePromoCodeInput, UpdateDeviceInput, UpdateFeedbackIssueInput } from './schemas/admin.schema';
import { parseResponse } from '@shared/utils/zod';
import { apiBase } from '../apiBase';
import {
    BatchReviewFeedbackParser,
    BatchReviewFeedbackPayload,
    CreateFeedbackIssueParser,
    CreateFeedbackIssuePayload,
    GetDeviceDetailParser,
    GetDeviceListParser,
    GetFeedbackIssueListParser,
    GetFeedbackListParser,
    GetFeedbackParser,
    GetFeedbackStatsParser,
    GetPromoCodeListParser,
    GetPromoCodeParser,
    GetUsageByDeviceParser,
    GetUsageReportParser,
    ReviewFeedbackPayload,
    SavePromoCodeParser,
    SavePromoCodePayload,
    UpdateDeviceParser,
    UpdateDevicePayload,
    UpdateFeedbackIssuePayload
} from './schemas/admin.schema';

// #region [P] 查詢條件（送出用的參數，不是 API 的資料）
export type DeviceStatus = 'all' | 'active' | 'frozen';
export type FeedbackFilter = 'all' | 'pending' | 'accepted_bug' | 'accepted_suggestion' | 'rejected';
/** 回報的類型篩選（溝通板 #41）。crash 是 App 當掉後自動產生、使用者按了才送的 */
export type FeedbackKind = 'all' | 'bug' | 'suggestion' | 'crash';
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

async function request(token: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<unknown> {
    let response: Response;
    try {
        response = await fetch(`${apiBase()}${path}`, {
            method: init.method ?? 'GET',
            // 後台看到的必須是當下的狀態：不要讓瀏覽器拿快取回應（審完回來還看到舊的就會判錯）
            cache: 'no-store',
            headers: {
                Authorization: `Bearer ${token}`,
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
    return data;
}

/** 呼叫 API 並用 Parser 解析回應；端點名稱放進錯誤訊息，格式對不上時知道是哪一支 */
async function call<T extends z.ZodType>(parser: T, token: string, method: string, path: string, body?: unknown): Promise<z.output<T>> {
    const data = await request(token, path, { method, body });
    return parseResponse(parser, data, `${method} ${path.split('?')[0]}`);
}

/** 後端能設定的額度上限（api.md 第 8 節）：tokens 與加減之後的結果都要在 0～這個數 */
export const MAX_TOKENS = 1_000_000;

export const adminApi = {
    listDevices: async (token: string, params: { q?: string; status?: DeviceStatus; page?: number; perPage?: number }) => {
        const q = params.q?.trim() ?? '';
        const status = params.status ?? 'all';
        const page = params.page ?? 1;
        const perPage = params.perPage ?? 50;

        // email 不能放在網址上：Cloud Run 的連線紀錄會記下完整網址、保存 30 天，
        // 處理刪除請求時，要清除的 email 反而會留在日誌裡。改放 body（api.md 第 8 節）
        if (q.includes('@')) {
            return call(GetDeviceListParser, token, 'POST', '/v1/admin/devices/search', { q, status, page, per_page: perPage });
        }

        const query = new URLSearchParams();
        if (q) query.set('q', q);
        if (status !== 'all') query.set('status', status);
        query.set('page', String(page));
        query.set('per_page', String(perPage));
        return call(GetDeviceListParser, token, 'GET', `/v1/admin/devices?${query}`);
    },
    getDevice: async (token: string, id: number) =>
        call(GetDeviceDetailParser, token, 'GET', `/v1/admin/devices/${id}`),
    updateDevice: async (token: string, id: number, patch: UpdateDeviceInput) =>
        call(UpdateDeviceParser, token, 'PATCH', `/v1/admin/devices/${id}`, UpdateDevicePayload.parse(patch)),
    /**
     * 清除身分。`freeze` 決定強度（api.md 第 8 節，溝通板 #35）：
     * true = 連這台裝置都不要了，清資料並停用；false = 只是不想留著 email，App 繼續用
     */
    eraseIdentity: async (token: string, id: number, freeze: boolean) =>
        call(UpdateDeviceParser, token, 'POST', `/v1/admin/devices/${id}/erase-identity`, { freeze }),
    usage: async (token: string, days: number) =>
        call(GetUsageReportParser, token, 'GET', `/v1/admin/usage?days=${days}`),
    /** 逐台的用量，次數多的在前 */
    usageByDevice: async (token: string, days: number) =>
        call(GetUsageByDeviceParser, token, 'GET', `/v1/admin/usage/devices?days=${days}`),
    /** 後台看使用者上傳的大頭貼（使用者那支要裝置的 API key，後台拿不到）。沒上傳過回 404 */
    deviceAvatar: async (token: string, id: number) =>
        blob(token, `/v1/admin/devices/${id}/avatar`),

    // #region [P] 審回報
    feedbackStats: async (token: string) => call(GetFeedbackStatsParser, token, 'GET', '/v1/admin/feedback/stats'),
    listFeedback: async (token: string, params: { status?: FeedbackFilter; kind?: FeedbackKind; deviceId?: number; page?: number; perPage?: number }) => {
        const query = new URLSearchParams();
        if (params.status && params.status !== 'all') query.set('status', params.status);
        if (params.kind && params.kind !== 'all') query.set('kind', params.kind);
        if (params.deviceId) query.set('device_id', String(params.deviceId));
        query.set('page', String(params.page ?? 1));
        query.set('per_page', String(params.perPage ?? 50));
        return call(GetFeedbackListParser, token, 'GET', `/v1/admin/feedback?${query}`);
    },
    getFeedback: async (token: string, id: number) => call(GetFeedbackParser, token, 'GET', `/v1/admin/feedback/${id}`),
    /** 截圖要帶 Authorization，不能直接 <img src>；呼叫端自己轉 blob URL、用完 revoke */
    feedbackScreenshot: async (token: string, id: number, position: number) =>
        blob(token, `/v1/admin/feedback/${id}/screenshots/${position}`),
    reviewFeedback: async (token: string, id: number, patch: ReviewFeedbackInput) =>
        call(GetFeedbackParser, token, 'PATCH', `/v1/admin/feedback/${id}`, ReviewFeedbackPayload.parse(patch)),
    /**
     * 一次審很多則（垃圾回報用，溝通板 #0053）。`reportIds` 與 `deviceId` 擇一：
     * 依裝置的只動那台**還在待審**的、最多 200 則，已經採計的不會翻掉。
     * `reportIds` 有任何一個不存在就 404、整批不動。回實際改了幾則（狀態本來就一樣的不算）。
     * 凍結刻意不包在裡面，要另外用 updateDevice。
     */
    batchReviewFeedback: async (token: string, body: BatchReviewFeedbackInput) =>
        call(BatchReviewFeedbackParser, token, 'POST', '/v1/admin/feedback/batch', BatchReviewFeedbackPayload.parse(body)),

    listIssues: async (token: string) => call(GetFeedbackIssueListParser, token, 'GET', '/v1/admin/feedback/issues'),
    /** 建立問題，可以同時把幾則回報掛上去——這就是「合併」。回傳新問題（含 id） */
    createIssue: async (token: string, body: CreateFeedbackIssueInput) =>
        call(CreateFeedbackIssueParser, token, 'POST', '/v1/admin/feedback/issues', CreateFeedbackIssuePayload.parse(body)),
    // 這兩支的回應元件用不到，不解析
    updateIssue: async (token: string, id: number, body: UpdateFeedbackIssueInput) =>
        request(token, `/v1/admin/feedback/issues/${id}`, { method: 'PATCH', body: UpdateFeedbackIssuePayload.parse(body) }),
    addReportsToIssue: async (token: string, id: number, reportIds: number[]) =>
        request(token, `/v1/admin/feedback/issues/${id}/reports`, { method: 'POST', body: { report_ids: reportIds } }),
    // #endregion

    // #region [P] 優惠碼
    listPromoCodes: async (token: string) => call(GetPromoCodeListParser, token, 'GET', '/v1/admin/promo-codes'),
    /** 單一組，附誰兌換過（最多 200 筆，新的在前） */
    getPromoCode: async (token: string, code: string) =>
        call(GetPromoCodeParser, token, 'GET', `/v1/admin/promo-codes/${encodeURIComponent(code)}`),
    createPromoCode: async (token: string, body: SavePromoCodeInput) =>
        call(SavePromoCodeParser, token, 'POST', '/v1/admin/promo-codes', SavePromoCodePayload.parse(body)),
    /** code 不能改，所以 body 裡不要帶 */
    updatePromoCode: async (token: string, code: string, body: SavePromoCodeInput) =>
        call(SavePromoCodeParser, token, 'PATCH', `/v1/admin/promo-codes/${encodeURIComponent(code)}`, SavePromoCodePayload.parse(body))
    // #endregion
};
