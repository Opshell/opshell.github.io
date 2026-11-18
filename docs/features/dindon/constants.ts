// [-] App 專用的聯絡信箱，和 App 的隱私權政策、問題回報頁是同一個（DinDon_Android 的 strings.xml report_email）
export const CONTACT_EMAIL = 'dindon.ledger@gmail.com';

/** Play 商店頁（2026-11-20 正式版上架，#756）。宣傳頁、演示頁、功能地圖的「下載」都連這裡 */
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=me.opshell.dindon';

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

/** 電子發票的痛點。叮咚記帳要回答的就是「那不是已經有電子發票 App 了嗎？」 */
export const invoicePains: LandingPoint[] = [
    { icon: '⏳', title: '最久要等兩天', text: '消費資料從店家上傳、再同步到載具，常常隔天甚至兩天後才看得到。' },
    { icon: '🧩', title: '總覽不直覺', text: '一張張發票排在一起，看不出這個月的錢都花去哪了。' },
    { icon: '💵', title: '付現的帳記不到', text: '夜市、早餐店、傳統市場，沒有電子發票的消費，全部不見。' },
    { icon: '😮‍💨', title: '養不成習慣', text: '等看得到的時候，早就忘了那筆是什麼。記帳的動力就這樣斷掉了。' }
];

/**
 * 沒有通知也能記：自動歸類、拍照、語音、隨手記（2026-10-08 對 App 0.7.19：帳單截圖 0.7.17 併進拍照的「從相簿選」，
 * 語音 0.7.13 起一句記多筆，隨手記 0.7.6～0.7.8 重做、0.7.12 有桌面小工具）
 */
export const withoutNotice: LandingPoint[] = [
    { icon: '🏷️', title: '自動歸類', text: '記住你改過的店家和分類，下次同一家店自動分對。分類也能自己增減。' },
    { icon: '📷', title: '拍照記帳', text: '拍一張，AI 讀出店家、金額和每個品項。從相簿選信用卡帳單截圖，整頁一次記好。' },
    { icon: '🎙️', title: '語音記帳', text: '「早餐蛋餅 45，豆漿 25」一句話記好幾筆；轉帳、借錢、分期也聽得懂。' },
    { icon: '✍️', title: '隨手記', text: '桌面小工具點一下就能記；寫「飲料 60」就好，猜不到分類才問 AI。' }
];

/**
 * 記好之後，小精靈還會幫你想（2026-10-08 新增這一段，對 App 0.7.19）。
 * 都是「本來要自己算、自己記得」的事：智能導正 0.7.18、退刷抵銷 0.7.9、分期與每月可支配 0.7.10、借貸與存錢目標 0.7.11～0.7.12
 */
export const helperPoints: LandingPoint[] = [
    { icon: '🧠', title: '智能導正', text: '通知只寫「消費 400」？照你教過一次的範例記對，下次就不用再改。', tag: '新功能' },
    { icon: '↩️', title: '退刷自動抵銷', text: '刷退的通知一來，小精靈先問一聲，按了就把原本那筆沖掉。' },
    { icon: '🗓️', title: '信用卡分期', text: '記帳時選分 N 期，之後每個月自動記一期，不會一次算爆預算。' },
    { icon: '🎯', title: '每天能花多少', text: '收入扣掉固定支出、分期、存錢，算出每月可支配，一鍵變成每日預算。' },
    { icon: '🤝', title: '借貸與代墊', text: '幫朋友墊的、借出去的都記著，還了按一下就收回；有利息的也算得出來。' },
    { icon: '🐷', title: '存錢目標', text: '同時存好幾個，省下來的錢照順序先存滿上面那個；填了每月存多少，會告訴你大約還要幾個月。' }
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
 * 上架活動「西部拓荒季」（#756）。規格：工作區 docs/devlog/android/Android_開發記錄0.8.0.md「2026-11-16 做 1.0.0」、
 * DinDon_BackEnd/docs/api.md 第 29 節；文字盡量照 App 的 frontier_report.xml 與徽章牆的說法。
 * 期間照使用者 2026-11-18 的話寫死日期（「活動是到12月底」），不寫「30 天」。
 */
export const FRONTIER_PERIOD = '2026/11/20～2026/12/31';

/** 領地的兩種狀態。對外一律說「已用真實通知驗證」，不說「支援」（api.md 29.2 末段）：通緝中的很多其實也記得到 */
export const frontierStatuses: { key: 'tamed' | 'wanted'; label: string; text: string }[] = [
    { key: 'tamed', label: '已馴服', text: '已用真實通知驗證：拿到那一家真的付款通知，跑過叮咚的整套判斷，記得對。' },
    { key: 'wanted', label: '通緝中', text: '還缺真實通知樣本。不代表記不到，只是還沒拿到真的通知驗證過。' }
];

export interface FrontierStep {
    /** 意象：套索、警長星、仙人掌（不用槍，#756） */
    art: 'cactus' | 'lasso' | 'star';
    title: string;
    text: string;
}

/** 怎麼參加：三步。賞金天數照 api.md 29.5 的建議值；署名照 29.3 */
export const frontierSteps: FrontierStep[] = [
    {
        art: 'cactus',
        title: '發現漏網之魚',
        text: '付款沒被記到、或記錯了？那一家很可能還在通緝中。'
    },
    {
        art: 'lasso',
        title: '套住那則通知',
        text: '在 App 的「回報」頁點「回報漏抓的通知」，勾出那則通知帶進回報。送出前會先遮掉卡號、帳號、餘額這些個資。'
    },
    {
        art: 'star',
        title: '領賞金，在領地署名',
        text: '確認是有效的新樣本，就送進階方案：一般 7 天，全新的通知格式 14 天。第一位回報那家有效樣本的人，會用當時的暱稱在那家的領地上署名，之後不會換人。'
    }
];

/** 三顆季後絕版的紀念徽章（api.md 29.7）。條件照 App 徽章牆的字（strings.xml badge_frontier_* 等） */
export const frontierBadges: { title: string; condition: string; extra?: string }[] = [
    { title: '荒野開拓者', condition: '拓荒季內有 7 天讓叮咚自動記帳，再拍照或用語音記一筆。' },
    { title: '建鎮元老', condition: '拓荒季內訂閱（試用中也算）。' },
    { title: '酒館大亨', condition: '拓荒季內贊助，哪一階都算。', extra: '同時解鎖西部配色，季後也一直留著。' }
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
