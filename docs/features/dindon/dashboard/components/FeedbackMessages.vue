<script setup lang="ts">
    import type { FeedbackChannel, FeedbackMessage, FeedbackReport } from '../schemas/admin.schema';
    import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { adminApi, AdminApiError } from '../api';
    import {
        applyTemplate,
        boundAddress,
        CHANNEL_LABELS,
        defaultChannel,
        emailsAsMessages,
        isDraftSent,
        isOtherSender,
        keepDraft,
        markDraftSent,
        readState,
        REPLY_TEMPLATES,
        replyDraftProblem,
        replyErrorMessage,
        sortThread,
        STATUS_LABELS,
        takeDraft
    } from '../feedbackMessages';
    import { formatDateTime } from '../format';
    import { FEEDBACK_MESSAGE_BODY_MAX } from '../schemas/admin.schema';
    import { errorMessage, useAdminCall } from '../useAdminCall';

    // 回報詳情裡的來往訊息（api.md 第 8 節「回報的來往訊息」「寄信回覆回報者」，Flowsker #600、#457）。
    // 一則回報一條串：App 裡的回覆與信件照時間排在一起；回覆時選管道，兩邊能不能用各自由後端說。
    // 收件人由後端決定（裝置綁定的 Google email），這裡沒有收件人欄位，防後台被盜用時拿我們的網域亂寄。
    // 父層要用 :key 綁回報 id：換一則就是新的卡片，草稿靠 takeDraft／keepDraft 接回來。
    interface Props {
        report: FeedbackReport;
    }
    const props = defineProps<Props>();
    const emit = defineEmits<{
        /** 回報者收得到的回覆送出了：列表的「等你回」要拿掉 */
        replied: [reportId: number];
    }>();

    const call = useAdminCall();

    const messages = ref<FeedbackMessage[] | null>(null);
    const canReplyInApp = ref(false);
    const appReason = ref<string | null>(null);
    const canSend = ref(false);
    const sendReason = ref<string | null>(null);
    const emailsTo = ref<string | null>(null);
    const loading = ref(false);
    const loadError = ref('');
    const sending = ref(false);
    const error = ref('');
    const notice = ref('');

    const saved = takeDraft(props.report.id);
    /** 打開時還不知道兩邊能不能用：先記著「使用者選過了沒」，第一次載入完才決定預設 */
    let channelChosen = saved !== null;
    const channel = ref<FeedbackChannel>(saved?.channel ?? 'app');
    const subject = ref(saved?.subject ?? '');
    const body = ref(saved?.body ?? '');
    // 送過就留著同一個，沒送成再按才是重送那一則；改了內容才算另一則。換管道不換：兩邊的 draft_id 後端分開算
    const draftId = ref(saved?.draftId ?? '');
    const triedChannel = ref<FeedbackChannel | null>(saved?.triedChannel ?? null);
    watch([subject, body], () => {
        draftId.value = '';
        triedChannel.value = null;
        if (!subject.value && !body.value) return; // 送成功清空表單也會到這，那則提示要留著
        error.value = '';
        notice.value = '';
    });
    // 不一定是這張卡片送的：送出中換到別則再回來，是舊卡片收到結果
    watch(() => isDraftSent(draftId.value), (sent) => {
        if (!sent) return;
        subject.value = '';
        body.value = '';
        notice.value ||= '送出了';
        void load();
    });
    onBeforeUnmount(() => keepDraft(props.report.id, {
        channel: channel.value,
        subject: subject.value,
        body: body.value,
        draftId: draftId.value,
        triedChannel: triedChannel.value
    }));

    function choose(next: FeedbackChannel) {
        channelChosen = true;
        channel.value = next;
    }

    /** 兩邊都不行（從 LINE 匯入、內容已清除…）：表單整個收掉，只講原因 */
    const bothBlocked = computed(() => messages.value !== null && !canReplyInApp.value && !canSend.value);
    const available = computed(() => (channel.value === 'app' ? canReplyInApp.value : canSend.value));
    const blockedReason = computed(() => (channel.value === 'app' ? appReason.value : sendReason.value) ?? '後端沒有說明原因');
    const problem = computed(() => replyDraftProblem(channel.value, subject.value, body.value));
    const bodyLength = computed(() => [...body.value.trim()].length);
    /** 空的時候不用先說「還沒寫內容」，按鈕反灰就夠了 */
    const shownProblem = computed(() => (body.value.trim() ? problem.value : ''));
    const bound = computed(() => boundAddress(emailsTo.value, messages.value ?? []));

    const submitLabel = computed(() => {
        if (sending.value) return channel.value === 'app' ? '送出中…' : '寄送中…';
        if (draftId.value && triedChannel.value === channel.value) return '再試一次';
        return channel.value === 'app' ? '在 App 裡回' : '寄出';
    });

    /** 這張卡片自己的錯誤自己顯示：後端還沒部署、讀不到訊息，不該蓋掉上面的回報內容 */
    let loadSeq = 0;
    async function load() {
        const seq = ++loadSeq; // 送完的重抓與手動重新整理可能同時在跑，只認最後一次
        loading.value = true;
        loadError.value = '';
        const [thread, emails] = await Promise.allSettled([
            call(token => adminApi.feedbackMessages(token, props.report.id)),
            call(token => adminApi.feedbackEmails(token, props.report.id))
        ]);
        if (seq !== loadSeq) return;
        loading.value = false;

        if (emails.status === 'fulfilled') {
            canSend.value = emails.value.canSend;
            sendReason.value = emails.value.cannotSendReason;
            emailsTo.value = emails.value.to;
        } else {
            canSend.value = false;
            sendReason.value = `讀不到寄信狀態（${errorMessage(emails.reason)}）`;
        }

        if (thread.status === 'fulfilled') {
            messages.value = sortThread(thread.value.messages);
            canReplyInApp.value = thread.value.canReplyInApp;
            appReason.value = thread.value.cannotReplyInAppReason;
        } else if (thread.reason instanceof AdminApiError && thread.reason.status === 404 && emails.status === 'fulfilled') {
            // 後端還沒有 /messages（#600 部署前）：至少看得到來往的信、寄得了信
            messages.value = sortThread(emailsAsMessages(emails.value.emails));
            canReplyInApp.value = false;
            appReason.value = '後端還沒有 App 內回覆（#600 還沒部署）';
        } else {
            loadError.value = errorMessage(thread.reason);
            canReplyInApp.value = false;
            appReason.value = '讀不到訊息，先重新整理';
        }

        if (!channelChosen) channel.value = defaultChannel(canReplyInApp.value, canSend.value);
    }

    function useTemplate(text: string) {
        body.value = applyTemplate(body.value, text);
    }

    /** 表單上已經是這一封，就用表單的按鈕，它的 draftId 是對的；放回只會換鍵，變成另一封 */
    const isCurrentDraft = (message: FeedbackMessage) => draftId.value !== '' && body.value.trim() === message.body;

    /** 拿不到 draft_id 時的退路：內文不用重打，但這是新的一封，所以不蓋掉正在打的內容 */
    function restore(message: FeedbackMessage) {
        choose('email');
        subject.value = message.subject ?? '';
        body.value = message.body;
    }

    async function deliver(via: FeedbackChannel, input: { subject: string; body: string; draftId: string }) {
        sending.value = true;
        error.value = '';
        notice.value = '';
        try {
            if (via === 'app') {
                const result = await call(token => adminApi.sendFeedbackMessage(token, props.report.id, { body: input.body, draftId: input.draftId }));
                notice.value = result.duplicate ? '這則之前已經送出了，這次沒有再送' : '已送到回報者的 App，他下次打開「我的回報」會看到';
            } else {
                const result = await call(token => adminApi.sendFeedbackEmail(token, props.report.id, input));
                notice.value = result.duplicate ? '這封之前已經寄出了，這次沒有再寄' : `已寄給 ${result.email.to}`;
            }
            markDraftSent(input.draftId);
            emit('replied', props.report.id);
        } catch (e) {
            // 草稿留著：502、連線中斷都可能要重送，draftId 不變才不會變兩則
            error.value = e instanceof AdminApiError ? replyErrorMessage(via, e.status, e.message) : errorMessage(e);
        } finally {
            sending.value = false;
            await load(); // 寄失敗也會留一筆；寄成功也要接上新的主旨
        }
    }

    async function send() {
        if (sending.value || problem.value || !available.value) return;
        if (!draftId.value) draftId.value = crypto.randomUUID();
        triedChannel.value = channel.value;
        await deliver(channel.value, { subject: subject.value.trim(), body: body.value.trim(), draftId: draftId.value });
    }

    /** 同一個 draft_id 再送一次就是重寄那一筆，後端看這個鍵，內容照第一次的 */
    async function resend(message: FeedbackMessage) {
        if (sending.value || !message.draftId) return;
        await deliver('email', { subject: message.subject ?? '', body: message.body, draftId: message.draftId });
    }

    /** 誰寫的：開發者寫的顯示哪個管理員；回報者在 App 裡寫的沒有地址，顯示裝置名稱；信件的顯示實際寄件地址 */
    const author = (message: FeedbackMessage) => {
        if (message.direction === 'out') return message.actor ?? '後台';
        return message.from ?? (props.report.deviceName || `#${props.report.deviceId}`);
    };

    onMounted(load);
