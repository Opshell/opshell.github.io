import type { AdminTerritory, FrontierBounty, FrontierSeason, TerritoryMember } from './schemas/admin.schema';
import { describe, expect, it } from 'vitest';
import { bountyBlocked, bountyBody, bountyError, cancelBountyBody, daysPaid, defaultBountyTitle, emptyDraft, emptyMemberDraft, flipsBackToWanted, frontierProgress, isMissedNotification, memberCodeProblem, memberCreateBody, memberDraftOf, memberFormError, memberNameProblem, memberPatch, memberTally, moveTerritory, pioneerOrigin, progressPercent, reviewBody, seasonLine, tamedInProblem, targetError, targetOf, territoryFormError, territoryNameProblem, territoryNoteProblem, territoryOptionLabel, territoryPatch, unusedSuggestions } from './frontier';

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
    members: [],
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

const member = (patch: Partial<TerritoryMember> = {}): TerritoryMember => ({ id: 5, code: 'payment', name: '付款', status: 'wanted', tamedIn: null, sortOrder: 2, ...patch });

describe('有成員的領地（#839、#840）', () => {
    it('狀態跟著成員走：表單裡的狀態不送（不一樣會 409），其他欄位照送', () => {
        const current = territory({ status: 'wanted', members: [member()] });
        const draft = { name: '中華郵政', kind: 'bank' as const, status: 'tamed' as const, tamedIn: '', note: '改備註', sortOrder: '1' };
        expect(territoryPatch(current, draft)).toEqual({ note: '改備註' });
        // 成員刪光之後照舊能直接改
        expect(territoryPatch({ ...current, members: [] }, draft)).toEqual({ status: 'tamed', note: '改備註' });
    });
});

describe('成員的欄位（api.md 29.4）', () => {
    it('code：小寫英數底線 1～30、同一塊不能重複', () => {
        expect(memberCodeProblem('credit_card')).toBe('');
        expect(memberCodeProblem(' top_up ')).toBe('');
        expect(memberCodeProblem('')).toBe('代號不能空白');
        expect(memberCodeProblem('Transfer')).toContain('小寫英數');
        expect(memberCodeProblem('top-up')).toContain('小寫英數');
        expect(memberCodeProblem('a'.repeat(31))).toContain('小寫英數');
        expect(memberCodeProblem('payment', [member()])).toBe('這塊已經有代號 payment 的成員');
    });

    it('名稱 1～20 字（emoji 算一個）、不能換行', () => {
        expect(memberNameProblem(' 信用卡 ')).toBe('');
        expect(memberNameProblem(' ')).toBe('名稱不能空白');
        expect(memberNameProblem('一'.repeat(20))).toBe('');
        expect(memberNameProblem('一'.repeat(21))).toBe('名稱最多 20 字');
        expect(memberNameProblem('😀'.repeat(20))).toBe('');
        expect(memberNameProblem('儲\n值')).toContain('不能換行');
    });

    it('新增時檢查 code；修改時不看 code', () => {
        const draft = { ...emptyMemberDraft(), code: 'transfer', name: '轉帳' };
        expect(memberFormError(draft, [member()])).toBe('');
        expect(memberFormError({ ...draft, code: 'payment' }, [member()])).toContain('已經有');
        expect(memberFormError({ ...draft, tamedIn: '1.0 正式' }, [])).toContain('版本');
        expect(memberFormError(memberDraftOf(member()), null)).toBe('');
    });

    it('新增的 body：空的版本不送、排序不送（排最後）', () => {
        expect(memberCreateBody({ code: ' transfer ', name: ' 轉帳 ', status: 'wanted', tamedIn: '' }))
            .toEqual({ code: 'transfer', name: '轉帳', status: 'wanted' });
        expect(memberCreateBody({ code: 'top_up', name: '儲值', status: 'tamed', tamedIn: '1.0.1' }))
            .toEqual({ code: 'top_up', name: '儲值', status: 'tamed', tamedIn: '1.0.1' });
    });

    it('修改只送變了的；清掉版本送 null；沒變是空物件', () => {
        const current = member({ status: 'tamed', tamedIn: '1.0.1' });
        const draft = memberDraftOf(current);
        expect(memberPatch(current, draft)).toEqual({});
        expect(memberPatch(current, { ...draft, name: ' 付款碼 ' })).toEqual({ name: '付款碼' });
        expect(memberPatch(current, { ...draft, status: 'wanted', tamedIn: '' })).toEqual({ status: 'wanted', tamedIn: null });
    });

    it('建議值扣掉這塊已經有的', () => {
        expect(unusedSuggestions([member()]).map(s => s.code)).toEqual(['transfer', 'income', 'credit_card', 'top_up', 'auto_debit']);
    });

    it('已緝拿的領地加通緝中的成員會翻回通緝中，先提醒', () => {
        expect(flipsBackToWanted(territory({ status: 'tamed' }), { status: 'wanted' })).toBe(true);
        expect(flipsBackToWanted(territory({ status: 'tamed' }), { status: 'tamed' })).toBe(false);
        expect(flipsBackToWanted(territory({ status: 'wanted' }), { status: 'wanted' })).toBe(false);
    });

    it('成員也用上下移一格（同一套交換）', () => {
        const members = [member({ id: 1, sortOrder: 0 }), member({ id: 2, sortOrder: 1 })];
        expect(moveTerritory(members, 2, -1)).toEqual([{ id: 2, sortOrder: 0 }, { id: 1, sortOrder: 1 }]);
    });
});

