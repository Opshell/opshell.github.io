import { ref } from 'vue';

// 測 App 的端點要一把裝置 API key（#0074 請後端做「不計入統計的測試裝置」）。
// 存 sessionStorage：重新整理還在、關掉分頁就沒了。不用 localStorage：後台和部落格同一個網域，
// 部落格頁面上的腳本讀得到 localStorage。key 只會送到叮咚後端，不會進任何倉庫。

const STORAGE_KEY = 'dd-admin-api-device-key';

function read(): string {
    try {
        return sessionStorage.getItem(STORAGE_KEY) ?? '';
    } catch {
        return '';
    }
}

const deviceKey = ref('');
let loaded = false;

export function useTestDevice() {
    if (!loaded && typeof window !== 'undefined') {
        deviceKey.value = read();
        loaded = true;
    }

    function setKey(value: string) {
        deviceKey.value = value.trim();
        try {
            if (deviceKey.value) sessionStorage.setItem(STORAGE_KEY, deviceKey.value);
            else sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            // 存不了就只留在記憶體
        }
    }

    return { deviceKey, setKey };
}

/** 畫面上只露頭尾：dd_live_ab…9f */
export const maskKey = (key: string) => (key.length > 10 ? `${key.slice(0, 6)}…${key.slice(-4)}` : '••••');
