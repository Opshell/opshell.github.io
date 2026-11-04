import { describe, expect, it } from 'vitest';
import { alertTargetsError, announcementError, APP_PAGES, blockedCount, buildRangeText, configError, fromTaipeiLocal, LINK_URL, linkChoice, linkLabel, newsDraftError, splitList, toTaipeiLocal } from './appAdmin';

describe('台灣時間', () => {
    it('伺服器的 RFC3339 換成 datetime-local，再換回來帶 +08:00', () => {
        expect(toTaipeiLocal('2026-10-01T16:30:00Z')).toBe('2026-10-02T00:30');
        expect(fromTaipeiLocal('2026-10-02T00:30')).toBe('2026-10-02T00:30:00+08:00');
    });
});

describe('blockedCount', () => {
    const versions = [
        { appVersion: '0.7.1', appBuild: 53, devices: 15 },
        { appVersion: '0.7.0', appBuild: 52, devices: 3 },
        { appVersion: '', appBuild: 0, devices: 6 }
    ];

    it('只算有帶版本、低於最低版本的；沒帶版本的不擋', () => {
        expect(blockedCount(versions, 53)).toBe(3);
        expect(blockedCount(versions, 54)).toBe(18);
        expect(blockedCount(versions, 0)).toBe(0);
    });
});

describe('configError', () => {
    it('最低版本不能比最新新；有最新版號就要有名稱', () => {
        expect(configError({ minAppBuild: 52, latestAppBuild: 53, latestAppVersion: '0.7.1' })).toBe('');
        expect(configError({ minAppBuild: 54, latestAppBuild: 53, latestAppVersion: '0.7.1' })).toContain('最低版本');
        expect(configError({ minAppBuild: 0, latestAppBuild: 53, latestAppVersion: '' })).toContain('名稱');
        expect(configError({ minAppBuild: 0, latestAppBuild: 0, latestAppVersion: 'v1' })).toContain('三段');
    });
});

describe('announcementError', () => {
    const ok = { message: '0.7.0 可以用 Google 備份了', link: 'app:settings/account', startsAt: '2026-10-01T00:00', endsAt: '2026-10-15T00:00', minAppBuild: 0, maxAppBuild: 51, level: 'normal' as const, institutions: '', bankCodes: '' };

    it('合法的沒有錯誤', () => {
        expect(announcementError(ok, 80)).toBe('');
        expect(announcementError({ ...ok, link: '' }, 80)).toBe('');
        expect(announcementError({ ...ok, link: 'https://opshell.me/dindon/' }, 80)).toBe('');
    });

    it('擋掉空白、太長、換行、怪連結、時間顛倒、版本範圍反了', () => {
        expect(announcementError({ ...ok, message: '  ' }, 80)).toContain('空白');
        expect(announcementError({ ...ok, message: '字'.repeat(81) }, 80)).toContain('80');
        expect(announcementError({ ...ok, message: '一\n二' }, 80)).toContain('換行');
        expect(announcementError({ ...ok, link: 'http://x' }, 80)).toContain('連結');
        expect(announcementError({ ...ok, link: 'app:Settings' }, 80)).toContain('連結');
        expect(announcementError({ ...ok, endsAt: '2026-09-30T00:00' }, 80)).toContain('晚');
        expect(announcementError({ ...ok, minAppBuild: 53, maxAppBuild: 52 }, 80)).toContain('反');
    });

    it('示警的機構與代碼照後端的規則擋', () => {
        expect(announcementError({ ...ok, level: 'alert', institutions: '永豐銀行', bankCodes: '807' }, 80)).toBe('');
        expect(announcementError({ ...ok, level: 'alert', bankCodes: '80' }, 80)).toContain('三碼');
    });
});

describe('splitList', () => {
    it('逗號、頓號、空白都能分，去重複、去空的', () => {
        expect(splitList('永豐銀行、國泰世華, 永豐銀行，  台新')).toEqual(['永豐銀行', '國泰世華', '台新']);
        expect(splitList(' 807 013 ')).toEqual(['807', '013']);
        expect(splitList('   ')).toEqual([]);
    });
});

describe('alertTargetsError', () => {
    it('機構最多 10 個、每個 20 字；代碼三碼數字、最多 10 個', () => {
        expect(alertTargetsError(['永豐銀行'], ['807'])).toBe('');
        expect(alertTargetsError([], [])).toBe('');
        expect(alertTargetsError(Array.from({ length: 11 }, (_, i) => `銀行${i}`), [])).toContain('10 個');
        expect(alertTargetsError(['字'.repeat(21)], [])).toContain('20 字');
        expect(alertTargetsError([], ['8070'])).toContain('三碼');
        expect(alertTargetsError([], ['A07'])).toContain('三碼');
        expect(alertTargetsError([], Array.from({ length: 11 }, (_, i) => String(100 + i)))).toContain('10 個');
    });
});

describe('newsDraftError', () => {
    const now = new Date('2026-11-04T00:00:00+08:00').getTime();
    const ok = { message: '永豐傳出帳戶被盜轉，看一下最近的支出', institutions: '永豐銀行', bankCodes: '807', link: 'https://news.google.com/rss/articles/x', endsAt: '2026-11-07T00:00' };

    it('合法的沒有錯誤；連結空的是不帶', () => {
        expect(newsDraftError(ok, 80, now)).toBe('');
        expect(newsDraftError({ ...ok, link: '' }, 80, now)).toBe('');
    });

    it('內容、代碼、連結、結束時間', () => {
        expect(newsDraftError({ ...ok, message: '' }, 80, now)).toContain('空白');
        expect(newsDraftError({ ...ok, bankCodes: '8o7' }, 80, now)).toContain('三碼');
        expect(newsDraftError({ ...ok, link: 'http://x' }, 80, now)).toContain('連結');
        expect(newsDraftError({ ...ok, endsAt: '' }, 80, now)).toContain('結束');
        // 示警按下就開始，結束不能是過去
        expect(newsDraftError({ ...ok, endsAt: '2026-11-03T23:59' }, 80, now)).toContain('現在');
    });
});

describe('buildRangeText', () => {
    it('四種寫法', () => {
        expect(buildRangeText(0, 0)).toBe('全部版本');
        expect(buildRangeText(0, 51)).toBe('51 以下');
        expect(buildRangeText(52, 0)).toBe('52 以上');
        expect(buildRangeText(52, 53)).toBe('52～53');
    });
});

describe('公告連結的下拉選單', () => {
    it('空的、代號、網址各對到一項；不在清單上的代號照原樣留著', () => {
        expect(linkChoice('')).toBe('');
        expect(linkChoice('app:wallet')).toBe('app:wallet');
        expect(linkChoice('app:old-page')).toBe('app:old-page');
        expect(linkChoice('https://opshell.me/dindon/')).toBe(LINK_URL);
    });

    it('列表上認得的代號寫頁面名稱', () => {
        expect(linkLabel('app:wallet')).toBe('帳戶（app:wallet）');
        expect(linkLabel('https://opshell.me/')).toBe('https://opshell.me/');
    });

    it('每個代號都過得了連結的格式檢查', () => {
        const ok = { message: '公告', startsAt: '', endsAt: '2026-10-15T00:00', minAppBuild: 0, maxAppBuild: 0, level: 'normal' as const, institutions: '', bankCodes: '' };
        for (const page of APP_PAGES) expect(announcementError({ ...ok, link: page.code }, 80), page.code).toBe('');
    });
});
