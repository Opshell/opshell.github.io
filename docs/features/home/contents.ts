import type { Post } from '@shared/schemas/post.schema';
import { CATEGORY_LABELS } from './constants';

// 首頁目錄的純邏輯：把文章排成「最近寫的」與「一個分類一章」。畫面在 components/HomeContents.vue。

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

/** frontmatter 的分類有時帶引號或多餘空白（'Belief'、'developer '），合在一起 */
export const normalizeCategory = (category: string) => category.trim().replace(/^['"]|['"]$/g, '').trim();

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
            return { key, label: CATEGORY_LABELS[key] ?? key, count: list.length, first: sorted.at(-1)!, latest: sorted[0] };
        })
        .sort((a, b) => Number(a.key === '未分類') - Number(b.key === '未分類') || b.count - a.count || a.label.localeCompare(b.label));
}
