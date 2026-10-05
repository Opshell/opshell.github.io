<script setup lang="ts">
    import type { ElementKey, Point, Ray } from '../prism';
    import { hueVar, SPECTRUM } from '@shared/utils/spectrum';
    import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { evolve, ribbon } from '../elements';
    import { aimFromPointer, along, END_X, exitsFor, LABEL_X, ORB, photonAt, rayPolygon, refract, SOURCE_X, SOURCE_Y, stars, VIEW } from '../prism';

    // 首頁的光學台（2026-10 翻新第二版）：白光（原初）射進玻璃 O，在裡面演化成六種元素的光絲，
    // 從 O 的右緣稍微分開的地方各自出去，成為各分類的光。
    // - 滑鼠上下是瞄準入射光；滑過一道光，標籤底下出現那類最新的一篇；點了篩底下的文章，點白光或 O 回到全部
    // - 進場（首頁開場動畫的一部分，intro 為 true 時）：光射進來、O 亮、裡面演化、一道道散開；左邊的字被吸進白光時白光亮一下
    // - 跟底下的文章卡片互相連動：滑過一道光，那一類的卡片亮（emit hover）；滑過一張卡片，那一道光亮（hint）
    //
    // 效能（2026-10-05，使用者：「一到首頁電腦風扇直接狂轉」）：會動的東西（星塵、漣漪、光絲、光點）全畫在一張 <canvas> 上，
    // 每秒 30 張、沒有模糊濾鏡；SVG 只放不動的東西（光暈、光束、玻璃、標籤、點的範圍），只在瞄準時重畫。
    // 捲出畫面、切到別的分頁就停；關閉動態時只畫一張靜止的。
    const { rays = [], selected = null, hint = null, intro = false } = defineProps<{ rays?: Ray[]; selected?: string | null; hint?: string | null; intro?: boolean }>();
    const emit = defineEmits<{ select: [key: string | null]; hover: [key: string | null] }>();

    const FRAME_MS = 1000 / 30;
    const TAU = Math.PI * 2;
    const sky = stars(70);

    // #region [P] 瞄準：只在滑鼠移動、光還在追的時候改 sourceY（SVG 跟著重畫），平常 SVG 完全不動
    const sourceY = ref<number>(SOURCE_Y.rest);
    const hovered = ref<string | null>(null);
    const motion = ref(false);
    const focus = computed(() => hovered.value ?? hint ?? selected);
    watch(hovered, key => emit('hover', key));
    const entry = computed(() => refract(sourceY.value).entry);
    const exits = computed(() => exitsFor(sourceY.value, rays.length));
    let target: number | null = null;
    let current: number = SOURCE_Y.rest;

    function aim(event: PointerEvent) {
        if (!motion.value || event.pointerType === 'touch') return;
        const rect = (event.currentTarget as Element).getBoundingClientRect();
        target = aimFromPointer((event.clientY - rect.top) / rect.height);
    }
    // #endregion

    // #region [P] 畫布
    const rootRef = ref<HTMLElement>();
    const stageRef = ref<HTMLElement>();
    const canvasRef = ref<HTMLCanvasElement>();
    let ctx: CanvasRenderingContext2D | null = null;
    let scale = 1;
    let dpr = 1;
    let colors: Record<string, string> = {};

    /** 畫布不認 CSS 變數：從元素上讀出實際的顏色（切換深淺色時再讀一次） */
    function readColors() {
        const style = getComputedStyle(rootRef.value!);
        const read = (name: string) => style.getPropertyValue(name).trim();
        colors = Object.fromEntries(SPECTRUM.map(hue => [hue, read(`--pr-${hue}`)]));
        colors.beam = read('--op-beam');
        colors.star = read('--op-star');
    }

    function resize() {
        const stage = stageRef.value;
        const canvas = canvasRef.value;
        if (!stage || !canvas) return;
        const { width, height } = stage.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        scale = width / VIEW.width;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        draw(time);
    }

    /** 每種元素的亮度、外面那層光有多寬（乘在帶子的粗細上） */
    const STYLE: Record<ElementKey, { alpha: number; glow: number }> = {
        metal: { alpha: 0.95, glow: 2.4 },
        earth: { alpha: 0.85, glow: 2 },
        fire: { alpha: 0.9, glow: 2.8 },
        wood: { alpha: 0.9, glow: 2.4 },
        wind: { alpha: 0.55, glow: 3 },
        water: { alpha: 0.9, glow: 2.6 }
    };

    /** 一條帶子（每點粗細不同）填色 */
    function fillRibbon(points: readonly Point[], widths: readonly number[], widen = 1) {
        const outline = ribbon(points, widths, widen);
        ctx!.beginPath();
        ctx!.moveTo(outline[0].x, outline[0].y);
        for (let i = 1; i < outline.length; i++) ctx!.lineTo(outline[i].x, outline[i].y);
        ctx!.closePath();
        ctx!.fill();
    }

    function polyline(points: readonly Point[]) {
        ctx!.beginPath();
        ctx!.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx!.lineTo(points[i].x, points[i].y);
    }
    function dot(x: number, y: number, r: number) {
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, TAU);
        ctx!.fill();
    }

    function draw(now: number) {
        const c = ctx;
        if (!c) return;
        c.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
        c.clearRect(0, 0, VIEW.width, VIEW.height);
        const en = entry.value;
        const ex = exits.value;
        const lit = focus.value;

        // 星塵：慢慢地一閃一閃
        c.fillStyle = colors.star;
        for (const star of sky) {
            c.globalAlpha = 0.1 + 0.4 * (0.5 + 0.5 * Math.sin(now * 1.05 + star.delay * 1.7));
            dot(star.x, star.y, star.r);
        }

        // O 裡面：入口的漣漪與光絲，裁在玻璃圓裡
        c.save();
        c.beginPath();
        c.arc(ORB.cx, ORB.cy, ORB.r - 3, 0, TAU);
        c.clip();
        c.strokeStyle = colors.beam;
        c.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
            const p = (now / 2.4 + k / 3) % 1;
            c.globalAlpha = (1 - p) * 0.55;
            c.beginPath();
            c.arc(en.x, en.y, 3 + p * 62, 0, TAU);
            c.stroke();
        }
        // 光絲：元素之間會互相影響，一次算全部（elements.ts）
        const strands = evolve(rays.map(ray => ray.element.key), en, ex, rays.map(ray => ({ x: END_X, y: ray.y })), now);
        strands.forEach((strand, index) => {
            const ray = rays[index];
            const hue = colors[ray.hue];
            const gradient = c.createLinearGradient(en.x, en.y, ex[index].x, ex[index].y);
            gradient.addColorStop(0, colors.beam);
            gradient.addColorStop(0.4, hue);
            gradient.addColorStop(1, hue);
            const style = STYLE[strand.element];
            const dim = lit && lit !== ray.key ? 0.18 : 1;
            // 火會閃
            const flicker = strand.element === 'fire' ? 0.7 + 0.3 * Math.sin(now * 13 + index) : 1;
            c.fillStyle = gradient;
            // 木：先畫鹼基對，再畫兩股
            if (strand.rungs.length) {
                c.strokeStyle = hue;
                c.lineWidth = 0.8;
                for (const rung of strand.rungs) {
                    c.globalAlpha = (0.12 + 0.45 * rung.depth) * dim;
                    c.beginPath();
                    c.moveTo(rung.a.x, rung.a.y);
                    c.lineTo(rung.b.x, rung.b.y);
                    c.stroke();
                }
            }
            for (const thread of strand.threads) {
                c.globalAlpha = 0.2 * dim * flicker;
                fillRibbon(thread.points, thread.widths, style.glow);
                c.globalAlpha = style.alpha * dim * flicker;
                fillRibbon(thread.points, thread.widths);
            }
            // 金：刀刃中間一條白色高光、反射點閃一下
            if (strand.element === 'metal') {
                c.strokeStyle = colors.beam;
                c.lineWidth = 0.6;
                c.globalAlpha = 0.85 * dim;
                polyline(strand.threads[0].points);
                c.stroke();
                c.fillStyle = colors.beam;
                strand.glints.forEach((glint, k) => {
                    const flash = Math.max(0, Math.sin(now * 2.2 + k * 1.6));
                    c.globalAlpha = flash * 0.9 * dim;
                    dot(glint.x, glint.y, 1.5 + flash * 2.5);
                });
            }
        });
        // O 裡的光點：沿著光絲走，比外面快
        strands.forEach((strand, index) => {
            const ray = rays[index];
            c.fillStyle = colors[ray.hue];
            const dim = lit && lit !== ray.key ? 0.3 : 1;
            for (let i = 0; i < 2; i++) {
                const t = (i / 2 + index * 0.21 + now * 0.45) % 1;
                const p = along(strand.threads[0].points, t);
                c.globalAlpha = Math.sin(Math.PI * t) * dim;
                dot(p.x, p.y, 1.4);
            }
        });
        c.restore();

        // 光上的光點：往外流，文章越多越熱鬧
        rays.forEach((ray, index) => {
            c.fillStyle = colors[ray.hue];
            const dim = lit && lit !== ray.key ? 0.25 : 1;
            for (let i = 0; i < ray.photons; i++) {
                const phase = (i / ray.photons + index * 0.137) % 1;
                const t = (phase + now * (0.16 + 0.02 * (i % 3))) % 1;
                const p = photonAt(ex[index], ray, t, Math.sin((i + 1) * 2.4 + index) * 0.9);
                c.globalAlpha = Math.sin(Math.PI * t) * dim;
                dot(p.x, p.y, 1.6 + (i % 2) * 0.8);
            }
        });
        // 入射光上的光點
        c.fillStyle = colors.beam;
        for (let i = 0; i < 5; i++) {
            const t = (i / 5 + now * 0.22) % 1;
            c.globalAlpha = Math.sin(Math.PI * t) * 0.9;
            dot(SOURCE_X + (en.x - SOURCE_X) * t, sourceY.value + (en.y - sourceY.value) * t, 1.8);
        }
        c.globalAlpha = 1;
    }
    // #endregion

    // #region [P] 動畫迴圈：每秒 30 張；看不到就停
    let time = 2; // 關閉動態時畫這一刻：光絲已經彎好
    let frame = 0;
    let lastFrame = 0;
    let lastDraw = 0;
    let visible = true;
    let observer: IntersectionObserver | undefined;
    let resizer: ResizeObserver | undefined;
    let theme: MutationObserver | undefined;

    function tick(now: number) {
        frame = requestAnimationFrame(tick);
        const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
        lastFrame = now;
        time += dt;
        const goal = target ?? SOURCE_Y.rest;
        if (Math.abs(goal - current) > 0.3) {
            current += (goal - current) * Math.min(1, dt * 5);
            sourceY.value = Math.round(current * 10) / 10;
        }
        if (now - lastDraw < FRAME_MS) return;
        lastDraw = now;
        draw(time);
    }
    function start() {
        if (!motion.value || frame || !visible || document.hidden) return;
        lastFrame = 0;
        frame = requestAnimationFrame(tick);
    }
    function stop() {
        cancelAnimationFrame(frame);
        frame = 0;
    }
    const onVisibility = () => (document.hidden ? stop() : start());

    onMounted(() => {
        motion.value = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
        ctx = canvasRef.value!.getContext('2d');
        readColors();
        resizer = new ResizeObserver(resize);
        resizer.observe(stageRef.value!);
        theme = new MutationObserver(() => {
            readColors();
            draw(time);
        });
        theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        if (!motion.value) return;
        observer = new IntersectionObserver(([found]) => {
            visible = found.isIntersecting;
            visible ? start() : stop();
        });
        observer.observe(rootRef.value!);
        document.addEventListener('visibilitychange', onVisibility);
        start();
    });
    onBeforeUnmount(() => {
        stop();
        observer?.disconnect();
        resizer?.disconnect();
        theme?.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
    });
    // 關閉動態時沒有迴圈：滑過、選了一道光要自己重畫一次
    watch(focus, () => !frame && draw(time));
    // #endregion

    function toggle(key: string) {
        emit('select', selected === key ? null : key);
    }
    const shorten = (text: string, max = 14) => ([...text].length > max ? `${[...text].slice(0, max).join('')}…` : text);
