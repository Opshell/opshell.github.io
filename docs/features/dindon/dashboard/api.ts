// 後台的管理 API（/v1/admin/*）。規格以 DinDon_BackEnd/docs/api.md 第 8 節為準，這裡只是照著接。
// 權限全部由後端把關：這個頁面是公開的靜態網頁，這裡沒有、也不能有任何祕密。
// 回應一律經過 schemas/admin.schema.ts 的 Parser（前端開發規範五章）：元件拿到的是驗證過、camelCase 的資料；
// 後端回的格式對不上就丟 ApiSchemaError，錯誤訊息會指出是哪支 API、哪個欄位。

import type { z } from 'zod';
import type { AdminDevice, BatchReviewFeedbackInput, ChangeCheckinsInput, CreateFeedbackInput, CreateFeedbackIssueInput, ReviewFeedbackInput, SaveAnnouncementInput, SaveAppConfigInput, SaveFeatureCandidateInput, SavePromoCodeInput, TriageFeedbackInput, UpdateDeviceInput, UpdateFeedbackIssueInput } from './schemas/admin.schema';
import { parseResponse } from '@shared/utils/zod';
import { apiBase } from '../apiBase';
import { GetApiCatalogParser } from './console/catalog.schema';
import {
    ActiveDevicesParser,
    AppConfigParser,
    AppVersionsParser,
    BatchReviewFeedbackParser,
    BatchReviewFeedbackPayload,
    ChangeCheckinsPayload,
    CreateFeedbackIssueParser,
    CreateFeedbackIssuePayload,
    CreateFeedbackParser,
    CreateFeedbackPayload,
    GetAnnouncementListParser,
    GetDeviceCheckinsParser,
    GetDeviceDetailParser,
    GetDeviceListParser,
    GetFeatureCandidateListParser,
    GetFeedbackIssueListParser,
    GetFeedbackListParser,
    GetFeedbackParser,
    GetFeedbackStatsParser,
    GetPromoCodeListParser,
    GetPromoCodeParser,
    GetUsageByDeviceParser,
    GetUsageReportParser,
    ReviewFeedbackPayload,
    SaveAnnouncementParser,
    SaveAnnouncementPayload,
    SaveAppConfigPayload,
    SaveFeatureCandidateParser,
    SaveFeatureCandidatePayload,
    SavePromoCodeParser,
    SavePromoCodePayload,
    TestDeviceKeyParser,
    TriageFeedbackParser,
    TriageFeedbackPayload,
    UpdateDeviceParser,
    UpdateDevicePayload,
    UpdateFeedbackIssuePayload
} from './schemas/admin.schema';

// #region [P] 查詢條件（送出用的參數，不是 API 的資料）
export type DeviceStatus = 'all' | 'active' | 'frozen';
/** id：新的在前；last_checkin：最近打開 App 的在前，從沒打開過的最後（#0081） */
export type DeviceSort = 'id' | 'last_checkin';
export type FeedbackFilter = 'all' | 'pending' | 'accepted_bug' | 'accepted_suggestion' | 'rejected';
/** 回報的類型篩選（溝通板 #41）。crash 是 App 當掉後自動產生、使用者按了才送的 */
export type FeedbackKind = 'all' | 'bug' | 'suggestion' | 'crash';
/** 回報來源篩選（#0068）：app 是 App 送的，line／email 是後台建的 */
export type FeedbackSourceFilter = 'all' | 'app' | 'line' | 'email';
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

/** 抓全部裝置時一頁幾台、最多幾頁。beta 限額 100 人加上測試裝置，2,000 台綽綽有餘；超過就只拿最新的 2,000 台 */
export const ALL_DEVICES_PER_PAGE = 100;
export const ALL_DEVICES_MAX_PAGES = 20;

/** 後端能設定的額度上限（api.md 第 8 節）：tokens 與加減之後的結果都要在 0～這個數 */
export const MAX_TOKENS = 1_000_000;

