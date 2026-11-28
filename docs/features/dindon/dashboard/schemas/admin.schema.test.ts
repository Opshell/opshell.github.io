import { describe, expect, it } from 'vitest';
import { BatchReviewFeedbackPayload, BountyParser, BountyPayload, CreateFeedbackPayload, CreateTerritoryPayload, GetDeviceDetailParser, GetDeviceListParser, GetFeatureCandidateListParser, GetFeedbackEmailsParser, GetFeedbackListParser, GetFeedbackMessagesParser, GetFeedbackStatsParser, GetFrontierTerritoriesParser, GetUsageReportParser, PaymentsSummaryParser, ReviewFeedbackPayload, SaveFeatureCandidatePayload, SendFeedbackEmailParser, SendFeedbackEmailPayload, SendFeedbackMessageParser, SendFeedbackMessagePayload, UpdateDevicePayload, UpdateFeedbackIssueParser, UpdateTerritoryPayload } from './admin.schema';

// 後端是 Go：nil 的 slice、map 會送 null，沒設的指標欄位可能整個不送。這裡測的都是這類邊界

const rawDevice = {
    id: 7,
    plan_tier: 'lite',
    tokens: 120,
    beta_tester_since: '2026-09-01',
    linked: true,
    frozen: false,
    created_at: '2026-09-01T10:00:00+08:00',
    updated_at: '2026-09-28T10:00:00+08:00',
    ai_calls_30d: 42,
    display_name: '白老鼠 #7',
    bugs: 3,
    suggestions: 1,
    bonus_bugs: 0,
    bonus_suggestions: 0
};

const dist = { avg: 0, p50: 0, p90: 0, p95: 0, max: 0 };

const usageReport = {
    from: '2026-08-29T00:00:00+08:00',
    to: '2026-09-28T00:00:00+08:00',
    features: [],
    daily: [{
        date: '2026-09-27',
        requests: 5,
        ok: 5,
        rejected: 0,
        failed: 0,
        unique_devices: 1,
        cost_usd: 0,
        features: { recognize_receipt: { requests: 5, ok: 5, rejected: 0, failed: 0, cost_usd: 0 } }
    }],
    devices: {
        active_devices: 1,
        requests_per_device: dist,
        cost_usd_per_device: dist,
        quota_charged_per_device: dist,
        devices_hit_quota: 0,
        devices_hit_daily_limit: 0
    },
    models: null,
    notes: null
};

