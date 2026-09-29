import { snakeToCamel } from '@shared/utils/zod';
import { z } from 'zod';

// API 控制台的目錄（溝通板 #0074）：GET /v1/admin/api-catalog，只有管理員拿得到。
// 說明來自私有的後端倉庫，所以不寫死在這個公開網站，登入後才向後端拿。
// 格式以 DinDon_BackEnd/docs/api.md 為準；後端還沒定案前，這裡照 #0074 列的需要先接，欄位缺了就給預設值，不讓整份目錄解析失敗。

// #region [P] 列舉

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export const HttpMethodSchema = z.enum(HTTP_METHODS);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

/**
 * 怎麼認證：
 * - none：不用（領 key）
 * - device：裝置的 API key（控制台用測試裝置的 key）
 * - admin：管理員（Google 登入的 ID token）
 * - google：Google ID token 本身就是身分（網頁的自助刪除、綁定）
 */
export const ApiAuthSchema = z.enum(['none', 'device', 'admin', 'google']);
export type ApiAuth = z.infer<typeof ApiAuthSchema>;

/**
 * 會做什麼，控制台依這個決定送出前要不要確認：
 * - read：唯讀
 * - write：會改資料
 * - irreversible：救不回來（清除身分、刪帳號、活動清資料）
 * - ai：會真的呼叫 Gemini（要花錢、算每日上限）
 */
export const ApiEffectSchema = z.enum(['read', 'write', 'irreversible', 'ai']);
export type ApiEffect = z.infer<typeof ApiEffectSchema>;

/** live：已上線；planned：規格定了還沒做（送了會 404） */
export const ApiStatusSchema = z.enum(['live', 'planned']);

// #endregion

// #region [P] 參數、錯誤

const ScalarSchema = z.union([z.string(), z.number(), z.boolean()]);

export const ApiParamSchema = z.object({
    name: z.string(),
    /** string／integer／number／boolean；有 enum 時畫成下拉選單 */
    type: z.string(),
    required: z.boolean(),
    default: ScalarSchema.nullable(),
    enum: z.array(z.string()),
    description: z.string(),
    example: ScalarSchema.nullable()
});
export type ApiParam = z.infer<typeof ApiParamSchema>;

const ApiParamRawSchema = z.object({
    name: z.string(),
    type: z.string().nullish(),
    required: z.boolean().nullish(),
    default: ScalarSchema.nullish(),
    enum: z.array(z.string()).nullish(),
    description: z.string().nullish(),
    example: ScalarSchema.nullish()
});

const ApiParamParser = ApiParamRawSchema
    .transform(data => ({
        name: data.name,
        type: data.type ?? 'string',
        required: data.required ?? false,
        default: data.default ?? null,
        enum: data.enum ?? [],
        description: data.description ?? '',
        example: data.example ?? null
    }))
    .pipe(ApiParamSchema);

export const ApiErrorCaseSchema = z.object({ status: z.number().int(), meaning: z.string() });
export type ApiErrorCase = z.infer<typeof ApiErrorCaseSchema>;

const list = <T extends z.ZodType>(item: T) => z.array(item).nullish().transform(items => items ?? []);

// #endregion

// #region [P] 端點

export const ApiEndpointSchema = z.object({
    /** 穩定的代號，網址的 #api/<id> 用它 */
    id: z.string(),
    /** 所屬章節（對到 groups 的 id） */
    group: z.string(),
    method: HttpMethodSchema,
    /** 路徑參數寫成 :id，例如 /v1/admin/devices/:id */
    path: z.string(),
    title: z.string(),
    status: ApiStatusSchema,
    auth: ApiAuthSchema,
    effect: ApiEffectSchema,
    pathParams: z.array(ApiParamSchema),
    query: z.array(ApiParamSchema),
    /** 有 body 的端點：範例（預先填進編輯器）與「放圖片 base64 的欄位」 */
    body: z.object({ example: z.unknown(), base64Fields: z.array(z.string()) }).nullable(),
    responseExample: z.unknown(),
    errors: z.array(ApiErrorCaseSchema),
    /** 限流、body 上限、逾時：人看的一句話，沒有就空字串 */
    rateLimit: z.string(),
    timeout: z.string(),
    /** 說明本文（markdown） */
    docMd: z.string()
});
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;

const ApiEndpointRawSchema = z.object({
    id: z.string(),
    group: z.string().nullish(),
    method: HttpMethodSchema,
    path: z.string(),
    title: z.string().nullish(),
    status: ApiStatusSchema.nullish(),
    auth: ApiAuthSchema,
    effect: ApiEffectSchema.nullish(),
    path_params: list(ApiParamParser),
    query: list(ApiParamParser),
    body: z.object({ example: z.unknown().optional(), base64_fields: z.array(z.string()).nullish() }).nullish(),
    response_example: z.unknown().optional(),
    errors: list(ApiErrorCaseSchema),
    rate_limit: z.string().nullish(),
    timeout: z.string().nullish(),
    doc_md: z.string().nullish()
});

/** 範例 JSON 裡的 key 是後端的 snake_case，要原樣保留：先拿出來，只轉目錄自己的欄位名 */
const ApiEndpointParser = ApiEndpointRawSchema
    .transform((data) => {
        const { body, response_example: responseExample, ...rest } = data;
        // 沒給範例是 null（zod 的 unknown 欄位不接受 undefined）
        const example: unknown = body?.example ?? null;
        const response: unknown = responseExample ?? null;
        const converted = snakeToCamel({
            ...rest,
            group: rest.group ?? 'other',
            title: rest.title ?? `${rest.method} ${rest.path}`,
            status: rest.status ?? 'live',
            // 沒標的：GET 當唯讀，其他當寫入（寧可多問一次）
            effect: rest.effect ?? (rest.method === 'GET' ? 'read' : 'write'),
            rate_limit: rest.rate_limit ?? '',
            timeout: rest.timeout ?? '',
            doc_md: rest.doc_md ?? ''
        });
        return {
            ...converted,
            body: body ? { example, base64Fields: body.base64_fields ?? [] } : null,
            responseExample: response
        };
    })
    .pipe(ApiEndpointSchema);

// #endregion

// #region [P] 整份目錄

export const ApiGroupSchema = z.object({ id: z.string(), title: z.string() });
export type ApiGroup = z.infer<typeof ApiGroupSchema>;

export const ApiCatalogSchema = z.object({
    /** 後端的版本（Cloud Run revision 或 git commit），畫面上顯示「目錄是哪一版的」 */
    revision: z.string(),
    /** 通用約定（認證、錯誤格式、限流、逾時），markdown */
    conventionsMd: z.string(),
    groups: z.array(ApiGroupSchema),
    endpoints: z.array(ApiEndpointSchema)
});
export type ApiCatalog = z.infer<typeof ApiCatalogSchema>;

export const GetApiCatalogParser = z
    .object({
        revision: z.string().nullish(),
        conventions_md: z.string().nullish(),
        groups: list(ApiGroupSchema),
        endpoints: list(ApiEndpointParser)
    })
    .transform((data) => {
        // 目錄沒列章節、或端點用了沒列的章節：補一個，清單才分得了組
        const groups = [...data.groups];
        for (const endpoint of data.endpoints) {
            if (!groups.some(group => group.id === endpoint.group)) groups.push({ id: endpoint.group, title: endpoint.group });
        }
        return { revision: data.revision ?? '', conventionsMd: data.conventions_md ?? '', groups, endpoints: data.endpoints };
    })
    .pipe(ApiCatalogSchema);

// #endregion
