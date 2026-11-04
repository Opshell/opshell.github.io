<script setup lang="ts">
    import type { AnnouncementDraft } from '../appAdmin';
    import type { Announcement } from '../schemas/admin.schema';
    import { computed, onMounted, ref } from 'vue';
    import { adminApi } from '../api';
    import { announcementError, APP_PAGES, buildRangeText, fromTaipeiLocal, LINK_URL, linkChoice, linkLabel, splitList, toTaipeiLocal } from '../appAdmin';
    import { formatDateTime } from '../format';
    import { errorMessage, useAdminCall } from '../useAdminCall';
    import AdminActions from './AdminActions.vue';
    import NewsDraftPanel from './NewsDraftPanel.vue';

    // 「重要公告」分頁（溝通板 #0080；2026-10-03 從「App 版本」拆出來，使用者：「單獨在選單中有個項目」）。
    // 發出去的公告，App 打開時由使用者選的小夥伴探頭講一次；App 0.7.5 起才會講（前端在做），之前發的到時候還在期間內就會講。
    // 卡片、標題列、提示文字的樣式跟「App 版本」共用（.dd-app__*，在 AppPanel.vue）。
    const call = useAdminCall();

    const loading = ref(false);
    const busy = ref(false);
    const error = ref('');
    const notice = ref('');

    const announcements = ref<Announcement[]>([]);
    const messageMax = ref(80);
    /** null＝沒在編輯；0＝新增；其他＝編輯那一則 */
    const editing = ref<number | null>(null);
    const form = ref<AnnouncementDraft>(emptyForm());
    const formError = computed(() => announcementError(form.value, messageMax.value));
    const messageLength = computed(() => [...form.value.message.trim()].length);
    // 示警會讓所有使用者的手機跳系統通知（Flowsker #532）：新增一則示警、把一般公告改成示警、改已結束的示警（延長了會再播），
    // 送出前要再按一次；按過之後改了任何一欄就收回提醒，免得確認的跟送出的不一樣。
    // 播放中的示警改字不用：App 用 id 記講過了沒，改內容不會再跳一次
    const editingFrom = ref<Pick<Announcement, 'level' | 'state'> | null>(null);
    const needsAlertConfirm = computed(() => form.value.level === 'alert'
        && (editing.value === 0 || editingFrom.value?.level !== 'alert' || editingFrom.value.state === 'ended'));
    const confirmingAlert = ref(false);
    /** 下架的示警重新上架，還沒收到的手機會跳通知，也要按兩次 */
    const confirmingRestoreId = ref<number | null>(null);

    const STATE_LABELS: Record<Announcement['state'], string> = { scheduled: '還沒開始', active: '播放中', ended: '已結束', withdrawn: '已下架' };
    // 連結用下拉選（#0080）：App 的頁面、或網址。舊公告的代號不在清單上的話，照原樣列成一項，不會被洗掉
    const linkSelect = computed({
        get: () => linkChoice(form.value.link),
        set: (value: string) => {
            if (value !== LINK_URL) form.value.link = value;
            else if (!form.value.link.startsWith('https://')) form.value.link = 'https://';
        }
    });
    const unknownAppLink = computed(() => {
        const choice = linkSelect.value;
        return choice.startsWith('app:') && !APP_PAGES.some(page => page.code === choice) ? choice : '';
    });

    function emptyForm(): AnnouncementDraft {
        const now = Date.now();
        return {
            message: '',
            link: '',
            startsAt: toTaipeiLocal(new Date(now).toISOString()),
            endsAt: toTaipeiLocal(new Date(now + 7 * 86_400_000).toISOString()),
            minAppBuild: 0,
            maxAppBuild: 0,
            level: 'normal',
            institutions: '',
            bankCodes: ''
        };
    }

    function startCreate() {
        form.value = emptyForm();
        editingFrom.value = null;
        confirmingAlert.value = false;
        editing.value = 0;
    }

    function startEdit(item: Announcement) {
        form.value = {
            message: item.message,
            link: item.link,
            startsAt: toTaipeiLocal(item.startsAt),
            endsAt: toTaipeiLocal(item.endsAt),
            minAppBuild: item.minAppBuild,
            maxAppBuild: item.maxAppBuild,
            level: item.level,
            institutions: item.institutions.join('、'),
            bankCodes: item.bankCodes.join(' ')
        };
        editingFrom.value = { level: item.level, state: item.state };
        confirmingAlert.value = false;
        editing.value = item.id;
    }

    async function submitAnnouncement() {
        if (formError.value || editing.value === null) return;
        if (needsAlertConfirm.value && !confirmingAlert.value) {
            confirmingAlert.value = true;
            return;
        }
        confirmingAlert.value = false;
        busy.value = true;
        error.value = '';
        notice.value = '';
        const body = {
            message: form.value.message.trim(),
            link: form.value.link.trim(),
            startsAt: fromTaipeiLocal(form.value.startsAt),
            endsAt: fromTaipeiLocal(form.value.endsAt),
            minAppBuild: form.value.minAppBuild,
            maxAppBuild: form.value.maxAppBuild,
            level: form.value.level,
            // 送 [] 是清空：改回一般公告時機構也一起清掉，App 才不會拿舊的去比對
            institutions: form.value.level === 'alert' ? splitList(form.value.institutions) : [],
            bankCodes: form.value.level === 'alert' ? splitList(form.value.bankCodes, true) : []
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
        if (!withdrawn && item.level === 'alert' && confirmingRestoreId.value !== item.id) {
            confirmingRestoreId.value = item.id;
            return;
        }
        confirmingRestoreId.value = null;
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

    async function load() {
        loading.value = true;
        error.value = '';
        try {
            const list = await call(token => adminApi.listAnnouncements(token));
            announcements.value = list.announcements;
            messageMax.value = list.messageMax;
        } catch (e) {
            error.value = errorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    /** 新聞草稿發佈出去的示警，接到列表最上面 */
    function onPublished(item: Announcement) {
        announcements.value = [item, ...announcements.value.filter(entry => entry.id !== item.id)];
    }

    onMounted(load);
</script>

<template>
    <section class="dd-app dd-announce">
        <AdminActions>
            <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="loading" @click="load">重新整理</button>
            <button type="button" class="dd-admin__btn" :disabled="editing !== null" @click="startCreate">新增公告</button>
        </AdminActions>

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-app__notice" role="status">✓ {{ notice }}</p>

        <NewsDraftPanel @published="onPublished" />

        <section class="dd-app__card" aria-labelledby="dd-announce-list">
            <header class="dd-app__head">
                <h2 id="dd-announce-list">公告</h2>
                <span class="dd-app__muted">App 打開時由你選的小夥伴探頭講，同一則只講一次；不記誰看過</span>
            </header>

            <form v-if="editing !== null" class="dd-announce__form" @submit.prevent="submitAnnouncement" @input="confirmingAlert = false" @change="confirmingAlert = false">
                <h3>{{ editing ? `編輯公告 #${editing}` : '新增公告' }}</h3>
                <label class="wide">
                    內容
                    <textarea v-model="form.message" rows="2" :maxlength="messageMax + 20" placeholder="0.7.0 可以用 Google 帳號備份了，記得更新" />
                    <span class="counter" :class="{ 'is-danger': messageLength > messageMax }">{{ messageLength }} / {{ messageMax }}（建議 60 字內，不能換行）</span>
                </label>
                <label class="wide">
                    按下去去哪裡
                    <select v-model="linkSelect">
                        <option value="">不連結</option>
                        <optgroup label="App 的頁面">
                            <option v-for="page in APP_PAGES" :key="page.code" :value="page.code">{{ page.label }}</option>
                            <option v-if="unknownAppLink" :value="unknownAppLink">{{ unknownAppLink }}（不在清單上，App 可能不認得）</option>
                        </optgroup>
                        <option :value="LINK_URL">網址…</option>
                    </select>
                    <input v-if="linkSelect === LINK_URL" v-model="form.link" type="url" placeholder="https://opshell.me/dindon/" />
                    <span class="counter">App 0.7.5 起才會帶過去；舊版只講內容。{{ linkSelect && linkSelect !== LINK_URL ? form.link : '' }}</span>
                </label>
                <label class="wide">
                    等級
                    <select v-model="form.level">
                        <option value="normal">一般：App 打開時小夥伴講</option>
                        <option value="alert">示警：所有使用者的手機跳系統通知</option>
                    </select>
                    <span class="counter">新聞擬好的示警從上面「新聞示警草稿」發佈就好，這裡是手動補發用的。App 0.9.6 起才收得到示警。</span>
                </label>
                <template v-if="form.level === 'alert'">
                    <label>
                        相關機構
                        <input v-model="form.institutions" type="text" placeholder="永豐銀行、國泰世華" />
                        <span class="counter">頓號或逗號分開，最多 10 個。App 只在手機上比對使用者的帳戶與通知來源</span>
                    </label>
                    <label>
                        銀行代碼
                        <input v-model="form.bankCodes" type="text" inputmode="numeric" placeholder="807 013" />
                        <span class="counter">財金公司三碼，空白分開。支付沒有代碼，只填機構名</span>
                    </label>
                </template>
                <label>開始（台灣時間）<input v-model="form.startsAt" type="datetime-local" /></label>
                <label>結束（台灣時間）<input v-model="form.endsAt" type="datetime-local" /></label>
                <label>只給這個 build 以上<input v-model.number="form.minAppBuild" type="number" min="0" /></label>
                <label>只給這個 build 以下<input v-model.number="form.maxAppBuild" type="number" min="0" /></label>
                <p class="wide dd-app__muted">
                    版本範圍 0 是不限。有限版本的公告，沒帶版本的舊 App（0.6.7 以前）看不到。
                    {{ editing ? '改內容不會讓已經講過的 App 再講一次；要重講請新增一則。' : '' }}
                </p>
                <p v-if="formError" class="wide dd-admin__error">{{ formError }}</p>
                <p v-if="confirmingAlert" class="wide dd-admin__warn" role="alert">這會讓所有使用者的手機跳通知。內容與機構確定沒寫錯再按一次。</p>
                <div class="wide dd-app__actions">
                    <button type="submit" class="dd-admin__btn" :class="{ 'dd-admin__btn--danger': confirmingAlert }" :disabled="busy || !!formError">
                        {{ confirmingAlert ? '確定發示警' : editing ? '儲存' : '新增' }}
                    </button>
                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="busy" @click="confirmingAlert ? (confirmingAlert = false) : (editing = null)">取消</button>
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
                            <td>
                                <span class="dd-status" :class="`is-${item.state}`">{{ STATE_LABELS[item.state] }}</span>
                                <span v-if="item.level === 'alert'" class="dd-status is-alert">示警</span>
                            </td>
                            <td class="message">
                                {{ item.message }}
                                <small v-if="item.link">→ {{ linkLabel(item.link) }}</small>
                                <small v-if="item.institutions.length || item.bankCodes.length" class="targets">
                                    相關：{{ item.institutions.join('、') || '—' }}{{ item.bankCodes.length ? `（${item.bankCodes.join('、')}）` : '' }}
                                </small>
                            </td>
                            <td class="period">{{ formatDateTime(item.startsAt) }}<br />～ {{ formatDateTime(item.endsAt) }}</td>
                            <td>{{ buildRangeText(item.minAppBuild, item.maxAppBuild) }}</td>
                            <td>
                                <!-- 按鈕包一層：td 自己設 flex 會變成不是表格的格子，底線對不齊 -->
                                <div class="ops">
                                    <button type="button" class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small" :disabled="busy || editing !== null" @click="startEdit(item)">編輯</button>
                                    <button
                                        type="button"
                                        class="dd-admin__btn dd-admin__btn--small"
                                        :class="confirmingRestoreId === item.id ? 'dd-admin__btn--danger' : 'dd-admin__btn--ghost'"
                                        :disabled="busy"
                                        :title="confirmingRestoreId === item.id ? '還沒收到這則的手機會跳通知' : undefined"
                                        @click="setWithdrawn(item, item.state !== 'withdrawn')"
                                    >
                                        {{ confirmingRestoreId === item.id ? '確定上架（會跳通知）' : item.state === 'withdrawn' ? '重新上架' : '下架' }}
                                    </button>
                                    <button
                                        v-if="confirmingRestoreId === item.id"
                                        type="button"
                                        class="dd-admin__btn dd-admin__btn--ghost dd-admin__btn--small"
                                        @click="confirmingRestoreId = null"
                                    >
                                        取消
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </section>
</template>

<style lang="scss">
    .dd-announce {
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
        &__form label {
            @include setFlex(flex-start, stretch, 4px, column);
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);

            input,
            select,
            textarea {
                background: var(--vp-c-bg-soft);
                padding: 6px 10px;
                border: 1px solid var(--vp-c-divider);
                color: var(--vp-c-text-1);
                font: inherit;
            }
            textarea { resize: vertical; }
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
                .targets { font-family: inherit; }
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
            &.is-withdrawn,
            &.is-alert { background: var(--vp-c-danger-soft); }
            &.is-alert { margin-left: 4px; }
        }
    }
</style>
