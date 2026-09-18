<script setup lang="ts">
    import { betaSteps, CONTACT_EMAIL, features, privacyPoints, SIGNUP_HREF } from '../constants';
</script>

<template>
    <div class="dindon-landing">
        <!-- #region [P] hero -->
        <section class="dindon-landing__hero">
            <div class="dindon-landing__container dindon-landing__hero-inner">
                <div class="dindon-landing__hero-copy">
                    <div class="dindon-landing__brand">
                        <img class="icon" src="/images/dindon/icon.webp" alt="叮咚記帳圖示" width="72" height="72" />
                        <div>
                            <p class="name">叮咚記帳</p>
                            <p class="latin">DinDon Ledger</p>
                        </div>
                    </div>

                    <h1 class="dindon-landing__headline">付款的那一刻，<br />帳就記好了。</h1>
                    <p class="dindon-landing__lead">
                        叮咚記帳會讀銀行與行動支付的付款通知，自動記下金額和店家。沒有通知的消費，拍一張收據、或說一句話就好。
                    </p>

                    <div class="dindon-landing__actions">
                        <a class="dindon-landing__btn is-primary" :href="SIGNUP_HREF">加入封閉測試</a>
                        <a class="dindon-landing__btn" href="#features">看看能做什麼</a>
                    </div>
                    <p class="dindon-landing__note">Android 7.0 以上 · 封閉測試招募中 · 即將在 Google Play 上架</p>
                </div>

                <div class="dindon-landing__hero-shot">
                    <div class="dindon-landing__phone is-cropped">
                        <img src="/images/dindon/home.webp" alt="叮咚記帳首頁：今日花費、本月累積與今天的每一筆帳" loading="eager" />
                    </div>
                </div>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] features -->
        <section id="features" class="dindon-landing__section">
            <div class="dindon-landing__container">
                <h2 class="dindon-landing__title">記帳最難的是記得記</h2>
                <p class="dindon-landing__subtitle">所以大部分的帳，叮咚記帳幫你記。</p>

                <ul class="dindon-landing__features">
                    <li v-for="feature in features" :key="feature.title" class="dindon-landing__card">
                        <span class="feature-icon" aria-hidden="true">{{ feature.icon }}</span>
                        <h3>{{ feature.title }}</h3>
                        <p>{{ feature.text }}</p>
                    </li>
                </ul>

                <div class="dindon-landing__gallery">
                    <figure>
                        <div class="dindon-landing__phone">
                            <img src="/images/dindon/stats.webp" alt="花費統計：本月各分類的圓餅圖與金額" loading="lazy" />
                        </div>
                        <figcaption>花費統計</figcaption>
                    </figure>
                    <figure>
                        <div class="dindon-landing__phone">
                            <img src="/images/dindon/badges.webp" alt="徽章牆：封測紀念徽章與各種成就徽章" loading="lazy" />
                        </div>
                        <figcaption>徽章牆</figcaption>
                    </figure>
                </div>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] privacy -->
        <section class="dindon-landing__section is-sunken">
            <div class="dindon-landing__container">
                <h2 class="dindon-landing__title">你的帳，留在你的手機</h2>
                <ul class="dindon-landing__privacy">
                    <li v-for="point in privacyPoints" :key="point">{{ point }}</li>
                </ul>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] beta -->
        <section id="beta" class="dindon-landing__section">
            <div class="dindon-landing__container">
                <div class="dindon-landing__beta">
                    <div class="beta-copy">
                        <h2 class="dindon-landing__title">徵求 20 位封測夥伴</h2>
                        <p class="dindon-landing__subtitle">
                            Google Play 規定新 App 上架前，要先有 20 位測試者連續測試 14 天。你平常照樣花錢、照樣收通知，就是在幫叮咚記帳上架。
                        </p>

                        <ol class="dindon-landing__steps">
                            <li v-for="step in betaSteps" :key="step">{{ step }}</li>
                        </ol>

                        <a class="dindon-landing__btn is-primary" :href="SIGNUP_HREF">寄信報名</a>
                        <p class="dindon-landing__note">
                            需要：Android 7.0 以上的手機、一個 Google 帳號。報名信箱：<span class="email">{{ CONTACT_EMAIL }}</span>
                        </p>
                    </div>

                    <ul class="dindon-landing__rewards">
                        <li>
                            <span class="tag">封測紀念徽章</span>
                            <h3>勇敢白老鼠</h3>
                            <p>陪叮咚記帳一起踩雷、一起長大。封測期間所有功能免費用。</p>
                        </li>
                        <li>
                            <span class="tag">封測紀念徽章</span>
                            <h3>全勤小鐵人</h3>
                            <p>封測期間打開滿 14 天（不必連續），正式上架後所有功能再免費用一個月。</p>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
        <!-- #endregion -->
    </div>
</template>

