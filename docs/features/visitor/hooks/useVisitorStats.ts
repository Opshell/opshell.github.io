import { normalizeHitPath } from '../path';

// 全站共用一份：主題在換頁時記一次，文章頭、側欄、預設版型的統計區都讀同一組數字。
// 伺服器端渲染時永遠是 null（顯示 --），跟瀏覽器第一次渲染一致，不會 hydration 對不上
const pagePv = ref<number | null>(null);
const sitePv = ref<number | null>(null);
const siteUv = ref<number | null>(null);

// 快速連續換頁時，只採用最後一頁的回應，不讓前一頁晚到的數字蓋掉
let latestRequest = 0;

/** 記一次瀏覽並更新數字。失敗、逾時、被限流都只是維持 --，不擋頁面 */
export async function recordHit(routePath: string): Promise<void> {
    const request = ++latestRequest;
    pagePv.value = null;

    const path = normalizeHitPath(routePath);
    if (path === null) return;

    try {
        const { countingBase, postBlogHit } = await import('../api');
        const baseUrl = countingBase();
        if (baseUrl === null) return;

        const hit = await postBlogHit(baseUrl, path);
        if (request !== latestRequest) return;
        pagePv.value = hit.pagePv;
        sitePv.value = hit.sitePv;
        siteUv.value = hit.siteUv;
    } catch (error) {
        console.warn('[visitor] 瀏覽計數失敗', error);
    }
}

export function useVisitorStats() {
    return {
        pagePv: readonly(pagePv),
        sitePv: readonly(sitePv),
        siteUv: readonly(siteUv)
    };
}
