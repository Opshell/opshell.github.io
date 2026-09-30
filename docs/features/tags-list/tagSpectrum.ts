import type { TagIndex } from '@shared/hooks/useBuildSiteData';
import type { Post } from '@shared/schemas/post.schema';
import type { SpectrumHue } from '@shared/utils/spectrum';
import { categoryHue, categoryLabel, normalizeCategory } from '@shared/utils/spectrum';

// 標籤頁左欄的「光譜索引」（2026-10「稜鏡」翻新）：每個標籤底下一條光，
// 長度是篇數、顏色照它底下文章的分類比例分段——#鐵人賽 會是一半 TypeScript 的靛、一半 VitePress 的琥珀。
// 純邏輯，畫面在 components/TagsList.vue。

export interface TagSegment {
    category: string;
    label: string;
    hue: SpectrumHue;
    count: number;
}

export interface TagInfo {
    name: string;
    count: number;
    /** 最近一篇的日期（「最近寫的」排序用）；沒有就是空字串 */
    latest: string;
    /** 由多到少；第一段就是這個標籤主要屬於哪一類 */
    segments: TagSegment[];
}

export type TagSort = 'count' | 'recent';

export function tagInfos(tags: ReadonlyMap<string, TagIndex>, posts: ReadonlyMap<string, Post>): TagInfo[] {
    return [...tags].map(([name, index]) => {
        const list = index.postUrls.map(url => posts.get(url)).filter((post): post is Post => !!post);
        const byCategory = new Map<string, number>();
        for (const post of list) {
            const category = normalizeCategory(post.category[0] ?? '') || '未分類';
            byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
        }
        const segments = [...byCategory]
            .map(([category, count]) => ({ category, label: categoryLabel(category), hue: categoryHue(category), count }))
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
        const latest = list.reduce((max, post) => (post.date > max ? post.date : max), '');
        return { name, count: index.count, latest, segments };
    });
}

export function sortTags(list: readonly TagInfo[], by: TagSort): TagInfo[] {
    const byName = (a: TagInfo, b: TagInfo) => a.name.localeCompare(b.name);
    return [...list].sort(by === 'recent'
        ? (a, b) => b.latest.localeCompare(a.latest) || b.count - a.count || byName(a, b)
        : (a, b) => b.count - a.count || byName(a, b));
}

/**
 * 篇數夠多的一個一列、底下畫光；零星的（1～2 篇）收成一團小籤，整欄才放得下、不用在小框裡捲。
 * 有打字篩選時全部一列一列列出來（結果不多，而且要看得到篇數）。
 */
export function splitTags(list: readonly TagInfo[], filtering: boolean, minMajor = 3) {
    if (filtering) return { major: [...list], minor: [] as TagInfo[] };
    return { major: list.filter(tag => tag.count >= minMajor), minor: list.filter(tag => tag.count < minMajor) };
}
