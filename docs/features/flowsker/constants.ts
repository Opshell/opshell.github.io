// Flowsker（Flowmodoro 任務與專注力管理器）在部落格的介紹頁。產品本身在 flowsker.com（Vue 前端 ＋ Go 後端，倉庫 Opshell/Flowsker_Web、Flowsker_BackEnd）
export const WEB_URL = 'https://flowsker.com/';
export const PRIVACY_URL = 'https://flowsker.com/privacy';

/** 倉庫公開了再把原始碼的連結放出來（2026-10-11 兩個倉庫都還是私人的；授權已定 AGPL-3.0） */
export const REPOS_PUBLIC = false;
export const REPO_WEB_URL = 'https://github.com/Opshell/Flowsker_Web';
export const REPO_BACKEND_URL = 'https://github.com/Opshell/Flowsker_BackEnd';

/**
 * 登入的現況（2026-10-11）：Google Calendar 的 `calendar.events` 是機密範圍，同意畫面送審通過前只有測試名單裡的帳號登得進去。
 * 審核過了把這句改掉或清空。
 */
export const LOGIN_NOTE = 'Google 的同意畫面還在審核，審核通過前只有受邀的測試帳號能登入；公開頁面與隱私權政策都看得到。';

/** 叮咚記帳：Flowsker 的後端骨架、溝通板的做法都是從它抽出來的 */
export const DINDON_PATH = '/dindon/';

export interface Feature {
    icon: string;
    title: string;
    text: string;
}

/** 六個重點，照產品 README 的順序 */
export const features: Feature[] = [
    { icon: '⏳', title: '不數秒數的計時器', text: '計時往上累積，跟著你的節奏走；休息時間是專注時間的五分之一，想停再停。' },
    { icon: '🗂️', title: '任務遇上時間', text: '任務依專案分組，每個任務累積多次心流紀錄，看得到它真正花掉多久。' },
    { icon: '🧚', title: '小精靈幫你記', text: '給各專案的 AI 助手一把權杖，它們就能把「要你親手做的事」開成任務；問你同不同意時，在卡片上一鍵回答。' },
    { icon: '🏢', title: 'AI 辦公室', text: '看正在工作的 AI 助手、它們之間的溝通串。統計頁裡，人的專注是時光沙，AI 的工作是電力。' },
    { icon: '📅', title: '日曆同步', text: '用 Google 帳號登入，結束的心流回合寫進你的 Google Calendar，不用手動補記。' },
    { icon: '📴', title: '離線也不掉紀錄', text: '斷線或關掉分頁時紀錄先存在瀏覽器，連上再補送。' }
];

export interface Shot {
    src: string;
    alt: string;
    title: string;
    text: string;
    width: number;
    height: number;
}

/** 三張畫面，截圖來自產品 README（2026-10-10，示範資料） */
export const shots: Shot[] = [
    { src: '/images/flowsker/tasks.webp', alt: '任務看板：三個專案群組，卡片上有累積時數、回合數與小精靈在等的決定', title: '任務看板', text: '一個專案一欄。卡片上是累積的時數與回合數；小精靈開的任務會標出來，等你決定的事直接在卡片上按。', width: 1280, height: 800 },
    { src: '/images/flowsker/stats.webp', alt: '統計儀表：今日專注總覽、今日時間軸、近一年專注熱度', title: '統計儀表', text: '今天專注了多久、幾個回合、最長一段；一年份的熱度圖用「當日累計時數」分級，像雨量一樣。', width: 1280, height: 800 },
    { src: '/images/flowsker/office.webp', alt: 'AI 辦公室：各專案的小精靈狀態、今天用掉的 token、額度，以及溝通板的單', title: 'AI 辦公室', text: '哪個專案有幾位小精靈在工作、今天用了多少 token、額度剩多少；溝通板上還沒結案的單也在這裡。', width: 1280, height: 800 }
];

/** 登入時向 Google 要的權限（跟產品首頁與隱私權政策一致） */
export const scopes: { name: string; scope: string; use: string }[] = [
    { name: '基本資料', scope: 'openid · email · profile', use: '用你的 Google 帳號登入，顯示名字與大頭貼。' },
    { name: 'Google Calendar 事件', scope: 'calendar.events', use: '只用來把結束的專注時段寫成日曆事件。不讀既有行程、不讀日曆清單與設定。' }
];
