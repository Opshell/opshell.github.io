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

export interface AnnouncementDraft {
    message: string;
    link: string;
    startsAt: string;
    endsAt: string;
    minAppBuild: number;
    maxAppBuild: number;
}

export function announcementError(draft: AnnouncementDraft, messageMax: number): string {
    const message = draft.message.trim();
    if (!message) return '內容不能空白';
    if ([...message].length > messageMax) return `內容最多 ${messageMax} 字`;
    if (/\n/.test(message)) return '內容不能換行（會放在小夥伴的一個對話框裡）';
    const link = draft.link.trim();
    if (link && !link.startsWith('https://') && !APP_LINK.test(link)) return '連結要是 https:// 網址，或 app:頁面代號';
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