export const adminApi = {
    /** 建一台測試裝置（#0074）。後端沒有刪除，要重用：一個管理員建一台就好 */
    createTestDevice: async (token: string, adminNote = 'API 控制台用') =>
        call(TestDeviceKeyParser, token, 'POST', '/v1/admin/test-devices', { admin_note: adminNote }),
    /** 換一把新 key，舊的立刻失效。只准測試裝置（一般裝置 409） */
    rotateTestDeviceKey: async (token: string, id: number) =>
        call(TestDeviceKeyParser, token, 'POST', `/v1/admin/devices/${id}/api-key`),
    /** API 控制台的目錄（#0074）：說明在私有倉庫，登入後才向後端拿 */
    getApiCatalog: async (token: string) => call(GetApiCatalogParser, token, 'GET', '/v1/admin/api-catalog'),
    /** 全部裝置（總覽算數字、LINE 匯入選人）。後端沒有「全部」的端點，一頁一頁抓 */
    listAllDevices: async (token: string) => {
        const devices: AdminDevice[] = [];
        let total = 0;
        for (let page = 1; page <= ALL_DEVICES_MAX_PAGES; page++) {
            const result = await adminApi.listDevices(token, { page, perPage: ALL_DEVICES_PER_PAGE });
            devices.push(...result.devices);
            total = result.total;
            if (devices.length >= total || result.devices.length === 0) break;
        }
        return { devices, total };
    },
    /** idleDays：只列最後一次打開 App 是 N 天前或更早的（含從沒打開過的）；0＝不篩 */
    listDevices: async (token: string, params: { q?: string; status?: DeviceStatus; page?: number; perPage?: number; sort?: DeviceSort; idleDays?: number }) => {
        const q = params.q?.trim() ?? '';
        const status = params.status ?? 'all';
        const page = params.page ?? 1;
        const perPage = params.perPage ?? 50;
        const sort = params.sort ?? 'id';
        const idleDays = params.idleDays ?? 0;

        // email 不能放在網址上：Cloud Run 的連線紀錄會記下完整網址、保存 30 天，
        // 處理刪除請求時，要清除的 email 反而會留在日誌裡。改放 body（api.md 第 8 節）
        if (q.includes('@')) {
            return call(GetDeviceListParser, token, 'POST', '/v1/admin/devices/search', { q, status, page, per_page: perPage, sort, idle_days: idleDays });
        }

        const query = new URLSearchParams();
        if (q) query.set('q', q);
        if (status !== 'all') query.set('status', status);
        query.set('page', String(page));
        query.set('per_page', String(perPage));
        if (sort !== 'id') query.set('sort', sort);
        if (idleDays > 0) query.set('idle_days', String(idleDays));
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
    /** 打開 App 的紀錄（每天的打卡與來源，#0067） */
    deviceCheckins: async (token: string, id: number) =>
        call(GetDeviceCheckinsParser, token, 'GET', `/v1/admin/devices/${id}/checkins`),
    /** 給打卡：來源記成 admin，**算進獎勵 */
    grantCheckins: async (token: string, id: number, body: ChangeCheckinsInput) =>
        call(GetDeviceCheckinsParser, token, 'POST', `/v1/admin/devices/${id}/checkins/grant`, ChangeCheckinsPayload.parse(body)),
    /** 收回打卡（不管來源）；已經達成的鐵人不會跟著收回 */
    revokeCheckins: async (token: string, id: number, body: ChangeCheckinsInput) =>
        call(GetDeviceCheckinsParser, token, 'POST', `/v1/admin/devices/${id}/checkins/revoke`, ChangeCheckinsPayload.parse(body)),
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
    listFeedback: async (token: string, params: { status?: FeedbackFilter; kind?: FeedbackKind; source?: FeedbackSourceFilter; deviceId?: number; page?: number; perPage?: number }) => {
        const query = new URLSearchParams();
        if (params.status && params.status !== 'all') query.set('status', params.status);
        if (params.kind && params.kind !== 'all') query.set('kind', params.kind);
        if (params.source && params.source !== 'all') query.set('source', params.source);
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

    /** AI 整理 LINE 的對話與截圖，不寫入任何東西。一次約 4 秒，最多等 25 秒 */
    triageFeedback: async (token: string, body: TriageFeedbackInput) =>
        call(TriageFeedbackParser, token, 'POST', '/v1/admin/feedback/triage', TriageFeedbackPayload.parse(body)),
    /** 替使用者建一則回報（來源 line／email），跟 App 送的一樣審、合併、計分 */
    createFeedback: async (token: string, body: CreateFeedbackInput) =>
        call(CreateFeedbackParser, token, 'POST', '/v1/admin/feedback', CreateFeedbackPayload.parse(body)),
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
        call(SavePromoCodeParser, token, 'PATCH', `/v1/admin/promo-codes/${encodeURIComponent(code)}`, SavePromoCodePayload.parse(body)),
    // #endregion

    // #region [P] 新功能投票的候選（沒有刪除：不要了就改成「不做了」）
    listFeatureCandidates: async (token: string) => call(GetFeatureCandidateListParser, token, 'GET', '/v1/admin/features'),
    createFeatureCandidate: async (token: string, body: SaveFeatureCandidateInput) =>
        call(SaveFeatureCandidateParser, token, 'POST', '/v1/admin/features', SaveFeatureCandidatePayload.parse(body)),
    /** 從「投票中」改成別的狀態，投的人那一票會還給他（票數留著） */
    updateFeatureCandidate: async (token: string, id: number, body: SaveFeatureCandidateInput) =>
        call(SaveFeatureCandidateParser, token, 'PATCH', `/v1/admin/features/${id}`, SaveFeatureCandidatePayload.parse(body)),
    // #endregion

    // #region [P] 有沒有在用、App 版本、重要公告（#0076、#0080、#0081）
    /** 近 1／7／30 天有打開 App 的裝置數（不含測試與凍結的） */
    activeDevices: async (token: string) => call(ActiveDevicesParser, token, 'GET', '/v1/admin/active-devices'),
    appVersions: async (token: string, days: number) => call(AppVersionsParser, token, 'GET', `/v1/admin/app-versions?days=${days}`),
    getAppConfig: async (token: string) => call(AppConfigParser, token, 'GET', '/v1/admin/app-config'),
    /** 整個換掉。調高最低版本會讓舊版除了 /v1/me 全部 426：畫面上一定要先確認 */
    saveAppConfig: async (token: string, body: SaveAppConfigInput) =>
        call(AppConfigParser, token, 'PUT', '/v1/admin/app-config', SaveAppConfigPayload.parse(body)),
    listAnnouncements: async (token: string) => call(GetAnnouncementListParser, token, 'GET', '/v1/admin/announcements'),
    createAnnouncement: async (token: string, body: SaveAnnouncementInput) =>
        call(SaveAnnouncementParser, token, 'POST', '/v1/admin/announcements', SaveAnnouncementPayload.parse(body)),
    /** 只改有給的欄位；{ withdrawn: true } 下架、false 重新上架。不能刪 */
    updateAnnouncement: async (token: string, id: number, body: SaveAnnouncementInput) =>
        call(SaveAnnouncementParser, token, 'PATCH', `/v1/admin/announcements/${id}`, SaveAnnouncementPayload.parse(body))
    // #endregion
};
