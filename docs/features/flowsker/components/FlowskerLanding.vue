<script setup lang="ts">
    import { useLandingMotion } from '@shared/hooks/useLandingMotion';
    import { computed, ref } from 'vue';
    import { DINDON_PATH, features, LOGIN_NOTE, PRIVACY_URL, REPO_BACKEND_URL, REPO_WEB_URL, REPOS_PUBLIC, scopes, shots, WEB_URL } from '../constants';
    import { DEMO_DEFAULT, DEMO_MAX, DEMO_MIN, formatMinutes, nightLevel, restMinutes, sandLevel } from '../flowmodoro';
    import FlowskerMark from './FlowskerMark.vue';

    // Flowsker 的介紹頁（2026-10-11）。產品的招牌是「畫面跟著心流轉暗」：待命是白晝、專注起來變夜晚。
    // 這頁照同一個意象：開頭淺色，右邊一塊夜晚（沙漏截圖）；「怎麼算」那段拉滑桿改專注時間，整塊面板跟著變暗、沙堆堆高。
    // 動態只有位移、透明度與一次性的顏色過渡，沒有一直跑的動畫（首頁效能那課學到的）。
    const rootRef = ref<HTMLElement>();
    useLandingMotion(rootRef);

    const delay = (index: number, step = 80) => ({ '--reveal-delay': `${index * step}ms` });

    // #region [P] 反向番茄鐘的示範：專注幾分 → 休息幾分，沙堆高度與面板的夜色跟著走
    const focus = ref(DEMO_DEFAULT);
    const rest = computed(() => restMinutes(focus.value));
    const level = computed(() => sandLevel(focus.value));
    // 夜色跟產品一樣：5 分前白晝、15 分全暗；預設 45 分就是夜晚加亮字，不會停在灰灰的中間
    const demoStyle = computed(() => ({ '--t': nightLevel(focus.value).toFixed(3) }));
    // #endregion
</script>

