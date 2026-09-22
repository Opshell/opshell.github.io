<script setup lang="ts">
    import type { DeleteScope } from '../api';
    import { computed, nextTick, ref, watch } from 'vue';
    import { CONTACT_EMAIL, PRIVACY_PATH } from '../../constants';
    import { useGoogleAuth } from '../../useGoogleAuth';
    import { DeleteUnavailableError, requestDeletion } from '../api';
    import { accountErased, accountKept, partialItems } from '../content';

    // 刪除資料與帳號。Google Play 要求「帳號刪除」有一個不用裝 App 也打得開的網址，
    // 手機掉了、App 已經移除的人也要有辦法處理，所以這一頁自己做完整流程，不只是說明。
    //
    // 身分怎麼證明：當場用 Google 登入，把 ID token 交給後端驗（跟 App 綁定用的是同一個 Google 帳號）。
    // 網頁只負責把人送進來，判斷「這個帳號綁了哪台裝置」完全在後端。
    const auth = useGoogleAuth();
    const { credential, expired, isSignedIn, loadError, profile } = auth;

    // 被別的頁面用 iframe 嵌進來時不給登入：這一頁會拿到 ID token，跟後台是同一個理由（溝通板 #20）。
    // 這個元件包在 ClientOnly 裡，setup 只會在瀏覽器跑
    const framed = typeof window !== 'undefined' && window.self !== window.top;

    const scope = ref<DeleteScope>('account');
    const agreed = ref(false);
    const busy = ref(false);
    const error = ref('');
    const done = ref<{ scope: DeleteScope; devices: number } | null>(null);
    /** 後端那支還沒開通時改走寄信 */
    const fallback = ref(false);

    const signInSlot = ref<HTMLElement>();

    const scopes = [
        {
            value: 'link' as const,
            title: '只解除 Google 綁定',
            text: '清除伺服器上的 email、帳號識別碼與 Google 大頭貼。方案、額度、暱稱、徽章與活動紀錄都留著，App 照常使用。',
            note: '換手機時不能再用 Google 拿回權益。之後想綁回來隨時可以。'
        },
        {
            value: 'account' as const,
            title: '刪除伺服器上的帳戶資料',
            text: '上面那些全部清除，另外停用這台裝置：之後不能再使用需要連線的 AI 功能。',
            note: '手機裡的帳本不受影響，要一起刪請用 App 的「資料與備份 → 刪除所有資料」。'
        }
    ];
    const chosen = computed(() => scopes.find(item => item.value === scope.value)!);

    /** 線上那條路走不通時用的信；主旨與內容都先填好，使用者只要按寄出 */
    const mailHref = computed(() => {
        const body = [
            `我要${scope.value === 'link' ? '解除 Google 帳號綁定' : '刪除伺服器上的帳戶資料'}。`,
            '',
            `Google 帳號：${profile.value?.email ?? '（請填寫要處理的 Google 帳號）'}`,
            '',
            '（這封信要用同一個 Google 帳號寄出，我才能確認是本人。）'
        ].join('\n');
        return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('叮咚記帳：刪除資料')}&body=${encodeURIComponent(body)}`;
    });

    // Google 的按鈕畫在它自己來源的 iframe 裡，元素要先存在才畫得上去。
    // 盯著元素本身而不是登入狀態：登出、從「已完成」退回上一步，都是換一個新的空元素進來，一律要重畫
    watch(signInSlot, async (el) => {
        if (!el || framed) return;
        await nextTick();
        auth.renderButton(el);
    }, { flush: 'post' });

    // 換了要刪的範圍，就要重新確認一次
    watch(scope, () => {
        agreed.value = false;
        error.value = '';
        fallback.value = false;
    });

    async function submit() {
        if (!credential.value || !agreed.value || busy.value) return;
        busy.value = true;
        error.value = '';
        fallback.value = false;

        try {
            const result = await requestDeletion(credential.value, scope.value);
            done.value = result;
            auth.signOut(); // 處理完就把憑證丟掉，不留在這個分頁裡
        } catch (caught) {
            if (caught instanceof DeleteUnavailableError) fallback.value = true;
            else error.value = (caught as Error).message;
            if ((caught as Error).message.includes('登入')) auth.markExpired();
        } finally {
            busy.value = false;
        }
    }

    function restart() {
        done.value = null;
        agreed.value = false;
        fallback.value = false;
        error.value = '';
    }
</script>

<template>
    <div class="dd-account">
        <div class="dd-account__wrap">
            <header class="dd-account__head">
                <p class="dd-account__crumb"><a href="/dindon/">叮咚記帳</a> ／ 刪除資料與帳號</p>
                <h1>刪除叮咚記帳的資料</h1>
                <p class="dd-account__lead">
                    叮咚記帳不用註冊。你的帳本記在自己的手機裡，伺服器上只有一筆裝置紀錄（方案與 AI 額度），
                    以及你自己選擇綁定的 Google 帳號。這一頁說明每一種資料怎麼刪，也可以直接在這裡線上處理。
                </p>
            </header>

            <!-- #region [P] 只刪一部分 -->
            <section class="dd-account__section" aria-labelledby="partial">
                <h2 id="partial">只想刪一部分，不想刪整個帳戶</h2>
                <p class="dd-account__note">以下每一項都可以單獨處理，你的帳戶、方案與額度都會保留。</p>

                <ul class="dd-account__list">
                    <li v-for="item in partialItems" :key="item.title">
                        <h3>{{ item.title }}</h3>
                        <p v-if="item.inApp" class="path"><span aria-hidden="true">📱</span>{{ item.inApp }}</p>
                        <p v-else class="path is-mail"><span aria-hidden="true">✉️</span>寫信處理</p>
                        <p>{{ item.what }}</p>
                        <p class="keeps">{{ item.keeps }}</p>
                    </li>
                </ul>
            </section>
            <!-- #endregion -->

            <!-- #region [P] 線上刪除 -->
            <section class="dd-account__section" aria-labelledby="online">
                <h2 id="online">線上刪除</h2>
                <p class="dd-account__note">
                    用你綁在叮咚記帳上的那個 Google 帳號登入，就能自己處理，不用等我回信。
                    手機不在手邊、或已經移除 App 的話，這裡一樣做得到。
                </p>

                <div v-if="done" class="dd-account__panel is-done" role="status">
                    <h3>已經處理完了</h3>
                    <p v-if="done.devices === 0">
                        這個 Google 帳號目前沒有綁在任何一台裝置上——可能你已經解除過了，或當初就沒有綁。
                        伺服器上沒有跟這個帳號有關的資料。
                    </p>
                    <p v-else-if="done.scope === 'link'">
                        已經清除伺服器上的 Google 帳號 email、帳號識別碼與大頭貼（{{ done.devices }} 台裝置）。
                        方案、額度與活動紀錄都留著，App 照常使用。
                    </p>
                    <p v-else>
                        已經清除伺服器上跟你有關的資料，並停用那 {{ done.devices }} 台裝置。
                        手機裡的帳本不受影響，要一起刪請用 App 的「資料與備份 → 刪除所有資料」。
                    </p>
                    <p class="dd-account__note">已經幫你登出。有疑問寫信到 <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>。</p>
                    <button type="button" class="dd-account__btn" @click="restart">回到上一步</button>
                </div>

                <div v-else class="dd-account__panel">
                    <fieldset class="dd-account__scopes">
                        <legend>要刪掉哪些？</legend>
                        <label v-for="item in scopes" :key="item.value" class="dd-account__scope" :class="{ 'is-on': scope === item.value }">
                            <input v-model="scope" type="radio" name="dd-scope" :value="item.value" />
                            <span class="body">
                                <span class="title">{{ item.title }}</span>
                                <span class="text">{{ item.text }}</span>
                                <span class="note">{{ item.note }}</span>
                            </span>
                        </label>
                    </fieldset>

                    <div v-if="scope === 'account'" class="dd-account__detail">
                        <div>
                            <h4>會刪除</h4>
                            <ul>
                                <li v-for="line in accountErased" :key="line">{{ line }}</li>
                            </ul>
                        </div>
                        <div>
                            <h4>會留下</h4>
                            <ul>
                                <li v-for="line in accountKept" :key="line">{{ line }}</li>
                            </ul>
                            <p class="dd-account__note">留下的都已經對應不回任何人，細節寫在<a :href="PRIVACY_PATH">隱私權政策第 6 節</a>。</p>
                        </div>
                    </div>

                    <p v-if="framed" class="dd-account__error" role="alert">
                        這一頁被嵌在別的網頁裡，為了安全不提供登入。請直接打開
                        <a href="https://opshell.me/dindon/account/">opshell.me/dindon/account/</a>。
                    </p>

                    <div v-else-if="!isSignedIn" class="dd-account__signin">
                        <p>請用<strong>要處理的那個 Google 帳號</strong>登入，證明是本人。</p>
                        <div ref="signInSlot" class="dd-account__gbtn" />
                        <p v-if="expired" class="dd-account__error" role="alert">登入已過期，請重新登入。</p>
                        <p v-if="loadError" class="dd-account__error" role="alert">
                            {{ loadError }}。也可以改用寄信：<a :href="mailHref">{{ CONTACT_EMAIL }}</a>
                        </p>
                        <p class="dd-account__note">
                            登入只用來確認身分：ID token 交給伺服器驗一次就丟掉，不會存在這個網頁裡，
                            也不會讓我拿到你的密碼或 Google 帳號裡的任何東西。
                        </p>
                    </div>

                    <div v-else class="dd-account__confirm">
                        <p class="dd-account__who">
                            已登入 <strong>{{ profile?.email }}</strong>
                            <button type="button" class="dd-account__linkbtn" @click="auth.signOut()">換一個帳號</button>
                        </p>

                        <label class="dd-account__agree">
                            <input v-model="agreed" type="checkbox" />
                            <span>我確認要{{ chosen.title }}，而且知道這個動作無法復原。</span>
                        </label>

                        <button type="button" class="dd-account__btn is-danger" :disabled="!agreed || busy" @click="submit">
                            {{ busy ? '處理中…' : `確認${chosen.title}` }}
                        </button>

                        <p v-if="error" class="dd-account__error" role="alert">{{ error }}</p>
                        <div v-if="fallback" class="dd-account__error" role="alert">
                            <p>線上刪除目前無法使用（後端還沒開通，或連線被擋住）。</p>
                            <p>
                                改用寄信一樣算數：
                                <a class="dd-account__btn" :href="mailHref">寄出已經填好的刪除申請</a>
                            </p>
                            <p class="dd-account__note">請用同一個 Google 帳號寄出，我才能確認是本人。收到後會在 7 天內處理完並回信。</p>
                        </div>
                    </div>
                </div>
            </section>
            <!-- #endregion -->

            <section class="dd-account__section" aria-labelledby="other">
                <h2 id="other">還有問題？</h2>
                <p class="dd-account__note">
                    上面沒有涵蓋到的，或是不方便登入，都可以寫信到
                    <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>，我會在 7 天內處理完並回信。
                </p>
            </section>

            <footer class="dd-account__foot">
                <a href="/dindon/">叮咚記帳</a>
                <span aria-hidden="true">·</span>
                <a :href="PRIVACY_PATH">隱私權政策</a>
                <span aria-hidden="true">·</span>
                <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>
            </footer>
        </div>
    </div>
</template>

<style lang="scss">
    // 色票沿用宣傳頁（DinDonLanding.vue），兩頁要看起來是同一個東西
    .dd-account {
        --dd-bg: #F6F4F1;
        --dd-surface: #FEFDFC;
        --dd-sunken: #E4DED2;
        --dd-border: #D2CCC0;
        --dd-text: #1B1815;
        --dd-muted: #6B6157;
        --dd-primary: #1D59BB;
        --dd-on-primary: #FFFDF8;
        --dd-danger: #A3251A;
        --dd-radius: 16px;
        background: var(--dd-bg);
        min-height: 100vh;
        padding: 40px 16px 64px;
        color: var(--dd-text);
        line-height: 1.75;

        h1, h2, h3, h4, p { margin: 0; }
        ul {
            padding: 0;
            margin: 0;
        }
        a {
            color: var(--dd-primary);
            text-decoration: underline;
        }

        &__wrap {
            max-width: 760px;
            margin: 0 auto;
        }

        &__head {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding-bottom: 32px;
            border-bottom: 1px solid var(--dd-border);

            h1 { font-size: clamp(28px, 5vw, 40px); }
        }
        &__crumb {
            color: var(--dd-muted);
            font-size: var(--font-size-s);
        }
        &__lead { color: var(--dd-muted); }

        &__section {
            padding-top: 40px;

            h2 {
                margin-bottom: 8px;
                font-size: clamp(20px, 3vw, 26px);
            }
        }
        &__note {
            color: var(--dd-muted);
            font-size: var(--font-size-s);
        }

        // 只刪一部分：一項一張卡
        &__list {
            display: grid;
            gap: 12px;
            margin-top: 20px;
            list-style: none;

            li {
                display: flex;
                flex-direction: column;
                gap: 4px;
                background: var(--dd-surface);
                padding: 16px 18px;
                border: 1px solid var(--dd-border);
                border-radius: var(--dd-radius);
            }
            h3 { font-size: var(--font-size-m); }
            .path {
                align-self: flex-start;
                display: inline-flex;
                gap: 6px;
                background: var(--dd-sunken);
                padding: 2px 10px;
                border-radius: 999px;
                font-size: var(--font-size-xs);
            }
            .keeps {
                color: var(--dd-muted);
                font-size: var(--font-size-s);
            }
        }

        // 線上刪除
        &__panel {
            display: flex;
            flex-direction: column;
            gap: 20px;
            background: var(--dd-surface);
            padding: 24px;
            border: 1px solid var(--dd-border);
            border-radius: var(--dd-radius);
            margin-top: 20px;

            &.is-done h3 { margin-bottom: 8px; }
        }
        &__scopes {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 0;
            border: 0;

            legend {
                padding: 0;
                margin-bottom: 10px;
                font-weight: 700;
            }
        }
        &__scope {
            display: flex;
            gap: 12px;
            background: var(--dd-bg);
            padding: 14px 16px;
            border: 1px solid var(--dd-border);
            border-radius: 12px;
            cursor: pointer;

            &.is-on {
                border-color: var(--dd-primary);
                box-shadow: inset 0 0 0 1px var(--dd-primary);
            }
            input { margin-top: 6px; }
            .body {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .title { font-weight: 700; }
            .text { font-size: var(--font-size-s); }
            .note {
                color: var(--dd-muted);
                font-size: var(--font-size-xs);
            }
        }
        &__detail {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
            background: var(--dd-bg);
            padding: 16px 18px;
            border-radius: 12px;

            h4 {
                margin-bottom: 6px;
                font-size: var(--font-size-s);
            }
            ul {
                padding-left: 18px;
                font-size: var(--font-size-s);
                list-style: disc;
            }
            @include setRWD(640px) {
                grid-template-columns: minmax(0, 1fr);
            }
        }

        &__signin, &__confirm {
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
        }
        &__gbtn { min-height: 44px; }
        &__who {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: baseline;
        }
        &__agree {
            display: flex;
            gap: 10px;
            align-items: flex-start;
            cursor: pointer;

            input { margin-top: 7px; }
        }

        &__btn {
            display: inline-block;
            background: var(--dd-sunken);
            padding: 10px 20px;
            border: 0;
            border-radius: 999px;
            color: var(--dd-text);
            font-size: var(--font-size-s);
            font-weight: 700;
            text-decoration: none;
            cursor: pointer;

            &.is-danger {
                background: var(--dd-danger);
                color: var(--dd-on-primary);
            }
            &:disabled {
                cursor: not-allowed;
                opacity: .45;
            }
        }
        &__linkbtn {
            background: none;
            padding: 0;
            border: 0;
            color: var(--dd-primary);
            font-size: var(--font-size-s);
            text-decoration: underline;
            cursor: pointer;
        }
        &__error {
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
            color: var(--dd-danger);
            font-size: var(--font-size-s);

            a { color: inherit; }
        }

        &__foot {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: center;
            padding-top: 40px;
            border-top: 1px solid var(--dd-border);
            margin-top: 40px;
            color: var(--dd-muted);
            font-size: var(--font-size-s);
        }
    }

    .dark .dd-account {
        --dd-bg: #131109;
        --dd-surface: #1E1B14;
        --dd-sunken: #322D24;
        --dd-border: #4A4335;
        --dd-text: #F4EFE3;
        --dd-muted: #B3A997;
        --dd-primary: #76B9FF;
        --dd-on-primary: #14120E;
        --dd-danger: #FF9C8F;
    }
</style>
