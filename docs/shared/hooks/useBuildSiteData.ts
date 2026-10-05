import type { Post } from '../schemas/post.schema';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import { PostFrontmatterParser } from '../schemas/post.schema';
import { isListed, listedTitle } from '../utils/drafts';

interface Tags {
    [key: string]: {
        count: number;
        group: {
            title: string;
            image: string;
            category: string;
            date: string;
            url: string;
        }[];
    };
}
export interface Classification {
    count: {
        total: number;
        published: number;
        unpublished: number;
    };
    tags: Tags;
    category: string;
}

// 單篇文章的結構（Post）定義在 schemas/post.schema.ts，由 Zod 驗證後產生

// [-] Tag 索引的結構
export interface TagIndex {
    count: number;
    postUrls: string[]; // 只儲存文章的 url 作為 "指針"
}

export interface SiteData {
    counts: {
        published: number;
        unpublished: number;
        total: number;
    };
    posts: Map<string, Post>; //  關鍵資料來源: url -> Post object for O(1) lookup
    sortedPostUrls: string[]; // 按日期排序的文章 url 列表，Timeline 專用
    tags: Map<string, TagIndex>; // Tag 索引: tagName -> TagIndex
    // [#] 未來可以繼續擴充
    // categories: Map<string, CategoryIndex>;
}

// 這個是我們真正要傳給前端的、可序列化的資料結構
export interface SiteDataSerializable {
    counts: {
        published: number;
        unpublished: number;
        total: number;
    };
    posts: [string, Post][]; // Map<string, Post> -> [string, Post][]
    sortedPostUrls: string[];
    tags: [string, TagIndex][]; // Map<string, TagIndex> -> [string, TagIndex][]
}

const isDirectory = (path: string) => fs.lstatSync(path).isDirectory();

function getFrontMatter(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);

    return data;
}