<template>
    <div ref="rootRef" class="flowsker-landing">
        <!-- #region [P] hero：左邊文案，右邊一塊夜晚（沙漏主題的截圖） -->
        <section class="flowsker-landing__hero">
            <div class="flowsker-landing__container flowsker-landing__hero-inner">
                <div class="flowsker-landing__hero-copy">
                    <div class="flowsker-landing__brand">
                        <FlowskerMark :size="56" :level=".55" class="mark" />
                        <div>
                            <p class="name">Flowsker</p>
                            <p class="latin">Flowmodoro task &amp; focus manager</p>
                        </div>
                    </div>

                    <h1 class="flowsker-landing__headline">專注到你想停為止，<br />休息按比例給你。</h1>
                    <p class="flowsker-landing__lead">
                        反向番茄鐘：計時往上累積，不每 25 分鐘打斷你一次；休息時間是專注時間的五分之一。每一段心流都記在任務上，結束就寫進 Google Calendar。
                    </p>

                    <div class="flowsker-landing__actions">
                        <a class="flowsker-landing__btn flowsker-landing__btn--primary" :href="WEB_URL" target="_blank" rel="noopener">打開 Flowsker<span class="arrow" aria-hidden="true">→</span></a>
                        <a class="flowsker-landing__btn" href="#how">看看怎麼算<span class="arrow arrow--down" aria-hidden="true">↓</span></a>
                    </div>
                    <p class="flowsker-landing__note">網頁版 · 用 Google 帳號登入 · 開源（AGPL-3.0）</p>
                    <p v-if="LOGIN_NOTE" class="flowsker-landing__note flowsker-landing__note--fine">{{ LOGIN_NOTE }}</p>
                </div>

                <figure class="flowsker-landing__night" data-parallax=".08" data-parallax-scroll>
                    <img src="/images/flowsker/hourglass.webp" alt="沙漏主題：深夜的計時器寫著 00:45:03，底下一堆藍色的時光沙" width="760" height="560" />
                    <figcaption>心流時畫面轉暗，時光沙落下堆成沙丘</figcaption>
                </figure>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 怎麼算：拉滑桿，休息時間、沙堆、夜色一起動 -->
        <section id="how" class="flowsker-landing__section flowsker-landing__section--sunken">
            <div class="flowsker-landing__container">
                <p class="flowsker-landing__eyebrow" data-reveal>番茄鐘是 25 分鐘到了就叫你停；反向番茄鐘是你停了才算</p>
                <h2 class="flowsker-landing__title" data-reveal :style="delay(1)">專注 5 分鐘，換 1 分鐘休息</h2>
                <p class="flowsker-landing__subtitle" data-reveal :style="delay(2)">拉拉看。專注得越久，休息越多，畫面也越暗——這就是 Flowsker 裡計時的樣子。</p>

                <div class="flowsker-landing__demo" :style="{ ...demoStyle, ...delay(3) }" data-reveal>
                    <div class="flowsker-landing__demo-copy">
                        <label class="flowsker-landing__demo-label" for="fk-focus">
                            專注了 <output class="num">{{ formatMinutes(focus) }}</output>
                        </label>
                        <input
                            id="fk-focus"
                            v-model.number="focus"
                            class="flowsker-landing__range"
                            type="range"
                            :min="DEMO_MIN"
                            :max="DEMO_MAX"
                            step="1"
                            :aria-valuetext="`專注 ${formatMinutes(focus)}，可以休息 ${formatMinutes(rest)}`"
                        />
                        <p class="flowsker-landing__demo-result">
                            可以休息 <strong class="num">{{ formatMinutes(rest) }}</strong>
                        </p>
                        <p class="flowsker-landing__demo-hint">往左拉到 5 分看看：待命是白晝，開始專注後幾分鐘內轉成夜晚，休息時全暗。沒有深色模式的開關，畫面跟著心流走。</p>
                    </div>
                    <FlowskerMark :size="180" :level="level" class="flowsker-landing__demo-mark" />
                </div>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 六個重點 -->
        <section class="flowsker-landing__section">
            <div class="flowsker-landing__container">
                <h2 class="flowsker-landing__title" data-reveal>計時器之外</h2>
                <p class="flowsker-landing__subtitle" data-reveal :style="delay(1)">專注的紀錄要有地方放，才看得出時間去哪了。</p>

                <ul class="flowsker-landing__features">
                    <li v-for="(item, index) in features" :key="item.title" class="flowsker-landing__card" data-reveal :style="delay(index, 70)">
                        <span class="feature-icon" aria-hidden="true">{{ item.icon }}</span>
                        <h3>{{ item.title }}</h3>
                        <p>{{ item.text }}</p>
                    </li>
                </ul>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 三個畫面 -->
        <section
            v-for="(shot, index) in shots"
            :key="shot.src"
            class="flowsker-landing__section"
            :class="{ 'flowsker-landing__section--sunken': index % 2 === 0 }"
        >
            <div class="flowsker-landing__container flowsker-landing__split" :class="{ 'flowsker-landing__split--reverse': index % 2 === 1 }">
                <div class="flowsker-landing__split-copy">
                    <h2 class="flowsker-landing__title" data-reveal>{{ shot.title }}</h2>
                    <p class="flowsker-landing__subtitle" data-reveal :style="delay(1)">{{ shot.text }}</p>
                </div>
                <figure class="flowsker-landing__window" :data-reveal="index % 2 === 1 ? undefined : 'right'">
                    <span class="bar" aria-hidden="true"><i /><i /><i /></span>
                    <img :src="shot.src" :alt="shot.alt" loading="lazy" :width="shot.width" :height="shot.height" />
                </figure>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 為什麼做它 -->
        <section class="flowsker-landing__section flowsker-landing__section--sunken">
            <div class="flowsker-landing__container flowsker-landing__story">
                <p class="flowsker-landing__eyebrow" data-reveal>為什麼做它</p>
                <h2 class="flowsker-landing__title" data-reveal :style="delay(1)">做給自己用的，所以小精靈也住在裡面</h2>
                <div class="flowsker-landing__story-body" data-reveal :style="delay(2)">
                    <p>
                        2025 年初做過一版：任務存在 Google Calendar 裡，前端直接打 Google 的 API。做了兩個月停下來，但「一個任務累積很多段專注」這個想法留著。
                    </p>
                    <p>
                        2026 年 10 月重開。這次後端自己做：Google 登入與 Calendar 寫入都在 Go 這邊，前端只知道後端的網址，沒有任何金鑰。骨架從
                        <a :href="DINDON_PATH">叮咚記帳</a>抽出來——一個人帶幾個 AI 助手，前端、後端各一個，靠溝通板開單協作。
                    </p>
                    <p>
                        做著做著發現最常漏掉的是「AI 請我親手去做的事」：建帳號、填設定、做決定，散在好幾個倉庫的紀錄裡。於是小精靈能直接把這些開成任務，AI 辦公室看得到誰在忙、用了多少電。Flowsker 先解決我自己的問題。
                    </p>
                </div>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 隱私：跟 Google 要了什麼 -->
        <section class="flowsker-landing__section">
            <div class="flowsker-landing__container">
                <h2 class="flowsker-landing__title" data-reveal>向 Google 要的權限，只有這兩樣</h2>
                <p class="flowsker-landing__subtitle" data-reveal :style="delay(1)">只存登入需要的帳號資料、你建立的內容，以及加密的 Google Calendar 授權。沒有廣告與追蹤。</p>

                <ul class="flowsker-landing__scopes">
                    <li v-for="(scope, index) in scopes" :key="scope.scope" class="flowsker-landing__card" data-reveal :style="delay(index + 2, 80)">
                        <h3>{{ scope.name }}</h3>
                        <code>{{ scope.scope }}</code>
                        <p>{{ scope.use }}</p>
                    </li>
                </ul>

                <p class="flowsker-landing__links">
                    <a class="flowsker-landing__link" :href="PRIVACY_URL" target="_blank" rel="noopener" data-reveal>完整的隱私權政策<span class="arrow" aria-hidden="true">→</span></a>
                </p>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region [P] 收尾 -->
        <section class="flowsker-landing__section flowsker-landing__section--night">
            <div class="flowsker-landing__container flowsker-landing__end">
                <FlowskerMark :size="72" :level="1" class="mark" data-reveal />
                <h2 class="flowsker-landing__title" data-reveal :style="delay(1)">專注，然後休息。</h2>
                <p class="flowsker-landing__subtitle" data-reveal :style="delay(2)">打開瀏覽器就能用，不用裝 App。</p>
                <div class="flowsker-landing__actions" data-reveal :style="delay(3)">
                    <a class="flowsker-landing__btn flowsker-landing__btn--primary" :href="WEB_URL" target="_blank" rel="noopener">打開 Flowsker<span class="arrow" aria-hidden="true">→</span></a>
                    <template v-if="REPOS_PUBLIC">
                        <a class="flowsker-landing__btn flowsker-landing__btn--ghost" :href="REPO_WEB_URL" target="_blank" rel="noopener">前端原始碼</a>
                        <a class="flowsker-landing__btn flowsker-landing__btn--ghost" :href="REPO_BACKEND_URL" target="_blank" rel="noopener">後端原始碼</a>
                    </template>
                </div>
                <p v-if="!REPOS_PUBLIC" class="flowsker-landing__note" data-reveal :style="delay(4)">原始碼採 AGPL-3.0，倉庫整理好就公開。</p>
            </div>
        </section>
        <!-- #endregion -->
    </div>
