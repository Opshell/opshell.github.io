/// <reference types="vitepress/client" />

// 告訴 TS 這個路徑是存在的，並定義它的回傳結構
declare module 'vitepress/dist/client/theme-default/composables/sidebar' {
  import { ComputedRef, Ref } from 'vue';

  export interface SidebarItem {
    text?: string;
    link?: string;
    items?: SidebarItem[];
    collapsed?: boolean;
    activeMatch?: string;
    // 其他可能用到的屬性
    [key: string]: any;
  }

  export function useSidebar(): {
    sidebar: ComputedRef<SidebarItem[]>;
    hasSidebar: ComputedRef<boolean>;
    hasAside: ComputedRef<boolean>;
    leftAside: ComputedRef<boolean>;
    rightAside: ComputedRef<boolean>;
    open: Ref<boolean>;
    toggle: () => void;
  };
}