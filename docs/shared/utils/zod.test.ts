import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { ApiSchemaError, camelToSnake, parseResponse, snakeToCamel } from './zod';

// 跟前端開發規範附錄的測試同一套：規範改了這裡也要跟著改

describe('snakeToCamel／camelToSnake', () => {
    it('巢狀物件與陣列都轉', () => {
        const raw = { parent_id: 1, child_items: [{ item_name: 'a', is_enabled: 1 }] };
        expect(snakeToCamel(raw)).toEqual({ parentId: 1, childItems: [{ itemName: 'a', isEnabled: 1 }] });
    });

    it('日期物件、null 與原始值原樣保留', () => {
        const date = new Date('2026-09-28');
        expect(snakeToCamel({ created_at: date, deleted_at: null, count: 0 })).toEqual({ createdAt: date, deletedAt: null, count: 0 });
        expect(snakeToCamel({ created_at: date }).createdAt).toBe(date);
    });

    it('來回轉換一致', () => {
        const data = { parentId: 1, isEnabled: true, tags: [{ tagName: 'x' }] };
        expect(snakeToCamel(camelToSnake(data))).toEqual(data);
    });

    it('數字與縮寫：執行結果跟型別一致', () => {
        const snake = camelToSnake({ address2: 1, userID: 2, htmlContent: 3 });
        expect(snake).toEqual({ address2: 1, user_id: 2, html_content: 3 });
        expectTypeOf(snake).toEqualTypeOf<{ address2: number; user_id: number; html_content: number }>();

        // 後台的 ai_calls_30d 就是這種：數字後面接字母
        const camel = snakeToCamel({ address_2: 1, line_2_text: 2, ai_calls_30d: 3 });
        expect(camel).toEqual({ address2: 1, line2Text: 2, aiCalls30d: 3 });
        expectTypeOf(camel).toEqualTypeOf<{ address2: number; line2Text: number; aiCalls30d: number }>();
    });

    it('型別也跟著轉', () => {
        expectTypeOf(snakeToCamel({ parent_id: 1, child_items: [{ item_name: 'a' }] }))
            .toEqualTypeOf<{ parentId: number; childItems: { itemName: string }[] }>();
        expectTypeOf(camelToSnake({ isEnabled: true })).toEqualTypeOf<{ is_enabled: boolean }>();
    });
});

describe('parseResponse', () => {
    const schema = z.object({ id: z.number() });

    it('成功回傳解析後的資料，多的欄位丟掉', () => {
        expect(parseResponse(schema, { id: 1, extra: 'x' }, 'GET /x')).toEqual({ id: 1 });
    });

    it('失敗丟 ApiSchemaError，帶端點與欄位', () => {
        try {
            parseResponse(schema, { id: '1' }, 'GET /x');
            expect.unreachable();
        } catch (error) {
            expect(error).toBeInstanceOf(ApiSchemaError);
            const schemaError = error as ApiSchemaError;
            expect(schemaError.endpoint).toBe('GET /x');
            expect(schemaError.zodError.issues[0]?.path).toEqual(['id']);
            expect(schemaError.message).toContain('GET /x');
        }
    });
});
