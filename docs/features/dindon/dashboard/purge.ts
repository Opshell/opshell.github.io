import type { PurgeConflict, PurgeEventResult } from './schemas/admin.schema';
import { AdminApiError } from './api';
import { PurgeConflictParser } from './schemas/admin.schema';

// 「清回報內容」（api.md 第 8 節 event/purge，Flowsker #770）的純邏輯。畫面在 components/FeedbackPurge.vue。
// 後端才是真正的把關（日期格式、未來日期、待審、拓荒季），這裡先擋一遍、把 409 拆成畫面用得上的樣子。

/** 管理員要打的字，跟後端的 confirm 一樣 */
export const PURGE_WORD = 'PURGE';

/** 台灣時間的今天 YYYY-MM-DD。before 最多到今天（後端 usage.StartOfToday 也是台灣時間） */
export function taipeiToday(now = new Date()): string {
    // en-CA 的日期格式剛好是 YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** before 的檢查：空的可以（只清 beta 截止前的）；有填就要是日期、不能是未來 */
export function purgeBeforeError(before: string, now = new Date()): string {
    if (!before) return '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(before) || Number.isNaN(Date.parse(`${before}T00:00:00+08:00`))) return '日期要是 YYYY-MM-DD';
    // 同格式的字串直接比大小就是日期先後
    if (before > taipeiToday(now)) return `不能選未來的日期，最多到今天（${taipeiToday(now)}）`;
    return '';
}

/** 「這次會清哪些」的白話說明，送出前與確認時都顯示 */
export function purgeScopeText(before: string): string {
    if (!before) return '只清 beta 截止之前送出的回報；拓荒季（截止之後）的回報不動';
    return `清 ${before} 00:00（台灣時間）之前送出的全部回報：含 beta、拓荒季、之後一般的，也含沒綁裝置的匯入回報`;
}

export interface PurgeConflictView extends PurgeConflict {
    /** 帶 force 能不能放行：待審的、拓荒季還沒結束的可以；活動還開著的不行（要先改後端的 EVENT_ACTIVE） */
    forceable: boolean;
}

/**
 * 409 → 畫面要的樣子；不是 409 回 null（照一般錯誤顯示）。
 * 待審的有 pending 欄位可以認；拓荒季那種只有一句話，後端在句子裡寫了「帶 "force": true」，只能認這幾個字。
 * 活動還開著的那句沒有提 force，force 也放不過去
 */
export function purgeConflict(error: unknown): PurgeConflictView | null {
    if (!(error instanceof AdminApiError) || error.status !== 409) return null;
    const parsed = PurgeConflictParser.safeParse(error.data);
    const conflict: PurgeConflict = parsed.success ? parsed.data : { error: error.message, pending: null, pendingCrash: null };
    return { ...conflict, forceable: conflict.pending !== null || conflict.error.includes('force') };
}

/** 200 的件數，照後端欄位一一列出（重複執行全是 0，也照樣列，才看得出「這次沒東西可清」） */
export function purgeResultRows(result: PurgeEventResult): { label: string; value: number }[] {
    return [
        { label: '清了內容的回報', value: result.reportsPurged },
        { label: '其中當時還在待審', value: result.pendingPurged },
        { label: '回報的截圖', value: result.screenshotsDeleted },
        { label: '訊息附的截圖', value: result.messageImagesDeleted },
        { label: 'App 裡的來往訊息', value: result.messagesDeleted },
        { label: '信件（寄出與收到的）', value: result.emailsDeleted }
    ];
}
