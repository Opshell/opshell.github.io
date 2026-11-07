import type { FeedbackIssue } from './schemas/admin.schema';
import type { ShotRef } from './screenshotZip';
import { ref } from 'vue';
import { adminApi } from './api';
import { collectShots, failureNote, failureSummary, zipFileName } from './screenshotZip';
import { useAdminCall } from './useAdminCall';
import { createZip } from './zip';

// 回報截圖一鍵下載（Flowsker #601）。截圖端點要帶 Authorization，不能給 <a href> 讓瀏覽器自己下載，
// 所以在頁面裡抓成 blob、包成 zip，再用暫時的 blob URL 存檔。

/** 翻全部回報找某個問題的：一頁 100 則（後端 adminMaxPerPage），最多翻 20 頁，比照 api.ts 的 ALL_DEVICES_MAX_PAGES */
const PER_PAGE = 100;
const MAX_PAGES = 20;

export interface FoundShots {
    refs: ShotRef[];
    /** 沒翻完（超過上限）時給人看的一句話 */
    note?: string;
}

export interface DownloadResult {
    saved: number;
    /** 有抓不到的就是一句給人看的說明，沒有就是空字串 */
    failed: string;
    note?: string;
}

/** 用暫時的 <a download> 存檔：Chrome 在 click 之後才開始讀 URL，馬上 revoke 會存到空檔，所以等一下再收 */
function saveBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useScreenshotDownload() {
    const call = useAdminCall();
    /** 正在下載的是哪一包（`report:12`、`issue:3`）；有值時所有下載鈕都停用 */
    const downloading = ref<string | null>(null);
    /** 按鈕上的進度字：翻頁時「找回報中 第 2/3 頁」、抓圖時「打包中 3/7」 */
    const progress = ref('');

    /**
     * 後端沒有「某個問題的回報」這支，列表也不能用 issue_id 篩，只好翻全部的回報挑出來。
     * 一定翻到最後一頁（或上限）才停：問題清單上的件數是載入頁面時的，之後有人合併就過時了，拿它當停止條件會漏
     */
    async function issueShotRefs(issue: FeedbackIssue): Promise<FoundShots> {
        const refs: ShotRef[] = [];
        let pages = 1;
        for (let page = 1; page <= Math.min(pages, MAX_PAGES); page++) {
            progress.value = page === 1 ? '找回報中…' : `找回報中 第 ${page}/${Math.min(pages, MAX_PAGES)} 頁…`;
            const list = await call(async token => adminApi.listFeedback(token, { page, perPage: PER_PAGE }));
            pages = Math.max(Math.ceil(list.total / PER_PAGE), 1);
            for (const report of list.reports) {
                if (report.issueId === issue.id) refs.push(...report.screenshots.map(position => ({ reportId: report.id, position })));
            }
        }
        // 舊的回報在前：看截圖時照事情發生的順序
        refs.sort((a, b) => a.reportId - b.reportId || a.position - b.position);
        const note = pages > MAX_PAGES ? `回報超過 ${MAX_PAGES * PER_PAGE} 則，只找了最新的 ${MAX_PAGES * PER_PAGE} 則` : undefined;
        return { refs, note };
    }

    /**
     * 找要哪幾張、抓、打包、存檔，整段算一次下載：一開始就占住 downloading，
     * 翻頁找回報那段也擋得住重複按（不然兩個流程同時跑會存兩個檔、進度互蓋）。已經在下載就回 null。
     * 一張就直接存圖，兩張以上才包 zip（只有一張還要解壓縮很煩）；有抓不到的一律包 zip，附一份清單
     */
    async function download(key: string, zipLabel: string, find: () => Promise<FoundShots> | FoundShots): Promise<DownloadResult | null> {
        if (downloading.value) return null;
        downloading.value = key;
        progress.value = '';
        try {
            const { refs, note } = await find();
            if (!refs.length) return { saved: 0, failed: '', note };
            progress.value = `打包中 0/${refs.length}…`;
            const { files, failed } = await collectShots(
                refs,
                async (reportId, position) => call(async token => adminApi.feedbackScreenshot(token, reportId, position)),
                (done, total) => (progress.value = `打包中 ${done}/${total}…`)
            );
            if (files.length === 1 && !failed.length) {
                saveBlob(new Blob([files[0].data], { type: files[0].mime }), files[0].name);
            } else if (files.length) {
                const entries = failed.length ? [...files, failureNote(failed)] : files;
                saveBlob(new Blob([createZip(entries)], { type: 'application/zip' }), zipFileName(zipLabel));
            }
            return { saved: files.length, failed: failureSummary(failed), note };
        } finally {
            downloading.value = null;
            progress.value = '';
        }
    }

    return { downloading, progress, issueShotRefs, download };
}
