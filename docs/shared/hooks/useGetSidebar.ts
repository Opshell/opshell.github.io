import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

import { DefaultTheme } from 'vitepress';

const PAGES_PATH = path.resolve(__dirname, '../../pages'); // 把pages 設定成根目錄
const WHITE_LIST = ['index.md']; // 白名單，不需要顯示的文件或目錄

// 判斷是否是資料夾
const isDirectory = (path: string) => fs.lstatSync(path).isDirectory();
// 取陣列差值
const intersections = (arr1: string[], arr2: string[]) => Array.from(new Set(arr1.filter(item => !new Set(arr2).has(item))));

// 取得 FrontMatter
function getFrontMatter(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);

    return data;
}

function getList(params: string[], absolutePath: string, startPath: string): DefaultTheme.SidebarItem[] {
    const res = [];

    for (const file of params) {
        const dir = path.join(absolutePath, file); // 組合路徑
        const isDir = isDirectory(dir); // 判斷是否是資料夾

        if (isDir) { // 如果是資料夾，遞迴進下一次
            const files = fs.readdirSync(dir);

            const child = getList(files, dir, `${startPath}/${file}`);

            if (child.length > 0) {
                res.push({
                    text: file,
                    collapsed: true,
                    items: child
                });
            }
        } else {
            const fileName = path.basename(file);

            // 排除非md檔案
            const suffix = path.extname(file);
            if (suffix !== '.md') {
                continue;
            }

            const frontmatter = getFrontMatter(`${absolutePath}/${file}`);

            if (frontmatter.isPublished) { // 判斷是否發布
                res.push({
                    text: frontmatter.title as string || fileName.replace('.md', ''),
                    link: `${startPath}/${fileName.replace('.md', '')}`
                });
            }
        }
    }

    return res;
}

export async function getSidebar(startPath: string) {
    const absolutePath = path.join(PAGES_PATH, startPath); // 轉換出絕對路徑

    const files = fs.readdirSync(absolutePath); // 讀取目錄下的資料夾&文件

    const items = intersections(files, WHITE_LIST); // 排除白名單

    return getList(items, absolutePath, startPath);
}
