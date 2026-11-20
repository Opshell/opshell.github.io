import type { AdminTerritory, FrontierSeason } from './schemas/admin.schema';
import { describe, expect, it } from 'vitest';
import { bountyBlocked, bountyBody, bountyError, defaultBountyTitle, emptyDraft, isMissedNotification, moveTerritory, openTerritories, pioneerOrigin, seasonLine, tamedInProblem, territoryFormError, territoryNameProblem, territoryNoteProblem, territoryPatch } from './frontier';

const territory = (patch: Partial<AdminTerritory> = {}): AdminTerritory => ({
    id: 1,
    name: '中華郵政',
    kind: 'bank',
    status: 'tamed',
    tamedIn: null,
    note: '',
    pioneer: null,
    pioneerDeviceId: null,
    pioneerFeedbackId: null,
    pioneerSetAt: null,
    sortOrder: 1,
    createdAt: '2026-11-17T00:00:00Z',
    updatedAt: '2026-11-17T00:00:00Z',
    ...patch
});

describe('領地的欄位（api.md 29.4）', () => {
    it('名稱 1～30 字（emoji 算一個）、不能換行與零寬字元', () => {
        expect(territoryNameProblem('  街口支付 ')).toBe('');
        expect(territoryNameProblem('   ')).toContain('空白');
        expect(territoryNameProblem('字'.repeat(30))).toBe('');
        expect(territoryNameProblem('字'.repeat(31))).toContain('30');
        expect(territoryNameProblem('🏦'.repeat(30))).toBe('');
        expect(territoryNameProblem('街口\n支付')).toContain('換行');
        expect(territoryNameProblem('街口\u200B支付')).toContain('看不見');
    });

    it('備註可以空、最多 100 字、不能換行', () => {
        expect(territoryNoteProblem('')).toBe('');
        expect(territoryNoteProblem('只驗過儲值，付款還缺')).toBe('');
        expect(territoryNoteProblem('字'.repeat(101))).toContain('100');
        expect(territoryNoteProblem('第一行\n第二行')).toContain('換行');
    });

    it('馴服的版本：空的是沒有，有填要像版本號', () => {
        expect(tamedInProblem('')).toBe('');
        expect(tamedInProblem('1.0.0')).toBe('');
        expect(tamedInProblem('1.0.0-beta+3')).toBe('');
        expect(tamedInProblem('.1')).toContain('版本');
        expect(tamedInProblem('1 0')).toContain('版本');
        expect(tamedInProblem('1'.repeat(21))).toContain('版本');
    });

    it('新增時排序可以留空（排最後），修改時要是整數', () => {
        const draft = { ...emptyDraft(), name: '街口支付' };
        expect(territoryFormError(draft, true)).toBe('');
        expect(territoryFormError(draft, false)).toContain('排序');
        expect(territoryFormError({ ...draft, sortOrder: '1.5' }, true)).toContain('整數');
        expect(territoryFormError({ ...draft, sortOrder: '-3' }, false)).toBe('');
    });

    it('修改只送變了的欄位；版本清空送 null', () => {
        const current = territory({ tamedIn: '1.0.0', note: '舊備註' });
        const draft = { name: '中華郵政 ', kind: 'bank' as const, status: 'wanted' as const, tamedIn: '', note: '舊備註', sortOrder: '1' };
        expect(territoryPatch(current, draft)).toEqual({ status: 'wanted', tamedIn: null });
        expect(territoryPatch(current, { ...draft, status: 'tamed', tamedIn: '1.0.0' })).toEqual({});
        expect(territoryPatch(current, { ...draft, status: 'tamed', tamedIn: '1.0.0', sortOrder: '7' })).toEqual({ sortOrder: 7 });
    });
});

describe('排序', () => {
    const list = [territory({ id: 1, sortOrder: 1 }), territory({ id: 2, sortOrder: 2 }), territory({ id: 3, sortOrder: 2 })];

    it('上下移一格是跟鄰居交換 sort_order', () => {
        expect(moveTerritory(list, 2, -1)).toEqual([{ id: 2, sortOrder: 1 }, { id: 1, sortOrder: 2 }]);
        expect(moveTerritory(list, 1, 1)).toEqual([{ id: 1, sortOrder: 2 }, { id: 2, sortOrder: 1 }]);
    });

    it('同號時只動自己，設成鄰居的前一號／後一號', () => {
        expect(moveTerritory(list, 3, -1)).toEqual([{ id: 3, sortOrder: 1 }]);
        expect(moveTerritory(list, 2, 1)).toEqual([{ id: 2, sortOrder: 3 }]);
    });

    it('頭尾再往外移沒有動作', () => {
        expect(moveTerritory(list, 1, -1)).toEqual([]);
        expect(moveTerritory(list, 3, 1)).toEqual([]);
        expect(moveTerritory(list, 99, 1)).toEqual([]);
    });
});

