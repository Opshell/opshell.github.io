import type { iDemoIndex, iDemoItem } from './types';
import demos from './demos.json';

export const demoIndex = demos as iDemoIndex;

/** 影片與封面在 public 底下的位置（pnpm dindon:demos 複製過來的） */
export const MEDIA_BASE = '/images/dindon/demos/';

/** 點得開的：錄好的影片，和網頁自己畫的圖解 */
export const isOpenable = (item: iDemoItem) => item.status === 'ready' || item.status === 'diagram';

/** 上一支、下一支照目錄順序，跳過還沒錄的 */
export const openableItems = demoIndex.sections.flatMap(section => section.items).filter(isOpenable);

export const findItem = (id: string) => openableItems.find(item => item.id === id);

export const countByStatus = (status: iDemoItem['status']) =>
    demoIndex.sections.reduce((sum, section) => sum + section.items.filter(item => item.status === status).length, 0);
