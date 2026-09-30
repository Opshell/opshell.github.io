import type { TerminalTab } from './terminal';
import { describe, expect, it } from 'vitest';
import { commonPrefix, parseCommand, suggest } from './terminal';

const TABS: TerminalTab[] = [
    { key: 'overview', label: '總覽' },
    { key: 'devices', label: '裝置' },
    { key: 'feedback', label: '回報' },
    { key: 'api', label: 'API' }
];

describe('parseCommand', () => {
    it('空白什麼都不做', () => {
        expect(parseCommand('   ', TABS)).toEqual({ kind: 'none' });
    });

    it('分頁可以用 cd、英文、中文或數字', () => {
        expect(parseCommand('cd devices', TABS)).toEqual({ kind: 'tab', tab: 'devices' });
        expect(parseCommand('裝置', TABS)).toEqual({ kind: 'tab', tab: 'devices' });
        expect(parseCommand('3', TABS)).toEqual({ kind: 'tab', tab: 'feedback' });
        expect(parseCommand('DEVICES', TABS)).toEqual({ kind: 'tab', tab: 'devices' });
        expect(parseCommand('cd', TABS)).toEqual({ kind: 'tab', tab: 'overview' });
    });

    it('不認得的字給錯誤訊息', () => {
        expect(parseCommand('rm -rf', TABS)).toMatchObject({ kind: 'error' });
        expect(parseCommand('cd nowhere', TABS)).toMatchObject({ kind: 'error' });
    });

    it('dev 帶搜尋字，-f 只看凍結的', () => {
        expect(parseCommand('dev 小明 -f', TABS)).toMatchObject({
            kind: 'tab',
            tab: 'devices',
            preset: { deviceQuery: '小明', deviceStatus: 'frozen' }
        });
        expect(parseCommand('d 42', TABS)).toMatchObject({ preset: { deviceQuery: '42', deviceStatus: undefined } });
    });

    it('fb 的短字對到後端的狀態，預設待審', () => {
        expect(parseCommand('fb', TABS)).toMatchObject({ preset: { feedbackStatus: 'pending' } });
        expect(parseCommand('fb idea', TABS)).toMatchObject({ preset: { feedbackStatus: 'accepted_suggestion' } });
        expect(parseCommand('fb maybe', TABS)).toMatchObject({ kind: 'error' });
    });

    it('theme 沒帶字就切換', () => {
        expect(parseCommand('theme', TABS)).toEqual({ kind: 'theme', mode: 'toggle' });
        expect(parseCommand('theme DARK', TABS)).toEqual({ kind: 'theme', mode: 'dark' });
        expect(parseCommand('theme blue', TABS)).toMatchObject({ kind: 'error' });
    });

    it('別名跟本名一樣', () => {
        expect(parseCommand('refresh', TABS)).toEqual({ kind: 'refresh' });
        expect(parseCommand('?', TABS)).toEqual({ kind: 'help' });
    });
});

describe('suggest', () => {
    it('打一半列出開頭相符的指令與分頁', () => {
        const values = suggest('de', TABS).map(item => item.value);
        expect(values).toContain('dev');
        expect(values).toContain('devices');
    });

    it('指令後面列它能接的字', () => {
        expect(suggest('fb i', TABS).map(item => item.value)).toEqual(['fb idea']);
        expect(suggest('cd d', TABS).map(item => item.value)).toEqual(['cd devices']);
    });

    it('自由輸入的參數不給建議', () => {
        expect(suggest('dev 小', TABS)).toEqual([]);
    });
});

describe('commonPrefix', () => {
    it('補到大家一樣的地方', () => {
        expect(commonPrefix(['dev', 'devices'])).toBe('dev');
        expect(commonPrefix(['reload', 'refresh'])).toBe('re');
        expect(commonPrefix([])).toBe('');
    });
});
