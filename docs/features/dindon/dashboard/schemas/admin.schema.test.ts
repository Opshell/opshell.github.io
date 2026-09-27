import { describe, expect, it } from 'vitest';
import { GetDeviceListParser, GetUsageReportParser, UpdateDevicePayload } from './admin.schema';

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
        expect(() => GetDeviceListParser.parse({ devices: [{ ...rawDevice, plan_tier: 'max' }], total: 1, page: 1, per_page: 20 })).toThrow();
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