describe('全體進度（api.md 29.2 progress）', () => {
    const list = [
        territory({ status: 'tamed' }),
        territory({ status: 'wanted' }),
        territory({ status: 'wanted', members: [member({ status: 'tamed' }), member({ status: 'tamed' }), member()] })
    ];

    it('每個成員算一個，沒有成員的領地算一個', () => {
        expect(frontierProgress(list)).toEqual({ tamed: 1, total: 3, membersTamed: 3, membersTotal: 5 });
        expect(frontierProgress([])).toEqual({ tamed: 0, total: 0, membersTamed: 0, membersTotal: 0 });
    });

    it('進度條照成員算；空的是 0%', () => {
        expect(progressPercent(frontierProgress(list))).toBe(60);
        expect(progressPercent({ tamed: 0, total: 0, membersTamed: 0, membersTotal: 0 })).toBe(0);
    });

    it('列表上的「2/3」', () => {
        expect(memberTally(list[2])).toBe('2/3');
        expect(memberTally(list[0])).toBe('');
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
    it('選項列全部領地，寫出現在的開拓者（署名照送出時間重算，#871 第 3 點）', () => {
        expect(territoryOptionLabel(territory({ name: '街口支付', status: 'wanted' }))).toBe('街口支付（通緝中）');
        expect(territoryOptionLabel(territory({ pioneer: '阿明' }))).toBe('中華郵政（已馴服，開拓者：阿明）');
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

const bounty = (patch: Partial<FrontierBounty> = {}): FrontierBounty => ({
    id: 1,
    feedbackId: 123,
    deviceId: 42,
    territoryId: 35,
    memberId: null,
    perkId: null,
    days: 0,
    createdBy: 'admin@example.com',
    createdAt: '2026-11-24T00:00:00Z',
    ...patch
});

describe('審核時採計成懸賞（api.md 第 8 節，#871）', () => {
    const list = [
        territory({ id: 35, name: '街口支付', members: [{ id: 5, code: 'payment', name: '付款', status: 'wanted', tamedIn: null, sortOrder: 0 }] }),
        territory({ id: 36 })
    ];

    it('採計時帶領地，成員一律明給（沒選是 null）', () => {
        expect(reviewBody('accepted_bug', { territoryId: '35', memberId: '5' })).toEqual({ status: 'accepted_bug', territoryId: 35, memberId: 5 });
        expect(reviewBody('accepted_suggestion', { territoryId: '36', memberId: '' })).toEqual({ status: 'accepted_suggestion', territoryId: 36, memberId: null });
    });

    it('沒選領地只送狀態', () => {
        expect(reviewBody('accepted_bug', { territoryId: '', memberId: '' })).toEqual({ status: 'accepted_bug' });
    });

    it('待審、不採計不帶領地（明給又帶領地後端回 409）', () => {
        expect(reviewBody('pending', { territoryId: '35', memberId: '5' })).toEqual({ status: 'pending' });
        expect(reviewBody('rejected', { territoryId: '35', memberId: '' })).toEqual({ status: 'rejected' });
    });

    it('只選成員不選領地：不送成員（只給 member_id 後端回 400），表單先擋', () => {
        const body = reviewBody('accepted_bug', { territoryId: '', memberId: '5' });
        expect(body).toEqual({ status: 'accepted_bug' });
        expect('memberId' in body).toBe(false);
        expect(targetError({ territoryId: '', memberId: '5' }, list)).toContain('先選領地');
    });

    it('成員要屬於選的領地', () => {
        expect(targetError({ territoryId: '35', memberId: '5' }, list)).toBe('');
        expect(targetError({ territoryId: '36', memberId: '5' }, list)).toContain('不屬於');
        expect(targetError({ territoryId: '36', memberId: '' }, list)).toBe('');
    });

    it('取消懸賞只送 territory_id: null，不帶成員與狀態', () => {
        expect(cancelBountyBody()).toEqual({ territoryId: null });
    });

    it('表單初值照現在的懸賞', () => {
        expect(targetOf(null)).toEqual({ territoryId: '', memberId: '' });
        expect(targetOf(bounty({ memberId: 5 }))).toEqual({ territoryId: '35', memberId: '5' });
        expect(targetOf(bounty({ territoryId: null, days: 7 }))).toEqual({ territoryId: '', memberId: '' });
    });
});

describe('賞金卡（api.md 29.5）', () => {
    const draft = { days: '7', territoryId: '', memberId: '', title: '' };

    it('判成不採計的不能按；已經有懸賞的可以重按', () => {
        expect(bountyBlocked({ status: 'pending' })).toBe('');
        expect(bountyBlocked({ status: 'accepted_bug' })).toBe('');
        expect(bountyBlocked({ status: 'rejected' })).toContain('不採計');
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

    it('已經有懸賞：改領地、改成員、補發天數可以；什麼都沒變擋下', () => {
        const current = bounty({ memberId: 5 });
        const same = { days: '0', territoryId: '35', memberId: '5', title: '' };
        expect(bountyError(same, false, current)).toContain('沒有要改');
        expect(bountyError({ ...same, territoryId: '36', memberId: '' }, false, current)).toBe('');
        expect(bountyError({ ...same, memberId: '' }, false, current)).toBe('');
        expect(bountyError({ ...same, days: '7' }, false, current)).toBe('');
    });

    it('天數一則只發一次', () => {
        const paid = bounty({ days: 7, perkId: 88 });
        expect(daysPaid(paid)).toBe(true);
        expect(daysPaid(bounty())).toBe(false);
        expect(daysPaid(null)).toBe(false);
        expect(bountyError({ days: '7', territoryId: '35', memberId: '', title: '' }, false, paid)).toContain('發過');
        expect(bountyError({ days: '0', territoryId: '36', memberId: '', title: '' }, false, paid)).toBe('');
    });

    it('送出的 body 不帶空的選填欄位，成員只跟著領地送', () => {
        expect(bountyBody(draft)).toEqual({ days: 7 });
        // 2026-11-20 起的預設：只署名（#791）；成員明給 null，重按不會沿用畫面上看不到的舊成員
        expect(bountyBody({ ...draft, days: '0', territoryId: '35' })).toEqual({ territoryId: 35, memberId: null });
        expect(bountyBody({ ...draft, days: '0', territoryId: '35', memberId: '5' })).toEqual({ territoryId: 35, memberId: 5 });
        expect(bountyBody({ days: '14', territoryId: '35', memberId: '', title: ' 全新格式 ' })).toEqual({ days: 14, territoryId: 35, memberId: null, title: '全新格式' });
        expect(bountyBody({ ...draft, days: '0', territoryId: '35', title: '只署名' })).toEqual({ territoryId: 35, memberId: null });
        // 只補天數、沒選領地：不送成員（只給 member_id 後端回 400）
        expect(bountyBody({ ...draft, memberId: '5' })).toEqual({ days: 7 });
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