<style lang="scss">
    // 配色沿用 App 的 Sicily 色票（DinDon_Android/…/ui/theme/Color.kt），讓網頁和 App 看起來是同一個東西
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
        background: var(--dd-bg);
        color: var(--dd-text);
        line-height: 1.7;

        h1, h2, h3, p { margin: 0; }
        ul, ol { padding: 0; margin: 0; }

        &__container {
            max-width: 1080px;
            padding: 0 24px;
            margin: 0 auto;
            @include setRWD(500px) { padding: 0 16px; }
        }

        // #region [P] hero
        &__hero {
            background: var(--dd-accent);
            padding: 64px 0 0;
            color: var(--dd-text); // 深色模式在這裡把 --dd-text 換回深色，要重新套一次才會生效
            overflow: hidden;
            @include setRWD(768px) { padding-top: 40px; }
        }
        &__hero-inner {
            display: grid;
            grid-template-columns: 1.1fr .9fr;
            gap: 48px;
            align-items: end;
            @include setRWD(768px) {
                grid-template-columns: 1fr;
                gap: 40px;
            }
        }
        &__hero-copy {
            @include setFlex(flex-start, flex-start, 24px, column);
            padding-bottom: 72px;
            @include setRWD(768px) { padding-bottom: 0; }
        }
        &__brand {
            @include setFlex(flex-start, center, 14px);

            .icon {
                width: 72px;
                height: 72px;
                border-radius: 18px;
            }
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
            transition: transform .2s var(--cubic-FiSo), background-color .2s var(--cubic-FiSo);

            &:hover { transform: translateY(-2px); }
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
        }
        &__hero &__note { color: color-mix(in srgb, var(--dd-text) 72%, transparent); }

        &__hero-shot {
            @include setFlex(center, flex-end);
        }

        // #endregion

        // #region [P] phone：平面的外框，不做高光與擬真反光
        &__phone {
            background: var(--dd-frame);
            width: 100%;
            max-width: 320px;
            border: 10px solid var(--dd-frame);
            border-radius: 36px;
            overflow: hidden;

            img {
                display: block;
                width: 100%;
                height: auto;
                border-radius: 26px;
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

        // #region [P] section
        &__section {
            padding: 88px 0;
            @include setRWD(768px) { padding: 64px 0; }

            &.is-sunken { background: var(--dd-sunken); }
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

        // #endregion

        // #region [P] features
        &__features {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 40px !important;
            list-style: none;
            @include setRWD(1024px) { grid-template-columns: repeat(2, 1fr); }
            @include setRWD(500px) { grid-template-columns: 1fr; }
        }
        &__card {
            @include setFlex(flex-start, flex-start, 10px, column);
            background: var(--dd-surface);
            padding: 24px;
            border: 1px solid var(--dd-border);
            border-radius: var(--dd-radius);

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
        }
        &__gallery {
            @include setFlex(center, flex-start, 48px);
            margin-top: 64px;
            @include setRWD(500px) { gap: 16px; }

            figure {
                @include setFlex(flex-start, center, 16px, column);
                flex: 0 1 300px;
                margin: 0;
            }
            figcaption {
                color: var(--dd-muted);
                font-weight: 700;
            }
            .dindon-landing__phone {
                @include setRWD(500px) {
                    border-width: 6px;
                    border-radius: 24px;

                    img { border-radius: 18px; }
                }
            }
        }

        // #endregion

        // #region [P] privacy
        &__privacy {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px 40px;
            margin-top: 32px !important;
            list-style: none;
            @include setRWD(768px) { grid-template-columns: 1fr; }

            li {
                position: relative;
                padding-left: 32px;

                &::before {
                    content: '✓';
                    position: absolute;
                    top: 1px;
                    left: 0;
                    background: var(--dd-primary);
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    color: var(--dd-on-primary);
                    font-size: .8rem;
                    font-weight: 700;
                    @include setFlex();
                }
            }
        }

        // #endregion

        // #region [P] beta
        &__beta {
            display: grid;
            grid-template-columns: 1.2fr .8fr;
            gap: 48px;
            align-items: start;
            @include setRWD(1024px) { grid-template-columns: 1fr; }

            .beta-copy {
                @include setFlex(flex-start, flex-start, 24px, column);
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
                    color: var(--dd-text);
                    font-weight: 800;
                    @include setFlex();
                }
            }
        }
        &__rewards {
            @include setFlex(flex-start, stretch, 16px, column);
            list-style: none;

            li {
                @include setFlex(flex-start, flex-start, 8px, column);

                // 和 App 徽章牆的紀念徽章卡同色（BadgeWallScreen.kt 的 LEGEND_*）
                background: #2A1752;
                padding: 24px;
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
            p { color: #D9D1E8; }
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
        --dd-accent-tint: #332912;

        // 黃底上的字不跟著反白，否則在濃黃上看不見
        .dindon-landing__hero {
            --dd-text: #1B1815;
            --dd-primary: #1D59BB;
            --dd-on-primary: #FFFDF8;
        }
    }
</style>
