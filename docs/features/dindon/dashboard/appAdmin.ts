import type { AppVersions } from './schemas/admin.schema';

// 「App 版本」分頁的純邏輯（溝通板 #0076 版本、#0080 公告）。畫面在 components/AppPanel.vue。
// 時間一律用台灣時間給人看、送出時帶 +08:00（後端收 RFC3339、要帶時區）。

const TAIPEI_OFFSET = '+08:00';

/** RFC3339 → `<input type="datetime-local">` 的值（台灣時間，到分鐘） */
export function toTaipeiLocal(iso: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(new Date(iso));
    const get = (type: string) => parts.find(part => part.type === type)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** `datetime-local` 的值（當成台灣時間）→ RFC3339 */
export const fromTaipeiLocal = (local: string) => `${local}:00${TAIPEI_OFFSET}`;

/** 把最低版本調到 newMin，近幾天來過的裝置有幾台會被擋（有帶版本、低於它的；沒帶版本的 0.6.7 以前不擋） */
export function blockedCount(versions: AppVersions['versions'], newMin: number): number {
    return versions
        .filter(version => version.appBuild > 0 && version.appBuild < newMin)
        .reduce((sum, version) => sum + version.devices, 0);
}

/** versionName 的格式：0.7.1 這種三段數字（後端也擋，前端先說清楚） */
const VERSION_NAME = /^\d+\.\d+\.\d+$/;

export interface ConfigDraft {
    minAppBuild: number;
    latestAppBuild: number;
    latestAppVersion: string;
}

export function configError(draft: ConfigDraft): string {
    const { minAppBuild, latestAppBuild, latestAppVersion } = draft;
    if ([minAppBuild, latestAppBuild].some(n => !Number.isInteger(n) || n < 0)) return '版本號要是 0 以上的整數';
    if (latestAppBuild > 0 && minAppBuild > latestAppBuild) return '最低版本不能比最新版本新（不然最新版也會被擋）';
    if (latestAppVersion && !VERSION_NAME.test(latestAppVersion)) return '版本名稱寫成 0.7.1 這種三段數字';
    if (latestAppBuild > 0 && !latestAppVersion) return '有最新版本號，也要填它的名稱（App 會顯示）';
    return '';
}

/** 公告的連結：空的、https:// 網址，或 app:<頁面代號>（小寫英數與 - _ /，最多 64 字） */
const APP_LINK = /^app:[a-z0-9_/-]{1,64}$/;

/**
 * App 認得的頁面代號，照 api.md 第 21 節（溝通板 #0080；10-03 對過，20 個一樣）。App 0.7.5 起會接；api.md 加了新的再補這裡。
 * App 看不懂的代號一律當沒有連結。
 */
export const APP_PAGES: { code: string; label: string }[] = [
    { code: 'app:home', label: '首頁' },
    { code: 'app:stats', label: '花費統計' },
    { code: 'app:wallet', label: '帳戶' },
    { code: 'app:budget', label: '每日預算與目標' },
    { code: 'app:badges', label: '徽章牆' },
    { code: 'app:event', label: 'Beta 貢獻活動（養叮咚）' },
    { code: 'app:menu', label: '選單' },
    { code: 'app:help/guide', label: '說明 → 使用說明' },
    { code: 'app:help/faq', label: '說明 → 常見問題' },
    { code: 'app:help/whats-new', label: '說明 → 更新內容' },
    { code: 'app:settings/capture', label: '通知記帳設定' },
    { code: 'app:settings/permissions', label: '權限' },
    { code: 'app:settings/account', label: '個人資料（綁 Google）' },
    { code: 'app:settings/categories', label: '分類管理' },
    { code: 'app:settings/recurring', label: '固定收支' },
    { code: 'app:settings/quick', label: '快選模板' },
    { code: 'app:settings/backup', label: '資料與備份' },
    { code: 'app:plans', label: '方案比較' },
    { code: 'app:report', label: '問題回報' },
    { code: 'app:update', label: '打開 Play 的更新（有新版才有反應）' }
];

/** 下拉選單裡「網址」那一項的值：選了才出現網址欄 */
export const LINK_URL = '__url';

/** 現在的連結對到下拉選單的哪一項：空的、認得的代號、不在清單上的 app: 代號（照原樣留著）、或網址 */
export function linkChoice(link: string): string {
    const value = link.trim();
    if (!value) return '';
    if (value.startsWith('app:')) return value;
    return LINK_URL;
}

/** 列表上顯示的連結：認得的代號寫頁面名稱 */
export function linkLabel(link: string): string {
    const page = APP_PAGES.find(p => p.code === link.trim());
    return page ? `${page.label}（${page.code}）` : link;
}

export interface AnnouncementDraft {
    message: string;
    link: string;
    startsAt: string;
    endsAt: string;
    minAppBuild: number;
    maxAppBuild: number;
    level: 'normal' | 'alert';
    /** 表單上是一行字，逗號、頓號或空白分開；送出前用 splitList 拆 */
    institutions: string;
    bankCodes: string;
}

/**
 * 「永豐銀行、國泰世華」→ 陣列。去頭尾空白、去重複，空的拿掉。
 * 機構名只用逗號、頓號分：名稱本身會有空白（後端對照表的「LINE Pay」「一卡通 Money」），用空白切會拆成兩個，App 拿「Pay」去比對就錯了。
 * 銀行代碼是三碼數字，才讓空白也能當分隔（byWhitespace）。
 */
export function splitList(text: string, byWhitespace = false): string[] {
    const separator = byWhitespace ? /[,，、\s]+/ : /[,，、]+/;
    return [...new Set(text.split(separator).map(item => item.trim()).filter(Boolean))];
}

/** 示警的機構與代碼，照 api.md 第 8 節公告的 400：機構最多 10 個、每個 1～20 字；代碼是三碼數字、最多 10 個 */
export function alertTargetsError(institutions: string[], bankCodes: string[]): string {
    if (institutions.length > 10) return '相關機構最多 10 個';
    if (institutions.some(name => [...name].length > 20)) return '機構名稱每個最多 20 字';
    if (bankCodes.length > 10) return '銀行代碼最多 10 個';
    if (bankCodes.some(code => !/^\d{3}$/.test(code))) return '銀行代碼是三碼數字（例如 807）';
    return '';
}

/**
 * 公告內容照後端存進去的樣子整理（api.md 第 21 節；後端 appinfo.NormalizeMessage，#737）：
 * \r\n 換成 \n、每行去尾端空白、頭尾空白與空行去掉、連續空行壓成一個。字數照整理完的算，計數才跟後端一致。
 * 空白用 Unicode 的 White_Space，對應 Go 的 unicode.IsSpace（JS 的 \s 多收了 U+FEFF）
 */
export function normalizeMessage(raw: string): string {
    const kept: string[] = [];
    for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
        const trimmed = line.replace(/\p{White_Space}+$/u, '');
        if (!trimmed && kept.length && !kept[kept.length - 1]) continue;
        kept.push(trimmed);
    }
    return kept.join('\n').replace(/^\p{White_Space}+|\p{White_Space}+$/gu, '');
}

