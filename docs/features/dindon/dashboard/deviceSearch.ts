import type { AdminDevice } from './schemas/admin.schema';

// 在瀏覽器裡找裝置：後端的搜尋只收裝置 id 與完整 email，名字、備註要把全部裝置抓回來自己比對。
// 裝置列表的搜尋框、LINE 匯入選人都用這一份。

export const normalize = (value: string | null | undefined) => (value ?? '').toLowerCase().replace(/\s+/g, '');

/** 可以「完全對上」的名字：暱稱、排行榜名字、email 的帳號部分、id */
function nameKeys(device: AdminDevice): string[] {
    return [device.nickname, device.displayName, device.email?.split('@')[0], String(device.id)].map(normalize).filter(Boolean);
}

/** 搜尋：名字、完整 email、備註有包含就算 */
export function deviceMatches(device: AdminDevice, query: string): boolean {
    const q = normalize(query);
    if (!q) return true;
    return [...nameKeys(device), normalize(device.email), normalize(device.adminNote)].some(key => key.includes(q));
}

export function searchDevices(query: string, devices: AdminDevice[], limit = 8): AdminDevice[] {
    if (!normalize(query)) return [];
    return devices.filter(device => deviceMatches(device, query)).slice(0, limit);
}

/**
 * 用對話裡的名字猜是哪台：名字完全對上的優先；都對不上，再找備註裡寫了這個名字的（例如「LINE：小明」）。
 * 只在剛好一台時才猜：猜錯的話分數會算給別人，比不猜糟。備註比對要兩個字以上，一個字太容易撞到。
 */
export function guessDevice(speaker: string, all: AdminDevice[]): AdminDevice | null {
    const name = normalize(speaker);
    if (!name) return null;
    // 測試裝置（#0074）不會是 LINE 上講話的人
    const devices = all.filter(device => !device.isTest);
    const exact = devices.filter(device => nameKeys(device).includes(name));
    if (exact.length) return exact.length === 1 ? exact[0] : null;
    if ([...name].length < 2) return null;
    const noted = devices.filter(device => normalize(device.adminNote).includes(name));
    return noted.length === 1 ? noted[0] : null;
}
