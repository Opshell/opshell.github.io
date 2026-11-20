<script setup lang="ts">
    import type { PurgeConflictView } from '../purge';
    import type { PurgeEventResult } from '../schemas/admin.schema';
    import { computed, ref, watch } from 'vue';
    import { adminApi } from '../api';
    import { formatDateTime, formatInt } from '../format';
    import { PURGE_WORD, purgeBeforeError, purgeConflict, purgeResultRows, purgeScopeText, taipeiToday } from '../purge';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 清回報的內容（api.md 第 8 節 event/purge，Flowsker #767、#770）。以前從 API 控制台打，現在放在回報分頁：
    // 清的就是回報，而且後端會因為「範圍裡還有待審的」擋下來，管理員要在同一頁審完再回來清。
    // 不可逆、沒有備份，所以兩道確認：先自己打 PURGE；被 409 擋下、要強制時再按一次確認。
    const emit = defineEmits<{ done: []; close: [] }>();
    const call = useAdminCall();

    const before = ref('');
    const word = ref('');
    const busy = ref(false);
    const error = ref('');
    const conflict = ref<PurgeConflictView | null>(null);
    const confirmingForce = ref(false);
    const result = ref<PurgeEventResult | null>(null);

    const today = taipeiToday();
    const beforeError = computed(() => purgeBeforeError(before.value));
    const canPurge = computed(() => !busy.value && !beforeError.value && word.value.trim() === PURGE_WORD);

    // 改了範圍，上一次的 409 就不算數了：強制要針對「這一次會清到的」那幾則
    watch(before, () => {
        conflict.value = null;
        confirmingForce.value = false;
    });

    async function purge(force: boolean) {
        busy.value = true;
        error.value = '';
        result.value = null;
        try {
            result.value = await call(token => adminApi.purgeEvent(token, {
                confirm: PURGE_WORD,
                ...(before.value ? { before: before.value } : {}),
                ...(force ? { force: true } : {})
            }));
            conflict.value = null;
            word.value = '';
            emit('done');
        } catch (e) {
            conflict.value = purgeConflict(e);
            if (!conflict.value) error.value = errorMessage(e);
        } finally {
            busy.value = false;
            confirmingForce.value = false;
        }
    }
</script>

