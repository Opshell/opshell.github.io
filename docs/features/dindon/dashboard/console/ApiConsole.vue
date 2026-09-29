<script setup lang="ts">
    import type { ApiAuth, ApiCatalog, ApiEffect, ApiEndpoint } from './catalog.schema';
    import type { Replay } from './EndpointWorkspace.vue';
    import type { HistoryEntry } from './history';
    import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
    import { adminApi, AdminApiError } from '../api';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import EndpointWorkspace from './EndpointWorkspace.vue';
    import { loadHistory, pushHistory, saveHistory, sessionBodies } from './history';
    import MarkdownView from './MarkdownView.vue';
    import { AUTH_LABEL, EFFECT_LABEL } from './request';

    // API 控制台（溝通板 #0074）：左邊是全部端點（搜尋、篩選、歷史），右邊是說明＋試打。
    // 目錄登入後才向後端拿（說明在私有倉庫，不寫死在這個公開網站）。目錄還沒上線時，「自訂請求」照樣能用。

    const call = useAdminCall();

    // #region [P] 目錄

    const catalog = shallowRef<ApiCatalog | null>(null);
    const loading = ref(false);
    const loadError = ref('');
    const notDeployed = ref(false);

    async function load() {
        loading.value = true;
        loadError.value = '';
        notDeployed.value = false;
        try {
            catalog.value = await call(token => adminApi.getApiCatalog(token));
            selectFromHash();
        } catch (error) {
            notDeployed.value = error instanceof AdminApiError && error.status === 404;
            loadError.value = notDeployed.value ? '' : errorMessage(error);
        } finally {
            loading.value = false;
        }
    }

    const endpoints = computed(() => catalog.value?.endpoints ?? []);
    const liveCount = computed(() => endpoints.value.filter(endpoint => endpoint.status === 'live').length);

    // #endregion

    // #region [P] 搜尋與篩選

    const search = ref('');
    const effects = ref<ApiEffect[]>([]);
    const auths = ref<ApiAuth[]>([]);
    const searchEl = ref<HTMLInputElement>();

    function toggle<T>(list: T[], value: T): T[] {
        return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
    }

    /** 空白分開的每個字都要出現在「方法 路徑 標題 章節」裡：輸入 post feedback 就找得到 */
    const filtered = computed(() => {
        const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
        const groupTitle = new Map(catalog.value?.groups.map(group => [group.id, group.title]) ?? []);
        return endpoints.value.filter((endpoint) => {
            if (effects.value.length && !effects.value.includes(endpoint.effect)) return false;
            if (auths.value.length && !auths.value.includes(endpoint.auth)) return false;
            const haystack = `${endpoint.method} ${endpoint.path} ${endpoint.title} ${groupTitle.get(endpoint.group) ?? ''} ${endpoint.id}`.toLowerCase();
            return words.every(word => haystack.includes(word));
        });
    });

    const grouped = computed(() => (catalog.value?.groups ?? [])
        .map(group => ({ ...group, items: filtered.value.filter(endpoint => endpoint.group === group.id) }))
        .filter(group => group.items.length));

    // #endregion

    // #region [P] 選擇：通用約定、自訂請求、某一支端點；網址 #api/<id> 可以直接分享

    const selected = ref<string>('conventions');
    const replay = shallowRef<Replay | null>(null);
    const customPreset = ref<{ method: ApiEndpoint['method']; path: string }>({ method: 'GET', path: '/v1/admin/devices?page=1' });
    const activeIndex = ref(-1);
    const sideTab = ref<'endpoints' | 'history'>('endpoints');
    const listOpen = ref(false);

    const current = computed(() => endpoints.value.find(endpoint => endpoint.id === selected.value) ?? null);
    const customEndpoint = computed<ApiEndpoint>(() => ({
        id: 'custom',
        group: 'custom',
        method: customPreset.value.method,
        path: customPreset.value.path,
        title: '自訂請求',
        status: 'live',
        auth: 'admin',
        effect: customPreset.value.method === 'GET' ? 'read' : 'write',
        pathParams: [],
        query: [],
        body: customPreset.value.method === 'GET' ? null : { example: {}, base64Fields: [] },
        responseExample: null,
        errors: [],
        rateLimit: '',
        timeout: '',
        docMd: ''
    }));

    function select(id: string, withReplay: Replay | null = null) {
        selected.value = id;
        replay.value = withReplay;
        listOpen.value = false;
        history.replaceState(null, '', id === 'conventions' ? '#api' : `#api/${encodeURIComponent(id)}`);
    }

    function selectFromHash() {
        const id = decodeURIComponent(location.hash.match(/^#api\/(.+)$/)?.[1] ?? '');
        if (id === 'custom' || endpoints.value.some(endpoint => endpoint.id === id)) selected.value = id;
    }

    /** 搜尋框裡上下鍵移動、Enter 打開 */
    function onSearchKeydown(event: KeyboardEvent) {
        const list = filtered.value;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!list.length) return;
            const step = event.key === 'ArrowDown' ? 1 : -1;
            activeIndex.value = (activeIndex.value + step + list.length) % list.length;
            void nextTick(() => document.querySelector('.dd-api-list__item.is-cursor')?.scrollIntoView({ block: 'nearest' }));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const target = list[activeIndex.value] ?? list[0];
            if (target) select(target.id);
        } else if (event.key === 'Escape') {
            search.value = '';
            activeIndex.value = -1;
        }
    }

    /** 在任何地方按 / 跳到搜尋框（正在打字的時候不算） */
    function onGlobalKeydown(event: KeyboardEvent) {
        if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest('input, textarea, select, [contenteditable]')) return;
        event.preventDefault();
        sideTab.value = 'endpoints';
        listOpen.value = true;
        void nextTick(() => searchEl.value?.focus());
    }

    // #endregion

    // #region [P] 歷史

    const historyEntries = ref<HistoryEntry[]>([]);

    function onSent(entry: HistoryEntry) {
        historyEntries.value = pushHistory(historyEntries.value, entry);
        saveHistory(historyEntries.value);
    }

    function openHistory(entry: HistoryEntry) {
        const withReplay = { pathValues: entry.pathValues, queryValues: entry.queryValues, bodyText: sessionBodies.get(entry.id) ?? null };
        if (!entry.endpointId) {
            customPreset.value = { method: entry.method as ApiEndpoint['method'], path: entry.path };
            select('custom', withReplay);
            return;
        }
        if (!endpoints.value.some(endpoint => endpoint.id === entry.endpointId)) return;
        select(entry.endpointId, withReplay);
    }

    function clearHistory() {
        historyEntries.value = [];
        sessionBodies.clear();
        saveHistory([]);
    }

    const timeFormat = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

    // #endregion

    onMounted(() => {
        historyEntries.value = loadHistory();
        if (location.hash === '#api/custom') selected.value = 'custom';
        void load();
        document.addEventListener('keydown', onGlobalKeydown);
    });
    onBeforeUnmount(() => document.removeEventListener('keydown', onGlobalKeydown));
