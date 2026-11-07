import type { FeedbackChannel, FeedbackEmail, FeedbackMessage, FeedbackMessageStatus, FeedbackReport } from './schemas/admin.schema';
import { reactive } from 'vue';
import { FEEDBACK_EMAIL_SUBJECT_MAX, FEEDBACK_MESSAGE_BODY_MAX } from './schemas/admin.schema';

// 回報詳情裡「來往訊息」的純邏輯（api.md 第 8 節「回報的來往訊息」「寄信回覆回報者」，Flowsker #600、#457）。
// 一則回報一條串：App 裡的回覆與信件照時間排在一起，回覆時選一個管道送。

export const CHANNEL_LABELS: Record<FeedbackChannel, string> = { app: 'App', email: 'Email' };

export const STATUS_LABELS: Record<FeedbackMessageStatus, string> = {
    sending: '寄送中',
    sent: '已送達',
    failed: '寄失敗',
    received: '收到'
};

export interface ReplyDraft {
    channel: FeedbackChannel;
    subject: string;
    body: string;
    /** 空字串是還沒送過。送過、內容沒改才沿用，後端靠它分辨「重送」與「另一則」 */
    draftId: string;
    /** 這個 draftId 是在哪個管道送過的：換了管道，按鈕就不該寫「再試一次」 */
    triedChannel: FeedbackChannel | null;
}

export interface ReplyTemplate {
    label: string;
    body: (report: Pick<FeedbackReport, 'fixedIn'>, channel: FeedbackChannel) => string;
}

/** 回覆多半是這幾種，點了再改：不預設送出，每則還是管理員看過才送 */
export const REPLY_TEMPLATES: ReplyTemplate[] = [
    { label: '收到了', body: () => '謝謝你的回報！我們收到了，會儘快看過。' },
    { label: '問細節', body: () => '謝謝你的回報！想再請問幾件事，方便我們重現問題：\n\n1. 當時在哪個畫面、按了什麼？\n2. 這個狀況每次都會發生嗎？' },
    {
        label: '修好了',
        // 寄信的人在信箱裡讀，叫他「回覆這封信」；App 裡的直接在同一則回報底下回
        body: (report, channel) => `這個問題修好了，會在 ${report.fixedIn ? `${report.fixedIn} 版` : '下一版'}更新。更新之後如果還是不對，${channel === 'email' ? '直接回覆這封信' : '直接在這則回報底下回覆'}跟我們說。謝謝你的回報！`
    },
    { label: '收下建議', body: () => '謝謝你的建議！我們記下來了，之後規劃新功能時會一起考慮。' }
];

/** 已經打了字就接在後面：蓋掉會弄丟管理員打的內容 */
export function applyTemplate(body: string, text: string): string {
    const current = body.trimEnd();
    return current ? `${current}\n\n${text}` : text;
}

/** 照後端的順序與上限；字數要算字元，表情符號在 JS 的 length 是 2。主旨只有寄信才看 */
export function replyDraftProblem(channel: FeedbackChannel, subject: string, body: string): string {
    if (!body.trim()) return '還沒寫內容';
    if ([...body.trim()].length > FEEDBACK_MESSAGE_BODY_MAX) return `內容最多 ${FEEDBACK_MESSAGE_BODY_MAX.toLocaleString()} 字`;
    if (channel === 'app') return '';
    if ([...subject.trim()].length > FEEDBACK_EMAIL_SUBJECT_MAX) return `主旨最多 ${FEEDBACK_EMAIL_SUBJECT_MAX} 字`;
    if (/[\r\n]/.test(subject.trim())) return '主旨不能換行';
    return '';
}

/** 預設用 App 回：回報者在「我的回報」就看得到、不用經過寄信服務；App 回不了才寄信 */
export function defaultChannel(canReplyInApp: boolean, canSend: boolean): FeedbackChannel {
    return !canReplyInApp && canSend ? 'email' : 'app';
}

/** 地址可能是「名字 <a@b>」，比對前只留地址本身 */
export function bareAddress(value: string): string {
    const match = /<([^>]+)>/.exec(value);
    return (match ? match[1] : value).trim().toLowerCase();
}

/**
 * 綁定的信箱：/emails 的 to 是現在寄得到的地址；寄不了（例如內容已清除）時是 null，
 * 就拿之前寄出的信的收件人來比，那也是當時綁定的地址
 */
