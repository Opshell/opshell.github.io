import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// 建一篇新文章的骨架。
//   pnpm new-post "文章標題"            ← 放 docs/pages/article/ 根目錄（之後要自己搬到分類資料夾）
//   pnpm new-post "文章標題" ai         ← 放 docs/pages/article/ai/（AI 專區）
//   pnpm new-post "文章標題" ai 心得    ← 同上，分類設成「心得」（AI 專區首頁的「心得」分頁）
//   pnpm new-post "文章標題" code-sea/vue

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const [title, folder = '', category = folder === 'ai' ? 'AI' : '未分類'] = process.argv.slice(2);

if (!title) {
    console.error('請提供文章標題！用法：pnpm new-post "文章標題" [資料夾] [分類]');
    process.exit(1);
}

// 檔名：標題轉小寫、非英數中文的字元換成 -
const slug = title.toLowerCase().replace(/[^a-z0-9\p{Script=Han}]+/giu, '-').replace(/(^-|-$)/g, '');
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
const postsDir = path.join(__dirname, '../docs/pages/article', folder);
const filePath = path.join(postsDir, `${slug}.md`);

const template = `---
title: '${title.replace(/'/g, '\'\'')}'
image: ''
description: ''
keywords: ''
author: Opshell
createdAt: '${today}'
categories:
  - ${category}
tags: []
editLink: true
isPublished: false
---

::: info 這篇的脈絡
為什麼寫這篇、遇到什麼狀況、寫給誰看。
:::

`;

fs.mkdirSync(postsDir, { recursive: true });
if (fs.existsSync(filePath)) {
    console.error(`錯誤：檔案 ${path.relative(process.cwd(), filePath)} 已存在！`);
    process.exit(1);
}
fs.writeFileSync(filePath, template, 'utf8');
console.log(`成功建立文章：${path.relative(process.cwd(), filePath)}`);
