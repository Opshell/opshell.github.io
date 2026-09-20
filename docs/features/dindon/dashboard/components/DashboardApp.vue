<script setup lang="ts">
    import { nextTick, onMounted, ref, watch } from 'vue';
    import { useGoogleAuth } from '../../useGoogleAuth';
    import DeviceManager from './DeviceManager.vue';
    import FeedbackPanel from './FeedbackPanel.vue';
    import OverviewPanel from './OverviewPanel.vue';
    import PromoPanel from './PromoPanel.vue';
    import UsageReport from './UsageReport.vue';

    const auth = useGoogleAuth();
    const { isSignedIn, profile, expired, loadError } = auth;

    // 分頁記在網址的 # 後面，重新整理會停在同一頁；總覽是預設，不帶 #
    const TABS = [
        { key: 'overview', label: '總覽' },
        { key: 'devices', label: '裝置' },
        { key: 'feedback', label: '回報' },
        { key: 'usage', label: '用量報表' },
        { key: 'promo', label: '優惠碼' }
    ] as const;
    type Tab = typeof TABS[number]['key'];
    const tab = ref<Tab>('overview');
    const buttonEl = ref<HTMLElement>();

    // 被別的頁面用 iframe 嵌進來時什麼都不做。後台跟部落格同一個來源，別頁的第三方腳本
    // 嵌進來就能讀到裡面的東西（溝通板 #20）。GitHub Pages 設不了 frame-ancestors 標頭，只能在這裡擋。
    const framed = ref(false);

    function selectTab(next: Tab) {
        tab.value = next;
        history.replaceState(null, '', next === 'overview' ? location.pathname + location.search : `#${next}`);
    }

    // 登出或過期時，登入按鈕要重新畫出來
    watch(isSignedIn, async signedIn => {
        if (signedIn || framed.value) return;
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
    });
</script>

<template>
    <div class="dd-admin">
        <header class="dd-admin__header">
            <div>
                <p class="dd-admin__eyebrow">叮咚記帳 DinDon Ledger</p>
                <h1 class="dd-admin__title">後台</h1>
            </div>
            <div v-if="isSignedIn" class="dd-admin__who">
                <img v-if="profile?.picture" :src="profile.picture" alt="" referrerpolicy="no-referrer" />
                <span>{{ profile?.email ?? '管理員' }}</span>
                <button type="button" class="dd-admin__btn is-ghost" @click="auth.signOut()">登出</button>
            </div>
        </header>

        <section v-if="framed" class="dd-admin__login" role="alert">
            <h2>請直接開啟後台</h2>
            <p>為了安全，後台不能被嵌在其他頁面裡使用。請在瀏覽器網址列直接開啟這個網址。</p>
        </section>

        <!-- #region [P] 登入 -->
        <section v-else-if="!isSignedIn" class="dd-admin__login">
            <h2>{{ expired ? '登入已過期' : '請用管理員的 Google 帳號登入' }}</h2>
            <p>
                只有後端管理員名單上的帳號能使用。這個頁面本身是公開的，所有權限都由後端檢查；
                登入憑證只放在這個分頁的記憶體裡，一小時後或重新整理後需要再按一次登入。
            </p>
            <div ref="buttonEl" class="dd-admin__gsi"></div>
            <p v-if="loadError" class="dd-admin__error" role="alert">{{ loadError }}</p>
        </section>
        <!-- #endregion -->

        <template v-else>
            <nav class="dd-admin__tabs" role="tablist" aria-label="後台分頁">
                <button
                    v-for="t in TABS"
                    :key="t.key"
                    type="button"
                    role="tab"
                    :aria-selected="tab === t.key"
                    :class="{ 'is-active': tab === t.key }"
                    @click="selectTab(t.key)"
                >
                    {{ t.label }}
                </button>
            </nav>

            <OverviewPanel v-if="tab === 'overview'" />
            <DeviceManager v-else-if="tab === 'devices'" />
            <FeedbackPanel v-else-if="tab === 'feedback'" />
            <UsageReport v-else-if="tab === 'usage'" />
            <PromoPanel v-else />
        </template>
    </div>
</template>

<style lang="scss">
    // 這個網站的 body 是黑底，只有文章版型自己鋪了背景；page 版型要自己補，不然淺色模式是黑底深字
    .Layout.dindon-dashboard { background: var(--vp-c-bg); }

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
        max-width: 1280px;
        padding: 32px 24px 80px;
        margin: 0 auto;
        color: var(--vp-c-text-1);
        font-variant-numeric: tabular-nums;
        @include setRWD(640px) { padding: 24px 16px 64px; }

        h1, h2, h3, p { margin: 0; }

        &__header {
            @include setFlex(space-between, flex-end, 16px);
            flex-wrap: wrap;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--vp-c-divider);
            margin-bottom: 24px;
        }
        &__eyebrow {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
        }
        &__title {
            font-size: var(--font-size-xxl);
            font-weight: 800;
            line-height: 1.3;
        }
        &__who {
            @include setFlex(flex-end, center, 10px);
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);

            img {
                width: 28px;
                height: 28px;
                border-radius: 50%;
            }
        }

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
            &.is-ghost {
                background: transparent;
                border-color: var(--vp-c-divider);
                color: var(--vp-c-text-1);
            }
            &.is-danger {
                background: var(--vp-c-danger-1);
                border-color: var(--vp-c-danger-1);
            }
        }
        &__error {
            color: var(--vp-c-danger-1);
            font-size: var(--font-size-s);
        }

        &__login {
            @include setFlex(flex-start, flex-start, 16px, column);
            max-width: 560px;
            padding: 32px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 16px;

            h2 { font-size: var(--font-size-l); }
            p { color: var(--vp-c-text-2); }
        }
        &__gsi { min-height: 44px; }

        &__tabs {
            @include setFlex(flex-start, center, 4px);
            margin-bottom: 24px;

            button {
                background: transparent;
                padding: 8px 18px;
                border: 1px solid transparent;
                border-radius: 999px;
                color: var(--vp-c-text-2);
                font-weight: 600;
                cursor: pointer;

                &.is-active {
                    background: var(--vp-c-default-soft);
                    border-color: var(--vp-c-divider);
                    color: var(--vp-c-text-1);
                }
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
</style>
