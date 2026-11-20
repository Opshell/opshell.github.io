<script setup lang="ts">
    import type { CoinItemDraft } from '../coins';
    import type { AdminCoinItem } from '../schemas/admin.schema';
    import { computed, onMounted, reactive, ref } from 'vue';
    import { adminApi } from '../api';
    import { COIN_CODE_MAX, COIN_KIND_LABELS, COIN_KINDS, COIN_NAME_MAX, COIN_PLAN_TIERS, coinItemCreateBody, coinItemDraftOf, coinItemFormError, coinItemPatch, emptyCoinItemDraft } from '../coins';
    import { formatInt, PLAN_LABELS } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 拓荒季的金幣商店（api.md 30.7，Flowsker #791）：App 的商店照這裡的上架與順序顯示。
    // 沒有刪除：帳本與買到的東西指著商品，不要了就下架；code 與 kind 建了不能改（App 認的是 code），要換就另外加一樣。
    const call = useAdminCall();

    const items = ref<AdminCoinItem[]>([]);
    const loaded = ref(false);
    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    const notice = ref('');

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            items.value = await call(token => adminApi.listCoinItems(token));
            loaded.value = true;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    // #region [P] 新增／修改
    /** null = 沒開表單；0 = 新增；其他 = 正在改那一樣 */
    const editing = ref<number | null>(null);
    const isNew = computed(() => editing.value === 0);
    const current = computed(() => items.value.find(item => item.id === editing.value));
    const form = reactive<CoinItemDraft>(emptyCoinItemDraft());
    const formError = computed(() => coinItemFormError(form, isNew.value));
    const patch = computed(() => (current.value ? coinItemPatch(current.value, form) : {}));
    const hasChanges = computed(() => isNew.value || Object.keys(patch.value).length > 0);
    const nameLength = computed(() => [...form.name.trim()].length);
    /** 改價只影響之後買的；App 拿舊價格來買會 409，請他重新整理商店 */
    const priceChanged = computed(() => 'price' in patch.value);

    function startCreate() {
        Object.assign(form, emptyCoinItemDraft());
        editing.value = 0;
        notice.value = '';
    }

    function open(item: AdminCoinItem) {
        Object.assign(form, coinItemDraftOf(item));
        editing.value = item.id;
        notice.value = '';
    }

    function close() {
        editing.value = null;
    }

    async function submit() {
        if (formError.value || !hasChanges.value || busy.value) return;
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            if (isNew.value) {
                const created = await call(token => adminApi.createCoinItem(token, coinItemCreateBody(form)));
                notice.value = `已新增「${created.name}」（${created.active ? '上架' : '下架的草稿'}）`;
            } else if (current.value) {
                const id = current.value.id;
                const saved = await call(token => adminApi.updateCoinItem(token, id, patch.value));
                notice.value = `已儲存「${saved.name}」`;
            }
            editing.value = null;
            await load();
        } catch (e) {
            // 409 代號重複、400 欄位錯的中文訊息直接顯示
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }
    // #endregion

    /** 方案寫等級與天數，其他寫種類 */
    function contentOf(item: AdminCoinItem) {
        if (item.kind === 'plan') return `${PLAN_LABELS[item.planTier ?? ''] ?? item.planTier} ${item.days} 天`;
        return COIN_KIND_LABELS[item.kind];
    }

    onMounted(load);
</script>

