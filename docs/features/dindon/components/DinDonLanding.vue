<script setup lang="ts">
    import { ref } from 'vue';
    import {
        ACCOUNT_PATH,
        BETA_SEATS,
        GROUP_URL,
        betaRewards,
        betaSteps,
        CONTACT_EMAIL,
        invoicePains,
        lazyPoints,
        photoSources,
        PLAY_OPTIN_URL,
        PRIVACY_PATH,
        SIGNUP_HREF,
        withoutNotice
    } from '../constants';
    import { useLandingMotion } from '../hooks/useLandingMotion';
    import DinDonBell from './DinDonBell.vue';

    const rootRef = ref<HTMLElement>();
    useLandingMotion(rootRef);

    const delay = (index: number, step = 80) => ({ '--reveal-delay': `${index * step}ms` });
</script>

<template>
    <div ref="rootRef" class="dindon-landing">
        <!-- #region [P] hero：付完錢，就等於記完帳 -->
        <section class="dindon-landing__hero">
            <!-- 背景的平面圓塊，速度不同做出景深 -->
            <span class="dindon-landing__deco is-a" data-parallax=".35" data-parallax-scroll aria-hidden="true"></span>
            <span class="dindon-landing__deco is-b" data-parallax=".2" data-parallax-scroll aria-hidden="true"></span>
            <span class="dindon-landing__deco is-c" data-parallax="-.15" data-parallax-scroll aria-hidden="true"></span>

            <div class="dindon-landing__container dindon-landing__hero-inner">
                <div class="dindon-landing__hero-copy">
                    <div class="dindon-landing__brand">
                        <DinDonBell :size="72" class="icon" />
                        <div>
                            <p class="name">叮咚記帳</p>
                            <p class="latin">DinDon Ledger</p>
                        </div>
                    </div>

                    <h1 class="dindon-landing__headline">付完錢，<br />就等於記完帳。</h1>
                    <p class="dindon-landing__lead">
                        挑戰無腦記帳的極限。付款通知一跳出來，通知小精靈就幫你記好、分好類——你連 App 都不用打開。
                    </p>

                    <div class="dindon-landing__actions">
                        <a class="dindon-landing__btn is-primary" :href="GROUP_URL" target="_blank" rel="noopener">加入封閉測試<span class="arrow" aria-hidden="true">→</span></a>
                        <a class="dindon-landing__btn" href="#why">看看怎麼做到<span class="arrow is-down" aria-hidden="true">↓</span></a>
                    </div>
                    <p class="dindon-landing__note">僅限 Android 7.0 以上 · 封測限額 {{ BETA_SEATS }} 名 · 即將在 Google Play 上架</p>
                </div>

                <div class="dindon-landing__hero-shot">
                    <div class="dindon-landing__hero-stage">
                        <div data-parallax=".12" data-parallax-scroll>
                            <div class="dindon-landing__phone is-cropped">
                                <img src="/images/dindon/home.webp" alt="叮咚記帳首頁：今日花費、本月累積與今天的每一筆帳" loading="eager" />
                            </div>
                        </div>

                        <!-- 和圖示的鈴鐺同一組時間：鈴一響，通知跳出來，接著記成一筆帳 -->
                        <div class="dindon-landing__chip is-notify" data-parallax="-.08" data-parallax-scroll aria-hidden="true">
                            <span class="chip-icon">💳</span>
                            <span>
                                <span class="chip-title">刷卡消費 NT$120</span>
                                <span class="chip-text">全家便利商店 · 剛剛</span>
                            </span>
                        </div>
                        <div class="dindon-landing__chip is-recorded" data-parallax="-.2" data-parallax-scroll aria-hidden="true">
                            <span class="chip-icon">✓</span>
                            <span>
                                <span class="chip-title">已自動記帳</span>
                                <span class="chip-text">餐飲 · 全家便利商店</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 電子發票的痛點 -->
        <section id="why" class="dindon-landing__section">
            <div class="dindon-landing__container">
                <p class="dindon-landing__eyebrow" data-reveal>電子支付越來越普及，付完錢，本來就該等於記完帳</p>
                <h2 class="dindon-landing__title" data-reveal :style="delay(1)">那不是有電子發票 App 了嗎？</h2>
                <p class="dindon-landing__subtitle" data-reveal :style="delay(2)">用過就知道，拿電子發票來記帳，卡在這幾個地方：</p>

                <ul class="dindon-landing__pains">
                    <li v-for="(pain, index) in invoicePains" :key="pain.title" class="dindon-landing__card" data-reveal :style="delay(index, 70)">
                        <span class="feature-icon" aria-hidden="true">{{ pain.icon }}</span>
                        <h3>{{ pain.title }}</h3>
                        <p>{{ pain.text }}</p>
                    </li>
                </ul>

                <p class="dindon-landing__answer" data-reveal>
                    <DinDonBell :size="44" class="bell" />
                    <span>叮咚記帳看的是<strong>付款通知</strong>：通知跳出來的那一秒，帳就記好了。</span>
                </p>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 就算沒有通知 -->
        <section class="dindon-landing__section is-sunken">
            <div class="dindon-landing__container">
                <h2 class="dindon-landing__title" data-reveal>就算沒有通知</h2>
                <p class="dindon-landing__subtitle" data-reveal :style="delay(1)">付現、沒發通知的消費，一樣不用打字。</p>

                <ul class="dindon-landing__features">
                    <li v-for="(item, index) in withoutNotice" :key="item.title" class="dindon-landing__card" data-reveal :style="delay(index, 70)">
                        <span class="feature-icon" aria-hidden="true">{{ item.icon }}</span>
                        <h3>{{ item.title }}<span v-if="item.tag" class="dindon-landing__new">{{ item.tag }}</span></h3>
                        <p>{{ item.text }}</p>
                    </li>
                </ul>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 拍照：挑戰隨手記帳的速度極限 -->
        <section class="dindon-landing__section">
            <div class="dindon-landing__container dindon-landing__split">
                <div class="dindon-landing__split-copy">
                    <p class="dindon-landing__eyebrow" data-reveal>挑戰隨手記帳的速度極限</p>
                    <h2 class="dindon-landing__title" data-reveal :style="delay(1)">拍照記帳只能拍電子發票？</h2>
                    <p class="dindon-landing__no" data-reveal :style="delay(2)">不。</p>

                    <ul class="dindon-landing__sources" aria-label="拍照記帳能拍的東西">
                        <li v-for="(source, index) in photoSources" :key="source" data-reveal :style="delay(index + 3, 70)">{{ source }}</li>
                    </ul>

                    <p class="dindon-landing__shutter" data-reveal>
                        只要上面有資料，大約 5 秒，<strong>喀嚓</strong>，記完帳了。
                    </p>
                </div>

                <div class="dindon-landing__phones">
                    <div class="dindon-landing__phone is-back" data-parallax=".06">
                        <img src="/images/dindon/statement.webp" alt="帳單截圖記帳：信用卡帳單的每一列都讀出來，勾選後一次記好" loading="lazy" />
                    </div>
                    <div class="dindon-landing__phone is-front" data-parallax="-.08">
                        <img src="/images/dindon/items.webp" alt="拍照記帳的結果：店家、分類與每個品項的金額" loading="lazy" />
                    </div>
                </div>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 最懶人的記帳體驗（每一點都要和隱私權政策對得上） -->
        <section class="dindon-landing__section is-sunken">
            <div class="dindon-landing__container dindon-landing__split">
                <div class="dindon-landing__split-copy">
                    <h2 class="dindon-landing__title" data-reveal>最懶人的記帳體驗</h2>
                    <p class="dindon-landing__subtitle" data-reveal :style="delay(1)">最舒適的用法，也是最放心的用法。</p>

                    <ul class="dindon-landing__points">
                        <li v-for="(point, index) in lazyPoints" :key="point.title" class="dindon-landing__card" data-reveal :style="delay(index + 2, 80)">
                            <span class="feature-icon" aria-hidden="true">{{ point.icon }}</span>
                            <h3>{{ point.title }}</h3>
                            <p>{{ point.text }}</p>
                        </li>
                    </ul>

                    <p class="dindon-landing__links">
                        <a class="dindon-landing__link" :href="PRIVACY_PATH" data-reveal>看完整的隱私權政策<span class="arrow" aria-hidden="true">→</span></a>
                        <a class="dindon-landing__link" :href="ACCOUNT_PATH" data-reveal :style="delay(1)">要刪除資料或帳號<span class="arrow" aria-hidden="true">→</span></a>
                    </p>
                </div>

                <figure class="dindon-landing__figure" data-reveal="right">
                    <div class="dindon-landing__phone" data-parallax=".06">
                        <img src="/images/dindon/stats.webp" alt="花費統計：本月各分類的圓餅圖與金額" loading="lazy" />
                    </div>
                    <figcaption>打開統計，直觀知道錢去哪了</figcaption>
                </figure>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 有成就感的記帳 -->
        <section class="dindon-landing__section">
            <div class="dindon-landing__container dindon-landing__split is-reverse">
                <div class="dindon-landing__split-copy">
                    <h2 class="dindon-landing__title" data-reveal>有成就感的記帳</h2>
                    <p class="dindon-landing__big" data-reveal :style="delay(1)">
                        養成記帳習慣最好的方式，<br />就是<strong>幾乎沒有啟動門檻</strong>。
                    </p>
                    <p class="dindon-landing__subtitle" data-reveal :style="delay(2)">
                        <!-- 中文寫在同一行：換行會在「；」後面多出一個空格 -->
                        付款自動記、拍一張、說一句——低到不用下決心。再加上 8 種成就徽章，每種都能從銅一路升到七彩；升級還會解鎖稱號的詞，組出屬於你的一行稱號，記帳也可以有點收集的樂趣。
                    </p>
                </div>

                <figure class="dindon-landing__figure" data-reveal>
                    <div class="dindon-landing__phone" data-parallax="-.06">
                        <img src="/images/dindon/badges.webp" alt="徽章牆：勤勞記帳、自動駕駛等成就徽章，從銅級升到七彩級" loading="lazy" />
                    </div>
                    <figcaption>徽章牆</figcaption>
                </figure>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 封測招募 -->
        <section id="beta" class="dindon-landing__section is-sunken">
            <div class="dindon-landing__container">
                <div class="dindon-landing__beta">
                    <div class="beta-copy">
                        <p class="dindon-landing__seats" data-reveal>
                            <strong>限額 {{ BETA_SEATS }} 名</strong>
                            <span>僅限 Android · 額滿為止</span>
                        </p>
                        <h2 class="dindon-landing__title" data-reveal :style="delay(1)">加入封閉測試</h2>
                        <p class="dindon-landing__subtitle" data-reveal :style="delay(2)">
                            Google Play 規定新 App 上架前，要先經過一段封閉測試。你平常照樣花錢、照樣收通知，就是在幫叮咚記帳上架。
                        </p>

                        <ol class="dindon-landing__steps">
                            <li v-for="(step, index) in betaSteps" :key="step" data-reveal :style="delay(index + 3, 90)">{{ step }}</li>
                        </ol>

                        <div class="dindon-landing__actions" data-reveal :style="delay(6, 90)">
                            <a class="dindon-landing__btn is-primary" :href="GROUP_URL" target="_blank" rel="noopener">申請加入封測群組<span class="arrow" aria-hidden="true">→</span></a>
                            <a v-if="PLAY_OPTIN_URL" class="dindon-landing__btn" :href="PLAY_OPTIN_URL" target="_blank" rel="noopener">已核准？前往安裝<span class="arrow" aria-hidden="true">→</span></a>
                        </div>
                        <p class="dindon-landing__note">
                            需要：Android 7.0 以上的手機、一個 Google 帳號（要和 Play 商店登入的是同一個）。有問題寫信到 <a :href="SIGNUP_HREF" class="email">{{ CONTACT_EMAIL }}</a>。
                        </p>

                        <figure class="dindon-landing__figure is-event" data-reveal>
                            <div class="dindon-landing__phone" data-parallax="-.05">
                                <img src="/images/dindon/event.webp" alt="Beta 貢獻活動的排行榜：前三名、自己的名次與每個人的回報件數" loading="lazy" />
                            </div>
                            <figcaption>App 裡的排行榜（畫面中的名字是示範資料）</figcaption>
                        </figure>
                    </div>

                    <div>
                        <p class="dindon-landing__rewards-title" data-reveal>參加封測可以拿到的未來優惠</p>
                        <ul class="dindon-landing__rewards">
                            <li v-for="(reward, index) in betaRewards" :key="reward.title" data-reveal="right" :style="delay(index + 1, 120)">
                                <span class="tag">{{ reward.tag }}</span>
                                <h3>{{ reward.title }}</h3>
                                <p class="condition">{{ reward.condition }}</p>
                                <p class="reward">→ {{ reward.reward }}</p>
                                <dl v-if="reward.tiers" class="tiers">
                                    <div v-for="tier in reward.tiers" :key="tier.rank">
                                        <dt>{{ tier.rank }}</dt>
                                        <dd>{{ tier.reward }}</dd>
                                    </div>
                                </dl>
                            </li>
                        </ul>
                        <p class="dindon-landing__note is-fine" data-reveal>
                            名次不並列：同分時先達到這個分數的人排前面。名次獎與全勤另外算，一筆接一筆排，從正式版上線那天開始算；實際發放以活動結束時公布為準。活動結束後，打卡、名次和紀念徽章的紀錄都會留著。換手機也拿得回來：記得在 App 裡綁定 Google 帳號。
                        </p>
                    </div>
                </div>
            </div>
        </section>
        <!-- #endregion -->

        <footer class="dindon-landing__footer">
            <div class="dindon-landing__container">
                <a :href="PRIVACY_PATH">隱私權政策</a>
                <span aria-hidden="true">·</span>
                <a :href="ACCOUNT_PATH">刪除資料與帳號</a>
                <span aria-hidden="true">·</span>
                <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>
                <span aria-hidden="true">·</span>
                <span>叮咚記帳 DinDon Ledger</span>
            </div>
        </footer>
    </div>
