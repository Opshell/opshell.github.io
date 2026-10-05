<script setup lang="ts">
    import type { ElementKey, Point, Ray } from '../prism';
    import type { StageLayout } from '../stage';
    import { SPECTRUM } from '@shared/utils/spectrum';
    import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { evolve, ribbon } from '../elements';
    import { easeOut, INTRO, phase } from '../intro';
    import { aimFromPointer, along, ORB, SOURCE_Y, stars } from '../prism';
    import { hitRay, landingHalf, lightPath, localMatrix } from '../stage';

    // 首頁的光（2026-10-06 第三版）：一張蓋在首頁上半部的畫布，光從畫面最上面射進玻璃 O，在裡面演化成元素的光絲，
    // 從 O 的下緣分開出去，一道道落在文章區塊的分隔線上、每一類的標籤正上方。幾何在 stage.ts，O 裡的演化在 elements.ts。
    // - 位置量 DOM：O（.op-home__orb）、標籤（.op-home__label）、分隔線（.op-home__divider），版面一變就重量
    // - 畫布不吃滑鼠（底下的大卡、連結照常點得到）：滑鼠移動時自己算有沒有在一道光上，有的話游標變手指、點了選那一類
    // - 滑鼠左右是瞄準：光從天上斜進來的角度跟著變，出口、光跟著轉
    // - 開場時（introAt 有值）照 intro.ts 的時間軸：光從天上落下 → O 裡亮起 → 一道道往下長到分隔線
    // 效能：每秒 30 張、沒有模糊濾鏡；捲出畫面、切到別的分頁就停；關閉動態時只畫一張。
    const { rays = [], focus = null, introAt = null } = defineProps<{
        rays?: Ray[];
        focus?: string | null;
        introAt?: number | null;
    }>();
    const emit = defineEmits<{ hover: [key: string | null]; select: [key: string] }>();

    const FRAME_MS = 1000 / 30;
    const TAU = Math.PI * 2;
    const canvasRef = ref<HTMLCanvasElement>();
    /** 首頁的最外層（畫布的父元素）：量位置、聽滑鼠都在它身上 */
    let root: HTMLElement | undefined;
    let ctx: CanvasRenderingContext2D | null = null;
    let dpr = 1;
    let width = 0;
    let height = 0;
    let layout: StageLayout | null = null;
    let colors: Record<string, string> = {};
    let sky: ReturnType<typeof stars> = [];
    const motion = ref(false);

    // #region [P] 量版面
    function measure() {
        const canvas = canvasRef.value;
        if (!root || !canvas) return;
        const base = root.getBoundingClientRect();
        const orb = root.querySelector('.op-home__orb')?.getBoundingClientRect();
        const divider = root.querySelector('.op-home__divider')?.getBoundingClientRect();
        const labels = [...root.querySelectorAll('.op-home__label')].map(label => label.getBoundingClientRect());
        if (!orb || !divider || labels.length !== rays.length) return;
        const line = divider.top + divider.height / 2 - base.top;
        layout = {
            // 玻璃的圈在 240 的方格裡半徑 112（HomeContents 的 SVG）
            orb: { x: orb.left + orb.width / 2 - base.left, y: orb.top + orb.height / 2 - base.top, r: orb.width * 112 / 240 },
            landings: labels.map(label => ({ x: label.left + label.width / 2 - base.left, y: line }))
        };
        width = base.width;
        height = line + 40;
        dpr = Math.min(window.devicePixelRatio || 1, 1.5); // 畫布很大：解析度上限比之前低一點
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        sky = stars(60, width, Math.max(1, line - 40));
        draw(performance.now());
    }

    /** 畫布不認 CSS 變數：從元素上讀出實際的顏色（切換深淺色時再讀一次） */
    function readColors() {
        if (!root) return;
        const style = getComputedStyle(root);
        const read = (name: string) => style.getPropertyValue(name).trim();
        colors = Object.fromEntries(SPECTRUM.map(hue => [hue, read(`--pr-${hue}`)]));
        colors.beam = read('--op-beam');
        colors.star = read('--op-star');
    }
    // #endregion

    // #region [P] 畫
    /** 每種元素的亮度、外面那層光有多寬（乘在帶子的粗細上） */
    const STYLE: Record<ElementKey, { alpha: number; glow: number }> = {
        metal: { alpha: 0.95, glow: 2.4 },
        earth: { alpha: 0.85, glow: 2 },
        fire: { alpha: 0.9, glow: 2.8 },
        wood: { alpha: 0.9, glow: 2.4 },
        wind: { alpha: 0.55, glow: 3 },
        water: { alpha: 0.9, glow: 2.6 }
    };

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
    /** 同一個顏色、完全透明：漸層淡到 'transparent'（透明黑）中間會發灰，淺色模式特別明顯 */
    function clear(color: string): string {
        const hex = /^#([\da-f]{6})$/i.exec(color)?.[1];
        if (!hex) return 'transparent';
        const n = Number.parseInt(hex, 16);
        return `rgb(${n >> 16} ${(n >> 8) & 255} ${n & 255} / 0)`;
    }
    const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

    let sourceY: number = SOURCE_Y.rest;
    let time = 2; // 光絲的動畫時間（秒）；關閉動態時畫這一刻
    let path: ReturnType<typeof lightPath> | null = null;

    function draw(now: number) {
        const c = ctx;
        if (!c || !layout) return;
        path = lightPath(layout, sourceY);
        const { sky: top, entry, exits, localEntry, localExits, localEnds } = path;
        const beamP = easeOut(phase(introAt, now, INTRO.beam, 500));
        const innerP = phase(introAt, now, INTRO.inner, 600);
        const rayP = easeOut(phase(introAt, now, INTRO.rays, 700));
        const glowP = phase(introAt, now, INTRO.aurora - 200, 500);
        const t = time;

        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, width, height);

        // 星塵
        c.fillStyle = colors.star;
        for (const star of sky) {
            c.globalAlpha = 0.08 + 0.32 * (0.5 + 0.5 * Math.sin(t * 1.05 + star.delay * 1.7));
            dot(star.x, star.y, star.r);
        }

        // 天上來的白光：先一條寬而淡的，再一條細而亮的；光點往下流
        const reach = lerp(top, entry, beamP);
        const beam = c.createLinearGradient(top.x, top.y, entry.x, entry.y);
        beam.addColorStop(0, clear(colors.beam));
        beam.addColorStop(0.45, colors.beam);
        beam.addColorStop(1, colors.beam);
        c.strokeStyle = beam;
        c.lineCap = 'round';
        for (const [lineWidth, alpha] of [[12, 0.1], [2.5, 0.95]]) {
            c.globalAlpha = alpha;
            c.lineWidth = lineWidth;
            c.beginPath();
            c.moveTo(top.x, top.y);
            c.lineTo(reach.x, reach.y);
            c.stroke();
        }
        if (beamP >= 1) {
            c.fillStyle = colors.beam;
            for (let i = 0; i < 6; i++) {
                const k = (i / 6 + t * 0.2) % 1;
                const p = lerp(top, entry, 0.3 + 0.7 * k);
                c.globalAlpha = Math.sin(Math.PI * k) * 0.9;
                dot(p.x, p.y, 1.8);
            }
        }

        // O 裡面：用 O 的座標畫（x、y 對調的矩陣），裁在玻璃圓裡
        if (innerP > 0) {
            const [a, b, cc, d, e, f] = localMatrix(layout);
            c.save();
            c.setTransform(a * dpr, b * dpr, cc * dpr, d * dpr, e * dpr, f * dpr);
            c.beginPath();
            c.arc(ORB.cx, ORB.cy, ORB.r - 3, 0, TAU);
            c.clip();
            c.strokeStyle = colors.beam;
            c.lineWidth = 1.5;
            for (let k = 0; k < 3; k++) {
                const p = (t / 2.4 + k / 3) % 1;
                c.globalAlpha = (1 - p) * 0.55 * innerP;
                c.beginPath();
                c.arc(localEntry.x, localEntry.y, 3 + p * 62, 0, TAU);
                c.stroke();
            }
            const strands = evolve(rays.map(ray => ray.element.key), localEntry, localExits, localEnds, t);
            strands.forEach((strand, index) => {
                const ray = rays[index];
                const hue = colors[ray.hue];
                const gradient = c.createLinearGradient(localEntry.x, localEntry.y, localExits[index].x, localExits[index].y);
                gradient.addColorStop(0, colors.beam);
                gradient.addColorStop(0.4, hue);
                gradient.addColorStop(1, hue);
                const style = STYLE[strand.element];
                const dim = (focus && focus !== ray.key ? 0.18 : 1) * innerP;
                const flicker = strand.element === 'fire' ? 0.7 + 0.3 * Math.sin(t * 13 + index) : 1;
                c.fillStyle = gradient;
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
                if (strand.element === 'metal') {
                    c.strokeStyle = colors.beam;
                    c.lineWidth = 0.6;
                    c.globalAlpha = 0.85 * dim;
                    polyline(strand.threads[0].points);
                    c.stroke();
                    c.fillStyle = colors.beam;
                    strand.glints.forEach((glint, k) => {
                        const flash = Math.max(0, Math.sin(t * 2.2 + k * 1.6));
                        c.globalAlpha = flash * 0.9 * dim;
                        dot(glint.x, glint.y, 1.5 + flash * 2.5);
                    });
                }
                c.fillStyle = hue;
                for (let i = 0; i < 2; i++) {
                    const k = (i / 2 + index * 0.21 + t * 0.45) % 1;
                    const p = along(strand.threads[0].points, k);
                    c.globalAlpha = Math.sin(Math.PI * k) * dim;
                    dot(p.x, p.y, 1.4);
                }
            });
            c.restore();
        }

        // 一道道光：從出口往下長到分隔線，落地的地方亮一圈
        if (rayP > 0) {
            rays.forEach((ray, index) => {
                const exit = exits[index];
                const landing = layout!.landings[index];
                const tip = lerp(exit, landing, rayP);
                const half = landingHalf(ray.spread) * rayP;
                const hue = colors[ray.hue];
                const lit = focus === ray.key;
                const dim = focus && !lit ? 0.25 : 1;
                const gradient = c.createLinearGradient(exit.x, exit.y, tip.x, tip.y);
                gradient.addColorStop(0, hue);
                gradient.addColorStop(1, clear(hue));
                c.fillStyle = gradient;
                const wedge = (spread: number) => {
                    c.beginPath();
                    c.moveTo(exit.x - 1, exit.y);
                    c.lineTo(tip.x - spread, tip.y);
                    c.lineTo(tip.x + spread, tip.y);
                    c.lineTo(exit.x + 1, exit.y);
                    c.closePath();
                    c.fill();
                };
                c.globalAlpha = 0.16 * dim;
                wedge(half * 2.2);
                c.globalAlpha = (lit ? 0.95 : 0.6) * dim;
                wedge(half);
                if (rayP < 1) return;
                // 光點往下流，文章越多越熱鬧
                c.fillStyle = hue;
                for (let i = 0; i < ray.photons; i++) {
                    const k = (i / ray.photons + index * 0.137 + t * (0.16 + 0.02 * (i % 3))) % 1;
                    const lane = Math.sin((i + 1) * 2.4 + index) * 0.8;
                    const p = lerp(exit, landing, k);
                    c.globalAlpha = Math.sin(Math.PI * k) * dim;
                    dot(p.x + lane * half * k, p.y, 1.5 + (i % 2) * 0.7);
                }
                // 落地：分隔線上一團光，慢慢呼吸
                if (glowP > 0) {
                    const pulse = 0.75 + 0.25 * Math.sin(t * 2 + index);
                    const radius = half * 2 + 16;
                    const glow = c.createRadialGradient(landing.x, landing.y, 0, landing.x, landing.y, radius);
                    glow.addColorStop(0, hue);
                    glow.addColorStop(1, clear(hue));
                    c.fillStyle = glow;
                    c.globalAlpha = (lit ? 0.9 : 0.5) * pulse * glowP * dim;
                    c.beginPath();
                    c.ellipse(landing.x, landing.y, radius, radius * 0.35, 0, 0, TAU);
                    c.fill();
                }
            });
        }
        c.globalAlpha = 1;
    }
    // #endregion

    // #region [P] 滑鼠：瞄準、在哪一道光上（畫布不吃滑鼠，自己算）
    let pointer: Point | null = null;
    let target: number | null = null;
    let current: number = SOURCE_Y.rest;
    let rayHover: string | null = null;

    function onMove(event: PointerEvent) {
        if (!root) return;
        const base = root.getBoundingClientRect();
        const interactive = (event.target as Element).closest('a, button, [role="button"], input');
        pointer = interactive ? null : { x: event.clientX - base.left, y: event.clientY - base.top };
        if (motion.value && event.pointerType === 'mouse') target = aimFromPointer((event.clientX - base.left) / base.width);
        if (!frame) updateHover();
    }
    function onLeave() {
        pointer = null;
        target = null;
        updateHover();
    }
    function updateHover() {
        let found: string | null = null;
        if (pointer && path && layout) {
            for (let i = rays.length - 1; i >= 0; i--) {
                if (hitRay(pointer, path.exits[i], layout.landings[i], landingHalf(rays[i].spread))) {
                    found = rays[i].key;
                    break;
                }
            }
        }
        if (found === rayHover) return;
        rayHover = found;
        root?.classList.toggle('is-on-ray', !!found);
        emit('hover', found);
    }
    function onClick(event: MouseEvent) {
        if (!rayHover || (event.target as Element).closest('a, button, [role="button"], input')) return;
        emit('select', rayHover);
    }
    // #endregion

    // #region [P] 動畫迴圈：每秒 30 張；看不到就停
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
        if (Math.abs(goal - current) > 0.3) current += (goal - current) * Math.min(1, dt * 4);
        sourceY = current;
        if (now - lastDraw < FRAME_MS) return;
        lastDraw = now;
        draw(now);
        updateHover();
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
        root = canvasRef.value!.parentElement!;
        ctx = canvasRef.value!.getContext('2d');
        readColors();
        resizer = new ResizeObserver(() => measure());
        resizer.observe(root);
        theme = new MutationObserver(() => {
            readColors();
            draw(performance.now());
        });
        theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        root.addEventListener('pointermove', onMove);
        root.addEventListener('pointerleave', onLeave);
        root.addEventListener('click', onClick);
        // 字型載入完版面可能會動
        document.fonts?.ready.then(measure);
        measure();
        if (!motion.value) return;
        observer = new IntersectionObserver(([found]) => {
            visible = found.isIntersecting;
            visible ? start() : stop();
        });
        observer.observe(canvasRef.value!);
        document.addEventListener('visibilitychange', onVisibility);
        start();
    });
    onBeforeUnmount(() => {
        stop();
        observer?.disconnect();
        resizer?.disconnect();
        theme?.disconnect();
        root?.removeEventListener('pointermove', onMove);
        root?.removeEventListener('pointerleave', onLeave);
        root?.removeEventListener('click', onClick);
        root?.classList.remove('is-on-ray');
        document.removeEventListener('visibilitychange', onVisibility);
    });
    // 分類變了（標籤數量不同）要重量；關閉動態時沒有迴圈，滑過、選了要自己重畫
    watch(() => rays.length, () => nextTick(measure));
    watch(() => focus, () => !frame && draw(performance.now()));
    // #endregion
</script>

<template>
    <canvas ref="canvasRef" class="op-light" aria-hidden="true" />
</template>

<style lang="scss">
    .op-light {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 0;
    }
</style>
