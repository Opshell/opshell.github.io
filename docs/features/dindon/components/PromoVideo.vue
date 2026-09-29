<script setup lang="ts">
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { promoChapters } from '../constants';
    import promo from '../promo.json';

    // 「18 秒看懂」：行銷小精靈做的宣傳短片（4:5），影片放 R2（pnpm dindon:promo 上傳並寫 promo.json）。
    //
    // - 靜音自動播：捲到一半以上在畫面裡才開始，離開就停；preload="none"，沒捲到不花流量
    // - 開了「減少動態效果」或省流量模式就不自動播，停在封面等人按
    // - 自己按了暫停的，捲回來不會又自己播起來
    // - 片裡有「叮咚」的音效：按「開聲音」從頭播一次

    const videoRef = ref<HTMLVideoElement>();
    const src = `${promo.mediaBase}${promo.video}`;
    const poster = `${promo.mediaBase}${promo.poster}`;

    const playing = ref(false);
    const muted = ref(true);
    const currentTime = ref(0);
    const progress = ref(0);
    const autoplay = ref(false);
    let userPaused = false;
    let inView = false;
    let observer: IntersectionObserver | undefined;
    let frame = 0;

    const activeChapter = computed(() => promoChapters.findLastIndex(chapter => currentTime.value >= chapter.at));

    function play() {
        videoRef.value?.play().catch(() => {
            // 瀏覽器不讓自動播（例如低電量模式）：留在封面，按鈕照樣能按
            playing.value = false;
        });
    }

    function togglePlay() {
        const video = videoRef.value;
        if (!video) return;
        if (video.paused) {
            userPaused = false;
            play();
        } else {
            userPaused = true;
            video.pause();
        }
    }

    function toggleSound() {
        const video = videoRef.value;
        if (!video) return;
        if (video.muted) {
            // 開聲音就從頭播：叮咚的音效在付款那一段，半路開只會聽到一半
            video.muted = false;
            video.currentTime = 0;
            userPaused = false;
            play();
        } else {
            video.muted = true;
        }
    }

    function seek(at: number) {
        const video = videoRef.value;
        if (!video) return;
        video.currentTime = at;
        currentTime.value = at;
        userPaused = false;
        play();
    }

    // 進度條跟著畫面每一格走（timeupdate 一秒只有 4 次，條會一跳一跳的）；只有在播的時候才跑
    function tick() {
        const video = videoRef.value;
        frame = 0;
        if (!video || video.paused) return;
        progress.value = video.currentTime / (video.duration || promo.duration);
        frame = requestAnimationFrame(tick);
    }

    function onPlay() {
        playing.value = true;
        if (!frame) frame = requestAnimationFrame(tick);
    }

    function onPause() {
        playing.value = false;
    }

    function onTimeUpdate() {
        const video = videoRef.value;
        if (!video) return;
        currentTime.value = video.currentTime;
        if (video.paused) progress.value = video.currentTime / (video.duration || promo.duration);
    }

    function onVolumeChange() {
        muted.value = videoRef.value?.muted ?? true;
    }

    onMounted(() => {
        const video = videoRef.value;
        if (!video) return;
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        autoplay.value = !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !connection?.saveData;

        observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            if (!inView) {
                // 捲走就停；有開聲音的也停，不要在看不到的地方一直叮咚
                if (!video.paused) video.pause();
                return;
            }
            if (autoplay.value && !userPaused) play();
        }, { threshold: 0.5 });
        observer.observe(video);
    });

    onBeforeUnmount(() => {
        observer?.disconnect();
        if (frame) cancelAnimationFrame(frame);
    });
</script>

