import { describe, expect, it } from 'vitest';
import { normalizeHitPath } from './path';

describe('normalizeHitPath', () => {
    it('首頁的 index.html 跟 / 是同一頁', () => {
        expect(normalizeHitPath('/index.html')).toBe('/');
        expect(normalizeHitPath('/')).toBe('/');
    });

    it('資料夾的 index.html 統一成結尾斜線', () => {
        expect(normalizeHitPath('/dindon/index.html')).toBe('/dindon/');
    });

    it('去掉 query 與 hash', () => {
        expect(normalizeHitPath('/tags-list.html?tag=vue&page=1')).toBe('/tags-list.html');
        expect(normalizeHitPath('/article/a.html#section')).toBe('/article/a.html');
    });

    it('中文與空白一律百分比編碼，原樣或已編碼的輸入都得到同一個字串', () => {
        const raw = normalizeHitPath('/article/前端工程師 技能樹.html');
        const encoded = normalizeHitPath('/article/%E5%89%8D%E7%AB%AF%E5%B7%A5%E7%A8%8B%E5%B8%AB%20%E6%8A%80%E8%83%BD%E6%A8%B9.html');
        expect(raw).toBe('/article/%E5%89%8D%E7%AB%AF%E5%B7%A5%E7%A8%8B%E5%B8%AB%20%E6%8A%80%E8%83%BD%E6%A8%B9.html');
        expect(encoded).toBe(raw);
        expect(raw).not.toContain(' ');
    });

    it('後台與帳號頁不計數', () => {
        expect(normalizeHitPath('/dindon/dashboard/')).toBeNull();
        expect(normalizeHitPath('/dindon/account/')).toBeNull();
        expect(normalizeHitPath('/dindon/')).toBe('/dindon/');
    });

    it('後端不收的路徑不送', () => {
        expect(normalizeHitPath('/a/../b.html')).toBeNull();
        expect(normalizeHitPath('/a//b.html')).toBeNull();
        expect(normalizeHitPath(`/${'很'.repeat(40)}.html`)).toBeNull();
    });
});
