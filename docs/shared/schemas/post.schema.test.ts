import { describe, expect, it } from 'vitest';
import { PostFrontmatterParser } from './post.schema';

const base = { url: '/article/a.html', excerpt: '摘要', title: '標題', createdAt: '2026-09-28' };

describe('文章 frontmatter（PostFrontmatterParser）', () => {
    it('createdAt 沒加引號，YAML 讀成 Date 物件，轉回 YYYY-MM-DD', () => {
        // 2026-09-25 Belief 整頁空白就是這個：Date 物件一路傳到瀏覽器
        const post = PostFrontmatterParser.parse({ ...base, createdAt: new Date('2024-08-14') });
        expect(post.date).toBe('2024-08-14');
    });

    it('日期格式不對要擋', () => {
        expect(() => PostFrontmatterParser.parse({ ...base, createdAt: '2024.08.14' })).toThrow('YYYY-MM-DD');
    });

    it('清單去掉 null、空白與重複；單一字串也收', () => {
        const post = PostFrontmatterParser.parse({ ...base, categories: 'demo', tags: ['Vue', null, ' Vue ', '', 3] });
        expect(post.category).toEqual(['demo']);
        expect(post.tags).toEqual(['Vue']);
    });

    it('沒有分類就歸到「雜談」', () => {
        expect(PostFrontmatterParser.parse({ ...base, categories: [null] }).category).toEqual(['雜談']);
        expect(PostFrontmatterParser.parse(base).category).toEqual(['雜談']);
    });

    it('image：null 換預設圖，空字串代表這篇沒有圖、原樣保留', () => {
        expect(PostFrontmatterParser.parse({ ...base, image: null }).image).toBe('/images/no_image.svg');
        expect(PostFrontmatterParser.parse({ ...base, image: '' }).image).toBe('');
    });

    it('摘要優先用 description，空白的話退回內文摘要', () => {
        expect(PostFrontmatterParser.parse({ ...base, description: '說明' }).excerpt).toBe('說明');
        expect(PostFrontmatterParser.parse({ ...base, description: '  ' }).excerpt).toBe('摘要');
    });

    it('沒有標題要擋', () => {
        expect(() => PostFrontmatterParser.parse({ ...base, title: undefined })).toThrow('缺少 title');
    });
});