describe('裝置', () => {
    it('轉成 camelCase，沒送的可空欄位補成 null', () => {
        const list = GetDeviceListParser.parse({ devices: [rawDevice], total: 1, page: 1, per_page: 20 });
        expect(list.perPage).toBe(20);
        expect(list.devices[0]).toMatchObject({ planTier: 'lite', aiCalls30d: 42, displayName: '白老鼠 #7', email: null, avatar: null, ironAchievedOn: null });
    });

    it('devices 是 null（空資料庫）當成空清單', () => {
        expect(GetDeviceListParser.parse({ devices: null, total: 0, page: 1, per_page: 20 }).devices).toEqual([]);
    });

    it('不認得的方案要擋，不默默顯示', () => {
        expect(() => GetDeviceListParser.parse({ devices: [{ ...rawDevice, plan_tier: 'ultra' }], total: 1, page: 1, per_page: 20 })).toThrow();
        // 2026-10-08 方案變四個：max（深度）要收（溝通板 #0095）
        expect(GetDeviceListParser.parse({ devices: [{ ...rawDevice, plan_tier: 'max' }], total: 1, page: 1, per_page: 20 }).devices[0].planTier).toBe('max');
    });

    it('裝置細項：beta 期間的方案來源是 beta（#431，之前整頁回應格式不符）', () => {
        const detail = GetDeviceDetailParser.parse({ device: rawDevice, audit: null, perks: null, plan: { plan_tier: 'max', plan_source: 'beta' }, referrals: null });
        expect(detail.plan).toEqual({ planTier: 'max', planSource: 'beta' });
    });

    // #570：付款與徽章的欄位是 2026-11-05 才加的，舊後端整個沒送
    it('舊後端沒有付款與徽章欄位：補成沒訂閱、沒贊助、沒上傳，最長連續是 null（要自己讀打卡）', () => {
        const [device] = GetDeviceListParser.parse({ devices: [rawDevice], total: 1, page: 1, per_page: 20 }).devices;
        expect(device).toMatchObject({
            subscriptionState: null,
            autoRenewing: null,
            subscriptionBasePlan: null,
            subscriptionInTrial: null,
            supporter: false,
            donations: 0,
            donatedTiers: [],
            bestStreak: null,
            badges: { badges: [], memorials: [] }
        });
    });

    it('付款與徽章欄位轉成 camelCase，徽章裡的日期也轉', () => {
        const raw = {
            ...rawDevice,
            subscription_state: 'active',
            auto_renewing: false,
            subscription_base_plan: 'yearly',
            subscription_in_trial: true,
            supporter: true,
            donations: 2,
            donated_tiers: ['dindon_tip_1', 'dindon_tip_3'],
            best_streak: 21,
            badges: { badges: [{ id: 'RECORDS', tier: 'GOLD', unlocked_on: '2026-10-01' }], memorials: null }
        };
        const [device] = GetDeviceListParser.parse({ devices: [raw], total: 1, page: 1, per_page: 20 }).devices;
        expect(device).toMatchObject({ subscriptionState: 'active', autoRenewing: false, subscriptionBasePlan: 'yearly', subscriptionInTrial: true, donations: 2, bestStreak: 21 });
        expect(device.badges).toEqual({ badges: [{ id: 'RECORDS', tier: 'GOLD', unlockedOn: '2026-10-01' }], memorials: [] });
    });

    it('單台的贊助紀錄：沒退款是 null，舊後端沒有這個欄位是空陣列', () => {
        const detail = GetDeviceDetailParser.parse({
            device: rawDevice,
            audit: [],
            donation_records: [
                { product_id: 'dindon_tip_3', order_id: 'GPA.1', created_at: '2026-10-20T08:00:00Z' },
                { product_id: 'dindon_tip_1', order_id: 'GPA.2', created_at: '2026-10-09T02:30:00Z', refunded_at: '2026-10-12T00:00:00Z' }
            ]
        });
        expect(detail.donationRecords).toEqual([
            { productId: 'dindon_tip_3', orderId: 'GPA.1', createdAt: '2026-10-20T08:00:00Z', refundedAt: null },
            { productId: 'dindon_tip_1', orderId: 'GPA.2', createdAt: '2026-10-09T02:30:00Z', refundedAt: '2026-10-12T00:00:00Z' }
        ]);
        expect(GetDeviceDetailParser.parse({ device: rawDevice, audit: [] }).donationRecords).toEqual([]);
    });

    it('送出的修改轉回 snake_case', () => {
        expect(UpdateDevicePayload.parse({ tokensDelta: 5, bonusBugs: 3, ironAchievedOn: '2026-09-20', nickname: null }))
            .toEqual({ tokens_delta: 5, bonus_bugs: 3, iron_achieved_on: '2026-09-20', nickname: null });
    });
});

describe('付款總覽', () => {
    it('狀態與商品 ID 是資料不是欄位，key 原樣保留；空的 map 是 null 當成空物件', () => {
        const summary = PaymentsSummaryParser.parse({
            subscriptions: { subscribing: 3, by_state: { active: 2, canceled: 1, on_hold: 1 }, by_base_plan: null, in_trial: 1, auto_renew_off: 1 },
            donations: { by_tier: { dindon_tip_1: 4 }, refunded: 1, supporters: 5 }
        });
        expect(summary.subscriptions).toEqual({ subscribing: 3, byState: { active: 2, canceled: 1, on_hold: 1 }, byBasePlan: {}, inTrial: 1, autoRenewOff: 1 });
        expect(summary.donations.byTier).toEqual({ dindon_tip_1: 4 });
    });
});

