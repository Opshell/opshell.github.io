import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// 發佈一篇草稿：isPublished 改成 true、createdAt 改成今天（台灣時間），原本的日期留在 draftedAt。
// 發佈日要改成今天，因為時間軸依 createdAt 排序；不改的話 2025 年寫的稿子一發佈就沉到很後面。
//
//   pnpm publish-next               ← 從 docs/devlog/發文排程.md 拿第一篇還沒打勾的，發完在清單上打勾
//   pnpm publish-post <md 路徑>     ← 指定某一篇
//
// 只改檔案，不 commit、不 push；印出下一步要打的指令。

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUEUE = path.join(root, 'docs/devlog/發文排程.md');
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());

function fail(message) {
    console.error(`✗ ${message}`);
    process.exit(1);
}

function publish(file) {
    const abs = path.resolve(root, file);
    if (!fs.existsSync(abs)) fail(`找不到檔案：${file}`);
    const text = fs.readFileSync(abs, 'utf8');
    const match = text.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) fail(`${file} 沒有 frontmatter`);
    let fm = match[1];
    const body = text.slice(match[0].length);

    if (/^isPublished:\s*true\s*$/m.test(fm)) fail(`${file} 已經是發佈狀態`);
    if (body.includes('::: warning 草稿')) fail(`${file} 內文還有「草稿」提示，改完、把那段刪掉再發`);

    const original = fm.match(/^createdAt:\s*['"]?([^'"\n]*)['"]?\s*$/m)?.[1] ?? '';
    fm = /^isPublished:/m.test(fm) ? fm.replace(/^isPublished:.*$/m, 'isPublished: true') : `${fm}\nisPublished: true`;
    fm = /^createdAt:/m.test(fm) ? fm.replace(/^createdAt:.*$/m, `createdAt: '${today}'`) : `${fm}\ncreatedAt: '${today}'`;
    if (original && original !== today && !/^draftedAt:/m.test(fm)) fm = fm.replace(/^createdAt:.*$/m, `$&\ndraftedAt: '${original}'`);

    fs.writeFileSync(abs, `---\n${fm}\n---\n${body}`);
    const title = fm.match(/^title:\s*['"]?(.*?)['"]?\s*$/m)?.[1] ?? path.basename(file);
    console.log(`✓ 已發佈：${title}（${today}${original && original !== today ? `，原稿 ${original}` : ''}）`);
    return title;
}

const [mode] = process.argv.slice(2);

if (mode === '--next') {
    if (!fs.existsSync(QUEUE)) fail('找不到 docs/devlog/發文排程.md');
    const lines = fs.readFileSync(QUEUE, 'utf8').split('\n');
    const index = lines.findIndex(l => /^\s*- \[ \] /.test(l) && /`docs\/pages\/[^`]+\.md`/.test(l));
    if (index === -1) fail('排程清單裡沒有還沒發的文章了');
    const file = lines[index].match(/`(docs\/pages\/[^`]+\.md)`/)[1];
    const title = publish(file);
    lines[index] = lines[index].replace('- [ ] ', `- [x] ${today} `);
    fs.writeFileSync(QUEUE, lines.join('\n'));
    const rest = lines.filter(l => /^\s*- \[ \] /.test(l) && l.includes('`docs/pages/')).length;
    console.log(`  排程清單已打勾，還剩 ${rest} 篇。`);
    console.log(`\n下一步：\n  pnpm docs:build && git add "${file}" docs/devlog/發文排程.md && git commit -m "docs(article): 發佈〈${title}〉" && git push`);
} else if (mode) {
    const file = path.relative(root, path.resolve(process.cwd(), mode));
    const title = publish(file);
    console.log(`\n下一步：\n  pnpm docs:build && git add "${file}" && git commit -m "docs(article): 發佈〈${title}〉" && git push`);
} else {
    fail('用法：pnpm publish-next，或 pnpm publish-post <md 路徑>');
}
