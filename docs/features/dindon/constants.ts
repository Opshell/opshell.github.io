// [-] 報名封閉測試的信箱。上線前換成專用信箱（example.com 是保留網域，寄不出去）
export const CONTACT_EMAIL = 'your-email@example.com';

// 報名信的範本：Play Console 加測試者要的是對方 Play 商店登入的那個 Gmail
const SIGNUP_SUBJECT = '報名叮咚記帳封閉測試';
const SIGNUP_BODY = [
    '我想加入叮咚記帳的封閉測試。',
    '',
    'Play 商店登入的 Gmail：',
    '手機型號：',
    '平常用哪些銀行或支付 App（選填）：'
].join('\n');

export const SIGNUP_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(SIGNUP_SUBJECT)}&body=${encodeURIComponent(SIGNUP_BODY)}`;

export interface iFeature {
    icon: string
    title: string
    text: string
}

export const features: iFeature[] = [
    {
        icon: '🔔',
        title: '通知自動記帳',
        text: '勾選你的銀行、行動支付 App，付款通知一跳出來，金額和店家就記好了。沒勾選的 App 的通知一律略過。'
    },
    {
        icon: '📷',
        title: '拍照記帳',
        text: '拍一張收據或發票，AI 讀出店家、金額和每個品項。電子發票的 QR 碼直接在手機上解碼。'
    },
    {
        icon: '🎙️',
        title: '語音記帳',
        text: '說一句「午餐牛肉麵 150」就好。轉出來的文字先給你確認，改好了再送出整理。'
    },
    {
        icon: '🏷️',
        title: '越用越會分類',
        text: '記住你改過的店家和分類，下次同一家店自動分對，分類也能自己增減。'
    },
    {
        icon: '📊',
        title: '花費統計',
        text: '圓餅圖、長條圖，今天、本週、本月或自訂區間，錢花去哪裡一眼看完。'
    },
    {
        icon: '🏅',
        title: '連續天數與徽章',
        text: '8 種徽章，每種都能從銅一路升到七彩。記帳這件事，也可以有點收集的樂趣。'
    }
];

export const privacyPoints: string[] = [
    '不用註冊、不用登入，打開就能記。',
    '帳本只存在你的手機上，不做雲端同步。隨時可以匯出 CSV / JSON，也能一鍵全部刪除。',
    '只有在你用拍照、語音，或自己開啟 AI 分類時，那一次的照片或文字才會送去 AI 辨識；我們的伺服器不保存這些內容。',
    '付款通知送出前，會先在手機上抹掉卡號末四碼、帳號與餘額。'
];

export const betaSteps: string[] = [
    '寄信報名，附上你在 Play 商店登入的 Gmail。',
    '收到邀請後，從 Play 商店安裝測試版。',
    '保留 14 天，平常照用就好。遇到問題或有想法，直接回信。'
];
