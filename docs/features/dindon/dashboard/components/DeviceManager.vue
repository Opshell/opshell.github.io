<script setup lang="ts">
    import type { DeviceStatus } from '../api';
    import type { AdminDevice } from '../schemas/admin.schema';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import { deviceMatches } from '../deviceSearch';
    import { formatInt, formatRelative, maskEmail, PLAN_LABELS } from '../format';
    import { takePanelPreset } from '../navigation';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import DeviceDetail from './DeviceDetail.vue';

    const call = useAdminCall();
    const PER_PAGE = 25;

    const query = ref(takePanelPreset('deviceQuery') ?? '');
    const status = ref<DeviceStatus>(takePanelPreset('deviceStatus') ?? 'all');
    const page = ref(1);
    const devices = ref<AdminDevice[]>([]);
    const total = ref(0);
    const loading = ref(false);
    const error = ref('');
    const selectedId = ref<number | null>(null);

    const pageCount = computed(() => Math.max(Math.ceil(total.value / PER_PAGE), 1));

    // 後端的搜尋只收「純數字 = id」「含 @ = 完整 email」。其他字（暱稱、備註裡的字）抓回全部裝置在這裡比對，
    // 分頁也在這裡切。全部裝置只抓一次，按「搜尋」或清除時才重抓
    const isLocalQuery = (q: string) => !!q && !/^\d+$/.test(q) && !q.includes('@');
    const everyDevice = ref<AdminDevice[] | null>(null);
    const localMode = ref(false);

    async function loadLocal(q: string, nextPage: number) {
        everyDevice.value ??= await call(async token => (await adminApi.listAllDevices(token)).devices);
        const matched = everyDevice.value.filter(device =>
            deviceMatches(device, q) && (status.value === 'all' || (status.value === 'frozen') === device.frozen));
        total.value = matched.length;
        page.value = Math.min(nextPage, Math.max(Math.ceil(matched.length / PER_PAGE), 1));
        devices.value = matched.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE);
    }

    async function load(nextPage = page.value) {
        loading.value = true;
        error.value = '';
        const q = query.value.trim();
        try {
            localMode.value = isLocalQuery(q);
            if (localMode.value) {
                await loadLocal(q, nextPage);
                return;
            }
            const result = await call(token => adminApi.listDevices(token, { q, status: status.value, page: nextPage, perPage: PER_PAGE }));
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
        everyDevice.value = null;
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
        const cached = everyDevice.value?.findIndex(item => item.id === device.id) ?? -1;
        if (cached !== -1) everyDevice.value![cached] = device;
    }

    onMounted(() => load(1));
</script>

<template>
    <section class="dd-devices">
        <form class="dd-devices__toolbar" role="search" @submit.prevent="search">
            <label class="dd-devices__search">
                <span class="sr-only">搜尋裝置</span>
                <input v-model="query" type="search" placeholder="裝置 id、email、暱稱或備註" />
            </label>
            <select v-model="status" aria-label="狀態" @change="search">
                <option value="all">全部狀態</option>
                <option value="active">啟用中</option>
                <option value="frozen">已凍結</option>
            </select>
            <button type="submit" class="dd-admin__btn" :disabled="loading">搜尋</button>
            <button v-if="query" type="button" class="dd-admin__btn dd-admin__btn--ghost" @click="clearSearch">清除</button>
            <span class="dd-devices__count">共 {{ formatInt(total) }} 台</span>
        </form>
        <p v-if="localMode" class="dd-devices__hint">在全部 {{ formatInt(everyDevice?.length ?? 0) }} 台裡比對暱稱、email 與備註</p>
        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>

        <div class="dd-devices__layout" :class="{ 'has-detail': selectedId !== null }">
            <div class="dd-devices__table-wrap">
                <div class="dd-table-scroll">
                    <table class="dd-table">
                        <thead>
                            <tr>
                                <th scope="col">ID</th>
                                <th scope="col">名字</th>
                                <th scope="col" class="extra">備註</th>
                                <th scope="col">狀態</th>
                                <th scope="col">方案</th>
                                <th scope="col" class="num extra">額度</th>
                                <th scope="col" class="extra">Beta</th>
                                <th scope="col" class="extra">Google</th>
                                <th scope="col" class="num extra">近 30 天 AI</th>
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
                                <td class="summary">{{ device.displayName || '—' }}</td>
                                <td class="note extra" :title="device.adminNote">{{ device.adminNote || '—' }}</td>
                                <td>
                                    <span class="dd-status" :class="device.frozen ? 'is-frozen' : 'is-active'">
                                        {{ device.frozen ? '❄ 已凍結' : '● 啟用' }}
                                    </span>
                                    <span v-if="device.isTest" class="dd-status is-test" title="後台建立的測試裝置，不進統計">⚙ 測試機</span>
                                </td>
                                <td>{{ PLAN_LABELS[device.planTier] ?? device.planTier }}</td>
                                <td class="num extra">{{ formatInt(device.tokens) }}</td>
                                <td class="extra">{{ device.betaTesterSince ?? '—' }}</td>
                                <td class="extra">{{ device.linked ? maskEmail(device.email) || '已綁定' : '—' }}</td>
                                <td class="num extra">{{ formatInt(device.aiCalls30d) }}</td>
                                <td>{{ formatRelative(device.lastAiAt) }}</td>
                            </tr>
                            <tr v-if="!loading && devices.length === 0">
                                <td colspan="10" class="dd-table__empty">沒有符合的裝置</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="dd-devices__pager">
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="page <= 1 || loading" @click="load(page - 1)">上一頁</button>
                    <span>第 {{ page }} / {{ pageCount }} 頁</span>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="page >= pageCount || loading" @click="load(page + 1)">下一頁</button>
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
        // 備註可能很長、有換行：列表只看第一行開頭，完整的滑過去看、或點進詳情
        .note {
            max-width: 220px;
            color: var(--vp-c-text-2);
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
        }
        &__hint {
            margin: 0 0 8px;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
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

            // 詳情打開：右邊 420px 給詳情，列表只留認人用的幾欄（其他欄詳情裡都有），表格才不會擠進詳情底下。
            // 並排要多寬看內容區（容器 dd-page），不看視窗：側欄收不收差了 150px
            &.has-detail {
                grid-template-columns: minmax(0, 1fr) 420px;

                .extra { display: none; }
                @container dd-page (width < 960px) { grid-template-columns: minmax(0, 1fr); }
            }
        }
        &__table-wrap { min-width: 0; }
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
        .num { text-align: right; }
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
        &.is-test {
            background: var(--vp-c-default-soft);
            margin-left: 4px;
        }
    }

    .sr-only {
        position: absolute;
        clip-path: inset(50%);
        width: 1px;
        height: 1px;
        overflow: hidden;
    }
</style>
