// [-] App 專用的聯絡信箱，和 App 的隱私權政策、問題回報頁是同一個（DinDon_Android 的 strings.xml report_email）
export const CONTACT_EMAIL = 'dindon.ledger@gmail.com';

/** Play 商店頁。宣傳頁、演示頁、功能地圖的「下載」都連這裡 */
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=me.opshell.dindon';

/**
 * 正式版上架了沒（#756，2026-11-21）。商店頁還沒公開時連過去是 404，所以沒上架前不放下載連結，
 * 只寫「即將在 Google Play 上架」。上架那天改成 true，宣傳頁、演示頁、功能地圖的按鈕就換成下載。
 */
export const LAUNCHED = false;

export const PRIVACY_PATH = '/dindon/privacy/';

/** 功能演示（溝通板 #0055） */
export const DEMO_PATH = '/dindon/demo/';

/** 功能地圖與養成路線（2026-10-02） */
export const GUIDE_PATH = '/dindon/guide/';

/** 刪除資料與帳號。Google Play 要求「帳號刪除」有一個不用裝 App 也打得開的網址 */
export const ACCOUNT_PATH = '/dindon/account/';

export interface LandingPoint {
    icon: string;
    title: string;
    text: string;
    /** 小標籤，例如「新功能」 */
    tag?: string;
}

/**
 * 隨身記帳助手的三件事（#756，使用者 2026-11-21：「APP 最大的賣點是隨身記帳助手，自動幫忙記帳、總結、歸納，
 * 還有里程碑可以引導養成記帳習慣、理財方式，而不是只是記流水帳」）。開頭底下那一排，也是整頁的順序。
 */
export const pillars: LandingPoint[] = [
    { icon: '🔔', title: '幫你記', text: '付款通知一跳就記好、分好類；電子發票每天自動同步；拍一張、說一句也行。' },
    { icon: '🧮', title: '幫你理', text: '退刷、分期、代墊都幫你算好；每個月初花兩分鐘月結，知道錢去哪、多花在哪。' },
    { icon: '🧭', title: '陪你走', text: '記帳里程碑從「記滿一個月」開始，一階一階帶你看懂錢流、存得下來。' }
];

/**
 * 幫你記：帳從哪裡來（2026-11-21 對 App 1.0.0）。電子發票雲端同步 #747 起所有人都有，凌晨 0～5 點同步，
 * 免費版登入後同步 14 天（strings.xml einvoice_*、menu 的說明）。
 */
export const autoPoints: LandingPoint[] = [
    { icon: '🔔', title: '付款通知自動記', text: '銀行、信用卡、行動支付的付款通知一跳出來，就記好、分好類。同一筆跳好幾則通知，只記一次。' },
    { icon: '🧾', title: '電子發票自動同步', text: '登入財政部平台一次，小精靈每天凌晨幫你把雲端發票記進帳本。' },
    { icon: '🎙️', title: '用說的', text: '「早餐蛋餅 45，豆漿 25」一句話記好幾筆；轉帳、借錢、分期也聽得懂。' },
    { icon: '✍️', title: '隨手記與小工具', text: '寫「飲料 60」就好；記帳、快選、每日預算、手機條碼都能放在桌面，點一下就到。' }
];

/**
 * 幫你理：那些本來要自己算、自己記得的事。照例記帳是 0.8.9 從「智能導正」改的名（strings.xml），
 * 大筆支出確認與銀行新聞示警是 0.9.6 的安全示警
 */
export const helperPoints: LandingPoint[] = [
    { icon: '🧠', title: '照例記帳', text: '通知只寫「消費 400」？照你教過一次的範例記對，下次就不用再改。' },
    { icon: '↩️', title: '退刷自動抵銷', text: '刷退的通知一來，小精靈先問一聲，按了就把原本那筆沖掉。' },
    { icon: '🗓️', title: '信用卡分期', text: '記帳時選分 N 期，之後每個月自動記一期，不會一次算爆預算。' },
    { icon: '🎯', title: '每天能花多少', text: '收入扣掉固定支出、分期、存錢，算出每月可支配，一鍵變成每日預算。' },
    { icon: '🤝', title: '借貸與代墊', text: '幫朋友墊的、借出去的都記著，還了按一下就收回；有利息的也算得出來。' },
    { icon: '🛡️', title: '大筆支出問一聲', text: '突然一筆大額支出，小精靈會問：「剛剛這筆是你本人嗎？」' }
];