</template>

<style lang="scss">
    // 配色沿用產品：心流藍、休息琥珀；白晝與夜晚兩組面（產品裡畫面跟著心流在兩者之間滑動）。
    // 平面：純色塊、圓角、極淡陰影；沒有高光與描邊。
    .flowsker-landing {
        --fk-bg: #F4F6FB;
        --fk-surface: #FFF;
        --fk-sunken: #E9EDF5;
        --fk-border: #D5DCE8;
        --fk-text: #0F1626;
        --fk-muted: #5B6578;
        --fk-flow: #2E6BFF;
        --fk-flow-ink: #1B4FD1;
        --fk-rest: #FF9F1C;
        --fk-rest-ink: #C77400;
        --fk-night: #0B111A;
        --fk-night-surface: #121A27;
        --fk-night-text: #E8EDF6;
        --fk-night-muted: #9AA7BD;
        --fk-radius: 20px;
        --fk-ease-out: cubic-bezier(.22, 1, .36, 1);
        background: var(--fk-bg);
        color: var(--fk-text);
        line-height: 1.7;
        overflow-x: clip;

        h1, h2, h3, p { margin: 0; }
        ul {
            padding: 0;
            margin: 0;
            list-style: none;
        }
        [data-parallax] { translate: 0 var(--py, 0); }

        &__container {
            max-width: 1080px;
            padding: 0 24px;
            margin: 0 auto;
            @include setRWD(500px) { padding: 0 16px; }
        }

        // #region [P] 捲動進場（is-motion 由 useLandingMotion 加上；SSR 與減少動態時內容照常顯示）
        &.is-motion [data-reveal] {
            transform: translateY(28px);
            transition:
                opacity .7s var(--fk-ease-out) var(--reveal-delay, 0ms),
                transform .7s var(--fk-ease-out) var(--reveal-delay, 0ms);
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
            padding: 72px 0 80px;
            @include setRWD(768px) { padding: 40px 0 56px; }
        }
        &__hero-inner {
            display: grid;
            grid-template-columns: 1.05fr .95fr;
            gap: 48px;
            align-items: center;
            @include setRWD(768px) {
                grid-template-columns: 1fr;
                gap: 36px;
            }
        }
        &__hero-copy {
            @include setFlex(flex-start, flex-start, 22px, column);

            // 開頭依序浮上來。純 CSS、一次性，SSR 的 HTML 一載入就播
            > * { animation: fk-rise .8s var(--fk-ease-out) both; }
            > :nth-child(2) { animation-delay: .08s; }
            > :nth-child(3) { animation-delay: .16s; }
            > :nth-child(4) { animation-delay: .24s; }
            > :nth-child(5) { animation-delay: .32s; }
            > :nth-child(6) { animation-delay: .4s; }
        }
        &__brand {
            @include setFlex(flex-start, center, 14px);

            .mark { color: var(--fk-text); }
            .name {
                font-size: var(--font-size-l);
                font-weight: 700;
                letter-spacing: .08em;
            }
            .latin {
                color: var(--fk-muted);
                font-size: var(--font-size-s);
            }
        }
        &__headline {
            font-size: clamp(2.25rem, 5vw, 3.5rem);
            font-weight: 800;
            line-height: 1.25;
            letter-spacing: .02em;
        }
        &__lead {
            max-width: 30em;
            color: var(--fk-muted);
            font-size: var(--font-size-l);
        }
        &__actions {
            @include setFlex(flex-start, center, 12px);
            flex-wrap: wrap;
        }
        &__btn {
            display: inline-block;
            padding: 12px 26px;
            border: 2px solid var(--fk-text);
            border-radius: 999px;
            color: var(--fk-text);
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
                    .arrow--down { transform: translateY(3px); }
                }
            }
            &:focus-visible {
                outline: 3px solid var(--fk-flow);
                outline-offset: 3px;
            }
            &--primary {
                background: var(--fk-flow);
                border-color: var(--fk-flow);
                color: #FFF;
            }
            &--ghost {
                border-color: var(--fk-night-muted);
                color: var(--fk-night-text);
            }
        }
        &__note {
            color: var(--fk-muted);
            font-size: var(--font-size-s);

            &--fine {
                max-width: 36em;
                margin-top: -10px !important;
                font-size: var(--font-size-xs);
            }
        }

        // 右邊那塊夜晚：沙漏截圖本身就是深色的，外面再包一層夜色，讓它像從白晝裡挖出的一扇窗
        &__night {
            background: var(--fk-night);
            padding: 16px;
            border-radius: var(--fk-radius);
            margin: 0;
            box-shadow: 0 24px 60px rgb(11 17 26 / 18%);
            animation: fk-rise-night 1s var(--fk-ease-out) .2s both;

            img {
                display: block;
                width: 100%;
                height: auto;
                border-radius: calc(var(--fk-radius) - 8px);
            }
            figcaption {
                padding: 12px 6px 0;
                color: var(--fk-night-muted);
                font-size: var(--font-size-s);
                text-align: center;
            }
        }

        // #endregion

        // #region [P] section 共用
        &__section {
            padding: 96px 0;
            @include setRWD(768px) { padding: 64px 0; }

            &--sunken { background: var(--fk-sunken); }
            &--night {
                --fk-text: var(--fk-night-text);
                --fk-muted: var(--fk-night-muted);
                background: var(--fk-night);
                color: var(--fk-night-text);
            }
        }
        &__eyebrow {
            margin-bottom: 8px !important;
            color: var(--fk-flow-ink);
            font-size: var(--font-size-m);
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
            color: var(--fk-muted);
            font-size: var(--font-size-l);
            @include setRWD(500px) { font-size: var(--font-size-m); }
        }
        &__links {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 28px;
            margin-top: 24px;
        }
        &__link {
            display: inline-block;
            margin-top: 18px;
            color: var(--fk-flow-ink);
            font-weight: 700;
            text-decoration: none;

            .arrow {
                display: inline-block;
                margin-left: 6px;
                transition: transform .25s var(--cubic-FiSo);
            }
            &:hover .arrow { transform: translateX(4px); }
        }

        // #endregion

        // #region [P] 示範面板：--t 是 0～1 的夜色，面板的底與字用 color-mix 在白晝與夜晚之間滑動
        &__demo {
            --t: 0;
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 32px;
            align-items: center;
            background: color-mix(in srgb, var(--fk-surface), var(--fk-night) calc(var(--t) * 100%));
            padding: 36px 40px;
            border-radius: var(--fk-radius);
            margin-top: 36px;
            color: color-mix(in srgb, var(--fk-text), var(--fk-night-text) calc(var(--t) * 100%));
            transition: background-color .5s var(--fk-ease-out), color .5s var(--fk-ease-out);
            @include setRWD(640px) {
                grid-template-columns: 1fr;
                justify-items: center;
                padding: 28px 22px;
            }
        }
        &__demo-copy {
            @include setFlex(flex-start, stretch, 14px, column);
            width: 100%;
        }
        &__demo-label {
            font-size: var(--font-size-l);
            font-weight: 700;
        }
        &__demo-result {
            font-size: var(--font-size-xl);
            font-weight: 800;

            strong { color: var(--fk-rest); }
        }
        &__demo-hint {
            max-width: 32em;
            color: color-mix(in srgb, var(--fk-muted), var(--fk-night-muted) calc(var(--t) * 100%));
            font-size: var(--font-size-s);
        }
        .num { font-variant-numeric: tabular-nums; }
        &__demo-mark { color: currentColor; }

        // 滑桿：一條細軌、一顆藍色的圓點，兩個瀏覽器引擎各寫一次
        &__range {
            appearance: none;
            background: transparent;
            width: 100%;
            height: 28px;
            margin: 0;
            cursor: pointer;

            &::-webkit-slider-runnable-track {
                background: color-mix(in srgb, currentColor 22%, transparent);
                height: 4px;
                border-radius: 2px;
            }
            &::-webkit-slider-thumb {
                appearance: none;
                background: var(--fk-flow);
                width: 22px;
                height: 22px;
                border: 0;
                border-radius: 50%;
                margin-top: -9px;
                box-shadow: 0 2px 8px rgb(46 107 255 / 35%);
            }
            &::-moz-range-track {
                background: color-mix(in srgb, currentColor 22%, transparent);
                height: 4px;
                border-radius: 2px;
            }
            &::-moz-range-thumb {
                background: var(--fk-flow);
                width: 22px;
                height: 22px;
                border: 0;
                border-radius: 50%;
            }
            &:focus-visible {
                outline: 3px solid var(--fk-flow);
                outline-offset: 4px;
            }
        }

        // #endregion

        // #region [P] 卡片：六個重點與兩個權限共用
        &__features {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 20px;
            margin-top: 40px;
            @include setRWD(900px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            @include setRWD(560px) { grid-template-columns: 1fr; }
        }
        &__scopes {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
            margin-top: 40px;
            @include setRWD(640px) { grid-template-columns: 1fr; }

            code {
                display: inline-block;
                background: color-mix(in srgb, var(--fk-flow) 10%, transparent);
                padding: 2px 10px;
                border-radius: 6px;
                color: var(--fk-flow-ink);
                font-size: var(--font-size-s);
            }
        }
        &__card {
            @include setFlex(flex-start, flex-start, 10px, column);
            background: var(--fk-surface);
            padding: 26px 24px;
            border: 1px solid var(--fk-border);
            border-radius: var(--fk-radius);

            .feature-icon {
                @include setFlex(center, center);
                background: var(--fk-sunken);
                width: 44px;
                height: 44px;
                border-radius: 12px;
                font-size: 22px;
            }
            h3 {
                font-size: var(--font-size-l);
                font-weight: 700;
            }
            p {
                color: var(--fk-muted);
                font-size: var(--font-size-m);
            }
        }

        // #endregion

        // #region [P] 畫面：左文右圖；--reverse 左圖右文。窄螢幕都變成上文下圖
        &__split {
            display: grid;
            grid-template-columns: .8fr 1.2fr;
            gap: 56px;
            align-items: center;
            @include setRWD(768px) {
                grid-template-columns: 1fr;
                gap: 32px;
            }

            &--reverse {
                grid-template-columns: 1.2fr .8fr;
                @include setRWD(768px) { grid-template-columns: 1fr; }

                .flowsker-landing__split-copy {
                    order: 2;
                    @include setRWD(768px) { order: 0; }
                }
            }
        }

        // 平面的瀏覽器視窗：一條頂欄三個點
        &__window {
            background: var(--fk-surface);
            border: 1px solid var(--fk-border);
            border-radius: 14px;
            margin: 0;
            box-shadow: 0 18px 50px rgb(15 22 38 / 10%);
            overflow: hidden;

            .bar {
                @include setFlex(flex-start, center, 6px);
                background: var(--fk-sunken);
                height: 26px;
                padding: 0 12px;
                border-bottom: 1px solid var(--fk-border);

                i {
                    display: block;
                    background: var(--fk-border);
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
            }
            img {
                display: block;
                width: 100%;
                height: auto;
            }
        }

        // #endregion

        // #region [P] 為什麼做它、收尾
        &__story { max-width: 760px; }
        &__story-body {
            @include setFlex(flex-start, stretch, 16px, column);
            margin-top: 24px;
            font-size: var(--font-size-m);

            a {
                color: var(--fk-flow-ink);
                font-weight: 700;
            }
        }
        &__end {
            @include setFlex(center, center, 16px, column);
            text-align: center;

            .mark { color: var(--fk-night-text); }
            .flowsker-landing__actions { justify-content: center; }
            .flowsker-landing__btn--primary { border-color: var(--fk-flow); }
            .flowsker-landing__subtitle { margin-top: 0 !important; }
        }

        // #endregion
        @media (prefers-reduced-motion: reduce) {
            &__hero-copy > *,
            &__night { animation: none; }
            &__demo,
            &__demo-hint,
            &__btn,
            &__link .arrow { transition: none; }
        }
    }

    // 深色模式：白晝那組換成夜晚（面板的 color-mix 兩端就幾乎一樣，拉滑桿只會更深一點）
    .dark .flowsker-landing {
        --fk-bg: #0B111A;
        --fk-surface: #121A27;
        --fk-sunken: #0E1521;
        --fk-border: #243043;
        --fk-text: #E8EDF6;
        --fk-muted: #9AA7BD;
        --fk-flow-ink: #7FA4FF;
        --fk-rest-ink: #FFB74D;

        .flowsker-landing__night { box-shadow: 0 24px 60px rgb(0 0 0 / 45%); }
        .flowsker-landing__window { box-shadow: 0 18px 50px rgb(0 0 0 / 35%); }
    }
    @keyframes fk-rise {
        from {
            transform: translateY(24px);
            opacity: 0;
        }
        to {
            transform: none;
            opacity: 1;
        }
    }
    @keyframes fk-rise-night {
        from {
            transform: translateY(40px);
            opacity: 0;
        }
        to {
            transform: none;
            opacity: 1;
        }
    }
</style>
