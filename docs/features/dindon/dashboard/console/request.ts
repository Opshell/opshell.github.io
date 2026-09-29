import type { z } from 'zod';
import type { ApiAuth, ApiEffect, ApiEndpoint, ApiErrorCase, ApiParam } from './catalog.schema';
import {
    BatchReviewFeedbackParser,
    CreateFeedbackIssueParser,
    CreateFeedbackParser,
    GetDeviceDetailParser,
    GetDeviceListParser,
    GetFeatureCandidateListParser,
    GetFeedbackIssueListParser,
    GetFeedbackListParser,
    GetFeedbackParser,
    GetFeedbackStatsParser,
    GetPromoCodeListParser,
    GetPromoCodeParser,
    GetUsageByDeviceParser,
    GetUsageReportParser,
    SaveFeatureCandidateParser,
    SavePromoCodeParser,
    TriageFeedbackParser,
    UpdateDeviceParser
} from '../schemas/admin.schema';

// API 控制台（#0074）的純邏輯：組網址、檢查 JSON、產生 curl、判斷送出前要不要確認、解釋狀態碼、契約檢查。
// 畫面在 components/ApiConsole.vue。

// #region [P] 網址

/** /v1/admin/devices/:id + { id: 42 } → /v1/admin/devices/42。沒填的參數列在 missing */
export function fillPath(path: string, values: Record<string, string>): { path: string; missing: string[] } {
    const missing: string[] = [];
    const filled = path.replace(/:([a-z_]\w*)/gi, (_, name: string) => {
        const value = values[name]?.trim() ?? '';
        if (!value) {
            missing.push(name);
            return `:${name}`;
        }
        return encodeURIComponent(value);
    });
    return { path: filled, missing };
}

/** 空的不帶；照目錄的順序，網址讀起來跟說明一致 */
export function buildQuery(params: ApiParam[], values: Record<string, string>): string {
    const query = new URLSearchParams();
    for (const param of params) {
        const value = values[param.name]?.trim() ?? '';
        if (value) query.set(param.name, value);
    }
    const text = query.toString();
    return text ? `?${text}` : '';
}

/** 必填但沒填的 query 參數 */
export const missingQuery = (params: ApiParam[], values: Record<string, string>) =>
    params.filter(param => param.required && !values[param.name]?.trim()).map(param => param.name);

/** 端點的路徑形狀，參數名稱不算：/v1/admin/devices/:id 與 /v1/admin/devices/:device_id 是同一支 */
export const routeKey = (method: string, path: string) => `${method} ${path.replace(/:[^/]+/g, ':')}`;

// #endregion

// #region [P] body

/**
 * JSON 第一個錯在哪（字元位置）。瀏覽器的錯誤訊息不一定附位置（V8 新版常常只說 Unexpected token），
 * 所以自己掃一次：只找位置，解析還是交給 JSON.parse
 */
export function jsonErrorPosition(text: string): number {
    let i = 0;
    const fail = () => {
        throw i;
    };
    const space = () => {
        while (i < text.length && ' \t\n\r'.includes(text[i])) i++;
    };
    const literal = (word: string) => {
        if (text.startsWith(word, i)) i += word.length;
        else fail();
    };
    const string = () => {
        i++;
        while (i < text.length && text[i] !== '"') {
            if (text[i] === '\\') {
                i++;
                if (text[i] === 'u' && !/^[\da-f]{4}$/i.test(text.slice(i + 1, i + 5))) fail();
                else if (!'"\\/bfnrtu'.includes(text[i] ?? '')) fail();
                i += text[i] === 'u' ? 5 : 1;
            } else if (text.charCodeAt(i) < 0x20) {
                fail();
            } else {
                i++;
            }
        }
        if (i >= text.length) fail();
        i++;
    };
    const number = () => {
        const match = text.slice(i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?/i);
        if (!match?.[0] || match[0] === '-') fail();
        i += match![0].length;
    };
    const value = (): void => {
        space();
        const char = text[i];
        if (char === '{') {
            i++;
            space();
            if (text[i] === '}') {
                i++;
                return;
            }
            for (;;) {
                space();
                if (text[i] !== '"') fail();
                string();
                space();
                if (text[i] !== ':') fail();
                i++;
                value();
                space();
                if (text[i] === ',') {
                    i++;
                    continue;
                }
                if (text[i] === '}') {
                    i++;
                    return;
                }
                fail();
            }
        }
        if (char === '[') {
            i++;
            space();
            if (text[i] === ']') {
                i++;
                return;
            }
            for (;;) {
                value();
                space();
                if (text[i] === ',') {
                    i++;
                    continue;
                }
                if (text[i] === ']') {
                    i++;
                    return;
                }
                fail();
            }
        }
        if (char === '"') return string();
        if (char === 't') return literal('true');
        if (char === 'f') return literal('false');
        if (char === 'n') return literal('null');
        if (char === '-' || (char >= '0' && char <= '9')) return number();
        fail();
    };
    try {
        value();
        space();
        return i < text.length ? i : -1;
    } catch (position) {
        return position as number;
    }
}