describe('用量報表', () => {
    it('models、notes 是 null 也能解析（舊版會整頁空白）', () => {
        const report = GetUsageReportParser.parse(usageReport);
        expect(report.models).toEqual([]);
        expect(report.notes).toEqual([]);
    });

    it('逐日的功能名稱是資料不是欄位，key 原樣保留', () => {
        const [day] = GetUsageReportParser.parse(usageReport).daily;
        expect(day.uniqueDevices).toBe(1);
        expect(Object.keys(day.features)).toEqual(['recognize_receipt']);
        expect(day.features.recognize_receipt.costUsd).toBe(0);
    });

    it('逐日的 features 是 null 當成空物件', () => {
        const [day] = GetUsageReportParser.parse({ ...usageReport, daily: [{ ...usageReport.daily[0], features: null }] }).daily;
        expect(day.features).toEqual({});
    });

    // JEV 影子（api.md 第 8 節、usage-analytics.md「JEV 影子」，#918）：2026-11-27 以前的後端整個沒有這些欄位
    it('舊回應沒有 JEV：jev 是 null，逐日與測試的 jev_* 當成 0', () => {
        const report = GetUsageReportParser.parse({
            ...usageReport,
            test: { devices: 1, requests: 2, gemini_calls: 2, cost_usd: 0.001, canceled_cost_est_usd: 0, models: null, daily: [{ date: '2026-09-27', requests: 2, cost_usd: 0.001, canceled_cost_est_usd: 0 }] }
        });
        expect(report.jev).toBeNull();
        expect(report.daily[0]).toMatchObject({ jevCalls: 0, jevInputTokens: 0, jevCostUsd: 0 });
        expect(report.test).toMatchObject({ jevCalls: 0, jevCostUsd: 0 });
        expect(report.test.daily[0].jevCostUsd).toBe(0);
        // 連 test 都沒有的更舊回應，補的空值也要有 jev 欄位
        expect(GetUsageReportParser.parse(usageReport).test).toMatchObject({ jevCalls: 0, jevCostUsd: 0 });
    });

    it('有 JEV：轉成 camelCase，跟 Gemini 的 cost_usd 分開', () => {
        const jev = {
            model: 'jev-1.13.0',
            input_price_per_million_usd: 0.042,
            calls: 120,
            ok: 117,
            errors: 1,
            late: 2,
            input_tokens: 52000,
            cost_usd: 0.0022,
            late_cost_est_usd: 0.00004,
            latency_ms: { avg: 230, p50: 210, p90: 380, p95: 450, max: 900 },
            p_yes_buckets: [70, 3, 1, 0, 2, 1, 2, 3, 5, 30]
        };
        const report = GetUsageReportParser.parse({
            ...usageReport,
            daily: [{ ...usageReport.daily[0], cost_usd: 0.01, jev_calls: 4, jev_input_tokens: 1800, jev_cost_usd: 0.0000756 }],
            test: { devices: 1, requests: 2, gemini_calls: 2, cost_usd: 0.001, canceled_cost_est_usd: 0, jev_calls: 3, jev_cost_usd: 0.00005, models: [], daily: [{ date: '2026-09-27', requests: 2, cost_usd: 0.001, canceled_cost_est_usd: 0, jev_cost_usd: 0.00005 }] },
            jev
        });
        expect(report.jev).toMatchObject({ model: 'jev-1.13.0', inputPricePerMillionUsd: 0.042, lateCostEstUsd: 0.00004, inputTokens: 52000, latencyMs: { p95: 450 } });
        expect(report.jev?.pYesBuckets).toHaveLength(10);
        expect(report.daily[0]).toMatchObject({ costUsd: 0.01, jevCalls: 4, jevInputTokens: 1800, jevCostUsd: 0.0000756 });
        expect(report.test).toMatchObject({ jevCalls: 3, jevCostUsd: 0.00005 });
        expect(report.test.daily[0].jevCostUsd).toBe(0.00005);
    });
});

