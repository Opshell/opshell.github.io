import { describe, expect, it } from 'vitest';
import { announcementError, APP_PAGES, blockedCount, buildRangeText, configError, fromTaipeiLocal, LINK_URL, linkChoice, linkLabel, toTaipeiLocal } from './appAdmin';

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
    const ok = { message: '0.7.0 可以用 Google 備份了', link: 'app:settings/account', startsAt: '2026-10-01T00:00', endsAt: '2026-10-15T00:00', minAppBuild: 0, maxAppBuild: 51 };

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
        const ok = { message: '公告', startsAt: '', endsAt: '2026-10-15T00:00', minAppBuild: 0, maxAppBuild: 0 };
        for (const page of APP_PAGES) expect(announcementError({ ...ok, link: page.code }, 80), page.code).toBe('');
    });
});