</script>

<template>
    <figure ref="rootRef" class="op-bench" :class="{ 'is-motion': motion, 'is-intro': intro }" @pointermove="aim" @pointerleave="target = null">
        <div ref="stageRef" class="op-bench__stage">
            <svg
                class="op-bench__svg"
                :viewBox="`0 0 ${VIEW.width} ${VIEW.height}`"
                role="group"
                aria-labelledby="op-bench-caption"
                :style="{ '--exit-x': `${exits[Math.floor(exits.length / 2)]?.x ?? ORB.cx}px`, '--exit-y': `${exits[Math.floor(exits.length / 2)]?.y ?? ORB.cy}px` }"
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
                    <linearGradient id="op-bench-beam" gradientUnits="userSpaceOnUse" :x1="SOURCE_X" :y1="sourceY" :x2="entry.x" :y2="entry.y">
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

                <circle class="op-bench__halo" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r" fill="url(#op-bench-ring)" filter="url(#op-bench-halo)" aria-hidden="true" />

                <!-- 白光（原初）：回到全部。線很細，另外疊一條透明的粗線當按的範圍 -->
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
                    <line class="hit" :x1="SOURCE_X" :y1="sourceY" :x2="entry.x" :y2="entry.y" />
                    <line class="soft" :x1="SOURCE_X" :y1="sourceY" :x2="entry.x" :y2="entry.y" />
                    <line class="core" :x1="SOURCE_X" :y1="sourceY" :x2="entry.x" :y2="entry.y" stroke="url(#op-bench-beam)" pathLength="1" />
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
                    <!-- 模糊的光暈只在滑過、選了的時候才放：模糊濾鏡很貴 -->
                    <polygon v-if="focus === ray.key" class="glow" :points="rayPolygon(exits[index], ray)" filter="url(#op-bench-blur)" />
                    <polygon class="beam" :points="rayPolygon(exits[index], ray)" />
                    <text :x="LABEL_X" :y="ray.y" dominant-baseline="central" aria-hidden="true">
                        <tspan class="label">{{ ray.label }}</tspan>
                        <tspan class="count" dx="10">{{ ray.count }}</tspan>
                    </text>
                    <text class="latest" :x="LABEL_X" :y="ray.y + 20" dominant-baseline="central" aria-hidden="true">最新：{{ shorten(ray.latest.title) }}</text>
                </g>

                <!-- 玻璃 O：厚度是一圈淡淡的寬環，外緣是品牌漸層。裡面的光絲畫在畫布上 -->
                <g class="op-bench__orb" aria-hidden="true" @click="emit('select', null)">
                    <circle class="body" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r" fill="url(#op-bench-glass)" />
                    <circle class="orbit" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r * 0.68" />
                    <circle class="thick" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r - 9" stroke="url(#op-bench-ring)" />
                    <circle class="ring" :cx="ORB.cx" :cy="ORB.cy" :r="ORB.r" stroke="url(#op-bench-ring)" />
                </g>
            </svg>
            <canvas ref="canvasRef" class="op-bench__canvas" aria-hidden="true" />
        </div>
        <figcaption id="op-bench-caption">
            白光是原初，在 O 裡演化，散成這裡寫的每一類。光越寬文章越多；<span class="op-bench__hint">移動滑鼠瞄準入射光，</span>點一道光看那一類。
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

        &__stage { position: relative; }
        &__svg {
            display: block;
            width: 100%;
            height: auto;
            overflow: visible;
        }

        // 畫布疊在 SVG 上、跟它一樣大；不吃滑鼠，點的範圍都在 SVG
        &__canvas {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
        &__halo { opacity: .28; }

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
                stroke-width: 9;
                opacity: .12;
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
                fill: var(--hue);
                transition: opacity .3s var(--cubic-FiSo);
                opacity: .55;
            }
            .glow {
                fill: var(--hue);
                opacity: .7;
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
                fill: none;
                stroke: var(--op-star);
                stroke-dasharray: 2 9;
                stroke-width: 1;
                opacity: .2;
            }
        }

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

        // #region [P] 進場（跟首頁的開場動畫對時間）：光射進來 → O 亮 → 裡面演化 → 一道道散開 → 3s 左右左邊的字被吸進白光，白光亮一下
        // 用媒體查詢而不是 JS 加的 class：首頁一畫出來就開始，不等 JS 接手（不然會先閃一下定格的版面）
        @media (prefers-reduced-motion: no-preference) {
            &.is-intro {
                .op-bench__white .core {
                    stroke-dasharray: 1;
                    animation: op-bench-draw .8s .2s var(--cubic-FiSo) both;
                }
                .op-bench__white .soft { animation: op-bench-fade .6s .7s var(--cubic-FiSo) both, op-bench-flare 1.1s 3s var(--cubic-FiSo); }
                .op-bench__orb { animation: op-bench-fade .7s .7s var(--cubic-FiSo) both; }
                .op-bench__canvas { animation: op-bench-fade 1s .9s both; }
                .op-bench__ray {
                    transform-origin: var(--exit-x) var(--exit-y);
                    animation: op-bench-burst .8s calc(1.8s + var(--i) * .09s) var(--cubic-SiRo) both;
                }
                figcaption { animation: op-bench-fade .6s 2.6s both; }
            }
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
    @keyframes op-bench-draw {
        from { stroke-dashoffset: 1; }
        to { stroke-dashoffset: 0; }
    }
    @keyframes op-bench-fade {
        from { opacity: 0; }
    }
    @keyframes op-bench-flare {
        30% {
            stroke-width: 22;
            opacity: .45;
        }
    }
    @keyframes op-bench-burst {
        from {
            transform: scale(.1);
            opacity: 0;
        }
    }
</style>
