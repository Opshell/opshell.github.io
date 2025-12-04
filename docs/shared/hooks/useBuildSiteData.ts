import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

interface iTags {
    [key: string]: {
        count: number
        group: {
            title: string
            image: string
            category: string
            date: string
            url: string
        }[]
    }
}
export interface iClassification {
    count: {
        total: number
        published: number
        unpublished: number
    }
    tags: iTags
    category: string
}

// [-] 單篇文章的結構 SSoT
export interface Post {
    url: string
    title: string
    date: string
    image: string
    category: string
    tags: string[]
    // ... 之後可擴充其他需要的 frontmatter 欄位
}

// [-] Tag 索引的結構
export interface TagIndex {
    count: number
    postUrls: string[] // 只儲存文章的 url 作為 "指針"
}

export interface iSiteData {
    counts: {
        published: number
        unpublished: number
        total: number
    }
    posts: Map<string, Post> //  關鍵資料來源: url -> Post object for O(1) lookup
    sortedPostUrls: string[] // 按日期排序的文章 url 列表，Timeline 專用
    tags: Map<string, TagIndex> // Tag 索引: tagName -> TagIndex
    // [#] 未來可以繼續擴充
    // categories: Map<string, CategoryIndex>;
}

// 這個是我們真正要傳給前端的、可序列化的資料結構
export interface iSiteDataSerializable {
    counts: {
        published: number
        unpublished: number
        total: number
    }
    posts: [string, Post][] // Map<string, Post> -> [string, Post][]
    sortedPostUrls: string[]
    tags: [string, TagIndex][] // Map<string, TagIndex> -> [string, TagIndex][]
}

const isDirectory = (path: string) => fs.lstatSync(path).isDirectory();

function getFrontMatter(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);

    return data;
}

/**
 * [-] 處理單一 .md 檔案，將其轉換為 Post 物件
 * @param fullPath - 檔案的完整絕對路徑
 * @param contentRoot - 我們用來計算相對路徑的「內容根目錄」 (例如 '.../pages')
 * @returns Post 物件或 null
 */
function processFile(fullPath: string, contentRoot: string): Post | null {
    const frontmatter = getFrontMatter(fullPath);
    if (!frontmatter.isPublished) { return null; }

    // 計算相對於內容根目錄的路徑
    const relativePath = path.relative(contentRoot, fullPath);

    // 將 Windows 的反斜線 `\` 統一轉換為 URL 的斜線 `/`
    const urlPath = relativePath.replace(/\\/g, '/');

    // 產生 URL
    const url = `/${urlPath.replace(/\.md$/, '.html')}`;

    return {
        url,
        title: frontmatter.title as string,
        image: frontmatter.image as string ?? '/images/no_image.svg',
        category: frontmatter.categories as string ?? '',
        date: frontmatter.createdAt as string ?? '',
        tags: frontmatter.tags as string[] ?? []
    };
}

export async function buildSiteData(contentRoot: string): Promise<iSiteDataSerializable> {
    const siteData: iSiteData = {
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
