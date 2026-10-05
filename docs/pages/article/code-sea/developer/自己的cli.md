---
title: '開案別再複製上一個專案：團隊模板、自己的 CLI 與 monorepo'
image: ''
description: '公司的專案功能和介面都很像，每次開案卻都從上一個專案複製貼上？比較 template repo、自己寫一支 create CLI、monorepo 共用 base 套件三種做法，以及主管為什麼會猶豫。'
keywords: ''
author: Opshell
createdAt: '2024-10-09'
categories:
  - Developer
tags:
  - CLI
  - Node.js
  - monorepo
  - 專案模板
editLink: true
isPublished: false
---
::: warning 草稿
Claude 於 2026-10-05 補完：把原本的群組對話改寫成文章（拿掉對話者名字，論點都保留），補上 template repo、create CLI、pnpm workspace 的範例。看過、改成自己的話之後刪掉這個區塊，發佈工具才會放行。
:::

::: info 這篇的脈絡
這篇來自前端群組裡的一段討論。有位大大跟主管提議：「我們的產品功能跟介面相似度很高，可以開一個 template project，之後開案就 clone 那個專案就好。」
主管先說「但技術會更新」，他回「所以那個專案也要迭代啊」；主管又說「可是每個專案邏輯不一樣」，接著就若有所思了。
群組裡大家都覺得這件事很必要，也有人正在做。我把討論整理成文章，寫給每次開案都在複製上一個專案的團隊。
:::

## 懶人包
- 產品相似度高的團隊，**很值得有一個 base 專案**：內部所有共用的 method 都先搞定，之後 fork 或 clone 就能開始工作。
- 做法由淺到深：**template repo** → **自己的 CLI**（像 `npm create vite@latest`）→ **monorepo 加共用的 base 套件**。
- 這跟「模組化」是不同方向：模板解決的是「怎麼開始」，模組化解決的是「怎麼共用、怎麼更新」。
- 用 Node.js 寫一支 CLI 本身不難，**難的是想清楚哪些是通用、哪些要客製**，以及日後怎麼統一管理。
- 主管會猶豫，多半不是技術問題，而是沒經驗、掌握不了；~~或是做完之後事情變少，看起來好像很涼。~~

## 觀點拆解

### 「技術會更新」跟「每個專案邏輯不一樣」

這兩個疑慮都很合理，但都不是不做的理由。

- **技術會更新**：所以模板也要迭代。模板不是做一次就放著，它跟產品一樣有版本。
- **每個專案邏輯不一樣**：所以模板只放「每個專案都一樣」的部分：登入、權限、API 封裝、版面、共用元件、lint 設定。業務邏輯本來就該在各專案自己寫。

真正要想的問題是：**那些需要被客製的部分和通用部分，究竟有哪些做法可以在日後統一管理？** 這才是整件事的難點。

### 三種做法

**1. Template repo：最快上手**

把 base 專案放在 GitHub，開成 template repository，或用 `degit`、`giget` 這類工具拉下來。類似 git template 的概念，幾乎零成本。

缺點是**複製一次就分家了**：模板之後修了 bug，已經開出去的專案不會自動拿到。

**2. 自己的 CLI：像 create-vite 一樣開案**

就像 `npm create vite@latest my-vue-app -- --template vue`，建好之後就是你公司自己的包，有內建的 method。CLI 的好處是可以問問題：要哪個 UI 框架？要不要權限模組？依回答組出不同的專案。

用 Node.js 寫一支 CLI 本身沒什麼問題，幾十行就能動。它解決的是「開案」這一刻，開出去之後一樣是各自的專案。

**3. Monorepo + base 套件：更新也要能同步**

如果公司有規劃，也可以改用 monorepo 處理。這時候需要一個 base 的包，把共用的 method、元件放進去，各專案用依賴的方式引用，而不是複製。base 套件一更新，所有專案升級版本就拿得到。

這才是真正回答「技術會更新」的做法，代價是要有人維護 base 套件的版本與相容性。

### 主管為什麼會猶豫