/** 字數照字元（code point）算，不是 UTF-16 長度：emoji 算一個字，跟後端的 RuneCount 一樣 */
export const messageLength = (raw: string) => [...normalizeMessage(raw)].length;

/** 換行以外的控制字元（Go 的 unicode.IsControl：C0、DEL、C1）。單獨的 \r 也算，後端只把 \r\n 當換行 */
// eslint-disable-next-line no-control-regex -- 就是要找控制字元
const MESSAGE_CONTROL = /[\0-\x09\x0B-\x1F\x7F-\x9F]/;

/** 公告與示警的內容：不空、不超過字數、換行以外沒有控制字元 */
function messageError(text: string, messageMax: number): string {
    if (MESSAGE_CONTROL.test(text.replace(/\r\n/g, '\n'))) return '內容不能有 tab 或其他看不見的控制字元（換行可以）';
    const message = normalizeMessage(text);
    if (!message) return '內容不能空白';
    if ([...message].length > messageMax) return `內容最多 ${messageMax} 字`;
    return '';
}

/**
 * 1.0.0 的 versionCode（Android #714 升版、#689 驗收摘要）。從這版起 App 才：
 * 照 message 的換行顯示、泡泡有高度上限（#737），以及把 {暱稱} 換成使用者的名字（#736）
 */
