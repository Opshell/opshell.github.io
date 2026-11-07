import { describe, expect, it } from 'vitest';
import { BatchReviewFeedbackPayload, CreateFeedbackPayload, GetDeviceDetailParser, GetDeviceListParser, GetFeatureCandidateListParser, GetFeedbackListParser, GetFeedbackStatsParser, GetUsageReportParser, PaymentsSummaryParser, SaveFeatureCandidatePayload, UpdateDevicePayload, UpdateFeedbackIssueParser } from './admin.schema';

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
});

describe('新功能投票的候選', () => {
    const raw = { id: 4, title: '匯出 CSV', description: '把帳目匯出成試算表\n可以選日期範圍', status: 'voting', votes: 12, created_by: 'admin@example.com', created_at: '2026-09-27T10:00:00Z', updated_at: '2026-09-27T10:00:00Z' };

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