<template>
    <section class="dd-coin-shop" aria-labelledby="dd-coin-shop-title">
        <div class="dd-coin-shop__head">
            <h3 id="dd-coin-shop-title">金幣商店</h3>
            <div class="dd-frontier__actions">
                <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="loading" @click="load">重新整理</button>
                <button type="button" class="dd-admin__btn" @click="startCreate">新增商品</button>
            </div>
        </div>
        <p class="dd-frontier__muted">
            採計的回報自動算金幣（計分 × 10），使用者用金幣在 App 的商店買。上架的照「排序」顯示；新增的預設是下架的草稿。
            徽章與前後綴要等 App 認得那個代號（有圖）才上架，App 不認得的代號不會顯示。不給退，補償用裝置頁的手動調整。
        </p>

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-frontier__notice" role="status">✓ {{ notice }}</p>

        <!-- #region [P] 新增／修改的表單 -->
        <form v-if="editing !== null" class="dd-frontier__form" @submit.prevent="submit">
            <h3>{{ isNew ? '新增商品' : `修改「${current?.name}」` }}</h3>

            <div class="dd-frontier__grid">
                <label class="dd-frontier__field">
                    <span>代號</span>
                    <input v-model="form.code" type="text" class="wide" placeholder="例如 plan_pro_14" autocomplete="off" :maxlength="COIN_CODE_MAX" :disabled="busy || !isNew" />
                    <span class="dd-frontier__muted">{{ isNew ? '小寫英數與底線，建了不能改' : '建了不能改' }}</span>
                </label>
                <label class="dd-frontier__field">
                    <span>種類</span>
                    <select v-model="form.kind" :disabled="busy || !isNew">
                        <option v-for="kind in COIN_KINDS" :key="kind" :value="kind">{{ COIN_KIND_LABELS[kind] }}</option>
                    </select>
                </label>
                <label class="dd-frontier__field">
                    <span>名稱</span>
                    <input v-model="form.name" type="text" class="wide" placeholder="例如「進階方案 14 天」（App 會顯示）" autocomplete="off" :disabled="busy" />
                    <span class="count" :class="{ 'is-over': nameLength > COIN_NAME_MAX }">{{ nameLength }} / {{ COIN_NAME_MAX }}</span>
                </label>
                <label class="dd-frontier__field">
                    <span>價格</span>
                    <input v-model="form.price" type="text" inputmode="numeric" class="version" placeholder="金幣" :disabled="busy" />
                    <span class="dd-frontier__muted">枚</span>
                </label>
                <template v-if="form.kind === 'plan'">
                    <label class="dd-frontier__field">
                        <span>方案</span>
                        <select v-model="form.planTier" :disabled="busy">
                            <option v-for="tier in COIN_PLAN_TIERS" :key="tier" :value="tier">{{ PLAN_LABELS[tier] }}</option>
                        </select>
                    </label>
                    <label class="dd-frontier__field">
                        <span>天數</span>
                        <input v-model="form.days" type="text" inputmode="numeric" class="version" :disabled="busy" />
                        <span class="dd-frontier__muted">天，從買的那天起接在其他權益後面</span>
                    </label>
                </template>
                <label class="dd-frontier__field">
                    <span>排序</span>
                    <input v-model="form.sortOrder" type="text" inputmode="numeric" class="version" :placeholder="isNew ? '留空＝0' : ''" :disabled="busy" />
                    <span class="dd-frontier__muted">小的在前</span>
                </label>
                <label class="dd-frontier__field dd-frontier__check">
                    <input v-model="form.active" type="checkbox" :disabled="busy" />
                    上架（App 的商店看得到、買得到）
                </label>
            </div>

            <p v-if="priceChanged" class="dd-frontier__muted">改價不影響已經買的；這時剛好按下購買的人會被擋下，請他重新整理商店。</p>
            <p v-if="formError" class="dd-admin__error">{{ formError }}</p>

            <div class="dd-frontier__actions">
                <button type="submit" class="dd-admin__btn" :disabled="!!formError || !hasChanges || busy">{{ isNew ? '新增' : '儲存變更' }}</button>
                <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="close">關閉</button>
            </div>
        </form>
        <!-- #endregion -->

        <!-- #region [P] 商品清單 -->
        <div class="dd-table-scroll">
            <table class="dd-table dd-coin-shop__table">
                <thead>
                    <tr>
                        <th scope="col" class="num">排序</th>
                        <th scope="col">名稱</th>
                        <th scope="col">代號</th>
                        <th scope="col">內容</th>
                        <th scope="col" class="num">價格</th>
                        <th scope="col">狀態</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="item in items"
                        :key="item.id"
                        :class="{ 'is-selected': item.id === editing }"
                        tabindex="0"
                        @click="open(item)"
                        @keydown.enter.self="open(item)"
                    >
                        <td class="num">{{ item.sortOrder }}</td>
                        <td><strong>{{ item.name }}</strong></td>
                        <td class="code">{{ item.code }}</td>
                        <td>{{ contentOf(item) }}</td>
                        <td class="num">{{ formatInt(item.price) }}</td>
                        <td><span class="dd-coin-shop__state" :class="{ 'is-active': item.active }">{{ item.active ? '上架' : '下架' }}</span></td>
                    </tr>
                    <tr v-if="loaded && !items.length">
                        <td colspan="6" class="dd-table__empty">還沒有商品，按「新增商品」開始</td>
                    </tr>
                </tbody>
            </table>
            <p v-if="loading && !loaded" class="dd-frontier__muted t-shimmer" data-text="載入中…">載入中…</p>
        </div>
        <!-- #endregion -->
    </section>
</template>

<style lang="scss">
    .dd-coin-shop {
        @include setFlex(flex-start, stretch, 12px, column);
        padding-top: 8px;

        &__head {
            @include setFlex(space-between, center, 8px 16px);
            flex-wrap: wrap;

            h3 {
                margin: 0;
                font-size: var(--font-size-m);
            }
        }
        &__table td.code {
            color: var(--vp-c-text-2);
            font-family: var(--vp-font-family-mono);
            font-size: var(--font-size-s);
        }
        &__state {
            display: inline-block;
            background: var(--vp-c-default-soft);
            padding: 2px 10px;
            border-radius: 999px;
            font-size: var(--font-size-s);
            white-space: nowrap;

            &.is-active { background: var(--vp-c-green-soft); }
        }
    }
</style>
