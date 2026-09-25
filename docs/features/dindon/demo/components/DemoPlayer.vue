<script setup lang="ts">
    import type { iDemoItem } from '../types';
    import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { MEDIA_BASE } from '../catalog';
    import { useDemoOverlay } from '../hooks/useDemoOverlay';

    const props = defineProps<{
        item: iDemoItem;
        /** 開了「減少動態效果」就不自動播放，留一顆播放鈕 */
        autoplay?: boolean;
    }>();
    const emit = defineEmits<{ ended: [] }>();

    /** 影片目前的秒數，給外面的步驟清單標出現在播到哪一步 */
    const time = defineModel<number>('time', { default: 0 });

    const videoRef = ref<HTMLVideoElement>();
    const progressRef = ref<HTMLElement>();
    const playing = ref(false);
    const ended = ref(false);
    const slow = ref(false);

    const steps = computed(() => props.item.steps ?? []);
    const duration = computed(() => props.item.duration ?? 0);
    const { finger, box, bubble } = useDemoOverlay(time, steps);

    const trailPoints = computed(() => finger.value?.trail.map(([x, y]) => `${x * 540},${y * 1200}`).join(' ') ?? '');
    const percent = (seconds: number) => `${Math.min(100, (seconds / (duration.value || 1)) * 100)}%`;
    const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

    // #region [P] 播放狀態：播放中每一格讀一次 currentTime，手指才跟得上畫面
    let frame = 0;
    function tick() {
        if (videoRef.value) time.value = videoRef.value.currentTime;
        frame = playing.value ? requestAnimationFrame(tick) : 0;
    }
    function onPlay() {
        playing.value = true;
        ended.value = false;
        cancelAnimationFrame(frame);
        tick();
    }
    function onPause() {
        playing.value = false;
        tick();
    }
    function onEnded() {
        ended.value = true;
        emit('ended');
    }

    function play() {
        // 自動播放被瀏覽器擋下來時留在暫停狀態，使用者按播放鈕就好
        videoRef.value?.play().catch(() => { playing.value = false; });
    }
    function toggle() {
        if (!videoRef.value) return;
        if (videoRef.value.paused) play();
        else videoRef.value.pause();
    }
    function seek(seconds: number) {
        if (!videoRef.value) return;
        videoRef.value.currentTime = Math.max(0, Math.min(seconds, duration.value));
        time.value = videoRef.value.currentTime;
        ended.value = false;
    }
    function replay() {
        seek(0);
        play();
    }
    function toggleSpeed() {
        slow.value = !slow.value;
        if (videoRef.value) videoRef.value.playbackRate = slow.value ? 0.5 : 1;
    }

    // #endregion

    // #region [P] 進度條：點一下或拖著跳到那個時間
    let scrubbing = false;
    function seekFromPointer(event: PointerEvent) {
        const rect = progressRef.value!.getBoundingClientRect();
        seek(((event.clientX - rect.left) / rect.width) * duration.value);
    }
    function onScrubStart(event: PointerEvent) {
        scrubbing = true;
        progressRef.value!.setPointerCapture(event.pointerId);
        seekFromPointer(event);
    }
    function onScrubMove(event: PointerEvent) {
        if (scrubbing) seekFromPointer(event);
    }
    function onScrubEnd() {
        scrubbing = false;
    }
    function onProgressKey(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft') seek(time.value - 1);
        else if (event.key === 'ArrowRight') seek(time.value + 1);
        else return;
        event.preventDefault();
        event.stopPropagation(); // 不要讓外面的對話框當成「上一支、下一支」
    }

    // #endregion

    // 換一支的時候從頭開始；playbackRate 換了 src 會被重設，要補回去
    watch(() => props.item.id, () => {
        time.value = 0;
        ended.value = false;
        playing.value = false;
    });
    function onLoaded() {
        if (videoRef.value) videoRef.value.playbackRate = slow.value ? 0.5 : 1;
        if (props.autoplay) play();
    }

    onMounted(() => {
        if (videoRef.value && videoRef.value.readyState >= 1) onLoaded();
    });
    onBeforeUnmount(() => cancelAnimationFrame(frame));

    defineExpose({ seek, play, toggle, replay });
</script>

