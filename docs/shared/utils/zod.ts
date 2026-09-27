// 前端開發規範附錄 B 的 utils/zod.ts（部落格沒用 vee-validate，轉接器不放）
import type { CamelCasedPropertiesDeep, SnakeCasedPropertiesDeep } from 'type-fest';
import { z } from 'zod';

// #region [P] key 轉換：snake_case ⇄ camelCase（型別與執行期一起轉）

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/** 遞迴轉換物件的 key；陣列逐項處理，Date、Map 等非純物件原樣保留 */
function mapKeysDeep(value: unknown, convert: (key: string) => string): unknown {
    if (Array.isArray(value)) return value.map(item => mapKeysDeep(item, convert));
    if (!isPlainObject(value)) return value;
    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [convert(key), mapKeysDeep(item, convert)])
    );
}

const toCamel = (key: string) => key.replace(/_([a-z\d])/g, (_, char: string) => char.toUpperCase());
// 連續大寫當成一個詞（userID → user_id），跟型別層 type-fest 的結果一致
const toSnake = (key: string) => key
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

/** 後端回應 → 前端：`parent_id` → `parentId`。放在 Parser 的 `.pipe()` 前面 */
// 型別層不在數字處拆詞（ai_calls_30d → aiCalls30d），跟執行層的結果一致；type-fest 的 camelCase 預設會拆成 aiCalls30D
type CamelKeys<T> = CamelCasedPropertiesDeep<T, { splitOnNumbers: false }>;

export function snakeToCamel<T>(data: T): CamelKeys<T> {
    return mapKeysDeep(data, toCamel) as CamelKeys<T>;
}

/** 前端 → 送給後端：`isEnabled` → `is_enabled`。放在 Params／Payload 的 `.transform()` */
export function camelToSnake<T>(data: T): SnakeCasedPropertiesDeep<T> {
    return mapKeysDeep(data, toSnake) as SnakeCasedPropertiesDeep<T>;
}

// #endregion

// #region [P] 解析失敗

/** 後端回傳的格式跟 Parser 對不上。帶著端點與 Zod 的錯誤明細，走一般的錯誤流程 */
export class ApiSchemaError extends Error {
    override readonly name = 'ApiSchemaError';

    constructor(readonly endpoint: string, readonly zodError: z.ZodError) {
        super(`回應格式不符（${endpoint}）\n${z.prettifyError(zodError)}`, { cause: zodError });
    }
}

/** Repository 解析回應的唯一入口：成功回傳解析後的資料，失敗丟 ApiSchemaError */
export function parseResponse<T extends z.ZodType>(schema: T, data: unknown, endpoint: string): z.output<T> {
    const result = schema.safeParse(data);
    if (!result.success) throw new ApiSchemaError(endpoint, result.error);
    return result.data;
}

// #endregion
