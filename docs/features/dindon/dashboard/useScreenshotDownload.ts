import type { FeedbackIssue } from './schemas/admin.schema';
import type { ShotRef } from './screenshotZip';
import { ref } from 'vue';
import { adminApi } from './api';
import { collectShots, failureSummary, zipFileName } from './screenshotZip';
import { useAdminCall } from './useAdminCall';
import { createZip } from './zip';

// 回報截圖一鍵下載（Flowsker #601）。截圖端點要帶 Authorization，不能給 <a href> 讓瀏覽器自己下載，
// 所以在頁面裡抓成 blob、包成 zip，再用暫時的 blob URL 存檔。

/** 列表一頁最多 100 則（後端 adminMaxPerPage） */
const PER_PAGE = 100;

export interface DownloadResult {
    saved: number;
    /** 有抓不到的就是一句給人看的說明，沒有就是空字串 */
    failed: string;
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
    /** 正在下載的是哪一包（`report:12`、`issue:3`），按鈕用它顯示進度、擋重複按 */
    const downloading = ref<string | null>(null);
    const progress = ref('');

    /**
     * 後端沒有「某個問題的回報」這支，列表也不能用 issue_id 篩，只好翻全部的回報挑出來。
     * 問題清單有件數，湊滿就停，不用翻到最後一頁
     */
    async function issueShotRefs(issue: FeedbackIssue): Promise<ShotRef[]> {
        const refs: ShotRef[] = [];
        let found = 0;
        for (let page = 1; ; page++) {
            const list = await call(async token => adminApi.listFeedback(token, { page, perPage: PER_PAGE }));
            for (const report of list.reports) {
                if (report.issueId !== issue.id) continue;
                found++;
                refs.push(...report.screenshots.map(position => ({ reportId: report.id, position })));
            }
            if (found >= issue.reports || page * PER_PAGE >= list.total) break;
        }
        // 舊的回報在前：看截圖時照事情發生的順序
        return refs.sort((a, b) => a.reportId - b.reportId || a.position - b.position);
    }

    /** 一張就直接存圖，兩張以上才包 zip（只有一張還要解壓縮很煩） */
    async function download(key: string, label: string, refs: ShotRef[]): Promise<DownloadResult> {
        downloading.value = key;
        progress.value = '';
        try {
            const { files, failed } = await collectShots(
                refs,
                async (reportId, position) => call(async token => adminApi.feedbackScreenshot(token, reportId, position)),
                (done, total) => (progress.value = `${done}/${total}`)
            );
            if (files.length === 1) {
                saveBlob(new Blob([files[0].data], { type: files[0].mime }), files[0].name);
            } else if (files.length > 1) {
                saveBlob(new Blob([createZip(files)], { type: 'application/zip' }), zipFileName(label));
            }
            return { saved: files.length, failed: failureSummary(failed) };
        } finally {
            downloading.value = null;
            progress.value = '';
        }
    }

    return { downloading, progress, issueShotRefs, download };
}
