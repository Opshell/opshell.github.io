import type { DeviceStatus, FeedbackFilter } from './api';
import { shallowRef } from 'vue';

// 後台分頁之間的跳轉：總覽點「已凍結」要直接看到凍結的裝置，不只是切到裝置頁。
// 跳之前把篩選放在這裡，目標分頁建立時取走（取一次就清掉，之後自己點分頁不會再套用）。

export type DashboardTab = 'overview' | 'devices' | 'feedback' | 'usage' | 'watch' | 'promo' | 'features' | 'api';

export interface PanelPreset {
    deviceStatus?: DeviceStatus;
    feedbackStatus?: FeedbackFilter;
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
