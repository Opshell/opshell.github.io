import type { DemoIndex, DemoItem } from './types';
import demos from './demos.json';

export const demoIndex = demos as DemoIndex;

/** 影片與封面的位置：R2 的 dindon-demo 儲體（pnpm dindon:demos 上傳） */
export const MEDIA_BASE = demoIndex.mediaBase;

/** 點得開的：錄好的影片，和網頁自己畫的圖解 */
export const isOpenable = (item: DemoItem) => item.status === 'ready' || item.status === 'diagram';

/** 上一支、下一支照目錄順序，跳過還沒錄的 */
export const openableItems = demoIndex.sections.flatMap(section => section.items).filter(isOpenable);

export const findItem = (id: string) => openableItems.find(item => item.id === id);

export const countByStatus = (status: DemoItem['status']) =>
    demoIndex.sections.reduce((sum, section) => sum + section.items.filter(item => item.status === status).length, 0);
