<script setup lang="ts">
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { STORY_SCENES, storyFeed, storyTotal } from '../story';
    import DinDonBell from './DinDonBell.vue';

    // 宣傳頁開頭的「一天的帳」（2026-10-08，使用者：「宣傳首頁可以 10～15 秒，讓重點一目了然；做一點進場動畫和轉場」）。
    // 一支手機、一條帳本，六幕約 14 秒：每一幕在同一條帳本上加一筆或改一筆，上面的「今天花了」跟著變——
    // 看起來像在看真的一天慢慢記滿，而不是換投影片。幕與帳本的內容是純資料（story.ts，有測試）。
    // - 只播一次，停在最後一幕，有「再看一次」；上面的進度條就是章節，點了跳過去；可以暫停（自己會動超過 5 秒的東西要能停）
    // - 動的方式只有位移、透明度（平面風格，沒有描邊、高光、漣漪）；幕與幕之間由 JS 換狀態、CSS transition 補間，播完就什麼都不跑
    // - 捲出畫面就暫停、回來接著播；關閉動態時直接停在完整的帳本（第四幕之後）
    const scene = ref(0);
    const playing = ref(false);
    const finished = ref(false);
    const motion = ref(false);
    const rootRef = ref<HTMLElement>();

    const feed = computed(() => storyFeed(scene.value));
    const total = computed(() => storyTotal(scene.value));
    const current = computed(() => STORY_SCENES[scene.value]);

    // #region [P] 「今天花了」的數字：換幕時從舊的數到新的（0.6 秒）
    const shownTotal = ref(storyTotal(0));
    let countFrame = 0;
    function countTo(target: number) {
        cancelAnimationFrame(countFrame);
        if (!motion.value) {
            shownTotal.value = target;
            return;
        }
        const from = shownTotal.value;
        const begin = performance.now();
        const step = (now: number) => {
            const t = Math.min(1, (now - begin) / 600);
            shownTotal.value = Math.round(from + (target - from) * (1 - (1 - t) ** 3));
            if (t < 1) countFrame = requestAnimationFrame(step);
        };
        countFrame = requestAnimationFrame(step);
    }
    // #endregion

    // #region [P] 時間軸：每一幕停自己的長度；剩下的時間記著，暫停後從那裡接
    let timer = 0;
    let sceneStart = 0;
    let remaining = 0;
    function go(index: number) {
        clearTimeout(timer);
        scene.value = index;
        finished.value = index === STORY_SCENES.length - 1;
        countTo(storyTotal(index));
        remaining = STORY_SCENES[index].ms;
        if (playing.value && !finished.value) schedule();
        if (finished.value) playing.value = false;
    }
    function schedule() {
        sceneStart = performance.now();
        timer = window.setTimeout(go, remaining, scene.value + 1);
    }
    function pause() {
        if (!playing.value) return;
        clearTimeout(timer);
        remaining = Math.max(0, remaining - (performance.now() - sceneStart));
        playing.value = false;
    }
    function resume() {
        if (playing.value || finished.value) return;
        playing.value = true;
        schedule();
    }
    function replay() {
        playing.value = true;
        go(0);
    }
    function toggle() {
        if (finished.value) replay();
        else if (playing.value) pause();
        else resume();
    }
    function jump(index: number) {
        playing.value = index < STORY_SCENES.length - 1 && (playing.value || !finished.value);
        go(index);
    }
    // #endregion

    let observer: IntersectionObserver | undefined;
    onMounted(() => {
        motion.value = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
        if (!motion.value) {
            go(STORY_SCENES.length - 2); // 帳本最完整的那一幕，不蓋結尾卡
            return;
        }
        // 等開頭的升起動畫（.2s 起 1 秒）差不多跑完再開始
        playing.value = true;
        go(0);
        // 捲出畫面就暫停：看不到的時候播完，回來只剩結尾很可惜
        let wasPlaying = true;
        observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) {
                wasPlaying = playing.value;
                pause();
            } else if (wasPlaying) {
                resume();
            }
        }, { threshold: 0.35 });
        observer.observe(rootRef.value!);
    });
    onBeforeUnmount(() => {
        clearTimeout(timer);
        cancelAnimationFrame(countFrame);
        observer?.disconnect();
    });

    const money = (n: number) => n.toLocaleString('en-US');
</script>

