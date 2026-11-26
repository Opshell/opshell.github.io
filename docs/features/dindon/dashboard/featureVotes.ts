import type { FeatureCandidate, FeatureCandidateStatus, FeatureEvent, SaveFeatureCandidateInput } from './schemas/admin.schema';

// 新功能投票候選的純邏輯（api.md 第 8 節「新功能投票的候選」、第 19 節「分活動」，Flowsker #849、#850）。畫面在 components/FeatureVotePanel.vue。

export const EVENT_LABELS: Record<FeatureEvent, string> = { beta: 'Beta 活動', frontier: '拓荒季' };
export const EVENTS = Object.keys(EVENT_LABELS) as FeatureEvent[];

export type FeatureEventFilter = FeatureEvent | 'all';

/** 後台一次拿全部活動（不帶 ?event=），在這裡篩：保留後端排好的順序，也才算得出每個活動各有幾個 */
export function filterByEvent(features: FeatureCandidate[], filter: FeatureEventFilter) {
    return filter === 'all' ? features : features.filter(feature => feature.event === filter);
}

export function countByEvent(features: FeatureCandidate[]) {
    const counts: Record<FeatureEvent, number> = { beta: 0, frontier: 0 };
    for (const feature of features) counts[feature.event]++;
    return counts;
}

/** 新增時預設的活動：正在看哪個活動就建在哪個；看全部時用拓荒季。
 *  後端沒帶 event 會當 beta（為了舊版 App），但 beta 11-20 已結束，現在要開的多半是拓荒季的，所以一律明寫 */
export const defaultEventFor = (filter: FeatureEventFilter): FeatureEvent => filter === 'all' ? 'frontier' : filter;

export interface FeatureForm {
    title: string;
    description: string;
    status: FeatureCandidateStatus;
    event: FeatureEvent;
}

/** 新增送全部欄位（event 一定明寫）；修改只送真的變了的（後端的操作紀錄也只記變了的） */
export function buildFeaturePatch(form: FeatureForm, current?: FeatureCandidate): SaveFeatureCandidateInput {
    if (!current) return { title: form.title, description: form.description, status: form.status, event: form.event };
    const changes: SaveFeatureCandidateInput = {};
    if (form.title.trim() !== current.title) changes.title = form.title;
    if (form.description.trim() !== current.description) changes.description = form.description;
    if (form.status !== current.status) changes.status = form.status;
    if (form.event !== current.event) changes.event = form.event;
    return changes;
}
