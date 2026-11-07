import type { ZipEntry } from './zip';

// 回報截圖的一鍵下載（Flowsker #601）：同一個問題常常有好幾則回報、每則好幾張，一張一張存太累。
// 這裡只管「要哪幾張、叫什麼名字、抓不到的記下來」，抓圖與存檔由呼叫端給，所以能在 Node 裡測。

export interface ShotRef {
    reportId: number;
    position: number;
    /** 畫面上已經抓過的就帶進來，不要再打一次 API */
    blob?: Blob;
}

/** 抓好的一張：除了包進 zip 的內容，也留著類型，只有一張時直接存圖要用 */
export interface ShotFile extends ZipEntry {
    data: Uint8Array<ArrayBuffer>;
    mime: string;
}

export interface CollectedShots {
    files: ShotFile[];
    failed: { reportId: number; position: number; message: string }[];
}

/** 一次最多同時抓幾張：全部一起打會跟畫面上其他請求搶，一張一張又太慢 */
const CONCURRENCY = 3;

/** 副檔名照後端回的 Content-Type（收的時候看檔頭決定的，只有 JPEG／PNG） */
export function extensionOf(mime: string): string {
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    return 'jpg';
}

/**
 * 包內檔名：回報編號＋第幾張。第幾張跟畫面的「截圖 N」一樣從 1 數（position 是從 0 開始的），
 * 編號補零讓檔案總管照數字排，不會 10 排在 9 前面
 */
export function shotFileName(reportId: number, position: number, mime: string): string {
    return `回報${reportId}-截圖${String(position + 1).padStart(2, '0')}.${extensionOf(mime)}`;
}

/** 下載的 zip 檔名：作業系統不收的字元換掉，標題太長截短 */
export function zipFileName(label: string): string {
    // 換行、Tab 這類控制字元由 \s 一起收掉；標題是管理員打的，不會有更奇怪的
    const safe = label.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    return `叮咚-${safe || '截圖'}.zip`;
}

export function failureSummary(failed: CollectedShots['failed']): string {
    return failed.map(f => `#${f.reportId} 第 ${f.position + 1} 張（${f.message}）`).join('、');
}

/**
 * 把要的截圖都準備好：有 blob 的直接用，沒有的用 fetchShot 抓。
 * 抓不到的那張記進 failed、其他照樣打包——整包失敗的話，管理員連抓得到的都拿不到
 */
export async function collectShots(
    refs: ShotRef[],
    fetchShot: (reportId: number, position: number) => Promise<Blob>,
    onProgress?: (done: number, total: number) => void
): Promise<CollectedShots> {
    const results: (ShotFile | { reportId: number; position: number; message: string })[] = Array.from({ length: refs.length });
    let next = 0;
    let done = 0;

    async function worker() {
        while (next < refs.length) {
            const index = next++;
            const ref = refs[index];
            try {
                const blob = ref.blob ?? await fetchShot(ref.reportId, ref.position);
                results[index] = { name: shotFileName(ref.reportId, ref.position, blob.type), data: new Uint8Array(await blob.arrayBuffer()), mime: blob.type };
            } catch (e) {
                results[index] = { reportId: ref.reportId, position: ref.position, message: e instanceof Error ? e.message : String(e) };
            }
            onProgress?.(++done, refs.length);
        }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, refs.length) }, worker));

    // 照原本的順序排（併發會讓完成的順序亂掉）
    const files: ShotFile[] = [];
    const failed: CollectedShots['failed'] = [];
    for (const r of results) {
        if ('data' in r) files.push(r);
        else failed.push(r);
    }
    return { files, failed };
}