describe('新功能投票的候選', () => {
    const raw = { id: 4, title: '匯出 CSV', description: '把帳目匯出成試算表\n可以選日期範圍', status: 'voting', event: 'frontier', votes: 12, created_by: 'admin@example.com', created_at: '2026-09-27T10:00:00Z', updated_at: '2026-09-27T10:00:00Z' };

    it('轉成 camelCase；說明的換行保留，null 當成空字串', () => {
        const list = GetFeatureCandidateListParser.parse({ max_votes: 3, features: [raw, { ...raw, id: 5, description: null }] });
        expect(list.maxVotes).toBe(3);
        expect(list.features[0]).toMatchObject({ createdBy: 'admin@example.com', description: '把帳目匯出成試算表\n可以選日期範圍' });
        expect(list.features[1].description).toBe('');
    });

    it('features 是 null 當成空清單；不認得的狀態要擋', () => {
        expect(GetFeatureCandidateListParser.parse({ max_votes: 3, features: null }).features).toEqual([]);
        expect(() => GetFeatureCandidateListParser.parse({ max_votes: 3, features: [{ ...raw, status: 'archived' }] })).toThrow();
    });

    it('帶著活動（#849）；不認得的活動要擋', () => {
        expect(GetFeatureCandidateListParser.parse({ max_votes: 3, features: [raw, { ...raw, id: 5, event: 'beta' }] }).features.map(feature => feature.event)).toEqual(['frontier', 'beta']);
        expect(() => GetFeatureCandidateListParser.parse({ max_votes: 3, features: [{ ...raw, event: 'summer' }] })).toThrow();
    });

    it('字數照字元算，跟後端的 rune 一致：emoji 算一個字', () => {
        expect(SaveFeatureCandidatePayload.safeParse({ title: '🎉'.repeat(40) }).success).toBe(true);
        expect(SaveFeatureCandidatePayload.safeParse({ title: '字'.repeat(41) }).success).toBe(false);
        expect(SaveFeatureCandidatePayload.safeParse({ description: '字'.repeat(300) }).success).toBe(true);
        expect(SaveFeatureCandidatePayload.safeParse({ description: '字'.repeat(301) }).success).toBe(false);
    });

    it('標題不能空白、不能換行；說明可以換行；前後空白去掉', () => {
        expect(SaveFeatureCandidatePayload.safeParse({ title: '   ' }).success).toBe(false);
        expect(SaveFeatureCandidatePayload.safeParse({ title: '第一行\n第二行' }).success).toBe(false);
        expect(SaveFeatureCandidatePayload.parse({ title: ' 匯出 ', description: '第一行\n第二行 ' })).toEqual({ title: '匯出', description: '第一行\n第二行' });
    });

    it('只給狀態也行（只送改過的欄位）', () => {
        expect(SaveFeatureCandidatePayload.parse({ status: 'dropped' })).toEqual({ status: 'dropped' });
    });
});

describe('回報的處理狀況與沒綁定的回報者（Flowsker #61）', () => {
    const rawReport = {
        id: 1,
        device_id: 42,
        device_name: '阿明',
        kind: 'bug',
        status: 'accepted_bug',
        description: '儲存沒反應',
        app_version: '',
        device_model: '',
        android_version: '',
        screenshots: null,
        created_at: '2026-10-01T00:00:00Z'
    };
    const list = (report: object) => GetFeedbackListParser.parse({ reports: [report], total: 1, page: 1, per_page: 50 }).reports[0];

    it('舊後端沒有這三個欄位：當成還沒處理、有綁定', () => {
        expect(list(rawReport)).toMatchObject({ progress: 'open', fixedIn: null, reporterName: null });
    });

    it('沒綁定的：device_id 是 0、名字在 reporter_name', () => {
        expect(list({ ...rawReport, device_id: 0, reporter_name: '小美', progress: 'done', fixed_in: '0.7.20', source: 'line' }))
            .toMatchObject({ deviceId: 0, reporterName: '小美', progress: 'done', fixedIn: '0.7.20' });
    });

    it('統計：by_progress 的 key 不轉駝峰；舊後端沒有的欄位有預設值', () => {
        const base = { total: 3, by_status: null, by_kind: null, per_day: null, participants: 2, accepted_without_issue: 1 };
        expect(GetFeedbackStatsParser.parse(base)).toMatchObject({ byProgress: {}, acceptedOpen: null, unboundReporters: 0 });
        expect(GetFeedbackStatsParser.parse({ ...base, by_progress: { in_progress: 2 }, accepted_open: 5, unbound_reporters: 1 }))
            .toMatchObject({ byProgress: { in_progress: 2 }, acceptedOpen: 5, unboundReporters: 1 });
    });

    it('建立回報：裝置與名字擇一', () => {
        const body = { kind: 'bug' as const, description: '儲存沒反應', source: 'line' as const };
        expect(CreateFeedbackPayload.parse({ ...body, reporterName: '小美' })).toMatchObject({ reporter_name: '小美' });
        expect(() => CreateFeedbackPayload.parse(body)).toThrow();
        expect(() => CreateFeedbackPayload.parse({ ...body, deviceId: 1, reporterName: '小美' })).toThrow();
    });

    it('批次：勾選的可以只改處理狀況；什麼都沒改要擋', () => {
        expect(BatchReviewFeedbackPayload.parse({ reportIds: [1], progress: 'done', fixedIn: '0.7.20' })).toEqual({ report_ids: [1], progress: 'done', fixed_in: '0.7.20' });
        expect(() => BatchReviewFeedbackPayload.parse({ reportIds: [1] })).toThrow();
    });

    it('改問題：回應帶一起改了幾則回報', () => {
        const issue = { id: 3, title: '儲存', weight: 2, note: '', created_by: 'a', created_at: '2026-10-01T00:00:00Z', progress: 'done', fixed_in: null };
        expect(UpdateFeedbackIssueParser.parse({ issue, reports_updated: 5 })).toMatchObject({ reportsUpdated: 5, issue: { progress: 'done', fixedIn: null } });
    });
});

