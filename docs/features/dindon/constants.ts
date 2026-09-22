// [-] App 專用的聯絡信箱，和 App 的隱私權政策、問題回報頁是同一個（DinDon_Android 的 strings.xml report_email）
export const CONTACT_EMAIL = 'dindon.ledger@gmail.com';

/** 封測名額。OAuth 同意畫面「測試中」的測試使用者上限也是 100（見外層 google-group-setup.md） */
export const BETA_SEATS = 100;

export const PRIVACY_PATH = '/dindon/privacy/';

/** 刪除資料與帳號。Google Play 要求「帳號刪除」有一個不用裝 App 也打得開的網址 */
export const ACCOUNT_PATH = '/dindon/account/';

/** 封測的 Google 群組。加入群組才拿得到 Play 的測試版（見外層 google-group-setup.md） */
export const GROUP_URL = 'https://groups.google.com/g/dindon-beta';

/**
 * Play 的「加入測試」連結。等封閉測試軌道建好、上傳 AAB 之後才會有，
 * 填進來之後宣傳頁會自動多一顆按鈕；空的時候文案是「核准後把連結寄給你」。
 */
export const PLAY_OPTIN_URL = '';

// 報名信的範本：Play Console 加測試者要的是對方 Play 商店登入的那個 Gmail
const SIGNUP_SUBJECT = '叮咚記帳封閉測試';
const SIGNUP_BODY = [
    '（申請加入 Google 群組之後，有問題再用這封信問；報名本身不用寄信。）',
    '',
    'Play 商店登入的 Gmail：',
    '手機型號（限 Android）：',
    '想問的問題：'
].join('\n');

export const SIGNUP_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(SIGNUP_SUBJECT)}&body=${encodeURIComponent(SIGNUP_BODY)}`;

export interface iPoint {
    icon: string;
    title: string;
    text: string;
    /** 小標籤，例如「新功能」 */
    tag?: string;
}

/** 電子發票的痛點。叮咚記帳要回答的就是「那不是已經有電子發票 App 了嗎？」 */
export const invoicePains: iPoint[] = [
    { icon: '⏳', title: '最久要等兩天', text: '消費資料從店家上傳、再同步到載具，常常隔天甚至兩天後才看得到。' },
    { icon: '🧩', title: '總覽不直覺', text: '一張張發票排在一起，看不出這個月的錢都花去哪了。' },
    { icon: '💵', title: '付現的帳記不到', text: '夜市、早餐店、傳統市場，沒有電子發票的消費，全部不見。' },
    { icon: '😮‍💨', title: '養不成習慣', text: '等看得到的時候，早就忘了那筆是什麼。記帳的動力就這樣斷掉了。' }
];

/** 沒有通知也能記：自動歸類、拍照、語音、帳單截圖 */
export const withoutNotice: iPoint[] = [
    { icon: '🏷️', title: '自動歸類', text: '記住你改過的店家和分類，下次同一家店自動分對。分類也能自己增減。' },
    { icon: '📷', title: '拍照記帳', text: '拍一張，AI 讀出店家、金額和每個品項。電子發票的 QR 碼直接在手機上解碼。' },
    { icon: '🎙️', title: '語音記帳', text: '說一句「午餐牛肉麵 150」就好。轉出來的文字先給你確認，改好了再送出。' },
    { icon: '🧾', title: '帳單截圖', text: '信用卡 App 的消費明細截一張，AI 把每一列讀出來，勾一勾就整頁記好。退款會記成收入。', tag: '新功能' }
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
export const lazyPoints: iPoint[] = [
    { icon: '🚪', title: '不用註冊', text: '不用帳號、不用登入，裝好打開就能記。' },
    { icon: '🚫', title: '沒有廣告', text: '沒有廣告，不賣資料，也不拿你的資料去做廣告。' },
    { icon: '📱', title: '帳只存在你的手機', text: '帳目只存在這支手機，換手機時隨 Android 備份從你自己的 Google 帳號還原，我們看不到。隨時可以匯出完整備份，也能一鍵全部刪除。' },
    { icon: '🧘', title: '沒有複雜的設定', text: '不用設預算、不用建帳戶。打開統計就知道錢去哪了；想找某一筆，直接用講的：「上個月在超商花了多少」。' }
];

export const betaSteps: string[] = [
    '用你在 Play 商店登入的那個 Google 帳號，申請加入封測群組。',
    '核准之後，會收到 Google Play 的測試版連結，正常下載安裝。',
    '每天打開一次，連續 14 天。遇到問題或有想法，在 App 裡回報。'
];

export interface iReward {
    tag: string;
    title: string;
    condition: string;
    reward: string;
    /** 依名次分級的獎勵，一列一級 */
    tiers?: { rank: string; reward: string }[];
}

/**
 * 封測獎勵，數字以 App 的「獎勵說明」為準（新板溝通板 #2）。
 * 名次獎與全勤另外算，都從正式版上線那天開始算。
 */
export const betaRewards: iReward[] = [
    { tag: '所有人', title: '勇敢白老鼠', condition: '加入封測', reward: '封測期間，所有功能免費用' },
    {
        tag: '依名次',
        title: '抓蟲排行榜',
        condition: '在 App 裡回報 bug 或建議，被採計的越多，名次越前。',
        reward: '正式版上線後，免費用「進階」方案',
        tiers: [
            { rank: '第 1 名', reward: '3 個月' },
            { rank: '第 2 名', reward: '2 個月' },
            { rank: '第 3 名', reward: '1 個月' },
            { rank: '4～10 名', reward: '3 週' },
            { rank: '11～20 名', reward: '2 週' },
            { rank: '之後有回報過的', reward: '1 週' }
        ]
    },
    { tag: '+1 個月', title: '全勤小鐵人', condition: '封測期間連續 14 天打開叮咚記帳自動打卡（沒有網路的那天不會補打）', reward: '名次獎之外，再加「進階」方案 1 個月' }
];
