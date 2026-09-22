// 帳號刪除的 API。規格見 DinDon_BackEnd/docs/api.md 第 16 節（需求寫在 clauder-talker.md #33、#35）。
//
// 這一頁是公開的靜態網頁，沒有、也不能有祕密：身分完全由使用者當場登入 Google 拿到的 ID token 證明，
// 後端自己驗簽章與 aud，再用 token 裡的帳號識別碼去找出那台裝置。網頁不知道、也不需要知道裝置 id。

import { apiBase } from '../apiBase';

/** link = 只解除 Google 綁定（裝置照常用）；account = 清掉伺服器上跟本人有關的資料並停用那台裝置 */
export type DeleteScope = 'link' | 'account';

export interface DeleteResult {
    scope: DeleteScope;
    /** 這個 Google 帳號綁到的裝置數。0 代表沒有東西可刪（已經解除過，或從來沒綁過） */
    devices: number;
}

/** 後端還沒開這支、或跨來源被擋掉時丟這個：畫面改走寄信那條路，不要讓使用者卡住 */
export class DeleteUnavailableError extends Error {}

export async function requestDeletion(idToken: string, scope: DeleteScope): Promise<DeleteResult> {
    let response: Response;
    try {
        response = await fetch(`${apiBase()}/v1/account/delete`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({ scope, confirm: 'DELETE' })
        });
    } catch {
        // 連不上、被擋廣告的外掛擋掉、或後端還沒放行這個來源，都會走到這裡
        throw new DeleteUnavailableError('線上刪除暫時連不上');
    }

    // 404／405 = 這支還沒上線；503 = 上線了但伺服器沒設定 Google 驗證（api.md 第 16 節）。兩種都改走寄信
    if ([404, 405, 503].includes(response.status)) throw new DeleteUnavailableError('線上刪除還沒開通');
    if (response.status === 401) throw new Error('登入已過期，請重新登入再試一次。');
    if (response.status === 429) throw new Error('太多次了，請過一小時再試（每個帳號每小時 5 次）。');
    if (response.status === 502) throw new Error('伺服器一時連不上 Google 驗證，請過幾分鐘再試一次。');

    const data = await response.json().catch(() => ({})) as Partial<DeleteResult> & { error?: string };
    if (!response.ok) throw new Error(data.error || `刪除失敗（${response.status}）`);

    return { scope, devices: typeof data.devices === 'number' ? data.devices : 0 };
}
