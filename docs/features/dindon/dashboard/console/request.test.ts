import type { ApiParam } from './catalog.schema';
import { describe, expect, it } from 'vitest';
import { GetApiCatalogParser } from './catalog.schema';
import { adminCallsInLastMinute, pushHistory, recordAdminCall } from './history';
import { buildQuery, checkBody, checkContract, confirmationFor, fetchFailureHint, fillPath, jsonErrorPosition, missingQuery, routeKey, statusMeaning, toCurl, toFetch, withAttachments } from './request';

function param(name: string, overrides: Partial<ApiParam> = {}): ApiParam {
    return { name, type: 'string', required: false, default: null, enum: [], description: '', example: null, ...overrides };
}

describe('網址', () => {
    it('路徑參數編碼後填進去，沒填的列出來', () => {
        expect(fillPath('/v1/admin/promo-codes/:code', { code: 'A B/1' })).toEqual({ path: '/v1/admin/promo-codes/A%20B%2F1', missing: [] });
        expect(fillPath('/v1/admin/feedback/:id/screenshots/:position', { id: '3' })).toEqual({ path: '/v1/admin/feedback/3/screenshots/:position', missing: ['position'] });
    });

    it('query 照目錄的順序，空的不帶；必填沒填的列出來', () => {
        const params = [param('status'), param('page', { required: true }), param('q')];
        expect(buildQuery(params, { q: ' 42 ', status: '', page: '2' })).toBe('?page=2&q=42');
        expect(buildQuery(params, {})).toBe('');
        expect(missingQuery(params, { status: 'all' })).toEqual(['page']);
    });

    it('參數名稱不同也算同一支', () => {
        expect(routeKey('GET', '/v1/admin/devices/:device_id')).toBe(routeKey('GET', '/v1/admin/devices/:id'));
    });
});

describe('body', () => {
    it('空白＝沒有 body；壞掉的 JSON 指出第幾行第幾字', () => {
        expect(checkBody('  ')).toEqual({ ok: true, value: undefined });
        expect(checkBody('{"a": 1}')).toEqual({ ok: true, value: { a: 1 } });
        const bad = checkBody('{\n  "a": 1,\n  "b": }');
        expect(bad.ok).toBe(false);
        if (!bad.ok) expect([bad.line, bad.column]).toEqual([3, 8]);
    });

    it('附加檔案：範例是陣列就放陣列，否則放單一值；其他欄位不動', () => {
        const files = [
            { field: 'screenshots', fileName: 'a.png', size: 1, base64: 'AAA' },
            { field: 'screenshots', fileName: 'b.png', size: 1, base64: 'BBB' },
            { field: 'image_base64', fileName: 'r.jpg', size: 1, base64: 'CCC' }
        ];
        expect(withAttachments({ kind: 'bug' }, files, { screenshots: [], image_base64: '' }))
            .toEqual({ kind: 'bug', screenshots: ['AAA', 'BBB'], image_base64: 'CCC' });
        expect(withAttachments({ kind: 'bug' }, [], {})).toEqual({ kind: 'bug' });
    });
});

describe('送出前確認', () => {
    const endpoint = (effect: 'read' | 'write' | 'irreversible' | 'ai') => ({ effect, method: 'POST' as const, path: '/x' });

    it('不可逆的不管哪個環境都要打字；寫入與 AI 只有正式環境問；唯讀不問', () => {
        expect(confirmationFor(endpoint('irreversible'), false)).toMatchObject({ kind: 'type', phrase: 'POST' });
        expect(confirmationFor(endpoint('write'), true)?.kind).toBe('click');
        expect(confirmationFor(endpoint('write'), false)).toBeNull();
        expect(confirmationFor(endpoint('ai'), true)?.message).toContain('Gemini');
        expect(confirmationFor(endpoint('read'), true)).toBeNull();
    });
});

