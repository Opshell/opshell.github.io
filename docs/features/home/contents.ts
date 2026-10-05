import type { Post } from '@shared/schemas/post.schema';
import { categoryLabel, normalizeCategory } from '@shared/utils/spectrum';

// 首頁的純邏輯：「最近寫的」與「一個分類一組」。畫面在 components/。

export interface Chapter {
    key: string;
    label: string;
    count: number;
    /** 從第一篇讀（系列文照日期排的第一篇） */
    first: Post;
    /** 最新的一篇 */
    latest: Post;
}

const byDateDesc = (a: Post, b: Post) => b.date.localeCompare(a.date) || a.url.localeCompare(b.url);

export function latestPosts(posts: Post[], count: number): Post[] {
    return [...posts].sort(byDateDesc).slice(0, count);
}

/** 一個分類一章，文章多的在前；「未分類」放最後 */
export function chapters(posts: Post[]): Chapter[] {
    const groups = new Map<string, Post[]>();
    for (const post of posts) {
        const key = normalizeCategory(post.category[0] ?? '未分類') || '未分類';
        groups.set(key, [...(groups.get(key) ?? []), post]);
    }
    return [...groups]
        .map(([key, list]) => {
            const sorted = [...list].sort(byDateDesc);
            return { key, label: categoryLabel(key), count: list.length, first: sorted.at(-1)!, latest: sorted[0] };
        })
        .sort((a, b) => Number(a.key === '未分類') - Number(b.key === '未分類') || b.count - a.count || a.label.localeCompare(b.label));
}

/** 連載：篇數夠多的分類（兩個鐵人賽三十天），照日期由舊到新 */
export interface Series {
    key: string;
    label: string;
    posts: Post[];
}

export function seriesOf(posts: Post[], minCount = 20): Series[] {
    return chapters(posts)
        .filter(chapter => chapter.count >= minCount && chapter.key !== '未分類')
        .map(chapter => ({
            key: chapter.key,
            label: chapter.label,
            posts: posts
                .filter(post => normalizeCategory(post.category[0] ?? '') === chapter.key)
                .sort((a, b) => a.date.localeCompare(b.date) || a.url.localeCompare(b.url))
        }));
}

/** 首頁稜鏡選了哪一道光：null＝白光（全部） */
export function postsInCategories(posts: Post[], members: readonly string[] | null, count: number): Post[] {
    const picked = members ? posts.filter(post => members.includes(normalizeCategory(post.category[0] ?? '未分類') || '未分類')) : posts;
    return latestPosts(picked, count);
}

/** 每年寫幾篇（舊到新，從第一篇那年到最新一篇那年，中間沒寫的年也列 0），給 Timeline 卡片的長條 */
export function yearlyCounts(posts: Post[]): { year: string; count: number }[] {
    const years = posts.map(post => Number(post.date.slice(0, 4))).filter(Boolean);
    if (!years.length) return [];
    const counts = new Map<number, number>();
    for (const year of years) counts.set(year, (counts.get(year) ?? 0) + 1);
    const from = Math.min(...years);
    const to = Math.max(...years);
    return Array.from({ length: to - from + 1 }, (_, index) => ({ year: String(from + index), count: counts.get(from + index) ?? 0 }));
}
