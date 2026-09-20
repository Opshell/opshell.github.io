import { computed, ref } from 'vue';

// 網站上需要 Google 登入的兩個地方共用：後台（/dindon/dashboard/）與帳號刪除頁（/dindon/account/）。
// 兩邊拿到的是同一把 ID token，後端各自驗自己要的東西（後台驗管理員名單，刪除頁驗帳號本人）。
//
// 跟 App 共用的「網頁」OAuth client ID（api.md 第 8 節）。client ID 本來就是公開的，不是祕密。
// 主控台要在這個 client 的「已授權的 JavaScript 來源」加上網站實際的網址才能登入：
// 網站設了自訂網域，opshell.github.io 一律轉到 https://opshell.me，所以要登記的是 https://opshell.me。
const GOOGLE_CLIENT_ID = '851099261403-t654nu5furtr264jcsp3s4pvm54nntlo.apps.googleusercontent.com';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleIdApi {
    initialize: (config: Record<string, unknown>) => void
    renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
    disableAutoSelect: () => void
}
declare global {
    interface Window { google?: { accounts: { id: GoogleIdApi } } }
}

export interface GoogleProfile {
    email: string | null
    name: string | null
    picture: string | null
    /** 過期時間（毫秒）。不是 Google 的 JWT 時為 null */
    expiresAt: number | null
}

// 模組層級的狀態：同一個分頁裡共用一份。
// ID token 只放在記憶體裡，不存 localStorage——這個網站每一頁都會載入第三方腳本，存起來就多一個被讀走的地方。
const credential = ref<string | null>(null);
const profile = ref<GoogleProfile | null>(null);
const expired = ref(false);
const loadError = ref('');
let readyPromise: Promise<GoogleIdApi> | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

/** 解開 JWT 的 payload 拿 email 與過期時間，只是顯示用；真正的驗證在後端 */
function decodeProfile(token: string): GoogleProfile {
    try {
        const binary = atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
        const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0))));
        return { email: json.email ?? null, name: json.name ?? null, picture: json.picture ?? null, expiresAt: json.exp ? json.exp * 1000 : null };
    } catch {
        return { email: null, name: null, picture: null, expiresAt: null };
    }
}

/** 丟掉憑證、回到登入畫面 */
function dropCredential() {
    clearTimeout(expiryTimer);
    credential.value = null;
    profile.value = null;
}

function handleCredential(response: { credential?: string }) {
    if (!response.credential) return;
    credential.value = response.credential;
    profile.value = decodeProfile(response.credential);
    expired.value = false;

    // ID token 一小時過期。到期前一分鐘就回登入畫面，不要等 API 回 401
    clearTimeout(expiryTimer);
    const expiresAt = profile.value.expiresAt;
    if (expiresAt) {
        expiryTimer = setTimeout(() => {
            expired.value = true;
            dropCredential();
        }, Math.max(expiresAt - Date.now() - 60_000, 0));
    }
}

/**
 * 載入 Google 的登入元件並初始化（只做一次）。
 *
 * 刻意**不開自動登入、不用 One Tap（prompt）**，只留 renderButton 的按鈕（溝通板 #20）：
 * 這些頁面跟部落格其他頁面是同一個來源，別頁載入的第三方腳本可以開一個看不見的 iframe 把它們載進來；
 * 有自動登入的話，Google 會不經點擊就把 ID token 發給那個 iframe。
 * 按鈕畫在 Google 自己來源的 iframe 裡，第三方腳本點不到，一定要本人按。
 */
function ready(): Promise<GoogleIdApi> {
    readyPromise ??= new Promise<GoogleIdApi>((resolve, reject) => {
        const initialize = () => {
            const google = window.google?.accounts?.id;
            if (!google) return reject(new Error('Google 登入元件載入失敗'));
            google.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential, auto_select: false });
            resolve(google);
        };
        if (window.google?.accounts?.id) return initialize();

        const script = document.createElement('script');
        script.src = GIS_SRC;
        script.async = true;
        script.onload = initialize;
        script.onerror = () => reject(new Error('Google 登入元件載入失敗，請檢查網路或擋廣告的外掛'));
        document.head.append(script);
    }).catch(error => {
        readyPromise = null; // 下次再試
        throw error;
    });
    return readyPromise;
}

export function useGoogleAuth() {
    const isSignedIn = computed(() => !!credential.value);

    /** 把 Google 的登入按鈕畫進指定的元素；一定先初始化完才畫 */
    async function renderButton(el: HTMLElement) {
        try {
            const google = await ready();
            loadError.value = '';
            google.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'zh-TW' });
        } catch (error) {
            loadError.value = (error as Error).message;
        }
    }

    /** API 回 401 時呼叫：憑證不能用了，丟掉並請使用者重新登入 */
    function markExpired() {
        expired.value = true;
        dropCredential();
    }

    function signOut() {
        expired.value = false;
        dropCredential();
        window.google?.accounts.id.disableAutoSelect();
    }

    return { credential, profile, expired, loadError, isSignedIn, renderButton, markExpired, signOut };
}
