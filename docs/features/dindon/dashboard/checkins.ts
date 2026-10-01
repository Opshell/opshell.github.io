import type { CheckinEntry } from './schemas/admin.schema';

// 裝置詳情的「打開 App」月曆（溝通板 #0067 的後台端點）：純邏輯，畫面在 components/DeviceCheckins.vue。
// 日期一律是台灣時間的 YYYY-MM-DD 字串（後端給的 today 也是），這裡只用 UTC 做加減，不碰使用者的時區。

/** App 存在的第一天：後端不收更早的給／收回（api.md 第 8 節） */
export const FIRST_DAY = '2026-09-06';
/** 一次給／收回最多幾天 */
export const MAX_CHANGE_DAYS = 366;

export const CHECKIN_SOURCE_LABELS: Record<string, string> = {
    online: '當天連線',
    offline: '事後補送',
    admin: '後台給的',
    imported: '從手機匯入'
};

const toTime = (day: string) => Date.parse(`${day}T00:00:00Z`);
const toDay = (time: number) => new Date(time).toISOString().slice(0, 10);
const DAY_MS = 86_400_000;

export const addDays = (day: string, n: number) => toDay(toTime(day) + n * DAY_MS);
export const daysBetween = (from: string, to: string) => Math.round((toTime(to) - toTime(from)) / DAY_MS);

export interface CalendarCell {
    day: string;
    /** 那天的來源；沒打卡是 null */
    source: string | null;
    isToday: boolean;
    /** 今天之後的格子（最後一週補滿用），畫成空的 */
    isFuture: boolean;
}

/**
 * 最近幾週的月曆：一欄一週、週一在最上面，最後一欄是今天這週。
 * 回傳的是週的陣列，每週 7 格。
 */
export function buildCalendar(today: string, entries: readonly CheckinEntry[], weeks = 12): CalendarCell[][] {
    const sources = new Map(entries.map(entry => [entry.day, entry.source]));
    // 今天是週幾（週一 = 0）：getUTCDay 的週日是 0
    const weekday = (new Date(toTime(today)).getUTCDay() + 6) % 7;
    const start = addDays(today, -weekday - (weeks - 1) * 7);
    return Array.from({ length: weeks }, (_, week) =>
        Array.from({ length: 7 }, (_, index) => {
            const day = addDays(start, week * 7 + index);
            return { day, source: sources.get(day) ?? null, isToday: day === today, isFuture: day > today };
        }));
}

/** 最近一次打開：紀錄由新到舊，第一筆就是 */
export function lastOpened(today: string, entries: readonly CheckinEntry[]): { day: string; daysAgo: number } | null {
    const latest = entries[0];
    return latest ? { day: latest.day, daysAgo: daysBetween(latest.day, today) } : null;
}

/** 給／收回之前先在前端擋一次，訊息比後端的好懂；後端才是真正的把關 */
export function rangeError(from: string, to: string, today: string): string {
    if (!from || !to) return '請選開始與結束的日期';
    if (from > to) return '開始的日期比結束晚';
    if (from < FIRST_DAY) return `不能早於 ${FIRST_DAY}（App 存在的第一天）`;
    if (to > today) return '不能是未來的日子';
    if (daysBetween(from, to) + 1 > MAX_CHANGE_DAYS) return `一次最多 ${MAX_CHANGE_DAYS} 天`;
    return '';
}
