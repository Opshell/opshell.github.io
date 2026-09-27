<script setup lang="ts">
    import type { FeatureCandidate, FeatureCandidateStatus, SaveFeatureCandidateInput } from '../schemas/admin.schema';
    import { computed, onMounted, reactive, ref } from 'vue';
    import { adminApi } from '../api';
    import { formatDateTime, formatInt } from '../format';
    import { countChars, FEATURE_DESCRIPTION_MAX, FEATURE_TITLE_MAX, SaveFeatureCandidatePayload } from '../schemas/admin.schema';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 新功能投票的候選（api.md 第 8 節，規則第 19 節，溝通板 #0061）。
    // 測試者在 App 裡投票，決定下一個做什麼；這裡列候選、新增、改標題說明與狀態、看票數。
    // 沒有刪除：打錯字就改標題，不要了就改成「不做了」。看不到是誰投的，後台也一樣。
    const call = useAdminCall();

    const STATUS_LABELS: Record<FeatureCandidateStatus, string> = {
        voting: '投票中',
        in_progress: '開發中',
        shipped: '已上線',
        dropped: '不做了'
    };
    const STATUS_ORDER: FeatureCandidateStatus[] = ['voting', 'in_progress', 'shipped', 'dropped'];

    const features = ref<FeatureCandidate[]>([]);
    const maxVotes = ref(3);
    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    const notice = ref('');
    /** null = 沒開表單；0 = 新增；其他 = 正在改那個候選 */
    const editing = ref<number | null>(null);
    const isNew = computed(() => editing.value === 0);
    const current = computed(() => features.value.find(feature => feature.id === editing.value));
    /** 從投票中改成別的狀態，要先確認一次：投的人會拿回那一票 */
    const confirming = ref(false);

    const form = reactive({ title: '', description: '', status: 'voting' as FeatureCandidateStatus });

    /** 只送真的變了的欄位（後端的操作紀錄也只記變了的） */
    const patch = computed<SaveFeatureCandidateInput>(() => {
        if (isNew.value || !current.value) return { title: form.title, description: form.description, status: form.status };
        const changes: SaveFeatureCandidateInput = {};
        if (form.title.trim() !== current.value.title) changes.title = form.title;
        if (form.description.trim() !== current.value.description) changes.description = form.description;
        if (form.status !== current.value.status) changes.status = form.status;
        return changes;
    });
    const hasChanges = computed(() => Object.keys(patch.value).length > 0);

    // 跟送出用的是同一份 Schema，錯誤訊息一致
    const formError = computed(() => {
        const result = SaveFeatureCandidatePayload.safeParse(patch.value);
        return result.success ? '' : result.error.issues[0]?.message ?? '格式不對';
    });

    /** 會把票還給使用者的那種改法 */
    const returnsVotes = computed(() => !isNew.value && current.value?.status === 'voting' && form.status !== 'voting');

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            const list = await call(token => adminApi.listFeatureCandidates(token));
            features.value = list.features;
            maxVotes.value = list.maxVotes;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    function startCreate() {
        Object.assign(form, { title: '', description: '', status: 'voting' });
        notice.value = '';
        error.value = '';
        confirming.value = false;
        editing.value = 0;
    }

    function open(feature: FeatureCandidate) {
        Object.assign(form, { title: feature.title, description: feature.description, status: feature.status });
        notice.value = '';
        error.value = '';
        confirming.value = false;
        editing.value = feature.id;
    }

    function close() {
        editing.value = null;
        confirming.value = false;
    }

    async function submit() {
        if (formError.value || busy.value || !hasChanges.value) return;
        if (returnsVotes.value && !confirming.value) {
            confirming.value = true;
            return;
        }
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const saved = isNew.value
                ? await call(token => adminApi.createFeatureCandidate(token, patch.value))
                : await call(token => adminApi.updateFeatureCandidate(token, editing.value!, patch.value));
            const created = isNew.value;
            await load();
            open(saved); // open 會清掉訊息，所以訊息放在後面
            notice.value = created ? `已新增「${saved.title}」，App 裡馬上看得到` : `已儲存「${saved.title}」`;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
            confirming.value = false;
        }
    }

    onMounted(load);
</script>

