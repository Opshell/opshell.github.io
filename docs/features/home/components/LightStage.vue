<script setup lang="ts">
    import type { ElementKey, Point, Ray } from '../prism';
    import type { StageLayout } from '../stage';
    import { SPECTRUM } from '@shared/utils/spectrum';
    import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { evolve, ribbon } from '../elements';
    import { easeOut, INTRO, phase } from '../intro';
    import { ORB, stars } from '../prism';
    import { hitRay, landingHalf, lightPath, localMatrix } from '../stage';

    // 首頁的光（2026-10-06 第三版）：一張蓋在首頁上半部的畫布，光從畫面最上面射進玻璃 O，在裡面演化成元素的光絲，
    // 從 O 的下緣分開出去，一道道落在文章區塊的分隔線上、每一類的標籤正上方。幾何在 stage.ts，O 裡的演化在 elements.ts。
    // - 位置量 DOM：O（.op-home__orb）、標籤（.op-home__label）、分隔線（.op-home__divider），版面一變就重量
    // - 畫布不吃滑鼠（底下的大卡、連結照常點得到）：滑鼠移動時自己算有沒有在一道光上，有的話游標變手指、點了選那一類
    // - 白光垂直從上面射下來，不跟著滑鼠（2026-10-06，使用者：「從上至下 90 度、不用隨滑鼠變化，光束感強烈一點」）
    // - 開場時（introAt 有值）照 intro.ts 的時間軸：光從天上落下 → O 裡亮起 → 一道道往下長到分隔線
    // 效能（2026-10-06 第二輪，使用者：「太吃效能，電腦要燒起來了」）：原本一張蓋住上半頁的畫布（Retina 上 2900×1800）每秒重畫 30 次。改成——
    // - 白光是 HomeContents 裡的一個元素（CSS 漸層，往下衝的亮光只動 transform，交給合成器）
    // - 星塵與一道道光畫在「靜的」畫布，只在版面、滑過／選了、深淺色改變（與開場光往下長的那一秒）時重畫
    // - 只有 O 裡的光絲與光上流動的光點畫在「動的」畫布，大小只框住 O 到分類那一塊，每秒 20 張
    // 捲出畫面、切到別的分頁就停；關閉動態時只畫一張。
    const { rays = [], focus = null, introAt = null } = defineProps<{
        rays?: Ray[];
        focus?: string | null;
        introAt?: number | null;
    }>();
    const emit = defineEmits<{ hover: [key: string | null]; select: [key: string] }>();

    const FRAME_MS = 1000 / 20;
    const TAU = Math.PI * 2;
    const stillRef = ref<HTMLCanvasElement>();
    const liveRef = ref<HTMLCanvasElement>();
    /** 首頁的最外層（畫布的父元素）：量位置、聽滑鼠都在它身上 */
    let root: HTMLElement | undefined;
    let still: CanvasRenderingContext2D | null = null;
    let live: CanvasRenderingContext2D | null = null;
    /** 現在畫在哪一張（下面的小工具共用） */
    let ctx: CanvasRenderingContext2D | null = null;
    let stillDpr = 1;
    let liveDpr = 1;
    let width = 0;
    let height = 0;
    /** 動的畫布框住的範圍（相對於首頁最外層） */
    const box = { x: 0, y: 0, width: 0, height: 0 };
    let layout: StageLayout | null = null;
    let colors: Record<string, string> = {};
    let sky: ReturnType<typeof stars> = [];
    const motion = ref(false);

    // #region [P] 量版面
    function measure() {
        const canvas = stillRef.value;
        const liveCanvas = liveRef.value;
        if (!root || !canvas || !liveCanvas) return;
        const base = root.getBoundingClientRect();
        const orbEl = root.querySelector<HTMLElement>('.op-home__orb');
        const orb = orbEl?.getBoundingClientRect();
        const divider = root.querySelector('.op-home__divider')?.getBoundingClientRect();
        const labels = [...root.querySelectorAll('.op-home__label')].map(label => label.getBoundingClientRect());
        if (!orbEl || !orb || !divider || labels.length !== rays.length) return;
        const line = divider.top + divider.height / 2 - base.top;
        layout = {
            // 玻璃的圈在 240 的方格裡半徑 112（HomeContents 的 SVG）。
            // 大小用 offsetWidth：開場時 O 正在從小綻開（transform: scale），getBoundingClientRect 量到的是縮小後的；中心不受縮放影響
            orb: { x: orb.left + orb.width / 2 - base.left, y: orb.top + orb.height / 2 - base.top, r: orbEl.offsetWidth * 112 / 240 },
            landings: labels.map(label => ({ x: label.left + label.width / 2 - base.left, y: line }))
        };
        width = base.width;
        height = line + 10;
        stillDpr = Math.min(window.devicePixelRatio || 1, 2);
        size(canvas, stillDpr, { x: 0, y: 0, width, height });
        // 動的那張只框住 O 與一道道光（到分類為止）
        const { orb: o, landings } = layout;
        const xs = [...landings.map(p => p.x), o.x - o.r, o.x + o.r];
        box.x = Math.max(0, Math.min(...xs) - 30);
        box.y = Math.max(0, o.y - o.r - 8);
        box.width = Math.min(width, Math.max(...xs) + 30) - box.x;
        box.height = line + 6 - box.y;
        liveDpr = Math.min(window.devicePixelRatio || 1, 1.5);
        size(liveCanvas, liveDpr, box);
        sky = stars(50, width, Math.max(1, line - 40));
        gradients = [];
        const now = performance.now();
        drawStill(now);
        drawLive(now);
    }
    function size(canvas: HTMLCanvasElement, dpr: number, area: { x: number; y: number; width: number; height: number }) {
        canvas.width = Math.round(area.width * dpr);
        canvas.height = Math.round(area.height * dpr);
        canvas.style.left = `${area.x}px`;
        canvas.style.top = `${area.y}px`;
        canvas.style.width = `${area.width}px`;
        canvas.style.height = `${area.height}px`;
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
    /** 每種元素的亮度。外面那層寬而淡的光拿掉了（每格多畫一倍的面積），只留木前面那股（立體感靠它） */
    const ALPHA: Record<ElementKey, number> = { metal: 0.95, earth: 0.85, fire: 0.9, wood: 0.9, wind: 0.6, water: 0.9 };

    /** 光絲的漸層（入口的白 → 那一類的顏色）：光不會動了（垂直、不跟滑鼠），量版面或換深淺色時才重做 */
    let gradients: CanvasGradient[] = [];
    function strandGradients(c: CanvasRenderingContext2D, entry: Point, exits: readonly Point[]): CanvasGradient[] {
        if (gradients.length === rays.length) return gradients;
        gradients = rays.map((ray, index) => {
            const gradient = c.createLinearGradient(entry.x, entry.y, exits[index].x, exits[index].y);
            gradient.addColorStop(0, colors.beam);
            gradient.addColorStop(0.4, colors[ray.hue]);
            gradient.addColorStop(1, colors[ray.hue]);
            return gradient;
        });
        return gradients;
    }

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

    /** 一段一段：depth 符合條件的連續區間（頭尾多帶一點，接得起來） */
    function runs(depths: readonly number[], front: boolean): [number, number][] {
        const result: [number, number][] = [];
        let start = -1;
        depths.forEach((depth, i) => {
            const inside = front ? depth >= 0.5 : depth < 0.5;
            if (inside && start < 0) start = Math.max(0, i - 1);
            if (!inside && start >= 0) {
                result.push([start, i]);
                start = -1;
            }
        });
        if (start >= 0) result.push([start, depths.length - 1]);
        return result;
    }

    /**
     * 木的雙螺旋要有立體感（使用者：「雙股螺旋沒有 3D 感」）：照深度分三層畫——
     * 先畫兩股在後面的部分（暗、細）→ 鹼基對（靠前的那一半亮、靠後的那一半暗）→ 兩股在前面的部分（亮、粗、外面一層光、中間一條高光）。
     */
    function drawHelix(strand: ReturnType<typeof evolve>[number], hue: string, gradient: CanvasGradient, dim: number) {
        const c = ctx!;
        const part = (thread: (typeof strand.threads)[number], [from, to]: [number, number], widen = 1) =>
            fillRibbon(thread.points.slice(from, to + 1), thread.widths.slice(from, to + 1), widen);
        c.fillStyle = gradient;
        for (const thread of strand.threads) {
            c.globalAlpha = 0.32 * dim;
            for (const range of runs(thread.depths!, false)) part(thread, range);
        }
        c.strokeStyle = hue;
        c.lineCap = 'round';
        for (const rung of strand.rungs) {
            const middle = lerp(rung.a, rung.b, 0.5);
            c.lineWidth = 1.3;
            c.globalAlpha = (0.25 + 0.6 * rung.depth) * dim;
            c.beginPath();
            c.moveTo(rung.a.x, rung.a.y);
            c.lineTo(middle.x, middle.y);
            c.stroke();
            c.lineWidth = 0.7;
            c.globalAlpha = (0.1 + 0.25 * rung.depth) * dim;
            c.beginPath();
            c.moveTo(middle.x, middle.y);
            c.lineTo(rung.b.x, rung.b.y);
            c.stroke();
        }
        for (const thread of strand.threads) {
            const fronts = runs(thread.depths!, true);
            c.fillStyle = gradient;
            c.globalAlpha = 0.22 * dim;
            for (const range of fronts) part(thread, range, 2.6);
            c.globalAlpha = dim;
            for (const range of fronts) part(thread, range);
            c.strokeStyle = colors.beam;
            c.lineWidth = 0.5;
            c.globalAlpha = 0.7 * dim;
            for (const [from, to] of fronts) {
                polyline(thread.points.slice(from, to + 1));
                c.stroke();
            }
        }
    }

    /** 入射高度＝O 的圓心（白光本身畫在 HomeContents，這裡只用它算出口）：O 裡的座標是水平射進來，對調之後就是垂直往下 */
    const SOURCE = ORB.cy;
    let time = 2; // 光絲的動畫時間（秒）；關閉動態時畫這一刻
    let path: ReturnType<typeof lightPath> | null = null;

    /** 靜的：星塵、一道道光。開場時光往下長（rayP < 1）才每格重畫 */
    let rayDone = false;
    function drawStill(now: number) {
        const c = (ctx = still);
        if (!c || !layout) return;
        path = lightPath(layout, SOURCE);
        const { exits } = path;
        const rayP = easeOut(phase(introAt, now, INTRO.rays, 900));
        rayDone = rayP >= 1;
        c.setTransform(stillDpr, 0, 0, stillDpr, 0, 0);
        c.clearRect(0, 0, width, height);

        c.fillStyle = colors.star;
        for (const star of sky) {
            c.globalAlpha = 0.1 + 0.3 * (0.5 + 0.5 * Math.sin(star.delay * 1.7));
            dot(star.x, star.y, star.r);
        }

        if (rayP <= 0) return;
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
        });
        c.globalAlpha = 1;
    }

    /** 動的：O 裡的光絲、光上往下流的光點 */
    function drawLive(now: number) {
        const c = (ctx = live);
        if (!c || !layout || !path) return;
        const { exits, localEntry, localExits, localEnds } = path;
        const innerP = phase(introAt, now, INTRO.inner, 700);
        const t = time;
        c.setTransform(liveDpr, 0, 0, liveDpr, 0, 0);
        c.clearRect(0, 0, box.width, box.height);

        // O 裡面：用 O 的座標畫（x、y 對調的矩陣，再扣掉這張畫布的位置）。
        // 不用 clip 裁成圓（量過，裁切讓每一筆都多一層遮罩，最貴）：光絲本來就在圓裡，入口的漣漪只畫在圓裡的那一段弧
        if (innerP > 0) {
            const [a, b, cc, d, e, f] = localMatrix(layout);
            c.save();
            c.setTransform(a * liveDpr, b * liveDpr, cc * liveDpr, d * liveDpr, (e - box.x) * liveDpr, (f - box.y) * liveDpr);
            c.strokeStyle = colors.beam;
            c.lineWidth = 1.5;
            const inward = Math.atan2(ORB.cy - localEntry.y, ORB.cx - localEntry.x);
            for (let k = 0; k < 3; k++) {
                const p = (t / 2.4 + k / 3) % 1;
                const radius = 3 + p * 62;
                // 以入口為圓心、半徑 radius 的圓，在玻璃裡的那一段：往圓心方向左右各 acos(radius / 2R)
                const spread = Math.acos(Math.min(1, radius / (2 * (ORB.r - 3))));
                c.globalAlpha = (1 - p) * 0.55 * innerP;
                c.beginPath();
                c.arc(localEntry.x, localEntry.y, radius, inward - spread, inward + spread);
                c.stroke();
            }
            const fills = strandGradients(c, localEntry, localExits);
            const strands = evolve(rays.map(ray => ray.element.key), localEntry, localExits, localEnds, t);
            strands.forEach((strand, index) => {
                const ray = rays[index];
                const hue = colors[ray.hue];
                const gradient = fills[index];
                const dim = (focus && focus !== ray.key ? 0.18 : 1) * innerP;
                const flicker = strand.element === 'fire' ? 0.7 + 0.3 * Math.sin(t * 13 + index) : 1;
                c.fillStyle = gradient;
                if (strand.element === 'wood') {
                    drawHelix(strand, hue, gradient, dim);
                    return;
                }
                c.globalAlpha = ALPHA[strand.element] * dim * flicker;
                for (const thread of strand.threads) fillRibbon(thread.points, thread.widths);
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
            });
            c.restore();
        }

        // 光上的光點往下流，文章越多越熱鬧（光長完才有）
        if (!rayDone) return;
        c.setTransform(liveDpr, 0, 0, liveDpr, -box.x * liveDpr, -box.y * liveDpr);
        rays.forEach((ray, index) => {
            const exit = exits[index];
            const landing = layout!.landings[index];
            const half = landingHalf(ray.spread);
            const dim = focus && focus !== ray.key ? 0.25 : 1;
            c.fillStyle = colors[ray.hue];
            for (let i = 0; i < ray.photons; i++) {
                const k = (i / ray.photons + index * 0.137 + t * (0.16 + 0.02 * (i % 3))) % 1;
                const lane = Math.sin((i + 1) * 2.4 + index) * 0.8;
                const p = lerp(exit, landing, k);
                c.globalAlpha = Math.sin(Math.PI * k) * dim;
                dot(p.x + lane * half * k, p.y, 1.5 + (i % 2) * 0.7);
            }
        });
        c.globalAlpha = 1;
    }
    // #endregion

    // #region [P] 滑鼠：在哪一道光上（畫布不吃滑鼠，自己算）
    let pointer: Point | null = null;
    let rayHover: string | null = null;

    function onMove(event: PointerEvent) {
        if (!root) return;
        const base = root.getBoundingClientRect();
        const interactive = (event.target as Element).closest('a, button, [role="button"], input');
        pointer = interactive ? null : { x: event.clientX - base.left, y: event.clientY - base.top };
        updateHover();
    }
    function onLeave() {
        pointer = null;
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

    // #region [P] 動畫迴圈：每秒 20 張；看不到就停
    let frame = 0;
    let lastFrame = 0;
    let visible = true;
    let observer: IntersectionObserver | undefined;
    let resizer: ResizeObserver | undefined;
    let theme: MutationObserver | undefined;

    // 下一張要到該畫的時候才跟瀏覽器要 frame：原本每次螢幕刷新都要一次（再自己跳過不畫），
    // 瀏覽器就得每秒 60 次整頁更新——量過，什麼都不畫也吃掉一半以上的主執行緒
    let running = false;
    let timer = 0;
    function tick(now: number) {
        frame = 0;
        if (!running) return;
        const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
        lastFrame = now;
        time += dt;
        if (!rayDone) drawStill(now);
        drawLive(now);
        timer = window.setTimeout(() => (frame = requestAnimationFrame(tick)), FRAME_MS - 4);
    }
    function start() {
        if (!motion.value || running || !visible || document.hidden) return;
        running = true;
        lastFrame = 0;
        frame = requestAnimationFrame(tick);
    }
    function stop() {
        running = false;
        clearTimeout(timer);
        cancelAnimationFrame(frame);
        frame = 0;
    }
    const onVisibility = () => (document.hidden ? stop() : start());

    onMounted(() => {
        motion.value = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
        root = stillRef.value!.parentElement!;
        still = stillRef.value!.getContext('2d');
        live = liveRef.value!.getContext('2d');
        readColors();
        resizer = new ResizeObserver(() => measure());
        resizer.observe(root);
        theme = new MutationObserver(() => {
            readColors();
            gradients = [];
            redraw();
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
        observer.observe(liveRef.value!);
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
    function redraw() {
        const now = performance.now();
        drawStill(now);
        drawLive(now);
    }
    // 滑過、選了：靜的那張要重畫（光的明暗）；動的那張下一格就會跟上，沒有迴圈時（關閉動態）自己畫
    watch(() => focus, redraw);
    // #endregion
</script>

<template>
    <canvas ref="stillRef" class="op-light" aria-hidden="true" />
    <canvas ref="liveRef" class="op-light" aria-hidden="true" />
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
