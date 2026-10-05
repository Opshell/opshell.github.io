import { describe, expect, it } from 'vitest';
import { isListed, listedTitle, showDrafts } from './drafts';

describe('本機看草稿的開關', () => {
    it('sHOW_DRAFTS=1 才算開', () => {
        expect(showDrafts({ SHOW_DRAFTS: '1' })).toBe(true);
        expect(showDrafts({})).toBe(false);
        expect(showDrafts({ SHOW_DRAFTS: '0' })).toBe(false);
    });

    it('已發佈的一定列；草稿只有開關開著才列', () => {
        expect(isListed({ isPublished: true }, false)).toBe(true);
        expect(isListed({ isPublished: false }, false)).toBe(false);
        expect(isListed({ isPublished: false }, true)).toBe(true);
    });

    it('沒寫 isPublished 的頁面（叮咚、履歷、專區首頁）不是文章，開關開著也不列', () => {
        expect(isListed({ layout: 'page' }, true)).toBe(false);
        expect(isListed(undefined, true)).toBe(false);
    });

    it('草稿的標題前面加「草稿｜」，已發佈的不動', () => {
        expect(listedTitle('Axios 封裝', { isPublished: false })).toBe('草稿｜Axios 封裝');
        expect(listedTitle('Axios 封裝', { isPublished: true })).toBe('Axios 封裝');
    });
});
