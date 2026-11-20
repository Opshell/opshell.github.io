import type { AdminTerritory, FeedbackReport, FrontierSeason, TerritoryKind, TerritoryStatus, UpdateTerritoryInput } from './schemas/admin.schema';
import { FIXED_IN_PATTERN } from './schemas/admin.schema';

// 拓荒季的純邏輯（api.md 第 29 節，Flowsker #705、#706）。畫面在 components/FrontierPanel.vue 與 FrontierBounty.vue。
// 欄位規則照後端 controllers/frontier_controller.go：先在前端講清楚，後端才是真正的把關。

export const KIND_LABELS: Record<TerritoryKind, string> = { bank: '銀行', payment: '支付', telecom: '電信' };
export const KINDS = Object.keys(KIND_LABELS) as TerritoryKind[];
export const STATUS_LABELS: Record<TerritoryStatus, string> = { tamed: '已馴服', wanted: '通緝中' };
export const STATUSES = Object.keys(STATUS_LABELS) as TerritoryStatus[];

export const TERRITORY_NAME_MAX = 30;
export const TERRITORY_NOTE_MAX = 100;
export const BOUNTY_TITLE_MAX = 40;
/** 權益天數的上限（api.md 29.5：0～366） */
export const BOUNTY_DAYS_MAX = 366;

/** 後端照字元數算（Go 的 rune），emoji 算一個字 */
const runes = (value: string) => [...value].length;
/** 後端擋 unicode.IsControl（Cc，含換行）與 Cf（零寬字元、文字方向覆寫）：名字會給所有使用者看 */
const BAD_CHARS = /[\p{Cc}\p{Cf}]/u;

// #region [P] 領地的欄位（29.4）

export function territoryNameProblem(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return '名稱不能空白';
    if (runes(trimmed) > TERRITORY_NAME_MAX) return `名稱最多 ${TERRITORY_NAME_MAX} 字`;
    if (BAD_CHARS.test(trimmed)) return '名稱不能換行，也不能有看不見的字元';
    return '';
}

export function territoryNoteProblem(note: string): string {
    const trimmed = note.trim();
    if (runes(trimmed) > TERRITORY_NOTE_MAX) return `備註最多 ${TERRITORY_NOTE_MAX} 字`;
    if (BAD_CHARS.test(trimmed)) return '備註不能換行，也不能有看不見的字元';
    return '';
}

/** 空的＝沒有（beta 期間就驗過的）；有填要是版本號，規則同回報的「修在哪一版」 */
export function tamedInProblem(tamedIn: string): string {
    const trimmed = tamedIn.trim();
    if (trimmed && !FIXED_IN_PATTERN.test(trimmed)) return '馴服的版本：英數開頭，只能有英數、點、加號、減號，最多 20 字';
    return '';
}

export interface TerritoryDraft {
    name: string;
    kind: TerritoryKind;
    status: TerritoryStatus;
    tamedIn: string;
    note: string;
    /** 新增時留空＝排最後（後端算） */
    sortOrder: string;
}

export function sortOrderProblem(sortOrder: string, required: boolean): string {
    const trimmed = sortOrder.trim();
    if (!trimmed) return required ? '排序不能空白' : '';
    if (!/^-?\d+$/.test(trimmed) || !Number.isSafeInteger(Number(trimmed))) return '排序要是整數';
    return '';
}

/** isNew：新增時排序可以留空 */
export function territoryFormError(draft: TerritoryDraft, isNew: boolean): string {
    return territoryNameProblem(draft.name)
        || territoryNoteProblem(draft.note)
        || tamedInProblem(draft.tamedIn)
        || sortOrderProblem(draft.sortOrder, !isNew);
}

export const emptyDraft = (): TerritoryDraft => ({ name: '', kind: 'bank', status: 'wanted', tamedIn: '', note: '', sortOrder: '' });

export const draftOf = (territory: AdminTerritory): TerritoryDraft => ({
    name: territory.name,
    kind: territory.kind,
    status: territory.status,
    tamedIn: territory.tamedIn ?? '',
    note: territory.note,
    sortOrder: String(territory.sortOrder)
});

/** 只送真的變了的欄位（後端的操作紀錄記前後）。開拓者另外改，不在這裡 */
export function territoryPatch(current: AdminTerritory, draft: TerritoryDraft): UpdateTerritoryInput {
    const patch: UpdateTerritoryInput = {};
    const name = draft.name.trim();
    const note = draft.note.trim();
    const tamedIn = draft.tamedIn.trim() || null;
    const sortOrder = Number(draft.sortOrder.trim());
    if (name !== current.name) patch.name = name;
    if (draft.kind !== current.kind) patch.kind = draft.kind;
    if (draft.status !== current.status) patch.status = draft.status;
    if (tamedIn !== current.tamedIn) patch.tamedIn = tamedIn;
    if (note !== current.note) patch.note = note;
    if (draft.sortOrder.trim() && sortOrder !== current.sortOrder) patch.sortOrder = sortOrder;
    return patch;
}

/**
 * 上移／下移一格：跟鄰居交換 sort_order（後端照 sort_order、id 排）。回要送的 PATCH，最多兩筆。
 * 兩塊的 sort_order 一樣時交換沒有用，只把移動的那塊設成鄰居的前一號／後一號
 */
