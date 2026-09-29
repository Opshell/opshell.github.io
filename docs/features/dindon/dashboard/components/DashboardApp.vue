<script setup lang="ts">
    import type { DashboardTab, PanelPreset } from '../navigation';
    import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
        { key: 'features', label: '功能投票', hint: '測試者投票決定下一個做什麼' }
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
        const fromHash = TABS.find(t => `#${t.key}` === location.hash);
        if (fromHash) tab.value = fromHash.key;
        if (buttonEl.value) auth.renderButton(buttonEl.value);
        document.addEventListener('visibilitychange', onVisible);
    });
    onBeforeUnmount(() => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
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
                        v-for="t in TABS"
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
                        <span v-if="badges[t.key]" class="dd-admin__badge" :aria-label="`${badges[t.key]} 件待處理`">{{ badges[t.key] }}</span>
                    </button>
                </nav>

                <div class="dd-admin__who">
                    <img v-if="profile?.picture" :src="profile.picture" alt="" referrerpolicy="no-referrer" />
                    <span class="email">{{ profile?.email ?? '管理員' }}</span>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" @click="auth.signOut()">登出</button>
                </div>
            </aside>
            <!-- #endregion -->

            <main class="dd-admin__main">
                <header class="dd-admin__head">
                    <div>
                        <h1>{{ current.label }}</h1>
                        <p>{{ current.hint }}</p>
                    </div>
                    <button type="button" class="dd-admin__refresh" :disabled="pulse.loading.value" title="更新待辦數字" @click="pulse.refresh()">
                        <svg viewBox="0 0 24 24" aria-hidden="true" :class="{ 'is-spinning': pulse.loading.value }"><path :d="ICONS.refresh" /></svg>
                        <span v-if="pulse.loadedAt.value">更新於 {{ timeFormat.format(pulse.loadedAt.value) }}</span>
                    </button>
                </header>

                <OverviewPanel v-if="tab === 'overview'" @navigate="selectTab" />
                <DeviceManager v-else-if="tab === 'devices'" />
                <FeedbackPanel v-else-if="tab === 'feedback'" />
                <UsageReport v-else-if="tab === 'usage'" />
                <UsageWatch v-else-if="tab === 'watch'" />
                <PromoPanel v-else-if="tab === 'promo'" />
                <FeatureVotePanel v-else />
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
            border-radius: 999px;
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
            border-radius: 999px;
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
            border-radius: 999px;
            color: var(--vp-c-white);
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