/** 從內文截出摘要。frontmatter 有 description 的話 Parser 會優先用它 */
function getExcerpt(content: string): string {
    let text = content;

    // 先移除 Frontmatter (YAML 設定檔)
    // 避免標題或設定參數跑進摘要裡
    text = text.replace(/^---[\s\S]*?---/, '');

    // 移除程式碼區塊 (Code Blocks)
    // 最重要的！必須先移除，不然裡面的 markdown 符號會干擾後續解析
    text = text.replace(/```[\s\S]*?```/g, '');

    // 移除 VitePress/VuePress 自定義容器 (Custom Containers)
    // 針對 ::: info / ::: tip ... 等語法
    // 策略：移除 ::: 開頭的那一行，但保留中間的文字內容
    text = text.replace(/^:::\s*(?:[a-z]+\s*)?(.*)$/gm, '$1');

    // 移除圖片 (Images)
    // 針對 ![alt](url "title") 或 ![alt](url)
    // 使用非貪婪匹配 (.*?) 避免誤刪段落
    text = text.replace(/!\[.*?\]\(.*?\)/g, '');

    // 移除 HTML 標籤
    // 這會一併處理 <img src="..." /> 這類標籤
    text = text.replace(/<[^>]+>/g, '');

    // 移除連結 (Links)
    // [text](url) -> 只保留 text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 移除標題符號 (Headers)
    // # Title -> Title
    text = text.replace(/^#+\s+/gm, '');

    // 移除粗體與斜體 (Bold & Italic)
    // 處理 **text**, __text__, *text*, _text_
    text = text.replace(/([*_]{1,2})(.*?)\1/g, '$2');

    // 移除 markdown-it-attrs 的屬性標記：**前端工程師**{.vue} → 前端工程師
    text = text.replace(/\{[.#][\w-]+(?:\s+[.#][\w-]+)*\}/g, '');

    // 移除行內程式碼 (Inline Code)
    text = text.replace(/`([^`]+)`/g, '$1');

    // 移除引用符號 (Blockquotes)
    text = text.replace(/^>\s+/gm, '');

    // 處理連續空白與換行
    // 將所有換行、Tab、多餘空白轉為單一空白
    text = text.replace(/\s+/g, ' ').trim();

    // 截斷文字 (Truncate)
    const limit = 108;
    if (text.length <= limit) return text;
    return `${text.slice(0, limit)}...`;
}

/**
 * [-] 處理單一 .md 檔案，將其轉換為 Post 物件
 * @param fullPath - 檔案的完整絕對路徑
 * @param contentRoot - 我們用來計算相對路徑的「內容根目錄」 (例如 '.../pages')
 * @returns Post 物件或 null
 */
function processFile(fullPath: string, contentRoot: string): Post | null {
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);

    // 草稿只有在本機開了 SHOW_DRAFTS 才處理（shared/utils/drafts.ts）
    if (!isListed(frontmatter)) { return null; }
    const draft = frontmatter.isPublished !== true;

    // 計算相對於內容根目錄的路徑
    const relativePath = path.relative(contentRoot, fullPath);

    // 將 Windows 的反斜線 `\` 統一轉換為 URL 的斜線 `/`
    const urlPath = relativePath.replace(/\\/g, '/');

    // 產生 URL
    const url = `/${urlPath.replace(/\.md$/, '.html')}`;

    // frontmatter 的髒活（Date 物件、`- null`、空字串）與驗證都在 PostFrontmatterParser；
    // 已發佈的文章格式不對就讓建置失敗並指出檔名，不讓壞資料進到瀏覽器（2026-09-25 Belief 標籤整頁空白就是這樣來的）
    const result = PostFrontmatterParser.safeParse({ ...frontmatter, url, excerpt: getExcerpt(content) });
    if (!result.success) {
        // 草稿的 frontmatter 常常還沒整理好：本機看草稿時跳過它、印一行提醒，不讓整個 dev server 起不來
        if (draft) {
            console.warn(`[草稿] frontmatter 格式不對，先不列：${relativePath}`);
            return null;
        }
        throw new Error(`文章 frontmatter 格式不對：${relativePath}\n${z.prettifyError(result.error)}`);
    }
    return draft ? { ...result.data, title: listedTitle(result.data.title, frontmatter) } : result.data;
}

export async function buildSiteData(contentRoot: string): Promise<SiteDataSerializable> {
    const siteData: SiteData = {
        counts: { published: 0, unpublished: 0, total: 0 },
        posts: new Map(),
        sortedPostUrls: [],
        tags: new Map()
    };

    const allPosts: Post[] = [];

    // 遞迴讀取檔案的函式
    function readFilesRecursively(currentPath: string) {
        const files = fs.readdirSync(currentPath);
        for (const file of files) {
            const fullPath = path.join(currentPath, file);
            if (isDirectory(fullPath)) {
                readFilesRecursively(fullPath);
            } else if (path.extname(file) === '.md') {
                siteData.counts.total++;
                const frontmatter = getFrontMatter(fullPath);

                if (frontmatter.isPublished) {
                    siteData.counts.published++;
                    // 只有已發布的文章才需要完整處理
                    const post = processFile(fullPath, contentRoot);
                    if (post) {
                        allPosts.push(post);
                    }
                } else {
                    siteData.counts.unpublished++;
                    // 本機看草稿時，草稿也進時間軸、標籤與列表（數字照舊只算已發佈的）
                    const draft = processFile(fullPath, contentRoot);
                    if (draft) {
                        allPosts.push(draft);
                    }
                }
            }
        }
    }

    readFilesRecursively(contentRoot);

    // 填充 siteData
    for (const post of allPosts) {
        // 填充 posts Map
        siteData.posts.set(post.url, post);

        // 填充 tags Map
        for (const tag of post.tags) {
            if (!siteData.tags.has(tag)) {
                siteData.tags.set(tag, { count: 0, postUrls: [] });
            }
            const tagIndex = siteData.tags.get(tag)!;
            tagIndex.count++;
            tagIndex.postUrls.push(post.url);
        }
    }

    // 排序文章並填充 sortedPostUrls
    allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    siteData.sortedPostUrls = allPosts.map(p => p.url);

    // 在回傳前，將 Map 轉換為 Array
    return {
        counts: siteData.counts,
        posts: Array.from(siteData.posts.entries()),
        sortedPostUrls: siteData.sortedPostUrls,
        tags: Array.from(siteData.tags.entries())
    };
}
