import type { DeviceStatus, FeedbackFilter } from './api';
import { ref, shallowRef } from 'vue';

// 後台分頁之間的跳轉：總覽點「已凍結」要直接看到凍結的裝置，不只是切到裝置頁。
// 跳之前把篩選放在這裡，目標分頁建立時取走（取一次就清掉，之後自己點分頁不會再套用）。

export type DashboardTab = 'overview' | 'devices' | 'feedback' | 'usage' | 'watch' | 'promo' | 'features' | 'api';

export interface PanelPreset {
    deviceStatus?: DeviceStatus;
    /** 終端機的 dev <字>：一進裝置頁就搜這個 */
    deviceQuery?: string;
    feedbackStatus?: FeedbackFilter;
    /** 終端機的 triage：一進回報頁就開快速審核 */
    feedbackTriage?: boolean;
    /** 終端機的 api <字>：一進 API 控制台就搜這個 */
    apiQuery?: string;
}

const preset = shallowRef<PanelPreset>({});

export function setPanelPreset(next: PanelPreset = {}) {
    preset.value = next;
}

export function takePanelPreset<K extends keyof PanelPreset>(key: K): PanelPreset[K] {
    const value = preset.value[key];
    preset.value = { ...preset.value, [key]: undefined };
    return value;
}

/**
 * 快速審核開著時，1、2、3 是它的判定鍵：後台的全域快捷鍵（1～8 切分頁）要讓開。
 * 審核元件掛上時設 true、拿掉時設 false
 */
export const shortcutsPaused = ref(false);
