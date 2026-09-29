import { z } from 'zod';

// 控制台的送出紀錄。
//
// 後台和部落格同一個網域，localStorage 部落格頁面上的腳本也讀得到，所以**只記不含個資的部分**：
// 端點、路徑與 query 參數（多半是 id）、狀態碼、時間。body 與回應只留在這個分頁的記憶體裡
// （搜尋 email、LINE 匯入的內容、回應裡的使用者資料都在那裡面）。

export const HISTORY_KEY = 'dd-admin-api-history';
export const HISTORY_MAX = 50;

export const HistoryEntrySchema = z.object({
    id: z.string(),
    /** 目錄裡的端點 id；自訂請求是空字串 */
    endpointId: z.string(),
    method: z.string(),
    /** 送出去的路徑與 query（不含網域） */
    path: z.string(),
    pathValues: z.record(z.string(), z.string()),
    queryValues: z.record(z.string(), z.string()),
    status: z.number(),
    ms: z.number(),
    at: z.string()
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export function loadHistory(): HistoryEntry[] {
    try {
        const parsed = z.array(HistoryEntrySchema).safeParse(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'));
        return parsed.success ? parsed.data : [];
    } catch {
        return [];
    }
}

export function saveHistory(entries: HistoryEntry[]) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    } catch {
        // 無痕模式或儲存空間被關：紀錄只是方便，存不了就算了
    }
}

/** 新的放最前面，最多留 HISTORY_MAX 筆 */
export const pushHistory = (entries: HistoryEntry[], entry: HistoryEntry) => [entry, ...entries].slice(0, HISTORY_MAX);

/** 這個分頁送過的 body，重送時填回去；不寫進 localStorage（見檔案開頭） */
export const sessionBodies = new Map<string, string>();

/** 管理 API 的限流是每個 IP 每分鐘 30 次（api.md 第 8 節）。記這個分頁送了幾次，快到了先提醒 */
const adminCalls: number[] = [];
export const ADMIN_RATE_LIMIT = 30;

export function recordAdminCall(now = Date.now()) {
    adminCalls.push(now);
}

export function adminCallsInLastMinute(now = Date.now()): number {
    while (adminCalls.length && now - adminCalls[0] > 60_000) adminCalls.shift();
    return adminCalls.length;
}