<template>
    <section class="dd-purge">
        <header class="dd-purge__head">
            <h3>清回報內容</h3>
            <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="busy" @click="emit('close')">關閉</button>
        </header>

        <p class="dd-purge__muted">
            清掉回報的描述、除錯紀錄、截圖（閃退紀錄也是）與來往訊息、信件。回報那一列留著（類型、採計、主題、回報者），
            採計件數、賞金與開拓者署名不動。<strong>做不回來</strong>：沒有備份，清掉的回報也再也審不了。
        </p>

        <div class="dd-purge__row">
            <label class="dd-purge__field">
                <span>清到哪一天之前（台灣時間，選填）</span>
                <input v-model="before" type="date" :max="today" :disabled="busy" />
            </label>
            <button v-if="before" type="button" class="dd-purge__link" :disabled="busy" @click="before = ''">不填（只清 beta 截止前）</button>
        </div>
        <p class="dd-purge__scope">{{ purgeScopeText(before) }}</p>
        <p v-if="beforeError" class="dd-admin__error" role="alert">{{ beforeError }}</p>

        <div class="dd-purge__row">
            <label class="dd-purge__field">
                <span>輸入「{{ PURGE_WORD }}」確認</span>
                <input v-model="word" type="text" autocomplete="off" spellcheck="false" :disabled="busy" />
            </label>
            <button type="button" class="dd-admin__btn dd-admin__btn--danger" :disabled="!canPurge" @click="purge(false)">
                {{ busy ? '清除中…' : '清除' }}
            </button>
        </div>

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>

        <!-- #region [P] 409：後端擋下來了 -->
        <div v-if="conflict" class="dd-purge__conflict" role="alert">
            <p><strong>沒有清。</strong>{{ conflict.error }}</p>
            <ul v-if="conflict.pending !== null">
                <li>待審 {{ formatInt(conflict.pending) }} 則，其中閃退紀錄 {{ formatInt(conflict.pendingCrash ?? 0) }} 則、人寫的 {{ formatInt(conflict.pending - (conflict.pendingCrash ?? 0)) }} 則</li>
                <li>想留著審：關掉這裡、篩「待審」審完再回來清</li>
            </ul>
            <template v-if="conflict.forceable">
                <div v-if="confirmingForce" class="dd-purge__row">
                    <span class="dd-purge__force">確定強制清？上面說的那些回報也會一起清掉，做不回來。</span>
                    <button type="button" class="dd-admin__btn dd-admin__btn--danger" :disabled="busy || !canPurge" @click="purge(true)">
                        {{ busy ? '清除中…' : '確定強制清' }}
                    </button>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirmingForce = false">取消</button>
                </div>
                <div v-else class="dd-purge__row">
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy || !canPurge" @click="confirmingForce = true">強制清…</button>
                    <span v-if="!canPurge" class="dd-purge__muted">要強制的話，上面的「{{ PURGE_WORD }}」也要打著</span>
                </div>
            </template>
        </div>
        <!-- #endregion -->

        <!-- #region [P] 200：清了多少 -->
        <div v-if="result" class="dd-purge__result" role="status">
            <p>
                ✓ 清完了：{{ result.cutoff ? `${formatDateTime(result.cutoff)} 之前送出的` : '全部' }}回報
                <template v-if="result.force">（強制）</template>
            </p>
            <dl>
                <div v-for="row in purgeResultRows(result)" :key="row.label">
                    <dt>{{ row.label }}</dt>
                    <dd>{{ formatInt(row.value) }}</dd>
                </div>
            </dl>
            <p v-if="!result.reportsPurged" class="dd-purge__muted">這個範圍裡沒有還沒清過的回報（已經清過的不會再算）。</p>
        </div>
        <!-- #endregion -->
    </section>
</template>

<style lang="scss">
    .dd-purge {
        @include setFlex(flex-start, stretch, 12px, column);
        background: var(--vp-c-bg-soft);
        padding: 18px 20px;
        border: 1px solid var(--vp-c-danger-1);
        border-radius: 12px;
        margin-bottom: 20px;
        font-size: var(--font-size-s);

        p { margin: 0; }

        &__head {
            @include setFlex(space-between, center, 12px);

            h3 { font-size: var(--font-size-m); }
        }
        &__muted { color: var(--vp-c-text-2); }
        &__row {
            @include setFlex(flex-start, flex-end, 12px);
            flex-wrap: wrap;
        }
        &__field {
            @include setFlex(flex-start, flex-start, 4px, column);

            > span { color: var(--vp-c-text-2); }
        }
        &__scope { font-weight: 600; }
        &__link {
            background: transparent;
            padding: 0;
            border: 0;
            color: var(--vp-c-brand-1);
            font-size: var(--font-size-s);
            cursor: pointer;
        }
        &__conflict {
            @include setFlex(flex-start, stretch, 10px, column);
            background: var(--vp-c-danger-soft);
            padding: 12px;
            border-radius: 10px;

            ul {
                padding-left: 18px;
                margin: 0;
            }
        }
        &__force {
            align-self: center;
            color: var(--vp-c-danger-1);
            font-weight: 600;
        }
        &__result {
            @include setFlex(flex-start, stretch, 10px, column);
            background: var(--vp-c-green-soft);
            padding: 12px;
            border-radius: 10px;

            dl {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 8px 16px;
                margin: 0;
            }
            dt { color: var(--vp-c-text-2); }
            dd {
                margin: 0;
                font-weight: 600;
            }
        }
    }
</style>
