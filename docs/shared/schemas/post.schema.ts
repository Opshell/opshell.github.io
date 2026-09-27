import { z } from 'zod';

// 文章 frontmatter 的資料層（前端開發規範五章）：Raw 寬鬆接住 YAML 讀出來的各種樣子，Parser 做完髒活後交給核心 PostSchema

// #region [P] 核心 SSoT

/** 一篇已發佈的文章
 * 時間軸、標籤列、側欄統計都讀它。建置時產生，序列化後送到瀏覽器。
 */
export const PostSchema = z.object({
    url: z.string().startsWith('/'),
    title: z.string().min(1, '缺少 title'),
    date: z.iso.date('createdAt 要是 YYYY-MM-DD'),
    image: z.string(),
    category: z.array(z.string()).min(1),
    tags: z.array(z.string()),
    excerpt: z.string()
});

export type Post = z.infer<typeof PostSchema>;

// #endregion

// #region [P] frontmatter → Post

/**
 * YAML 讀出來的 frontmatter。早期文章有各種樣子：
 * createdAt 沒加引號會變成 Date 物件、tags 裡有 `- null`、image 是空字串或 null。
 */
const PostFrontmatterRawSchema = z.object({
    title: z.string().trim().optional(),
    image: z.string().nullish(),
    description: z.string().nullish(),
    createdAt: z.union([z.string(), z.date()]),
    // YAML 寫單一字串（categories: demo）也收：轉成一個元素的清單
    categories: z.union([z.array(z.unknown()), z.string()]).nullish(),
    tags: z.union([z.array(z.unknown()), z.string()]).nullish()
});

/** 清單欄位：去掉 null、空白與非字串，去重 */
function cleanList(value: unknown[] | string | null | undefined): string[] {
    const items = typeof value === 'string' ? [value] : value ?? [];
    const strings = items.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
    return [...new Set(strings.map(item => item.trim()))];
}

/** Date 物件轉回 YYYY-MM-DD；字串原樣交給核心 Schema 驗證 */
const toDateString = (value: string | Date) => value instanceof Date ? value.toISOString().slice(0, 10) : value.trim();

/**
 * 解析一篇已發佈文章的 frontmatter。url 與摘要由呼叫端算好一起傳進來（它們不在 frontmatter 裡）。
 * 格式不對會丟錯，呼叫端要帶上檔名：建置時就擋下來，不讓壞資料進到瀏覽器。
 */
export const PostFrontmatterParser = PostFrontmatterRawSchema
    .extend({ url: z.string(), excerpt: z.string() })
    .transform(data => ({
        url: data.url,
        title: data.title ?? '',
        date: toDateString(data.createdAt),
        image: data.image ?? '/images/no_image.svg', // 只有 null 才換預設圖；空字串代表「這篇沒有圖」，卡片會照那個樣子排
        category: cleanList(data.categories).length ? cleanList(data.categories) : ['雜談'],
        tags: cleanList(data.tags),
        excerpt: data.description?.trim() || data.excerpt
    }))
    .pipe(PostSchema);

// #endregion
