<script setup lang="ts">
    import type { AdminDevice, DeviceStatus } from '../api';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import { formatInt, formatRelative, maskEmail, PLAN_LABELS } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import DeviceDetail from './DeviceDetail.vue';

    const call = useAdminCall();
    const PER_PAGE = 25;

    const query = ref('');
    const status = ref<DeviceStatus>('all');
    const page = ref(1);
    const devices = ref<AdminDevice[]>([]);
    const total = ref(0);
    const loading = ref(false);
    const error = ref('');
    const selectedId = ref<number | null>(null);

    const pageCount = computed(() => Math.max(Math.ceil(total.value / PER_PAGE), 1));

    // 後端只接受「純數字 = id」或「含 @ = 完整 email」，其他格式先在這裡擋掉，不用等 400
    const queryError = computed(() => {
        const q = query.value.trim();
        if (!q || /^\d+$/.test(q) || q.includes('@')) return '';
        return '請輸入裝置 id（數字）或完整的 email';
    });

    async function load(nextPage = page.value) {
        if (queryError.value) return;
        loading.value = true;
        error.value = '';
        try {
            const result = await call(token => adminApi.listDevices(token, { q: query.value.trim(), status: status.value, page: nextPage, perPage: PER_PAGE }));
            devices.value = result.devices;
            total.value = result.total;
            page.value = result.page;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    function search() {
        selectedId.value = null;
        load(1);
    }

    function clearSearch() {
        query.value = '';
        search();
    }

    /** 單台改完之後，把列表上那一列換成最新的 */
    function onUpdated(device: AdminDevice) {
        const index = devices.value.findIndex(item => item.id === device.id);
        if (index !== -1) devices.value[index] = device;
    }

    onMounted(() => load(1));
</script>

<template>
    <section class="dd-devices">
        <form class="dd-devices__toolbar" role="search" @submit.prevent="search">
            <label class="dd-devices__search">
                <span class="sr-only">搜尋裝置</span>
                <input v-model="query" type="search" placeholder="裝置 id 或完整 email" :aria-invalid="!!queryError" />
            </label>
            <select v-model="status" aria-label="狀態" @change="search">
                <option value="all">全部狀態</option>
                <option value="active">啟用中</option>
                <option value="frozen">已凍結</option>
            </select>
            <button type="submit" class="dd-admin__btn" :disabled="!!queryError || loading">搜尋</button>
            <button v-if="query" type="button" class="dd-admin__btn is-ghost" @click="clearSearch">清除</button>
            <span class="dd-devices__count">共 {{ formatInt(total) }} 台</span>
        </form>
        <p v-if="queryError" class="dd-admin__error">{{ queryError }}</p>
        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>

        <div class="dd-devices__layout" :class="{ 'has-detail': selectedId !== null }">
            <div class="dd-devices__table-wrap">
                <table class="dd-table">
                    <thead>
                        <tr>
                            <th scope="col">ID</th>
                            <th scope="col">狀態</th>
                            <th scope="col">方案</th>
                            <th scope="col" class="is-num">額度</th>
                            <th scope="col">Beta</th>
                            <th scope="col">Google</th>
                            <th scope="col" class="is-num">近 30 天 AI</th>
                            <th scope="col">最近使用</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="device in devices"
                            :key="device.id"
                            :class="{ 'is-selected': device.id === selectedId }"
                            tabindex="0"
                            @click="selectedId = device.id"
                            @keydown.enter="selectedId = device.id"
                        >
                            <td>#{{ device.id }}</td>
                            <td>
                                <span class="dd-status" :class="device.frozen ? 'is-frozen' : 'is-active'">
                                    {{ device.frozen ? '❄ 已凍結' : '● 啟用' }}
                                </span>
                            </td>
                            <td>{{ PLAN_LABELS[device.plan_tier] ?? device.plan_tier }}</td>
                            <td class="is-num">{{ formatInt(device.tokens) }}</td>
                            <td>{{ device.beta_tester_since ?? '—' }}</td>
                            <td>{{ device.linked ? maskEmail(device.email) || '已綁定' : '—' }}</td>
                            <td class="is-num">{{ formatInt(device.ai_calls_30d) }}</td>
                            <td>{{ formatRelative(device.last_ai_at) }}</td>
                        </tr>
                        <tr v-if="!loading && devices.length === 0">
                            <td colspan="8" class="dd-table__empty">沒有符合的裝置</td>
                        </tr>
                    </tbody>
                </table>

                <div class="dd-devices__pager">
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="page <= 1 || loading" @click="load(page - 1)">上一頁</button>
                    <span>第 {{ page }} / {{ pageCount }} 頁</span>
                    <button type="button" class="dd-admin__btn is-ghost" :disabled="page >= pageCount || loading" @click="load(page + 1)">下一頁</button>
                    <span v-if="loading" class="dd-devices__loading">載入中…</span>
                </div>
            </div>

            <DeviceDetail
                v-if="selectedId !== null"
                :key="selectedId"
                :device-id="selectedId"
                @updated="onUpdated"
                @close="selectedId = null"
            />
        </div>
    </section>
</template>

<style lang="scss">
    .dd-devices {
        &__toolbar {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
            margin-bottom: 8px;

            input, select {
                background: var(--vp-c-bg-soft);
                padding: 6px 12px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                color: var(--vp-c-text-1);
            }
            input[aria-invalid=true] { border-color: var(--vp-c-danger-1); }
        }
        &__search {
            flex: 1 1 240px;

            input { width: 100%; }
        }
        &__count {
            margin-left: auto;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
        &__layout {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            align-items: start;
            margin-top: 16px;

            &.has-detail {
                grid-template-columns: minmax(0, 1fr) 420px;
                @include setRWD(1100px) { grid-template-columns: 1fr; }
            }
        }
        &__table-wrap { overflow-x: auto; }
        &__pager {
            @include setFlex(flex-start, center, 12px);
            margin-top: 12px;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
    }

    // 表格：數字靠右、格線淡、選到的那列加底色
    .dd-table {
        display: table;
        width: 100%;
        margin: 0;
        border-collapse: collapse;
        font-size: var(--font-size-s);

        th, td {
            padding: 8px 12px;
            border: 0;
            border-bottom: 1px solid var(--vp-c-divider);
            white-space: nowrap;
            text-align: left;
        }
        th {
            background: transparent;
            color: var(--vp-c-text-2);
            font-weight: 600;
        }
        tr { background: transparent !important; }
        .is-num { text-align: right; }
        tbody tr {
            cursor: pointer;

            &:hover { background: var(--vp-c-default-soft) !important; }
            &.is-selected { background: var(--vp-c-brand-soft) !important; }
            &:focus-visible { outline: 2px solid var(--vp-c-brand-1); }
        }
        &__empty {
            padding: 32px !important;
            color: var(--vp-c-text-2);
            text-align: center !important;
            cursor: default;
        }
    }

    // 狀態：圖示＋文字，不只靠顏色
    .dd-status {
        padding: 2px 8px;
        border-radius: 999px;
        font-size: var(--font-size-xs);
        font-weight: 600;

        &.is-active { background: var(--vp-c-green-soft); }
        &.is-frozen { background: var(--vp-c-danger-soft); }
    }

    .sr-only {
        position: absolute;
        clip-path: inset(50%);
        width: 1px;
        height: 1px;
        overflow: hidden;
    }
</style>
