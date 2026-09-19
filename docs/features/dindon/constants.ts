// [-] App 專用的聯絡信箱，和 App 的隱私權政策、問題回報頁是同一個（DinDon_Android 的 strings.xml report_email）
export const CONTACT_EMAIL = 'dindon.ledger@gmail.com';

/** 封測名額。OAuth 同意畫面「測試中」的測試使用者上限也是 100（見外層 google-group-setup.md） */
export const BETA_SEATS = 100;

export const PRIVACY_PATH = '/dindon/privacy/';

// 報名信的範本：Play Console 加測試者要的是對方 Play 商店登入的那個 Gmail
const SIGNUP_SUBJECT = '報名叮咚記帳封閉測試';
const SIGNUP_BODY = [
    '我想加入叮咚記帳的封閉測試。',
    '',
    'Play 商店登入的 Gmail：',
    '手機型號（限 Android）：',
    '平常用哪些銀行或支付 App（選填）：'
].join('\n');

export const SIGNUP_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(SIGNUP_SUBJECT)}&body=${encodeURIComponent(SIGNUP_BODY)}`;

export interface iPoint {
    icon: string
    title: string
    text: string
}

/** 電子發票的痛點。叮咚記帳要回答的就是「那不是已經有電子發票 App 了嗎？」 */
export const invoicePains: iPoint[] = [
    { icon: '⏳', title: '最久要等兩天', text: '消費資料從店家上傳、再同步到載具，常常隔天甚至兩天後才看得到。' },
    { icon: '🔄', title: '要等同步', text: '想看今天花了多少？還沒同步的那幾筆，就是看不到。' },
    { icon: '🧩', title: '總覽不直覺', text: '一張張發票排在一起，看不出這個月的錢都花去哪了。' },
    { icon: '💵', title: '付現的帳記不到', text: '夜市、早餐店、傳統市場，沒有電子發票的消費，全部不見。' },
    { icon: '😮‍💨', title: '養不成習慣', text: '等看得到的時候，早就忘了那筆是什麼。記帳的動力就這樣斷掉了。' }
];

/** 沒有通知也能記：自動歸類、拍照、語音 */
export const withoutNotice: iPoint[] = [
    { icon: '🏷️', title: '自動歸類', text: '記住你改過的店家和分類，下次同一家店自動分對。分類也能自己增減。' },
    { icon: '📷', title: '拍照記帳', text: '拍一張，AI 讀出店家、金額和每個品項。電子發票的 QR 碼直接在手機上解碼。' },
    { icon: '🎙️', title: '語音記帳', text: '說一句「午餐牛肉麵 150」就好。轉出來的文字先給你確認，改好了再送出。' }
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
    { icon: '📱', title: '帳只存在你的手機', text: '帳本不會上傳到任何伺服器，包括我們自己的。隨時可以匯出 CSV / JSON，也能一鍵全部刪除。' },
    { icon: '🧘', title: '沒有複雜的設定', text: '不用設預算、不用建帳戶、不用學一堆操作。打開統計，就直觀知道錢去哪了。' }
];

export const betaSteps: string[] = [
    '寄信報名，附上你在 Play 商店登入的 Gmail（限 Android 手機）。',
    '收到邀請後，從 Play 商店安裝測試版。',
    '每天打開一次，連續 14 天。遇到問題或有想法，直接在 App 裡回報。'
];

export interface iReward {
    tag: string
    title: string
    condition: string
    reward: string
}

/** 封測獎勵（2026-09-19 決定，溝通板 #22）。鐵人與貢獻分開算，最多 4 個月，從正式版上線那天開始算 */
export const betaRewards: iReward[] = [
    { tag: '所有人', title: '勇敢白老鼠', condition: '加入封測', reward: '封測期間，所有功能免費用' },
    { tag: '1 個月', title: '全勤鐵人', condition: '封測期間連續 14 天打開叮咚記帳', reward: '正式版上線後，免費「進階」方案 1 個月' },
    { tag: '最多 3 個月', title: '抓蟲貢獻', condition: '在 App 裡回報 bug 或建議，被採計的件數越多', reward: '再多送最多 3 個月「進階」方案' }
];
