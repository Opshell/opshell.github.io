import type { AdminTerritory, BountyInput, CreateMemberInput, FeedbackReport, FeedbackStatus, FrontierBounty, FrontierProgress, FrontierSeason, ReviewFeedbackInput, TerritoryKind, TerritoryMember, TerritoryStatus, UpdateMemberInput, UpdateTerritoryInput } from './schemas/admin.schema';
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

/**
 * 空的＝沒有（beta 期間就驗過的）；有填要是版本號，規則同回報的「修在哪一版」。
 * label：領地說「馴服的版本」，成員說「緝拿於」（成員是一個一個抓到的）
 */
export function tamedInProblem(tamedIn: string, label = '馴服的版本'): string {
    const trimmed = tamedIn.trim();
    if (trimmed && !FIXED_IN_PATTERN.test(trimmed)) return `${label}：英數開頭，只能有英數、點、加號、減號，最多 20 字`;
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
    // 有成員時狀態跟著成員走，給了不一樣的是 409（#839）；成員一改，表單裡的舊值就跟現在對不上，所以乾脆不送
    if (!current.members.length && draft.status !== current.status) patch.status = draft.status;
    if (tamedIn !== current.tamedIn) patch.tamedIn = tamedIn;
    if (note !== current.note) patch.note = note;
    if (draft.sortOrder.trim() && sortOrder !== current.sortOrder) patch.sortOrder = sortOrder;
    return patch;
}

/**
 * 上移／下移一格：跟鄰居交換 sort_order（後端照 sort_order、id 排）。回要送的 PATCH，最多兩筆。
 * 兩塊的 sort_order 一樣時交換沒有用，只把移動的那塊設成鄰居的前一號／後一號。
 * 領地與同一塊裡的成員（#840）排法一樣，都用這支
 */