<template>
    <div class="dindon-promo">
        <div class="dindon-promo__head">
            <p class="dindon-landing__eyebrow" data-reveal>18 秒看懂</p>
            <h2 class="dindon-landing__title" data-reveal style="--reveal-delay: 80ms">你負責花錢，<br />我負責記帳。</h2>
        </div>

        <ol class="dindon-promo__chapters" aria-label="短片的段落">
            <li v-for="(chapter, index) in promoChapters" :key="chapter.at" data-reveal :style="{ '--reveal-delay': `${(index + 2) * 70}ms` }">
                <button type="button" class="dindon-promo__chapter" :class="{ 'is-active': index === activeChapter }" :aria-current="index === activeChapter ? 'step' : undefined" @click="seek(chapter.at)">
                    <span class="time">0:{{ String(Math.floor(chapter.at)).padStart(2, '0') }}</span>
                    <span class="body">
                        <span class="title">{{ chapter.title }}</span>
                        <span class="text">{{ chapter.text }}</span>
                    </span>
                </button>
            </li>
        </ol>

        <figure class="dindon-promo__figure" data-reveal="right">
            <div class="dindon-promo__frame">
                <video
                    ref="videoRef"
                    class="dindon-promo__video"
                    :poster="poster"
                    :width="promo.width"
                    :height="promo.height"
                    preload="none"
                    muted
                    loop
                    playsinline
                    disablepictureinpicture
                    aria-label="叮咚記帳 18 秒宣傳短片：付款通知一跳就自動記帳，沒有通知的消費拍照、說話、截圖也能記"
                    @play="onPlay"
                    @pause="onPause"
                    @timeupdate="onTimeUpdate"
                    @volumechange="onVolumeChange"
                    @click="togglePlay"
                >
                    <source :src="src" type="video/mp4" />
                </video>

                <!-- 沒在播的時候（還沒捲到、不自動播、自己按了暫停）中間放一顆大的播放鍵 -->
                <button v-show="!playing" type="button" class="dindon-promo__big-play" aria-label="播放短片" @click="togglePlay">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
                </button>

                <div class="dindon-promo__controls">
                    <button type="button" class="dindon-promo__control" :aria-label="playing ? '暫停' : '播放'" @click="togglePlay">
                        <svg v-if="playing" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
                        <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
                    </button>
                    <button type="button" class="dindon-promo__control dindon-promo__control--sound" :aria-pressed="!muted" @click="toggleSound">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
                            <path v-if="muted" d="m15.5 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                            <path v-else d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        </svg>
                        <span>{{ muted ? '開聲音' : '靜音' }}</span>
                    </button>
                </div>

                <span class="dindon-promo__progress" aria-hidden="true"><span :style="{ transform: `scaleX(${progress})` }" /></span>
            </div>
            <figcaption>{{ autoplay ? '靜音自動播放，右下角可以開聲音' : '按一下播放，右下角可以開聲音' }}</figcaption>
        </figure>
    </div>
</template>