群組裡的看法很一致：多半是**掌握不了，或不夠深入理解**。

- 經手的人沒有經驗，不知道通用與客製的界線要畫在哪，乾脆不碰。
- 也有比較現實的解讀：做完之後重複的事情變少了，反而看起來很涼。俗稱「戰略性裝忙」。

如果遇到這種情況，與其說服，不如先在自己負責的專案裡把 base 整理出來。等下一次開案，大家看到「clone 下來就能動」的速度，比任何簡報都有說服力。

## 例子與對比

### 做法 1：template repo

```sh
# 用 giget 從 GitHub 拉模板（不帶 git 歷史）
npx giget gh:your-org/admin-template my-app

# 或 degit
npx degit your-org/admin-template my-app
```

### 做法 2：一支最小的 create CLI

`npm create ops-app@latest my-app` 會去找名叫 `create-ops-app` 的套件執行，所以套件照這個規則命名：

::: code-group
```json [package.json]
{
    "name": "create-ops-app",
    "version": "1.0.0",
    "type": "module",
    "bin": {
        "create-ops-app": "bin/index.js"
    },
    "files": ["bin", "templates"],
    "engines": {
        "node": ">=22"
    }
}
```

```js [bin/index.js]
#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { cp, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
        template: { type: 'string', default: 'admin' }
    }
});

const targetDir = positionals[0] ?? 'my-app';
const templateDir = fileURLToPath(new URL(`../templates/${values.template}`, import.meta.url));

if (!existsSync(templateDir)) {
    console.error(`找不到模板：${values.template}`);
    process.exit(1);
}

if (existsSync(targetDir)) {
    console.error(`資料夾 ${targetDir} 已經存在`);
    process.exit(1);
}

await cp(templateDir, targetDir, { recursive: true });

// npm 發佈時會把 .gitignore 拿掉，所以模板裡存成 _gitignore，複製完再改回來
const gitignore = path.join(targetDir, '_gitignore');
if (existsSync(gitignore)) {
    await rename(gitignore, path.join(targetDir, '.gitignore'));
}

// 把 package.json 的名稱換成新專案的名稱
const pkgPath = path.join(targetDir, 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
pkg.name = path.basename(targetDir);
await writeFile(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`);

console.log(`完成！\n\n  cd ${targetDir}\n  pnpm install\n  pnpm dev`);
```
:::

```sh
npm create ops-app@latest my-app -- --template admin
```

模板放在 `templates/admin/`、`templates/landing/` 底下，要幾種就放幾種。想要互動式提問，再加上 `@clack/prompts` 這類套件就好。

### 做法 3：pnpm workspace + base 套件

::: code-group
```yaml [pnpm-workspace.yaml]
packages:
  - apps/*
  - packages/*
```

```json [apps/project-a/package.json]
{
    "name": "project-a",
    "dependencies": {
        "@your-org/core": "workspace:*"
    }
}
```
:::

```text
company-frontend/
 ├─ apps/
 │   ├─ project-a/        # 各專案只寫自己的業務邏輯
 │   └─ project-b/
 └─ packages/
     └─ core/             # 共用的 API 封裝、權限、元件、工具函式
```

### 三種做法比較

| | Template repo | 自己的 CLI | Monorepo + base 套件 |
|---|---|---|---|
| 建置成本 | 最低 | 中 | 最高 |
| 開案速度 | 快 | 快，還能依需求組合 | 快 |
| 共用程式碼更新 | 不會同步，各自手動改 | 不會同步 | 升級版本就同步 |
| 適合 | 小團隊、案子不多 | 專案類型有幾種固定組合 | 長期維護、多個產品線 |

## 結論

每次開案都從上一個專案複製貼上，就像每次搬家都把上一間房子的垃圾一起打包。先有一個乾淨的 base 專案，再看團隊規模決定要不要做 CLI、要不要走 monorepo。
技術一定會更新，所以模板也要迭代；這不是不做的理由，而是開始做之後的日常。如果真的推不動，那就先把自己的那一份做好，戰略性裝忙這招，留給別人用吧。
