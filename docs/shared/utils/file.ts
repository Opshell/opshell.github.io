/** 取得 assets 內圖片的 URL
 * @param filename 圖片檔名，例如 'logo.png'
 * @param subfolder 'images' 底下的子目錄，例如 'avatars'
 */
export function getAssetsImageUrl(filename: string, subfolder?: string) {
    const path = subfolder ? `images/${subfolder}/${filename}` : `images/${filename}`;
    // 使用 @assets 別名，不受檔案位置影響！
    return new URL(`/@assets/${path}`, import.meta.url).href;
};

/** 格式化檔案大小
 * @param bytes 檔案大小 (Bytes)
 * @param decimals 小數位數
 */
export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) { return '0 Bytes'; }
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}