<template>
    <div ref="rootRef" class="dd-story" :class="[`is-scene-${current.id}`, { 'is-motion': motion, 'is-finished': finished }]">
        <!-- 進度條＝章節：一幕一格，點了跳過去 -->
        <div class="dd-story__bar">
            <ol class="dd-story__chapters" aria-label="短片章節">
                <li v-for="(item, index) in STORY_SCENES" :key="item.id">
                    <button
                        type="button"
                        :class="{ 'is-done': index < scene, 'is-now': index === scene }"
                        :style="{ '--ms': `${item.ms}ms` }"
                        :aria-label="`第 ${index + 1} 幕：${item.caption}`"
                        :aria-current="index === scene ? 'step' : undefined"
                        @click="jump(index)"
                    >
                        <!-- 換幕才重來（key 跟幕走）；暫停只是停住（animation-play-state），不會倒回去 -->
                        <span :key="`${index}-${scene}`" class="fill" :class="{ 'is-running': index === scene, 'is-paused': !playing }" />
                    </button>
                </li>
            </ol>
            <button v-if="motion" type="button" class="dd-story__toggle" :aria-label="finished ? '再看一次' : playing ? '暫停' : '繼續播'" @click="toggle">
                <span v-if="finished" aria-hidden="true">↻</span>
                <span v-else-if="playing" aria-hidden="true">❚❚</span>
                <span v-else aria-hidden="true">▶</span>
            </button>
        </div>

        <!-- 這一幕在說什麼：字幕在手機外面，大而清楚 -->
        <p class="dd-story__caption" aria-live="polite">
            <Transition name="dd-story-caption" mode="out-in">
                <span :key="current.id">
                    <strong>{{ current.caption }}</strong>
                    <small>{{ current.sub }}</small>
                </span>
            </Transition>
        </p>

        <div class="dd-story__phone" aria-hidden="true">
            <div class="dd-story__screen">
                <!-- App 的首頁上方：今天花了多少 -->
                <div class="dd-story__head">
                    <span class="label">今天花了</span>
                    <span class="total">NT$ {{ money(shownTotal) }}</span>
                    <span class="budget">每日預算 NT$ 800</span>
                </div>

                <!-- 帳本：每一幕加一筆或改一筆 -->
                <TransitionGroup tag="ul" name="dd-story-row" class="dd-story__feed">
                    <li v-for="row in feed" :key="row.id" class="dd-story__row" :class="{ 'is-new': row.isNew, 'is-void': row.void }">
                        <span class="icon">{{ row.icon }}</span>
                        <span class="what">
                            <span class="name">{{ row.name }}</span>
                            <span class="how">{{ row.how }}</span>
                        </span>
                        <span class="amount">{{ row.void ? '已抵銷' : `-${money(row.amount)}` }}</span>
                    </li>
                </TransitionGroup>

                <!-- 系統通知：從上緣滑下來 -->
                <Transition name="dd-story-notice">
                    <div v-if="current.notice" :key="current.id" class="dd-story__notice">
                        <span class="app">{{ current.notice.app }}</span>
                        <span class="text">{{ current.notice.text }}</span>
                    </div>
                </Transition>

                <!-- 小精靈說話 -->
                <Transition name="dd-story-sprite">
                    <div v-if="current.sprite" :key="current.id" class="dd-story__sprite">
                        <DinDonBell :size="40" class="bell" />
                        <span class="bubble">{{ current.sprite }}</span>
                    </div>
                </Transition>

                <!-- 語音：講話的字一個個浮出來 -->
                <Transition name="dd-story-sprite">
                    <div v-if="current.voice" class="dd-story__voice">
                        <span class="mic">🎙️</span>
                        <span class="said">{{ current.voice }}</span>
                    </div>
                </Transition>

                <!-- 每日預算：每月可支配算出來的每天能花多少 -->
                <Transition name="dd-story-card">
                    <div v-if="current.id === 'budget'" class="dd-story__budget">
                        <span class="from">每月可支配 NT$ 24,000 ÷ 30 天</span>
                        <span class="left">今天還能花</span>
                        <span class="num">NT$ {{ money(800 - shownTotal) }}</span>
                        <span class="meter"><span class="used" :style="{ '--used': Math.min(1, shownTotal / 800) }" /></span>
                    </div>
                </Transition>

                <!-- 結尾卡 -->
                <Transition name="dd-story-card">
                    <div v-if="current.id === 'end'" class="dd-story__end">
                        <DinDonBell :size="72" class="bell" />
                        <strong>你負責花錢，<br />我負責記帳。</strong>
                        <span class="promises">
                            <span>免註冊</span><span>無廣告</span><span>帳只存在你的手機</span>
                        </span>
                    </div>
                </Transition>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    .dd-story {
        --dd-story-ink: #1B1815; // 手機畫面兩個模式都是淺色，跟 App 截圖一致
        // 小精靈的鈴：出現時響一下就好（DinDonBell 讀這三個）
        --dd-story-duration: 6s; // 鈴響在一輪的前 22%：響約 1.3 秒，之後靜止
        --dd-story-delay: .25s;
        --dd-bell-rings: 1;
        position: relative;
        @include setFlex(flex-start, stretch, 12px, column);
        width: 100%;
        max-width: 360px;

        // #region [P] 進度條
        &__bar {
            @include setFlex(flex-start, center, 10px);
        }
        &__chapters {
            display: flex;
            flex: 1;
            gap: 5px;
            padding: 0;
            margin: 0;
            list-style: none;

            li { flex: 1; }
            button {
                position: relative;
                display: block;
                background: rgb(27 24 21 / 18%);
                background-clip: content-box;
                width: 100%;
                height: 18px; // 點的範圍大一點，畫出來的條只有 4px
                padding: 0;
                border: 0;
                border-top: 7px solid transparent;
                border-bottom: 7px solid transparent;
                cursor: pointer;
                overflow: hidden;

                &:focus-visible {
                    outline: 2px solid var(--dd-primary);
                    outline-offset: 2px;
                }
            }
            .fill {
                position: absolute;
                inset: 0;
                background: var(--dd-text);
                transform: scaleX(0);
                transform-origin: left;
            }
            .is-done .fill { transform: none; }
            .is-now .fill { transform: scaleX(.04); }
            .is-now .fill.is-running { animation: dd-story-fill var(--ms) linear forwards; }
            .fill.is-paused { animation-play-state: paused; }
        }
        &.is-finished &__chapters .fill { transform: none; }
        &__toggle {
            @include setFlex();
            flex: none;
            background: rgb(27 24 21 / 12%);
            width: 34px;
            height: 34px;
            padding: 0;
            border: 0;
            border-radius: 50%;
            color: var(--dd-text);
            font-size: 12px;
            cursor: pointer;

            &:focus-visible {
                outline: 2px solid var(--dd-primary);
                outline-offset: 2px;
            }
        }

        // #endregion

        // #region [P] 字幕
        &__caption {
            min-height: 3.4em;
            margin: 0;
            color: var(--dd-text);

            > span { @include setFlex(flex-start, flex-start, 2px, column); }
            strong {
                font-size: clamp(1.15rem, 1rem + .6vw, 1.4rem);
                font-weight: 800;
                line-height: 1.35;
            }
            small {
                color: color-mix(in srgb, var(--dd-text) 72%, transparent);
                font-size: var(--font-size-s);
            }
        }

        // #endregion

        // #region [P] 手機與首頁上方
        &__phone {
            background: var(--dd-frame);
            padding: 10px 10px 0;
            border-radius: 40px 40px 0 0;
            @include setRWD(500px) {
                padding: 6px 6px 0;
                border-radius: 28px 28px 0 0;
            }
        }
        &__screen {
            position: relative;
            background: #F6F4F1;
            height: 470px;
            border-radius: 30px 30px 0 0;
            color: var(--dd-story-ink);
            overflow: hidden;
            @include setRWD(500px) {
                height: 400px;
                border-radius: 22px 22px 0 0;
            }
        }
        &__head {
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: baseline;
            background: #FEBD19;
            padding: 46px 18px 16px;

            .label {
                grid-column: 1 / -1;
                font-size: 12px;
                font-weight: 700;
                opacity: .7;
            }
            .total {
                font-size: 28px;
                font-weight: 900;
                font-variant-numeric: tabular-nums;
            }
            .budget {
                font-size: 11px;
                font-weight: 700;
                opacity: .7;
            }
        }

        // #endregion

        // #region [P] 帳本
        &__feed {
            @include setFlex(flex-start, stretch, 8px, column);
            position: relative;
            padding: 12px 12px 0;
            margin: 0;
            list-style: none;
        }
        &__row {
            display: grid;
            grid-template-columns: 36px 1fr auto;
            gap: 10px;
            align-items: center;
            background: #FEFDFC;
            padding: 9px 12px 9px 9px;
            border-radius: 14px;
            transition: background-color .4s var(--dd-ease-out), opacity .4s var(--dd-ease-out);

            .icon {
                @include setFlex();
                background: #FEF3B3;
                width: 36px;
                height: 36px;
                border-radius: 10px;
                font-size: 18px;
            }
            .what {
                @include setFlex(center, flex-start, 1px, column);
                min-width: 0;
            }
            .name {
                font-size: 14px;
                font-weight: 700;
            }
            .how {
                color: #6B6157;
                font-size: 11px;
            }
            .amount {
                font-size: 15px;
                font-weight: 800;
                font-variant-numeric: tabular-nums;
            }

            // 剛記好的那一筆：底色亮一下，然後回到一般
            &.is-new { background: #E2EFFD; }
            &.is-void {
                opacity: .55;

                .name { text-decoration: line-through; }
                .amount {
                    color: #1D59BB;
                    font-size: 12px;
                }
            }
        }

        // #endregion

        // #region [P] 通知、小精靈、語音、預算、結尾
        &__notice {
            position: absolute;
            top: 10px;
            right: 10px;
            left: 10px;
            @include setFlex(flex-start, flex-start, 2px, column);
            background: #FEFDFC;
            padding: 10px 14px;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgb(27 24 21 / 16%);
            z-index: 3;

            .app {
                color: #6B6157;
                font-size: 11px;
                font-weight: 700;
            }
            .text {
                font-size: 14px;
                font-weight: 700;
            }
        }

        // 小精靈浮在畫面下緣：後面淡出一層底色，不會跟帳本的字疊在一起
        &__sprite {
            position: absolute;
            right: 0;
            bottom: 0;
            left: 0;
            @include setFlex(flex-start, flex-end, 8px);
            background: linear-gradient(to bottom, rgb(246 244 241 / 0%), #F6F4F1 38%);
            padding: 36px 12px 14px;
            z-index: 3;

            .bell { flex: none; }
            .bubble {
                background: #1B1815;
                padding: 10px 14px;
                border-radius: 16px 16px 16px 4px;
                color: #FFFDF8;
                font-size: 13px;
                font-weight: 600;
                line-height: 1.5;
            }
        }
        &__voice {
            position: absolute;
            right: 12px;
            bottom: 14px;
            left: 12px;
            @include setFlex(flex-start, center, 10px);
            background: #1D59BB;
            padding: 12px 14px;
            border-radius: 18px;
            color: #FFFDF8;
            z-index: 3;

            .mic { font-size: 20px; }
            .said {
                font-size: 14px;
                font-weight: 700;
            }
        }
        &__budget {
            position: absolute;
            right: 12px;
            bottom: 14px;
            left: 12px;
            @include setFlex(flex-start, flex-start, 4px, column);
            background: #FEFDFC;
            padding: 16px 18px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgb(27 24 21 / 16%);
            z-index: 3;

            .from {
                color: #6B6157;
                font-size: 11px;
                font-weight: 700;
            }
            .left {
                margin-top: 4px;
                font-size: 13px;
                font-weight: 700;
            }
            .num {
                color: #1D59BB;
                font-size: 30px;
                font-weight: 900;
                font-variant-numeric: tabular-nums;
                line-height: 1.1;
            }
            .meter {
                background: #E4DED2;
                width: 100%;
                height: 8px;
                border-radius: 4px;
                margin-top: 8px;
                overflow: hidden;
            }
            .used {
                display: block;
                background: #FEBD19;
                height: 100%;
                transform: scaleX(var(--used));
                transform-origin: left;
                transition: transform .6s var(--dd-ease-out);
            }
        }
        &__end {
            position: absolute;
            inset: 0;
            @include setFlex(center, center, 14px, column);
            background: #FEBD19;
            padding: 24px;
            text-align: center;
            z-index: 4;

            strong {
                font-size: 26px;
                font-weight: 900;
                line-height: 1.3;
            }
            .promises {
                @include setFlex(center, center, 6px);
                flex-wrap: wrap;

                span {
                    background: #FEFDFC;
                    padding: 4px 12px;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 700;
                }
            }
        }

        // #endregion

        // #region [P] 轉場（只有位移、透明度）；沒開動態時這些 class 不會出現，直接顯示
        &.is-motion {
            .dd-story-row-enter-active,
            .dd-story-row-move { transition: transform .5s var(--dd-ease-out), opacity .5s var(--dd-ease-out); }
            .dd-story-row-enter-from {
                transform: translateY(-14px) scale(.96);
                opacity: 0;
            }
            .dd-story-notice-enter-active { transition: transform .45s var(--dd-ease-out), opacity .3s; }
            .dd-story-notice-leave-active { transition: transform .3s ease-in, opacity .3s; }
            .dd-story-notice-enter-from,
            .dd-story-notice-leave-to {
                transform: translateY(-120%);
                opacity: 0;
            }
            .dd-story-sprite-enter-active { transition: transform .45s var(--dd-ease-out) .15s, opacity .3s .15s; }
            .dd-story-sprite-leave-active { transition: transform .25s ease-in, opacity .25s; }
            .dd-story-sprite-enter-from,
            .dd-story-sprite-leave-to {
                transform: translateY(24px);
                opacity: 0;
            }
            .dd-story-card-enter-active { transition: transform .55s var(--dd-ease-out), opacity .35s; }
            .dd-story-card-leave-active { transition: opacity .25s; }
            .dd-story-card-enter-from {
                transform: translateY(40px);
                opacity: 0;
            }
            .dd-story-card-leave-to { opacity: 0; }
            .dd-story-caption-enter-active { transition: transform .4s var(--dd-ease-out), opacity .4s; }
            .dd-story-caption-leave-active { transition: opacity .2s; }
            .dd-story-caption-enter-from {
                transform: translateY(8px);
                opacity: 0;
            }
            .dd-story-caption-leave-to { opacity: 0; }
        }

        // #endregion
    }
    @keyframes dd-story-fill {
        from { transform: scaleX(.04); }
        to { transform: none; }
    }
</style>