</script>

<template>
    <div class="dd-api">
        <!-- #region [P] 左：端點清單 -->
        <aside class="dd-api__side" :class="{ 'is-open': listOpen }">
            <button type="button" class="dd-api__side-toggle" :aria-expanded="listOpen" @click="listOpen = !listOpen">
                {{ listOpen ? '收起清單' : `全部端點（${endpoints.length}）` }}
            </button>

            <div class="dd-api__side-body">
                <div class="dd-api__search">
                    <input
                        ref="searchEl"
                        v-model="search"
                        type="search"
                        placeholder="搜尋路徑、名稱… 按 / 跳到這裡"
                        aria-label="搜尋端點"
                        spellcheck="false"
                        @input="activeIndex = -1"
                        @keydown="onSearchKeydown"
                    />
                </div>

                <div class="dd-api__filters" aria-label="篩選">
                    <button
                        v-for="(label, key) in EFFECT_LABEL"
                        :key="key"
                        type="button"
                        class="chip"
                        :class="[`is-effect-${key}`, { 'is-on': effects.includes(key) }]"
                        :aria-pressed="effects.includes(key)"
                        @click="effects = toggle(effects, key)"
                    >
                        {{ label }}
                    </button>
                    <button
                        v-for="(label, key) in AUTH_LABEL"
                        :key="key"
                        type="button"
                        class="chip"
                        :class="{ 'is-on': auths.includes(key) }"
                        :aria-pressed="auths.includes(key)"
                        @click="auths = toggle(auths, key)"
                    >
                        {{ label }}
                    </button>
                </div>

                <div class="dd-api__side-tabs" role="tablist">
                    <button type="button" role="tab" :aria-selected="sideTab === 'endpoints'" :class="{ 'is-active': sideTab === 'endpoints' }" @click="sideTab = 'endpoints'">端點</button>
                    <button type="button" role="tab" :aria-selected="sideTab === 'history'" :class="{ 'is-active': sideTab === 'history' }" @click="sideTab = 'history'">
                        歷史 <span v-if="historyEntries.length" class="count">{{ historyEntries.length }}</span>
                    </button>
                </div>

                <nav v-if="sideTab === 'endpoints'" class="dd-api-list" aria-label="端點">
                    <button type="button" class="dd-api-list__item dd-api-list__item--special" :class="{ 'is-active': selected === 'conventions' }" @click="select('conventions')">
                        <span class="icon" aria-hidden="true">§</span><span class="title">通用約定與總覽</span>
                    </button>
                    <button type="button" class="dd-api-list__item dd-api-list__item--special" :class="{ 'is-active': selected === 'custom' }" @click="select('custom')">
                        <span class="icon" aria-hidden="true">✎</span><span class="title">自訂請求</span>
                    </button>

                    <p v-if="loading" class="dd-api__muted">讀取目錄中…</p>
                    <p v-else-if="catalog && !filtered.length" class="dd-api__muted">沒有符合的端點</p>

                    <section v-for="group in grouped" :key="group.id" class="dd-api-list__group">
                        <h3>{{ group.title }} <span>{{ group.items.length }}</span></h3>
                        <button
                            v-for="endpoint in group.items"
                            :key="endpoint.id"
                            type="button"
                            class="dd-api-list__item"
                            :class="{ 'is-active': selected === endpoint.id, 'is-cursor': filtered[activeIndex]?.id === endpoint.id, 'is-planned': endpoint.status === 'planned' }"
                            :title="endpoint.title"
                            @click="select(endpoint.id)"
                        >
                            <span class="dd-api-method" :class="`is-${endpoint.method.toLowerCase()}`">{{ endpoint.method }}</span>
                            <span class="body">
                                <code class="path">{{ endpoint.path }}</code>
                                <span class="title">{{ endpoint.title }}</span>
                            </span>
                            <span v-if="endpoint.effect !== 'read'" class="effect-dot" :class="`is-effect-${endpoint.effect}`" :title="EFFECT_LABEL[endpoint.effect]" />
                        </button>
                    </section>
                </nav>

                <div v-else class="dd-api-list" aria-label="歷史">
                    <p v-if="!historyEntries.length" class="dd-api__muted">還沒送過請求。</p>
                    <button v-for="entry in historyEntries" :key="entry.id" type="button" class="dd-api-list__item dd-api-list__item--history" @click="openHistory(entry)">
                        <span class="dd-api-method" :class="`is-${entry.method.toLowerCase()}`">{{ entry.method }}</span>
                        <span class="body">
                            <code class="path">{{ entry.path }}</code>
                            <span class="title">{{ timeFormat.format(new Date(entry.at)) }} · {{ entry.ms }} ms<template v-if="sessionBodies.has(entry.id)"> · 有 body</template></span>
                        </span>
                        <span class="dd-api-status" :class="`is-${Math.floor(entry.status / 100)}xx`">{{ entry.status || '—' }}</span>
                    </button>
                    <p v-if="historyEntries.length" class="dd-api__muted">
                        只記路徑與狀態碼；body 與回應可能有使用者的資料，只留在這個分頁，重新整理就沒了。
                        <button type="button" class="link" @click="clearHistory">清除紀錄</button>
                    </p>
                </div>
            </div>
        </aside>
        <!-- #endregion -->

        <!-- #region [P] 右：說明＋試打 -->
        <div class="dd-api__main">
            <EndpointWorkspace v-if="selected === 'custom'" :endpoint="customEndpoint" custom :replay="replay" @sent="onSent" />
            <EndpointWorkspace v-else-if="current" :endpoint="current" :replay="replay" @sent="onSent" />

            <section v-else class="dd-api__overview">
                <div class="dd-api__status">
                    <template v-if="catalog">
                        <p><strong>{{ endpoints.length }}</strong> 支端點，{{ liveCount }} 支上線<template v-if="endpoints.length - liveCount">、{{ endpoints.length - liveCount }} 支規格已定還沒做</template>。</p>
                        <p v-if="catalog.revision" class="dd-api__muted">目錄版本：<code>{{ catalog.revision }}</code></p>
                    </template>
                    <div v-else-if="notDeployed" class="dd-api__notice">
                        <p><strong>後端還沒提供 API 目錄</strong>（溝通板 #0074）。說明在私有的後端倉庫，要等後端加上管理員專用的目錄才會出現在這裡。</p>
                        <p>在那之前可以用清單裡的「自訂請求」直接打管理 API（<code>/v1/admin/*</code>）。</p>
                    </div>
                    <p v-else-if="loadError" class="dd-admin__error" role="alert">{{ loadError }}</p>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="loading" @click="load">{{ loading ? '讀取中…' : '重新讀取目錄' }}</button>
                </div>

                <div class="dd-api__keys">
                    <h3>操作</h3>
                    <dl>
                        <div><dt><kbd>/</kbd></dt><dd>跳到搜尋</dd></div>
                        <div><dt><kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd></dt><dd>在搜尋結果裡選一支</dd></div>
                        <div><dt><kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd></dt><dd>送出</dd></div>
                        <div><dt>點 JSON 的 key</dt><dd>複製那個欄位的路徑（例如 <code>devices[0].id</code>）</dd></div>
                        <div><dt>網址</dt><dd>每支端點有自己的網址（<code>#api/…</code>），可以直接分享</dd></div>
                    </dl>
                    <p class="dd-api__muted">
                        正式環境：寫入與呼叫 AI 的會先問一次，不可逆的要打字確認。回應會標出狀態碼的意思，後台畫面在用的端點會多做一次「契約檢查」，後端格式改了會先在這裡看到。
                    </p>
                </div>

                <MarkdownView v-if="catalog?.conventionsMd" :source="catalog.conventionsMd" class="dd-api__conventions" />
            </section>
        </div>
        <!-- #endregion -->
    </div>
</template>

<style lang="scss">
    // API 控制台。顏色跟著網站的淺色／深色；方法的顏色照一般 API 工具的習慣（GET 綠、POST 藍、PATCH 橘、DELETE 紅）
    .dd-api {
        --dd-api-get: #0b7f4f;
        --dd-api-post: #1d59bb;
        --dd-api-put: #7045b8;
        --dd-api-patch: #a85a00;
        --dd-api-delete: #c2342b;
        --dd-api-mono: var(--vp-font-family-mono);
        display: grid;
        grid-template-columns: 300px minmax(0, 1fr);
        gap: 24px;
        align-items: start;
        @include setRWD(1100px) { grid-template-columns: minmax(0, 1fr); }

        code, kbd { font-family: var(--dd-api-mono); }
        kbd {
            background: var(--vp-c-bg-alt);
            padding: 0 5px;
            border: 1px solid var(--vp-c-divider);
            border-bottom-width: 2px;
            border-radius: 4px;
            font-size: 11px;
        }
        .link {
            background: none;
            padding: 0;
            border: 0;
            color: var(--vp-c-brand-1);
            font: inherit;
            text-decoration: underline;
            cursor: pointer;
        }

        // #region [P] 左側清單
        &__side {
            position: sticky;
            top: 16px;
            @include setRWD(1100px) { position: static; }
        }
        &__side-toggle {
            display: none;
            background: var(--vp-c-bg-alt);
            width: 100%;
            padding: 10px 14px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 10px;
            color: var(--vp-c-text-1);
            font-weight: 600;
            text-align: left;
            cursor: pointer;
            @include setRWD(1100px) { display: block; }
        }
        &__side-body {
            @include setFlex(flex-start, stretch, 10px, column);
            max-height: calc(100vh - 32px);
            @include setRWD(1100px) {
                display: none;
                max-height: 70vh;
                margin-top: 8px;
            }
        }
        &__side.is-open &__side-body { display: flex; }
        &__search input {
            background: var(--vp-c-bg);
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 10px;
            font-size: var(--font-size-s);

            &:focus {
                border-color: var(--vp-c-brand-1);
                outline: none;
            }
        }
        &__filters {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;

            .chip {
                background: transparent;
                padding: 1px 9px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 999px;
                color: var(--vp-c-text-2);
                font-size: 12px;
                cursor: pointer;

                &.is-on {
                    background: var(--vp-c-brand-soft);
                    border-color: var(--vp-c-brand-1);
                    color: var(--vp-c-text-1);
                }
            }
        }
        &__side-tabs {
            display: flex;
            gap: 4px;
            border-bottom: 1px solid var(--vp-c-divider);

            button {
                background: none;
                padding: 6px 10px;
                border: 0;
                border-bottom: 2px solid transparent;
                margin-bottom: -1px;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
                font-weight: 600;
                cursor: pointer;

                &.is-active {
                    border-bottom-color: var(--vp-c-brand-1);
                    color: var(--vp-c-text-1);
                }
            }
            .count {
                color: var(--vp-c-text-3);
                font-weight: 400;
            }
        }
        &__muted {
            padding: 8px 4px;
            color: var(--vp-c-text-2);
            font-size: 12px;
        }

        // #endregion

        // #region [P] 右側：總覽
        &__main { min-width: 0; }
        &__overview {
            @include setFlex(flex-start, stretch, 24px, column);
        }
        &__status {
            @include setFlex(flex-start, flex-start, 8px, column);
        }
        &__notice {
            @include setFlex(flex-start, flex-start, 6px, column);
            background: var(--vp-c-warning-soft);
            padding: 14px 16px;
            border-radius: 10px;
            font-size: var(--font-size-s);
        }
        &__keys {
            padding: 16px 18px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 12px;

            h3 {
                margin-bottom: 10px;
                font-size: var(--font-size-m);
            }
            dl {
                display: grid;
                gap: 6px;
                margin: 0 0 8px;
                font-size: var(--font-size-s);

                div {
                    display: grid;
                    grid-template-columns: 200px 1fr;
                    gap: 12px;
                    @include setRWD(640px) {
                        grid-template-columns: 1fr;
                        gap: 0;
                    }
                }
                dd {
                    margin: 0;
                    color: var(--vp-c-text-2);
                }
            }
        }
        &__conventions {
            padding-top: 8px;
            border-top: 1px solid var(--vp-c-divider);
        }

        // #endregion
    }

    // 方法標籤：清單、標頭、歷史共用
    .dd-api-method {
        flex-shrink: 0;
        display: inline-block;
        min-width: 52px;
        padding: 1px 0;
        border-radius: 4px;
        color: #fff;
        font-family: var(--vp-font-family-mono);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .02em;
        text-align: center;

        &.is-get { background: var(--dd-api-get); }
        &.is-post { background: var(--dd-api-post); }
        &.is-put { background: var(--dd-api-put); }
        &.is-patch { background: var(--dd-api-patch); }
        &.is-delete { background: var(--dd-api-delete); }
    }

    // 狀態碼標籤
    .dd-api-status {
        flex-shrink: 0;
        padding: 1px 7px;
        border-radius: 4px;
        font-family: var(--vp-font-family-mono);
        font-size: 12px;
        font-weight: 700;

        &.is-2xx {
            background: color-mix(in srgb, var(--dd-api-get, #0b7f4f) 16%, transparent);
            color: var(--dd-api-get, #0b7f4f);
        }
        &.is-4xx {
            background: var(--vp-c-warning-soft);
            color: var(--vp-c-warning-1);
        }
        &.is-5xx, &.is-0xx {
            background: var(--vp-c-danger-soft);
            color: var(--vp-c-danger-1);
        }
        &.is-3xx, &.is-1xx {
            background: var(--vp-c-default-soft);
            color: var(--vp-c-text-2);
        }
    }

    // #region [P] 清單項目
    .dd-api-list {
        @include setFlex(flex-start, stretch, 2px, column);
        min-height: 0;
        padding-right: 4px;
        overflow-y: auto;
        overscroll-behavior: contain;

        &__group {
            margin-top: 10px;

            h3 {
                @include setFlex(space-between, center);
                padding: 4px 8px;
                color: var(--vp-c-text-3);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: .06em;
                text-transform: uppercase;
            }
        }
        &__item {
            @include setFlex(flex-start, flex-start, 8px);
            background: transparent;
            width: 100%;
            padding: 6px 8px;
            border: 0;
            border-radius: 8px;
            color: var(--vp-c-text-1);
            text-align: left;
            cursor: pointer;

            .body {
                @include setFlex(flex-start, stretch, 0, column);
                flex: 1;
                min-width: 0;
            }
            .path {
                font-size: 12px;
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }
            .title {
                color: var(--vp-c-text-2);
                font-size: 12px;
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }
            .icon {
                width: 20px;
                color: var(--vp-c-text-3);
                text-align: center;
            }
            .dd-api-method { margin-top: 2px; }
            &:hover { background: var(--vp-c-default-soft); }
            &:focus-visible {
                outline: 2px solid var(--vp-c-brand-1);
                outline-offset: -2px;
            }
            &.is-cursor { background: var(--vp-c-default-soft); }
            &.is-active {
                background: var(--vp-c-brand-soft);

                .title { color: var(--vp-c-text-1); }
            }
            &.is-planned { opacity: .55; }
            &--special {
                align-items: center;

                .title {
                    color: var(--vp-c-text-1);
                    font-size: var(--font-size-s);
                    font-weight: 600;
                }
            }
        }
    }
    .effect-dot {
        flex-shrink: 0;
        @include setSize(8px, 8px);
        border-radius: 50%;
        margin-top: 7px;
    }
    .is-effect-write.effect-dot { background: var(--dd-api-patch); }
    .is-effect-ai.effect-dot { background: var(--dd-api-put); }
    .is-effect-irreversible.effect-dot { background: var(--dd-api-delete); }

    // #endregion

    // #region [P] 工作區
    .dd-api-ws {
        &__head {
            @include setFlex(flex-start, flex-start, 8px, column);
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vp-c-divider);
            margin-bottom: 20px;
        }
        &__title {
            @include setFlex(flex-start, center, 10px);
            flex-wrap: wrap;

            .path {
                font-size: var(--font-size-l);
                font-weight: 700;
                word-break: break-all;
            }
            .dd-api-method {
                min-width: 60px;
                font-size: 13px;
            }
        }
        &__summary {
            color: var(--vp-c-text-2);
        }
        &__tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            padding: 0;
            margin: 0;
            list-style: none;

            li {
                background: var(--vp-c-default-soft);
                padding: 1px 9px;
                border-radius: 999px;
                color: var(--vp-c-text-2);
                font-size: 12px;
            }
            .is-effect-write {
                background: color-mix(in srgb, var(--dd-api-patch) 16%, transparent);
                color: var(--dd-api-patch);
            }
            .is-effect-ai {
                background: color-mix(in srgb, var(--dd-api-put) 16%, transparent);
                color: var(--dd-api-put);
            }
            .is-effect-irreversible {
                background: var(--vp-c-danger-soft);
                color: var(--vp-c-danger-1);
                font-weight: 700;
            }
            .is-planned {
                background: var(--vp-c-warning-soft);
                color: var(--vp-c-warning-1);
            }
            .is-contract {
                background: var(--vp-c-brand-soft);
                color: var(--vp-c-brand-1);
            }
        }

        // 寬的時候說明與試打並排；窄的時候說明在上
        &__body {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
            gap: 28px;
            align-items: start;
            @include setRWD(1400px) { grid-template-columns: minmax(0, 1fr); }
        }
        &__doc {
            @include setFlex(flex-start, stretch, 14px, column);

            h3 { font-size: var(--font-size-m); }
        }
        &__errors {
            border-collapse: collapse;
            font-size: var(--font-size-s);

            th, td {
                padding: 4px 10px 4px 0;
                text-align: left;
                vertical-align: top;
            }
        }
        &__example summary {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            font-weight: 600;
            cursor: pointer;
        }
        &__try {
            @include setFlex(flex-start, stretch, 14px, column);
            position: sticky;
            top: 16px;
            @include setRWD(1400px) { position: static; }
        }

        // 網址列：環境＋網址＋送出
        &__bar {
            @include setFlex(flex-start, center, 8px);
            background: var(--vp-c-bg-alt);
            padding: 6px 6px 6px 8px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 12px;

            .env {
                flex-shrink: 0;
                background: var(--vp-c-default-soft);
                padding: 2px 8px;
                border-radius: 6px;
                color: var(--vp-c-text-2);
                font-size: 12px;
                font-weight: 700;

                &.is-production {
                    background: var(--vp-c-danger-soft);
                    color: var(--vp-c-danger-1);
                }
            }
            .url {
                flex: 1;
                min-width: 0;
                font-size: 13px;
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }
            .method-select, .path-input {
                background: var(--vp-c-bg);
                padding: 4px 8px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 6px;
                font-family: var(--dd-api-mono);
                font-size: 13px;
            }
            .path-input {
                flex: 1;
                min-width: 0;
            }
            .send {
                flex-shrink: 0;
                @include setFlex(center, center, 6px);

                kbd {
                    background: rgb(255 255 255 / 20%);
                    border-color: rgb(255 255 255 / 30%);
                    color: inherit;
                }
            }
        }
        &__blocker {
            color: var(--vp-c-danger-1);
            font-size: 12px;
        }
        &__warn {
            background: var(--vp-c-warning-soft);
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
        }
        &__confirm {
            @include setFlex(flex-start, stretch, 10px, column);
            background: var(--vp-c-danger-soft);
            padding: 14px 16px;
            border: 1px solid var(--vp-c-danger-1);
            border-radius: 10px;
            font-size: var(--font-size-s);

            input {
                background: var(--vp-c-bg);
                max-width: 200px;
                padding: 4px 10px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 6px;
                font-family: var(--dd-api-mono);
            }
            .actions {
                display: flex;
                gap: 8px;
            }
        }
        &__group {
            @include setFlex(flex-start, stretch, 8px, column);
            min-width: 0;
            padding: 0;
            border: 0;
            margin: 0;

            legend {
                @include setFlex(space-between, center, 8px);
                width: 100%;
                margin-bottom: 8px;
                color: var(--vp-c-text-2);
                font-size: 12px;
                font-weight: 700;
                letter-spacing: .04em;
            }
            .tools {
                display: flex;
                gap: 10px;

                button {
                    background: none;
                    padding: 0;
                    border: 0;
                    color: var(--vp-c-brand-1);
                    font-size: 12px;
                    cursor: pointer;

                    &:disabled {
                        color: var(--vp-c-text-3);
                        cursor: not-allowed;
                    }
                }
            }
        }
        &__editor {
            background: var(--vp-c-bg-alt);
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            font-family: var(--dd-api-mono);
            font-size: 12.5px;
            line-height: 1.6;
            tab-size: 2;
            resize: vertical;

            &:focus {
                border-color: var(--vp-c-brand-1);
                outline: none;
            }
            &.is-invalid { border-color: var(--vp-c-danger-1); }
        }
        &__attach {
            @include setFlex(flex-start, center, 10px);
            flex-wrap: wrap;

            .hint {
                color: var(--vp-c-text-3);
                font-size: 12px;
            }
        }
        &__files {
            padding: 0;
            margin: 0;
            font-size: 12px;
            list-style: none;

            button {
                background: none;
                border: 0;
                color: var(--vp-c-text-3);
                cursor: pointer;
            }
        }
        &__device .row {
            display: flex;
            gap: 8px;
            margin-top: 6px;

            input {
                flex: 1;
                background: var(--vp-c-bg);
                padding: 4px 10px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 6px;
            }
        }
        &__muted {
            color: var(--vp-c-text-2);
            font-size: 12px;
            line-height: 1.6;
        }
        &__snippet {
            summary {
                color: var(--vp-c-text-2);
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            }
            .tabs {
                display: flex;
                gap: 4px;
                margin: 8px 0 6px;

                button {
                    background: none;
                    padding: 2px 10px;
                    border: 1px solid transparent;
                    border-radius: 6px;
                    color: var(--vp-c-text-2);
                    font-size: 12px;
                    cursor: pointer;

                    &.is-active {
                        border-color: var(--vp-c-divider);
                        color: var(--vp-c-text-1);
                    }
                }
                .copy {
                    margin-left: auto;
                    color: var(--vp-c-brand-1);
                }
            }
            pre {
                background: var(--vp-c-bg-alt);
                padding: 10px 12px;
                border-radius: 8px;
                margin: 0 0 6px;
                font-size: 12px;
                white-space: pre-wrap;
                word-break: break-all;
            }
        }
    }

    // 表單欄位：名稱＋輸入＋說明
    .dd-api-field {
        display: grid;
        grid-template-columns: 140px minmax(0, 1fr);
        gap: 2px 12px;
        align-items: center;
        font-size: var(--font-size-s);
        @include setRWD(640px) { grid-template-columns: minmax(0, 1fr); }

        .name {
            font-family: var(--vp-font-family-mono);
            font-size: 12.5px;
            word-break: break-all;

            i {
                color: var(--vp-c-danger-1);
                font-style: normal;
            }
        }
        input, select {
            background: var(--vp-c-bg);
            width: 100%;
            padding: 5px 10px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 6px;
            font-family: var(--vp-font-family-mono);
            font-size: 12.5px;

            &:focus {
                border-color: var(--vp-c-brand-1);
                outline: none;
            }
        }
        .hint {
            grid-column: 2;
            color: var(--vp-c-text-3);
            font-size: 12px;
            @include setRWD(640px) { grid-column: 1; }
        }
    }

    // #endregion

    // #region [P] 回應
    .dd-api-res {
        border: 1px solid var(--vp-c-divider);
        border-radius: 12px;
        overflow: hidden;

        &.is-ok { border-color: color-mix(in srgb, var(--dd-api-get) 45%, var(--vp-c-divider)); }
        &.is-fail { border-color: var(--vp-c-danger-1); }
        &__head {
            @include setFlex(flex-start, center, 10px);
            flex-wrap: wrap;
            background: var(--vp-c-bg-alt);
            padding: 10px 14px;
            font-size: var(--font-size-s);

            .meaning {
                flex: 1;
                min-width: 0;
            }
            .stats {
                color: var(--vp-c-text-2);
                font-size: 12px;
            }
        }
        &__error {
            padding: 10px 14px;
            border-top: 1px solid var(--vp-c-divider);
            font-weight: 600;
        }
        &__contract {
            padding: 8px 14px;
            border-top: 1px solid var(--vp-c-divider);
            font-size: 12px;

            &.is-ok { color: var(--dd-api-get); }
            &.is-bad {
                background: var(--vp-c-danger-soft);
                color: var(--vp-c-danger-1);
            }
            ul {
                padding-left: 1.2em;
                margin: 4px 0 0;
            }
        }
        &__tabs {
            @include setFlex(flex-start, center, 4px);
            flex-wrap: wrap;
            padding: 6px 10px;
            border-top: 1px solid var(--vp-c-divider);
            border-bottom: 1px solid var(--vp-c-divider);

            button {
                background: none;
                padding: 2px 10px;
                border: 1px solid transparent;
                border-radius: 6px;
                color: var(--vp-c-text-2);
                font-size: 12px;
                cursor: pointer;

                &.is-active {
                    border-color: var(--vp-c-divider);
                    color: var(--vp-c-text-1);
                }
                &:disabled {
                    color: var(--vp-c-text-3);
                    cursor: not-allowed;
                }
            }
            .spacer { flex: 1; }
            .copied {
                color: var(--dd-api-get);
                font-size: 12px;
            }
        }
        &__body {
            max-height: 60vh;
            padding: 12px 14px;
            overflow: auto;

            pre {
                margin: 0;
                font-size: 12.5px;
                white-space: pre-wrap;
                word-break: break-all;
            }
        }
        &__image {
            max-width: 100%;
            max-height: 360px;
            border-radius: 8px;
        }
        &__headers {
            border-collapse: collapse;
            font-family: var(--vp-font-family-mono);
            font-size: 12px;

            th, td {
                padding: 3px 12px 3px 0;
                text-align: left;
                word-break: break-all;
                vertical-align: top;
            }
            th { color: var(--vp-c-text-2); }
        }
    }

    // #endregion

    .dark .dd-api {
        --dd-api-get: #3fbf83;
        --dd-api-post: #5a9bef;
        --dd-api-put: #a585e6;
        --dd-api-patch: #e59a3c;
        --dd-api-delete: #f0736a;

        .dd-api-method { color: #14120e; }
    }
</style>