export function moveItem(list: readonly { id: number; sortOrder: number }[], id: number, direction: -1 | 1): { id: number; sortOrder: number }[] {
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

// #region [P] 成員（29.2「成員」、29.4，#839、#840）：一家是一個團伙，每種通知一個成員

/** 成員用「緝拿」：團伙的成員是一個一個抓到的；領地整塊才說「馴服」 */
export const MEMBER_STATUS_LABELS: Record<TerritoryStatus, string> = { tamed: '已緝拿', wanted: '通緝中' };
export const MEMBER_NAME_MAX = 20;
/** 後端 memberCodePattern：code 建了不能改（App 拿它挑圖示），只收穩定、好當檔名的字元 */
export const MEMBER_CODE_PATTERN = /^[a-z0-9_]{1,30}$/;

/** 29.2 的建議值；後台也可以自訂別的，App 不認得的用通用圖示 */
export const SUGGESTED_MEMBERS: readonly { code: string; name: string }[] = [
    { code: 'transfer', name: '轉帳' },
    { code: 'income', name: '入帳' },
    { code: 'credit_card', name: '信用卡' },
    { code: 'top_up', name: '儲值' },
    { code: 'auto_debit', name: '自動扣款' },
    { code: 'payment', name: '付款' }
];

/** 這塊還沒用到的建議值：同一塊領地 code 不能重複（409） */
export const unusedSuggestions = (members: readonly Pick<TerritoryMember, 'code'>[]) =>
    SUGGESTED_MEMBERS.filter(s => !members.some(m => m.code === s.code));

export function memberCodeProblem(code: string, members: readonly Pick<TerritoryMember, 'code'>[] = []): string {
    const trimmed = code.trim();
    if (!trimmed) return '代號不能空白';
    if (!MEMBER_CODE_PATTERN.test(trimmed)) return '代號只能是 1～30 個小寫英數或底線，例如 credit_card';
    if (members.some(m => m.code === trimmed)) return `這塊已經有代號 ${trimmed} 的成員`;
    return '';
}

export function memberNameProblem(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return '名稱不能空白';
    if (runes(trimmed) > MEMBER_NAME_MAX) return `名稱最多 ${MEMBER_NAME_MAX} 字`;
    if (BAD_CHARS.test(trimmed)) return '名稱不能換行，也不能有看不見的字元';
    return '';
}

/**
 * 一列成員的草稿。code 只有新增時能填。排序不在草稿裡：一律用上下移（moveItem），
 * 新增的不給 sort_order，後端排這塊的最後
 */
export interface MemberDraft {
    code: string;
    name: string;
    status: TerritoryStatus;
    tamedIn: string;
}

export const emptyMemberDraft = (): MemberDraft => ({ code: '', name: '', status: 'wanted', tamedIn: '' });

export const memberDraftOf = (member: TerritoryMember): MemberDraft => ({
    code: member.code,
    name: member.name,
    status: member.status,
    tamedIn: member.tamedIn ?? ''
});

/** siblings：新增時檢查同一塊的 code 重複；修改時給 null，不檢查 code（不能改） */
export function memberFormError(draft: MemberDraft, siblings: readonly Pick<TerritoryMember, 'code'>[] | null): string {
    return (siblings ? memberCodeProblem(draft.code, siblings) : '')
        || memberNameProblem(draft.name)
        || tamedInProblem(draft.tamedIn, '緝拿於');
}

/** 新增的 body：版本留空不送（＝沒有） */
export function memberCreateBody(draft: MemberDraft): CreateMemberInput {
    const tamedIn = draft.tamedIn.trim();
    return {
        code: draft.code.trim(),
        name: draft.name.trim(),
        status: draft.status,
        ...(tamedIn ? { tamedIn } : {})
    };
}

/** 只送變了的欄位（後端的操作紀錄記前後）；版本清空送 null */
export function memberPatch(current: TerritoryMember, draft: MemberDraft): UpdateMemberInput {
    const patch: UpdateMemberInput = {};
    const name = draft.name.trim();
    const tamedIn = draft.tamedIn.trim() || null;
    if (name !== current.name) patch.name = name;
    if (draft.status !== current.status) patch.status = draft.status;
    if (tamedIn !== current.tamedIn) patch.tamedIn = tamedIn;
    return patch;
}

/**
 * 29.4「補成員的順序」：已馴服的領地，不管有沒有成員，加進一個通緝中的成員整塊就會翻回通緝中
 * （有成員時要全部已緝拿才算已馴服）。照 note 補時要先補已緝拿的，所以按下去之前提醒；
 * 不擋：真的缺那一種就是要翻回去
 */
export const flipsBackToWanted = (territory: Pick<AdminTerritory, 'status'>, draft: Pick<MemberDraft, 'status'>) =>
    territory.status === 'tamed' && draft.status === 'wanted';

/**
 * 刪掉一個成員之後的那一塊。DELETE 是 204 沒有內容，照後端 syncTerritoryStatus 的規則在前端算：
 * 剩下的全部已緝拿才是已馴服，否則通緝中；刪到一個不剩時保留原本的值（29.4）
 */
export function withoutMember<T extends Pick<AdminTerritory, 'status' | 'members'>>(territory: T, memberId: number): T {
    const members = territory.members.filter(m => m.id !== memberId);
    if (!members.length) return { ...territory, members };
    return { ...territory, members, status: members.every(m => m.status === 'tamed') ? 'tamed' : 'wanted' };
}

/** 列表上一塊的成員進度，「2/3」；沒有成員是空字串 */
export function memberTally(territory: Pick<AdminTerritory, 'members'>): string {
    if (!territory.members.length) return '';
    return `${territory.members.filter(m => m.status === 'tamed').length}/${territory.members.length}`;
}

/**
 * 照後端的規則（29.2 progress）在前端重算全體進度：改成員只回那一塊，不用為了頂端的數字重抓 44 塊。
 * 每個成員算一個，沒有成員的領地用它自己的 status 算一個
 */
export function frontierProgress(list: readonly Pick<AdminTerritory, 'status' | 'members'>[]): FrontierProgress {
    let membersTamed = 0;
    let membersTotal = 0;
    for (const territory of list) {
        if (territory.members.length) {
            membersTotal += territory.members.length;
            membersTamed += territory.members.filter(m => m.status === 'tamed').length;
        } else {
            membersTotal += 1;
            if (territory.status === 'tamed') membersTamed += 1;
        }
    }
    return { tamed: list.filter(t => t.status === 'tamed').length, total: list.length, membersTamed, membersTotal };
}

/** 頂端進度條的比例照成員算（App 的「劃掉幾個成員」也是用這兩個） */
export const progressPercent = (progress: FrontierProgress) =>
    (progress.membersTotal ? Math.round(progress.membersTamed / progress.membersTotal * 100) : 0);

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

// #region [P] 懸賞對象（29.3、29.5、第 8 節，Flowsker #855、#871）

/**
 * 2026-11-24 起署名照回報送出時間最早的那位重算（29.3），已經有開拓者的領地照樣能設懸賞：清單列全部，
 * 選項上寫出現在的開拓者，管理員知道這則不一定會換掉他
 */
export function territoryOptionLabel(territory: AdminTerritory): string {
    const pioneer = territory.pioneer ? `，開拓者：${territory.pioneer}` : '';
    return `${territory.name}（${STATUS_LABELS[territory.status]}${pioneer}）`;
}

/** 懸賞對象的選擇。空字串＝沒選：領地沒選是不設懸賞，成員沒選是不記哪種通知 */
export interface BountyTarget {
    territoryId: string;
    memberId: string;
}

/** 表單的初值：已經有懸賞的照現在的對象 */
export const targetOf = (bounty: FrontierBounty | null): BountyTarget => ({
    territoryId: bounty?.territoryId ? String(bounty.territoryId) : '',
    memberId: bounty?.memberId ? String(bounty.memberId) : ''
});

export const isAccepted = (status: FeedbackStatus) => status === 'accepted_bug' || status === 'accepted_suggestion';

/** 選了的領地底下的成員；沒選或那塊沒有成員是 [] */
export const membersOf = (list: readonly AdminTerritory[], territoryId: string): TerritoryMember[] =>
    list.find(t => String(t.id) === territoryId)?.members ?? [];

/** 成員要屬於選的那塊（後端回 400）；換領地時畫面會清掉成員，這裡防清單重抓後對不上 */
export function targetError(target: BountyTarget, list: readonly AdminTerritory[]): string {
    if (!target.memberId) return '';
    if (!target.territoryId) return '要先選領地才能選成員';
    if (!membersOf(list, target.territoryId).some(m => String(m.id) === target.memberId)) return '這個成員不屬於選的領地，請重選';
    return '';
}

/** 送出的領地與成員：成員一律明給（null＝不記），不靠後端「不帶就沿用」——畫面上看到什麼就存什麼 */
function targetFields(target: BountyTarget): { territoryId: number; memberId: number | null } | Record<string, never> {
    if (!target.territoryId) return {};
    return { territoryId: Number(target.territoryId), memberId: target.memberId ? Number(target.memberId) : null };
}

/**
 * 審核（第 8 節 PATCH）按某個狀態時送的 body：採計的才帶領地，一次採計成懸賞。
 * 後端會擋的組合在這裡就不組：明給待審／不採計又帶領地是 409，只給成員不給領地是 400
 */
export function reviewBody(status: FeedbackStatus, target: BountyTarget): ReviewFeedbackInput {
    if (!isAccepted(status)) return { status };
    return { status, ...targetFields(target) };
}

/** 取消懸賞（第 8 節 territory_id: null）：任何狀態都能給，不帶成員 */
export const cancelBountyBody = (): ReviewFeedbackInput => ({ territoryId: null });

// #endregion

// #region [P] 賞金卡：改懸賞對象、補發天數（29.5）

export interface BountyDraft extends BountyTarget {
    /** 2026-11-20 起預設 0：採計的獎勵是金幣（30.1，後端自動算），天數只留給特例（Flowsker #791） */
    days: string;
    title: string;
}

/** 回報能不能按：判成不採計的直接講原因（後端也會 409）。已經發過的 2026-11-24 起可以重按（改對象、補天數） */
export function bountyBlocked(report: Pick<FeedbackReport, 'status'>): string {
    if (report.status === 'rejected') return '這則判成不採計，不能設懸賞；要設先改判';
    return '';
}

/** 天數發過了沒：一則只發一次，再給 days 是 409 */
export const daysPaid = (bounty: FrontierBounty | null) => !!bounty && bounty.days > 0;

/** 已經有懸賞、表單跟現在一樣：按鈕擋著就好，不用紅字 */
export const BOUNTY_UNCHANGED = '跟現在的懸賞一樣，沒有要改的';

const sameTarget = (draft: BountyTarget, bounty: FrontierBounty) =>
    draft.territoryId === (bounty.territoryId ? String(bounty.territoryId) : '')
    && draft.memberId === (bounty.memberId ? String(bounty.memberId) : '');

/** unbound：沒綁 App 的回報者（device_id 0），沒有裝置可以掛權益，只能署名。bounty：這則現在的賞金紀錄 */
export function bountyError(draft: BountyDraft, unbound: boolean, bounty: FrontierBounty | null = null): string {
    const daysText = draft.days.trim();
    if (!/^\d+$/.test(daysText)) return `天數要是 0～${BOUNTY_DAYS_MAX} 的整數`;
    const days = Number(daysText);
    if (days > BOUNTY_DAYS_MAX) return `天數最多 ${BOUNTY_DAYS_MAX} 天`;
    if (days > 0 && daysPaid(bounty)) return '天數已經發過了（一則只發一次）';
    if (unbound && days > 0) return '沒綁 App 的回報者發不了天數：天數填 0，只署名';
    if (days === 0 && !draft.territoryId) return bounty ? '選要改成哪塊領地，或補發天數' : '選一塊領地署名；特例要另外發天數才可以不選';
    if (days === 0 && bounty && sameTarget(draft, bounty)) return BOUNTY_UNCHANGED;
    const title = draft.title.trim();
    if (runes(title) > BOUNTY_TITLE_MAX) return `名稱最多 ${BOUNTY_TITLE_MAX} 字`;
    if (BAD_CHARS.test(title)) return '名稱不能換行，也不能有看不見的字元';
    return '';
}

/** 沒填名稱時後端用的預設，表單的 placeholder 照它寫 */
export const defaultBountyTitle = (territoryName: string | null) => (territoryName ? `拓荒季賞金：${territoryName}` : '拓荒季賞金');

/**
 * 送出的 body：選填的空值不送（空的 title 後端回 400）；0 天不送 days（後端預設 0），沒有權益，名稱也不送。
 * 成員只跟著領地送（只給成員是 400）
 */
export function bountyBody(draft: BountyDraft): BountyInput {
    const days = Number(draft.days.trim());
    const title = draft.title.trim();
    return {
        ...(days > 0 ? { days } : {}),
        ...targetFields(draft),
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
