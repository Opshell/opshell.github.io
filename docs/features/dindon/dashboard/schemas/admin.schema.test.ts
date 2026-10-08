import { describe, expect, it } from 'vitest';
import { GetDeviceListParser, GetFeatureCandidateListParser, GetUsageReportParser, SaveFeatureCandidatePayload, UpdateDevicePayload } from './admin.schema';

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

    it('送出的修改轉回 snake_case', () => {
        expect(UpdateDevicePayload.parse({ tokensDelta: 5, bonusBugs: 3, ironAchievedOn: '2026-09-20', nickname: null }))
            .toEqual({ tokens_delta: 5, bonus_bugs: 3, iron_achieved_on: '2026-09-20', nickname: null });
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
