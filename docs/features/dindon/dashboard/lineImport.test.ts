import type { AdminDevice, TriageItem } from './schemas/admin.schema';
import { describe, expect, it } from 'vitest';
import { draftFrom, draftProblem, fromTaipeiInput, guessDevice, planImport, quickPicks, rememberPick, searchDevices, toTaipeiInput } from './lineImport';

function device(id: number, nickname: string | null, email: string | null = null, adminNote = ''): AdminDevice {
    return {
        id,
        planTier: 'free',
        tokens: 100,
        betaTesterSince: null,
        linked: !!email,
        email,
        subscriptionExpiresAt: null,
        frozen: false,
        frozenAt: null,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        lastAiAt: null,
        aiCalls30d: 0,
        nickname,
        title: null,
        displayName: nickname ?? `白老鼠 #${id}`,
        bugs: 0,
        suggestions: 0,
        bonusBugs: 0,
        bonusSuggestions: 0,
        ironAchievedOn: null,
        avatar: null,
        adminNote,
        isTest: false,
        isConsole: false,
        appVersion: '',
        appBuild: 0,
        lastSeenAt: null,
        lastCheckinDay: null
    };
}

const devices = [device(1, '阿明', 'ming@example.com'), device(2, '小美'), device(3, '小美'), device(4, null)];

function item(overrides: Partial<TriageItem> = {}): TriageItem {
    return {
        kind: 'bug',
        title: '拍照儲存沒反應',
        description: '我拍發票之後按儲存都沒反應',
        speaker: '阿明',
        saidAt: '2026-09-28T13:03:00Z',
        action: 'standalone',
        issueId: null,
        duplicateReportIds: [],
        newIssueTitle: null,
        reason: '',
        confidence: 'high',
        ...overrides
    };
}

describe('時間換算', () => {
    it('rFC 3339 轉成台灣時間的輸入框，再轉回帶 +08:00 的時間', () => {
        expect(toTaipeiInput('2026-09-28T13:03:00Z')).toBe('2026-09-28T21:03');
        expect(toTaipeiInput('2026-09-28T23:30:00+08:00')).toBe('2026-09-28T23:30');
        expect(fromTaipeiInput('2026-09-28T21:03')).toBe('2026-09-28T21:03:00+08:00');
        expect(new Date(fromTaipeiInput('2026-09-28T21:03')!).toISOString()).toBe('2026-09-28T13:03:00.000Z');
    });

    it('空的就是空的：沒給時間＝建立的時間', () => {
        expect(toTaipeiInput(null)).toBe('');
        expect(fromTaipeiInput('')).toBeUndefined();
    });
});

describe('用名字猜裝置', () => {
    it('剛好一台對得上才預選：暱稱、email 帳號、id 都算，不分大小寫與空白', () => {
        expect(guessDevice('阿明', devices)?.id).toBe(1);
        expect(guessDevice('Ming', devices)?.id).toBe(1);
        expect(guessDevice('白老鼠 #4', devices)?.id).toBe(4);
    });

    it('對到兩台、對不到、沒名字都不猜（猜錯分數會算給別人）', () => {
        expect(guessDevice('小美', devices)).toBeNull();
        expect(guessDevice('路人', devices)).toBeNull();
        expect(guessDevice('', devices)).toBeNull();
    });

    it('名字對不上時看備註：備註裡寫了 LINE 名稱、剛好一台才猜', () => {
        const noted = [...devices, device(5, null, null, 'LINE：Ken Chen，9/28 從 Threads 來'), device(6, null, null, 'LINE：小華'), device(7, null, null, '小華的同事')];
        expect(guessDevice('Ken Chen', noted)?.id).toBe(5);
        expect(guessDevice('小華', noted)).toBeNull();
        expect(guessDevice('K', noted)).toBeNull();
        // 名字完全對上的優先，不會被備註蓋過
        expect(guessDevice('阿明', [...noted, device(8, null, null, '阿明的老婆')])?.id).toBe(1);
    });

    it('測試裝置不會被猜成 LINE 上講話的人', () => {
        expect(guessDevice('阿明', [{ ...device(9, '阿明'), isTest: true }])).toBeNull();
        expect(guessDevice('阿明', [...devices, { ...device(9, '阿明'), isTest: true }])?.id).toBe(1);
    });

    it('搜尋也比對備註', () => {
        expect(searchDevices('threads', [device(5, null, null, 'LINE：Ken，從 Threads 來')]).map(d => d.id)).toEqual([5]);
    });

    it('搜尋用包含的', () => {
        expect(searchDevices('小', devices).map(d => d.id)).toEqual([2, 3]);
        expect(searchDevices('example', devices).map(d => d.id)).toEqual([1]);
        expect(searchDevices('', devices)).toEqual([]);
    });
});

