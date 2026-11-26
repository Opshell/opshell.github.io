import type { GlobalSettingItem } from './schemas/admin.schema';
import { describe, expect, it } from 'vitest';
import { buildPatch, changeSummary, confirmReasons, dailyCost, editProblem, formatReadonlyValue, formatSettingValue, outOfRange, parseIntEdit, valueAfter } from './globalSettings';
import { GlobalSettingsParser, UpdateGlobalSettingsPayload } from './schemas/admin.schema';

// 照 api.md 第 8 節「全域設定」的範例回應
const RAW = {
    groups: [
        { key: 'ai_daily', name: 'AI 每日上限' },
        { key: 'switch', name: '開關' }
    ],
    items: [
        {
            key: 'ai_daily_limit_total',
            name: '全服務每日 AI 上限',
            description: '整個服務一天的 AI 呼叫加總',
            group: 'ai_daily',
            type: 'int',
            unit: '次／天',
            value: 3000,
            source: 'env',
            admin_value: null,
            fallback: 3000,
            fallback_source: 'env',
            default: 3000,
            min: 0,
            max: 30000,
            env: 'AI_DAILY_LIMIT_TOTAL',
            used_today: 412,
            cost_estimate: { typical_usd_per_1000: 2.1, worst_usd_per_1000: 33.3, note: '估算，以 Google Cloud 帳單為準。' }
        },
        {
            key: 'new_device_daily_limit',
            name: '新裝置每日 AI 上限',
            group: 'ai_daily',
            type: 'int',
            unit: '次／天',
            value: 30,
            source: 'admin',
            admin_value: 30,
            fallback: 0,
            fallback_source: 'default',
            default: 0,
            min: 0,
            max: 2000,
            env: ''
        },
        {
            key: 'referral_active',
            name: '邀請好友',
            group: 'switch',
            type: 'bool',
            unit: '',
            value: false,
            source: 'default',
            admin_value: null,
            fallback: false,
            fallback_source: 'default',
            default: false,
            min: null,
            max: null,
            env: 'REFERRAL_ACTIVE'
        }
    ],
    readonly: [
        { key: 'official_launch_date', name: '正式版上線日', env: 'OFFICIAL_LAUNCH_DATE', value: '2026-11-26', secret: false, set: true, reason: '…' },
        { key: 'frontier_season_days', name: '拓荒季天數', env: 'FRONTIER_SEASON_DAYS', value: 0, secret: false, set: false, reason: '…' },
        { key: 'beta_mode', name: 'beta 模式', env: 'BETA_MODE', value: false, secret: false, set: true, reason: '…' },
        { key: 'gemini_api_key', name: 'Gemini 金鑰', env: 'GEMINI_API_KEY', value: null, secret: true, set: true, reason: '機密不進資料庫' }
    ],
    updated_by: null,
    updated_at: null,
    cache_ttl_seconds: 30
};

const settings = GlobalSettingsParser.parse(RAW);
const [total, newDevice, referral] = settings.items as [GlobalSettingItem, GlobalSettingItem, GlobalSettingItem];

describe('globalSettingsParser', () => {
    it('照 api.md 的範例解析成 camelCase，缺的 description 補空字串', () => {
        expect(settings.cacheTtlSeconds).toBe(30);
        expect(settings.updatedBy).toBe('');
        expect(settings.updatedAt).toBeNull();
        expect(total.usedToday).toBe(412);
        expect(total.costEstimate?.typicalUsdPer1000).toBe(2.1);
        expect(total.fallbackSource).toBe('env');
        expect(newDevice.description).toBe('');
        expect(newDevice.usedToday).toBeUndefined();
        expect(newDevice.costEstimate).toBeUndefined();
        expect(settings.readonly[3].secret).toBe(true);
    });

    it('go 的 nil slice（null）補成空陣列', () => {
        const empty = GlobalSettingsParser.parse({ groups: null, items: null, readonly: null, updated_by: null, updated_at: null, cache_ttl_seconds: 30 });
        expect(empty.items).toEqual([]);
        expect(empty.readonly).toEqual([]);
    });

    it('來源不認得就不收（後端格式變了要知道）', () => {
        const bad = { ...RAW, items: [{ ...RAW.items[0], source: 'secret_manager' }] };
        expect(GlobalSettingsParser.safeParse(bad).success).toBe(false);
    });

    it('送出的 PATCH 內容：整數、開關、null 都收，小數與空物件不收', () => {
        expect(UpdateGlobalSettingsPayload.parse({ ai_daily_limit_total: 5000, referral_active: true, max_cap_search: null }))
            .toEqual({ ai_daily_limit_total: 5000, referral_active: true, max_cap_search: null });
        expect(UpdateGlobalSettingsPayload.safeParse({ ai_daily_limit_total: 1.5 }).success).toBe(false);
        expect(UpdateGlobalSettingsPayload.safeParse({}).success).toBe(false);
    });
});