describe('回應', () => {
    it('端點自己的錯誤說明優先，再來是通用的', () => {
        expect(statusMeaning(409, [{ status: 409, meaning: '這組碼已經有了' }])).toBe('這組碼已經有了');
        expect(statusMeaning(428, [])).toContain('綁 Google');
        expect(statusMeaning(418, [])).toBe('請求被拒絕');
    });

    it('沒有回應時：開了 CORS 的端點說網路，App 的端點說 CORS', () => {
        expect(fetchFailureHint('/v1/admin/devices')).toContain('連不上');
        expect(fetchFailureHint('/v1/me')).toContain('CORS');
    });

    it('契約檢查：後台在用的端點拿後台的 Parser 驗；錯誤回應與沒對應的不驗', () => {
        expect(checkContract('POST', '/v1/admin/devices/search', 200, { devices: null, total: 0, page: 1, per_page: 50 })).toEqual({ checked: true, ok: true });
        const bad = checkContract('GET', '/v1/admin/devices', 200, { devices: [{ id: 'x' }], total: 1, page: 1, per_page: 50 });
        expect(bad.checked && !bad.ok && bad.issues[0]).toContain('devices.0');
        expect(checkContract('GET', '/v1/admin/devices', 401, { error: 'x' })).toEqual({ checked: false });
        expect(checkContract('GET', '/v1/me', 200, {})).toEqual({ checked: false });
    });
});

describe('複製成指令', () => {
    const input = { method: 'POST', url: 'https://api.example/v1/feedback', auth: 'device' as const, body: { text: `it's` }, attachments: [{ field: 'screenshots', fileName: 'a.png', size: 1, base64: 'SECRETDATA' }] };

    it('curl：token 用環境變數、單引號跳脫、檔案換成說明', () => {
        const curl = toCurl(input);
        expect(curl).toContain('Bearer $DINDON_DEVICE_KEY');
        expect(curl).toContain(`it'\\''s`);
        expect(curl).toContain('<a.png 的 base64>');
        expect(curl).not.toContain('SECRETDATA');
    });

    it('不用認證的不帶 Authorization；沒有 body 的不帶 Content-Type', () => {
        const curl = toCurl({ method: 'GET', url: 'https://x/v1/devices', auth: 'none', body: undefined, attachments: [] });
        expect(curl).not.toContain('Authorization');
        expect(curl).not.toContain('Content-Type');
        expect(toFetch({ ...input, attachments: [] })).toContain('{DINDON_DEVICE_KEY}');
    });
});

describe('目錄', () => {
    it('欄位缺了給預設值：沒標 effect 的 GET 當唯讀、其他當寫入；沒列的章節補上；範例的 key 保持 snake_case', () => {
        const catalog = GetApiCatalogParser.parse({
            revision: 'dindon-backend-00030',
            groups: [{ id: 'admin', title: '管理' }],
            endpoints: [
                { id: 'admin.devices.list', group: 'admin', method: 'GET', path: '/v1/admin/devices', auth: 'admin', query: [{ name: 'per_page', type: 'integer', default: 50 }] },
                { id: 'me', group: 'app', method: 'POST', path: '/v1/profile', auth: 'device', body: { example: { image_base64: '…' }, base64_fields: ['image_base64'] }, response_example: { remaining_tokens: 1 } }
            ]
        });
        expect(catalog.endpoints[0]).toMatchObject({ effect: 'read', status: 'live', query: [{ name: 'per_page', default: 50, required: false }] });
        expect(catalog.endpoints[1]).toMatchObject({ effect: 'write', body: { example: { image_base64: '…' }, base64Fields: ['image_base64'] }, responseExample: { remaining_tokens: 1 } });
        expect(catalog.groups.map(group => group.id)).toEqual(['admin', 'app']);
        expect(catalog.conventionsMd).toBe('');
    });
});

describe('歷史與限流提醒', () => {
    it('新的在前、最多 50 筆；只數最近一分鐘的管理 API', () => {
        const entry = (id: string) => ({ id, endpointId: '', method: 'GET', path: '/', pathValues: {}, queryValues: {}, status: 200, ms: 1, at: '' });
        let list = [entry('a')];
        for (let i = 0; i < 60; i++) list = pushHistory(list, entry(String(i)));
        expect(list).toHaveLength(50);
        expect(list[0].id).toBe('59');

        recordAdminCall(1_000);
        recordAdminCall(50_000);
        expect(adminCallsInLastMinute(70_000)).toBe(1);
    });
});

describe('找出 JSON 錯在哪', () => {
    it('各種錯都指得出位置，正確的回 -1', () => {
        expect(jsonErrorPosition('{"a": [1, 2,]}')).toBe(12);
        expect(jsonErrorPosition('{"a": "x\ny"}')).toBe(8);
        expect(jsonErrorPosition('{"a": 01}')).toBe(7);
        expect(jsonErrorPosition('{"a": tru}')).toBe(6);
        expect(jsonErrorPosition('{"a": 1} x')).toBe(9);
        expect(jsonErrorPosition('{"a": "\\u00e9", "b": [true, null, -1.5e3]}')).toBe(-1);
    });
});
