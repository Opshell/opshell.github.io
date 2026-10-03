import type { DayModel, GeminiBilling, UsageReport } from './schemas/admin.schema';

// 用實際帳單看成本（2026-10-02 起；10-03 照後端的量測改寫，溝通板 #0085）。
//
// 後端逐日、逐模型對過帳單：**估算本身是準的**（單價對、token 對，10/01 一個 token 都不差），差額都是「後端看不到的用量」：
// 9/28 清資料庫刪掉的紀錄、本機開發與 AI Studio 網頁、被取消的加問（另外估）。
// 所以後台這樣算：
// - 每個功能、每台裝置、每次請求：資料庫的估算（美元）× 帳單上的匯率。**不再乘「實付 ÷ 估算」的係數**——
//   那會把本機開發與清庫前的錢灌到使用者頭上，使用者的成本被放大一倍多。
// - 一天、一段期間的總數：直接用帳單，拆成「使用者、測試／開發、被取消的加問、其他」四塊。

/** 9/28 beta 前清過正式資料庫：這天以前的 AI 紀錄被刪了，帳單有錢、後端是 0（溝通板 #0085 第 1 點） */
export const DATA_RESET_DAY = '2026-09-28';

export interface ReconcileDay {
    date: string;
    /** 帳單實付（台幣） */
    paidTwd: number;
    /** 一般使用者的估算 × 匯率 */
    usersTwd: number;
    /** 測試／開發用裝置的估算 × 匯率（開發成本） */
    testTwd: number;
    /** 被取消的加問估計 × 匯率（兩群都算） */
    canceledTwd: number;
    /** 帳單 − 上面三塊：本機開發、AI Studio 網頁；清庫前的日子整天都在這 */
    otherTwd: number;
    /** 在 9/28 清庫以前：後端沒有紀錄 */
    beforeReset: boolean;
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
 * 每個計價項目各自反推的匯率。全部差不多（例如都在 31.7）就代表價目表的單價跟 Google 一樣；
 * 有一項特別高就是那個模型或方向的單價寫錯了。
 */
export function skuRates(skus: GeminiBilling['skus'], prices: Prices): { sku: string; rate: number }[] {
    return skus.flatMap((item) => {
        const one = impliedRate([item], prices);
        return one === null ? [] : [{ sku: item.sku, rate: one }];
    });
}

/** 換算用的匯率：帳單上 Google 自己用的（usd_rate）；舊的後端沒給時用反推的 */
export function billingRate(billing: GeminiBilling, prices: Prices): number | null {
    return billing.usdRate > 0 ? billing.usdRate : impliedRate(billing.skus, prices);
}

/** 逐日拆帳：只看帳單已經匯出的日子（≤ dataThrough），新的在前 */
export function reconcileDays(billing: GeminiBilling, dailyModels: readonly DayModel[], rate: number): ReconcileDay[] {
    const through = billing.dataThrough ?? '';
    const byDate = new Map<string, { users: number; test: number; canceled: number }>();
    for (const row of dailyModels) {
        const day = byDate.get(row.date) ?? { users: 0, test: 0, canceled: 0 };
        day[row.group] += row.costUsd;
        day.canceled += row.canceledCostEstUsd;
        byDate.set(row.date, day);
    }
    const paid = new Map(billing.daily.map(day => [day.date, day.paid]));
    const dates = new Set([...paid.keys(), ...byDate.keys()].filter(date => date >= billing.since && (!through || date <= through)));
    return [...dates].sort((a, b) => b.localeCompare(a)).map((date) => {
        const usd = byDate.get(date) ?? { users: 0, test: 0, canceled: 0 };
        const paidTwd = paid.get(date) ?? 0;
        const usersTwd = usd.users * rate;
        const testTwd = usd.test * rate;
        const canceledTwd = usd.canceled * rate;
        return { date, paidTwd, usersTwd, testTwd, canceledTwd, otherTwd: paidTwd - usersTwd - testTwd - canceledTwd, beforeReset: date < DATA_RESET_DAY };
    });
}

/** 一段期間加總；other 再分成清庫前（整天都是）與之後（本機開發、AI Studio） */
export function breakdown(days: readonly ReconcileDay[]) {
    const sum = (pick: (day: ReconcileDay) => number, list = days) => list.reduce((total, day) => total + pick(day), 0);
    const before = days.filter(day => day.beforeReset);
    const after = days.filter(day => !day.beforeReset);
    return {
        paidTwd: sum(day => day.paidTwd),
        usersTwd: sum(day => day.usersTwd),
        testTwd: sum(day => day.testTwd),
        canceledTwd: sum(day => day.canceledTwd),
        /** 9/28 以前：資料庫清掉了，整天的帳單都算這裡 */
        resetTwd: sum(day => day.paidTwd, before),
        /** 9/28 以後還對不上的：本機開發、AI Studio 網頁 */
        otherTwd: sum(day => day.otherTwd, after)
    };
}
