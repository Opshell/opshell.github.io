import { AdminApiError } from './api';
import { useGoogleAuth } from './useGoogleAuth';

/**
 * 帶著目前的登入憑證呼叫管理 API。
 * 遇到 401（登入過期或無效）就丟掉憑證、請使用者重新登入，錯誤照樣往外拋給畫面顯示。
 */
export function useAdminCall() {
    const auth = useGoogleAuth();

    return async function call<T>(fn: (token: string) => Promise<T>): Promise<T> {
        const token = auth.credential.value;
        if (!token) throw new AdminApiError(401, '請先登入');
        try {
            return await fn(token);
        } catch (error) {
            if (error instanceof AdminApiError && error.needsLogin) auth.markExpired();
            throw error;
        }
    };
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