</template>

<style lang="scss">
    // 配色沿用 App 的 Sicily 色票（DinDon_Android/…/ui/theme/Color.kt），讓網頁和 App 看起來是同一個東西
    // 動態維持 App 的平面風格：只有位移、透明度與淡淡的陰影，不做高光、描邊、漣漪圈
    .dindon-landing {
        --dd-bg: #F6F4F1;
        --dd-surface: #FEFDFC;
        --dd-sunken: #E4DED2;
        --dd-border: #D2CCC0;
        --dd-text: #1B1815;
        --dd-muted: #6B6157;
        --dd-primary: #1D59BB;
        --dd-on-primary: #FFFDF8;
        --dd-accent: #FEBD19;
        --dd-accent-tint: #FEF3B3;
        --dd-accent-border: #A87400;
        --dd-frame: #1B1815; // 手機外框兩個模式都是深色
        --dd-radius: 20px;
        --dd-ease-out: cubic-bezier(.22, 1, .36, 1);
        --dd-story-duration: 8s; // 鈴響 → 通知 → 已記帳，一輪的長度（DinDonBell 也讀這兩個）
        --dd-story-delay: .9s; // 等開頭的進場動畫跑完再響
        background: var(--dd-bg);
        color: var(--dd-text);
        line-height: 1.7;
        overflow-x: clip; // 從右側滑入的元素進場前會超出版面；clip 不會像 hidden 那樣變成捲動容器

        h1, h2, h3, p { margin: 0; }
        ul, ol {
            padding: 0;
            margin: 0;
        }

        // 視差用獨立的 translate 屬性，不和進場動畫的 transform 互相覆蓋
        [data-parallax] { translate: 0 var(--py, 0); }

        &__container {
            max-width: 1080px;
            padding: 0 24px;
            margin: 0 auto;
            @include setRWD(500px) { padding: 0 16px; }
        }

        // #region [P] 捲動進場（is-motion 由 useLandingMotion 在瀏覽器端加上；SSR 與減少動態時內容照常顯示）
        &.is-motion [data-reveal] {
            transform: translateY(28px);
            transition:
                opacity .7s var(--dd-ease-out) var(--reveal-delay, 0ms),
                transform .7s var(--dd-ease-out) var(--reveal-delay, 0ms);
            opacity: 0;
        }
        &.is-motion [data-reveal=right] { transform: translateX(32px); }
        &.is-motion [data-reveal].is-visible {
            transform: none;
            opacity: 1;
        }

        // #endregion

        // #region [P] hero
        &__hero {
            position: relative;
            background: var(--dd-accent);
            padding: 64px 0 0;
            color: var(--dd-text); // 深色模式在這裡把 --dd-text 換回深色，要重新套一次才會生效
            overflow: hidden;
            @include setRWD(768px) { padding-top: 40px; }
        }
        &__deco {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;

            &.is-a {
                top: -160px;
                right: -140px;
                background: rgb(255, 255, 255, 16%);
                width: 460px;
                height: 460px;
            }
            &.is-b {
                bottom: -70px;
                left: 4%;
                background: rgb(168, 116, 0, 9%);
                width: 200px;
                height: 200px;
            }
            &.is-c {
                top: 22%;
                left: 46%;
                background: rgb(255, 255, 255, 22%);
                width: 88px;
                height: 88px;
            }
        }
        &__hero-inner {
            position: relative;
            display: grid;
            grid-template-columns: 1.1fr .9fr;
            gap: 48px;
            align-items: end;
            z-index: 1;
            @include setRWD(768px) {
                grid-template-columns: 1fr;
                gap: 40px;
            }
        }
        &__hero-copy {
            @include setFlex(flex-start, flex-start, 24px, column);
            padding-bottom: 72px;
            @include setRWD(768px) { padding-bottom: 0; }

            // 開頭依序浮上來。純 CSS，SSR 的 HTML 一載入就開始播
            > * { animation: dd-rise .8s var(--dd-ease-out) both; }
            > :nth-child(2) { animation-delay: .08s; }
            > :nth-child(3) { animation-delay: .16s; }
            > :nth-child(4) { animation-delay: .24s; }
            > :nth-child(5) { animation-delay: .32s; }
        }
        &__brand {
            @include setFlex(flex-start, center, 14px);

            .name {
                font-size: var(--font-size-l);
                font-weight: 700;
            }
            .latin {
                color: color-mix(in srgb, var(--dd-text) 70%, transparent);
                font-size: var(--font-size-s);
                letter-spacing: .12em;
            }
        }
        &__headline {
            font-size: clamp(2.25rem, 5vw, 3.5rem);
            font-weight: 800;
            line-height: 1.25;
            letter-spacing: .02em;
        }
        &__lead {
            max-width: 32em;
            font-size: var(--font-size-l);
        }
        &__actions {
            @include setFlex(flex-start, center, 12px);
            flex-wrap: wrap;
        }
        &__btn {
            display: inline-block;
            padding: 12px 26px;
            border: 2px solid var(--dd-text);
            border-radius: 999px;
            color: var(--dd-text);
            font-weight: 700;
            text-decoration: none;
            transition: translate .25s var(--cubic-FiSo);

            .arrow {
                display: inline-block;
                margin-left: 8px;
                transition: transform .25s var(--cubic-FiSo);
            }
            @media (hover: hover) {
                &:hover {
                    translate: 0 -2px;

                    .arrow { transform: translateX(4px); }
                    .arrow.is-down { transform: translateY(3px); }
                }
            }
            &:focus-visible {
                outline: 3px solid var(--dd-primary);
                outline-offset: 3px;
            }
            &.is-primary {
                background: var(--dd-primary);
                border-color: var(--dd-primary);
                color: var(--dd-on-primary);
            }
        }
        &__note {
            color: var(--dd-muted);
            font-size: var(--font-size-s);

            .email { white-space: nowrap; }
            &.is-fine { margin-top: 12px !important; }
        }
        &__hero &__note { color: color-mix(in srgb, var(--dd-text) 72%, transparent); }

        &__hero-shot {
            @include setFlex(center, flex-end);
        }
        &__hero-stage {
            position: relative;
            width: 100%;
            max-width: 360px;
            animation: dd-rise-stage 1s var(--dd-ease-out) .2s both; // 手機從底邊升上來
        }

        // #endregion

        // #region [P] 通知卡片：和鈴鐺同步，一輪 = 通知跳出 → 已記帳 → 一起淡出
        &__chip {
            position: absolute;
            display: flex;
            gap: 10px;
            align-items: center;
            background: #FEFDFC; // 兩個模式都是淺色，和手機截圖一致
            padding: 10px 16px 10px 10px;
            border-radius: 16px;
            box-shadow: 0 6px 20px rgb(27, 24, 21, 10%);
            color: #1B1815;
            font-size: var(--font-size-s);
            line-height: 1.4;
            white-space: nowrap;
            animation: dd-chip-notify var(--dd-story-duration) ease var(--dd-story-delay) infinite both;
            z-index: 2;

            .chip-icon {
                @include setFlex();
                flex: none;
                background: #FEF3B3;
                width: 36px;
                height: 36px;
                border-radius: 10px;
                font-size: 1.1rem;
            }
            .chip-title {
                display: block;
                font-weight: 700;
            }
            .chip-text {
                display: block;
                color: #6B6157;
                font-size: var(--font-size-xs);
            }

            // 貼著手機上緣，像系統跳出的通知橫幅，也不會蓋住截圖裡的金額
            &.is-notify {
                top: 18px;
                left: -84px;
                @include setRWD(1024px) { left: -24px; }
                @include setRWD(768px) {
                    top: 12px;
                    left: -8px;
                }
            }
            &.is-recorded {
                top: 176px;
                right: -56px;
                animation-name: dd-chip-recorded;
                @include setRWD(1024px) { right: -16px; }
                @include setRWD(768px) {
                    top: 140px;
                    right: -8px;
                }

                .chip-icon {
                    background: #E2EFFD;
                    color: #1D59BB;
                    font-weight: 800;
                }
            }
        }

        // #endregion

        // #region [P] phone：平面的外框，不做高光與擬真反光
        &__phone {
            background: var(--dd-frame);
            width: 100%;
            max-width: 300px;
            border: 10px solid var(--dd-frame);
            border-radius: 36px;
            overflow: hidden;

            img {
                display: block;
                width: 100%;
                height: auto;
                border-radius: 26px;
            }
            @include setRWD(500px) {
                border-width: 6px;
                border-radius: 24px;

                img { border-radius: 18px; }
            }

            // 首頁截圖只取上半，手機從底邊「長出來」
            &.is-cropped {
                max-width: 360px;
                border-bottom: 0;
                border-radius: 40px 40px 0 0;

                img { border-radius: 30px 30px 0 0; }
            }
        }

        // #endregion

        // #region [P] section 共用
        &__section {
            padding: 96px 0;
            @include setRWD(768px) { padding: 64px 0; }

            &.is-sunken { background: var(--dd-sunken); }
        }
        &__eyebrow {
            margin-bottom: 8px !important;
            color: var(--dd-accent-border);
            font-size: var(--font-size-s);
            font-weight: 700;
            letter-spacing: .04em;
        }
        &__title {
            font-size: var(--font-size-xxl);
            font-weight: 800;
            line-height: 1.35;
            @include setRWD(500px) { font-size: var(--font-size-xl); }
        }
        &__subtitle {
            max-width: 40em;
            margin-top: 12px !important;
            color: var(--dd-muted);
            font-size: var(--font-size-l);
            @include setRWD(500px) { font-size: var(--font-size-m); }
        }
        &__big {
            margin-top: 20px !important;
            font-size: clamp(1.4rem, 3vw, 1.9rem);
            font-weight: 700;
            line-height: 1.5;

            strong { color: var(--dd-primary); }
        }

        // 左文右圖；is-reverse 左圖右文。窄螢幕都變成上文下圖
        &__split {
            display: grid;
            grid-template-columns: 1.1fr .9fr;
            gap: 56px;
            align-items: center;
            @include setRWD(768px) {
                grid-template-columns: 1fr;
                gap: 40px;
            }

            &.is-reverse {
                grid-template-columns: .9fr 1.1fr;
                @include setRWD(768px) { grid-template-columns: 1fr; }

                .dindon-landing__split-copy {
                    order: 2;
                    @include setRWD(768px) { order: 0; }
                }
            }
        }
        &__figure {
            @include setFlex(flex-start, center, 16px, column);
            margin: 0;

            figcaption {
                color: var(--dd-muted);
                font-weight: 700;
            }

            // 封測區左欄的排行榜：比其他手機小一點，是佐證不是主角
            &.is-event {
                margin-top: 36px;

                .dindon-landing__phone { max-width: 250px; }
                figcaption {
                    font-size: var(--font-size-s);
                    font-weight: 400;
                }
            }
        }
        &__links {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 28px;
            margin-top: 24px;

            .dindon-landing__link { margin-top: 0; }
        }
        &__link {
            display: inline-block;
            margin-top: 24px;
            color: var(--dd-primary);
            font-weight: 700;
            text-decoration: none;

            .arrow {
                display: inline-block;
                margin-left: 6px;
                transition: transform .25s var(--cubic-FiSo);
            }
            @media (hover: hover) {
                &:hover .arrow { transform: translateX(4px); }
            }
        }

        // #endregion

        // #region [P] 電子發票的痛點
        &__pains {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
            gap: 16px;
            margin-top: 36px !important;
            list-style: none;
        }
        &__answer {
            @include setFlex(flex-start, center, 16px);
            background: var(--dd-accent-tint);
            padding: 20px 24px;
            border: 1px solid var(--dd-accent-border);
            border-radius: var(--dd-radius);
            margin-top: 32px !important;
            color: #1B1815; // 淡黃底上一律深字，深色模式也一樣
            font-size: var(--font-size-l);
            font-weight: 700;

            .bell { flex: none; }
            strong { color: #1D59BB; }
        }

        // #endregion

        // #region [P] 功能卡（就算沒有通知）
        // 4 張卡：寬螢幕一排 4 張、平板 2×2，不要排成 3＋1 留一張孤兒
        &__features {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-top: 40px !important;
            list-style: none;
            @include setRWD(1024px) { grid-template-columns: repeat(2, 1fr); }
            @include setRWD(640px) { grid-template-columns: 1fr; }
        }
        &__new {
            display: inline-block;
            background: var(--dd-accent);
            padding: 1px 8px;
            border-radius: 999px;
            margin-left: 8px;
            color: #1B1815;
            font-size: var(--font-size-xs);
            font-weight: 700;
            vertical-align: middle;
        }

        // 三個區塊（電子發票的痛點、就算沒有通知、最懶人的記帳體驗）共用這一張卡：
        // 色塊裡的圖示 → 標題 → 說明。欄位越窄的區塊字級跟著小一號，排法不變
        &__card {
            @include setFlex(flex-start, flex-start, 10px, column);
            background: var(--dd-surface);
            padding: 24px;
            border: 1px solid var(--dd-border);
            border-radius: var(--dd-radius);
            transition: translate .25s var(--cubic-FiSo), box-shadow .25s var(--cubic-FiSo);

            .feature-icon {
                @include setFlex();
                background: var(--dd-accent-tint);
                width: 48px;
                height: 48px;
                border-radius: 14px;
                font-size: 1.5rem;
            }
            h3 { font-size: var(--font-size-l); }
            p { color: var(--dd-muted); }

            // 痛點一排五張，欄位只有 190px，整張縮一號才不會每句話都斷成四行
            .dindon-landing__pains & {
                gap: 8px;
                padding: 20px;

                .feature-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    font-size: 1.25rem;
                }
                h3 { font-size: var(--font-size-m); }
                p { font-size: var(--font-size-s); }
            }
            @media (hover: hover) {
                &:hover {
                    translate: 0 -4px;
                    box-shadow: 0 10px 24px rgb(27, 24, 21, 6%);

                    .feature-icon { animation: dd-wiggle .6s ease-in-out; }
                }
            }
        }

        // 進場的 transition 會蓋掉卡片自己的，這裡把浮起的那兩項補回去
        &.is-motion &__card[data-reveal] {
            transition:
                opacity .7s var(--dd-ease-out) var(--reveal-delay, 0ms),
                transform .7s var(--dd-ease-out) var(--reveal-delay, 0ms),
                translate .25s var(--cubic-FiSo),
                box-shadow .25s var(--cubic-FiSo);
        }

        // #endregion

        // #region [P] 拍照：能拍的東西一個個跳出來
        &__no {
            margin-top: 8px !important;
            color: var(--dd-primary);
            font-size: clamp(2.5rem, 6vw, 4rem);
            font-weight: 900;
            line-height: 1.1;
        }
        &__sources {
            @include setFlex(flex-start, center, 10px);
            flex-wrap: wrap;
            margin-top: 24px !important;
            list-style: none;

            li {
                background: var(--dd-surface);
                padding: 6px 16px;
                border: 1px solid var(--dd-border);
                border-radius: 999px;
                font-weight: 600;
            }
        }

        // 標籤用回彈蹦出來，跟一般的浮上來區分
        &.is-motion &__sources li[data-reveal] {
            transform: scale(.6);
            transition:
                opacity .4s ease var(--reveal-delay, 0ms),
                transform .5s var(--cubic-SiRo) var(--reveal-delay, 0ms);
        }
        &.is-motion &__sources li[data-reveal].is-visible { transform: none; }
        &__shutter {
            margin-top: 28px !important;
            font-size: clamp(1.3rem, 2.6vw, 1.7rem);
            font-weight: 700;

            strong {
                color: var(--dd-primary);
                font-size: 1.2em;
            }
        }

        // 兩支手機前後疊：後面那支拍照中、前面那支是讀出來的結果
        &__phones {
            position: relative;
            display: grid;
            grid-template-columns: 1fr;
            justify-items: center;
            padding: 0 0 40px;

            .dindon-landing__phone {
                grid-area: 1 / 1;
                max-width: 250px;

                &.is-back {
                    margin-right: 120px;
                    opacity: .9;
                    @include setRWD(500px) { margin-right: 90px; }
                }
                &.is-front {
                    margin-top: 60px;
                    margin-left: 120px;
                    box-shadow: -8px 10px 30px rgb(27, 24, 21, 12%);
                    @include setRWD(500px) { margin-left: 90px; }
                }
                @include setRWD(500px) { max-width: 190px; }
            }
        }

        // #endregion

        // #region [P] 最懶人的記帳體驗
        &__points {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-top: 32px !important;
            list-style: none;
            @include setRWD(500px) { grid-template-columns: 1fr; }
        }

        // #endregion

        // #region [P] beta
        &__beta {
            display: grid;
            grid-template-columns: 1.1fr .9fr;
            gap: 48px;
            align-items: start;
            @include setRWD(1024px) { grid-template-columns: 1fr; }

            .beta-copy {
                @include setFlex(flex-start, flex-start, 22px, column);
            }
        }
        &__seats {
            @include setFlex(flex-start, center, 12px);
            flex-wrap: wrap;

            strong {
                background: var(--dd-primary);
                padding: 4px 14px;
                border-radius: 999px;
                color: var(--dd-on-primary);
            }
            span {
                color: var(--dd-muted);
                font-weight: 600;
            }
        }
        &__steps {
            @include setFlex(flex-start, stretch, 14px, column);
            list-style: none;
            counter-reset: step;

            li {
                position: relative;
                padding-left: 44px;
                counter-increment: step;

                &::before {
                    content: counter(step);
                    position: absolute;
                    top: -2px;
                    left: 0;
                    background: var(--dd-accent);
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    color: #1B1815;
                    font-weight: 800;
                    @include setFlex();
                }
            }
        }

        // 步驟數字：整列浮上來之後，圓點再帶一點回彈地「蹦」出來
        &.is-motion &__steps li::before {
            transform: scale(0);
            transition: transform .5s var(--cubic-SiRo) calc(var(--reveal-delay, 0ms) + 250ms);
        }
        &.is-motion &__steps li.is-visible::before { transform: scale(1); }

        &__rewards-title {
            margin-bottom: 14px !important;
            font-size: var(--font-size-l);
            font-weight: 800;
        }
        &__rewards {
            @include setFlex(flex-start, stretch, 14px, column);
            list-style: none;

            li {
                @include setFlex(flex-start, flex-start, 6px, column);

                // 和 App 徽章牆的紀念徽章卡同色（BadgeWallScreen.kt 的 LEGEND_*）
                background: #2A1752;
                padding: 20px 22px;
                border-radius: var(--dd-radius);
                color: #F4EFE3;
            }
            .tag {
                background: #F6C443;
                padding: 2px 10px;
                border-radius: 999px;
                color: #1B1815;
                font-size: var(--font-size-xs);
                font-weight: 700;
            }
            h3 {
                color: #FFD98A;
                font-size: var(--font-size-l);
            }
            .condition { color: #D9D1E8; }
            .reward {
                color: #F4EFE3;
                font-weight: 700;
            }

            // 名次級距：兩欄對齊，第 1 名那一列最亮
            .tiers {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 4px 20px;
                width: 100%;
                margin: 6px 0 0;

                div {
                    @include setFlex(space-between, baseline, 8px);
                    padding: 3px 0;
                    border-bottom: 1px solid rgb(244 239 227 / 12%);
                }
                dt { color: #D9D1E8; }
                dd {
                    margin: 0;
                    color: #FFD98A;
                    font-weight: 700;
                }
                div:first-child dd { color: #F6C443; }
                @include setRWD(420px) { grid-template-columns: 1fr; }
            }
        }

        // #endregion

        &__footer {
            padding: 28px 0;
            border-top: 1px solid var(--dd-border);
            color: var(--dd-muted);
            font-size: var(--font-size-s);

            .dindon-landing__container {
                @include setFlex(center, center, 10px);
                flex-wrap: wrap;
            }
            a {
                color: var(--dd-muted);
                text-decoration: underline;
                text-underline-offset: 3px;
            }
        }

        // #region [P] 減少動態效果：全部停下，通知卡片直接顯示
        @media (prefers-reduced-motion: reduce) {
            &__hero-copy > *,
            &__hero-stage { animation: none; }
            &__chip {
                animation: none;
                opacity: 1;
            }
            &__btn, &__btn .arrow, &__card, &__link .arrow { transition: none; }
        }

        // #endregion
    }

    // 深色模式：沿用 App 的深色色票
    .dark .dindon-landing {
        --dd-bg: #131109;
        --dd-surface: #322D24;
        --dd-sunken: #1E1B14;
        --dd-border: #4A4335;
        --dd-text: #F4EFE3;
        --dd-muted: #B3A997;
        --dd-primary: #76B9FF;
        --dd-on-primary: #14120E;
        --dd-accent-tint: #FEF3B3; // 回答列的淡黃底兩個模式一樣，裡面固定深字
        --dd-accent-border: #D8A72B;

        // 黃底上的字不跟著反白，否則在濃黃上看不見
        .dindon-landing__hero {
            --dd-text: #1B1815;
            --dd-primary: #1D59BB;
            --dd-on-primary: #FFFDF8;
        }
        .dindon-landing__card .feature-icon { background: #332912; }
    }
    @keyframes dd-rise {
        from {
            transform: translateY(24px);
            opacity: 0;
        }
        to {
            transform: none;
            opacity: 1;
        }
    }
    @keyframes dd-rise-stage {
        from {
            transform: translateY(80px);
            opacity: 0;
        }
        to {
            transform: none;
            opacity: 1;
        }
    }
    @keyframes dd-chip-notify {
        0%, 6% {
            transform: translateY(14px) scale(.94);
            opacity: 0;
        }
        10%, 82% {
            transform: none;
            opacity: 1;
        }
        88%, 100% {
            transform: translateY(-8px);
            opacity: 0;
        }
    }
    @keyframes dd-chip-recorded {
        0%, 20% {
            transform: translateY(14px) scale(.94);
            opacity: 0;
        }
        24%, 84% {
            transform: none;
            opacity: 1;
        }
        90%, 100% {
            transform: translateY(-8px);
            opacity: 0;
        }
    }
    @keyframes dd-wiggle {
        0%, 100% { transform: rotate(0); }
        25% { transform: rotate(-12deg); }
        50% { transform: rotate(10deg); }
        75% { transform: rotate(-5deg); }
    }
</style>
