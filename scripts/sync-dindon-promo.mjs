import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createR2, hashedName, loadEnv, PROMO_DIR, PUBLIC_BASE } from './lib/dindon-r2.mjs';

// 把叮咚記帳的宣傳短片（4:5 版）傳到 R2，給宣傳頁 /dindon/ 的「18 秒看懂」用。
//
// 短片由行銷小精靈在工作區 docs/marketing/promo-video/ 用 render.py 輸出（輸出檔不進版控）。
// 網頁用 4:5（1080x1350）那一版：桌機放在文字旁邊不會太高，手機一個畫面就看得完；9:16 是給限動與 Reels 的。
// 影片原檔直接傳（已經是 faststart，邊下載邊播）；封面轉成 webp。
//
// - 檔名加上內容的雜湊，放在 promo/ 底下；R2 上已經有同名檔案就不重傳
// - 全部傳完才寫 docs/features/dindon/promo.json，網頁不會指到還沒傳上去的檔案
//
// 用法：pnpm dindon:promo [promo-video 資料夾的路徑] [--dry] [--prune]
//   --dry    只列出要傳哪些，不上傳、不改 promo.json
//   --prune  順便刪掉 promo/ 底下舊版的短片（預設留著：還開著舊頁面的人不會突然看不到）
// 金鑰的設定見 lib/dindon-r2.mjs。

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const prune = args.includes('--prune');
const sourceArg = args.find(arg => !arg.startsWith('--'));
const source = path.resolve(sourceArg ?? path.join(root, '..', 'DinDon', 'docs', 'marketing', 'promo-video'));
const indexTarget = path.join(root, 'docs', 'features', 'dindon', 'promo.json');

const VIDEO = 'dindon-promo-4x5.mp4';
const POSTER = 'dindon-promo-4x5-poster.jpg';
/** 頁面上最寬約 440px，給兩倍 */
const POSTER_WIDTH = 880;

loadEnv(root);

const missing = [VIDEO, POSTER].filter(file => !fs.existsSync(path.join(source, file)));
if (missing.length) {
    console.error(`找不到短片：${missing.map(file => path.join(source, file)).join('、')}\n先在工作區 docs/marketing/promo-video/ 跑 render.py，或指定資料夾：pnpm dindon:promo <路徑>`);
    process.exit(1);
}

/** mp4 的長度與畫面大小：讀 moov 裡的 mvhd 與 tkhd，不用裝 ffmpeg */
function probeMp4(buffer) {
    const boxes = (start, end) => {
        const list = [];
        for (let offset = start; offset + 8 <= end;) {
            const size = buffer.readUInt32BE(offset);
            list.push({ type: buffer.toString('latin1', offset + 4, offset + 8), start: offset + 8, end: offset + size });
            if (size < 8) break;
            offset += size;
        }
        return list;
    };
    const moov = boxes(0, buffer.length).find(box => box.type === 'moov');
    if (!moov) throw new Error('mp4 裡找不到 moov');
    const mvhd = boxes(moov.start, moov.end).find(box => box.type === 'mvhd');
    const version = buffer[mvhd.start];
    const timescale = buffer.readUInt32BE(mvhd.start + (version ? 20 : 12));
    const length = version ? Number(buffer.readBigUInt64BE(mvhd.start + 24)) : buffer.readUInt32BE(mvhd.start + 16);
    // 有畫面的那一軌：tkhd 最後 8 bytes 是寬高（16.16 定點數）
    const size = boxes(moov.start, moov.end)
        .filter(box => box.type === 'trak')
        .map(trak => boxes(trak.start, trak.end).find(box => box.type === 'tkhd'))
        .map(tkhd => ({ width: buffer.readUInt32BE(tkhd.end - 8) >>> 16, height: buffer.readUInt32BE(tkhd.end - 4) >>> 16 }))
        .find(({ width }) => width > 0);
    return { duration: Math.round((length / timescale) * 100) / 100, ...size };
}

const video = fs.readFileSync(path.join(source, VIDEO));
const poster = await sharp(path.join(source, POSTER)).resize(POSTER_WIDTH).webp({ quality: 80 }).toBuffer();
const { duration, width, height } = probeMp4(video);

const uploads = [
    { key: `${PROMO_DIR}${hashedName(VIDEO, video)}`, body: video, type: 'video/mp4' },
    { key: `${PROMO_DIR}${hashedName(POSTER.replace(/\.\w+$/, '.webp'), poster)}`, body: poster, type: 'image/webp' }
];

const totalMb = (uploads.reduce((sum, file) => sum + file.body.length, 0) / 1024 / 1024).toFixed(1);
console.log(`宣傳短片 ${width}x${height}、${duration} 秒：${uploads.length} 個檔案（${totalMb} MB）`);

if (dry) {
    for (const file of uploads) console.log(`  ${file.key}（${(file.body.length / 1024).toFixed(0)} KB）`);
    console.log('--dry：沒有上傳，promo.json 沒改');
    process.exit(0);
}

const r2 = createR2({ dry });
let uploaded = 0;
for (const file of uploads) {
    if (!(await r2.putIfMissing(file))) continue;
    uploaded++;
    console.log(`  ↑ ${file.key}`);
}

// 傳完才寫：網頁從 promo.json 讀網址
const [videoFile, posterFile] = uploads;
const promo = { mediaBase: PUBLIC_BASE, video: videoFile.key, poster: posterFile.key, width, height, duration };
fs.writeFileSync(indexTarget, `${JSON.stringify(promo, null, 4)}\n`);

const current = new Set(uploads.map(file => file.key));
const stale = (await r2.listKeys(PROMO_DIR)).filter(key => !current.has(key));
if (prune) {
    for (const key of stale) await r2.remove(key);
}
const staleNote = prune ? `、刪掉 ${stale.length} 個舊檔` : stale.length ? `；promo/ 底下有 ${stale.length} 個舊版的檔案（加 --prune 刪掉）` : '';
console.log(`  上傳 ${uploaded} 個、已經在 R2 上 ${uploads.length - uploaded} 個${staleNote}`);
console.log(`  → ${PUBLIC_BASE}${PROMO_DIR}、docs/features/dindon/promo.json`);
