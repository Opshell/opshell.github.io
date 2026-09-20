// 後台共用的顯示格式。時間一律用台灣時間，和 App、後端的 beta_tester_since 同一個時區。

const dateTime = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
});

export function formatDateTime(value: string | null | undefined): string {
    return value ? dateTime.format(new Date(value)) : '—';
}

/** 「3 分鐘前」這種相對時間，列表上比絕對時間好掃 */
export function formatRelative(value: string | null | undefined): string {
    if (!value) return '從未';
    const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} 小時前`;
    const days = Math.round(hours / 24);
    return days < 30 ? `${days} 天前` : formatDateTime(value).slice(0, 10);
}

/** 列表上只露出頭尾，點進單台才看完整的 email */
export function maskEmail(email: string | null): string {
    if (!email) return '';
    const [name, domain] = email.split('@');
    return `${name.slice(0, 2)}${'•'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

export const FEATURE_LABELS: Record<string, string> = {
    'classify': '推播分類',
    'recognize': '照片辨識',
    'recognize-speech': '語音記帳'
};
export const FEATURE_ORDER = ['classify', 'recognize', 'recognize-speech'];

export const PLAN_LABELS: Record<string, string> = { free: '免費', lite: 'Lite', pro: 'Pro' };

/** 回報的類型。crash 是 App 當掉之後自己產生的，使用者按了才送（溝通板 #39） */
export const KIND_LABELS: Record<string, string> = { bug: 'bug', suggestion: '建議', crash: '閃退' };

const integer = new Intl.NumberFormat('zh-TW');
export const formatInt = (value: number) => integer.format(Math.round(value));

/** 成本常常是小數點後好幾位的美金，依大小決定位數，不要全部變成 $0.00 */
export function formatUsd(value: number): string {
    if (value === 0) return '$0';
    const digits = value >= 1 ? 2 : value >= 0.01 ? 4 : 6;
    return `$${value.toFixed(digits)}`;
}

export const formatPercent = (value: number) => `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0)}%`;
export const formatMs = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)} 秒` : `${Math.round(value)} ms`);
