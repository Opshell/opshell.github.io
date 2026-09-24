import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// 把叮咚記帳的功能演示素材（影片、封面、目錄）複製進網站，給 /dindon/demo/ 用。
//
// 素材由前端 Claude 在 DinDon_Android/store/demos/ 產生，規格見那裡的 README.md（溝通板 #0055）。
// 網站只讀 index.json，影片與封面照 index.json 裡 ready 的那幾支複製；
// 目錄的縮圖（NN-slug.thumb.webp）由這支從封面縮出來：封面 540 寬、一張 80 KB，目錄一次列 32 張太重。
// 素材在另一個倉庫，CI 拿不到，所以複製過來的檔案要 commit。
// 前端補錄或重錄之後重跑：pnpm dindon:demos（每次整批覆蓋，已經不在清單上的舊檔會刪掉）
//
// 素材路徑預設是本機的 ~/WWW/DinDon/DinDon_Android/store/demos，不同位置可以用第一個參數指定。

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const source = path.resolve(process.argv[2]
    ?? path.join(root, '..', 'DinDon', 'DinDon_Android', 'store', 'demos'));
const mediaDir = path.join(root, 'docs', 'public', 'images', 'dindon', 'demos');
const indexTarget = path.join(root, 'docs', 'features', 'dindon', 'demo', 'demos.json');

/** 目錄卡片上顯示約 110px 寬，給兩倍 */
const THUMB_WIDTH = 240;
const thumbName = poster => poster.replace(/\.\w+$/, '.thumb.webp');

const indexSource = path.join(source, 'index.json');
if (!fs.existsSync(indexSource)) {
    console.error(`找不到演示目錄：${indexSource}\n用法：pnpm dindon:demos [store/demos 的路徑]`);
    process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexSource, 'utf8'));
const items = index.sections.flatMap(section => section.items);
const ready = items.filter(item => item.status === 'ready');
const files = ready.flatMap(item => [item.video, item.poster]);
const thumbs = ready.map(item => thumbName(item.poster));

const missing = files.filter(file => !fs.existsSync(path.join(source, file)));
if (missing.length) {
    console.error(`index.json 列了但資料夾裡沒有：\n  ${missing.join('\n  ')}`);
    process.exit(1);
}

fs.mkdirSync(mediaDir, { recursive: true });
const stale = fs.readdirSync(mediaDir).filter(file => !files.includes(file) && !thumbs.includes(file));
for (const file of stale) fs.rmSync(path.join(mediaDir, file));
for (const file of files) fs.copyFileSync(path.join(source, file), path.join(mediaDir, file));
for (const item of ready) {
    await sharp(path.join(source, item.poster))
        .resize(THUMB_WIDTH)
        .webp({ quality: 72 })
        .toFile(path.join(mediaDir, thumbName(item.poster)));
}

fs.mkdirSync(path.dirname(indexTarget), { recursive: true });
fs.writeFileSync(indexTarget, `${JSON.stringify(index, null, 4)}\n`);

const count = status => items.filter(item => item.status === status).length;
const size = [...files, ...thumbs].reduce((sum, file) => sum + fs.statSync(path.join(mediaDir, file)).size, 0);
console.log(`已同步 App ${index.appVersion} 的演示（${index.generatedAt}）`);
console.log(`  ready ${count('ready')}、phone ${count('phone')}、diagram ${count('diagram')}、todo ${count('todo')}，共 ${items.length} 項`);
console.log(`  複製 ${files.length} 個檔案、產生 ${thumbs.length} 張縮圖（${(size / 1024 / 1024).toFixed(1)} MB）${stale.length ? `，刪掉 ${stale.length} 個舊檔` : ''}`);
console.log('  → docs/public/images/dindon/demos/、docs/features/dindon/demo/demos.json');
