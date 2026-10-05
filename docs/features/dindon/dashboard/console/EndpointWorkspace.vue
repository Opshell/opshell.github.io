<script setup lang="ts">
    import type { ApiAuth, ApiEndpoint, HttpMethod } from './catalog.schema';
    import type { HistoryEntry } from './history';
    import type { Attachment, Confirmation } from './request';
    import type { SendResult } from './send';
    import { apiBase, isProductionApi } from '@shared/utils/apiBase';
    import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
    import { useGoogleAuth } from '../../useGoogleAuth';
    import { HTTP_METHODS } from './catalog.schema';
    import { ADMIN_RATE_LIMIT, adminCallsInLastMinute, recordAdminCall, sessionBodies } from './history';
    import JsonTree from './JsonTree.vue';
    import MarkdownView from './MarkdownView.vue';
    import {
        AUTH_LABEL,
        buildQuery,
        checkBody,
        confirmationFor,
        EFFECT_LABEL,
        exampleText,
        fillPath,
        formatBytes,
        hasContract,
        missingQuery,
        toCurl,
        toFetch,
        withAttachments
    } from './request';
    import ResponseView from './ResponseView.vue';
    import { sendRequest } from './send';
    import TestDevicePanel from './TestDevicePanel.vue';
    import { useTestDevice } from './useTestDevice';

    // 一支端點的說明＋試打。自訂請求（custom）時方法、路徑、認證都可以改。

    export interface Replay {
        pathValues: Record<string, string>;
        queryValues: Record<string, string>;
        bodyText: string | null;
    }

    const props = defineProps<{
        endpoint: ApiEndpoint;
        /** 自訂請求：方法、路徑、認證可以改 */
        custom?: boolean;
        /** 從歷史紀錄重送：帶入當時的參數 */
        replay?: Replay | null;
        /** 跟這支共用同一段說明的其他端點（後端的 doc_md 是 api.md 的一節，幾支會拿到同一段） */
        siblings?: ApiEndpoint[];
    }>();

    const emit = defineEmits<{ sent: [entry: HistoryEntry]; select: [id: string] }>();

    const auth = useGoogleAuth();
    const { deviceKey } = useTestDevice();

    // #region [P] 表單狀態：換端點就重設成預設值（或歷史紀錄帶進來的值）

    const method = ref<HttpMethod>('GET');
    const rawPath = ref('');
    const authKind = ref<ApiAuth>('admin');
    const pathValues = ref<Record<string, string>>({});
    const queryValues = ref<Record<string, string>>({});
    const bodyText = ref('');
    const attachments = ref<Attachment[]>([]);
    const result = ref<SendResult | null>(null);
    const lastRequest = ref<{ method: string; path: string } | null>(null);
    const sending = ref(false);
    const confirmation = ref<Confirmation | null>(null);
    const confirmInput = ref('');
    const snippetKind = ref<'curl' | 'fetch'>('curl');
    const copied = ref('');
    const confirmEl = ref<HTMLInputElement>();
    let controller: AbortController | null = null;

    function reset() {
        const endpoint = props.endpoint;
        method.value = endpoint.method;
        rawPath.value = endpoint.path;
        authKind.value = endpoint.auth;
        pathValues.value = Object.fromEntries(endpoint.pathParams.map(param => [param.name, param.example === null ? '' : String(param.example)]));
        queryValues.value = Object.fromEntries(endpoint.query.map(param => [param.name, param.default === null ? '' : String(param.default)]));
        bodyText.value = exampleText(endpoint.body?.example);
        attachments.value = [];
        confirmation.value = null;
        clearResult();
        if (props.replay) {
            pathValues.value = { ...pathValues.value, ...props.replay.pathValues };
            queryValues.value = { ...queryValues.value, ...props.replay.queryValues };
            if (props.replay.bodyText !== null) bodyText.value = props.replay.bodyText;
        }
    }

    function clearResult() {
        if (result.value?.imageUrl) URL.revokeObjectURL(result.value.imageUrl);
        result.value = null;
    }

    watch(() => [props.endpoint, props.replay], reset, { immediate: true });
    onBeforeUnmount(() => {
        controller?.abort();
        clearResult();
    });

    // #endregion

    // #region [P] 組出來的請求

    const production = computed(() => isProductionApi());
    const pathParamNames = computed(() => [...rawPath.value.matchAll(/:([a-z_]\w*)/gi)].map(match => match[1]));
    const filled = computed(() => fillPath(rawPath.value, pathValues.value));
    const query = computed(() => buildQuery(props.endpoint.query, queryValues.value));
    const url = computed(() => `${apiBase()}${filled.value.path}${query.value}`);
    /** 有 body 的：目錄說有，或自訂請求不是 GET */
    const hasBody = computed(() => (props.custom ? method.value !== 'GET' : !!props.endpoint.body));
    const body = computed(() => (hasBody.value ? checkBody(bodyText.value) : { ok: true as const, value: undefined }));
    const finalBody = computed(() => (body.value.ok ? withAttachments(body.value.value, attachments.value, props.endpoint.body?.example) : undefined));

    const token = computed(() => {
        switch (authKind.value) {
            case 'admin':
            case 'google':
                return auth.credential.value;
            case 'device':
                return deviceKey.value || null;
            default:
                return null;
        }
    });

    /** 為什麼還不能送（空＝可以） */
    const blocker = computed(() => {
        if (!rawPath.value.startsWith('/')) return '路徑要從 / 開始';
        if (filled.value.missing.length) return `還沒填路徑參數：${filled.value.missing.join('、')}`;
        const missing = missingQuery(props.endpoint.query, queryValues.value);
        if (missing.length) return `還沒填必填的參數：${missing.join('、')}`;
        if (!body.value.ok) return 'body 不是正確的 JSON';
        if (authKind.value === 'device' && !deviceKey.value) return '這支要裝置的 API key：先在下面的「認證」用測試裝置';
        if ((authKind.value === 'admin' || authKind.value === 'google') && !token.value) return '登入過期，請重新登入';
        return '';
    });

    const effect = computed(() => (props.custom ? (method.value === 'GET' ? 'read' : 'write') : props.endpoint.effect));
    const adminCount = ref(0);
    const isAdminPath = computed(() => filled.value.path.startsWith('/v1/admin/'));

    const snippetInput = computed(() => ({ method: method.value, url: url.value, auth: authKind.value, body: finalBody.value, attachments: attachments.value }));
    const snippet = computed(() => (snippetKind.value === 'curl' ? toCurl(snippetInput.value) : toFetch(snippetInput.value)));

    // #endregion

    // #region [P] 送出

    function requestSend() {
        if (blocker.value || sending.value) return;
        const needed = confirmationFor({ effect: effect.value, method: method.value, path: rawPath.value }, production.value);
        if (needed) {
            confirmation.value = needed;
            confirmInput.value = '';
            // 要打字確認的，游標直接放進去（autofocus 對後來才出現的元素沒用）
            void nextTick(() => confirmEl.value?.focus());
            return;
        }
        void send();
    }

    function confirmSend() {
        if (!confirmation.value) return;
        if (confirmation.value.kind === 'type' && confirmInput.value.trim() !== confirmation.value.phrase) return;
        confirmation.value = null;
        void send();
    }

    async function send() {
        controller?.abort();
        controller = new AbortController();
        sending.value = true;
        clearResult();
        if (isAdminPath.value) recordAdminCall();
        adminCount.value = adminCallsInLastMinute();
        const sentPath = `${filled.value.path}${query.value}`;
        lastRequest.value = { method: method.value, path: rawPath.value };
        const response = await sendRequest({
            method: method.value,
            url: url.value,
            path: filled.value.path,
            token: authKind.value === 'none' ? null : token.value,
            body: finalBody.value,
            signal: controller.signal
        });
        sending.value = false;
        result.value = response;
        if (response.aborted) return;

        const entry: HistoryEntry = {
            id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            endpointId: props.custom ? '' : props.endpoint.id,
            method: method.value,
            path: sentPath,
            pathValues: { ...pathValues.value },
            queryValues: { ...queryValues.value },
            status: response.status,
            ms: Math.round(response.ms),
            at: new Date().toISOString()
        };
        if (hasBody.value) sessionBodies.set(entry.id, bodyText.value);
        emit('sent', entry);
    }

    function cancel() {
        controller?.abort();
    }

    // #endregion

    // #region [P] body 編輯器

    function formatBody() {
        if (body.value.ok && body.value.value !== undefined) bodyText.value = JSON.stringify(body.value.value, null, 2);
    }

    /** Tab 插兩個空白，不要跳到下一個欄位 */
    function onBodyKeydown(event: KeyboardEvent) {
        if (event.key !== 'Tab' || event.shiftKey) return;
        event.preventDefault();
        const el = event.target as HTMLTextAreaElement;
        const { selectionStart: start, selectionEnd: end } = el;
        bodyText.value = `${bodyText.value.slice(0, start)}  ${bodyText.value.slice(end)}`;
        requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
    }

    async function attach(field: string, event: Event) {
        const input = event.target as HTMLInputElement;
        for (const file of input.files ?? []) {
            const buffer = new Uint8Array(await file.arrayBuffer());
            let binary = '';
            for (let index = 0; index < buffer.length; index += 0x8000) binary += String.fromCharCode(...buffer.subarray(index, index + 0x8000));
            attachments.value = [...attachments.value, { field, fileName: file.name, size: file.size, base64: btoa(binary) }];
        }
        input.value = '';
    }

    const removeAttachment = (index: number) => {
        attachments.value = attachments.value.filter((_, i) => i !== index);
    };

    // #endregion

    async function copy(text: string, label: string) {
        try {
            await navigator.clipboard.writeText(text);
            copied.value = label;
            setTimeout(() => {
                if (copied.value === label) copied.value = '';
            }, 1500);
        } catch {
            copied.value = '瀏覽器不讓複製';
        }
    }

    function onKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            if (confirmation.value) confirmSend();
            else requestSend();
        }
        if (event.key === 'Escape' && confirmation.value) confirmation.value = null;
    }

    defineExpose({ requestSend });