describe('aI 的建議當預設值', () => {
    it('併到既有問題、開新問題、重複、不是回報', () => {
        expect(draftFrom(item({ action: 'attach_issue', issueId: 3 }), devices)).toMatchObject({ merge: 'attach', issueId: 3, include: true, deviceId: 1 });
        expect(draftFrom(item({ action: 'new_issue', newIssueTitle: '儲存沒反應' }), devices)).toMatchObject({ merge: 'new', newIssueTitle: '儲存沒反應' });
        expect(draftFrom(item({ action: 'duplicate', duplicateReportIds: [12, 15] }), devices)).toMatchObject({ merge: 'none', withDuplicates: true, duplicateReportIds: [12, 15] });
        expect(draftFrom(item({ kind: 'not_feedback' }), devices).include).toBe(false);
    });
});

describe('能不能建立', () => {
    const now = new Date('2026-09-29T00:00:00Z');
    const ok = draftFrom(item(), devices);

    it('都齊了就可以', () => {
        expect(draftProblem(ok, now)).toBe('');
    });

    it('沒選裝置、描述空白、時間在未來或太久以前都擋', () => {
        expect(draftProblem({ ...ok, deviceId: null }, now)).toContain('裝置');
        expect(draftProblem({ ...ok, description: '  ' }, now)).toContain('描述');
        expect(draftProblem({ ...ok, saidAt: '2026-09-30T10:00' }, now)).toContain('未來');
        expect(draftProblem({ ...ok, saidAt: '2026-06-01T10:00' }, now)).toContain('90 天');
    });
});

describe('整理成要送的東西', () => {
    it('同一個新問題標題只開一次，重複的既有回報一起掛上；採計照類型轉成狀態', () => {
        const drafts = [
            { ...draftFrom(item({ action: 'new_issue', newIssueTitle: '儲存沒反應' }), devices) },
            { ...draftFrom(item({ action: 'new_issue', newIssueTitle: '儲存沒反應', speaker: 'ming' }), devices), withDuplicates: true, duplicateReportIds: [12] },
            { ...draftFrom(item({ kind: 'suggestion', action: 'attach_issue', issueId: 3, saidAt: null }), devices) },
            { ...draftFrom(item({ kind: 'not_feedback' }), devices) }
        ];
        const plan = planImport(drafts, 'line');
        expect(plan.issues).toEqual([{ title: '儲存沒反應', reportIds: [12] }]);
        expect(plan.reports.map(r => r.index)).toEqual([0, 1, 2]);
        expect(plan.reports[0]).toMatchObject({ newIssueTitle: '儲存沒反應', payload: { status: 'accepted_bug', source: 'line', saidAt: '2026-09-28T21:03:00+08:00' } });
        expect(plan.reports[2].payload).toMatchObject({ kind: 'suggestion', status: 'accepted_suggestion', issueId: 3 });
        expect(plan.reports[2].payload).not.toHaveProperty('saidAt');
    });

    it('待審、不採計照原樣；沒選裝置的不送', () => {
        const drafts = [{ ...draftFrom(item(), devices), review: 'pending' as const }, { ...draftFrom(item(), devices), review: 'rejected' as const }, { ...draftFrom(item(), devices), deviceId: null }];
        expect(planImport(drafts, 'email').reports.map(r => r.payload.status)).toEqual(['pending', 'rejected']);
    });
});

describe('快選人選', () => {
    const people = [
        { ...device(1, '阿明'), bugs: 2, suggestions: 1 },
        { ...device(2, '小美'), bugs: 5, suggestions: 0 },
        { ...device(3, '阿凍'), bugs: 9, suggestions: 0, frozen: true },
        device(4, '新來的'),
        { ...device(5, '小華'), bugs: 0, suggestions: 1 }
    ];

    it('這批選過的在前、再來最近選過的、最後補常回報的（件數多的在前）；不重複、不列凍結的', () => {
        expect(quickPicks(people, { pickedInBatch: [4], recent: [5, 4] }).map(d => d.id)).toEqual([4, 5, 2, 1]);
    });

    it('測試裝置不列進快選', () => {
        expect(quickPicks([...people, { ...device(6, '測試'), bugs: 9, suggestions: 0, isTest: true }], { pickedInBatch: [6], recent: [] }).map(d => d.id)).not.toContain(6);
    });

    it('沒回報過也沒選過的不列；上限', () => {
        expect(quickPicks(people, { pickedInBatch: [], recent: [] }).map(d => d.id)).toEqual([2, 1, 5]);
        expect(quickPicks(people, { pickedInBatch: [], recent: [] }, 2)).toHaveLength(2);
    });

    it('選過的移到最前面、最多記 10 台', () => {
        expect(rememberPick([3, 2, 1], 1)).toEqual([1, 3, 2]);
        expect(rememberPick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 11)).toHaveLength(10);
    });
});
