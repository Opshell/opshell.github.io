<script setup lang="ts">
    import type { Ray } from '../prism';
    import { hueVar } from '@shared/utils/spectrum';
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { aimFromPointer, bezierAt, LABEL_X, ORB, photonAt, rayEnd, rayPolygon, refract, SOURCE_X, SOURCE_Y, stars, strandAt, VIEW } from '../prism';

    // 首頁的光學台（2026-10 翻新第二版）：白光射進玻璃 O，散成各分類的光。取代舊版那張 AI 插畫。
    // - 滑鼠上下是瞄準入射光：O 的出射點反向偏一點，整把光跟著轉（幾何在 prism.ts）
    // - 光上一直有光點往外流，文章越多的光越熱鬧；滑過一道光，標籤底下出現那類最新的一篇
    // - 每道光是切換鈕：點了，底下的文章換成那一類；點白光或 O 回到全部
    // - 進場一次：光先射進來、O 亮起來、再一道道散開。之後的動態都在回應滑鼠；
    //   關閉動態時是畫好的靜止畫面（光點停在固定位置、不瞄準）。捲出畫面或切到別的分頁就停。
    const { rays = [], selected = null } = defineProps<{ rays?: Ray[]; selected?: string | null }>();
    const emit = defineEmits<{ select: [key: string | null] }>();

    const sky = stars(70);

    // #region [P] 瞄準與時間
    const sourceY = ref<number>(SOURCE_Y.rest);
    const clock = ref(0);
    const hovered = ref<string | null>(null);
    const motion = ref(false);
    let target: number | null = null;
    let frame = 0;
    let last = 0;
    let visible = true;
    let observer: IntersectionObserver | undefined;

    function tick(now: number) {
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
        last = now;
        clock.value += dt;
        // 沒有滑鼠的時候光自己慢慢晃，有的時候追著滑鼠（追的速度跟距離成正比，停下來時很順）
        const aim = target ?? SOURCE_Y.rest + Math.sin(clock.value * 0.35) * 28;
        sourceY.value += (aim - sourceY.value) * Math.min(1, dt * 4);
        frame = requestAnimationFrame(tick);
    }
    function start() {
        if (!motion.value || frame || !visible || document.hidden) return;
        last = 0;
        frame = requestAnimationFrame(tick);
    }
    function stop() {
        cancelAnimationFrame(frame);
        frame = 0;
    }
    const onVisibility = () => (document.hidden ? stop() : start());

    function aim(event: PointerEvent) {
        if (!motion.value || event.pointerType === 'touch') return;
        const rect = (event.currentTarget as Element).getBoundingClientRect();
        target = aimFromPointer((event.clientY - rect.top) / rect.height);
    }

    onMounted(() => {
        motion.value = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
        if (!motion.value) return;
        observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            visible ? start() : stop();
        });
        observer.observe(rootRef.value!);
        document.addEventListener('visibilitychange', onVisibility);
        start();
    });
    onBeforeUnmount(() => {
        stop();
        observer?.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
    });
    // #endregion

    // #region [P] 幾何
    const rootRef = ref<HTMLElement>();
    const path = computed(() => refract(sourceY.value));
    const focus = computed(() => hovered.value ?? selected);
    /** O 裡面的光絲：每道光一股，在玻璃裡扭動，出口時對準自己那道光（形狀在 prism.ts 的 strandAt） */
    const strands = computed(() => {
        const { entry, exit } = path.value;
        return rays.map((ray, index) => ({
            key: ray.key,
            hue: hueVar(ray.hue),
            muted: !!focus.value && focus.value !== ray.key,
            ...strandAt(entry, exit, rayEnd(ray), clock.value, index)
        }));
    });

    /** 光點：每道光幾顆，照各自的相位往外流；入射光上也有 */
    const photons = computed(() => {
        const { entry, exit } = path.value;
        const list: { key: string; x: number; y: number; o: number; hue: string; r: number }[] = [];
        rays.forEach((ray, rayIndex) => {
            for (let i = 0; i < ray.photons; i++) {
                const phase = (i / ray.photons + rayIndex * 0.137) % 1;
                const t = (phase + clock.value * (0.16 + 0.02 * (i % 3))) % 1;
                const lane = Math.sin((i + 1) * 2.4 + rayIndex) * 0.9;
                const p = photonAt(exit, ray, t, lane);
                const dim = focus.value && focus.value !== ray.key ? 0.25 : 1;
                list.push({ key: `${ray.key}-${i}`, x: p.x, y: p.y, o: Math.sin(Math.PI * t) * dim, hue: hueVar(ray.hue), r: 1.6 + (i % 2) * 0.8 });
            }
        });
        // O 裡面：光點沿著光絲走，比外面快一點、亮一點，像被攪動
        strands.value.forEach((strand, index) => {
            for (let i = 0; i < 2; i++) {
                const t = (i / 2 + index * 0.21 + clock.value * 0.45) % 1;
                const p = bezierAt(strand.points, t);
                list.push({ key: `in-${strand.key}-${i}`, x: p.x, y: p.y, o: Math.sin(Math.PI * t) * (strand.muted ? 0.3 : 1), hue: strand.hue, r: 1.4 });
            }
        });
        for (let i = 0; i < 5; i++) {
            const t = (i / 5 + clock.value * 0.22) % 1;
            list.push({
                key: `beam-${i}`,
                x: SOURCE_X + (entry.x - SOURCE_X) * t,
                y: sourceY.value + (entry.y - sourceY.value) * t,
                o: Math.sin(Math.PI * t) * 0.9,
                hue: 'var(--op-beam)',
                r: 1.8
            });
        }
        return list;
    });
    // #endregion

    function toggle(key: string) {
        emit('select', selected === key ? null : key);
    }
    const shorten = (text: string, max = 14) => ([...text].length > max ? `${[...text].slice(0, max).join('')}…` : text);
