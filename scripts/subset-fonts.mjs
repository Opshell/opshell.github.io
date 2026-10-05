import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

// 把 Noto Sans TC 切成一百多個小檔，每個檔只放一段字元（unicode-range），
// 瀏覽器只會下載這一頁真的用到的那幾片。
//
// 為什麼要切：四種字重各 2.9 MB，不切的話每一頁都要先吞 8～11 MB 字型，是整個網站其他東西加起來的好幾倍。
// 切完每一頁通常只下載幾百 KB。woff2 已經是壓得最小的格式，再省就只能從「少下載」下手。
//
// 切法借 Google Fonts 的：它把常用字放在同一片、罕用字放另外幾片（scripts/lib/noto-sans-tc-ranges.json），
// 比單純照 Unicode 區段對切有效得多。表是從 fonts.googleapis.com 的 CSS 抄下來的，字型改版不用重抓。
//
// 來源字型放 docs/.vitepress/theme/fonts/Noto_Sans_TC/*.woff2（CSS 不再直接引用它們），
// 產出放同目錄的 subset/，@font-face 寫到 theme/fonts/noto-sans-tc.css。
// 產出要 commit：CI 不跑這支，換字型或改切片表才重跑：pnpm fonts:subset

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const fontsDir = path.join(root, 'docs', '.vitepress', 'theme', 'fonts');
const sourceDir = path.join(fontsDir, 'Noto_Sans_TC');
const outputDir = path.join(sourceDir, 'subset');
const cssFile = path.join(fontsDir, 'noto-sans-tc.css');
const ranges = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'noto-sans-tc-ranges.json'), 'utf8'));

// 檔名裡的字重名稱對應 CSS 的 font-weight
const weights = { Light: 300, Regular: 400, Medium: 500, Bold: 700 };

// 'U+4E00-4E05, U+4E10' → 這些碼位組成的字串，subset-font 要的是「保留哪些字」
function rangeToText(range) {
    let text = '';
    for (const part of range.split(',')) {
        const [start, end] = part.trim().replace(/^U\+/i, '').split('-').map(hex => Number.parseInt(hex, 16));
        for (let code = start; code <= (end ?? start); code++) {
            text += String.fromCodePoint(code);
        }
    }
    return text;
}

const sources = fs.readdirSync(sourceDir)
    .filter(name => /^NotoSansTC-(?:Light|Regular|Medium|Bold)\.woff2$/.test(name))
    .sort();

if (sources.length === 0) {
    console.error(`找不到來源字型：${sourceDir}/NotoSansTC-*.woff2`);
    process.exit(1);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir);

// 先切完所有字重，再照「同一片的四種字重相鄰」的順序寫 CSS：
// 四種字重的 unicode-range 文字完全相同，相鄰才在 gzip 的 32 KB 視窗內，壓縮後才不會一條條各算一次。
const produced = []; // { file, weight, index }
let total = 0;

for (const name of sources) {
    const weightName = name.match(/-(\w+)\.woff2$/)[1];
    const weight = weights[weightName];
    const source = fs.readFileSync(path.join(sourceDir, name));
    const started = Date.now();
    let weightTotal = 0;

    for (const [index, range] of ranges.entries()) {
        const buffer = await subsetFont(source, rangeToText(range), { targetFormat: 'woff2' });
        const file = `NotoSansTC-${weightName}.${index}.woff2`;
        fs.writeFileSync(path.join(outputDir, file), buffer);
        weightTotal += buffer.length;
        produced.push({ file, weight, index });
    }

    total += weightTotal;
    console.log(`${name}：${(source.length / 1024).toFixed(0)} KB → ${ranges.length} 片共 ${(weightTotal / 1024).toFixed(0)} KB（${((Date.now() - started) / 1000).toFixed(1)} 秒）`);
}

const css = [
    '/* 由 scripts/subset-fonts.mjs 產生，不要手改；要改字重或切片請改腳本再跑 pnpm fonts:subset */',
    ''
];

produced.sort((a, b) => a.index - b.index || a.weight - b.weight);
for (const { file, weight, index } of produced) {
    css.push(
        '@font-face {',
        '    font-family: NotoSansTC;',
        `    src: url('./Noto_Sans_TC/subset/${file}') format('woff2');`,
        `    font-weight: ${weight};`,
        '    font-style: normal;',
        '    font-display: swap;',
        `    unicode-range: ${ranges[index]};`,
        '}'
    );
}

fs.writeFileSync(cssFile, `${css.join('\n')}\n`);
console.log(`寫入 ${path.relative(root, cssFile)}，${sources.length} 種字重共 ${(total / 1024 / 1024).toFixed(1)} MB`);