export const APP_1_0_0_BUILD = 103;

/** 舊版（0.9.16 以前）泡泡能好好放下的長度：原本的公告上限 */
export const LEGACY_MESSAGE_MAX = 80;

export const NICKNAME_PLACEHOLDER = '{暱稱}';

export interface MessageVersionHints {
    /** 超過 80 字或有換行，舊版會整段攤開（#745） */
    long: boolean;
    /** 寫了 {暱稱}，舊版會照字面顯示（#736） */
    nickname: boolean;
}

/** 這則公告要不要提醒設最低版本。只提醒、不擋送出：要不要讓舊版看到是管理員的判斷 */
export function messageVersionHints(raw: string, minAppBuild: number): MessageVersionHints {
    const message = normalizeMessage(raw);
    const oldAppsSeeIt = minAppBuild < APP_1_0_0_BUILD;
    return {
        long: oldAppsSeeIt && ([...message].length > LEGACY_MESSAGE_MAX || message.includes('\n')),
        nickname: oldAppsSeeIt && message.includes(NICKNAME_PLACEHOLDER)
    };
}

const linkError = (link: string) => (link && !link.startsWith('https://') && !APP_LINK.test(link) ? '連結要是 https:// 網址，或 app:頁面代號' : '');

export function announcementError(draft: AnnouncementDraft, messageMax: number): string {
    const message = messageError(draft.message, messageMax);
    if (message) return message;
    const link = linkError(draft.link.trim());
    if (link) return link;
    const targets = alertTargetsError(splitList(draft.institutions), splitList(draft.bankCodes, true));
    if (targets) return targets;
    if (!draft.endsAt) return '請選結束時間';
    if (draft.startsAt && draft.endsAt <= draft.startsAt) return '結束要比開始晚';
    if ([draft.minAppBuild, draft.maxAppBuild].some(n => !Number.isInteger(n) || n < 0)) return '版本號要是 0 以上的整數';
    if (draft.maxAppBuild > 0 && draft.minAppBuild > draft.maxAppBuild) return '版本範圍反了';
    return '';
}

/** 「只給 52 以上」「只給 51 以下」「52～53」「全部」 */
export function buildRangeText(min: number, max: number): string {
    if (!min && !max) return '全部版本';
    if (min && max) return min === max ? `只給 ${min}` : `${min}～${max}`;
    return min ? `${min} 以上` : `${max} 以下`;
}

/** 新聞示警草稿發佈前改的那幾欄。link 空的是不帶連結（後端沒給才用第一篇來源，這裡一律明確送） */
export interface NewsDraftEdit {
    message: string;
    institutions: string;
    bankCodes: string;
    link: string;
    endsAt: string;
}

export function newsDraftError(edit: NewsDraftEdit, messageMax: number, now = Date.now()): string {
    const message = messageError(edit.message, messageMax);
    if (message) return message;
    const targets = alertTargetsError(splitList(edit.institutions), splitList(edit.bankCodes, true));
    if (targets) return targets;
    const link = linkError(edit.link.trim());
    if (link) return link;
    if (!edit.endsAt) return '請選結束時間';
    // 示警的開始時間一律是按下發佈的那一刻
    if (new Date(fromTaipeiLocal(edit.endsAt)).getTime() <= now) return '結束要比現在晚（示警按下就開始）';
    return '';
}
