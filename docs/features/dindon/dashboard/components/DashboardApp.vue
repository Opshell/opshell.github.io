<script setup lang="ts">
    import type { DashboardTab, PanelPreset } from '../navigation';
    import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { useGoogleAuth } from '../../useGoogleAuth';
    import { setPanelPreset } from '../navigation';
    import { usePulse } from '../usePulse';
    import DeviceManager from './DeviceManager.vue';
    import FeatureVotePanel from './FeatureVotePanel.vue';
    import FeedbackPanel from './FeedbackPanel.vue';
    import OverviewPanel from './OverviewPanel.vue';
    import PromoPanel from './PromoPanel.vue';
    import UsageReport from './UsageReport.vue';
    import UsageWatch from './UsageWatch.vue';

    // API 控制台用到 markdown-it，點進去才載入，不拖慢其他分頁
    const ApiConsole = defineAsyncComponent(() => import('../console/ApiConsole.vue'));

    const auth = useGoogleAuth();
    const { isSignedIn, profile, expired, loadError } = auth;
    const pulse = usePulse();

    // 圖示是 24×24 的線條路徑（照 lucide 的畫法手寫），不為了七個圖示裝一整個圖示套件
    const ICONS = {
        overview: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
        devices: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M11 18h2',
        feedback: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M8 9h8 M8 13h5',
        usage: 'M3 3v18h18 M8 17v-6 M13 17V7 M18 17v-3',
        watch: 'M22 12h-4l-3 9L9 3l-3 9H2',
        promo: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z M13 5v2 M13 11v2 M13 17v2',
        features: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 12l2 2 4-4',
        api: 'M4 17l6-6-6-6 M12 19h8',
        refresh: 'M21 12a9 9 0 1 1-2.64-6.36L21 8 M21 3v5h-5'
    } as const;

    // 分頁記在網址的 # 後面，重新整理會停在同一頁；總覽是預設，不帶 #
    const TABS: readonly { key: DashboardTab; label: string; hint: string }[] = [
        { key: 'overview', label: '總覽', hint: '現在要處理什麼、有多少人在用、花了多少' },
        { key: 'devices', label: '裝置', hint: '找一台裝置，看它的方案、額度與紀錄' },
        { key: 'feedback', label: '回報', hint: '審 bug 與建議，合併成問題' },
        { key: 'usage', label: '用量報表', hint: '各功能的請求、延遲與成本' },
        { key: 'watch', label: '用量監看', hint: '逐台看 AI 用量，提示不是判決' },
        { key: 'promo', label: '優惠碼', hint: '送方案時間或額度點數' },
        { key: 'features', label: '功能投票', hint: '測試者投票決定下一個做什麼' },
        { key: 'api', label: 'API', hint: '每一支 API 的說明，直接在這裡試打' }
    ];
    type Tab = DashboardTab;
    const tab = ref<Tab>('overview');
    const current = computed(() => TABS.find(t => t.key === tab.value)!);
    const buttonEl = ref<HTMLElement>();

    /** 側欄上的數字：只有「要去處理」的才顯示，其他分頁不放數字，免得每個都在喊 */
    const badges = computed<Partial<Record<Tab, number>>>(() => ({
        feedback: pulse.pendingReports.value ?? 0,
        watch: pulse.flaggedDevices.value?.length ?? 0
    }));

    const timeFormat = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false });

    // 被別的頁面用 iframe 嵌進來時什麼都不做。後台跟部落格同一個來源，別頁的第三方腳本
    // 嵌進來就能讀到裡面的東西（溝通板 #20）。GitHub Pages 設不了 frame-ancestors 標頭，只能在這裡擋。
    const framed = ref(false);

    /** preset：跳過去時要先套用的篩選（總覽點「已凍結」→ 裝置頁只看凍結的） */
    function selectTab(next: Tab, preset?: PanelPreset) {
        setPanelPreset(preset);
        tab.value = next;
        history.replaceState(null, '', next === 'overview' ? location.pathname + location.search : `#${next}`);
        window.scrollTo({ top: 0 });
    }

    // #region [P] 鍵盤（2026-10 翻新，man page 風格）：1～8 切分頁、r 更新待辦、? 看快捷鍵。
    // 正在打字（輸入框、下拉選單、可編輯區）或按著修飾鍵時不攔，API 控制台自己的 / 與 ⌘Enter 照舊
    const helpEl = ref<HTMLDialogElement>();
    const SHORTCUTS: readonly { keys: string; text: string }[] = [
        { keys: '1～8', text: '切到側欄的第幾個分頁' },
        { keys: 'r', text: '更新待辦數字' },
        { keys: '/', text: 'API 分頁：跳到搜尋' },
        { keys: '⌘／Ctrl＋Enter', text: 'API 分頁：送出' },
        { keys: '?', text: '打開這張表' },
        { keys: 'Esc', text: '關掉這張表' }
    ];

    function isTyping(target: EventTarget | null) {
        return target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
    }

    function onShortcut(event: KeyboardEvent) {
        if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target) || !isSignedIn.value) return;
        if (event.key === '?') {
            event.preventDefault();
            helpEl.value?.showModal();
            return;
        }
        if (event.key === 'r') {
            event.preventDefault();
            void pulse.refresh();
            return;
        }
        const index = Number(event.key) - 1;
        if (Number.isInteger(index) && index >= 0 && index < TABS.length) {
            event.preventDefault();
            selectTab(TABS[index].key);
        }
    }
    // #endregion

    // 待辦數字每 5 分鐘自己更新一次；切回這個瀏覽器分頁時也更新（離開久了數字會舊）
    const PULSE_INTERVAL = 5 * 60_000;
    let timer: ReturnType<typeof setInterval> | undefined;
    function onVisible() {
        if (document.visibilityState === 'visible' && isSignedIn.value) void pulse.refresh();
    }

    watch(isSignedIn, async (signedIn) => {
        clearInterval(timer);
        if (signedIn) {
            void pulse.refresh();
            timer = setInterval(() => void pulse.refresh(), PULSE_INTERVAL);
            return;
        }
        // 登出或過期時，登入按鈕要重新畫出來
        if (framed.value) return;
        await nextTick();
        if (buttonEl.value) auth.renderButton(buttonEl.value);
    });

    onMounted(() => {
        if (window.self !== window.top) {
            framed.value = true;
            return;
        }
        // API 控制台的網址是 #api/<端點>，也要停在 API 分頁
        const fromHash = TABS.find(t => location.hash === `#${t.key}` || location.hash.startsWith(`#${t.key}/`));
        if (fromHash) tab.value = fromHash.key;
        if (buttonEl.value) auth.renderButton(buttonEl.value);
        document.addEventListener('visibilitychange', onVisible);
        document.addEventListener('keydown', onShortcut);
    });
    onBeforeUnmount(() => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
        document.removeEventListener('keydown', onShortcut);
    });