</script>

<template>
    <div class="dd-api-ws" @keydown="onKeydown">
        <!-- #region [P] 標頭 -->
        <header class="dd-api-ws__head">
            <div class="dd-api-ws__title">
                <span class="dd-api-method" :class="`is-${method.toLowerCase()}`">{{ method }}</span>
                <code class="path">{{ custom ? '自訂請求' : endpoint.path }}</code>
            </div>
            <p v-if="!custom" class="dd-api-ws__summary">{{ endpoint.title }}</p>
            <ul class="dd-api-ws__tags">
                <li :class="`is-auth-${authKind}`">{{ AUTH_LABEL[authKind] }}</li>
                <li :class="`is-effect-${effect}`">{{ EFFECT_LABEL[effect] }}</li>
                <li v-if="!custom && endpoint.status === 'planned'" class="is-planned">規格已定、還沒上線</li>
                <li v-if="!custom && endpoint.rateLimit">限流：{{ endpoint.rateLimit }}</li>
                <li v-if="!custom && endpoint.timeout">逾時：{{ endpoint.timeout }}</li>
                <li v-if="hasContract(method, rawPath)" class="is-contract" title="回應會用後台畫面的解析規則檢查一次">契約檢查</li>
            </ul>
        </header>
        <!-- #endregion -->

        <div class="dd-api-ws__body">
            <!-- #region [P] 說明 -->
            <section v-if="!custom" class="dd-api-ws__doc" aria-label="說明">
                <p v-if="siblings?.length" class="dd-api-ws__siblings">
                    這段說明跟另外 {{ siblings.length }} 支共用：
                    <button v-for="other in siblings" :key="other.id" type="button" class="link" @click="emit('select', other.id)">
                        <span class="dd-api-method" :class="`is-${other.method.toLowerCase()}`">{{ other.method }}</span> <code>{{ other.path }}</code>
                    </button>
                </p>
                <MarkdownView v-if="endpoint.docMd" :source="endpoint.docMd" />
                <p v-else class="dd-api-ws__muted">後端的目錄沒有這支的說明。</p>

                <template v-if="endpoint.errors.length">
                    <h3>這支特有的錯誤</h3>
                    <table class="dd-api-ws__errors">
                        <tbody>
                            <tr v-for="item in endpoint.errors" :key="item.status">
                                <th><span class="dd-api-status" :class="`is-${Math.floor(item.status / 100)}xx`">{{ item.status }}</span></th>
                                <td>{{ item.meaning }}</td>
                            </tr>
                        </tbody>
                    </table>
                </template>

                <details v-if="endpoint.responseExample !== undefined && endpoint.responseExample !== null" class="dd-api-ws__example">
                    <summary>回應範例</summary>
                    <JsonTree :value="endpoint.responseExample" :open-depth="3" />
                </details>
            </section>
            <!-- #endregion -->

            <!-- #region [P] 試打 -->
            <section class="dd-api-ws__try" aria-label="試打">
                <div class="dd-api-ws__bar">
                    <span class="env" :class="{ 'is-production': production }" :title="apiBase()">{{ production ? '正式' : '本機' }}</span>
                    <template v-if="custom">
                        <select v-model="method" class="method-select" aria-label="方法">
                            <option v-for="item in HTTP_METHODS" :key="item" :value="item">{{ item }}</option>
                        </select>
                        <input v-model.trim="rawPath" class="path-input" placeholder="/v1/admin/devices?page=1" aria-label="路徑" spellcheck="false" />
                    </template>
                    <code v-else class="url" :title="url">{{ filled.path }}{{ query }}</code>
                    <button v-if="!sending" type="button" class="dd-admin__btn send" :disabled="!!blocker" :title="blocker || '送出（⌘/Ctrl + Enter）'" @click="requestSend">
                        送出 <kbd>⌘↵</kbd>
                    </button>
                    <button v-else type="button" class="dd-admin__btn dd-admin__btn--ghost send" @click="cancel">取消</button>
                </div>
                <p v-if="blocker" class="dd-api-ws__blocker">{{ blocker }}</p>
                <p v-if="isAdminPath && adminCount >= ADMIN_RATE_LIMIT - 5" class="dd-api-ws__warn">
                    這一分鐘這個分頁已經送了 {{ adminCount }} 次管理 API；後端每個 IP 每分鐘 {{ ADMIN_RATE_LIMIT }} 次（後台其他分頁也算），超過會回 429。
                </p>

                <!-- 送出前確認 -->
                <div v-if="confirmation" class="dd-api-ws__confirm" role="alertdialog" aria-label="確認送出">
                    <p>{{ confirmation.message }}</p>
                    <input v-if="confirmation.kind === 'type'" ref="confirmEl" v-model="confirmInput" :placeholder="confirmation.phrase" :aria-label="`輸入 ${confirmation.phrase} 確認`" @keydown.enter.prevent="confirmSend" />
                    <div class="actions">
                        <button type="button" class="dd-admin__btn dd-admin__btn--danger dd-admin__btn--small" :disabled="confirmation.kind === 'type' && confirmInput.trim() !== confirmation.phrase" @click="confirmSend">確定送出</button>
                        <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" @click="confirmation = null">取消</button>
                    </div>
                </div>

                <!-- 路徑參數 -->
                <fieldset v-if="pathParamNames.length" class="dd-api-ws__group">
                    <legend>路徑參數</legend>
                    <label v-for="name in pathParamNames" :key="name" class="dd-api-field">
                        <span class="name">{{ name }}<i aria-hidden="true">*</i></span>
                        <input v-model="pathValues[name]" spellcheck="false" :placeholder="endpoint.pathParams.find(p => p.name === name)?.description || name" />
                    </label>
                </fieldset>

                <!-- query -->
                <fieldset v-if="endpoint.query.length" class="dd-api-ws__group">
                    <legend>Query 參數</legend>
                    <label v-for="param in endpoint.query" :key="param.name" class="dd-api-field">
                        <span class="name">{{ param.name }}<i v-if="param.required" aria-hidden="true">*</i></span>
                        <select v-if="param.enum.length || param.type === 'boolean'" v-model="queryValues[param.name]">
                            <option value="">（不帶）</option>
                            <option v-for="option in (param.enum.length ? param.enum : ['true', 'false'])" :key="option" :value="option">{{ option }}</option>
                        </select>
                        <input v-else v-model="queryValues[param.name]" :inputmode="param.type === 'integer' || param.type === 'number' ? 'numeric' : undefined" spellcheck="false" :placeholder="param.default !== null ? `預設 ${param.default}` : param.type" />
                        <small v-if="param.description" class="hint">{{ param.description }}</small>
                    </label>
                </fieldset>

                <!-- body -->
                <fieldset v-if="hasBody" class="dd-api-ws__group">
                    <legend>
                        Body（JSON）
                        <span class="tools">
                            <button type="button" :disabled="!body.ok" @click="formatBody">整理格式</button>
                            <button v-if="!custom && endpoint.body" type="button" @click="bodyText = exampleText(endpoint.body.example)">還原範例</button>
                        </span>
                    </legend>
                    <textarea
                        v-model="bodyText"
                        class="dd-api-ws__editor"
                        :class="{ 'is-invalid': !body.ok }"
                        spellcheck="false"
                        :rows="Math.min(18, Math.max(4, bodyText.split('\n').length + 1))"
                        aria-label="Body"
                        @keydown="onBodyKeydown"
                    />
                    <p v-if="!body.ok" class="dd-api-ws__blocker">
                        {{ body.line ? `第 ${body.line} 行第 ${body.column} 字：` : '' }}{{ body.message }}
                    </p>
                    <div v-for="field in endpoint.body?.base64Fields ?? []" :key="field" class="dd-api-ws__attach">
                        <label class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small">
                            選檔案 → {{ field }}
                            <input type="file" accept="image/*,audio/*" multiple hidden @change="attach(field, $event)" />
                        </label>
                        <span class="hint">檔案轉成 base64 在送出時填進 <code>{{ field }}</code>，不放進編輯器</span>
                    </div>
                    <ul v-if="attachments.length" class="dd-api-ws__files">
                        <li v-for="(item, index) in attachments" :key="index">
                            <code>{{ item.field }}</code> {{ item.fileName }}（{{ formatBytes(item.size) }}）
                            <button type="button" aria-label="移除" @click="removeAttachment(index)">✕</button>
                        </li>
                    </ul>
                </fieldset>

                <!-- 認證 -->
                <fieldset class="dd-api-ws__group">
                    <legend>認證</legend>
                    <label v-if="custom" class="dd-api-field">
                        <span class="name">用哪一種</span>
                        <select v-model="authKind">
                            <option v-for="(label, key) in AUTH_LABEL" :key="key" :value="key">{{ label }}</option>
                        </select>
                    </label>
                    <p v-if="authKind === 'admin' || authKind === 'google'" class="dd-api-ws__muted">
                        用你登入的 Google 帳號（{{ auth.profile.value?.email ?? '管理員' }}）的 ID token。
                        <template v-if="authKind === 'google'">這支把 Google 帳號本身當身分：會作用在綁了這個帳號的裝置上。</template>
                    </p>
                    <TestDevicePanel v-else-if="authKind === 'device'" />
                    <p v-else class="dd-api-ws__muted">不帶任何憑證。</p>
                </fieldset>

                <ResponseView v-if="result && lastRequest" :result="result" :method="lastRequest.method" :path="lastRequest.path" :errors="custom ? [] : endpoint.errors" />
                <p v-else-if="sending" class="dd-api-ws__muted">送出中…</p>

                <!-- 複製成指令 -->
                <details class="dd-api-ws__snippet">
                    <summary>複製成指令</summary>
                    <div class="tabs" role="tablist">
                        <button type="button" role="tab" :aria-selected="snippetKind === 'curl'" :class="{ 'is-active': snippetKind === 'curl' }" @click="snippetKind = 'curl'">curl</button>
                        <button type="button" role="tab" :aria-selected="snippetKind === 'fetch'" :class="{ 'is-active': snippetKind === 'fetch' }" @click="snippetKind = 'fetch'">fetch</button>
                        <button type="button" class="copy" @click="copy(snippet, '已複製')">{{ copied || '複製' }}</button>
                    </div>
                    <pre><code>{{ snippet }}</code></pre>
                    <p class="dd-api-ws__muted">
                        憑證用環境變數代替，不會把你現在的 token 複製出去。管理 API 用 curl 時換成後端的 <code>ADMIN_TOKEN</code>。
                    </p>
                </details>
            </section>
            <!-- #endregion -->
        </div>
    </div>
</template>