</script>

<template>
    <section class="dd-detail__card dd-thread">
        <div class="dd-thread__head">
            <h3>來往訊息</h3>
            <button type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="loading" @click="load">重新整理</button>
        </div>

        <p v-if="loadError" class="dd-admin__error" role="alert">讀不到訊息：{{ loadError }}</p>
        <p v-else-if="!messages" class="dd-detail__muted t-shimmer" data-text="載入中…">載入中…</p>

        <ol v-if="messages?.length" class="dd-thread__list">
            <li v-for="message in messages" :key="`${message.channel}-${message.id}`" class="dd-thread__item" :class="`is-${message.direction}`">
                <p class="dd-thread__meta">
                    <span class="dd-thread__tag" :class="`is-${message.direction}`">{{ message.direction === 'out' ? '開發者' : '回報者' }}</span>
                    <span class="dd-thread__tag">{{ CHANNEL_LABELS[message.channel] }}</span>
                    <strong>{{ author(message) }}</strong>
                    <time :datetime="message.createdAt">{{ formatDateTime(message.createdAt) }}</time>
                </p>
                <p v-if="message.subject" class="dd-thread__subject">{{ message.subject }}</p>
                <p class="dd-feedback__desc">{{ message.body }}</p>
                <p class="dd-thread__meta">
                    <!-- 沒事的狀態只留字，要處理的才上色：跟處理狀況的徽章同一套慣例 -->
                    <span v-if="message.channel === 'email'" class="dd-thread__status" :class="`is-${message.status}`">{{ STATUS_LABELS[message.status] }}</span>
                    <span v-if="readState(message) === 'read'" class="dd-thread__read">已讀 · {{ formatDateTime(message.readAt) }}</span>
                    <span v-else-if="readState(message) === 'unread'" class="dd-thread__read is-unread">還沒讀</span>
                    <span v-if="isOtherSender(message, bound)" class="dd-thread__status is-failed" :title="`綁定的是 ${bound}`">不是綁定的信箱</span>
                </p>
                <p v-if="message.status === 'sending'" class="dd-detail__muted">
                    還沒等到寄信服務的結果。停在這裡超過 5 分鐘，多半是信已經寄出、只是沒記到，重寄前先確認對方有沒有收到。
                </p>
                <div v-if="message.status === 'failed' && canSend && !isCurrentDraft(message)" class="dd-detail__actions">
                    <button v-if="message.draftId" type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="sending" @click="resend(message)">重寄這封</button>
                    <button v-else type="button" class="dd-admin__btn dd-admin__btn--ghost" :disabled="sending || !!(subject || body)" @click="restore(message)">放回草稿</button>
                    <span class="dd-detail__muted">{{ message.draftId ? '用同一份草稿重寄，不會變兩封；超過 24 小時才重寄的話，先問對方有沒有收到' : subject || body ? '表單有內容，送出或清掉才能放回' : '放回後是新的一封，先確認對方沒收到' }}</span>
                </div>
            </li>
        </ol>
        <p v-else-if="messages" class="dd-detail__muted">還沒有來往的訊息。</p>

        <div v-if="bothBlocked" class="dd-thread__blocked" role="status">
            <p>這則沒辦法回覆：</p>
            <ul>
                <li>App 裡：{{ appReason ?? '後端沒有說明原因' }}</li>
                <li>寄信：{{ sendReason ?? '後端沒有說明原因' }}</li>
            </ul>
        </div>
        <form v-else-if="messages" class="dd-thread__form" @submit.prevent="send">
            <div class="dd-thread__channels" role="radiogroup" aria-label="回覆的管道">
                <button
                    v-for="option in (['app', 'email'] as const)"
                    :key="option"
                    type="button"
                    role="radio"
                    :aria-checked="channel === option"
                    class="dd-thread__channel"
                    :class="{ 'is-active': channel === option, 'is-blocked': option === 'app' ? !canReplyInApp : !canSend }"
                    :disabled="sending"
                    @click="choose(option)"
                >
                    {{ option === 'app' ? '在 App 裡回' : '寄信' }}
                    <small v-if="option === 'app' ? !canReplyInApp : !canSend">不能用</small>
                </button>
            </div>

            <p v-if="!available" class="dd-thread__blocked" role="status">
                {{ channel === 'app' ? '這則沒辦法在 App 裡回' : '這則寄不了信' }}：{{ blockedReason }}
            </p>
            <p v-else-if="channel === 'app'" class="dd-thread__to">回報者下次打開 App，在「我的回報」看得到（不會推播，靠紅點）</p>
            <p v-else class="dd-thread__to">寄給 <strong>{{ emailsTo }}</strong>（這則回報綁定的 Google 帳號）</p>

            <div class="dd-thread__templates" role="group" aria-label="常用範本">
                <button
                    v-for="template in REPLY_TEMPLATES"
                    :key="template.label"
                    type="button"
                    class="dd-admin__btn dd-admin__btn--ghost"
                    :disabled="sending"
                    @click="useTemplate(template.body(report, channel))"
                >
                    {{ template.label }}
                </button>
            </div>
            <!-- 主旨框按 Enter 會送出整張表單：信一寄出就收不回來，擋掉 -->
            <input
                v-if="channel === 'email'"
                v-model="subject"
                type="text"
                class="dd-thread__input"
                aria-label="主旨"
                placeholder="主旨（留空就接上一封，第一封用預設的）"
                :disabled="sending"
                @keydown.enter.prevent
            />
            <textarea
                v-model="body"
                class="dd-thread__input"
                rows="5"
                aria-label="回覆內容"
                :placeholder="channel === 'email' ? '純文字，後端會自動加上叮咚記帳的結尾' : '純文字'"
                :disabled="sending"
            />
            <div class="dd-detail__actions">
                <button type="submit" class="dd-admin__btn" :disabled="sending || !!problem || !available">{{ submitLabel }}</button>
                <span class="dd-detail__muted">{{ bodyLength.toLocaleString() }} / {{ FEEDBACK_MESSAGE_BODY_MAX.toLocaleString() }} · 送出就收不回來</span>
            </div>
            <p v-if="shownProblem" class="dd-admin__error">{{ shownProblem }}</p>
        </form>

        <p v-if="error" class="dd-admin__error" role="alert">{{ error }}</p>
        <p v-if="notice" class="dd-detail__notice" role="status">✓ {{ notice }}</p>
    </section>
