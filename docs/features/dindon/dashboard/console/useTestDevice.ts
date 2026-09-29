import type { AdminDevice } from '../schemas/admin.schema';
import { ref, shallowRef } from 'vue';

// 測 App 的端點要一把裝置 API key：用後台建立的測試裝置（#0074），不進任何統計。
// 存 sessionStorage：重新整理還在、關掉分頁就沒了。不用 localStorage：後台和部落格同一個網域，
// 部落格頁面上的腳本讀得到 localStorage。key 只會送到叮咚後端，不會進任何倉庫。

const STORAGE_KEY = 'dd-admin-api-device-key';

interface Stored {
    key: string;
    /** 是哪一台測試裝置（自己貼的 key 不知道是哪台，null） */
    deviceId: number | null;
}

function read(): Stored {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY) ?? '';
        if (!raw) return { key: '', deviceId: null };
        // 舊版只存 key 字串
        if (!raw.startsWith('{')) return { key: raw, deviceId: null };
        const parsed = JSON.parse(raw) as Partial<Stored>;
        return { key: typeof parsed.key === 'string' ? parsed.key : '', deviceId: typeof parsed.deviceId === 'number' ? parsed.deviceId : null };
    } catch {
        return { key: '', deviceId: null };
    }
}

const deviceKey = ref('');
const deviceId = ref<number | null>(null);
/** 這個分頁找過的測試裝置清單（null＝還沒找）。建立或重發之後會更新 */
const testDevices = shallowRef<AdminDevice[] | null>(null);
let loaded = false;

export function useTestDevice() {
    if (!loaded && typeof window !== 'undefined') {
        const stored = read();
        deviceKey.value = stored.key;
        deviceId.value = stored.deviceId;
        loaded = true;
    }

    function setKey(value: string, id: number | null = null) {
        deviceKey.value = value.trim();
        deviceId.value = deviceKey.value ? id : null;
        try {
            if (deviceKey.value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ key: deviceKey.value, deviceId: deviceId.value }));
            else sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            // 存不了就只留在記憶體
        }
    }

    return { deviceKey, deviceId, testDevices, setKey };
}

/** 畫面上只露頭尾：ab12cd…9f3e */
export const maskKey = (key: string) => (key.length > 10 ? `${key.slice(0, 6)}…${key.slice(-4)}` : '••••');
