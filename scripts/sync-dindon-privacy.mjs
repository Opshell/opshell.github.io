import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// 把叮咚記帳 App 裡的隱私權政策同步成網站的 /dindon/privacy/ 頁面。
//
// 原稿只有一份：DinDon_Android/app/src/main/assets/privacy_policy.md（App 內頁讀的就是它）。
// 網頁不另外手寫，原稿改了就重跑：pnpm dindon:privacy
// 原稿在另一個倉庫，CI 拿不到，所以產生出來的頁面要 commit。
//
// 原稿路徑預設是本機的 ~/WWW/DinDon/DinDon_Android，不同位置可以用第一個參數指定。

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const source = path.resolve(process.argv[2]
    ?? path.join(root, '..', 'DinDon', 'DinDon_Android', 'app', 'src', 'main', 'assets', 'privacy_policy.md'));
const target = path.join(root, 'docs', 'pages', 'dindon', 'privacy', 'index.md');

if (!fs.existsSync(source)) {
    console.error(`找不到隱私權政策原稿：${source}\n用法：pnpm dindon:privacy [原稿路徑]`);
    process.exit(1);
}

const policy = fs.readFileSync(source, 'utf8').trim();

// 內文照原稿；網頁的 <title> 固定寫完整 App 名稱（原稿用「**叮咚**」當簡稱，放在分頁標籤與搜尋結果裡會看不懂）
const title = '叮咚記帳隱私權政策';
const updated = policy.match(/^最後更新：(.+)$/m)?.[1] ?? '';

const page = `---
title: ${title}
description: 叮咚記帳（DinDon Ledger）的隱私權政策：App 會碰到哪些資料、存在哪裡、會不會送出去，以及怎麼刪除。
layout: doc
class: dindon-privacy
sidebar: false
# 這一頁由 scripts/sync-dindon-privacy.mjs 從 App 的 privacy_policy.md 產生，不要直接改這個檔案。
# 不設 isPublished：設了會被當成文章，出現在時間軸與標籤列表。
---

<!-- 由 scripts/sync-dindon-privacy.mjs 產生（原稿最後更新：${updated}）。要改內容請改 App 的 privacy_policy.md 再重跑。 -->

[← 回到叮咚記帳](/dindon/)

<div class="dindon-privacy__callout">

**要刪除資料或帳號？** 每一種資料怎麼刪、哪些可以只刪一部分，以及用 Google 帳號線上刪除，
都整理在 [刪除資料與帳號](/dindon/account/) 這一頁。

</div>

${policy}

---

[← 回到叮咚記帳](/dindon/)

<style>
/* 部落格把粗體畫成醒目的標籤，政策裡的「**叮咚**」會變成一顆顆標籤；這一頁恢復成一般粗體 */
.dindon-privacy .vp-doc strong {
    background: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
    font-weight: 700;
}
/* 這個網站的 body 是黑底，只有文章版型自己鋪了背景；doc 版型要自己補，不然淺色模式是黑底深字 */
.Layout.dindon-privacy { background: var(--vp-c-bg); }
/* 部落格文章的作者、日期資訊列，政策頁用不到 */
.dindon-privacy .article-meta-header { display: none; }
/* 刪除資料的入口：政策很長，找刪除辦法的人要在第一眼就看到 */
.dindon-privacy .dindon-privacy__callout {
    background: var(--vp-c-default-soft);
    padding: 16px 20px;
    border-radius: 12px;
    margin: 24px 0;
}
.dindon-privacy .dindon-privacy__callout p:last-child { margin-bottom: 0; }
</style>
`;

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, page);
console.log(`已同步：${path.relative(root, target)}（${title}，${updated}）`);
