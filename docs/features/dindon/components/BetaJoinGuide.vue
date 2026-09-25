<script setup lang="ts">
    import { joinSteps } from '../constants';
</script>

<template>
    <!--
        加入封測的兩步，旁邊一支小手機循環播放整個流程。
        手機裡的畫面是示意，不是 Google 的真實畫面（不用 Google 的標誌與配色）；
        步驟卡的亮起和手機的動畫用同一個長度（--join-duration），兩邊對得上。
    -->
    <div class="dindon-join">
        <ol class="dindon-join__steps">
            <li v-for="(step, index) in joinSteps" :key="step.title" class="dindon-join__step" :class="`is-step-${index + 1}`">
                <span class="dindon-join__no" aria-hidden="true">{{ index + 1 }}</span>
                <div class="dindon-join__body">
                    <h3>{{ step.title }}</h3>
                    <p>{{ step.text }}</p>
                    <p v-if="step.caution" class="caution">{{ step.caution }}</p>
                    <a class="dindon-join__btn" :class="{ 'is-primary': index === 0 }" :href="step.href" target="_blank" rel="noopener">
                        {{ step.action }}<span class="arrow" aria-hidden="true">→</span>
                    </a>
                </div>
            </li>
        </ol>

        <div class="dindon-join__demo" aria-hidden="true">
            <div class="dindon-join__phone">
                <!-- 1. 群組頁：按「申請加入群組」 -->
                <div class="scene is-group">
                    <p class="bar">Google 群組</p>
                    <p class="heading">叮咚記帳 Beta 測試</p>
                    <p class="small">dindon-beta@googlegroups.com</p>
                    <span class="mock-btn is-btn-join"><span class="before">申請加入群組</span><span class="after">已送出申請</span></span>
                </div>
                <!-- 2. 核准信 -->
                <div class="scene is-mail">
                    <p class="bar">Gmail</p>
                    <div class="mail">
                        <p class="mail-title">✉️ 你已獲准加入群組</p>
                        <p class="small">叮咚記帳 Beta 測試</p>
                    </div>
                </div>
                <!-- 3. 測試連結：按「成為測試人員」 -->
                <div class="scene is-optin">
                    <p class="bar">Google Play 測試</p>
                    <img class="icon" src="/images/dindon/icon.webp" alt="" loading="lazy" />
                    <p class="heading">成為叮咚記帳的測試人員</p>
                    <span class="mock-btn is-btn-optin"><span class="before">成為測試人員</span><span class="after">你已成為測試人員</span></span>
                    <p class="small link">在 Google Play 下載</p>
                </div>
                <!-- 4. Play 商店：安裝 -->
                <div class="scene is-play">
                    <p class="bar">Play 商店</p>
                    <div class="app">
                        <img class="icon" src="/images/dindon/icon.webp" alt="" loading="lazy" />
                        <div>
                            <p class="heading">叮咚記帳</p>
                            <p class="small">搶先體驗版</p>
                        </div>
                    </div>
                    <span class="mock-btn is-btn-install"><span class="before">安裝</span><span class="after">開啟</span></span>
                    <span class="progress"><span /></span>
                </div>

                <span class="finger" />
            </div>
            <p class="dindon-join__caption">示意動畫</p>
        </div>
    </div>
</template>

