<script setup lang="ts">
    import type { Component } from 'vue';
    import type { DashboardTab, PanelPreset } from '../navigation';
    import type { TerminalAction } from '../terminal';
    import { useData } from 'vitepress';
    import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { apiBase, isProductionApi } from '../../apiBase';
    import { useGoogleAuth } from '../../useGoogleAuth';
    import { setPanelPreset, shortcutsPaused } from '../navigation';
    import { usePulse } from '../usePulse';
    import AdminTerminal from './AdminTerminal.vue';
    import DeviceManager from './DeviceManager.vue';
    import FeatureVotePanel from './FeatureVotePanel.vue';
    import FeedbackPanel from './FeedbackPanel.vue';
    import OverviewPanel from './OverviewPanel.vue';
    import PromoPanel from './PromoPanel.vue';
    import UsageReport from './UsageReport.vue';
    import UsageWatch from './UsageWatch.vue';

    // 後台的外殼（2026-10 翻新，man page 風格）：
    //   左邊側欄（可以收成只剩圖示）｜右邊由上到下：終端機列、頁首（標題＋這一頁的操作）、內容、頁尾。
    // 整個後台固定一個畫面高，只有內容會捲：頁首與頁尾一直看得到，表格的表頭才能吸在內容的頂端。

    // API 控制台用到 markdown-it，點進去才載入，不拖慢其他分頁
    const ApiConsole = defineAsyncComponent(() => import('../console/ApiConsole.vue'));

    const auth = useGoogleAuth();
    const { isSignedIn, profile, expired, loadError } = auth;
    const pulse = usePulse();
    const { isDark } = useData();

    // 圖示是 24×24 的線條路徑（照 lucide 的畫法手寫），不為了十幾個圖示裝一整個圖示套件
    const ICONS = {
        overview: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
        devices: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M11 18h2',
        feedback: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M8 9h8 M8 13h5',
        usage: 'M3 3v18h18 M8 17v-6 M13 17V7 M18 17v-3',
        watch: 'M22 12h-4l-3 9L9 3l-3 9H2',
        promo: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z M13 5v2 M13 11v2 M13 17v2',
        features: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 12l2 2 4-4',
        api: 'M4 17l6-6-6-6 M12 19h8',
        refresh: 'M21 12a9 9 0 1 1-2.64-6.36L21 8 M21 3v5h-5',
        collapse: 'M3 3h18v18H3z M9 3v18 M16 9l-3 3 3 3',
        expand: 'M3 3h18v18H3z M9 3v18 M13 9l3 3-3 3',
        sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
        moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
        logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9'
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
    const PANELS: Record<DashboardTab, Component> = {
        overview: OverviewPanel,
        devices: DeviceManager,
        feedback: FeedbackPanel,
        usage: UsageReport,
        watch: UsageWatch,
        promo: PromoPanel,
        features: FeatureVotePanel,
        api: ApiConsole
    };
    type Tab = DashboardTab;
    const tab = ref<Tab>('overview');
    const current = computed(() => TABS.find(t => t.key === tab.value)!);
    /** 換這個數字＝把目前的分頁拆掉重建：終端機的 reload，或同一頁帶新的篩選再進來一次 */
    const panelKey = ref(0);
    const buttonEl = ref<HTMLElement>();
    const contentEl = ref<HTMLElement>();
    const terminalRef = ref<InstanceType<typeof AdminTerminal>>();
    const helpEl = ref<HTMLDialogElement>();

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
        // 已經在這一頁、又帶了新的篩選：重建一次，分頁建立時才會取走篩選
        if (next === tab.value && preset) panelKey.value++;
        tab.value = next;
        history.replaceState(null, '', next === 'overview' ? location.pathname + location.search : `#${next}`);
        contentEl.value?.scrollTo({ top: 0 });
    }

    // #region [P] 側欄收合：記在這台瀏覽器（只是個人偏好，讀不到就當展開）
    const SIDE_KEY = 'dd-admin-side-collapsed';
    const collapsed = ref(false);

    function toggleSide() {
        collapsed.value = !collapsed.value;
        try {
            localStorage.setItem(SIDE_KEY, collapsed.value ? '1' : '0');
        } catch {
            // 存不了就只在這次有效
        }
    }
    // #endregion

    function toggleTheme(mode: 'dark' | 'light' | 'toggle' = 'toggle') {
        isDark.value = mode === 'toggle' ? !isDark.value : mode === 'dark';
    }

    // #region [P] 終端機的指令：解析在 terminal.ts，這裡真的去做
    function onCommand(action: TerminalAction) {
        switch (action.kind) {
            case 'tab': return selectTab(action.tab, action.preset);
            case 'refresh': return void pulse.refresh();
            case 'reload': return void panelKey.value++;
            case 'theme': return toggleTheme(action.mode);
            case 'sidebar': return toggleSide();
            case 'logout': return auth.signOut();
            default:
        }
    }
    // #endregion

    // #region [P] 鍵盤：1～8 切分頁、: 或 ⌘K 打指令、[ 收側欄、r 更新待辦、? 看快捷鍵。
    // 正在打字（輸入框、下拉選單、可編輯區）或按著修飾鍵時不攔；API 控制台自己的 / 與 ⌘Enter 照舊。
    // 快速審核開著時全部讓開：它的 1、2、3 是判定鍵（shortcutsPaused）
    const SHORTCUTS: readonly { keys: string; text: string }[] = [
        { keys: ':　或　⌘K', text: '到終端機打指令（打 help 看全部）' },
        { keys: '1～8', text: '切到側欄的第幾個分頁' },
        { keys: '[', text: '收合／展開側欄' },
        { keys: 'r', text: '更新待辦數字' },
        { keys: '/', text: 'API 分頁：跳到搜尋' },
        { keys: '⌘／Ctrl＋Enter', text: 'API 分頁：送出' },
        { keys: '?', text: '打開這張表' },
        { keys: 'Esc', text: '關掉這張表、離開終端機' }
    ];

    function isTyping(target: EventTarget | null) {
        return target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
    }

    function onShortcut(event: KeyboardEvent) {
        if (!isSignedIn.value || shortcutsPaused.value) return;
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            terminalRef.value?.focus();
            return;
        }
        if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;

        const actions: Record<string, () => void> = {
            ':': () => terminalRef.value?.focus(),
            '?': () => helpEl.value?.showModal(),
            '[': toggleSide,
            'r': () => void pulse.refresh()
        };
        const action = actions[event.key];
        if (action) {
            event.preventDefault();
            action();
            return;
        }
        const index = Number(event.key) - 1;
        if (Number.isInteger(index) && index >= 0 && index < TABS.length) {
            event.preventDefault();
            selectTab(TABS[index].key);
        }
    }
    // #endregion

    // #region [P] 頁尾的資訊：打哪個後端、登入還剩多久（一分鐘更新一次就夠）
    const production = isProductionApi();
    const apiHost = new URL(apiBase()).host;
    const now = ref(Date.now());
    const minutesLeft = computed(() => {
        const expiresAt = profile.value?.expiresAt;
        return expiresAt ? Math.max(Math.floor((expiresAt - now.value) / 60_000), 0) : null;
    });
    // #endregion

    // 待辦數字每 5 分鐘自己更新一次；切回這個瀏覽器分頁時也更新（離開久了數字會舊）
    const PULSE_INTERVAL = 5 * 60_000;
    let timer: ReturnType<typeof setInterval> | undefined;
    let clock: ReturnType<typeof setInterval> | undefined;
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
        try {
            collapsed.value = localStorage.getItem(SIDE_KEY) === '1';
        } catch {
            collapsed.value = false;
        }
        // API 控制台的網址是 #api/<端點>，也要停在 API 分頁
        const fromHash = TABS.find(t => location.hash === `#${t.key}` || location.hash.startsWith(`#${t.key}/`));
        if (fromHash) tab.value = fromHash.key;
        if (buttonEl.value) auth.renderButton(buttonEl.value);
        document.addEventListener('visibilitychange', onVisible);
        document.addEventListener('keydown', onShortcut);
        clock = setInterval(() => (now.value = Date.now()), 60_000);
    });
    onBeforeUnmount(() => {
        clearInterval(timer);
        clearInterval(clock);
        document.removeEventListener('visibilitychange', onVisible);
        document.removeEventListener('keydown', onShortcut);
    });