export type BodyCheck = { ok: true; value: unknown } | { ok: false; message: string; line: number | null; column: number | null };

/** 檢查編輯器裡的 JSON。錯誤指出第幾行第幾字，空白＝沒有 body */
export function checkBody(text: string): BodyCheck {
    if (!text.trim()) return { ok: true, value: undefined };
    try {
        return { ok: true, value: JSON.parse(text) };
    } catch (error) {
        // 訊息裡會把整段 JSON 貼回來，只留第一句
        const message = (error instanceof Error ? error.message : String(error)).split(/, "|\n/)[0];
        const position = jsonErrorPosition(text);
        if (position < 0) return { ok: false, message, line: null, column: null };
        const before = text.slice(0, position).split('\n');
        return { ok: false, message, line: before.length, column: before.at(-1)!.length + 1 };
    }
}

/** 範例 → 編輯器的初始內容 */
export const exampleText = (example: unknown) => (example === undefined || example === null ? '' : JSON.stringify(example, null, 2));

/** 附加的檔案：欄位名 → 檔名與 base64（不含 data: 前綴） */
export interface Attachment {
    field: string;
    fileName: string;
    size: number;
    base64: string;
}

/**
 * 送出前把附加的檔案填進 body：範例裡這個欄位是陣列（例如最多 4 張截圖）就放成陣列，否則放單一值。
 * 編輯器裡不放 base64 本身：一張照片幾百 KB，放進去編輯器會卡，也看不到其他欄位
 */
export function withAttachments(body: unknown, attachments: Attachment[], example: unknown): unknown {
    if (!attachments.length) return body;
    const base = (body && typeof body === 'object' && !Array.isArray(body)) ? { ...(body as Record<string, unknown>) } : {};
    const shape = (example && typeof example === 'object') ? example as Record<string, unknown> : {};
    for (const field of new Set(attachments.map(item => item.field))) {
        const values = attachments.filter(item => item.field === field).map(item => item.base64);
        base[field] = Array.isArray(shape[field]) ? values : values[0];
    }
    return base;
}

// #endregion

// #region [P] 認證與確認

/** 每種認證在 curl 裡用的環境變數：token 本身永遠不放進複製出去的指令 */
export const AUTH_ENV: Record<ApiAuth, string | null> = {
    none: null,
    device: 'DINDON_DEVICE_KEY',
    admin: 'DINDON_ADMIN_TOKEN',
    google: 'GOOGLE_ID_TOKEN'
};

export const AUTH_LABEL: Record<ApiAuth, string> = {
    none: '不用認證',
    device: '裝置 API key',
    admin: '管理員',
    google: 'Google 帳號'
};

export const EFFECT_LABEL: Record<ApiEffect, string> = {
    read: '唯讀',
    write: '寫入',
    irreversible: '不可逆',
    ai: '呼叫 AI'
};

export interface Confirmation {
    /** type：要打字確認；click：按一下確認 */
    kind: 'type' | 'click';
    message: string;
    /** kind 是 type 時要打的字 */
    phrase: string;
}

/**
 * 送出前要不要確認。正式資料庫跟真的測試者共用，寫錯救不回來：
 * - 不可逆：不管哪個環境都要打字確認
 * - 寫入、呼叫 AI：正式環境按一下確認；本機不問
 * - 唯讀：不問
 */
export function confirmationFor(endpoint: Pick<ApiEndpoint, 'effect' | 'method' | 'path'>, production: boolean): Confirmation | null {
    switch (endpoint.effect) {
        case 'irreversible':
            return { kind: 'type', message: `這支做了就救不回來${production ? '，而且是正式資料庫' : ''}。確定的話輸入「${endpoint.method}」。`, phrase: endpoint.method };
        case 'write':
            return production ? { kind: 'click', message: '會改正式資料庫的資料（有真的測試者），每一次寫入都會記進操作紀錄。', phrase: '' } : null;
        case 'ai':
            return production ? { kind: 'click', message: '會真的呼叫 Gemini：要花錢，也算進這台裝置與全服務的每日上限。', phrase: '' } : null;
        case 'read':
            return null;
    }
}

// #endregion

// #region [P] 回應

/** 通用的狀態碼（api.md 通用約定）；端點自己的 errors 優先 */
const GENERAL_STATUS: Record<number, string> = {
    200: '成功',
    201: '建立成功',
    204: '成功，沒有內容',
    400: '請求格式錯誤：欄位、型別或 body 大小不對',
    401: '沒帶憑證、無效或過期',
    402: '額度不足',
    403: '沒有權限：管理 API 是帳號不在名單上；App 的 API 是這台裝置被凍結',
    404: '找不到：路徑或 id 不存在，或這支還沒上線',
    409: '跟現有的資料衝突',
    413: 'body 太大',
    428: '要先綁 Google 帳號',
    429: '太頻繁或撞到每日上限，稍後再試',
    500: '伺服器錯誤',
    502: '後端連不上外部服務（Google、Gemini）',
    503: '伺服器暫時無法處理（例如資料庫連線閃斷），稍後再試',
    504: '逾時'
};

export function statusMeaning(status: number, errors: ApiErrorCase[]): string {
    const own = errors.find(item => item.status === status);
    if (own) return own.meaning;
    if (status === 0) return '沒有收到回應';
    return GENERAL_STATUS[status] ?? (status >= 500 ? '伺服器錯誤' : status >= 400 ? '請求被拒絕' : '成功');
}

/**
 * fetch 直接失敗（沒有狀態碼）時的說明。瀏覽器不會告訴網頁是 CORS 還是斷線，
 * 只能從哪一種端點推：後端只對 /v1/admin/*、/v1/account/* 開了 CORS（#0074 請它開到全部）
 */
export function fetchFailureHint(path: string): string {
    const corsOpen = /^\/v1\/(?:admin|account)\//.test(path);
    return corsOpen
        ? '連不上後端：檢查網路，或後端是不是在重新部署。'
        : '瀏覽器擋下了（多半是 CORS）：這支 App 的端點還沒對網頁開放，等溝通板 #0074。也可能是網路斷了。';
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDuration(ms: number): string {
    return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

// #endregion

// #region [P] 契約檢查：後台自己在用的端點，拿後台的 Parser 驗一次回應

/**
 * 後台畫面怎麼解析這支的回應。後端改了格式、後台還沒跟上，這裡會先看到「不一致」，
 * 不用等哪個分頁壞掉才發現
 */
const CONTRACTS: Record<string, z.ZodType> = {
    [routeKey('GET', '/v1/admin/devices')]: GetDeviceListParser,
    [routeKey('POST', '/v1/admin/devices/search')]: GetDeviceListParser,
    [routeKey('GET', '/v1/admin/devices/:id')]: GetDeviceDetailParser,
    [routeKey('PATCH', '/v1/admin/devices/:id')]: UpdateDeviceParser,
    [routeKey('POST', '/v1/admin/devices/:id/erase-identity')]: UpdateDeviceParser,
    [routeKey('GET', '/v1/admin/usage')]: GetUsageReportParser,
    [routeKey('GET', '/v1/admin/usage/devices')]: GetUsageByDeviceParser,
    [routeKey('GET', '/v1/admin/feedback/stats')]: GetFeedbackStatsParser,
    [routeKey('GET', '/v1/admin/feedback')]: GetFeedbackListParser,
    [routeKey('GET', '/v1/admin/feedback/:id')]: GetFeedbackParser,
    [routeKey('PATCH', '/v1/admin/feedback/:id')]: GetFeedbackParser,
    [routeKey('POST', '/v1/admin/feedback/batch')]: BatchReviewFeedbackParser,
    [routeKey('POST', '/v1/admin/feedback/triage')]: TriageFeedbackParser,
    [routeKey('POST', '/v1/admin/feedback')]: CreateFeedbackParser,
    [routeKey('GET', '/v1/admin/feedback/issues')]: GetFeedbackIssueListParser,
    [routeKey('POST', '/v1/admin/feedback/issues')]: CreateFeedbackIssueParser,
    [routeKey('GET', '/v1/admin/promo-codes')]: GetPromoCodeListParser,
    [routeKey('GET', '/v1/admin/promo-codes/:code')]: GetPromoCodeParser,
    [routeKey('POST', '/v1/admin/promo-codes')]: SavePromoCodeParser,
    [routeKey('PATCH', '/v1/admin/promo-codes/:code')]: SavePromoCodeParser,
    [routeKey('GET', '/v1/admin/features')]: GetFeatureCandidateListParser,
    [routeKey('POST', '/v1/admin/features')]: SaveFeatureCandidateParser,
    [routeKey('PATCH', '/v1/admin/features/:id')]: SaveFeatureCandidateParser
};

export const hasContract = (method: string, path: string) => routeKey(method, path) in CONTRACTS;

export type ContractResult = { checked: false } | { checked: true; ok: true } | { checked: true; ok: false; issues: string[] };

/** 只檢查成功的 JSON 回應；錯誤回應本來就是 { error } */
export function checkContract(method: string, path: string, status: number, data: unknown): ContractResult {
    const parser = CONTRACTS[routeKey(method, path)];
    if (!parser || status < 200 || status >= 300 || data === undefined) return { checked: false };
    const result = parser.safeParse(data);
    if (result.success) return { checked: true, ok: true };
    return {
        checked: true,
        ok: false,
        issues: result.error.issues.slice(0, 8).map(issue => `${issue.path.length ? issue.path.join('.') : '（整份）'}：${issue.message}`)
    };
}

// #endregion

// #region [P] 複製成指令

export interface SnippetInput {
    method: string;
    url: string;
    auth: ApiAuth;
    body: unknown;
    attachments: Attachment[];
}

/** 附加的檔案在指令裡換成一句說明：base64 動輒幾十萬字，貼進終端機沒意義 */
function bodyForSnippet(input: SnippetInput): unknown {
    if (!input.attachments.length) return input.body;
    const placeholders = input.attachments.map(item => ({ ...item, base64: `<${item.fileName} 的 base64>` }));
    return withAttachments(input.body, placeholders, input.body);
}

const shellQuote = (text: string) => `'${text.replace(/'/g, `'\\''`)}'`;

/** token 用環境變數，不把當下的憑證寫進去（複製出去就可能貼到別的地方） */
export function toCurl(input: SnippetInput): string {
    const lines = [`curl -X ${input.method} ${shellQuote(input.url)}`];
    const env = AUTH_ENV[input.auth];
    if (env) lines.push(`-H "Authorization: Bearer $${env}"`);
    const body = bodyForSnippet(input);
    if (body !== undefined) {
        lines.push(`-H 'Content-Type: application/json'`);
        lines.push(`--data ${shellQuote(JSON.stringify(body))}`);
    }
    return lines.join(' \\\n  ');
}

export function toFetch(input: SnippetInput): string {
    const env = AUTH_ENV[input.auth];
    const body = bodyForSnippet(input);
    const headers = [
        ...(env ? [`Authorization: \`Bearer \${${env}}\``] : []),
        ...(body !== undefined ? [`'Content-Type': 'application/json'`] : [])
    ];
    const options = [
        `method: '${input.method}'`,
        ...(headers.length ? [`headers: { ${headers.join(', ')} }`] : []),
        ...(body !== undefined ? [`body: JSON.stringify(${JSON.stringify(body, null, 2).replace(/\n/g, '\n    ')})`] : [])
    ];
    return `await fetch('${input.url}', {\n    ${options.join(',\n    ')}\n});`;
}

// #endregion
