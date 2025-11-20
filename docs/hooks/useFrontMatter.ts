import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const PAGES_PATH = path.resolve(__dirname, '../pages'); // 把pages 設定成根目錄

export function absolutePath(startPath: string) {
    return path.join(PAGES_PATH, startPath); // 轉換出絕對路徑
}

export function isDirectory(filePath: string) {
    return fs.lstatSync(filePath).isDirectory();
}

// getFrontMatter
export function getFrontMatter(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);

    return data;
};
