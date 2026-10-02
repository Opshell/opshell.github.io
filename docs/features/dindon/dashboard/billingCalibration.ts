import type { GeminiBilling, UsageReport } from './schemas/admin.schema';

// 用實際帳單校正估算（2026-10-02，使用者：「所有的分析和檢視都用實際帳單的金額」）。
//
// 帳單只細到「哪一天、哪個計價項目」，分不出是哪個功能、哪台裝置花的；後端的估算分得出來，但金額不準。
// 所以兩個疊起來用：
// - 一天、一段期間的總數：直接用帳單。
// - 每個功能、每台裝置、每次請求：估算（美元）× 換算係數 k。k = 兩邊都有資料的日子裡，帳單實付（台幣）÷ 估算（美元）。
//   k 同時包含匯率，與估算漏掉的部分（被取消的加問、測試裝置……），所以換算後的總和會等於帳單。
// 匯率另外從帳單反推（實際成本 ÷ 用價目表算的美元），用來把估算換成台幣、看估算到底差了多少。

export interface ReconcileDay {
    date: string;
    estimateUsd: number;
    /** 估算換成台幣（照反推的匯率） */
    estimateTwd: number | null;
    actualTwd: number;
    /** 實際 − 估算（台幣）；正的是估算漏掉的 */
    gapTwd: number | null;
}

type Prices = UsageReport['pricesUsed'];

/** 計價項目 → 後端的模型名稱與輸入輸出：「… output token count gemini 3.1 flash lite preview text」→ gemini-3.1-flash-lite、output */
export function skuModel(sku: string): { model: string; direction: 'input' | 'output' } | null {
    const match = /generate content (input|output) token count gemini (.+?) (?:text|image|audio|video)$/i.exec(sku.trim());
    if (!match) return null;
    const model = `gemini-${match[2].toLowerCase().replace(/ preview$/, '').replace(/\s+/g, '-')}`;
    return { model, direction: match[1].toLowerCase() as 'input' | 'output' };
}

/** 從帳單反推匯率（台幣／美元）：認得的計價項目，實際成本 ÷ 用價目表算的美元。認不得就 null */
export function impliedRate(skus: GeminiBilling['skus'], prices: Prices): number | null {
    let twd = 0;
    let usd = 0;
    for (const item of skus) {
        const parsed = skuModel(item.sku);
        const price = parsed ? prices[parsed.model] : undefined;
        if (!parsed || !price || item.amount <= 0) continue;
        const perMillion = parsed.direction === 'input' ? price.inputPerMillionUsd : price.outputPerMillionUsd;
        twd += item.cost;
        usd += (item.amount * perMillion) / 1e6;
    }
    return usd > 0 ? twd / usd : null;
}

/**
 * 每個計價項目各自反推的匯率。全部差不多（例如都在 31.7）就代表價目表的單價跟 Google 一樣，
 * 估算的落差不是價錢錯，是 token 數對不上；有一項特別高就是那個模型或方向的單價寫錯了。
 */
export function skuRates(skus: GeminiBilling['skus'], prices: Prices): { sku: string; rate: number }[] {
    return skus.flatMap((item) => {
        const one = impliedRate([item], prices);
        return one === null ? [] : [{ sku: item.sku, rate: one }];
    });
}

/** 逐日對帳：只看帳單已經匯出的日子（≤ dataThrough），新的在前 */
export function reconcileDays(billing: GeminiBilling, usageDaily: UsageReport['daily'], rate: number | null): ReconcileDay[] {
    const through = billing.dataThrough ?? '';
    const dates = new Set<string>();
    const actual = new Map(billing.daily.map(day => [day.date, day.paid]));
    const estimate = new Map(usageDaily.map(day => [day.date, day.costUsd]));
    for (const date of [...actual.keys(), ...estimate.keys()]) {
        if (date >= billing.since && (!through || date <= through)) dates.add(date);
    }
    return [...dates].sort((a, b) => b.localeCompare(a)).map((date) => {
        const estimateUsd = estimate.get(date) ?? 0;
        const actualTwd = actual.get(date) ?? 0;
        const estimateTwd = rate ? estimateUsd * rate : null;
        return { date, estimateUsd, estimateTwd, actualTwd, gapTwd: estimateTwd === null ? null : actualTwd - estimateTwd };
    });
}

/** 換算係數：每 1 美元的估算，實際是多少台幣。兩邊都要有數字才算得出來 */
export function calibrationFactor(days: readonly ReconcileDay[]): number | null {
    const estimate = days.reduce((sum, day) => sum + day.estimateUsd, 0);
    const actual = days.reduce((sum, day) => sum + day.actualTwd, 0);
    return estimate > 0 && actual > 0 ? actual / estimate : null;
}

/** 實際是估算的幾倍（同一個幣別比）：k ÷ 匯率 */
export const gapMultiple = (factor: number | null, rate: number | null) => (factor && rate ? factor / rate : null);