/** 月結：每個月初問的事（milestone.xml month_close_*）。這是「總結歸納」那一段的主角 */
export const monthCloseSteps: { title: string; text: string }[] = [
    { title: '比平常多花在哪', text: '先看花最多的三類，跟你平常的月份比。' },
    { title: '固定支出有沒有變', text: '房租、電信、訂閱，這個月實際扣了多少，有沒有新的。' },
    { title: '收入留下幾成', text: '這個月收入多少、花了多少、留下幾成，一句話講完。' },
    { title: '三題復盤（選填）', text: '最值得的一筆、最後悔的一筆、下個月想少一點的。點一筆就好，不用打字；下個月月結會拿出來對照。' }
];

export interface MilestoneStage {
    name: string;
    lesson: string;
    /** 這一階的里程碑徽章 */
    milestones: string[];
}

/** 記帳里程碑的四階與六個里程碑，字照 App 的 milestone.xml（milestone_stage_*、milestone_lesson_*、milestone_name_*） */
export const milestoneStages: MilestoneStage[] = [
    { name: '無腦記', lesson: '記帳不用花力氣。先記滿一個月，什麼都不用懂。', milestones: ['帳本滿月'] },
    { name: '看懂錢流', lesson: '錢分成三種：不花也得付的、一定會花但每月不同的、可以選的。', milestones: ['第一次關帳', '定錨', '先付給自己'] },
    { name: '存得下來', lesson: '先付給自己，剩下的才拿來花。', milestones: ['安全網'] },
    { name: '錢生錢', lesson: '多出來的錢，讓它自己長大。', milestones: ['第一筆獲利'] }
];

/** 拍照記帳能拍的東西：不只電子發票 */
export const photoSources: string[] = [
    '電子發票',
    '傳統發票',
    '購物清單',
    '消費明細',
    '手寫收據',
    '蝦皮、線上購物截圖',
    '便利商店的結帳螢幕'
];

/** 最懶人的記帳體驗。每一點都要和隱私權政策對得上 */
export const lazyPoints: LandingPoint[] = [
    { icon: '🚪', title: '不用註冊', text: '不用帳號、不用登入，裝好打開就能記。' },
    { icon: '🚫', title: '沒有廣告', text: '沒有廣告，不賣資料，也不拿你的資料去做廣告。' },
    { icon: '📱', title: '帳只存在你的手機', text: '帳目只存在這支手機，換手機時隨 Android 備份從你自己的 Google 帳號還原，我們看不到。隨時可以匯出完整備份，也能一鍵全部刪除。' },
    { icon: '🧘', title: '沒有複雜的設定', text: '不用設預算、不用建帳戶。打開統計就知道錢去哪了；想找某一筆，直接用講的：「上個月在超商花了多少」。' }
];

/**
 * 上架活動「西部拓荒季」（#756）。規格：DinDon_BackEnd/docs/api.md 第 29～30 節；字照 App 1.0.0 的
 * frontier_page.xml、frontier_store.xml、strings.xml badge_frontier_*（2026-11-21 對過）。
 * 期間照後端 GET /v1/frontier 的 season（starts_on 2026-11-20、ends_on 2026-12-31），使用者 11-18：「活動是到12月底」。
 */
export const FRONTIER_PERIOD = '2026/11/20～2026/12/31';

/**
 * 銀行與支付的兩種狀態。11-19 起 App 從「已馴服」改叫「已緝拿」（佈告欄 frontier_page.xml）。
 * 對外一律說「用真實通知驗證過」，不說「支援」（api.md 29.2 末段）：通緝中的很多其實也記得到
 */
export const frontierStatuses: { key: 'tamed' | 'wanted'; label: string; text: string }[] = [
    { key: 'tamed', label: '已緝拿', text: '叮咚用那一家真實的付款通知驗證過，記得對。' },
    { key: 'wanted', label: '通緝中', text: '還缺一則真實樣本——不一定記不到，只是還沒人確認過。' }
];

