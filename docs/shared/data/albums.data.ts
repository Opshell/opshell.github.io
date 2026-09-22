import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { createMarkdownRenderer, defineLoader } from 'vitepress';

// 相簿的文案：photos/albums/<相簿資料夾名>.md
// frontmatter 放標題、副標、封面、每張照片的圖說；內文是相簿介紹（markdown，建置時轉成 HTML）。
// photos/data.json 是 generate-gallery.mjs 產生的，會被重跑蓋掉，所以文案不能放那裡。
// 底線開頭的檔案（_範例.md）不會被讀進來。

export interface AlbumMeta {
    id: string;
    title?: string;
    subtitle?: string;
    /** 覆蓋封面：相簿裡的檔名，例如 DSCF9066.JPG */
    cover?: string;
    /** 相簿介紹（HTML） */
    descriptionHtml: string;
    /** 檔名 → 圖說 */
    captions: Record<string, string>;
}

declare const data: Record<string, AlbumMeta>;
export { data };

const SRC_DIR = path.resolve(__dirname, '../..'); // docs/

export default defineLoader({
    watch: ['../photos/albums/*.md'], // 相對於 srcDir（docs/）
    async load(files: string[]): Promise<Record<string, AlbumMeta>> {
        const md = await createMarkdownRenderer(SRC_DIR);
        const result: Record<string, AlbumMeta> = {};

        for (const file of files) {
            const id = path.basename(file, '.md');
            if (id.startsWith('_')) continue;

            const { data: fm, content } = matter(fs.readFileSync(file, 'utf8'));
            result[id] = {
                id,
                title: fm.title || undefined,
                subtitle: fm.subtitle || undefined,
                cover: fm.cover || undefined,
                descriptionHtml: content.trim() ? md.render(content) : '',
                captions: fm.captions && typeof fm.captions === 'object' ? fm.captions : {}
            };
        }
        return result;
    }
});