</script>

<template>
    <div class="dd-admin" :class="{ 'dd-admin--signed-in': isSignedIn && !framed }">
        <section v-if="framed" class="dd-admin__login" role="alert">
            <h2>請直接開啟後台</h2>
            <p>為了安全，後台不能被嵌在其他頁面裡使用。請在瀏覽器網址列直接開啟這個網址。</p>
        </section>

        <!-- #region [P] 登入 -->
        <section v-else-if="!isSignedIn" class="dd-admin__login">
            <p class="dd-admin__brand"><img src="/images/dindon/icon.webp" alt="" width="36" height="36" />叮咚記帳 後台</p>
            <h2>{{ expired ? '登入已過期' : '請用管理員的 Google 帳號登入' }}</h2>
            <p>
                只有後端管理員名單上的帳號能使用。這個頁面本身是公開的，所有權限都由後端檢查；
                登入憑證只放在這個分頁的記憶體裡，一小時後或重新整理後需要再按一次登入。
            </p>
            <div ref="buttonEl" class="dd-admin__gsi" />
            <p v-if="loadError" class="dd-admin__error" role="alert">{{ loadError }}</p>
            <a class="dd-admin__back" href="/dindon/">← 回到叮咚記帳</a>
        </section>
        <!-- #endregion -->

        <template v-else>
            <!-- #region [P] 側欄：窄螢幕變成頂端一條，分頁可以橫向滑 -->
            <aside class="dd-admin__side">
                <p class="dd-admin__brand"><img src="/images/dindon/icon.webp" alt="" width="28" height="28" /><span>叮咚後台</span></p>

                <nav class="dd-admin__nav" role="tablist" aria-label="後台分頁">
                    <button
                        v-for="(t, index) in TABS"
                        :key="t.key"
                        type="button"
                        role="tab"
                        class="dd-admin__nav-item"
                        :aria-selected="tab === t.key"
                        :class="{ 'is-active': tab === t.key }"
                        @click="selectTab(t.key)"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS[t.key]" /></svg>
                        <span>{{ t.label }}</span>
                        <kbd class="dd-admin__key" :aria-label="`快捷鍵 ${index + 1}`">{{ index + 1 }}</kbd>
                        <span v-if="badges[t.key]" class="dd-admin__badge" :aria-label="`${badges[t.key]} 件待處理`">{{ badges[t.key] }}</span>
                    </button>
                </nav>

                <div class="dd-admin__who">
                    <img v-if="profile?.picture" :src="profile.picture" alt="" referrerpolicy="no-referrer" />
                    <span class="email">{{ profile?.email ?? '管理員' }}</span>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" @click="auth.signOut()">登出</button>
                    <button type="button" class="dd-admin__help-btn" title="快捷鍵" @click="helpEl?.showModal()"><kbd>?</kbd> 快捷鍵</button>
                </div>
            </aside>
            <!-- #endregion -->

            <main class="dd-admin__main" :class="{ 'dd-admin__main--wide': tab === 'api' }">
                <header class="dd-admin__head">
                    <div>
                        <!-- 像指令提示的一行路徑：告訴你在哪一頁，方塊游標是品牌黃 -->
                        <p class="dd-admin__prompt" aria-hidden="true">~/dindon/admin/{{ tab }} <span class="dollar">$</span> <span class="cursor" /></p>
                        <h1>{{ current.label }}</h1>
                        <p>{{ current.hint }}</p>
                    </div>
                    <button type="button" class="dd-admin__refresh" :disabled="pulse.loading.value" title="更新待辦數字" @click="pulse.refresh()">
                        <svg viewBox="0 0 24 24" aria-hidden="true" :class="{ 'is-spinning': pulse.loading.value }"><path :d="ICONS.refresh" /></svg>
                        <span v-if="pulse.loadedAt.value">更新於 {{ timeFormat.format(pulse.loadedAt.value) }}</span>
                    </button>
                </header>

                <dialog ref="helpEl" class="dd-admin__help" aria-labelledby="dd-admin-help-title" @click.self="helpEl?.close()">
                    <h2 id="dd-admin-help-title">快捷鍵</h2>
                    <dl>
                        <div v-for="item in SHORTCUTS" :key="item.keys">
                            <dt><kbd>{{ item.keys }}</kbd></dt>
                            <dd>{{ item.text }}</dd>
                        </div>
                    </dl>
                    <p>正在輸入框裡打字時不會觸發。</p>
                    <form method="dialog"><button class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small">關閉</button></form>
                </dialog>

                <OverviewPanel v-if="tab === 'overview'" @navigate="selectTab" />
                <DeviceManager v-else-if="tab === 'devices'" />
                <FeedbackPanel v-else-if="tab === 'feedback'" />
                <UsageReport v-else-if="tab === 'usage'" />
                <UsageWatch v-else-if="tab === 'watch'" />
                <PromoPanel v-else-if="tab === 'promo'" />
                <FeatureVotePanel v-else-if="tab === 'features'" />
                <ApiConsole v-else />
            </main>
        </template>
    </div>
