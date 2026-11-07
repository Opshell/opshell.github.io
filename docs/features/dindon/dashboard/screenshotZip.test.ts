import { describe, expect, it } from 'vitest';
import { collectShots, failureNote, failureSummary, shotFileName, zipFileName } from './screenshotZip';

describe('截圖檔名', () => {
    it('帶回報編號，第幾張從 1 數、補零；副檔名照圖片類型', () => {
        expect(shotFileName(123, 0, 'image/jpeg')).toBe('回報123-截圖01.jpg');
        expect(shotFileName(123, 9, 'image/png')).toBe('回報123-截圖10.png');
        expect(shotFileName(5, 1, '')).toBe('回報5-截圖02.jpg');
    });

    it('zip 檔名換掉作業系統不收的字元', () => {
        expect(zipFileName('問題 3 拍照/儲存:沒反應?')).toBe('叮咚-問題 3 拍照 儲存 沒反應.zip');
        expect(zipFileName('  ')).toBe('叮咚-截圖.zip');
    });
});

describe('collectShots', () => {
    const blobOf = (s: string, type = 'image/jpeg') => new Blob([s], { type });

    it('已經有的 blob 不重抓，抓不到的那張記下來、其他照樣打包且照原本順序', async () => {
        const fetched: string[] = [];
        const fetchShot = async (reportId: number, position: number) => {
            fetched.push(`${reportId}/${position}`);
            if (reportId === 2 && position === 0) throw new Error('找不到這張截圖');
            // 讓先抓的晚回來，確認結果還是照原本的順序
            await new Promise(r => setTimeout(r, 10 - position * 3));
            return blobOf(`${reportId}-${position}`, 'image/png');
        };
        const progress: number[] = [];
        const { files, failed } = await collectShots(
            [
                { reportId: 1, position: 0, blob: blobOf('cached') },
                { reportId: 1, position: 1 },
                { reportId: 2, position: 0 },
                { reportId: 2, position: 2 }
            ],
            fetchShot,
            done => progress.push(done)
        );
        expect(fetched.sort()).toEqual(['1/1', '2/0', '2/2']);
        expect(files.map(f => f.name)).toEqual(['回報1-截圖01.jpg', '回報1-截圖02.png', '回報2-截圖03.png']);
        expect(new TextDecoder().decode(files[0].data)).toBe('cached');
        expect(failed).toEqual([{ reportId: 2, position: 0, message: '找不到這張截圖' }]);
        expect(failureSummary(failed)).toBe('#2 第 1 張（找不到這張截圖）');
        const note = failureNote(failed);
        expect(note.name).toBe('沒抓到的截圖.txt');
        expect(new TextDecoder().decode(note.data)).toBe('回報 #2 第 1 張：找不到這張截圖\r\n');
        expect(progress).toEqual([1, 2, 3, 4]);
    });
});
