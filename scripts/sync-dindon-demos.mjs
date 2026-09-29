import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { contentType, createR2, hashedName, loadEnv, PROMO_DIR, PUBLIC_BASE } from './lib/dindon-r2.mjs';

// 把叮咚記帳的功能演示素材（影片、封面、目錄）傳到 Cloudflare R2，給 /dindon/demo/ 用。
//
// 素材由前端 Claude 在 DinDon_Android/store/demos/ 產生，規格見那裡的 README.md（溝通板 #0055）。
// 影片不進這個倉庫：每重錄一次就多一份幾十 MB 的 git 歷史（2026-09-28 搬出來之前倉庫 74 MB，演示占 50 MB）。
// 放 R2 自己的儲體 dindon-demo（網域 dindon-demo.opshell.me），跟相簿分開：金鑰只能碰這個儲體，倉庫只留目錄 demos.json。
// 儲體、金鑰、雜湊檔名的共用部分在 lib/dindon-r2.mjs。
//
// - 檔名加上內容的雜湊（02-dedupe.1a2b3c4d.mp4）：重錄後網址就變，可以放心讓瀏覽器與 CDN 長期快取
// - R2 上已經有同名檔案就不重傳（同名＝同內容）
// - 全部傳完才寫 demos.json，網頁不會指到還沒傳上去的檔案
// - 目錄的縮圖（….thumb.webp）由這支從封面縮出來：封面 540 寬、一張 80 KB，目錄一次列 32 張太重
//
// 用法：pnpm dindon:demos [store/demos 的路徑] [--dry] [--prune]
//   --dry    只列出要傳哪些，不上傳、不改 demos.json
//   --prune  順便刪掉 R2 上已經不在清單裡的舊檔（預設留著：還開著舊頁面的人不會突然看不到影片）。
//            只清演示：promo/ 底下是宣傳短片，不動
// 素材路徑預設是本機的 ~/WWW/DinDon/DinDon_Android/store/demos。

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const prune = args.includes('--prune');
const sourceArg = args.find(arg => !arg.startsWith('--'));
const source = path.resolve(sourceArg ?? path.join(root, '..', 'DinDon', 'DinDon_Android', 'store', 'demos'));
const indexTarget = path.join(root, 'docs', 'features', 'dindon', 'demo', 'demos.json');

/** 目錄卡片上顯示約 110px 寬，給兩倍 */
const THUMB_WIDTH = 240;

loadEnv(root);

const indexSource = path.join(source, 'index.json');
if (!fs.existsSync(indexSource)) {
    console.error(`找不到演示目錄：${indexSource}\n用法：pnpm dindon:demos [store/demos 的路徑] [--dry] [--prune]`);
    process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexSource, 'utf8'));
const items = index.sections.flatMap(section => section.items);
const ready = items.filter(item => item.status === 'ready');

const missing = ready.flatMap(item => [item.video, item.poster]).filter(file => !fs.existsSync(path.join(source, file)));
if (missing.length) {
    console.error(`index.json 列了但資料夾裡沒有：\n  ${missing.join('\n  ')}`);
    process.exit(1);
}

// #region 算出每個檔案在 R2 上的名字

/** 封面的雜湊檔名 → 縮圖檔名。DemoPage 用同一條規則從 poster 推出縮圖 */
const thumbName = poster => poster.replace(/\.\w+$/, '.thumb.webp');

/** 要在 R2 上的檔案：{ key, body, type }。演示放儲體根目錄 */
const uploads = [];
const renamed = new Map();
for (const item of ready) {
    for (const file of [item.video, item.poster]) {
        const body = fs.readFileSync(path.join(source, file));
        const name = hashedName(file, body);
        renamed.set(file, name);
        uploads.push({ key: name, body, type: contentType(file) });
    }
    const thumb = await sharp(path.join(source, item.poster)).resize(THUMB_WIDTH).webp({ quality: 72 }).toBuffer();
    uploads.push({ key: thumbName(renamed.get(item.poster)), body: thumb, type: 'image/webp' });
}

// #endregion

const r2 = createR2({ dry });

const totalMb = (uploads.reduce((sum, file) => sum + file.body.length, 0) / 1024 / 1024).toFixed(1);
console.log(`App ${index.appVersion} 的演示（${index.generatedAt}）：${ready.length} 支影片，${uploads.length} 個檔案（${totalMb} MB）`);

if (dry) {
    for (const file of uploads) console.log(`  ${file.key}`);
    console.log('--dry：沒有上傳，demos.json 沒改');
    process.exit(0);
}

let uploaded = 0;
for (const file of uploads) {
    if (!(await r2.putIfMissing(file))) continue;
    uploaded++;
    console.log(`  ↑ ${file.key}`);
}

// 傳完才寫目錄：影片與封面換成雜湊檔名，網頁從 mediaBase 讀
const synced = structuredClone(index);
synced.mediaBase = PUBLIC_BASE;
for (const item of synced.sections.flatMap(section => section.items)) {
    if (item.status !== 'ready') continue;
    item.video = renamed.get(item.video);
    item.poster = renamed.get(item.poster);
}
fs.mkdirSync(path.dirname(indexTarget), { recursive: true });
fs.writeFileSync(indexTarget, `${JSON.stringify(synced, null, 4)}\n`);

const current = new Set(uploads.map(file => file.key));
const stale = (await r2.listKeys()).filter(key => !key.startsWith(PROMO_DIR) && !current.has(key));
if (prune) {
    for (const key of stale) await r2.remove(key);
}

const count = status => items.filter(item => item.status === status).length;
const staleNote = prune ? `、刪掉 ${stale.length} 個舊檔` : stale.length ? `；R2 上有 ${stale.length} 個不在清單裡的舊檔（加 --prune 刪掉）` : '';
console.log(`  ready ${count('ready')}、phone ${count('phone')}、diagram ${count('diagram')}、todo ${count('todo')}，共 ${items.length} 項`);
console.log(`  上傳 ${uploaded} 個、已經在 R2 上 ${uploads.length - uploaded} 個${staleNote}`);
console.log(`  → ${PUBLIC_BASE}、docs/features/dindon/demo/demos.json`);
