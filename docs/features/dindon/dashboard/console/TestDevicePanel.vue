<script setup lang="ts">
    import type { TestDeviceKey } from '../schemas/admin.schema';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import { maskKey, useTestDevice } from './useTestDevice';

    // 測 App 端點用的裝置 key（#0074）。後台建立的測試裝置不進用量、排行榜、獎勵、投票的統計。
    // 後端沒有刪除測試裝置的方法，所以先找現成的：有就重發 key，沒有才建一台。
    // key 只有建立或重發的那一次看得到，拿到就存進這個分頁（sessionStorage）。

    const call = useAdminCall();
    const { deviceKey, deviceId, testDevices, setKey } = useTestDevice();

    const busy = ref(false);
    const error = ref('');
    const pasteDraft = ref('');
    /** 要重發 key 的那台（按一次先問，舊 key 會立刻失效） */
    const confirmRotate = ref<number | null>(null);
    /** 剛拿到的 key：這一次可以複製去 curl 用，之後畫面只露頭尾 */
    const fresh = ref('');
    const copied = ref(false);

    const available = computed(() => (testDevices.value ?? []).filter(device => !device.frozen));

    async function findTestDevices() {
        busy.value = true;
        error.value = '';
        try {
            // 裝置不多（beta 限額 100 台），一頁 100 台一次就抓完；只有這裡會用到，所以這個分頁只找一次
            const { devices } = await call(token => adminApi.listAllDevices(token));
            // 看 isConsole 不看 isTest（#0086）：使用者自己的手機標成測試用之後也是 isTest，重發會讓手機被登出，後端也會回 409
            testDevices.value = devices.filter(device => device.isConsole);
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }

    function use(result: TestDeviceKey) {
        setKey(result.apiKey, result.device.id);
        fresh.value = result.apiKey;
        copied.value = false;
        const others = (testDevices.value ?? []).filter(device => device.id !== result.device.id);
        testDevices.value = [result.device, ...others];
    }

    async function create() {
        busy.value = true;
        error.value = '';
        try {
            use(await call(token => adminApi.createTestDevice(token)));
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }

    async function rotate(id: number) {
        if (confirmRotate.value !== id) {
            confirmRotate.value = id;
            return;
        }
        confirmRotate.value = null;
        busy.value = true;
        error.value = '';
        try {
            use(await call(token => adminApi.rotateTestDeviceKey(token, id)));
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }

    function usePasted() {
        setKey(pasteDraft.value);
        pasteDraft.value = '';
        fresh.value = '';
    }

    function forget() {
        setKey('');
        fresh.value = '';
    }

    async function copyFresh() {
        try {
            await navigator.clipboard.writeText(fresh.value);
            copied.value = true;
        } catch {
            copied.value = false;
        }
    }

    onMounted(() => {
        if (!deviceKey.value && testDevices.value === null) void findTestDevices();
    });
</script>

<template>
    <div class="dd-api-td">
        <!-- #region [P] 已經有 key -->
        <template v-if="deviceKey">
            <p class="dd-api-ws__muted">
                用{{ deviceId ? `測試裝置 #${deviceId} ` : '你貼上的裝置' }}的 key：<code>{{ maskKey(deviceKey) }}</code>
                <button type="button" class="link" @click="forget">不用了</button>
                <button v-if="deviceId" type="button" class="link" :disabled="busy" @click="rotate(deviceId)">
                    {{ confirmRotate === deviceId ? '確定重發？舊的 key 會立刻失效' : '重發 key' }}
                </button>
            </p>
            <div v-if="fresh" class="dd-api-td__fresh">
                <p>
                    <strong>這把 key 只顯示這一次。</strong>已經存在這個分頁，關掉分頁就沒了；
                    要在終端機用 curl 的話現在複製（<code>export DINDON_DEVICE_KEY=…</code>）。弄丟了就按「重發 key」。
                </p>
                <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" @click="copyFresh">{{ copied ? '已複製' : '複製 key' }}</button>
            </div>
        </template>
        <!-- #endregion -->

        <!-- #region [P] 還沒有 key：先找現成的測試裝置，沒有才建 -->
        <template v-else>
            <p class="dd-api-ws__muted">
                這支要一台裝置的 API key。用<strong>測試裝置</strong>：不進用量報表、排行榜、獎勵與投票的統計；
                但 AI 一樣會真的呼叫 Gemini、算每日上限（每台一天 200 次）。
            </p>

            <p v-if="busy && testDevices === null" class="dd-api-ws__muted">找測試裝置中…</p>
            <ul v-else-if="available.length" class="dd-api-td__list">
                <li v-for="device in available" :key="device.id">
                    <span>測試裝置 #{{ device.id }}<small v-if="device.adminNote"> · {{ device.adminNote.split('\n')[0] }}</small></span>
                    <button type="button" class="dd-admin__btn dd-admin__btn--small" :class="{ 'dd-admin__btn--danger': confirmRotate === device.id }" :disabled="busy" @click="rotate(device.id)">
                        {{ confirmRotate === device.id ? '確定：舊 key 會失效' : '重發 key 並使用' }}
                    </button>
                </li>
            </ul>
            <div v-else-if="testDevices !== null" class="dd-api-td__create">
                <p class="dd-api-ws__muted">還沒有測試裝置。建一台之後就一直用它（後端沒有刪除，不要了只能停用）。</p>
                <button type="button" class="dd-admin__btn dd-admin__btn--small" :disabled="busy" @click="create">建立測試裝置</button>
            </div>

            <details class="dd-api-td__paste">
                <summary>已經有 key，自己貼上</summary>
                <div class="row">
                    <input v-model="pasteDraft" type="password" autocomplete="off" spellcheck="false" placeholder="裝置 API key" aria-label="裝置 API key" @keydown.enter.prevent="usePasted" />
                    <button type="button" class="dd-admin__btn dd-admin__btn--small" :disabled="!pasteDraft.trim()" @click="usePasted">使用</button>
                </div>
                <p class="dd-api-ws__muted">不要用真的測試者的裝置：你送的每一筆都會算在那台身上。</p>
            </details>
        </template>
        <!-- #endregion -->

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
    </div>
</template>

<style lang="scss">
    .dd-api-td {
        @include setFlex(flex-start, stretch, 8px, column);

        code { font-family: var(--vp-font-family-mono); }
        .link {
            margin-left: 8px;

            &:disabled {
                color: var(--vp-c-text-3);
                cursor: not-allowed;
            }
        }
        &__fresh {
            @include setFlex(flex-start, flex-start, 8px, column);
            background: var(--vp-c-warning-soft);
            padding: 10px 12px;
            border-radius: 8px;
            font-size: 12px;
        }
        &__list {
            @include setFlex(flex-start, stretch, 6px, column);
            padding: 0;
            margin: 0;
            list-style: none;

            li {
                @include setFlex(space-between, center, 10px);
                font-size: var(--font-size-s);
            }
            small { color: var(--vp-c-text-2); }
        }
        &__create {
            @include setFlex(flex-start, flex-start, 6px, column);
        }
        &__paste {
            summary {
                color: var(--vp-c-text-2);
                font-size: 12px;
                cursor: pointer;
            }
            .row {
                display: flex;
                gap: 8px;
                margin: 6px 0;

                input {
                    flex: 1;
                    background: var(--vp-c-bg);
                    padding: 4px 10px;
                    border: 1px solid var(--vp-c-divider);
                    border-radius: 6px;
                }
            }
        }
    }
</style>
