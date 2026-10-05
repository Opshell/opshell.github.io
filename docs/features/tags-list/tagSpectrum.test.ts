import type { TagIndex } from '@shared/hooks/useBuildSiteData';
import type { Post } from '@shared/schemas/post.schema';
import { describe, expect, it } from 'vitest';
import { sortTags, splitTags, tagInfos } from './tagSpectrum';

const post = (url: string, date: string, category: string): Post =>
    ({ url, title: url, date, image: '', category: [category], tags: [], excerpt: '' });

const posts = new Map([
    ['/ts1', post('/ts1', '2024-09-01', 'typescript-thirty-days')],
    ['/ts2', post('/ts2', '2024-09-02', 'typescript-thirty-days')],
    ['/vp1', post('/vp1', '2024-10-01', '\'vitepress-thirty-days\'')],
    ['/git', post('/git', '2025-08-28', 'Git')]
]);
const tags = new Map<string, TagIndex>([
    ['鐵人賽', { count: 3, postUrls: ['/ts1', '/ts2', '/vp1'] }],
    ['Git', { count: 1, postUrls: ['/git'] }],
    ['壞掉的', { count: 1, postUrls: ['/nowhere'] }]
]);

describe('tagInfos', () => {
    const list = tagInfos(tags, posts);

    it('照分類分段、多的在前，分類名稱用中文', () => {
        const iron = list.find(tag => tag.name === '鐵人賽')!;
        expect(iron.segments.map(s => [s.label, s.count, s.hue])).toEqual([
            ['TypeScript 三十天', 2, 'indigo'],
            ['VitePress 三十天', 1, 'amber']
        ]);
        expect(iron.latest).toBe('2024-10-01');
    });

    it('找不到文章的標籤沒有分段，不會壞', () => {
        expect(list.find(tag => tag.name === '壞掉的')).toMatchObject({ segments: [], latest: '' });
    });
});

describe('sortTags／splitTags', () => {
    const list = tagInfos(tags, posts);

    it('篇數多的在前；「最近」照最近一篇', () => {
        expect(sortTags(list, 'count').map(tag => tag.name)[0]).toBe('鐵人賽');
        expect(sortTags(list, 'recent').map(tag => tag.name)).toEqual(['Git', '鐵人賽', '壞掉的']);
    });

    it('零星的收起來；篩選時全部一列一列', () => {
        expect(splitTags(list, false).major.map(tag => tag.name)).toEqual(['鐵人賽']);
        expect(splitTags(list, false).minor).toHaveLength(2);
        expect(splitTags(list, true).major).toHaveLength(3);
    });
});
