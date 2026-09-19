import { computed, ref } from 'vue';

// 跟 App 共用的「網頁」OAuth client ID（api.md 第 8 節）。client ID 本來就是公開的，不是祕密。
// 主控台要在這個 client 的「已授權的 JavaScript 來源」加上 https://opshell.github.io 才能登入。
const GOOGLE_CLIENT_ID = '851099261403-t654nu5furtr264jcsp3s4pvm54nntlo.apps.googleusercontent.com';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleIdApi {
    initialize: (config: Record<string, unknown>) => void
    renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
    prompt: () => void
    disableAutoSelect: () => void
}
declare global {
    interface Window { google?: { accounts: { id: GoogleIdApi } } }
}

export interface AdminProfile {
    email: string | null
    name: string | null
    picture: string | null
    /** 過期時間（毫秒）。不是 Google 的 JWT 時為 null */
    expiresAt: number | null
}

// 模組層級的狀態：整個後台共用一份。
// ID token 只放在記憶體裡，不存 localStorage——這個網站每一頁都會載入第三方腳本，存起來就多一個被讀走的地方。
const credential = ref<string | null>(null);
const profile = ref<AdminProfile | null>(null);
const expired = ref(false);
const loadError = ref('');
let scriptPromise: Promise<GoogleIdApi> | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

/** 解開 JWT 的 payload 拿 email 與過期時間，只是顯示用；真正的驗證在後端 */
function decodeProfile(token: string): AdminProfile {
    try {
        const binary = atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
        const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0))));
        return { email: json.email ?? null, name: json.name ?? null, picture: json.picture ?? null, expiresAt: json.exp ? json.exp * 1000 : null };
    } catch {
        return { email: null, name: null, picture: null, expiresAt: null };
    }
}

function loadGoogle(): Promise<GoogleIdApi> {
    if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
    scriptPromise ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = GIS_SRC;
        script.async = true;
        script.onload = () => window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google 登入元件載入失敗'));
        script.onerror = () => {
            scriptPromise = null;
            reject(new Error('Google 登入元件載入失敗，請檢查網路或擋廣告的外掛'));
        };
        document.head.append(script);
    });
    return scriptPromise;
}

function handleCredential(response: { credential?: string }) {
    if (!response.credential) return;
    credential.value = response.credential;
    profile.value = decodeProfile(response.credential);
    expired.value = false;

    // 過期前一分鐘先試著靜默換一張新的；換不到就顯示「重新登入」
    clearTimeout(expiryTimer);
    const expiresAt = profile.value.expiresAt;
    if (expiresAt) {
        expiryTimer = setTimeout(() => {
            expired.value = true;
            window.google?.accounts.id.prompt();
        }, Math.max(expiresAt - Date.now() - 60_000, 0));
    }
}

export function useGoogleAuth() {
    const isSignedIn = computed(() => !!credential.value);

    /** 初始化並嘗試自動登入（之前登入過就不用再按） */
    async function init() {
        try {
            const google = await loadGoogle();
            google.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredential,
                auto_select: true,
                cancel_on_tap_outside: true,
                use_fedcm_for_prompt: true
            });
            if (!credential.value) google.prompt();
        } catch (error) {
            loadError.value = (error as Error).message;
        }
    }

    /** 把 Google 的登入按鈕畫進指定的元素 */
    async function renderButton(el: HTMLElement) {
        try {
            const google = await loadGoogle();
            google.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'zh-TW' });
        } catch (error) {
            loadError.value = (error as Error).message;
        }
    }

    /** API 回 401 時呼叫：憑證不能用了，丟掉並請使用者重新登入 */
    function markExpired() {
        expired.value = true;
        credential.value = null;
        window.google?.accounts.id.prompt();
    }

    function signOut() {
        clearTimeout(expiryTimer);
        credential.value = null;
        profile.value = null;
        expired.value = false;
        window.google?.accounts.id.disableAutoSelect(); // 不然下次一打開又自動登入
    }

    return { credential, profile, expired, loadError, isSignedIn, init, renderButton, markExpired, signOut };
}
