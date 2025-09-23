import { useData } from 'vitepress';
import { computed } from 'vue';
import type { iSiteData, iSiteDataSerializable } from './useBuildSiteData'; // 引入你的型別

/**
 * 這是一個 Composable，專門用來獲取並「還原」網站的核心資料。
 * 它會自動將從 themeConfig 傳來的可序列化陣列，轉換回高效的 Map 物件。
 */
export function useSiteData() {
    const { theme } = useData();
    const serializableSiteData = computed(() => theme.value.siteData as iSiteDataSerializable | undefined);

    return computed<iSiteData | undefined>(() => {
        if (!serializableSiteData.value) {
            return undefined;
        }

        // 「還原」或「水合 (Rehydrate)」過程
        return {
            counts: serializableSiteData.value.counts,
            posts: new Map(serializableSiteData.value.posts),
            sortedPostUrls: serializableSiteData.value.sortedPostUrls,
            tags: new Map(serializableSiteData.value.tags)
        };
    });
}