describe('回報的來往訊息與寄信（Flowsker #600、#457）', () => {
    const rawReport = {
        id: 1,
        device_id: 2,
        device_name: 'a',
        kind: 'bug',
        status: 'pending',
        description: 'x',
        app_version: '',
        device_model: '',
        android_version: '',
        created_at: '2026-11-08T09:00:00Z'
    };
    const list = (report: object) => GetFeedbackListParser.parse({ reports: [report], total: 1, page: 1, per_page: 50 }).reports[0];

    it('awaiting_reply 照給，舊後端沒有當成 false', () => {
        expect(list({ ...rawReport, awaiting_reply: true }).awaitingReply).toBe(true);
        expect(list(rawReport).awaitingReply).toBe(false);
    });

    const appIn = { id: 2, channel: 'app', direction: 'in', body: '是在記帳扇', status: 'received', actor: null, draft_id: null, read_at: null, created_at: '2026-11-08T10:01:00Z', from: null, to: null, subject: null };
    const emailOut = {
        id: 1,
        channel: 'email',
        direction: 'out',
        body: '想請問',
        status: 'sent',
        actor: 'boss@example.com',
        draft_id: 'd1',
        read_at: '2026-11-08T10:00:00Z',
        created_at: '2026-11-08T09:00:00Z',
        from: '叮咚記帳 <support@dindon.opshell.me>',
        to: 'user@gmail.com',
        subject: '主旨'
    };

    it('兩個管道合在一起，camelCase 給元件', () => {
        const result = GetFeedbackMessagesParser.parse({ messages: [emailOut, appIn], can_reply_in_app: true, cannot_reply_in_app_reason: null });
        expect(result.canReplyInApp).toBe(true);
        expect(result.messages[0]).toMatchObject({ channel: 'email', draftId: 'd1', readAt: '2026-11-08T10:00:00Z', to: 'user@gmail.com' });
        expect(result.messages[1]).toMatchObject({ channel: 'app', actor: null, from: null, subject: null });
    });
    it('go 的 nil：messages 是 null、指標欄位整個不送也接', () => {
        const { actor, draft_id, read_at, from, to, subject, ...bare } = appIn;
        const result = GetFeedbackMessagesParser.parse({ messages: null, can_reply_in_app: false, cannot_reply_in_app_reason: '沒有綁定裝置' });
        expect(result).toEqual({ messages: [], canReplyInApp: false, cannotReplyInAppReason: '沒有綁定裝置' });
        expect(GetFeedbackMessagesParser.parse({ messages: [bare], can_reply_in_app: true }).messages[0]).toMatchObject({ actor: null, draftId: null, readAt: null, from: null });
    });
    it('沒見過的管道或狀態要報錯，不要默默顯示', () => {
        expect(GetFeedbackMessagesParser.safeParse({ messages: [{ ...appIn, channel: 'line' }], can_reply_in_app: true }).success).toBe(false);
        expect(GetFeedbackMessagesParser.safeParse({ messages: [{ ...appIn, status: 'queued' }], can_reply_in_app: true }).success).toBe(false);
    });
    it('在 App 裡回：送 draft_id，duplicate 沒有當 false', () => {
        expect(SendFeedbackMessagePayload.parse({ body: '內容', draftId: 'abc' })).toEqual({ body: '內容', draft_id: 'abc' });
        expect(SendFeedbackMessageParser.parse({ message: appIn }).duplicate).toBe(false);
        expect(SendFeedbackMessageParser.parse({ message: appIn, duplicate: true }).duplicate).toBe(true);
    });

    const rawEmail = { id: 1, direction: 'out', from: 'f', to: 'user@gmail.com', subject: '主旨', body: '內文', status: 'sent', actor: 'boss@example.com', created_at: '2026-10-31T09:00:00Z' };
    it('統計的等你回件數：照給，舊後端沒有當 0', () => {
        const base = { total: 3, by_status: null, by_kind: null, per_day: null, participants: 2, accepted_without_issue: 1 };
        expect(GetFeedbackStatsParser.parse({ ...base, awaiting_reply: 4 }).awaitingReply).toBe(4);
        expect(GetFeedbackStatsParser.parse(base).awaitingReply).toBe(0);
    });

    it('寄信：寄不了時 to 是 null、原因是字串，emails 是 null 也接', () => {
        expect(GetFeedbackEmailsParser.parse({ emails: null, can_send: false, to: null, cannot_send_reason: '沒有綁定' }))
            .toEqual({ emails: [], canSend: false, to: null, cannotSendReason: '沒有綁定' });
    });
    it('寄信：draft_id 有就帶，舊後端沒回當成 null', () => {
        const result = GetFeedbackEmailsParser.parse({ emails: [{ ...rawEmail, status: 'failed', draft_id: 'abc' }, rawEmail], can_send: true, to: 'a', cannot_send_reason: null });
        expect(result.emails.map(e => e.draftId)).toEqual(['abc', null]);
    });
    it('寄信：送出的 draftId 轉成 draft_id，duplicate 照給', () => {
        expect(SendFeedbackEmailPayload.parse({ subject: '', body: '內文', draftId: 'abc' })).toEqual({ subject: '', body: '內文', draft_id: 'abc' });
        expect(SendFeedbackEmailParser.parse({ email: rawEmail, duplicate: true }).duplicate).toBe(true);
        expect(SendFeedbackEmailParser.parse({ email: rawEmail }).duplicate).toBe(false);
    });
});

