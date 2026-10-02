import type { PlayVitals } from './schemas/admin.schema';

// Google 實際帳單與 Play 資料的顯示邏輯（溝通板 #0084）。畫面在 UsageReport、OverviewPanel、AppPanel。

/** 新台幣：小數兩位，小於 0.1 的四位（Gemini 一天只花幾毛錢，每次請求只有幾毫） */
export function formatMoney(value: number, currency = 'TWD'): string {
    const prefix = currency === 'TWD' ? 'NT$' : `${currency} `;
    // 抵免是負數：寫成 -NT$0.15，不要 NT$-0.15。每次請求只有幾毫，兩位小數會全是 0.00，小於 0.1 的寫到四位
    const abs = Math.abs(value);
    return `${value < 0 ? '-' : ''}${prefix}${abs.toFixed(abs > 0 && abs < 0.1 ? 4 : 2)}`;
}

/**
 * 帳單的計價項目原文很長：「Generate content input token count gemini 3.1 flash lite preview text」。
 * 拆成「3.1 flash lite preview・輸入・文字」；認不出來的照原文。
 */
export function skuLabel(sku: string): string {
    const match = /generate content (input|output) token count gemini (.+?) (text|image|audio|video)$/i.exec(sku.trim());
    if (!match) return sku;
    const [, direction, model, modality] = match;
    const MODALITY: Record<string, string> = { text: '文字', image: '圖片', audio: '聲音', video: '影片' };
    return `${model}・${direction.toLowerCase() === 'input' ? '輸入' : '輸出'}・${MODALITY[modality.toLowerCase()]}`;
}

/** Play 的不良行為門檻（使用者感受到的比率），超過會影響商店曝光 */
export const PLAY_BAD_CRASH = 0.0109;
export const PLAY_BAD_ANR = 0.0047;

/** 最近一天有這個指標的值；使用者太少時 Play 不給數字，整段都可能是 null */
export function latestMetric(set: PlayVitals['crash'], key: string): { date: string; value: number } | null {
    const days = [...set.days].sort((a, b) => b.date.localeCompare(a.date));
    for (const day of days) {
        const value = day.metrics[key];
        if (typeof value === 'number') return { date: day.date, value };
    }
    return null;
}

export const formatRate = (value: number) => `${(value * 100).toFixed(2)}%`;

/** 報表空間的資料夾 → 中文。資料夾名稱以實際看到的為準（Play 會加新的） */
export function reportKind(name: string): string {
    const KINDS: [RegExp, string][] = [
        [/^stats\/store_performance\//, '商店頁成效'],
        [/^stats\/installs\//, '安裝數'],
        [/^stats\/ratings\//, '評分'],
        [/^stats\/crashes\//, '當機'],
        [/^reviews\//, '評論'],
        [/^earnings\//, '營收'],
        [/^sales\//, '銷售']
    ];
    return KINDS.find(([pattern]) => pattern.test(name))?.[1] ?? '其他';
}

export function formatBytes(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