</script>

<template>
    <figure ref="rootRef" class="op-bench" :class="{ 'is-motion': motion }" @pointermove="aim" @pointerleave="target = null">
        <svg
            class="op-bench__svg"
            :viewBox="`0 0 ${VIEW.width} ${VIEW.height}`"
            role="group"
            aria-labelledby="op-bench-caption"
            :style="{ '--exit-x': `${path.exit.x}px`, '--exit-y': `${path.exit.y}px` }"
        >
            <defs>
                <linearGradient id="op-bench-ring" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="15%" stop-color="var(--pr-amber)" />
                    <stop offset="55%" stop-color="var(--pr-magenta)" />
                    <stop offset="90%" stop-color="var(--pr-violet)" />
                </linearGradient>
                <radialGradient id="op-bench-glass" cx="42%" cy="38%" r="70%">
                    <stop offset="0%" stop-color="var(--op-glass-core)" />
                    <stop offset="70%" stop-color="var(--op-glass-edge)" />
                    <stop offset="100%" stop-color="var(--op-glass-rim)" />
                </radialGradient>
                <!-- 每股光絲：入口是白的，往裡面走才變成自己的顏色 -->
                <linearGradient
                    v-for="(strand, index) in strands"
                    :id="`op-bench-strand-${index}`"
                    :key="strand.key"
                    gradientUnits="userSpaceOnUse"
                    :x1="path.entry.x"
                    :y1="path.entry.y"
                    :x2="path.exit.x"
                    :y2="path.exit.y"
                >
                    <stop offset="0%" stop-color="var(--op-beam)" />
                    <stop offset="35%" :stop-color="strand.hue" stop-opacity=".9" />
                    <stop offset="100%" :stop-color="strand.hue" />
                </linearGradient>
                <clipPath id="op-bench-orb-clip">
                    <circle :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r - 3" />
                </clipPath>
                <linearGradient id="op-bench-beam" gradientUnits="userSpaceOnUse" :x1="SOURCE_X" :y1="sourceY" :x2="path.entry.x" :y2="path.entry.y">
                    <stop offset="0%" stop-color="var(--op-beam)" stop-opacity="0" />
                    <stop offset="35%" stop-color="var(--op-beam)" stop-opacity=".9" />
                    <stop offset="100%" stop-color="var(--op-beam)" />
                </linearGradient>
                <!-- 光暈用整張畫布的座標：濾鏡範圍跟著元素的外框算的話，細長的光會被裁掉 -->
                <filter id="op-bench-blur" filterUnits="userSpaceOnUse" x="-200" y="-200" :width="VIEW.width + 400" :height="VIEW.height + 400">
                    <feGaussianBlur stdDeviation="9" />
                </filter>
                <filter id="op-bench-halo" filterUnits="userSpaceOnUse" x="-200" y="-200" :width="VIEW.width + 400" :height="VIEW.height + 400">
                    <feGaussianBlur stdDeviation="34" />
                </filter>
            </defs>

            <!-- 星塵：呼應舊首頁「筆記本裡的宇宙」 -->
            <g class="op-bench__sky" aria-hidden="true">
                <circle v-for="(star, index) in sky" :key="index" :cx="star.x" :cy="star.y" :r="star.r" :style="{ animationDelay: `${star.delay}s` }" />
            </g>

            <circle class="op-bench__halo" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r" fill="url(#op-bench-ring)" filter="url(#op-bench-halo)" aria-hidden="true" />

            <!-- 白光：回到全部。線很細，另外疊一條透明的粗線當按的範圍 -->
            <g
                class="op-bench__white"
                :class="{ 'is-selected': selected === null }"
                role="button"
                tabindex="0"
                :aria-pressed="selected === null"
                aria-label="全部分類"
                @click="emit('select', null)"
                @keydown.enter.prevent="emit('select', null)"
                @keydown.space.prevent="emit('select', null)"
            >
                <line class="hit" :x1="SOURCE_X" :y1="sourceY" :x2="path.entry.x" :y2="path.entry.y" />
                <line class="soft" :x1="SOURCE_X" :y1="sourceY" :x2="path.entry.x" :y2="path.entry.y" filter="url(#op-bench-blur)" />
                <line class="core" :x1="SOURCE_X" :y1="sourceY" :x2="path.entry.x" :y2="path.entry.y" stroke="url(#op-bench-beam)" pathLength="1" />
            </g>

            <g
                v-for="(ray, index) in rays"
                :key="ray.key"
                class="op-bench__ray"
                :class="{
                    'is-selected': selected === ray.key,
                    'is-focused': focus === ray.key,
                    'is-muted': !!focus && focus !== ray.key,
                }"
                role="button"
                tabindex="0"
                :aria-pressed="selected === ray.key"
                :style="{ '--hue': hueVar(ray.hue), '--i': index }"
                :aria-label="`${ray.label}，${ray.count} 篇，最新：${ray.latest.title}`"
                @click="toggle(ray.key)"
                @keydown.enter.prevent="toggle(ray.key)"
                @keydown.space.prevent="toggle(ray.key)"
                @pointerenter="hovered = ray.key"
                @pointerleave="hovered = null"
                @focus="hovered = ray.key"
                @blur="hovered = null"
            >
                <polygon class="glow" :points="rayPolygon(path.exit, ray)" filter="url(#op-bench-blur)" />
                <polygon class="beam" :points="rayPolygon(path.exit, ray)" />
                <text :x="LABEL_X" :y="ray.y" dominant-baseline="central" aria-hidden="true">
                    <tspan class="label">{{ ray.label }}</tspan>
                    <tspan class="count" dx="10">{{ ray.count }}</tspan>
                </text>
                <text class="latest" :x="LABEL_X" :y="ray.y + 20" dominant-baseline="central" aria-hidden="true">最新：{{ shorten(ray.latest.title) }}</text>
            </g>

            <!-- 玻璃 O：厚度是一圈淡淡的寬環，外緣是品牌漸層。白光進來就被拆成光絲、在裡面扭動，出口才收束成光束 -->
            <g class="op-bench__orb" aria-hidden="true" @click="emit('select', null)">
                <circle class="body" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r" fill="url(#op-bench-glass)" />
                <circle class="orbit" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r * 0.68" />
                <g class="inner" clip-path="url(#op-bench-orb-clip)">
                    <!-- 入口的漣漪：光打進來的地方一圈圈擴散 -->
                    <circle v-for="n in 3" :key="n" class="ripple" :cx="path.entry.x" :cy="path.entry.y" r="16" :style="{ animationDelay: `${(n - 1) * 0.8}s` }" />
                    <path
                        v-for="(strand, index) in strands"
                        :key="`glow-${strand.key}`"
                        class="strand-glow"
                        :class="{ 'is-muted': strand.muted }"
                        :d="strand.d"
                        :stroke="strand.hue"
                        filter="url(#op-bench-blur)"
                        :style="{ '--i': index }"
                    />
                    <path
                        v-for="(strand, index) in strands"
                        :key="strand.key"
                        class="strand"
                        :class="{ 'is-muted': strand.muted }"
                        :d="strand.d"
                        :stroke="`url(#op-bench-strand-${index})`"
                        :style="{ '--i': index }"
                    />
                </g>
                <circle class="thick" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r - 9" stroke="url(#op-bench-ring)" />
                <circle class="ring" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r" stroke="url(#op-bench-ring)" />
                <circle class="caustic" :cx="path.exit.x" :cy="path.exit.y" r="9" filter="url(#op-bench-blur)" />
            </g>

            <g class="op-bench__photons" aria-hidden="true">
                <circle v-for="p in photons" :key="p.key" :cx="p.x" :cy="p.y" :r="p.r" :fill="p.hue" :opacity="p.o" />
            </g>
        </svg>
        <figcaption id="op-bench-caption">
            一道光穿過 O，散成這裡寫的每一類。光越寬文章越多；<span class="op-bench__hint">移動滑鼠瞄準入射光，</span>點一道光看那一類。
        </figcaption>
    </figure>
</template>

<style lang="scss">
    .op-bench {
        --op-beam: #FFF8E7;
        --op-star: #FFF;
        --op-glass-core: rgb(255 255 255 / 2%);
        --op-glass-edge: rgb(189 52 254 / 6%);
        --op-glass-rim: rgb(244 185 54 / 16%);
        margin: 0;
        touch-action: pan-y;

        &__svg {
            display: block;
            width: 100%;
            height: auto;
            overflow: visible;
        }

        // #region [P] 星塵與光暈
        &__sky circle {
            fill: var(--op-star);
            opacity: .35;
        }
        &.is-motion &__sky circle { animation: op-bench-twinkle 6s ease-in-out infinite; }
        &__halo { opacity: .28; }

        // #endregion

        // #region [P] 白光
        &__white {
            outline: none;
            cursor: pointer;

            .hit {
                stroke: transparent;
                stroke-width: 26;
            }
            .soft {
                stroke: var(--op-beam);
                stroke-width: 10;
                opacity: .25;
            }
            .core { stroke-width: 3; }
            &:focus-visible .core { stroke-width: 5; }
        }

        // #endregion

        // #region [P] 分類的光
        &__ray {
            outline: none;
            cursor: pointer;

            .beam {
                transition: opacity .3s var(--cubic-FiSo);
                opacity: .55;
                fill: var(--hue);
            }
            .glow {
                transition: opacity .3s var(--cubic-FiSo);
                opacity: 0;
                fill: var(--hue);
            }
            text {
                fill: var(--vp-c-text-1);
                font-size: 15px;
                font-weight: 700;
                transition: opacity .3s var(--cubic-FiSo);
            }
            .count {
                fill: var(--vp-c-text-3);
                font-family: var(--vp-font-family-mono);
                font-size: 12px;
                font-weight: 500;
            }
            .latest {
                fill: var(--hue);
                font-size: 12px;
                font-weight: 500;
                opacity: 0;
            }
            &.is-focused,
            &.is-selected {
                .beam { opacity: 1; }
                .glow { opacity: .7; }
                .latest { opacity: 1; }
                .label { fill: var(--hue); }
            }
            &.is-muted {
                .beam { opacity: .18; }
                text:not(.latest) { opacity: .45; }
            }
            &:focus-visible .label { text-decoration: underline; }
        }

        // #endregion

        // #region [P] 玻璃 O
        &__orb {
            cursor: pointer;

            .ring {
                fill: none;
                stroke-width: 3;
            }
            .thick {
                fill: none;
                stroke-width: 18;
                opacity: .16;
            }
            .orbit {
                transform-origin: center;
                transform-box: fill-box;
                opacity: .25;
                fill: none;
                stroke: var(--op-star);
                stroke-dasharray: 2 9;
                stroke-width: 1;
            }
            .strand,
            .strand-glow {
                fill: none;
                stroke-linecap: round;
                transition: opacity .3s var(--cubic-FiSo);
            }
            .strand {
                stroke-width: 2.2;
                opacity: .95;
            }
            .strand-glow {
                stroke-width: 7;
                opacity: .35;
            }
            .is-muted { opacity: .15; }
            .ripple {
                transform-origin: center;
                transform-box: fill-box;
                opacity: 0;
                fill: none;
                stroke: var(--op-beam);
                stroke-width: 1.5;
            }
            .caustic {
                fill: var(--op-beam);
                opacity: .8;
            }
        }
        &.is-motion &__orb .orbit { animation: op-bench-orbit 60s linear infinite; }
        &.is-motion &__orb .ripple { animation: op-bench-ripple 2.4s ease-out infinite; }

        // #endregion

        figcaption {
            margin-top: .5rem;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            text-align: center;
        }
        @media (hover: none) {
            &__hint { display: none; }
        }

        // #region [P] 進場：光射進來（0～.7s）→ O 亮起來 → 一道道散開
        &.is-motion {
            .op-bench__white .core {
                stroke-dasharray: 1;
                animation: op-bench-draw .7s var(--cubic-FiSo) both;
            }
            .op-bench__white .soft,
            .op-bench__orb { animation: op-bench-fade .6s .5s var(--cubic-FiSo) both; }
            .op-bench__ray {
                transform-origin: var(--exit-x) var(--exit-y);
                animation: op-bench-burst .7s calc(.8s + var(--i) * .07s) var(--cubic-SiRo) both;
            }
            .op-bench__photons { animation: op-bench-fade .6s 1.3s both; }
        }

        // #endregion
    }

    html:not(.dark) .op-bench {
        --op-beam: #3A2A5C;
        --op-star: #7B61FF;
        --op-glass-core: rgb(255 255 255 / 60%);
        --op-glass-edge: rgb(189 52 254 / 6%);
        --op-glass-rim: rgb(244 185 54 / 22%);
    }
    @keyframes op-bench-twinkle {
        0%, 100% { opacity: .15; }
        50% { opacity: .6; }
    }
    @keyframes op-bench-orbit {
        to { transform: rotate(360deg); }
    }
    @keyframes op-bench-ripple {
        from {
            transform: scale(.2);
            opacity: .7;
        }
        to {
            transform: scale(4.5);
            opacity: 0;
        }
    }
    @keyframes op-bench-draw {
        from { stroke-dashoffset: 1; }
        to { stroke-dashoffset: 0; }
    }
    @keyframes op-bench-fade {
        from { opacity: 0; }
    }
    @keyframes op-bench-burst {
        from {
            transform: scale(.1);
            opacity: 0;
        }
    }
</style>
