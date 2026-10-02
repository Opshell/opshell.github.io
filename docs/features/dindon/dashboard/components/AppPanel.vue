<script setup lang="ts">
    import type { AnnouncementDraft } from '../appAdmin';
    import type { Announcement, AppVersions } from '../schemas/admin.schema';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import { announcementError, blockedCount, buildRangeText, configError, fromTaipeiLocal, toTaipeiLocal } from '../appAdmin';
    import { formatDateTime, formatInt } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import AdminActions from './AdminActions.vue';
    import PlayHealth from './PlayHealth.vue';

    // 「App 版本」分頁（溝通板 #0076、#0080）：各版本有幾台、最低可用版本與最新版本、對 App 發的重要公告。
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

    // #region [P] 公告
    const announcements = ref<Announcement[]>([]);
    const messageMax = ref(80);
    /** null＝沒在編輯；0＝新增；其他＝編輯那一則 */
    const editing = ref<number | null>(null);
    const form = ref<AnnouncementDraft>(emptyForm());
    const formError = computed(() => announcementError(form.value, messageMax.value));
    const messageLength = computed(() => [...form.value.message.trim()].length);

    const STATE_LABELS: Record<Announcement['state'], string> = { scheduled: '還沒開始', active: '播放中', ended: '已結束', withdrawn: '已下架' };
    // App 內頁面的代號由前端定（#0080 還在等清單）；先給常用的幾個當參考，實際清單出來後改成下拉選單
    const LINK_HINT = '空白、https:// 網址，或 app:頁面代號（代號清單等前端給，App 看不懂的代號會當沒有連結）';

    function emptyForm(): AnnouncementDraft {
        const now = Date.now();
        return {
            message: '',
            link: '',
            startsAt: toTaipeiLocal(new Date(now).toISOString()),
            endsAt: toTaipeiLocal(new Date(now + 7 * 86_400_000).toISOString()),
            minAppBuild: 0,
            maxAppBuild: 0
        };
    }

    function startCreate() {
        form.value = emptyForm();
        editing.value = 0;
    }

    function startEdit(item: Announcement) {
        form.value = {
            message: item.message,
            link: item.link,
            startsAt: toTaipeiLocal(item.startsAt),
            endsAt: toTaipeiLocal(item.endsAt),
            minAppBuild: item.minAppBuild,
            maxAppBuild: item.maxAppBuild
        };
        editing.value = item.id;
    }

    async function submitAnnouncement() {
        if (formError.value || editing.value === null) return;
        busy.value = true;
        error.value = '';
        notice.value = '';
        const body = {
            message: form.value.message.trim(),
            link: form.value.link.trim(),
            startsAt: fromTaipeiLocal(form.value.startsAt),
            endsAt: fromTaipeiLocal(form.value.endsAt),
            minAppBuild: form.value.minAppBuild,
            maxAppBuild: form.value.maxAppBuild
        };
        try {
            const id = editing.value;
            const saved = await call(token => (id ? adminApi.updateAnnouncement(token, id, body) : adminApi.createAnnouncement(token, body)));
            announcements.value = id
                ? announcements.value.map(item => (item.id === saved.id ? saved : item))
                : [saved, ...announcements.value];
            notice.value = id ? `公告 #${saved.id} 已更新（講過的 App 不會再講一次）` : `公告 #${saved.id} 已新增`;
            editing.value = null;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            busy.value = false;
        }
    }

    async function setWithdrawn(item: Announcement, withdrawn: boolean) {
        busy.value = true;
        error.value = '';
        notice.value = '';
        try {
            const saved = await call(token => adminApi.updateAnnouncement(token, item.id, { withdrawn }));
            announcements.value = announcements.value.map(entry => (entry.id === saved.id ? saved : entry));
            notice.value = withdrawn ? `公告 #${item.id} 已下架` : `公告 #${item.id} 重新上架`;
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
            const [versionResult, configResult, list] = await call(token => Promise.all([
                adminApi.appVersions(token, days.value),
                adminApi.getAppConfig(token),
                adminApi.listAnnouncements(token)
            ]));
            versions.value = versionResult;
            config.value = configResult;
            announcements.value = list.announcements;
            messageMax.value = list.messageMax;
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
            <button type="button" class="dd-admin__btn" :disabled="editing !== null" @click="startCreate">新增公告</button>
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

        <!-- #region [P] 公告 -->
        <section class="dd-app__card" aria-labelledby="dd-app-announcements">
            <header class="dd-app__head">
                <h2 id="dd-app-announcements">重要公告</h2>
                <span class="dd-app__muted">App 開啟時由小夥伴講，同一則只講一次；不記誰看過</span>
            </header>

            <form v-if="editing !== null" class="dd-app__form" @submit.prevent="submitAnnouncement">
                <h3>{{ editing ? `編輯公告 #${editing}` : '新增公告' }}</h3>
                <label class="wide">
                    內容
                    <textarea v-model="form.message" rows="2" :maxlength="messageMax + 20" placeholder="0.7.0 可以用 Google 帳號備份了，記得更新" />
                    <span class="counter" :class="{ 'is-danger': messageLength > messageMax }">{{ messageLength }} / {{ messageMax }}（建議 60 字內，不能換行）</span>
                </label>
                <label class="wide">
                    按下去去哪裡
                    <input v-model="form.link" type="text" placeholder="app:settings/account" />
                    <span class="counter">{{ LINK_HINT }}</span>
                </label>
                <label>開始（台灣時間）<input v-model="form.startsAt" type="datetime-local" /></label>
                <label>結束（台灣時間）<input v-model="form.endsAt" type="datetime-local" /></label>
                <label>只給這個 build 以上<input v-model.number="form.minAppBuild" type="number" min="0" /></label>
                <label>只給這個 build 以下<input v-model.number="form.maxAppBuild" type="number" min="0" /></label>
                <p class="wide dd-app__muted">
                    版本範圍 0 是不限。有限版本的公告，沒帶版本的舊 App（0.6.7 以前）看不到。
                    {{ editing ? '改內容不會讓已經講過的 App 再講一次；要重講請新增一則。' : '' }}
                </p>
                <p v-if="formError" class="wide dd-admin__error">{{ formError }}</p>
                <div class="wide dd-app__actions">
                    <button type="submit" class="dd-admin__btn" :disabled="busy || !!formError">{{ editing ? '儲存' : '新增' }}</button>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="editing = null">取消</button>
                </div>
            </form>

            <p v-if="!announcements.length && editing === null" class="dd-app__empty">還沒有公告。按右上「新增公告」。</p>
            <div v-else-if="announcements.length" class="dd-table-scroll">
                <table class="dd-table dd-table--static">
                    <thead>
                        <tr>
                            <th scope="col">#</th>
                            <th scope="col">狀態</th>
                            <th scope="col">內容</th>
                            <th scope="col">期間</th>
                            <th scope="col">版本</th>
                            <th scope="col">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in announcements" :key="item.id">
                            <td>{{ item.id }}</td>
                            <td><span class="dd-status" :class="`is-${item.state}`">{{ STATE_LABELS[item.state] }}</span></td>
                            <td class="message">
                                {{ item.message }}
                                <small v-if="item.link">→ {{ item.link }}</small>
                            </td>
                            <td class="period">{{ formatDateTime(item.startsAt) }}<br />～ {{ formatDateTime(item.endsAt) }}</td>
                            <td>{{ buildRangeText(item.minAppBuild, item.maxAppBuild) }}</td>
                            <td>
                                <!-- 按鈕包一層：td 自己設 flex 會變成不是表格的格子，底線對不齊 -->
                                <div class="ops">
                                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="busy || editing !== null" @click="startEdit(item)">編輯</button>
                                    <button
                                        type="button"
                                        class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small"
                                        :disabled="busy"
                                        @click="setWithdrawn(item, item.state !== 'withdrawn')"
                                    >
                                        {{ item.state === 'withdrawn' ? '重新上架' : '下架' }}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
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
        &__fields label,
        &__form label {
            @include setFlex(flex-start, stretch, 4px, column);
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);

            input,
            textarea {
                background: var(--vp-c-bg-soft);
                padding: 6px 10px;
                border: 1px solid var(--vp-c-divider);
                color: var(--vp-c-text-1);
                font: inherit;
            }
            textarea { resize: vertical; }
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

        &__form {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
            background: var(--vp-c-bg-alt);
            padding: 14px 16px;
            border-radius: 10px;

            h3 {
                grid-column: 1 / -1;
                font-size: var(--font-size-s);
            }
            .wide { grid-column: 1 / -1; }
            .counter {
                color: var(--vp-c-text-3);
                font-size: 12px;
            }
        }

        .dd-table {
            .message {
                min-width: 16rem;
                white-space: normal;

                small {
                    display: block;
                    color: var(--vp-c-text-2);
                    font-family: var(--dd-mono);
                }
            }
            .period {
                font-size: 12px;
                line-height: 1.5;
            }
            .ops {
                @include setFlex(flex-start, center, 6px);
            }
            tbody tr { cursor: default; }
        }

        // 公告的狀態：播放中是綠的，下架是紅的，其他灰
        .dd-status {
            &.is-scheduled,
            &.is-ended { background: var(--vp-c-default-soft); }
            &.is-withdrawn { background: var(--vp-c-danger-soft); }
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
