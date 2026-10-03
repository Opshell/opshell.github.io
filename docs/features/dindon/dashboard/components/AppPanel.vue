<script setup lang="ts">
    import type { AppVersions } from '../schemas/admin.schema';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import { blockedCount, configError } from '../appAdmin';
    import { formatDateTime, formatInt } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import AdminActions from './AdminActions.vue';
    import PlayHealth from './PlayHealth.vue';

    // 「App 版本」分頁（溝通板 #0076）：各版本有幾台、Play 的當機率、最低可用版本與最新版本。
    // 重要公告原本也在這頁，2026-10-03 拆成自己的分頁（AnnouncementPanel.vue）；共用的卡片樣式（.dd-app__card 等）還在這裡。
    // 版本的數字看「最近幾天有連線過的裝置」，不含測試與凍結的（後端算）。
    // 調高最低版本會讓舊版除了 /v1/me 全部被擋（連打卡都送不進來），所以一定先跳確認、說會擋掉幾台。
    const call = useAdminCall();

    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    const notice = ref('');

    // #region [P] 版本分布
    const days = ref(30);
    const versions = ref<AppVersions | null>(null);
    const maxDevices = computed(() => Math.max(1, ...(versions.value?.versions.map(v => v.devices) ?? [])));
    // #endregion

    // #region [P] 版本設定
    const config = ref<{ minAppBuild: number; latestAppBuild: number; latestAppVersion: string; updatedBy: string; updatedAt: string | null } | null>(null);
    const draft = ref({ minAppBuild: 0, latestAppBuild: 0, latestAppVersion: '' });
    const confirmingConfig = ref(false);
    const draftError = computed(() => configError(draft.value));
    const configChanged = computed(() => !!config.value && (
        draft.value.minAppBuild !== config.value.minAppBuild
        || draft.value.latestAppBuild !== config.value.latestAppBuild
        || draft.value.latestAppVersion.trim() !== config.value.latestAppVersion));
    /** 調高最低版本才要確認：調低、只改最新版都不會擋到人 */
    const raisingMin = computed(() => !!config.value && draft.value.minAppBuild > config.value.minAppBuild);
    const wouldBlock = computed(() => (versions.value ? blockedCount(versions.value.versions, draft.value.minAppBuild) : 0));

    function resetDraft() {
        if (!config.value) return;
        draft.value = { minAppBuild: config.value.minAppBuild, latestAppBuild: config.value.latestAppBuild, latestAppVersion: config.value.latestAppVersion };
        confirmingConfig.value = false;
    }

    async function saveConfig() {
        if (raisingMin.value && !confirmingConfig.value) {
            confirmingConfig.value = true;
            return;
        }
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            config.value = await call(token => adminApi.saveAppConfig(token, { ...draft.value, latestAppVersion: draft.value.latestAppVersion.trim() }));
            resetDraft();
            notice.value = '版本設定已更新（其他伺服器最多 30 秒後生效）';
            versions.value = await call(token => adminApi.appVersions(token, days.value));
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }
    // #endregion

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            const [versionResult, configResult] = await call(token => Promise.all([
                adminApi.appVersions(token, days.value),
                adminApi.getAppConfig(token)
            ]));
            versions.value = versionResult;
            config.value = configResult;
            resetDraft();
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    async function loadVersions() {
        try {
            versions.value = await call(token => adminApi.appVersions(token, days.value));
        } catch (e) {
            error.value = errorMessage(e);
        }
    }

    onMounted(load);
</script>