export function boundAddress(emailsTo: string | null, messages: Pick<FeedbackMessage, 'channel' | 'direction' | 'to'>[]): string | null {
    if (emailsTo) return emailsTo;
    return messages.findLast(m => m.channel === 'email' && m.direction === 'out' && m.to)?.to ?? null;
}

/** 對方用別的信箱回：內容照收，但要看得出來不是綁定的那個，可能是別人轉寄或冒名 */
export function isOtherSender(message: Pick<FeedbackMessage, 'channel' | 'direction' | 'from'>, bound: string | null): boolean {
    if (message.channel !== 'email' || message.direction !== 'in' || !message.from || !bound) return false;
    return bareAddress(message.from) !== bareAddress(bound);
}

/** 開發者的訊息回報者看到了沒；寄信中、寄失敗的對方根本沒收到，不談讀了沒 */
export function readState(message: Pick<FeedbackMessage, 'direction' | 'status' | 'readAt'>): 'read' | 'unread' | null {
    if (message.direction !== 'out' || message.status !== 'sent') return null;
    return message.readAt ? 'read' : 'unread';
}

/** 後端還沒有 /messages（#600 部署前）時，拿信件湊成同一個形狀，至少看得到來往的信 */
export function emailsAsMessages(emails: FeedbackEmail[]): FeedbackMessage[] {
    return emails.map(email => ({ ...email, channel: 'email', readAt: null }));
}

/** 後端已經排好；同一秒的照 id，保險起見再排一次，畫面不會因為後端改了排序就變成新的在前 */
export function sortThread<T extends Pick<FeedbackMessage, 'id' | 'createdAt'>>(messages: T[]): T[] {
    return [...messages].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id);
}

/** 等你回的排前面（同樣是不是等你回的，維持後端「新的在前」） */
export function awaitingFirst<T extends Pick<FeedbackReport, 'awaitingReply'>>(reports: T[]): T[] {
    return [...reports].sort((a, b) => Number(b.awaitingReply) - Number(a.awaitingReply));
}

/**
 * 送不出去時給管理員看的話。後端的 error 已經是中文原因，這裡補「接下來怎麼辦」。
 * status 0 是連不上後端：不知道送到了沒，所以告訴他再按一次是安全的（同一份草稿不會變兩則）
 */
export function replyErrorMessage(channel: FeedbackChannel, status: number, message: string): string {
    if (status === 0) return `${message}。不確定送到了沒，再按一次會用同一份草稿，不會多一則`;
    if (status === 409) return channel === 'app' ? `這則沒辦法在 App 裡回：${message}` : `現在寄不了：${message}`;
    if (channel === 'app') return message;
    switch (status) {
        // 後端的原因已經寫了「明天再寄」「還沒設定好」，這裡只補退路
        case 429: return `${message}（算的是台灣時間的一天；急的話先改用 App 裡回）`;
        case 502: return `寄信服務沒寄出去（${message}）。再按一次重寄就好，用的是同一份草稿，不會變兩封`;
        case 503: return `${message}。先改用 App 裡回`;
        default: return message;
    }
}

/**
 * 沒送出去的草稿，以回報 id 為鍵。詳情面板點別則就換掉整張卡片，留在模組層級，
 * 打到一半去查別則回來還在；只放記憶體，重新整理就沒了，回覆內容不進瀏覽器儲存
 */
const drafts = new Map<number, ReplyDraft>();

/**
 * 送出過的 draft_id。寄信最久等 10 秒，這段時間卡片可能已經換掉：結果回來時，
 * 草稿可能在 drafts 裡，也可能在回頭打開的新卡片上，所以記鍵，不去找草稿在哪。
 * 用 reactive 是讓新卡片也看得到，不然已送出的內容還留在表單上，改一個字就成了第二則
 */
const sentDraftIds = reactive(new Set<string>());

export const isDraftSent = (draftId: string) => draftId !== '' && sentDraftIds.has(draftId);
export const markDraftSent = (draftId: string) => sentDraftIds.add(draftId);

export function takeDraft(reportId: number): ReplyDraft | null {
    const draft = drafts.get(reportId) ?? null;
    drafts.delete(reportId);
    return draft && !isDraftSent(draft.draftId) ? draft : null;
}

export function keepDraft(reportId: number, draft: ReplyDraft) {
    if (draft.subject.trim() || draft.body.trim()) drafts.set(reportId, draft);
}
