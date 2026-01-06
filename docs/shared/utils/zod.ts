import { z, ZodError } from 'zod';

/** [-] 使用指定的 Schema 安全地解析資料。
 * 如果解析失敗，會在開發模式下記錄詳細錯誤，並丟一個錯誤出來。
 * @param schema Zod Schema. // 要輸出的型別格式
 * @param data 要解析的未知資料。
 * @param errorMessage (可選) 解析失敗時拋出的自訂錯誤訊息。
 * @returns 經過 Schema 解析和轉換的、型別安全的資料。
 */
export function parseWithSchema<T extends z.ZodTypeAny>(
    schema: T,
    data: unknown,
    errorMessage = '取得資料錯誤，請聯絡管理員。'
): z.infer<T> {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof ZodError) {
            // 只在開發模式下顯示詳細的偵錯訊息
            if (import.meta.env.DEV) {
                // console.groupCollapsed 建立一個預設折疊的群組，避免洗版
                console.groupCollapsed(
                    // 使用 %c 來添加 CSS 樣式，讓標題更醒目
                    '%c Zod Validation Error ',
                    'background: #F87171; color: #fff; border-radius: 4px; padding: 2px 6px; font-weight: bold;'
                );

                console.error('一個 Zod schema 驗證失敗，請檢查傳入的資料。');
                console.log('📄 Zod Schema:', schema);
                console.log('📦 收到的原始資料:', data);
                console.log('👇 詳細錯誤報告:');

                // 迴圈處理每一個 issue，並格式化輸出
                error.issues.forEach((issue) => {
                    // 將 path 陣列轉為更易讀的點表示法字串
                    const path = issue.path.join('.') || 'root';
                    console.warn(`- [${path}]: ${issue.message}`);
                    console.log(`  (期望得到: ${issue.expected}, 實際收到: ${issue.received})`);
                });

                // console.log('--- 原始 issues (表格格式) ---');
                // console.table(error.issues);
                console.groupEnd(); // 結束群組
            }
        }

        // 拋出一個標準化的錯誤給上層的 try...catch 或 onError 處理
        throw new Error(errorMessage);
    }
}

/** [-] 蛇型轉駝峰
 * 鍵名轉換工具
 * @param obj - 要轉換的物件或陣列。
 * @returns 轉換後的新物件或陣列。
 */
export function snakeToCamel(obj: any): any {
    // 如果是陣列，就遍歷陣列，對每一項遞迴呼叫自己
    if (Array.isArray(obj)) {
        return obj.map(v => snakeToCamel(v));
    }

    // 如果是物件，就建立一個新物件，遍歷 key
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            // 轉換 key
            const camelKey = key.replace(/_([a-z])/g, (_match, p1) => p1.toUpperCase());
            // 轉換 value (遞迴呼叫)
            acc[camelKey] = snakeToCamel(obj[key]);
            return acc;
        }, {} as Record<string, any>);
    }

    // 如果是原始型別 (string, number, boolean, null)，直接回傳
    return obj;
}

/** [-] 駝峰轉蛇型
 * 將一個物件或陣列的鍵名，從 camelCase 遞迴地轉換為 snake_case。
 * @param obj - 要轉換的物件或陣列。
 * @returns 轉換後的新物件或陣列。
 */
export function camelToSnake(obj: any): any {
    // 如果是陣列，就遍歷陣列，對每一項遞迴呼叫自己
    if (Array.isArray(obj)) {
        return obj.map(v => camelToSnake(v));
    }

    // 如果是物件（且不為 null），就遍歷鍵
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            // 將 key 從 camelCase 轉換為 snake_case
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

            // 對 value 進行遞迴呼叫，以處理巢狀物件或陣列
            acc[snakeKey] = camelToSnake(obj[key]);

            return acc;
        }, {} as Record<string, any>);
    }

    // 處理原始型別：如果是 string, number, boolean, null 等，直接回傳
    return obj;
}

/** [-] 將 (0 | 1 | '0' | '1' | null | boolean) 轉換為乾淨 boolean 的 Zod Schema
 * @description z.coerce.boolean() 是個陷阱！它依賴 Truthy/Falsy 轉換 (例如 z.coerce.boolean().parse('0') 會變成 true 😱)，這不是我們要的 0/1 精確轉換。
 * @returns z.ZodType<boolean>
 */
export const booleanLike = z.preprocess((arg) => {
    if (arg === 1 || arg === '1' || arg === true) {
        return true;
    }

    // 明確將 0, '0', false, null, undefined 轉為 false
    return false;
}, z.boolean());