</template>

<style lang="scss">
    .dd-thread {
        &__head {
            @include setFlex(space-between, center, 8px);
        }
        &__list {
            @include setFlex(flex-start, stretch, 8px, column);
            padding: 0;
            margin: 0;
            list-style: none;
        }

        // 開發者的靠右、回報者的靠左，底色分開：一眼看得出對話輪到誰
        &__item {
            @include setFlex(flex-start, stretch, 4px, column);
            background: var(--vp-c-bg-soft);
            max-width: 92%;
            padding: 10px 12px;
            border-radius: 8px;
            margin-right: auto;

            &.is-out {
                background: var(--vp-c-brand-soft);
                margin-left: auto;
                margin-right: 0;
            }
            p { margin: 0; }
        }
        &__meta {
            @include setFlex(flex-start, center, 4px 8px);
            flex-wrap: wrap;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-xs);
            overflow-wrap: anywhere;

            strong { color: var(--vp-c-text-1); }
            &:empty { display: none; }
        }
        &__tag {
            padding: 0 6px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 6px;
            white-space: nowrap;

            &.is-in {
                background: var(--vp-c-default-soft);
                border-color: transparent;
                color: var(--vp-c-text-1);
            }
            &.is-out {
                background: var(--vp-c-bg);
                border-color: transparent;
                color: var(--vp-c-text-1);
            }
        }
        &__subject {
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            overflow-wrap: anywhere;
        }
        &__status {
            padding: 0 6px;
            border-radius: 999px;
            font-weight: 600;
            white-space: nowrap;

            &.is-sending {
                background: var(--vp-c-warning-soft);
                color: var(--vp-c-text-1);
            }
            &.is-failed {
                background: var(--vp-c-danger-soft);
                color: var(--vp-c-text-1);
            }
        }
        &__read {
            white-space: nowrap;

            &.is-unread { color: var(--vp-c-text-3); }
        }
        &__form {
            @include setFlex(flex-start, stretch, 8px, column);
            padding-top: 8px;
            border-top: 1px solid var(--vp-c-divider);
        }
        &__channels {
            @include setFlex(flex-start, center, 6px);
            flex-wrap: wrap;
        }
        &__channel {
            @include setFlex(center, baseline, 6px);
            background: var(--vp-c-bg-soft);
            padding: 4px 12px;
            border-radius: 999px;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            cursor: pointer;

            small { font-size: var(--font-size-xs); }
            &.is-blocked { color: var(--vp-c-text-3); }
            &.is-active {
                background: var(--vp-c-brand-soft);
                color: var(--vp-c-text-1);
                font-weight: 600;
            }
            &:disabled { cursor: not-allowed; }
        }
        &__to {
            margin: 0;
            font-size: var(--font-size-s);
            overflow-wrap: anywhere;
        }
        &__templates {
            @include setFlex(flex-start, center, 6px);
            flex-wrap: wrap;
        }
        &__input {
            background: var(--vp-c-bg-soft);
            width: 100%;
            padding: 6px 10px;
            border: 1px solid var(--vp-c-divider);
            border-radius: 8px;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-s);
            resize: vertical;
        }

        // 不能用不是錯誤，但要一眼看到：不然會以為是畫面壞了、找不到回覆的地方
        &__blocked {
            background: var(--vp-c-warning-soft);
            padding: 8px 12px;
            border-radius: 8px;
            margin: 0;
            font-size: var(--font-size-s);

            p, ul { margin: 0; }
            ul { padding-left: 1.2em; }
        }
    }
</style>