<template>
    <div class="demo-player">
        <div class="demo-player__phone">
            <div class="demo-player__screen">
                <video
                    ref="videoRef"
                    :key="item.id"
                    :src="`${MEDIA_BASE}${item.video}`"
                    :poster="`${MEDIA_BASE}${item.poster}`"
                    muted
                    playsinline
                    preload="auto"
                    @loadedmetadata="onLoaded"
                    @play="onPlay"
                    @pause="onPause"
                    @ended="onEnded"
                    @seeked="tick"
                    @click="toggle"
                />

                <!-- 手指與說明泡泡：座標是影片畫面的比例，跟著影片縮放 -->
                <div class="demo-player__overlay" aria-hidden="true">
                    <svg v-if="finger?.trail.length" class="trail" viewBox="0 0 540 1200" preserveAspectRatio="none" :style="{ opacity: finger.opacity }">
                        <polyline :points="trailPoints" />
                    </svg>
                    <!-- 紅框：手指落下前先框出要點的元件 -->
                    <span
                        v-if="box"
                        class="target"
                        :style="{ left: `${box.x1 * 100}%`, top: `${box.y1 * 100}%`, width: `${(box.x2 - box.x1) * 100}%`, height: `${(box.y2 - box.y1) * 100}%`, opacity: box.opacity }"
                    />
                    <span
                        v-if="finger"
                        class="finger"
                        :class="{ 'is-pressed': finger.pressed }"
                        :style="{ left: `${finger.x * 100}%`, top: `${finger.y * 100}%`, opacity: finger.opacity }"
                    />
                    <div class="bubble-layer">
                        <p
                            v-if="bubble"
                            :key="bubble.text"
                            class="bubble"
                            :class="[`is-${bubble.kind}`, { 'is-below': !bubble.above }]"
                            :style="{ '--bx': bubble.x, 'left': `${bubble.x * 100}%`, 'top': `${bubble.y * 100}%` }"
                        >
                            <span v-if="bubble.kind === 'type'" class="bubble-icon">⌨</span>
                            <span v-else-if="bubble.kind === 'back'" class="bubble-icon">◁</span>
                            {{ bubble.text }}
                        </p>
                    </div>
                </div>

                <button v-if="ended || !playing && time === 0" type="button" class="demo-player__big" :aria-label="ended ? '再看一次' : '播放'" @click="ended ? replay() : play()">
                    <svg v-if="ended" class="is-stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.5" /><path d="M4 3.5v5h5" /></svg>
                    <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7Z" /></svg>
                </button>
            </div>
        </div>

        <div class="demo-player__controls">
            <button type="button" class="control" :aria-label="playing ? '暫停' : '播放'" @click="toggle">
                <svg v-if="playing" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z" /></svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7Z" /></svg>
            </button>

            <div
                ref="progressRef"
                class="progress"
                role="slider"
                tabindex="0"
                aria-label="播放進度"
                :aria-valuemin="0"
                :aria-valuemax="Math.round(duration)"
                :aria-valuenow="Math.round(time)"
                :aria-valuetext="`${clock(time)} / ${clock(duration)}`"
                @pointerdown="onScrubStart"
                @pointermove="onScrubMove"
                @pointerup="onScrubEnd"
                @pointercancel="onScrubEnd"
                @keydown="onProgressKey"
            >
                <span class="progress-fill" :style="{ width: percent(time) }" />
                <!-- 每一步一個刻度，看得出動作集中在哪裡 -->
                <span v-for="(step, index) in steps" :key="index" class="progress-tick" :style="{ left: percent(step.t) }" />
            </div>

            <span class="time">{{ clock(time) }} / {{ clock(duration) }}</span>
            <button type="button" class="control is-text" :class="{ 'is-on': slow }" :aria-pressed="slow" title="慢速播放" @click="toggleSpeed">0.5×</button>
            <button type="button" class="control" aria-label="從頭播放" @click="replay">
                <svg class="is-stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.5" /><path d="M4 3.5v5h5" /></svg>
            </button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
    .demo-player {
        @include setFlex(flex-start, center, 14px, column);
        width: var(--demo-phone-width, 300px);
        max-width: 100%;

        // #region [P] 手機外框：和宣傳頁同一組，平面、不做高光
        &__phone {
            background: var(--dd-frame);
            width: 100%;
            border: 10px solid var(--dd-frame);
            border-radius: 36px;
            @include setRWD(500px) {
                border-width: 6px;
                border-radius: 26px;
            }
        }
        &__screen {
            position: relative;
            background: var(--dd-sunken);
            aspect-ratio: 540 / 1200;
            border-radius: 26px;
            overflow: hidden;
            @include setRWD(500px) { border-radius: 20px; }

            video {
                display: block;
                width: 100%;
                height: 100%;
                object-fit: cover;
                cursor: pointer;
            }
        }

        // #endregion

        // #region [P] 疊在影片上的手指、軌跡、說明泡泡
        &__overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;

            .trail {
                position: absolute;
                inset: 0;
                @include setSize(100%, 100%);

                polyline {
                    fill: none;
                    stroke: color-mix(in srgb, var(--dd-accent) 55%, transparent);
                    stroke-width: 18;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
            }
            .target {
                position: absolute;
                border: 2px solid #E5484D;
                border-radius: 6px;
            }
            .finger {
                position: absolute;
                background: color-mix(in srgb, var(--dd-accent) 55%, transparent);
                border-radius: 50%;
                transform: translate(-50%, -50%) scale(1.15);
                transition: transform .12s ease-out;
                aspect-ratio: 1;
                @include setSize(13%, auto);

                // 中間一顆實心點，淺色、深色畫面上都看得到按在哪
                &::after {
                    content: '';
                    position: absolute;
                    inset: 34%;
                    background: var(--dd-accent-border);
                    border-radius: 50%;
                }
                &.is-pressed { transform: translate(-50%, -50%) scale(.85); }
            }
            .bubble-layer {
                position: absolute;
                inset: 0 5%;
            }
            .bubble {
                position: absolute;
                background: var(--demo-bubble-bg, #1B1815);
                width: max-content;
                max-width: 88%;
                padding: 6px 12px;
                border-radius: 12px;
                color: #F4EFE3;
                font-size: 13px;
                font-weight: 600;
                line-height: 1.5;

                // 以 --bx 當錨點：手指在最左邊時泡泡靠左、最右邊時靠右，不會超出螢幕
                transform: translate(calc(var(--bx) * -100%), calc(-100% - 11%));
                animation: demo-bubble-in .25s var(--dd-ease-out, ease-out) both;

                &.is-below { transform: translate(calc(var(--bx) * -100%), 30%); }
                &.is-caption {
                    background: var(--dd-accent);
                    color: #1B1815;
                }
                .bubble-icon { margin-right: 4px; }
                @include setRWD(500px) { font-size: 12px; }
            }
        }

        // #endregion

        &__big {
            position: absolute;
            top: 50%;
            left: 50%;
            @include setFlex(center, center); // 沒有這行圖示會貼在圓的左上角
            background: color-mix(in srgb, #1B1815 72%, transparent);
            @include setSize(64px, 64px);
            border: 0;
            border-radius: 50%;
            color: #FEFDFC;
            cursor: pointer;
            transform: translate(-50%, -50%);

            svg {
                @include setSize(30px, 30px);
                fill: currentcolor;
            }
            svg.is-stroke {
                fill: none;
                stroke: currentcolor;
                stroke-width: 2.4;
                stroke-linecap: round;
                stroke-linejoin: round;
            }
            &:focus-visible { outline: 3px solid var(--dd-primary); }
        }

        // #region [P] 控制列
        &__controls {
            @include setFlex(flex-start, center, 8px);
            width: 100%;

            .control {
                flex-shrink: 0;
                @include setFlex(center, center);
                background: var(--dd-surface);
                @include setSize(34px, 34px);
                border: 1px solid var(--dd-border);
                border-radius: 50%;
                color: var(--dd-text);
                cursor: pointer;

                svg {
                    @include setSize(18px, 18px);
                    fill: currentcolor;
                }
                svg.is-stroke {
                    fill: none;
                    stroke: currentcolor;
                    stroke-width: 2.4;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                &.is-text {
                    width: auto;
                    padding: 0 10px;
                    border-radius: 17px;
                    font-size: var(--font-size-xs);
                    font-weight: 700;
                }
                &.is-on {
                    background: var(--dd-accent);
                    border-color: var(--dd-accent);
                    color: #1B1815;
                }
                &:focus-visible { outline: 3px solid var(--dd-primary); }
            }
            .progress {
                position: relative;
                flex: 1;
                background: var(--dd-border);
                height: 6px;
                border-radius: 3px;
                cursor: pointer;
                touch-action: none;

                // 看起來細，但點得到的範圍上下各多 10px
                &::before {
                    content: '';
                    position: absolute;
                    inset: -10px 0;
                }
                &:focus-visible {
                    outline: 3px solid var(--dd-primary);
                    outline-offset: 4px;
                }
            }
            .progress-fill {
                position: absolute;
                inset: 0 auto 0 0;
                background: var(--dd-primary);
                border-radius: 3px;
            }
            .progress-tick {
                position: absolute;
                top: 50%;
                background: var(--dd-text);
                border-radius: 1px;
                transform: translate(-50%, -50%);
                opacity: .45;
                @include setSize(2px, 12px);
            }
            .time {
                flex-shrink: 0;
                color: var(--dd-muted);
                font-size: var(--font-size-xs);
                font-variant-numeric: tabular-nums;
            }
        }

        // #endregion
    }
    @keyframes demo-bubble-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
        .demo-player__overlay .finger { transition: none; }
        .demo-player__overlay .bubble { animation: none; }
    }
</style>
