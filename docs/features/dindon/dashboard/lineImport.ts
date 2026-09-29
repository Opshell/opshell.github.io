import type { AdminDevice, CreateFeedbackInput, FeedbackStatus, TriageItem } from './schemas/admin.schema';

// 匯入 LINE 回報（#0068）的純邏輯：時間換算、用名字猜是哪台裝置、把逐則的決定整理成「要開的問題＋要建的回報」。
// 畫面在 components/LineImport.vue。

// #region [P] 時間：後端是 RFC 3339，輸入框是台灣時間的 datetime-local

const taipeiParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
});

/** 2026-09-28T13:03:00Z → 2026-09-28T21:03（台灣時間，給 datetime-local） */
export function toTaipeiInput(iso: string | null): string {
    if (!iso) return '';
    const parts = Object.fromEntries(taipeiParts.formatToParts(new Date(iso)).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** 2026-09-28T21:03 → 2026-09-28T21:03:00+08:00。空的回 undefined（＝建立的時間） */
export function fromTaipeiInput(value: string): string | undefined {
    return value ? `${value}:00+08:00` : undefined;
}

// #endregion

// #region [P] 用 LINE 上的名字猜裝置：只在剛好一台對得上時預選，猜錯比不猜糟（分數會算給別人）

const normalize = (value: string | null | undefined) => (value ?? '').toLowerCase().replace(/\s+/g, '');

/** 這台裝置可以用哪些字找到：暱稱、排行榜名字、email 的帳號部分、id */
function keysOf(device: AdminDevice): string[] {
    return [device.nickname, device.displayName, device.email?.split('@')[0], String(device.id)].map(normalize).filter(Boolean);
}

export function guessDevice(speaker: string, devices: AdminDevice[]): AdminDevice | null {
    const name = normalize(speaker);
    if (!name) return null;
    const exact = devices.filter(device => keysOf(device).includes(name));
    return exact.length === 1 ? exact[0] : null;
}

/** 選裝置的搜尋：id、暱稱、名字、email 有包含就算，最多 8 台 */
export function searchDevices(query: string, devices: AdminDevice[], limit = 8): AdminDevice[] {
    const q = normalize(query);
    if (!q) return [];
    return devices.filter(device => [...keysOf(device), normalize(device.email)].some(key => key.includes(q))).slice(0, limit);
}

// #endregion

// #region [P] 逐則的決定 → 要開的問題、要建的回報

export type MergeMode = 'attach' | 'new' | 'none';
export type ReviewChoice = 'accept' | 'pending' | 'rejected';

/** 管理員對一則的決定（畫面上可以改的都在這裡） */
export interface Draft {
    include: boolean;
    kind: 'bug' | 'suggestion';
    description: string;
    deviceId: number | null;
    /** datetime-local 的值（台灣時間），空的＝建立的時間 */
    saidAt: string;
    review: ReviewChoice;
    merge: MergeMode;
    issueId: number | null;
    newIssueTitle: string;
    /** 開新問題時，把 AI 說重複的那幾則既有回報也掛上去 */
    withDuplicates: boolean;
    duplicateReportIds: number[];
}

/** AI 的建議當預設值；不是回報的預設不匯入 */
export function draftFrom(item: TriageItem, devices: AdminDevice[]): Draft {
    const merge: MergeMode = item.action === 'attach_issue' && item.issueId !== null ? 'attach' : item.action === 'new_issue' ? 'new' : 'none';
    return {
        include: item.kind !== 'not_feedback',
        kind: item.kind === 'suggestion' ? 'suggestion' : 'bug',
        description: item.description,
        deviceId: guessDevice(item.speaker, devices)?.id ?? null,
        saidAt: toTaipeiInput(item.saidAt),
        review: 'accept',
        merge,
        issueId: item.issueId,
        newIssueTitle: item.newIssueTitle ?? item.title,
        withDuplicates: item.action === 'duplicate',
        duplicateReportIds: item.duplicateReportIds
    };
}

const statusOf = (draft: Draft): FeedbackStatus =>
    draft.review === 'accept' ? (draft.kind === 'bug' ? 'accepted_bug' : 'accepted_suggestion') : draft.review;

/** 一則還差什麼才能建立；空字串＝可以 */
export function draftProblem(draft: Draft, now = new Date()): string {
    if (draft.deviceId === null) return '還沒選是哪一位的裝置';
    if (!draft.description.trim()) return '描述是空的';
    if ([...draft.description.trim()].length > 2000) return '描述超過 2,000 字';
    if (draft.merge === 'attach' && draft.issueId === null) return '還沒選要併到哪個問題';
    if (draft.merge === 'new' && !draft.newIssueTitle.trim()) return '新問題還沒有標題';
    const said = fromTaipeiInput(draft.saidAt);
    if (said) {
        const time = new Date(said).getTime();
        if (time > now.getTime()) return '時間不能是未來';
        if (now.getTime() - time > 90 * 86_400_000) return '時間最多 90 天前';
    }
    return '';
}

export interface IssueToCreate {
    title: string;
    /** 一起掛上去的既有回報（AI 說重複的那幾則） */
    reportIds: number[];
}

export interface ImportPlan {
    /** 要先開的新問題：同一個標題只開一個 */
    issues: IssueToCreate[];
    /** 每一則要建的回報；newIssueTitle 有值的，等問題開好再填 issueId */
    reports: { index: number; payload: CreateFeedbackInput; newIssueTitle: string | null }[];
}

export function planImport(drafts: Draft[], source: 'line' | 'email'): ImportPlan {
    const issues = new Map<string, Set<number>>();
    const reports: ImportPlan['reports'] = [];
    drafts.forEach((draft, index) => {
        if (!draft.include || draft.deviceId === null) return;
        const newIssueTitle = draft.merge === 'new' ? draft.newIssueTitle.trim() : null;
        if (newIssueTitle) {
            const ids = issues.get(newIssueTitle) ?? new Set<number>();
            if (draft.withDuplicates) draft.duplicateReportIds.forEach(id => ids.add(id));
            issues.set(newIssueTitle, ids);
        }
        reports.push({
            index,
            newIssueTitle,
            payload: {
                deviceId: draft.deviceId,
                kind: draft.kind,
                description: draft.description.trim(),
                source,
                status: statusOf(draft),
                ...(draft.merge === 'attach' && draft.issueId !== null ? { issueId: draft.issueId } : {}),
                ...(fromTaipeiInput(draft.saidAt) ? { saidAt: fromTaipeiInput(draft.saidAt) } : {})
            }
        });
    });
    return { issues: [...issues].map(([title, ids]) => ({ title, reportIds: [...ids] })), reports };
}

// #endregion
