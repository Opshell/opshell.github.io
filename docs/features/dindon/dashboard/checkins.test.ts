import type { CheckinEntry } from './schemas/admin.schema';
import { describe, expect, it } from 'vitest';
import { buildCalendar, lastOpened, rangeError } from './checkins';
import { GetDeviceCheckinsParser } from './schemas/admin.schema';

const entry = (day: string, source = 'online'): CheckinEntry => ({ day, source, receivedAt: null });

describe('buildCalendar', () => {
    // 2026-10-01 是週四
    const weeks = buildCalendar('2026-10-01', [entry('2026-10-01'), entry('2026-09-28', 'offline')], 2);

    it('一欄一週、週一開頭，最後一欄是今天這週', () => {
        expect(weeks).toHaveLength(2);
        expect(weeks[0][0].day).toBe('2026-09-21');
        expect(weeks[1][0].day).toBe('2026-09-28');
        expect(weeks[1][6].day).toBe('2026-10-04');
    });

    it('標出今天、未來與每天的來源', () => {
        expect(weeks[1][3]).toEqual({ day: '2026-10-01', source: 'online', isToday: true, isFuture: false });
        expect(weeks[1][0].source).toBe('offline');
        expect(weeks[1][4].isFuture).toBe(true);
        expect(weeks[0][2].source).toBeNull();
    });
});

describe('lastOpened', () => {
    it('第一筆是最近一次，算出幾天前', () => {
        expect(lastOpened('2026-10-01', [entry('2026-09-28'), entry('2026-09-20')])).toEqual({ day: '2026-09-28', daysAgo: 3 });
        expect(lastOpened('2026-10-01', [])).toBeNull();
    });
});

describe('rangeError', () => {
    it('擋掉顛倒、太早、未來的日子', () => {
        expect(rangeError('2026-09-20', '2026-09-22', '2026-10-01')).toBe('');
        expect(rangeError('2026-09-22', '2026-09-20', '2026-10-01')).toContain('晚');
        expect(rangeError('2026-09-01', '2026-09-20', '2026-10-01')).toContain('2026-09-06');
        expect(rangeError('2026-09-20', '2026-10-02', '2026-10-01')).toContain('未來');
    });
});

describe('getDeviceCheckinsParser', () => {
    it('go 的 null 補成空陣列，received_at 可以沒有', () => {
        const raw = {
            state: {
                today: '2026-10-01',
                checked_in_today: false,
                streak: 0,
                best_streak: 0,
                total_days: 0,
                days: null,
                beta: { streak: 0, best_streak: 0, days: 0 },
                event: { streak: 0, best_streak: 0, iron_days: 14, iron: false, iron_achieved_on: null },
                offline_grace_days: 3,
                offline_quota: 5,
                offline_left: 5,
                imported: false,
                rejected: null
            },
            checkins: [{ day: '2026-09-20', source: 'online', received_at: null }],
            added: 2
        };
        const parsed = GetDeviceCheckinsParser.parse(raw);
        expect(parsed.checkins).toEqual([{ day: '2026-09-20', source: 'online', receivedAt: null }]);
        expect(parsed.changed).toEqual({ added: 2, upgraded: 0, removed: 0 });
        expect(parsed.state.imported).toBe(false);
    });
});
