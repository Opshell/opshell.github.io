import { describe, expect, it } from 'vitest';
import { AdminApiError } from './api';
import { purgeBeforeError, purgeConflict, purgeResultRows, purgeScopeText, taipeiToday } from './purge';
import { PurgeEventParser, PurgeEventPayload } from './schemas/admin.schema';

// 台灣 2026-11-20 早上 07:30（UTC 還是 11-19）：用來確認「今天」照台灣時間算
const NOW = new Date('2026-11-19T23:30:00Z');

describe('taipeiToday', () => {
    it('照台灣時間算今天，不是 UTC', () => {
        expect(taipeiToday(NOW)).toBe('2026-11-20');
        expect(taipeiToday(new Date('2026-11-20T15:59:00Z'))).toBe('2026-11-20');
        expect(taipeiToday(new Date('2026-11-20T16:00:00Z'))).toBe('2026-11-21');
    });
});

describe('purgeBeforeError', () => {
    it('空的可以（只清 beta 截止前的），今天與過去可以', () => {
        expect(purgeBeforeError('', NOW)).toBe('');
        expect(purgeBeforeError('2026-11-20', NOW)).toBe('');
        expect(purgeBeforeError('2026-01-05', NOW)).toBe('');
    });

    it('未來的日期擋下來（台灣的明天，即使 UTC 還是今天）', () => {
        expect(purgeBeforeError('2026-11-21', NOW)).toContain('未來');
        expect(purgeBeforeError('2027-01-05', NOW)).toContain('2026-11-20');
    });

    it('格式不對擋下來', () => {
        expect(purgeBeforeError('2026/11/20', NOW)).toContain('YYYY-MM-DD');
        expect(purgeBeforeError('2026-13-40', NOW)).toContain('YYYY-MM-DD');
    });
});

describe('purgeScopeText', () => {
    it('沒填日期只說 beta 截止前；有填就說清到哪一天', () => {
        expect(purgeScopeText('')).toContain('beta 截止之前');
        expect(purgeScopeText('2027-01-05')).toContain('2027-01-05 00:00');
    });
});

describe('purgeConflict', () => {
    it('待審的 409：拆出件數，可以強制', () => {
        const error = new AdminApiError(409, '還有 3 則待審', { error: '還有 3 則待審', pending: 3, pending_crash: 2 });
        expect(purgeConflict(error)).toEqual({ error: '還有 3 則待審', pending: 3, pendingCrash: 2, forceable: true });
    });

    it('拓荒季還沒結束：只有一句話，句子裡有 force 就可以強制', () => {
        const message = '拓荒季還沒結束（到 2026-12-31），賞金發完再清。確定要清就帶 "force": true';
        const view = purgeConflict(new AdminApiError(409, message, { error: message }));
        expect(view).toMatchObject({ pending: null, forceable: true });
    });

    it('活動還開著：force 放不過去', () => {
        const message = '活動還在進行。先把 EVENT_ACTIVE 設成 false 再清';
        expect(purgeConflict(new AdminApiError(409, message, { error: message }))?.forceable).toBe(false);
    });

    it('不是 409 回 null，照一般錯誤顯示', () => {
        expect(purgeConflict(new AdminApiError(400, 'before 不能是未來的日期'))).toBeNull();
        expect(purgeConflict(new Error('連不上'))).toBeNull();
    });
});

describe('purge 的 schema', () => {
    it('payload：沒填 before、沒有 force 就不送這兩個欄位', () => {
        expect(PurgeEventPayload.parse({ confirm: 'PURGE' })).toEqual({ confirm: 'PURGE' });
        expect(PurgeEventPayload.parse({ confirm: 'PURGE', before: '2027-01-05', force: true })).toEqual({ confirm: 'PURGE', before: '2027-01-05', force: true });
        expect(() => PurgeEventPayload.parse({ confirm: 'purge' })).toThrow();
    });

    it('parser：轉 camelCase；before、cutoff 沒值是 null', () => {
        const result = PurgeEventParser.parse({
            before: null,
            cutoff: '2026-11-20T12:00:00+08:00',
            force: false,
            reports_purged: 12,
            pending_purged: 0,
            screenshots_deleted: 20,
            message_images_deleted: 3,
            messages_deleted: 15,
            emails_deleted: 4
        });
        expect(result).toMatchObject({ before: null, cutoff: '2026-11-20T12:00:00+08:00', reportsPurged: 12, messageImagesDeleted: 3, emailsDeleted: 4 });
        expect(purgeResultRows(result).map(row => row.value)).toEqual([12, 0, 20, 3, 15, 4]);
    });
});