<template>
    <section class="dd-app">
        <AdminActions>
            <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="loading" @click="load">重新整理</button>
        </AdminActions>

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-app__notice" role="status">✓ {{ notice }}</p>

        <!-- #region [P] 版本分布 -->
        <section class="dd-app__card" aria-labelledby="dd-app-versions">
            <header class="dd-app__head">
                <h2 id="dd-app-versions">各版本有幾台</h2>
                <label>
                    最近
                    <select v-model.number="days" :disabled="loading" @change="loadVersions">
                        <option :value="7">7 天</option>
                        <option :value="30">30 天</option>
                        <option :value="90">90 天</option>
                    </select>
                    有連線的裝置
                </label>
            </header>
            <template v-if="versions">
                <p class="dd-app__muted">
                    共 {{ formatInt(versions.total) }} 台；
                    <span v-if="versions.latestAppBuild">還沒更新到 {{ versions.latestAppVersion }} 的 {{ formatInt(versions.belowLatest) }} 台、</span>
                    <span :class="{ 'is-danger': versions.belowMin }">會被擋（低於最低版本）的 {{ formatInt(versions.belowMin) }} 台</span>。
                    不含測試與凍結的裝置。
                </p>
                <p v-if="!versions.versions.length" class="dd-app__empty">
                    這段時間沒有裝置連線過。版本是 10/2 部署後才開始記的，App 打開之後就會有數字。
                </p>
                <ul v-else class="dd-app__versions">
                    <li v-for="item in versions.versions" :key="`${item.appVersion}-${item.appBuild}`">
                        <span class="name">{{ item.appVersion || '不知道' }}</span>
                        <span class="build">{{ item.appBuild ? `build ${item.appBuild}` : '0.6.7 以前不帶版本' }}</span>
                        <span class="bar" aria-hidden="true"><span :style="{ width: `${(item.devices / maxDevices) * 100}%` }" /></span>
                        <span class="count">{{ formatInt(item.devices) }} 台</span>
                        <span v-if="item.appBuild && item.appBuild < versions.minAppBuild" class="dd-status is-frozen">會被擋</span>
                        <span v-else-if="item.appBuild && item.appBuild === versions.latestAppBuild" class="dd-status is-active">最新</span>
                    </li>
                </ul>
            </template>
        </section>
        <!-- #endregion -->

        <!-- Play 的當機率與報表空間（#0084）：跟版本放在一起，都是「App 在外面的狀況」 -->
        <PlayHealth />

        <!-- #region [P] 版本設定 -->
        <section v-if="config" class="dd-app__card" aria-labelledby="dd-app-config">
            <header class="dd-app__head">
                <h2 id="dd-app-config">最低可用版本與最新版本</h2>
                <span v-if="config.updatedAt" class="dd-app__muted">上次改：{{ formatDateTime(config.updatedAt) }}・{{ config.updatedBy }}</span>
            </header>
            <p class="dd-app__muted">
                <strong>最新版本</strong>：低於它的 App 會被小夥伴提醒更新。
                <strong>最低可用版本</strong>：低於它、有帶版本的 App 除了開 App 那一支，<strong>全部被擋</strong>（AI、活動、打卡都不行），
                只在破壞性改版時用。0 是誰都不擋。沒帶版本的 0.6.7 以前不受影響。
            </p>
            <div class="dd-app__fields">
                <label>最低可用版本（build）<input v-model.number="draft.minAppBuild" type="number" min="0" @input="confirmingConfig = false" /></label>
                <label>最新版本（build）<input v-model.number="draft.latestAppBuild" type="number" min="0" @input="confirmingConfig = false" /></label>
                <label>最新版本名稱<input v-model="draft.latestAppVersion" type="text" placeholder="0.7.1" @input="confirmingConfig = false" /></label>
            </div>
            <p v-if="draftError" class="dd-admin__error">{{ draftError }}</p>
            <div v-if="confirmingConfig" class="dd-app__confirm" role="alert">
                最低版本從 {{ config.minAppBuild }} 調到 <strong>{{ draft.minAppBuild }}</strong>：
                最近 {{ days }} 天連線過的裝置裡，<strong>{{ formatInt(wouldBlock) }} 台</strong>會立刻被擋，要更新才能再用 AI、打卡。
            </div>
            <div class="dd-app__actions">
                <button
                    type="button"
                    class="dd-admin__btn"
                    :class="{ 'dd-admin__btn--danger': confirmingConfig }"
                    :disabled="busy || !configChanged || !!draftError"
                    @click="saveConfig"
                >
                    {{ confirmingConfig ? `確定，擋掉 ${formatInt(wouldBlock)} 台` : '儲存' }}
                </button>
                <button v-if="configChanged" type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="resetDraft">還原</button>
            </div>
        </section>
        <!-- #endregion -->
    </section>
</template>

<style lang="scss">
    .dd-app {
        @include setFlex(flex-start, stretch, 20px, column);

        &__card {
            @include setFlex(flex-start, stretch, 12px, column);
            padding: 18px 20px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 12px;
        }
        &__head {
            @include setFlex(space-between, baseline, 8px 16px);
            flex-wrap: wrap;

            h2 { font-size: var(--font-size-m); }
            label {
                @include setFlex(flex-start, center, 6px);
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
            }
        }
        &__muted {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            line-height: 1.7;
        }
        .is-danger { color: var(--vp-c-danger-1); }
        &__empty {
            padding: 20px;
            color: var(--vp-c-text-2);
            text-align: center;
        }
        &__notice {
            background: var(--vp-c-green-soft);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: var(--font-size-s);
        }

        // 各版本一列：名稱、build、一條長度是台數的線、台數、標記
        &__versions {
            @include setFlex(flex-start, stretch, 8px, column);
            padding: 0;
            margin: 0;
            list-style: none;

            li {
                display: grid;
                grid-template-columns: 5rem 9rem minmax(0, 1fr) 4rem 4.5rem;
                gap: 12px;
                align-items: center;
                font-size: var(--font-size-s);
            }
            .name {
                font-family: var(--dd-mono);
                font-weight: 700;
            }
            .build {
                color: var(--vp-c-text-2);
                font-size: 12px;
            }
            .bar {
                background: var(--vp-c-default-soft);
                height: 8px;
                border-radius: 4px;
                overflow: hidden;

                span {
                    display: block;
                    background: var(--vp-c-brand-1);
                    height: 100%;
                }
            }
            .count {
                font-family: var(--dd-mono);
                text-align: right;
            }
        }

        &__fields {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 12px;
        }
        &__fields label {
            @include setFlex(flex-start, stretch, 4px, column);
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);

            input,
            select {
                background: var(--vp-c-bg-soft);
                padding: 6px 10px;
                border: 1px solid var(--vp-c-divider);
                color: var(--vp-c-text-1);
                font: inherit;
            }
        }
        &__confirm {
            background: var(--vp-c-danger-soft);
            padding: 10px 12px;
            border-radius: 8px;
            font-size: var(--font-size-s);
        }
        &__actions {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
        }
        @include setRWD(640px) {
            &__versions li {
                grid-template-columns: 4rem minmax(0, 1fr) 3.5rem;

                .build,
                .dd-status { display: none; }
            }
        }
    }
</style>
