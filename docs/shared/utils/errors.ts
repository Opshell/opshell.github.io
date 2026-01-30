/** [-] 處理 API 多個錯誤訊息的自訂錯誤類別。
 * 兼容 Error
 * 包含一個 `_tag` 屬性，用於在 HMR 環境中進行可靠的型別檢查。
 */
export class Errors extends Error {
    // 新增一個 "tag" 屬性，作為它獨一無二的身份證 防止 HMR catch 時 instanceof 說謊的問題
    public readonly _tag = 'Errors';

    // 來自 API 的錯誤訊息陣列
    public messages: string[];

    constructor(messages: string[]) {
        // .message 屬性會變成一個用逗號分隔的字串，用於標準的錯誤日誌記錄
        super(messages.join(', '));
        // 保留原始陣列，供 UI 使用。
        this.messages = messages;
        this.name = 'Errors';
    }
}

/** [-] 檢查一個未知的錯誤是否是我們自訂的 Errors 類別的實例
 * @param error 欲檢查的錯誤
 * @returns 如果是，則為 true，且 TypeScript 會將其型別縮小為 Errors
 */
export function isErrors(error: unknown): error is Errors {
    // 我們不再依賴 instanceof，而是檢查 _tag 是否存在且正確
    return typeof error === 'object' && error !== null && (error as Errors)._tag === 'Errors';
}

/** [-] 將未知的錯誤正規化為 Error 物件
 * @param error 未知的 throw 值
 * @returns 一個 Error 的實例
 */
export function normalizeError(error: unknown): Error {
    // 如果它本身就是 Error 或其子類的實例(Errors)，直接回傳
    if (error instanceof Error) {
        return error;
    }

    // 如果是字串，用它建立一個新的 Error
    if (typeof error === 'string') {
        return new Error(error);
    }

    // 對於其他情況 (物件、數字等)，提供一個通用的錯誤
    console.error('Non-Error value thrown:', error);
    return new Error('發生未預期的錯誤');
}
