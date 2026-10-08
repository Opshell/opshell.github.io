// 宣傳頁開頭「一天的帳」的劇本（components/PromoStory.vue 照這份演）。
// 一幕一個重點，全部演在同一條帳本上：第幾幕的帳本長怎樣、今天花了多少，都由幕數算出來（可以直接跳到任何一幕）。
// 內容要跟 App 真的會做的一樣（2026-10-08 對 0.7.19）：通知自動記帳、語音一句記多筆、智能導正（0.7.18）、
// 信用卡退刷自動抵銷（0.7.9，小精靈先問）、每月可支配算出每日預算（0.7.10）。
// 通知的來源寫「行動支付」「信用卡」這種通稱：不要寫真的銀行名稱，看起來像合作。

export interface StoryRow {
    id: string;
    icon: string;
    name: string;
    /** 怎麼記的 · 分類 */
    how: string;
    amount: number;
    /** 今天的帳才算進「今天花了」 */
    today: boolean;
    /** 這一幕剛記好的（底色亮一下） */
    isNew?: boolean;
    /** 被退刷抵銷了 */
    void?: boolean;
}

export interface StoryScene {
    id: 'notify' | 'voice' | 'teach' | 'refund' | 'budget' | 'end';
    /** 字幕大字（一句話講完這一幕） */
    caption: string;
    /** 字幕小字 */
    sub: string;
    /** 停多久；最後一幕是 0（停在那裡） */
    ms: number;
    /** 從上緣滑下來的系統通知 */
    notice?: { app: string; text: string };
    /** 小精靈說的話 */
    sprite?: string;
    /** 語音記帳時講的那句 */
    voice?: string;
    /** 這一幕記進帳本的 */
    adds?: Omit<StoryRow, 'isNew' | 'void'>[];
    /** 這一幕抵銷的那筆 */
    voids?: string;
}

/** 一開始帳本上就有的：今天早上的公車、昨天買的衣服（等一下會退刷） */
const BASE: Omit<StoryRow, 'isNew' | 'void'>[] = [
    { id: 'uniqlo', icon: '👕', name: '服飾店', how: '昨天 · 信用卡', amount: 1280, today: false },
    { id: 'bus', icon: '🚌', name: '公車', how: '自動記帳 · 交通', amount: 15, today: true }
];

export const STORY_SCENES: StoryScene[] = [
    {
        id: 'notify',
        caption: '付款的那一刻，帳就記好了',
        sub: '付款通知一跳，帳本就多一筆。你動的手指：0 根。',
        ms: 2600,
        notice: { app: '行動支付', text: '付款成功 NT$85 · 便利商店' },
        adds: [{ id: 'cvs', icon: '🥤', name: '便利商店', how: '自動記帳 · 飲食', amount: 85, today: true }]
    },
    {
        id: 'voice',
        caption: '付現？說一句就好',
        sub: '一句話記好幾筆，分類也幫你分好。',
        ms: 2600,
        voice: '「早餐蛋餅 45，豆漿 25」',
        adds: [
            { id: 'egg', icon: '🍳', name: '蛋餅', how: '語音 · 早餐', amount: 45, today: true },
            { id: 'soy', icon: '🥛', name: '豆漿', how: '語音 · 早餐', amount: 25, today: true }
        ]
    },
    {
        id: 'teach',
        caption: '通知只寫「消費 400」？',
        sub: '智能導正：照你教過的記，教一次就會。',
        ms: 2900,
        notice: { app: '信用卡', text: '消費 NT$400' },
        sprite: '上次這種是叫車，記成交通囉',
        adds: [{ id: 'taxi', icon: '🚕', name: '叫車', how: '智能導正 · 交通', amount: 400, today: true }]
    },
    {
        id: 'refund',
        caption: '刷退了？自動抵銷',
        sub: '小精靈先問一聲，按了就幫你把那筆沖掉。',
        ms: 2700,
        notice: { app: '信用卡', text: '退款 NT$1,280 · 服飾店' },
        sprite: '昨天的服飾店退了，幫你抵銷好了 ✓',
        voids: 'uniqlo'
    },
    {
        id: 'budget',
        caption: '每天能花多少，直接告訴你',
        sub: '每月可支配算好，一鍵變成每日預算。',
        ms: 2900
    },
    {
        id: 'end',
        // 結尾卡上已經寫了「你負責花錢，我負責記帳」：字幕改成邀請
        caption: '準備好當個懶人了嗎？',
        sub: '加入封閉測試，封測期間所有功能免費用。',
        ms: 0
    }
];

/** 第 index 幕時的帳本：新的在上面 */
export function storyFeed(index: number): StoryRow[] {
    const rows: StoryRow[] = BASE.map(row => ({ ...row }));
    STORY_SCENES.slice(0, index + 1).forEach((scene, at) => {
        for (const add of scene.adds ?? []) rows.unshift({ ...add, isNew: at === index });
        // 被抵銷的那筆浮到最上面：它原本在帳本最下面，會被小精靈的對話框擋住，看不到被劃掉
        if (scene.voids) {
            const at = rows.findIndex(row => row.id === scene.voids);
            if (at >= 0) rows.unshift({ ...rows.splice(at, 1)[0], void: true });
        }
    });
    return rows;
}

/** 第 index 幕時「今天花了」多少（被抵銷的不算） */
export function storyTotal(index: number): number {
    return storyFeed(index)
        .filter(row => row.today && !row.void)
        .reduce((sum, row) => sum + row.amount, 0);
}

/** 整段多長（不含停住的最後一幕）：使用者要 10～15 秒 */
export const STORY_MS = STORY_SCENES.reduce((sum, scene) => sum + scene.ms, 0);
