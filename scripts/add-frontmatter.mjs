import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { globby } from 'globby';
import matter from 'gray-matter';

const ROOT = path.resolve('c:/wamp64/www/opshell.github.io');
const TARGET_GLOB = 'docs/pages/article/**/*.md';

function formatDateYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function filenameToTitle(filePath) {
    const base = path.parse(filePath).name;
    // 將 - _ 轉空白以增進可讀性；保留其他字元（含中文）
    return base.replace(/[\-_]+/g, ' ').trim();
}

function shouldAddVersion(filePath, title) {
    // 僅針對明顯是「開發規範」或「設定」類文章保守判定
    const p = `${filePath} ${title}`;
    return /開發規範|規範|設定|config/i.test(p);
}

function normalizeArray(value) {
    if (Array.isArray(value))
        return value;
    if (value == null || value === '')
        return [];
    // 若使用者放了逗號分隔字串，做個寬鬆處理
    if (typeof value === 'string')
        return value.split(',').map(s => s.trim()).filter(Boolean);
    return [];
}

async function getBirthDate(filePath) {
    try {
        const stat = await fs.stat(filePath);
        return formatDateYYYYMMDD(stat.birthtime instanceof Date ? stat.birthtime : new Date(stat.birthtime));
    } catch (e) {
    // 退回用現在日期（極少數平台不支援 birthtime）
        return formatDateYYYYMMDD(new Date());
    }
}

async function processFile(filePath) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const data = { ...parsed.data };

    // title
    if (!data.title || String(data.title).trim() === '') {
        data.title = filenameToTitle(filePath);
    }

    // image / description / keywords
    if (data.image == null)
        data.image = '';
    if (data.description == null)
        data.description = '';
    if (data.keywords == null)
        data.keywords = '';

    // author
    if (!data.author)
        data.author = 'Opshell';

    // createdAt
    if (!data.createdAt) {
        data.createdAt = await getBirthDate(filePath);
    }

    // categories（只允許單一）
    const cats = normalizeArray(data.categories);
    data.categories = cats.slice(0, 1);

    // tags（最多 5 個）
    const tags = normalizeArray(data.tags);
    data.tags = tags.slice(0, 5);

    // editLink / isPublished
    if (typeof data.editLink !== 'boolean')
        data.editLink = true;
    if (typeof data.isPublished !== 'boolean')
        data.isPublished = false;

    // version（僅在明顯是規範/設定類型且尚未提供時加入）
    if (!data.version && shouldAddVersion(filePath, data.title)) {
        data.version = '1.0.0';
    }

    // 寫回
    const out = matter.stringify(parsed.content.trimStart(), data);
    if (out !== raw) {
        await fs.writeFile(filePath, out, 'utf8');
        return { filePath, updated: true };
    }
    return { filePath, updated: false };
}

async function main() {
    const files = await globby(TARGET_GLOB, { gitignore: true, cwd: ROOT, absolute: true });
    let updatedCount = 0;
    for (const f of files) {
        const res = await processFile(f);
        if (res.updated)
            updatedCount++;
    }
    console.log(`Processed ${files.length} files, updated ${updatedCount} files.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