</script>

<template>
    <div class="dd-admin" :class="{ 'dd-admin--signed-in': isSignedIn && !framed, 'is-collapsed': collapsed }">
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
            <!-- #region [P] 側欄：可以收成只剩圖示；窄螢幕變成頂端一條，分頁可以橫向滑 -->
            <aside class="dd-admin__side">
                <p class="dd-admin__brand"><img src="/images/dindon/icon.webp" alt="" width="28" height="28" /><span class="label">叮咚後台</span></p>

                <nav class="dd-admin__nav" role="tablist" aria-label="後台分頁">
                    <button
                        v-for="(t, index) in TABS"
                        :key="t.key"
                        type="button"
                        role="tab"
                        class="dd-admin__nav-item"
                        :aria-selected="tab === t.key"
                        :class="{ 'is-active': tab === t.key }"
                        :title="collapsed ? `${t.label}（${index + 1}）` : undefined"
                        @click="selectTab(t.key)"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS[t.key]" /></svg>
                        <span class="label">{{ t.label }}</span>
                        <kbd class="dd-admin__key" aria-hidden="true">{{ index + 1 }}</kbd>
                        <span v-if="badges[t.key]" class="dd-admin__badge" :aria-label="`${badges[t.key]} 件待處理`">{{ badges[t.key] }}</span>
                    </button>
                </nav>

                <button
                    type="button"
                    class="dd-admin__nav-item dd-admin__collapse"
                    :aria-expanded="!collapsed"
                    :title="collapsed ? '展開側欄（[）' : undefined"
                    @click="toggleSide"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="collapsed ? ICONS.expand : ICONS.collapse" /></svg>
                    <span class="label">收合側欄</span>
                    <kbd class="dd-admin__key" aria-hidden="true">[</kbd>
                </button>
            </aside>
            <!-- #endregion -->

            <div class="dd-admin__main">
                <!-- #region [P] 終端機列：打指令、換深淺色、看快捷鍵 -->
                <div class="dd-admin__bar">
                    <AdminTerminal ref="terminalRef" :tab="tab" :tabs="TABS" @command="onCommand" />
                    <button type="button" class="dd-admin__bar-btn" :title="isDark ? '換成淺色' : '換成深色'" :aria-label="isDark ? '換成淺色' : '換成深色'" @click="toggleTheme()">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="isDark ? ICONS.sun : ICONS.moon" /></svg>
                    </button>
                    <button type="button" class="dd-admin__bar-btn" title="快捷鍵" aria-label="快捷鍵" @click="helpEl?.showModal()">?</button>
                </div>
                <!-- #endregion -->

                <!-- #region [P] 頁首：這一頁是什麼，右邊是這一頁的操作（各分頁用 AdminActions 送進來） -->
                <header class="dd-admin__head">
                    <div class="dd-admin__title">
                        <h1>{{ current.label }}</h1>
                        <p>{{ current.hint }}</p>
                    </div>
                    <div id="dd-admin-actions" class="dd-admin__actions" />
                </header>
                <!-- #endregion -->

                <main ref="contentEl" class="dd-admin__content">
                    <div class="dd-admin__page" :class="{ 'dd-admin__page--wide': tab === 'api' }">
                        <component :is="PANELS[tab]" :key="`${tab}:${panelKey}`" @navigate="selectTab" />
                    </div>
                </main>

                <!-- #region [P] 頁尾：打哪個後端、誰登入、還剩多久、待辦數字多新 -->
                <footer class="dd-admin__foot">
                    <span class="dd-admin__env" :class="{ 'is-local': !production }">{{ production ? '正式後端' : `本機後端 ${apiHost}` }}</span>
                    <span class="dd-admin__who">
                        <img v-if="profile?.picture" :src="profile.picture" alt="" referrerpolicy="no-referrer" />
                        {{ profile?.email ?? '管理員' }}
                    </span>
                    <span v-if="minutesLeft !== null" :class="{ 'is-warn': minutesLeft < 10 }">登入還剩 {{ minutesLeft }} 分</span>
                    <button type="button" class="dd-admin__pulse" :disabled="pulse.loading.value" title="更新待辦數字（r）" @click="pulse.refresh()">
                        <svg viewBox="0 0 24 24" aria-hidden="true" :class="{ 'is-spinning': pulse.loading.value }"><path :d="ICONS.refresh" /></svg>
                        {{ pulse.loadedAt.value ? `待辦 ${timeFormat.format(pulse.loadedAt.value)}` : '待辦' }}
                    </button>
                    <span v-if="pulse.errors.value.length" class="is-warn" :title="pulse.errors.value.join('\n')">{{ pulse.errors.value.length }} 項沒抓到</span>
                    <span class="dd-admin__keys" aria-hidden="true"><kbd>:</kbd> 指令 <kbd>?</kbd> 快捷鍵</span>
                    <button type="button" class="dd-admin__signout" @click="auth.signOut()">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.logout" /></svg>登出
                    </button>
                </footer>
                <!-- #endregion -->
            </div>

            <dialog ref="helpEl" class="dd-admin__help" aria-labelledby="dd-admin-help-title" @click.self="helpEl?.close()">
                <h2 id="dd-admin-help-title">快捷鍵</h2>
                <dl>
                    <div v-for="item in SHORTCUTS" :key="item.keys">
                        <dt><kbd>{{ item.keys }}</kbd></dt>
                        <dd>{{ item.text }}</dd>
                    </div>
                </dl>
                <p>正在輸入框裡打字、或快速審核開著時不會觸發。</p>
                <form method="dialog"><button class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small">關閉</button></form>
            </dialog>
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
        --dd-side-width: 216px;
        --dd-mono: var(--nb-font-mono, var(--vp-font-family-mono));
        --dd-corner: 4px;
        --dd-gutter: 32px;
        min-height: 100vh;
        color: var(--vp-c-text-1);
        font-variant-numeric: tabular-nums;
        @include setRWD(640px) { --dd-gutter: 16px; }

        h1, h2, h3, p { margin: 0; }

        // #region [P] 外殼：一個畫面高，只有內容捲
        &--signed-in {
            display: grid;
            grid-template-columns: var(--dd-side-width) minmax(0, 1fr);
            height: 100vh;
            height: 100dvh;
            min-height: 0;
            overflow: hidden;

            &.is-collapsed { --dd-side-width: 60px; }
            @include setRWD(900px) {
                grid-template-columns: minmax(0, 1fr);
                grid-template-rows: auto minmax(0, 1fr);
            }
        }
        &__main {
            display: grid;
            grid-template-rows: auto auto minmax(0, 1fr) auto;
            min-width: 0;
            min-height: 0;
        }

        // 內容區是捲動容器，也是 size 容器：裡面的表格用 100cqh 算自己最多能多高
        &__content {
            container-type: size;

            // 上方的留白放在 __page：放在這裡的話，吸頂的表頭會停在留白底下，上面露出一條捲過去的列
            padding: 0 var(--dd-gutter) 48px;
            overflow: auto;
            overscroll-behavior: contain;
        }
        &__page {
            max-width: 1280px;
            padding-top: 24px;

            // API 控制台左右兩欄加上說明與試打並排，要整個寬度
            &--wide { max-width: none; }
        }

        // #endregion

        &__brand {
            @include setFlex(flex-start, center, 10px);
            font-size: var(--font-size-m);
            font-weight: 800;
            white-space: nowrap;

            img { border-radius: 8px; }
        }

        // #region [P] 側欄
        &__side {
            @include setFlex(flex-start, stretch, 18px, column);
            background: var(--vp-c-bg-alt);
            min-height: 0;
            padding: 14px 10px;
            border-right: 1px solid var(--vp-c-divider);
            overflow: hidden auto;

            .dd-admin__brand { padding: 0 6px; }
            @include setRWD(900px) {
                flex-direction: row;
                gap: 10px;
                align-items: center;
                padding: 8px 12px;
                border-right: 0;
                border-bottom: 1px solid var(--vp-c-divider);
                overflow: visible;
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
            position: relative;
            background: transparent;
            min-height: 36px;
            padding: 6px 10px;
            border: 0;
            border-radius: 0 var(--dd-corner) var(--dd-corner) 0;
            color: var(--vp-c-text-2);
            font-family: var(--dd-mono);
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
                box-shadow: inset 3px 0 0 var(--nb-marker, var(--vp-c-brand-1));
                color: var(--vp-c-text-1);

                svg { stroke: var(--vp-c-brand-1); }
            }
            @include setRWD(900px) {
                gap: 6px;
                padding: 6px 10px;

                svg { display: none; }
            }
        }
        &__key {
            @include setSize(20px, 20px);
            @include setFlex();
            flex-shrink: 0;
            padding: 0;
            border: 1px solid var(--vp-c-divider);
            border-radius: 3px;
            margin-left: auto;
            color: var(--nb-ink-3, var(--vp-c-text-3));
            font-family: var(--dd-mono);
            font-size: 11px;
            line-height: 1;
            @include setRWD(900px) { display: none; }
        }
        &__badge {
            background: var(--vp-c-danger-1);
            min-width: 20px;
            padding: 1px 6px;
            border-radius: var(--dd-corner);
            color: var(--vp-c-white);
            font-size: 12px;
            line-height: 18px;
            text-align: center;
            @include setRWD(900px) { margin-left: 0; }
        }
        &__collapse {
            @include setRWD(900px) { display: none; }
        }

        // 收成只剩圖示：字留給螢幕閱讀器，數字變成右上角的一個點（數量還在 aria-label）
        &.is-collapsed {
            .dd-admin__side {
                align-items: center;
                padding-inline: 8px;
            }
            .dd-admin__nav-item {
                justify-content: center;
                width: 44px;
                padding: 6px 0;
                border-radius: var(--dd-corner);

                &.is-active { box-shadow: inset 0 -3px 0 var(--nb-marker, var(--vp-c-brand-1)); }
            }
            .label {
                position: absolute;
                clip-path: inset(50%);
                width: 1px;
                height: 1px;
                white-space: nowrap;
                overflow: hidden;
            }
            .dd-admin__brand { padding: 0; }
            .dd-admin__key { display: none; }
            .dd-admin__badge {
                position: absolute;
                top: 3px;
                right: 3px;
                min-width: 16px;
                padding: 0 4px;
                font-size: 10px;
                line-height: 16px;
            }
        }
        @include setRWD(900px) {
            // 窄螢幕的側欄已經是頂端一條，收合不適用
            &.is-collapsed .label {
                position: static;
                clip-path: none;
                width: auto;
                height: auto;
            }
        }

        // #endregion

        // #region [P] 終端機列與頁首
        &__bar {
            @include setFlex(flex-start, center, 4px);
            background: var(--term-bg);
            min-height: 44px;
            padding: 0 12px 0 var(--dd-gutter);
            border-bottom: 1px solid var(--term-line);
        }
        &__bar-btn {
            @include setSize(32px, 32px);
            @include setFlex();
            flex-shrink: 0;
            background: transparent;
            padding: 0;
            border: 1px solid transparent;
            border-radius: var(--dd-corner);
            color: var(--term-dim);
            font-family: var(--dd-mono);
            font-size: 14px;
            cursor: pointer;

            svg {
                @include setSize(17px, 17px);
                fill: none;
                stroke: currentcolor;
                stroke-width: 2;
                stroke-linecap: round;
                stroke-linejoin: round;
            }
            &:hover {
                border-color: var(--term-line);
                color: var(--term-ink);
            }
            &:focus-visible {
                outline: 2px solid var(--term-hot);
                outline-offset: -2px;
            }
        }
        &__head {
            @include setFlex(space-between, center, 16px);
            flex-wrap: wrap;
            background: var(--vp-c-bg);
            padding: 14px var(--dd-gutter);
            border-bottom: 1px solid var(--vp-c-divider);

            h1 {
                font-family: var(--dd-mono);
                font-size: var(--font-size-l);
                font-weight: 700;
                line-height: 1.3;
            }
            p {
                margin-top: 2px;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
            }
        }
        &__actions {
            @include setFlex(flex-end, center, 8px);
            flex-wrap: wrap;

            &:empty { display: none; }
        }

        // #endregion

        // #region [P] 頁尾：一條狀態列，像編輯器底下那條
        &__foot {
            @include setFlex(flex-start, center, 16px);
            background: var(--vp-c-bg-alt);
            min-height: 30px;
            padding: 4px var(--dd-gutter);
            border-top: 1px solid var(--vp-c-divider);
            color: var(--vp-c-text-2);
            font-family: var(--dd-mono);
            font-size: 12px;
            white-space: nowrap;
            overflow-x: auto;
            scrollbar-width: none;

            .is-warn { color: var(--vp-c-danger-1); }
            button {
                @include setFlex(flex-start, center, 5px);
                background: none;
                padding: 0;
                border: 0;
                color: inherit;
                font: inherit;
                cursor: pointer;

                &:hover { color: var(--vp-c-brand-1); }
                &:focus-visible {
                    outline: 2px solid var(--vp-c-brand-1);
                    outline-offset: 2px;
                }
            }
            svg {
                @include setSize(13px, 13px);
                fill: none;
                stroke: currentcolor;
                stroke-width: 2;
                stroke-linecap: round;
                stroke-linejoin: round;

                &.is-spinning { animation: dd-admin-spin 1s linear infinite; }
            }
        }

        // 打哪個後端最重要：正式是綠點，本機是黃底，一眼分得出來
        &__env {
            @include setFlex(flex-start, center, 6px);

            &::before {
                content: '';
                @include setSize(7px, 7px);
                background: var(--vp-c-green-1);
                border-radius: 50%;
            }
            &.is-local {
                background: var(--nb-marker-soft, var(--vp-c-warning-soft));
                padding: 0 6px;
                color: var(--vp-c-text-1);

                &::before { background: var(--nb-marker, var(--vp-c-warning-1)); }
            }
        }
        &__who {
            @include setFlex(flex-start, center, 6px);

            img {
                @include setSize(16px, 16px);
                border-radius: 50%;
            }
            @include setRWD(640px) { display: none; }
        }
        &__keys {
            margin-left: auto;

            kbd {
                padding: 0 4px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 3px;
                font-family: inherit;
            }
            @include setRWD(900px) { display: none; }
        }
        &__signout {
            @include setRWD(900px) { margin-left: auto; }
        }

        // #endregion

        // #region [P] 表格：整個後台只有內容區會捲，表頭吸在內容區的頂端
        // 吸頂看的是最近的捲動容器：表格外面一包 overflow 就吸不到內容區。寬螢幕的表格都放得下（量過，含裝置詳情打開時），
        // 所以不捲；窄螢幕表格可能比畫面寬，只好讓框自己橫向捲，這時表頭就不吸了（不限高度，還是只有內容區一個直向捲軸）。
        // （之前讓框自己捲、最高到內容區那麼高，但框上面還有搜尋列，加起來超過內容區，變成兩個捲軸、下一頁被擠到看不到）
        .dd-table-scroll {
            overflow: visible;
            @include setRWD(900px) { overflow-x: auto; }
        }
        .dd-table thead th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: var(--vp-c-bg);
            box-shadow: inset 0 -1px 0 var(--vp-c-divider);
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
            white-space: nowrap;
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

        // #region [P] man page 的皮：標題與數字用等寬字，卡片、數字格、輸入框方角、不要陰影
        h1, h2, h3,
        .num,
        [class*=__value],
        [class*=__count] { font-family: var(--dd-mono); }
        [class*=__card],
        [class*=__tile],
        [class*=__panel],
        input,
        select,
        textarea {
            border-radius: var(--dd-corner) !important;
            box-shadow: none !important;
        }

        // 終端機的下拉也叫 __panel，但它要貼齊終端機列，不要角
        .dd-term__panel { border-radius: 0 0 var(--dd-corner) var(--dd-corner) !important; }

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

        // #endregion

        &__help {
            background: var(--vp-c-bg-elv);
            max-width: 460px;
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
    }

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
