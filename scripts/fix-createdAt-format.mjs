import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { globby } from 'globby';
import matter from 'gray-matter';

const ROOT = path.resolve('c:/wamp64/www/opshell.github.io');
const TARGET_GLOB = 'docs/**/*.md';

function pad2(n) { return String(n).padStart(2, '0'); }
function formatYYYYMMDDFromParts(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }
function formatDateYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return formatYYYYMMDDFromParts(y, m, d);
}

function normalizeCreatedAt(value) {
    if (value == null || value === '')
        return null; // 不處理缺省

    // 若已是 Date 或可被解析成 Date（但盡量避免誤判），統一格式化
    if (value instanceof Date) {
        return formatDateYYYYMMDD(value);
    }

    if (typeof value === 'string') {
        const s = value.trim().replace(/"|'/g, q => q); // 保留字串，去除前後空白

        // 1) 嚴格匹配 YYYY[-|/]MM[-|/]DD 並重組，確保 0 補齊
        const m1 = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (m1) {
            const [, y, mm, dd] = m1;
            return formatYYYYMMDDFromParts(y, mm, dd);
        }

        // 2) 已符合 YYYY-MM-DD 直接返回
        if (/^\d{4}-\d{2}-\d{2}$/.test(s))
            return s;

        // 3) 其他可解析情境，盡量保守，避免亂改格式
        const t = Date.parse(s);
        if (!Number.isNaN(t)) {
            return formatDateYYYYMMDD(new Date(t));
        }

        // 4) 無法解析則不變更
        return s;
    }

    // 其他型別不處理
    return null;
}

async function processFile(filePath) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const data = { ...parsed.data };

    if (!('createdAt' in data))
        return false; // 無欄位跳過

    const before = data.createdAt;
    const normalized = normalizeCreatedAt(before);

    if (normalized && normalized !== before) {
        data.createdAt = normalized;
        const out = matter.stringify(parsed.content.trimStart(), data);
        if (out !== raw) {
            await fs.writeFile(filePath, out, 'utf8');
            return true;
        }
    }
    return false;
}

async function main() {
    const files = await globby(TARGET_GLOB, { gitignore: true, cwd: ROOT, absolute: true });
    let updated = 0;
    for (const f of files) {
        const ok = await processFile(f);
        if (ok)
            updated++;
    }
    console.log(`Scanned ${files.length} files, updated ${updated} files.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
