import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import matter from 'gray-matter';
import { globby } from 'globby';

const ROOT = path.resolve('c:/wamp64/www/opshell.github.io');
const TARGET_GLOB = 'docs/pages/article/**/*.md';

function normalizeArray(value) {
    if (Array.isArray(value))
        return value;
    if (value == null || value === '')
        return [];
    if (typeof value === 'string')
        return value.split(',').map(s => s.trim()).filter(Boolean);
    return [];
}

function hasFolderSegment(filePath, segment) {
    const parts = filePath.split(path.sep).map(p => p.toLowerCase());
    return parts.includes(segment.toLowerCase());
}

function normalizeTagCase(tags) {
    // 將任何等於 'typescript'（不分大小寫）的標籤正規化為 'TypeScript'
    return tags.map(t => (typeof t === 'string' && t.trim().toLowerCase() === 'typescript' ? 'TypeScript' : t));
}

function ensureTypeScriptTag(tags) {
    const lower = new Set(tags.map(t => String(t).toLowerCase()));
    if (!lower.has('typescript')) {
        tags.push('TypeScript');
    }
    return Array.from(new Set(tags));
}

async function processFile(filePath) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const data = { ...parsed.data };

    let tags = normalizeArray(data.tags);
    const before = JSON.stringify(tags);

    // 1) 全域：將 'typescript' => 'TypeScript'
    tags = normalizeTagCase(tags);

    // 2) 若位於 /typescript 目錄（例如 docs/pages/article/code-sea/typescript/...）則確保包含 'TypeScript'
    if (hasFolderSegment(filePath, 'typescript')) {
        tags = ensureTypeScriptTag(tags);
    }

    const after = JSON.stringify(tags);
    if (before !== after) {
        data.tags = tags;
        const out = matter.stringify(parsed.content.trimStart(), data);
        if (out !== raw) {
            await fs.writeFile(filePath, out, 'utf8');
            return { filePath, updated: true };
        }
    }
    return { filePath, updated: false };
}

async function main() {
    const files = await globby(TARGET_GLOB, { gitignore: true, cwd: ROOT, absolute: true });
    let updated = 0;
    for (const f of files) {
        const res = await processFile(f);
        if (res.updated)
            updated++;
    }
    console.log(`Scanned ${files.length} files, updated ${updated} files.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