describe('拓荒季（api.md 第 29 節，Flowsker #706）', () => {
    const rawTerritory = {
        id: 35,
        name: '街口支付',
        kind: 'payment',
        status: 'wanted',
        tamed_in: null,
        note: '',
        pioneer: null,
        pioneer_device_id: null,
        pioneer_feedback_id: null,
        pioneer_set_at: null,
        sort_order: 35,
        created_at: '2026-11-17T00:00:00Z',
        updated_at: '2026-11-17T00:00:00Z'
    };
    const rawBounty = { id: 3, feedback_id: 123, device_id: 42, territory_id: 35, perk_id: 88, days: 7, created_by: 'admin@example.com', created_at: '2026-12-03T05:00:00Z' };

    it('季還沒定是 null；Go 的 nil slice 補空陣列', () => {
        expect(GetFrontierTerritoriesParser.parse({ season: null, progress: { tamed: 0, total: 0 }, territories: null }))
            .toEqual({ season: null, progress: { tamed: 0, total: 0 }, territories: [] });
    });

    it('領地與季轉駝峰', () => {
        const result = GetFrontierTerritoriesParser.parse({
            season: { starts_on: '2026-12-01', ends_on: '2026-12-30', starts_at: '2026-11-30T16:00:00Z', ends_at: '2026-12-30T16:00:00Z', days: 30, state: 'upcoming' },
            progress: { tamed: 10, total: 44 },
            territories: [rawTerritory, { ...rawTerritory, id: 6, status: 'tamed', tamed_in: '1.0.0', pioneer: '阿明', pioneer_device_id: 42, pioneer_feedback_id: 123 }]
        });
        expect(result.season).toMatchObject({ startsOn: '2026-12-01', state: 'upcoming' });
        expect(result.territories[0]).toMatchObject({ id: 35, tamedIn: null, pioneer: null, sortOrder: 35 });
        expect(result.territories[1]).toMatchObject({ tamedIn: '1.0.0', pioneer: '阿明', pioneerDeviceId: 42, pioneerFeedbackId: 123 });
    });

    it('送出轉 snake_case；修改至少一個欄位', () => {
        expect(CreateTerritoryPayload.parse({ name: '街口支付', kind: 'payment', tamedIn: null, sortOrder: 50 }))
            .toEqual({ name: '街口支付', kind: 'payment', tamed_in: null, sort_order: 50 });
        expect(UpdateTerritoryPayload.parse({ pioneerDeviceId: null })).toEqual({ pioneer_device_id: null });
        expect(UpdateTerritoryPayload.safeParse({}).success).toBe(false);
        expect(BountyPayload.parse({ days: 7, territoryId: 35 })).toEqual({ days: 7, territory_id: 35 });
    });

    it('成員（#839）：沒有是 []，轉駝峰；賞金記的成員沒有是 null', () => {
        const result = GetFrontierTerritoriesParser.parse({
            season: null,
            progress: { tamed: 0, total: 1 },
            territories: [{ ...rawTerritory, members: [{ id: 5, code: 'payment', name: '付款', status: 'wanted', tamed_in: null, sort_order: 3 }] }, rawTerritory]
        });
        expect(result.territories[0].members).toEqual([{ id: 5, code: 'payment', name: '付款', status: 'wanted', tamedIn: null }]);
        expect(result.territories[1].members).toEqual([]);
        expect(BountyParser.parse({ bounty: rawBounty, perk: null, territory: null, pioneer_set: false }).bounty.memberId).toBeNull();
        expect(BountyParser.parse({ bounty: { ...rawBounty, member_id: 5 }, perk: null, territory: null, pioneer_set: true }).bounty.memberId).toBe(5);
    });

    it('採計成懸賞的 body（#871）：null 照送，0 擋下', () => {
        expect(ReviewFeedbackPayload.parse({ status: 'accepted_bug', territoryId: 35, memberId: null }))
            .toEqual({ status: 'accepted_bug', territory_id: 35, member_id: null });
        expect(ReviewFeedbackPayload.parse({ territoryId: null })).toEqual({ territory_id: null });
        expect(ReviewFeedbackPayload.safeParse({ territoryId: 0 }).success).toBe(false);
        expect(BountyPayload.parse({ territoryId: 35, memberId: null })).toEqual({ territory_id: 35, member_id: null });
    });

    it('發賞金的回應：只署名時 perk 是 null', () => {
        const result = BountyParser.parse({ bounty: { ...rawBounty, perk_id: null, days: 0 }, perk: null, territory: rawTerritory, pioneer_set: true });
        expect(result).toMatchObject({ perk: null, pioneerSet: true, bounty: { perkId: null, days: 0 }, territory: { id: 35 } });
        const withPerk = BountyParser.parse({
            bounty: rawBounty,
            perk: { id: 88, device_id: 42, source: 'frontier', source_ref: 'feedback:123', title: '拓荒季賞金：街口支付', plan_tier: 'pro', months: 0, days: 7, starts_on: '2026-12-03T00:00:00Z', revoked_at: null, created_at: '2026-12-03T05:00:00Z' },
            territory: null,
            pioneer_set: false
        });
        expect(withPerk.perk).toMatchObject({ sourceRef: 'feedback:123', planTier: 'pro', revokedAt: null });
    });

    it('回報多了 topic 與 bounty；舊後端沒有就是 null', () => {
        const base = { id: 1, device_id: 42, device_name: '阿明', kind: 'bug', status: 'pending', description: '', app_version: '', device_model: '', android_version: '', created_at: '2026-11-17T00:00:00Z' };
        const list = (report: object) => GetFeedbackListParser.parse({ reports: [report], total: 1, page: 1, per_page: 50 }).reports[0];
        expect(list(base)).toMatchObject({ topic: null, bounty: null });
        expect(list({ ...base, topic: 'missed_notification', bounty: rawBounty })).toMatchObject({ topic: 'missed_notification', bounty: { feedbackId: 123, perkId: 88 } });
    });

    it('裝置詳情的權益認得 frontier 來源', () => {
        const perk = { id: 88, title: '拓荒季賞金', source: 'frontier', plan_tier: 'pro', months: 0, days: 7, status: 'active', starts_on: '2026-12-03', ends_on: '2026-12-10' };
        const detail = GetDeviceDetailParser.parse({ device: rawDevice, audit: null, perks: [perk], plan: { plan_tier: 'pro', plan_source: 'perk' }, referrals: null });
        expect(detail.perks[0].source).toBe('frontier');
    });
});