<style lang="scss">
    // 用宣傳頁的色票（--dd-*），只能放在 .dindon-landing 裡面
    // 寬的時候左邊標題＋章節、右邊影片；窄的時候標題 → 影片 → 章節，影片不要被章節擠到第一屏外面
    .dindon-promo {
        display: grid;
        grid-template:
            'head video' auto
            'chapters video' auto / 1fr minmax(0, 440px);
        gap: 0 56px;
        align-content: center;
        @include setRWD(768px) {
            grid-template:
                'head'
                'video'
                'chapters' / 1fr;
            gap: 24px;
        }

        &__head {
            grid-area: head;
            align-self: end;
        }

        // #region [P] 章節：跟著影片亮起來，點了跳到那一段
        &__chapters {
            grid-area: chapters;
            align-self: start;
            @include setFlex(flex-start, stretch, 8px, column);
            margin-top: 28px !important;
            list-style: none;
            @include setRWD(768px) { margin-top: 0 !important; }
        }
        &__chapter {
            display: flex;
            gap: 14px;
            align-items: baseline;
            background: transparent;
            width: 100%;
            padding: 12px 16px;
            border: 0;
            border-left: 4px solid var(--dd-border);
            border-radius: 0 12px 12px 0;
            color: var(--dd-text);
            font: inherit;
            text-align: left;
            cursor: pointer;
            transition: background-color .25s ease, border-color .25s ease;

            .time {
                flex: none;
                color: var(--dd-muted);
                font-size: var(--font-size-s);
                font-variant-numeric: tabular-nums;
            }
            .body {
                @include setFlex(flex-start, flex-start, 2px, column);
            }
            .title { font-weight: 700; }
            .text {
                color: var(--dd-muted);
                font-size: var(--font-size-s);
            }
            @media (hover: hover) {
                &:hover { background: color-mix(in srgb, var(--dd-surface) 60%, transparent); }
            }
            &:focus-visible {
                outline: 3px solid var(--dd-primary);
                outline-offset: 2px;
            }
            &.is-active {
                background: var(--dd-surface);
                border-left-color: var(--dd-accent);

                .time { color: var(--dd-accent-border); }
            }
        }

        // #endregion

        // #region [P] 影片
        &__figure {
            grid-area: video;
            @include setFlex(flex-start, center, 12px, column);
            margin: 0;

            figcaption {
                color: var(--dd-muted);
                font-size: var(--font-size-s);
            }
        }
        &__frame {
            position: relative;
            width: 100%;
            max-width: 440px;
            border-radius: 28px;
            box-shadow: 0 16px 40px rgb(27 24 21 / 10%);
            overflow: hidden;
            @include setRWD(500px) { border-radius: 20px; }
        }
        &__video {
            display: block;
            background: #F6F4F1; // 封面還沒載入前的底色＝片子的米色底
            width: 100%;
            height: auto;
            aspect-ratio: 4 / 5;
            cursor: pointer;
        }
        &__big-play {
            position: absolute;
            top: 50%;
            left: 50%;
            @include setFlex();
            background: #1D59BB; // 壓在片子上，深淺模式都用同一個深藍，白色三角形才看得清楚
            @include setSize(76px, 76px);
            padding: 0;
            border: 0;
            border-radius: 50%;
            box-shadow: 0 8px 24px rgb(27 24 21 / 18%);
            color: #FFFDF8;
            cursor: pointer;
            transform: translate(-50%, -50%);
            transition: transform .25s var(--cubic-FiSo);

            svg {
                @include setSize(36px, 36px);
                fill: currentColor;
            }
            @media (hover: hover) {
                &:hover { transform: translate(-50%, -50%) scale(1.06); }
            }
            &:focus-visible {
                outline: 3px solid var(--dd-accent);
                outline-offset: 3px;
            }
        }

        // 右下角的兩顆小按鈕：深色半透明底，片子亮暗兩種畫面上都看得到
        &__controls {
            position: absolute;
            right: 12px;
            bottom: 16px;
            @include setFlex(flex-end, center, 8px);
        }
        &__control {
            @include setFlex(center, center, 6px);
            background: rgb(27 24 21 / 72%);
            min-width: 40px;
            height: 40px;
            padding: 0 10px;
            border: 0;
            border-radius: 999px;
            color: #FFFDF8;
            font: inherit;
            font-size: var(--font-size-s);
            font-weight: 700;
            cursor: pointer;

            svg {
                @include setSize(20px, 20px);
                fill: currentColor;
            }
            &:focus-visible {
                outline: 3px solid var(--dd-accent);
                outline-offset: 2px;
            }
            &--sound { padding: 0 14px 0 10px; }
        }
        &__progress {
            position: absolute;
            right: 0;
            bottom: 0;
            left: 0;
            background: rgb(27 24 21 / 12%);
            height: 4px;

            span {
                display: block;
                background: var(--dd-primary);
                height: 100%;
                transform: scaleX(0);
                transform-origin: left;
            }
        }

        // #endregion
        @media (prefers-reduced-motion: reduce) {
            &__chapter, &__big-play { transition: none; }
        }
    }
</style>