</template>

<style lang="scss">
    // 這個網站的 body 是黑底，只有文章版型自己鋪了背景；page 版型要自己補，不然淺色模式是黑底深字
    /* stylelint-disable-next-line selector-class-pattern -- .Layout 是 VitePress 的版型 class */
    .Layout.dindon-dashboard {
        background: var(--vp-c-bg);

        // 窄螢幕時 VitePress 會在頂端補一條「Return to top」（VPLocalNav），蓋住後台自己的分頁列
        /* stylelint-disable-next-line selector-class-pattern -- VitePress 的元件 class */
        .VPLocalNav { display: none; }
    }

    // 後台沿用網站的 VitePress 色彩變數，跟著網站的淺色／深色切換。
    // 圖表的顏色是參考色票（dataviz palette.md）的前三格，深色模式用同色相、為深底調過的那一階；
    // 已用 validate_palette.js 驗證：淺色對 #ffffff、深色對 #1b1b1f，CVD 與正常視覺的色差都過門檻。
    // 淺色的湖水綠對白底只有 2.82:1，所以每張圖都有圖例或數字標籤，加上「看數字」表格。
    // 定義在這裡而不是各分頁：總覽與回報都要用同一組。
    .dd-admin {
        --dd-series-1: #2a78d6;
        --dd-series-2: #1baf7a;
        --dd-series-3: #eb6834;
        --dd-chart-ink: var(--vp-c-text-1);
        --dd-chart-ink-2: var(--vp-c-text-2);
        --dd-chart-muted: #898781;
        --dd-chart-grid: #e1e0d9;
        --dd-chart-axis: #c3c2b7;
        --dd-side-width: 232px;
        min-height: 100vh;
        color: var(--vp-c-text-1);
        font-variant-numeric: tabular-nums;

        h1, h2, h3, p { margin: 0; }

        &--signed-in {
            display: grid;
            grid-template-columns: var(--dd-side-width) minmax(0, 1fr);
            @include setRWD(900px) { grid-template-columns: minmax(0, 1fr); }
        }

        &__brand {
            @include setFlex(flex-start, center, 10px);
            font-size: var(--font-size-m);
            font-weight: 800;
            white-space: nowrap;

            img { border-radius: 8px; }
            @include setRWD(900px) {
                span { display: none; }
            }
        }

        // #region [P] 側欄
        &__side {
            position: sticky;
            top: 0;
            background: var(--vp-c-bg-alt);
            height: 100vh;
            padding: 20px 14px;
            border-right: 1px solid var(--vp-c-divider);
            @include setFlex(flex-start, stretch, 20px, column);
            @include setRWD(900px) {
                flex-direction: row;
                gap: 10px;
                align-items: center;
                height: auto;
                padding: 8px 12px;
                border-right: 0;
                border-bottom: 1px solid var(--vp-c-divider);
                z-index: 10;
            }
        }
        &__nav {
            @include setFlex(flex-start, stretch, 2px, column);
            flex: 1;
            @include setRWD(900px) {
                flex-direction: row;
                min-width: 0;
                overflow-x: auto;
                scrollbar-width: none;
            }
        }
        &__nav-item {
            @include setFlex(flex-start, center, 10px);
            background: transparent;
            padding: 8px 10px;
            border: 0;
            border-radius: 8px;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            font-weight: 600;
            white-space: nowrap;
            text-align: left;
            cursor: pointer;
            transition: background .15s, color .15s;

            svg {
                flex-shrink: 0;
                @include setSize(18px, 18px);
                fill: none;
                stroke: currentcolor;
                stroke-width: 2;
                stroke-linecap: round;
                stroke-linejoin: round;
            }
            &:hover { background: var(--vp-c-default-soft); }
            &:focus-visible {
                outline: 2px solid var(--vp-c-brand-1);
                outline-offset: -2px;
            }
            &.is-active {
                background: var(--vp-c-brand-soft);
                color: var(--vp-c-text-1);

                svg { stroke: var(--vp-c-brand-1); }
            }
            @include setRWD(900px) {
                gap: 6px;
                padding: 6px 10px;

                svg { display: none; }
            }
        }
        &__badge {
            background: var(--vp-c-danger-1);
            min-width: 20px;
            padding: 1px 6px;
            border-radius: var(--dd-corner);
            margin-left: auto;
            color: var(--vp-c-white);
            font-size: 12px;
            line-height: 18px;
            text-align: center;
            @include setRWD(900px) { margin-left: 0; }
        }
        &__who {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
            padding-top: 14px;
            border-top: 1px solid var(--vp-c-divider);
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);

            img {
                @include setSize(24px, 24px);
                border-radius: 50%;
            }
            .email {
                max-width: 100%;
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }
            @include setRWD(900px) {
                flex-shrink: 0;
                flex-wrap: nowrap;
                padding-top: 0;
                border-top: 0;

                img, .email { display: none; }
            }
        }

        // #endregion

        // #region [P] 主區
        &__main {
            width: 100%;
            max-width: 1280px;
            padding: 28px 32px 80px;
            @include setRWD(640px) { padding: 20px 16px 64px; }

            // API 控制台左右兩欄加上說明與試打並排，要整個寬度
            &--wide { max-width: none; }
        }
        &__head {
            @include setFlex(space-between, flex-start, 16px);
            margin-bottom: 24px;

            h1 {
                font-size: var(--font-size-xl);
                font-weight: 800;
                line-height: 1.3;
            }
            p {
                margin-top: 2px;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
            }
        }
        &__refresh {
            flex-shrink: 0;
            @include setFlex(flex-end, center, 6px);
            background: transparent;
            padding: 6px 10px;
            border: 1px solid var(--vp-c-divider);
            border-radius: var(--dd-corner);
            color: var(--vp-c-text-2);
            font-size: 12px;
            cursor: pointer;

            svg {
                @include setSize(14px, 14px);
                fill: none;
                stroke: currentcolor;
                stroke-width: 2;
                stroke-linecap: round;
                stroke-linejoin: round;

                &.is-spinning { animation: dd-admin-spin 1s linear infinite; }
            }
            &:disabled { cursor: progress; }
        }

        // #endregion

        // 共用按鈕
        &__btn {
            background: var(--vp-c-brand-1);
            padding: 6px 16px;
            border: 1px solid var(--vp-c-brand-1);
            border-radius: var(--dd-corner);

            // 字用紙的顏色：深色模式的品牌藍很淺，白字會看不清楚（紙色對兩種藍都在 6 : 1 以上）
            color: var(--nb-paper, var(--vp-c-white));
            font-size: var(--font-size-s);
            font-weight: 600;
            cursor: pointer;

            &:disabled {
                cursor: not-allowed;
                opacity: .45;
            }
            &:focus-visible {
                outline: 2px solid var(--vp-c-brand-1);
                outline-offset: 2px;
            }
            &--ghost {
                background: transparent;
                border-color: var(--vp-c-divider);
                color: var(--vp-c-text-1);
            }
            &--danger {
                background: var(--vp-c-danger-1);
                border-color: var(--vp-c-danger-1);
            }
            &--small {
                padding: 2px 12px;
                font-size: 12px;
            }
        }
        &__error {
            color: var(--vp-c-danger-1);
            font-size: var(--font-size-s);
        }

        &__login {
            @include setFlex(flex-start, flex-start, 16px, column);
            max-width: 520px;
            padding: 32px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 16px;
            margin: 12vh auto 0;
            @include setRWD(640px) { margin: 24px 16px; }

            h2 { font-size: var(--font-size-l); }
            p { color: var(--vp-c-text-2); }
        }
        &__gsi { min-height: 44px; }
        &__back {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
    }

    // #region [P] man page 的皮（2026-10 翻新）：色票跟部落格同一組（--nb-*），
    // 後台另外換成等寬的標題與導覽、方角、密一點的表格，像一份可以用鍵盤操作的說明文件
    .dd-admin {
        --dd-mono: var(--nb-font-mono, var(--vp-font-family-mono));
        --dd-corner: 4px;

        // 標題、導覽、數字用等寬字；中文會自動落到內文字型
        h1, h2, h3,
        .dd-admin__nav-item,
        .dd-admin__brand,
        .num,
        [class*=__value],
        [class*=__count] { font-family: var(--dd-mono); }

        // 卡片、數字格、表格、輸入框：方角、不要陰影
        [class*=__card],
        [class*=__tile],
        [class*=__panel],
        input,
        select,
        textarea {
            border-radius: var(--dd-corner) !important;
            box-shadow: none !important;
        }

        // 表格密一點、表頭用等寬小字
        .dd-table {
            th, td { padding: 6px 10px; }
            th {
                color: var(--nb-ink-3, var(--vp-c-text-2));
                font-family: var(--dd-mono);
                font-size: 12px;
                font-weight: 500;
            }
            td { font-variant-numeric: tabular-nums; }
        }
        .dd-status { border-radius: var(--dd-corner); }

        &__prompt {
            margin-bottom: 4px !important;
            color: var(--nb-ink-3, var(--vp-c-text-3));
            font-family: var(--dd-mono);
            font-size: 12px;

            .dollar { color: var(--nb-ink-2, var(--vp-c-text-2)); }

            // 方塊游標：品牌黃，後台唯一的一塊黃
            .cursor {
                display: inline-block;
                background: var(--nb-marker, #F4B936);
                width: .6em;
                height: 1.1em;
                vertical-align: text-bottom;
                animation: dd-admin-blink 1.1s steps(1) infinite;
            }
        }
        &__key {
            @include setSize(20px, 20px);
            @include setFlex();
            padding: 0;
            border: 1px solid var(--vp-c-divider);
            border-radius: 3px;
            margin-left: auto;
            color: var(--nb-ink-3, var(--vp-c-text-3));
            font-family: var(--dd-mono);
            font-size: 11px;
            line-height: 1;

            // 有待辦數字時，數字在後面，鍵的提示讓一格
            + .dd-admin__badge { margin-left: 6px; }
            @include setRWD(900px) { display: none; }
        }
        &__nav-item.is-active {
            border-radius: 0 6px 6px 0;
            box-shadow: inset 3px 0 0 var(--nb-marker, var(--vp-c-brand-1));
        }
        &__help-btn {
            @include setFlex(flex-start, center, 6px);
            background: none;
            padding: 2px 0;
            border: 0;
            color: var(--nb-ink-3, var(--vp-c-text-2));
            font-size: 12px;
            cursor: pointer;

            kbd {
                padding: 0 5px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 3px;
                font-family: var(--dd-mono);
            }
            &:hover { color: var(--nb-link, var(--vp-c-brand-1)); }
            @include setRWD(900px) { display: none; }
        }
        &__help {
            background: var(--vp-c-bg-elv);
            max-width: 420px;
            padding: 20px 24px;
            border: 1px solid var(--vp-c-divider);
            border-radius: var(--dd-corner);
            color: var(--vp-c-text-1);

            &::backdrop { background: rgb(0 0 0 / 40%); }
            h2 {
                margin-bottom: 12px;
                font-size: var(--font-size-m);
            }
            dl {
                display: grid;
                gap: 6px;
                margin: 0 0 12px;
            }
            div {
                display: grid;
                grid-template-columns: 9rem 1fr;
                gap: 12px;
                font-size: var(--font-size-s);
            }
            dd {
                margin: 0;
                color: var(--vp-c-text-2);
            }
            kbd {
                padding: 1px 6px;
                border: 1px solid var(--vp-c-divider);
                border-bottom-width: 2px;
                border-radius: 3px;
                font-family: var(--dd-mono);
                font-size: 12px;
            }
            p {
                margin-bottom: 12px;
                color: var(--vp-c-text-3);
                font-size: 12px;
            }
        }
        @media (prefers-reduced-motion: reduce) {
            &__prompt .cursor { animation: none; }
        }
    }
    @keyframes dd-admin-blink {
        50% { opacity: 0; }
    }

    // #endregion

    .dark .dd-admin {
        --dd-series-1: #3987e5;
        --dd-series-2: #199e70;
        --dd-series-3: #d95926;
        --dd-chart-grid: #2c2c2a;
        --dd-chart-axis: #383835;
    }
    @keyframes dd-admin-spin {
        to { transform: rotate(360deg); }
    }
</style>