<template>
    <section class="dd-feature-vote">
        <div class="dd-feature-vote__bar">
            <p class="dd-feature-vote__muted">
                <!-- 中文之間換行會變成空格，所以寫成一行 -->
                測試者在 App 裡投票，每人同時最多 {{ maxVotes }} 票，只有「投票中」的能投。改成其他狀態時，投的人會拿回那一票，票數留著。<strong>沒有刪除</strong>：不要了就改成「不做了」。看不到是誰投的。
            </p>
            <button type="button" class="dd-admin__btn" @click="startCreate">新增候選</button>
        </div>

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-feature-vote__notice" role="status">✓ {{ notice }}</p>

        <!-- #region [P] 新增／修改的表單 -->
        <form v-if="editing !== null" class="dd-feature-vote__form" @submit.prevent="submit">
            <h3>{{ isNew ? '新增候選' : `修改 #${editing}` }}</h3>

            <label class="dd-feature-vote__field">
                <span>標題</span>
                <input v-model="form.title" type="text" class="wide" placeholder="例如「匯出 CSV」" autocomplete="off" />
                <span class="count" :class="{ 'is-over': countChars(form.title.trim()) > FEATURE_TITLE_MAX }">
                    {{ countChars(form.title.trim()) }} / {{ FEATURE_TITLE_MAX }}
                </span>
            </label>

            <label class="dd-feature-vote__field dd-feature-vote__field--block">
                <span>說明（選填，可以換行）</span>
                <textarea v-model="form.description" rows="4" placeholder="測試者在 App 裡看到的說明" />
                <span class="count" :class="{ 'is-over': countChars(form.description.trim()) > FEATURE_DESCRIPTION_MAX }">
                    {{ countChars(form.description.trim()) }} / {{ FEATURE_DESCRIPTION_MAX }}
                </span>
            </label>

            <label class="dd-feature-vote__field">
                <span>狀態</span>
                <select v-model="form.status" @change="confirming = false">
                    <option v-for="status in STATUS_ORDER" :key="status" :value="status">{{ STATUS_LABELS[status] }}</option>
                </select>
                <span v-if="current" class="dd-feature-vote__muted">目前 {{ formatInt(current.votes) }} 票</span>
            </label>

            <p v-if="formError" class="dd-admin__error">{{ formError }}</p>

            <div v-if="confirming && current" class="dd-feature-vote__confirm" role="alertdialog" aria-label="確認改狀態">
                <p>
                    「{{ current.title }}」改成「{{ STATUS_LABELS[form.status] }}」之後，投它的人會<strong>拿回那一票</strong>，可以拿去投別的；這個候選不能再投票，目前的 {{ formatInt(current.votes) }} 票會留著。使用者在 App 裡感覺得到。
                </p>
                <div class="dd-feature-vote__actions">
                    <button type="submit" class="dd-admin__btn" :disabled="busy">確定改成「{{ STATUS_LABELS[form.status] }}」</button>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirming = false">返回</button>
                </div>
            </div>
            <div v-else class="dd-feature-vote__actions">
                <button type="submit" class="dd-admin__btn" :disabled="!!formError || !hasChanges || busy">
                    {{ isNew ? '新增' : returnsVotes ? '儲存變更…' : '儲存變更' }}
                </button>
                <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="close">關閉</button>
            </div>
        </form>
        <!-- #endregion -->

        <div class="dd-feature-vote__scroll">
            <h3 class="dd-feature-vote__sub-title">所有候選（{{ features.length }}）</h3>
            <table class="dd-table">
                <thead>
                    <tr>
                        <th scope="col">候選</th>
                        <th scope="col">狀態</th>
                        <th scope="col" class="num">票數</th>
                        <th scope="col">最後修改</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="feature in features"
                        :key="feature.id"
                        :class="{ 'is-selected': feature.id === editing }"
                        tabindex="0"
                        @click="open(feature)"
                        @keydown.enter="open(feature)"
                    >
                        <td>
                            <strong>{{ feature.title }}</strong>
                            <p v-if="feature.description" class="dd-feature-vote__description">{{ feature.description }}</p>
                        </td>
                        <td>
                            <span class="dd-feature-vote__status" :class="`dd-feature-vote__status--${feature.status.replace('_', '-')}`">{{ STATUS_LABELS[feature.status] }}</span>
                        </td>
                        <td class="num">{{ formatInt(feature.votes) }}</td>
                        <td>{{ formatDateTime(feature.updatedAt) }}</td>
                    </tr>
                    <tr v-if="!loading && !features.length">
                        <td colspan="4" class="dd-table__empty">還沒有候選，按「新增候選」開始</td>
                    </tr>
                </tbody>
            </table>
            <p v-if="loading" class="dd-feature-vote__muted">載入中…</p>
        </div>
    </section>
</template>

<style lang="scss">
    .dd-feature-vote {
        @include setFlex(flex-start, stretch, 16px, column);

        &__bar {
            @include setFlex(space-between, center, 12px);
            flex-wrap: wrap;
        }
        &__muted {
            margin: 0;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
        &__notice {
            background: var(--vp-c-green-soft);
            padding: 6px 12px;
            border-radius: 8px;
            margin: 0;
            font-size: var(--font-size-s);
        }

        &__form {
            @include setFlex(flex-start, stretch, 14px, column);
            padding: 16px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 12px;

            h3 {
                margin: 0;
                font-size: var(--font-size-m);
            }
        }
        &__field {
            @include setFlex(flex-start, center, 8px 14px);
            flex-wrap: wrap;
            font-size: var(--font-size-s);

            > span { color: var(--vp-c-text-2); }
            .count {
                font-variant-numeric: tabular-nums;

                &.is-over { color: var(--vp-c-danger-1); }
            }

            &--block {
                flex-direction: column;
                gap: 6px;
                align-items: flex-start;
            }
        }
        &__confirm {
            @include setFlex(flex-start, stretch, 10px, column);
            background: var(--vp-c-warning-soft);
            padding: 12px 14px;
            border-radius: 10px;
            font-size: var(--font-size-s);
        }
        &__actions {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
        }
        &__sub-title {
            margin: 0 0 8px;
            font-size: var(--font-size-m);
        }
        &__scroll { overflow-x: auto; }
        &__description {
            max-width: 560px;
            margin: 4px 0 0;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            white-space: pre-line; // 說明可以換行，照原樣顯示
        }

        // 狀態是資料決定的固定分類，用 --（前端開發規範：會隨互動改變的才用 is-）
        &__status {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 999px;
            font-size: var(--font-size-s);
            white-space: nowrap;

            &--voting { background: var(--vp-c-brand-soft); }
            &--in-progress { background: var(--vp-c-warning-soft); }
            &--shipped { background: var(--vp-c-green-soft); }
            &--dropped {
                background: var(--vp-c-default-soft);
                color: var(--vp-c-text-2);
            }
        }

        input[type=text], select, textarea {
            background: var(--vp-c-bg-soft);
            padding: 4px 10px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
        }
        input[type=text].wide { width: min(420px, 100%); }
        textarea {
            width: min(560px, 100%);
            font-family: inherit;
            line-height: 1.6;
            resize: vertical;
        }
    }
</style>
