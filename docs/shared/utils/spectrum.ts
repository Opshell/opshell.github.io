// 分類 → 光譜上的一個顏色（2026-10「稜鏡」翻新）。首頁的光線、時間軸的點、文章頂端的色條都用這一份，
// 同一個分類在全站是同一個顏色。顏色本身是 _variable.scss 的 --pr-*。

export const SPECTRUM = ['amber', 'orange', 'coral', 'magenta', 'violet', 'indigo'] as const;
export type SpectrumHue = typeof SPECTRUM[number];

/** 文章多的分類先指定好，免得雜湊撞在同一個顏色；新分類用雜湊分 */
const FIXED: Readonly<Record<string, SpectrumHue>> = {
    'vitepress-thirty-days': 'amber',
    '使用實例': 'orange',
    'Git': 'coral',
    'developer': 'magenta',
    'Belief': 'violet',
    'typescript-thirty-days': 'indigo'
};

/** frontmatter 的分類有時帶引號或多餘空白（'Belief'、'developer '），合在一起 */
export const normalizeCategory = (category: string) => category.trim().replace(/^['"]|['"]$/g, '').trim();

export function categoryHue(category: string | undefined): SpectrumHue {
    const key = normalizeCategory(category ?? '');
    if (FIXED[key]) return FIXED[key];
    let hash = 0;
    for (const char of key) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
    return SPECTRUM[hash % SPECTRUM.length];
}

export const hueVar = (hue: SpectrumHue) => `var(--pr-${hue})`;