export interface FrontierStep {
    /** 意象：套索、警長星、仙人掌（不用槍，#756） */
    art: 'cactus' | 'lasso' | 'star';
    title: string;
    text: string;
}

/**
 * 怎麼參加：三步。11-20 起賞金改發金幣（#788，api.md 29.5），不再直接送方案天數；
 * 第一位回報的署名成那家的賞金獵人（App 畫面不說「領地」，frontier_page.xml）
 */
export const frontierSteps: FrontierStep[] = [
    {
        art: 'cactus',
        title: '發現漏網之魚',
        text: '付款沒被記到、或記錯了？那一家很可能還在通緝中。'
    },
    {
        art: 'lasso',
        title: '把那則通知抓回來',
        text: '在警視廳的通緝令點「回報這家的通知」，或在回報頁點「回報漏抓的通知」，勾出那則通知帶進來。送出前會先遮掉卡號、帳號、餘額這些個資。'
    },
    {
        art: 'star',
        title: '領金幣，當賞金獵人',
        text: '回報被採計就發金幣。第一個帶回真實通知的人，會用當時的暱稱署名成那一家的賞金獵人，之後不會換人。'
    }
];

/** 鎮上的地方：App 拓荒季小鎮的建築與說明（照 1.0.0 畫面上「鎮上的地方」那張清單，2026-11-21 在模擬器看的） */
export const frontierPlaces: { name: string; text: string }[] = [
    { name: '警視廳', text: '處理通緝令' },
    { name: '雜貨店', text: '拿金幣換東西' },
    { name: '賞金榜', text: '這一季誰賺的金幣最多' },
    { name: '佈告欄', text: '拓荒季的說明與進度' },
    { name: '消防局', text: '回報問題、給建議' },
    { name: '小酒館', text: '看公告、許願、贊助' },
    { name: '戶政廳', text: '邀朋友一起拓荒' }
];

/** 金幣怎麼來、能換什麼（frontier_store.xml store_how 與雜貨店的貨架） */
export const FRONTIER_COINS = '金幣不能用錢買：回報問題或建議被採計才有。到雜貨店換進階方案的天數，也能換徽章、稱號與主題。';

/**
 * 三顆季後絕版的紀念勳章（api.md 29.7）。條件照 App 的 badge_frontier_*_desc；建鎮元老照使用者 11-19 不寫「（試用中也算）」。
 * 酒館大亨 #805 起不再附送西部主題，原本的 extra 拿掉
 */
export const frontierBadges: { title: string; condition: string }[] = [
    { title: '荒野開拓者', condition: '拓荒季內有 7 天讓叮咚自動記帳、拍照或用語音記一筆，再回報一個問題或交一張通緝令。' },
    { title: '建鎮元老', condition: '拓荒季內訂閱。' },
    { title: '酒館大亨', condition: '拓荒季內贊助，哪一階都算。' }
];

/** 宣傳短片的一段：at 是這段開始的秒數（點了從這裡播），文字和影片裡的字幕對得上 */
export interface PromoChapter {
    at: number;
    title: string;
    text: string;
}

/**
 * 「18 秒看懂」旁邊的章節。秒數是從 4:5 版量出來的（工作區 docs/marketing/promo-video/，重錄了要重量）。
 * 影片本身有字，這份清單也是看不到影片的人（讀螢幕、省流量沒播）的文字版。
 */
export const promoChapters: PromoChapter[] = [
    { at: 0, title: '你上次記帳，是什麼時候？', text: '收據越積越多，沒記的帳一筆一筆堆上來。' },
    { at: 3.6, title: '付款的那一刻，帳就記好了', text: '付款通知一跳，首頁就多一筆。你動的手指：0 根。' },
    { at: 9.4, title: '付現金、沒通知？', text: '拍一張、說一句、截一張，一樣記好。' },
    { at: 12.9, title: '你負責花錢，我負責記帳', text: '免註冊、無廣告，帳只存在你的手機。' }
];
