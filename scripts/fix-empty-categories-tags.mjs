import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { globby } from 'globby';

const ROOT = path.resolve('c:/wamp64/www/opshell.github.io');
const TARGET_GLOB = 'docs/**/*.md';

function replaceEmptyArraysInFrontmatter(source) {
    // 僅處理檔案開頭的第一個 frontmatter 區塊
    if (!source.startsWith('---'))
        return { changed: false, output: source };
    const end = source.indexOf('\n---', 3);
    if (end === -1)
        return { changed: false, output: source };

    const headerEnd = end + '\n---'.length; // 位置在第二個 --- 的起頭
    const header = source.slice(0, headerEnd);
    const rest = source.slice(headerEnd);

    const replaced = header
    // categories: [] -> categories:
        .replace(/^(\s*categories:\s*)\[\s*\]\s*$/m, '$1')
    // tags: [] -> tags:
        .replace(/^(\s*tags:\s*)\[\s*\]\s*$/m, '$1');

    if (replaced !== header) {
        return { changed: true, output: replaced + rest };
    }
    return { changed: false, output: source };
}

async function processFile(filePath) {
    const raw = await fs.readFile(filePath, 'utf8');
    const { changed, output } = replaceEmptyArraysInFrontmatter(raw);
    if (changed) {
        await fs.writeFile(filePath, output, 'utf8');
        return true;
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
