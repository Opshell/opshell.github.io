// 叮咚後端的網址。後台（/v1/admin/*）與帳號刪除頁（/v1/account/*）共用。
const PRODUCTION_API = 'https://dindon-backend-851099261403.asia-southeast1.run.app';

/** 本機開發時可以用 ?api=http://localhost:8090 改接本機後端；正式網站一律打正式後端 */
export function apiBase(): string {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        const override = new URLSearchParams(window.location.search).get('api');
        if (override) return override.replace(/\/$/, '');
    }
    return PRODUCTION_API;
}