export function moveTerritory(list: readonly AdminTerritory[], id: number, direction: -1 | 1): { id: number; sortOrder: number }[] {
    const index = list.findIndex(t => t.id === id);
    const neighbor = list[index + direction];
    if (index === -1 || !neighbor) return [];
    const self = list[index];
    if (self.sortOrder === neighbor.sortOrder) return [{ id: self.id, sortOrder: neighbor.sortOrder + direction }];
    return [{ id: self.id, sortOrder: neighbor.sortOrder }, { id: neighbor.id, sortOrder: self.sortOrder }];
}

/** 開拓者是怎麼來的，列表上一句話講清楚 */
export function pioneerOrigin(territory: AdminTerritory): string {
    if (!territory.pioneer) return '';
    if (territory.pioneerFeedbackId) return `回報 #${territory.pioneerFeedbackId}`;
    if (territory.pioneerDeviceId) return `裝置 #${territory.pioneerDeviceId}`;
    return '手動';
}

// #endregion

// #region [P] 季（29.1）

const DAY_MS = 86_400_000;
/** 2026-12-01 → 12/1 */
const shortDate = (date: string) => date.slice(5).split('-').map(Number).join('/');

/** 領地頁頂端那一行。now 給測試用 */
export function seasonLine(season: FrontierSeason | null, now = Date.now()): string {
    if (!season) return '拓荒季還沒定：OFFICIAL_LAUNCH_DATE（或 FRONTIER_SEASON_START）還沒設，App 不會顯示季';
    const range = `${shortDate(season.startsOn)}～${shortDate(season.endsOn)}（${season.days} 天）`;
    // 伺服器回的 state 是回應當下的；頁面開著跨日的話自己用 starts_at／ends_at 比（29.1）
    const startsAt = Date.parse(season.startsAt);
    const endsAt = Date.parse(season.endsAt);
    if (now < startsAt) return `拓荒季 ${range}，還沒開始（還有 ${Math.ceil((startsAt - now) / DAY_MS)} 天）`;
    if (now >= endsAt) return `拓荒季 ${range}，已經結束`;
    const day = Math.floor((now - startsAt) / DAY_MS) + 1;
    return `拓荒季 ${range}，進行中：第 ${day} 天，剩 ${season.days - day} 天`;
}

// #endregion

// #region [P] 發賞金（29.5）

/** 能署名的領地：還沒有開拓者的才會設成這個回報者（已經有人的選了也只會發天數，不換人） */
export const openTerritories = (list: readonly AdminTerritory[]) => list.filter(t => !t.pioneer);

export interface BountyDraft {
    /** 2026-11-20 起預設 0：採計的獎勵是金幣（30.1，後端自動算），天數只留給特例（Flowsker #791） */
    days: string;
    /** 空字串＝不署名 */
    territoryId: string;
    title: string;
}

/** 回報能不能發：已經發過、判成不採計的直接講原因（後端也會 409） */
export function bountyBlocked(report: Pick<FeedbackReport, 'bounty' | 'status' | 'contentPurgedAt'>): string {
    if (report.bounty) return '這則已經發過賞金（一則只能發一次）';
    if (report.status === 'rejected') return '這則判成不採計，不能發賞金；要發先改判';
    return '';
}

/** unbound：沒綁 App 的回報者（device_id 0），沒有裝置可以掛權益，只能署名 */
export function bountyError(draft: BountyDraft, unbound: boolean): string {
    const daysText = draft.days.trim();
    if (!/^\d+$/.test(daysText)) return `天數要是 0～${BOUNTY_DAYS_MAX} 的整數`;
    const days = Number(daysText);
    if (days > BOUNTY_DAYS_MAX) return `天數最多 ${BOUNTY_DAYS_MAX} 天`;
    if (unbound && days > 0) return '沒綁 App 的回報者發不了天數：天數填 0，只署名';
    if (days === 0 && !draft.territoryId) return '選一塊領地署名；特例要另外發天數才可以不選';
    const title = draft.title.trim();
    if (runes(title) > BOUNTY_TITLE_MAX) return `名稱最多 ${BOUNTY_TITLE_MAX} 字`;
    if (BAD_CHARS.test(title)) return '名稱不能換行，也不能有看不見的字元';
    return '';
}

/** 沒填名稱時後端用的預設，表單的 placeholder 照它寫 */
export const defaultBountyTitle = (territoryName: string | null) => (territoryName ? `拓荒季賞金：${territoryName}` : '拓荒季賞金');

/** 送出的 body：選填的空值不送（空的 title 後端回 400）；0 天不送 days（後端預設 0），沒有權益，名稱也不送 */
export function bountyBody(draft: BountyDraft): { days?: number; territoryId?: number; title?: string } {
    const days = Number(draft.days.trim());
    const title = draft.title.trim();
    return {
        ...(days > 0 ? { days } : {}),
        ...(draft.territoryId ? { territoryId: Number(draft.territoryId) } : {}),
        ...(title && days > 0 ? { title } : {})
    };
}

// #endregion

// #region [P] 漏抓的通知（29.6）

export const MISSED_NOTIFICATION = 'missed_notification';
const MISSED_MARK = '【漏抓的通知】';

/**
 * 後端在 App 送出時看描述的標記存成 topic（描述本身不動）。topic 欄位上線前送的只有標記、topic 是 null，
 * 後端的 ?topic= 篩不到它們，至少列表上標得出來
 */
export const isMissedNotification = (report: Pick<FeedbackReport, 'topic' | 'description'>) =>
    report.topic === MISSED_NOTIFICATION || report.description.trimStart().startsWith(MISSED_MARK);

// #endregion