<style lang="scss">
    .dindon-join {
        --join-duration: 14s;
        display: grid;
        grid-template-columns: 1fr 176px;
        gap: 28px;
        align-items: center;
        width: 100%;
        @include setRWD(560px) {
            grid-template-columns: 1fr;

            .dindon-join__demo { order: -1; }
        }

        // #region [P] 步驟卡：跟著手機的動畫輪流亮起來；寬的時候兩張並排
        &__steps {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            list-style: none;
            @include setRWD(900px) { grid-template-columns: 1fr; }
        }
        &__step {
            display: flex;
            gap: 14px;
            background: var(--dd-surface);
            padding: 16px;
            border: 2px solid var(--dd-border);
            border-radius: var(--dd-radius);
            animation: dd-join-step-1 var(--join-duration) linear infinite;

            &.is-step-2 { animation-name: dd-join-step-2; }
        }
        &__no {
            flex-shrink: 0;
            @include setFlex();
            background: var(--dd-accent);
            @include setSize(32px, 32px);
            border-radius: 50%;
            color: #1B1815;
            font-weight: 800;
        }
        &__body {
            @include setFlex(flex-start, flex-start, 6px, column);

            h3 { font-size: var(--font-size-m); }
            p { font-size: var(--font-size-s); }
            .caution {
                color: var(--dd-accent-border);
                font-weight: 700;
            }
        }
        &__btn {
            padding: 6px 16px;
            border: 2px solid var(--dd-text);
            border-radius: 999px;
            margin-top: 6px;
            color: var(--dd-text);
            font-size: var(--font-size-s);
            font-weight: 700;
            text-decoration: none;
            transition: translate .25s var(--cubic-FiSo);

            .arrow { margin-left: 6px; }
            @media (hover: hover) {
                &:hover { translate: 0 -2px; }
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

        // #endregion

        // #region [P] 示意手機
        &__demo {
            @include setFlex(center, center, 10px, column);
        }
        &__phone {
            position: relative;
            background: #FEFDFC;
            width: 176px;
            aspect-ratio: 9 / 17;
            border: 8px solid var(--dd-frame);
            border-radius: 28px;
            color: #1B1815;
            overflow: hidden;

            .scene {
                position: absolute;
                inset: 0;
                @include setFlex(flex-start, center, 8px, column);
                padding: 0 12px;
                text-align: center;
                opacity: 0;
            }
            .bar {
                align-self: stretch;
                padding: 10px 0 8px;
                border-bottom: 1px solid #E4DED2;
                margin: 0 -12px 10px;
                color: #6B6157;
                font-size: 11px;
                font-weight: 700;
            }
            .heading {
                font-size: 13px;
                font-weight: 800;
                line-height: 1.4;
            }
            .small {
                color: #6B6157;
                font-size: 10px;
                word-break: break-all;
            }
            .icon {
                @include setSize(40px, 40px);
                border-radius: 10px;
            }
            .mock-btn {
                position: relative;
                display: grid;
                background: #1D59BB;
                padding: 6px 12px;
                border-radius: 999px;
                margin-top: 8px;
                color: #FFFDF8;
                font-size: 11px;
                font-weight: 700;

                // 按之前、按之後兩種字疊在同一格，用透明度切換
                > span { grid-area: 1 / 1; }
                .after { opacity: 0; }
            }
            .link {
                color: #1D59BB;
                font-weight: 700;
                animation: dd-join-optin-after var(--join-duration) linear infinite;
                opacity: 0;
            }
            .mail {
                align-self: stretch;
                background: #FEF3B3;
                padding: 10px;
                border-radius: 12px;
                text-align: left;
                animation: dd-join-mail var(--join-duration) var(--dd-ease-out) infinite;
            }
            .mail-title {
                font-size: 12px;
                font-weight: 800;
            }
            .app {
                @include setFlex(flex-start, center, 10px);
                align-self: stretch;
                text-align: left;
            }
            .progress {
                align-self: stretch;
                background: #E4DED2;
                height: 4px;
                border-radius: 2px;
                overflow: hidden;

                span {
                    display: block;
                    background: #1D59BB;
                    height: 100%;
                    animation: dd-join-progress var(--join-duration) linear infinite;
                }
            }
            .is-group { animation: dd-join-scene-1 var(--join-duration) linear infinite; }
            .is-mail { animation: dd-join-scene-2 var(--join-duration) linear infinite; }
            .is-optin { animation: dd-join-scene-3 var(--join-duration) linear infinite; }
            .is-play { animation: dd-join-scene-4 var(--join-duration) linear infinite; }
            .is-btn-join .before { animation: dd-join-join-before var(--join-duration) linear infinite; }
            .is-btn-join .after { animation: dd-join-join-after var(--join-duration) linear infinite; }
            .is-btn-optin .before { animation: dd-join-optin-before var(--join-duration) linear infinite; }
            .is-btn-optin .after { animation: dd-join-optin-after var(--join-duration) linear infinite; }
            .is-btn-install .before { animation: dd-join-install-before var(--join-duration) linear infinite; }
            .is-btn-install .after { animation: dd-join-install-after var(--join-duration) linear infinite; }

            // 手指：和播放器同一種畫法（黃色半透明圓＋實心點）
            .finger {
                position: absolute;
                background: color-mix(in srgb, #FEBD19 55%, transparent);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: dd-join-finger var(--join-duration) var(--dd-ease-out) infinite;
                opacity: 0;
                @include setSize(34px, 34px);

                &::after {
                    content: '';
                    position: absolute;
                    inset: 34%;
                    background: #A87400;
                    border-radius: 50%;
                }
            }
        }
        &__caption {
            color: var(--dd-muted);
            font-size: var(--font-size-xs);
            text-align: center;
        }

        // #endregion

        // 減少動態效果：不播，手機停在第一個畫面，步驟卡都不特別標示
        @media (prefers-reduced-motion: reduce) {
            &__step, &__phone *, &__phone .scene { animation: none !important; }
            &__phone .is-group { opacity: 1; }
            &__phone .finger { display: none; }
        }
    }

    // #region [P] 時間軸（一輪 14 秒）：群組 0–30%、核准信 30–44%、測試連結 44–72%、Play 72–100%
    @keyframes dd-join-step-1 {
        0%, 42% { border-color: var(--dd-accent); }
        45%, 98% { border-color: var(--dd-border); }
        100% { border-color: var(--dd-accent); }
    }
    @keyframes dd-join-step-2 {
        0%, 42% { border-color: var(--dd-border); }
        45%, 98% { border-color: var(--dd-accent); }
        100% { border-color: var(--dd-border); }
    }
    @keyframes dd-join-scene-1 {
        0%, 28% { opacity: 1; }
        31%, 98% { opacity: 0; }
        100% { opacity: 1; }
    }
    @keyframes dd-join-scene-2 {
        0%, 29% { opacity: 0; }
        31%, 42% { opacity: 1; }
        45%, 100% { opacity: 0; }
    }
    @keyframes dd-join-scene-3 {
        0%, 43% { opacity: 0; }
        45%, 70% { opacity: 1; }
        73%, 100% { opacity: 0; }
    }
    @keyframes dd-join-scene-4 {
        0%, 71% { opacity: 0; }
        73%, 97% { opacity: 1; }
        100% { opacity: 0; }
    }
    @keyframes dd-join-mail {
        0%, 31% { transform: translateY(-16px); }
        35%, 100% { transform: none; }
    }
    @keyframes dd-join-join-before {
        0%, 14% { opacity: 1; }
        15%, 100% { opacity: 0; }
    }
    @keyframes dd-join-join-after {
        0%, 14% { opacity: 0; }
        15%, 100% { opacity: 1; }
    }
    @keyframes dd-join-optin-before {
        0%, 56% { opacity: 1; }
        57%, 100% { opacity: 0; }
    }
    @keyframes dd-join-optin-after {
        0%, 56% { opacity: 0; }
        57%, 100% { opacity: 1; }
    }
    @keyframes dd-join-install-before {
        0%, 84% { opacity: 1; }
        85%, 100% { opacity: 0; }
    }
    @keyframes dd-join-install-after {
        0%, 94% { opacity: 0; }
        95%, 100% { opacity: 1; }
    }
    @keyframes dd-join-progress {
        0%, 85% { width: 0; }
        94%, 100% { width: 100%; }
    }

    // 三次點擊：申請加入（14%）、成為測試人員（56%）、安裝（84%）；按下去時縮一點
    // top 是三顆按鈕在手機畫面裡的中心，用瀏覽器量出來的（改了畫面的排版要重量）
    @keyframes dd-join-finger {
        0%, 5% {
            top: 80%;
            left: 70%;
            opacity: 0;
        }
        10% {
            top: 46.5%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 1;
        }
        14% { transform: translate(-50%, -50%) scale(.8); }
        17% {
            top: 46.5%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 1;
        }
        21%, 47% {
            top: 46.5%;
            left: 50%;
            opacity: 0;
        }
        52% {
            top: 54%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 1;
        }
        56% { transform: translate(-50%, -50%) scale(.8); }
        59% {
            top: 54%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 1;
        }
        63%, 75% {
            top: 54%;
            left: 50%;
            opacity: 0;
        }
        80% {
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 1;
        }
        84% { transform: translate(-50%, -50%) scale(.8); }
        87% {
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 1;
        }
        91%, 100% {
            top: 40%;
            left: 50%;
            opacity: 0;
        }
    }

    // #endregion
</style>
