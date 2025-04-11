import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// 模擬 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 從命令列參數取得文章標題
const args = process.argv.slice(2);
const title = args[0];

if (!title) {
    console.error('請提供文章標題！使用方式：yarn run new-post "文章標題"');
    process.exit(1);
}

// 產生檔案名稱（將標題轉為 kebab-case）
const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4E00-\u9FA5]+/gi, '-')
    // .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const date = new Date().toISOString().split('T')[0]; // 今天的日期，格式 YYYY-MM-DD
const fileName = `${slug}.md`;

// 文章存放路徑
const postsDir = path.join(__dirname, '../docs/pages/article');
const filePath = path.join(postsDir, fileName);

// 產生 Markdown 檔案內容
const templateContent = `---
title: ${title}
image:
description:
keywords:
author: 'Opshell'
createdAt: ${date}
categories:
  - '未分類'
tags:
  -
editLink: true
isPublished: false
---

#
`;

// 確保 posts 資料夾存在
if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
}

// 檢查檔案是否已存在
if (fs.existsSync(filePath)) {
    console.error(`錯誤：檔案 ${fileName} 已存在！`);
    process.exit(1);
}

// 寫入檔案
fs.writeFileSync(filePath, templateContent, 'utf8');
console.log(`成功建立文章：${filePath}`);
