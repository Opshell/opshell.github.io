<script setup lang="ts">
    import type { MemberDraft } from '../frontier';
    import type { AdminTerritory, TerritoryMember } from '../schemas/admin.schema';
    import { computed, reactive, ref, watch } from 'vue';
    import { adminApi } from '../api';
    import { emptyMemberDraft, flipsBackToWanted, MEMBER_NAME_MAX, MEMBER_STATUS_LABELS, memberCreateBody, memberDraftOf, memberFormError, memberPatch, moveItem, STATUSES, unusedSuggestions, withoutMember } from '../frontier';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 一塊領地的成員（api.md 29.4，Flowsker #840）：一家是一個團伙，每種通知一個成員，各自通緝中／已緝拿。
    // 每一列各自存（一次 PATCH），錯誤也顯示在那一列：一次改好幾列時才看得出是哪一列被後端擋。
    // 成功時後端回整塊領地（status 重算過），交給外層直接換掉那一塊。
    interface Props {
        territory: AdminTerritory;
        /** 調順序第二筆失敗時，畫面跟後端可能對不上，請外層重抓。用函式不用 emit：要等它抓完才放掉 busy */
        reload: () => Promise<void>;
    }
    const props = defineProps<Props>();
    const emit = defineEmits<{
        /** 後端回的那一塊（含 members、重算過的 status） */
        update: [territory: AdminTerritory];
    }>();
    /** 跟外層共用：送出中整個表單都停用，免得領地與成員同時送 */
    const busy = defineModel<boolean>('busy', { required: true });

    const call = useAdminCall();
    const members = computed(() => props.territory.members);

    // #region [P] 每一列的草稿與訊息
    const drafts = reactive<Record<number, MemberDraft>>({});
    const rowErrors = reactive<Record<number, string>>({});
    /** 正在確認刪除的那一列 */
    const confirming = ref<number | null>(null);
    const notice = ref('');

    /** 換領地或後端回新的一塊時：新的列補草稿、不見的列丟掉；還沒存的編輯留著 */
    function syncDrafts(list: readonly TerritoryMember[], reset: number | null = null) {
        const ids = new Set(list.map(m => m.id));
        for (const key of Object.keys(drafts)) {
            if (!ids.has(Number(key))) {
                delete drafts[Number(key)];
                delete rowErrors[Number(key)];
            }
        }
        for (const member of list) {
            if (!drafts[member.id] || member.id === reset) drafts[member.id] = memberDraftOf(member);
        }
    }

    watch(() => props.territory.id, () => {
        for (const key of Object.keys(drafts)) delete drafts[Number(key)];
        for (const key of Object.keys(rowErrors)) delete rowErrors[Number(key)];
        confirming.value = null;
        notice.value = '';
        Object.assign(newDraft, emptyMemberDraft());
        newError.value = '';
    });
    watch(members, list => syncDrafts(list), { immediate: true });

    const rowPatch = (member: TerritoryMember) => (drafts[member.id] ? memberPatch(member, drafts[member.id]) : {});
    const rowChanged = (member: TerritoryMember) => Object.keys(rowPatch(member)).length > 0;
    const rowProblem = (member: TerritoryMember) => (drafts[member.id] ? memberFormError(drafts[member.id], null) : '');

    function applied(territory: AdminTerritory, savedId: number | null, message: string) {
        emit('update', territory);
        syncDrafts(territory.members, savedId);
        notice.value = message;
    }
    // #endregion

    // #region [P] 改一列（名稱、狀態、緝拿於）
    async function save(member: TerritoryMember) {
        const patch = rowPatch(member);
        if (busy.value || !Object.keys(patch).length || rowProblem(member)) return;
        busy.value = true;
        rowErrors[member.id] = '';
        notice.value = '';
        try {
            const saved = await call(token => adminApi.updateMember(token, props.territory.id, member.id, patch));
            applied(saved.territory, member.id, `已儲存「${saved.member.name}」，領地現在是${saved.territory.status === 'tamed' ? '已馴服' : '通緝中'}`);
        } catch (e) {
            rowErrors[member.id] = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }

    const revert = (member: TerritoryMember) => {
        drafts[member.id] = memberDraftOf(member);
        rowErrors[member.id] = '';
    };
    // #endregion

    // #region [P] 刪一列：按兩次確認；有賞金紀錄指著的後端回 409，訊息照顯示
    async function remove(member: TerritoryMember) {
        if (busy.value) return;
        busy.value = true;
        rowErrors[member.id] = '';
        notice.value = '';
        try {
            await call(token => adminApi.deleteMember(token, props.territory.id, member.id));
            // DELETE 是 204 沒有內容：領地的 status 照後端同一套規則在前端算（withoutMember），
            // 不用重抓；重抓的話回來之前改別列，會被舊的回應蓋掉
            emit('update', withoutMember(props.territory, member.id));
            notice.value = `已刪除「${member.name}」`;
        } catch (e) {
            rowErrors[member.id] = errorMessage(e);
        } finally {
            busy.value = false;
            confirming.value = null;
        }
    }
    // #endregion

    // #region [P] 調順序：跟領地清單一樣，跟鄰居交換 sort_order
    async function move(member: TerritoryMember, direction: -1 | 1) {
        const changes = moveItem(members.value, member.id, direction);
        if (!changes.length || busy.value) return;
        busy.value = true;
        rowErrors[member.id] = '';
        notice.value = '';
        try {
            let last: AdminTerritory | null = null;
            for (const change of changes) {
                last = (await call(token => adminApi.updateMember(token, props.territory.id, change.id, { sortOrder: change.sortOrder }))).territory;
            }
            if (last) applied(last, null, '');
        } catch (e) {
            rowErrors[member.id] = errorMessage(e);
            // 第二筆失敗的話第一筆已經改了：重抓，畫面照後端現在的順序。
            // 等重抓完才放掉 busy，不然這段時間改別列，會被重抓回來的舊資料蓋掉
            await props.reload();
        } finally {
            busy.value = false;
        }
    }
    // #endregion

    // #region [P] 新增一列
    const newDraft = reactive<MemberDraft>(emptyMemberDraft());
    const newError = ref('');
    const suggestions = computed(() => unusedSuggestions(members.value));
    const newProblem = computed(() => memberFormError(newDraft, members.value));
    const newTouched = computed(() => !!(newDraft.code.trim() || newDraft.name.trim()));
    const flipWarning = computed(() => flipsBackToWanted(props.territory, newDraft));

    function pick(suggestion: { code: string; name: string }) {
        newDraft.code = suggestion.code;
        newDraft.name = suggestion.name;
        newError.value = '';
    }

    async function create() {
        if (busy.value || newProblem.value) return;
        busy.value = true;
        newError.value = '';
        notice.value = '';
        try {
            const saved = await call(token => adminApi.createMember(token, props.territory.id, memberCreateBody(newDraft)));
            Object.assign(newDraft, emptyMemberDraft());
            applied(saved.territory, saved.member.id, `已新增「${saved.member.name}」，領地現在是${saved.territory.status === 'tamed' ? '已馴服' : '通緝中'}`);
        } catch (e) {
            // 同一塊 code 重複是 409，後端的中文訊息直接顯示
            newError.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }
    // #endregion
</script>

<template>
    <section class="dd-frontier-members" aria-label="成員">
        <h4>成員 <span class="dd-frontier-members__muted">每種通知一個；有成員時，領地的狀態跟著成員走（全部已緝拿才是已馴服）</span></h4>
        <p v-if="notice" class="dd-frontier-members__notice" role="status">✓ {{ notice }}</p>

        <ul v-if="members.length" class="dd-frontier-members__list">
            <li
                v-for="(member, index) in members"
                :key="member.id"
                class="dd-frontier-members__row"
                :class="{ 'is-changed': rowChanged(member) }"
            >
                <div class="dd-frontier-members__line">
                    <span class="dd-frontier-members__order">
                        <button
                            type="button"
                            class="dd-frontier-members__move"
                            :disabled="busy || index === 0"
                            :aria-label="`${member.name} 往前移`"
                            @click="move(member, -1)"
                        >
                            ↑
                        </button>
                        <button
                            type="button"
                            class="dd-frontier-members__move"
                            :disabled="busy || index === members.length - 1"
                            :aria-label="`${member.name} 往後移`"
                            @click="move(member, 1)"
                        >
                            ↓
                        </button>
                    </span>
                    <code class="dd-frontier-members__code" title="代號建了不能改；要換就刪掉重建">{{ member.code }}</code>
                    <template v-if="drafts[member.id]">
                        <input
                            v-model="drafts[member.id].name"
                            type="text"
                            class="name"
                            :aria-label="`${member.code} 的名稱`"
                            autocomplete="off"
                            :disabled="busy"
                            @keydown.enter.prevent="save(member)"
                        />
                        <select v-model="drafts[member.id].status" :aria-label="`${member.code} 的狀態`" :disabled="busy">
                            <option v-for="status in STATUSES" :key="status" :value="status">{{ MEMBER_STATUS_LABELS[status] }}</option>
                        </select>
                        <input
                            v-model="drafts[member.id].tamedIn"
                            type="text"
                            class="version"
                            placeholder="緝拿於"
                            :aria-label="`${member.code} 哪一版緝拿`"
                            autocomplete="off"
                            :disabled="busy"
                            @keydown.enter.prevent="save(member)"
                        />
                    </template>
                </div>
                <div class="dd-frontier-members__line">
                    <span class="dd-frontier-members__status" :class="`dd-frontier-members__status--${member.status}`">
                        {{ MEMBER_STATUS_LABELS[member.status] }}{{ member.tamedIn ? `（${member.tamedIn}）` : '' }}
                    </span>
                    <template v-if="confirming === member.id">
                        <span class="dd-frontier-members__muted">刪除「{{ member.name }}」？有賞金紀錄指著的刪不掉。</span>
                        <button type="button" class="dd-admin__btn dd-admin__btn--danger dd-admin__btn--small" :disabled="busy" @click="remove(member)">確定刪除</button>
                        <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="busy" @click="confirming = null">返回</button>
                    </template>
                    <template v-else>
                        <button
                            type="button"
                            class="dd-admin__btn dd-admin__btn--small"
                            :disabled="busy || !rowChanged(member) || !!rowProblem(member)"
                            @click="save(member)"
                        >
                            儲存
                        </button>
                        <button v-if="rowChanged(member)" type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="busy" @click="revert(member)">還原</button>
                        <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="busy" @click="confirming = member.id">刪除…</button>
                    </template>
                </div>
                <p v-if="rowChanged(member) && rowProblem(member)" class="dd-admin__error">{{ rowProblem(member) }}</p>
                <p v-if="rowErrors[member.id]" class="dd-admin__error" role="alert">{{ rowErrors[member.id] }}</p>
            </li>
        </ul>
        <p v-else class="dd-frontier-members__muted">還沒有成員：狀態由上面的表單直接設。照備註補成員時，先補已緝拿的，最後才補通緝中的。</p>

        <!-- 新增：送出不在外層的 form 裡觸發（Enter 會送出領地），所以是一般按鈕 -->
        <div class="dd-frontier-members__row dd-frontier-members__row--new">
            <div v-if="suggestions.length" class="dd-frontier-members__line">
                <span class="dd-frontier-members__muted">建議：</span>
                <button
                    v-for="suggestion in suggestions"
                    :key="suggestion.code"
                    type="button"
                    class="dd-frontier-members__chip"
                    :class="{ 'is-active': newDraft.code === suggestion.code }"
                    :disabled="busy"
                    @click="pick(suggestion)"
                >
                    {{ suggestion.name }}
                </button>
            </div>
            <div class="dd-frontier-members__line">
                <input
                    v-model="newDraft.code"
                    type="text"
                    class="code"
                    placeholder="代號，例如 credit_card"
                    aria-label="新成員的代號"
                    autocomplete="off"
                    :disabled="busy"
                    @keydown.enter.prevent="create"
                />
                <input
                    v-model="newDraft.name"
                    type="text"
                    class="name"
                    :placeholder="`名稱（${MEMBER_NAME_MAX} 字內）`"
                    aria-label="新成員的名稱"
                    autocomplete="off"
                    :disabled="busy"
                    @keydown.enter.prevent="create"
                />
                <select v-model="newDraft.status" aria-label="新成員的狀態" :disabled="busy">
                    <option v-for="status in STATUSES" :key="status" :value="status">{{ MEMBER_STATUS_LABELS[status] }}</option>
                </select>
                <input
                    v-model="newDraft.tamedIn"
                    type="text"
                    class="version"
                    placeholder="緝拿於"
                    aria-label="新成員哪一版緝拿"
                    autocomplete="off"
                    :disabled="busy"
                    @keydown.enter.prevent="create"
                />
                <button type="button" class="dd-admin__btn dd-admin__btn--small" :disabled="busy || !!newProblem" @click="create">加成員</button>
            </div>
            <p v-if="flipWarning && newTouched" class="dd-frontier-members__warn">
                這塊現在是已馴服：加進通緝中的成員，整塊會翻回通緝中。照備註補的話先補已緝拿的（直接選「已緝拿」）。
            </p>
            <p class="dd-frontier-members__muted">代號建了不能改（App 拿它挑圖示）；排在這塊的最後，再用 ↑↓ 調。</p>
            <p v-if="newTouched && newProblem" class="dd-admin__error">{{ newProblem }}</p>
            <p v-if="newError" class="dd-admin__error" role="alert">{{ newError }}</p>
        </div>
    </section>
</template>

<style lang="scss">
    .dd-frontier-members {
        @include setFlex(flex-start, stretch, 10px, column);
        background: var(--vp-c-bg);
        padding: 12px 14px;
        border-radius: 10px;

        h4 {
            margin: 0;
            font-size: var(--font-size-s);
        }
        &__muted {
            margin: 0;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            font-weight: normal;
        }
        &__notice {
            background: var(--vp-c-green-soft);
            padding: 6px 12px;
            border-radius: 8px;
            margin: 0;
            font-size: var(--font-size-s);
        }
        &__warn {
            background: var(--vp-c-warning-soft);
            padding: 6px 12px;
            border-radius: 8px;
            margin: 0;
            font-size: var(--font-size-s);
        }
        &__list {
            @include setFlex(flex-start, stretch, 8px, column);
            padding: 0;
            margin: 0;
            list-style: none;
        }
        &__row {
            @include setFlex(flex-start, stretch, 6px, column);
            background: var(--vp-c-bg-soft);
            padding: 8px 10px;
            border-radius: 8px;
            transition: background-color .2s;

            &.is-changed { background: var(--vp-c-brand-soft); }
            &--new { background: var(--vp-c-default-soft); }
            .dd-admin__error { margin: 0; }
        }
        &__line {
            @include setFlex(flex-start, center, 6px 8px);
            flex-wrap: wrap;
            font-size: var(--font-size-s);
        }
        &__order {
            @include setFlex(flex-start, center, 4px);
        }
        &__move {
            background: var(--vp-c-default-soft);
            width: 24px;
            height: 24px;
            border-radius: 6px;
            color: var(--vp-c-text-1);
            font-size: 12px;
            line-height: 1;
            cursor: pointer;

            &:disabled {
                cursor: not-allowed;
                opacity: .35;
            }
        }
        &__code {
            min-width: 7em;
            color: var(--vp-c-text-2);
            font-family: var(--vp-font-family-mono);
            font-size: var(--font-size-s);
        }
        &__status {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 999px;
            white-space: nowrap;

            &--tamed { background: var(--vp-c-green-soft); }
            &--wanted { background: var(--vp-c-warning-soft); }
        }
        &__chip {
            background: var(--vp-c-bg);
            padding: 2px 10px;
            border-radius: 999px;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
            cursor: pointer;

            &.is-active { background: var(--vp-c-brand-soft); }
            &:disabled {
                cursor: not-allowed;
                opacity: .5;
            }
        }

        input[type=text], select {
            background: var(--vp-c-bg);
            padding: 4px 10px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
        }
        input[type=text].name { width: min(10em, 100%); }
        input[type=text].code { width: min(13em, 100%); }
        input[type=text].version { width: 6.5em; }
    }
</style>