describe('開拓者', () => {
    it('發賞金只列還沒有開拓者的', () => {
        const list = [territory({ id: 1, pioneer: '阿明' }), territory({ id: 2 }), territory({ id: 3, status: 'wanted' })];
        expect(openTerritories(list).map(t => t.id)).toEqual([2, 3]);
    });

    it('署名從哪來：回報、裝置、手動', () => {
        expect(pioneerOrigin(territory())).toBe('');
        expect(pioneerOrigin(territory({ pioneer: '阿明', pioneerDeviceId: 42, pioneerFeedbackId: 123 }))).toBe('回報 #123');
        expect(pioneerOrigin(territory({ pioneer: '阿明', pioneerDeviceId: 42 }))).toBe('裝置 #42');
        expect(pioneerOrigin(territory({ pioneer: '小美' }))).toBe('手動');
    });
});

describe('季（api.md 29.1）', () => {
    const season: FrontierSeason = {
        startsOn: '2026-12-01',
        endsOn: '2026-12-30',
        startsAt: '2026-11-30T16:00:00Z',
        endsAt: '2026-12-30T16:00:00Z',
        days: 30,
        state: 'upcoming'
    };

    it('沒設上線日是 null，要講還沒定', () => {
        expect(seasonLine(null)).toContain('還沒定');
    });

    it('照 starts_at／ends_at 自己算，不只看伺服器的 state', () => {
        expect(seasonLine(season, Date.parse('2026-11-29T16:00:00Z'))).toBe('拓荒季 12/1～12/30（30 天），還沒開始（還有 1 天）');
        expect(seasonLine(season, Date.parse('2026-11-30T16:00:00Z'))).toBe('拓荒季 12/1～12/30（30 天），進行中：第 1 天，剩 29 天');
        expect(seasonLine(season, Date.parse('2026-12-30T15:59:59Z'))).toContain('第 30 天，剩 0 天');
        expect(seasonLine(season, Date.parse('2026-12-30T16:00:00Z'))).toContain('已經結束');
    });
});

describe('發賞金（api.md 29.5）', () => {
    const draft = { days: '7', territoryId: '', title: '' };

    it('發過、不採計的不能發', () => {
        const report = { bounty: null, status: 'pending' as const, contentPurgedAt: null };
        expect(bountyBlocked(report)).toBe('');
        expect(bountyBlocked({ ...report, status: 'rejected' })).toContain('不採計');
        expect(bountyBlocked({ ...report, bounty: { id: 1, feedbackId: 1, deviceId: 2, territoryId: null, perkId: 3, days: 7, createdBy: 'a', createdAt: '' } })).toContain('發過');
    });

    it('天數 0～366；0 天要選領地', () => {
        expect(bountyError(draft, false)).toBe('');
        expect(bountyError({ ...draft, days: '366' }, false)).toBe('');
        expect(bountyError({ ...draft, days: '367' }, false)).toContain('366');
        expect(bountyError({ ...draft, days: '-1' }, false)).toContain('整數');
        expect(bountyError({ ...draft, days: '1.5' }, false)).toContain('整數');
        expect(bountyError({ ...draft, days: '0' }, false)).toContain('領地');
        expect(bountyError({ ...draft, days: '0', territoryId: '35' }, false)).toBe('');
    });

    it('沒綁 App 的只能署名', () => {
        expect(bountyError(draft, true)).toContain('天數填 0');
        expect(bountyError({ ...draft, days: '0', territoryId: '35' }, true)).toBe('');
    });

    it('名稱選填，最多 40 字', () => {
        expect(bountyError({ ...draft, title: '字'.repeat(40) }, false)).toBe('');
        expect(bountyError({ ...draft, title: '字'.repeat(41) }, false)).toContain('40');
    });

    it('送出的 body 不帶空的選填欄位', () => {
        expect(bountyBody(draft)).toEqual({ days: 7 });
        // 2026-11-20 起的預設：只署名，body 只有 territory_id（#791）
        expect(bountyBody({ days: '0', territoryId: '35', title: '' })).toEqual({ territoryId: 35 });
        expect(bountyBody({ days: '14', territoryId: '35', title: ' 全新格式 ' })).toEqual({ days: 14, territoryId: 35, title: '全新格式' });
        expect(bountyBody({ days: '0', territoryId: '35', title: '只署名' })).toEqual({ territoryId: 35 });
        expect(defaultBountyTitle('街口支付')).toBe('拓荒季賞金：街口支付');
        expect(defaultBountyTitle(null)).toBe('拓荒季賞金');
    });
});

describe('漏抓的通知（api.md 29.6）', () => {
    it('看 topic，也認描述第一行的標記', () => {
        expect(isMissedNotification({ topic: 'missed_notification', description: '' })).toBe(true);
        expect(isMissedNotification({ topic: null, description: '【漏抓的通知】\n玉山銀行' })).toBe(true);
        expect(isMissedNotification({ topic: null, description: '拍照沒反應' })).toBe(false);
    });
});
