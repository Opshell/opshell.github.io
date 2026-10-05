// 部落格的瀏覽計數 POST /v1/blog/hit。規格以 DinDon_BackEnd/docs/api.md 第 22 節為準（溝通板 #0090）。
// 這支檔案連同 Zod 由 hooks/useVisitorStats.ts 用到才載入，不進每一頁都要下載的主題 JS。

import { apiBase, PRODUCTION_API } from '@shared/utils/apiBase';
import { parseResponse, snakeToCamel } from '@shared/utils/zod';
import { z } from 'zod';

// page_pv 是 null：這頁沒被記（新路徑超過後端上限，或爬蟲看了一頁從沒人看過的），顯示 --
const BlogHitParser = z
    .object({ page_pv: z.number().nullable(), site_pv: z.number(), site_uv: z.number() })
    .transform(data => snakeToCamel(data));
export type BlogHit = z.output<typeof BlogHitParser>;

let base: string | null | undefined;

/**
 * 要送到哪個後端；null＝不計數。只在第一次呼叫時決定：
 * ?api= 只在進站的第一頁網址上，換頁之後就不見了，每次重算會在第二頁改打正式後端
 */
export function countingBase(): string | null {
    if (base !== undefined) return base;
    const { hostname } = window.location;
    if (hostname === 'opshell.me') {
        base = PRODUCTION_API;
    } else if (hostname === 'localhost' && apiBase() !== PRODUCTION_API) {
        // 本機開發只在用 ?api= 指到本機後端時計數，不灌正式站的數字
        base = apiBase();
    } else {
        base = null;
    }
    return base;
}

export async function postBlogHit(baseUrl: string, path: string): Promise<BlogHit> {
    const response = await fetch(`${baseUrl}/v1/blog/hit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
    });
    if (!response.ok) throw new Error(`POST /v1/blog/hit ${response.status}`);
    return parseResponse(BlogHitParser, await response.json(), 'POST /v1/blog/hit');
}