describe('顯示', () => {
    it('數字帶單位、開關寫開關', () => {
        expect(formatSettingValue(total, 3000)).toBe('3,000 次／天');
        expect(formatSettingValue(referral, true)).toBe('開');
    });

    it('唯讀項目：機密只說有沒有設，其他照型別', () => {
        expect(settings.readonly.map(formatReadonlyValue)).toEqual(['2026-11-26', '0', '關', '有設']);
    });

    it('環境變數設超過範圍不是錯，只標出來', () => {
        expect(outOfRange({ ...total, value: 50000 })).toBe(true);
        expect(outOfRange(total)).toBe(false);
        expect(outOfRange(referral)).toBe(false);
    });

    it('估算花費照上限次數換算', () => {
        expect(dailyCost(total.costEstimate!, 3000)).toEqual({ typical: 'US$6.30', worst: 'US$99.90' });
    });
});

describe('editProblem', () => {
    it('要整數、在範圍內（含兩端）', () => {
        expect(parseIntEdit(' 12 ')).toBe(12);
        expect(parseIntEdit('1.5')).toBeNull();
        expect(editProblem(total, '')).toBe('要填整數');
        expect(editProblem(total, 'abc')).toBe('要填整數');
        expect(editProblem(total, '30001')).toContain('範圍');
        expect(editProblem(total, '-1')).toContain('範圍');
        expect(editProblem(total, '30000')).toBe('');
        expect(editProblem(total, '0')).toBe('');
    });

    it('沒改、清掉、開關都沒有範圍問題', () => {
        expect(editProblem(total, undefined)).toBe('');
        expect(editProblem(total, null)).toBe('');
        expect(editProblem(referral, true)).toBe('');
    });
});

describe('buildPatch', () => {
    it('只送真的有變的；一次可改多項', () => {
        expect(buildPatch(settings.items, { ai_daily_limit_total: '5000', new_device_daily_limit: null, referral_active: true }))
            .toEqual({ ai_daily_limit_total: 5000, new_device_daily_limit: null, referral_active: true });
    });

    it('改回跟現在一樣的不送：不要把環境變數的值釘成後台的值', () => {
        expect(buildPatch(settings.items, { ai_daily_limit_total: '3000', new_device_daily_limit: '30', referral_active: false })).toEqual({});
    });

    it('後台沒設的清掉不送；不合法的值不送', () => {
        expect(buildPatch(settings.items, { ai_daily_limit_total: null })).toEqual({});
        expect(buildPatch(settings.items, { ai_daily_limit_total: '99999' })).toEqual({});
    });

    it('清掉之後回到 fallback', () => {
        expect(valueAfter(newDevice, null)).toBe(0);
        expect(valueAfter(newDevice, 50)).toBe(50);
        expect(changeSummary(settings.items, { new_device_daily_limit: null })[0].to).toBe('清掉，回到 0 次／天（預設）');
    });
});

describe('confirmReasons', () => {
    it('全服務上限調到今天已用次數以下（含等於）要確認，帶已用次數', () => {
        expect(confirmReasons(settings.items, { ai_daily_limit_total: 400 })[0]).toContain('412');
        expect(confirmReasons(settings.items, { ai_daily_limit_total: 412 })).toHaveLength(1);
        expect(confirmReasons(settings.items, { ai_daily_limit_total: 413 })).toEqual([]);
    });

    it('查不到今天用量時不跳（沒有數字可以比）', () => {
        const items = settings.items.map(item => (item.key === total.key ? { ...item, usedToday: undefined } : item));
        expect(confirmReasons(items, { ai_daily_limit_total: 0 })).toEqual([]);
    });

    it('邀請開關開或關都要確認', () => {
        expect(confirmReasons(settings.items, { referral_active: true })[0]).toContain('上線前注意');
        expect(confirmReasons(settings.items, { referral_active: false })).toHaveLength(1);
        expect(confirmReasons(settings.items, { new_device_daily_limit: 10 })).toEqual([]);
    });
});
