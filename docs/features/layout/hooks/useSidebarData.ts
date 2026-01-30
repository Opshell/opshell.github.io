import { computed } from 'vue';
import { useData, useRoute } from 'vitepress';

// 定義 Sidebar 的型別 (簡化版)
export interface SidebarItem {
    text?: string;
    link?: string;
    items?: SidebarItem[];
    collapsed?: boolean;
}

export function useSidebarData() {
    const { theme } = useData();
    const route = useRoute();

    const sidebarGroups = computed(() => {
        const sidebarConfig = theme.value.sidebar;
        const path = route.path;

        // 1. 如果 Config 不存在或關閉
        if (!sidebarConfig) return [];

        // 2. 如果是物件 (多重 Sidebar 模式)
        // 這是 VitePress 最常見的模式： { '/guide/': [ ... ], '/config/': [ ... ] }
        if (typeof sidebarConfig === 'object' && !Array.isArray(sidebarConfig)) {
        // 找出所有 key，並依照長度排序 (讓最精確的路徑優先匹配)
        // 例如 '/article/vue/' 應該比 '/article/' 先被匹配到
        const matchedKey = Object.keys(sidebarConfig)
            .sort((a, b) => b.length - a.length)
            .find(key => {
                // 處理結尾斜線，確保比對準確
                // 這裡的邏輯是：當前路徑 是否以 key 開頭
                return path.startsWith(key);
            });

        if (matchedKey) {
            return sidebarConfig[matchedKey] as SidebarItem[];
        }
        return [];
        }

        // 3. 如果是陣列 (全站統一 Sidebar)
        if (Array.isArray(sidebarConfig)) {
        return sidebarConfig as SidebarItem[];
        }

        return [];
    });

    return {
        sidebarGroups
    };
}