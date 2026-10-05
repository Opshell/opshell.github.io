<script setup lang="ts">
    import type { Particle } from '../intro';
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { BLOG_MOTTO, BLOG_NAME } from '../constants';
    import { INTRO, LOGO, particleAt, scatter } from '../intro';

    // 首頁開場（2026-10-06，使用者：「現代、簡潔、引人注目；用網站 LOGO、呈現 Slogan，最後打散分佈到首頁的各個區域」）：
    // 蓋住整個畫面的一層：LOGO 描邊、填色、黃色兩槓滑進來 → 名字 → Slogan 一個字一個字 → LOGO 亮一下 →
    // LOGO 與字變成光點，飛到首頁各區（有 data-intro 的元素：大卡、O、分類、文章），那一區在光點到的時候出現。
    // 時間照 intro.ts 的 INTRO；前半段是 CSS，打散是畫布（只播一次、約一秒）。
    // 還沒開始播（SSR 剛畫出來、JS 還沒接手）時只有底色，所以不會先閃一下 LOGO；沒有 JS 時這層 2 秒後自己淡掉。
    const { playing = false } = defineProps<{ playing?: boolean }>();

    const rootRef = ref<HTMLElement>();
    const markRef = ref<HTMLElement>();
    const dustRef = ref<HTMLCanvasElement>();
    const scattered = ref(false);
    const slogan = [...BLOG_MOTTO];
    let timer = 0;
    let frame = 0;

    /** 把畫面上的 LOGO、名字、Slogan 畫到一張小畫布上，每隔幾個像素取一個點（顏色照原本的） */
    function sample(): { x: number; y: number; color: string }[] {
        const mark = markRef.value!;
        const box = mark.getBoundingClientRect();
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(box.width);
        canvas.height = Math.ceil(box.height);
        const c = canvas.getContext('2d', { willReadFrequently: true });
        if (!c) return [];
        const style = getComputedStyle(rootRef.value!);
        const ink = style.getPropertyValue('--op-intro-ink').trim();
        const amber = style.getPropertyValue('--pr-amber').trim();
        const violet = style.getPropertyValue('--pr-violet').trim();

        const logo = mark.querySelector('svg')!.getBoundingClientRect();
        const k = logo.width / LOGO.size;
        c.setTransform(k, 0, 0, k, logo.left - box.left, logo.top - box.top);
        c.fillStyle = ink;
        for (const d of LOGO.body) c.fill(new Path2D(d));
        c.fillStyle = amber;
        for (const d of LOGO.accent) c.fill(new Path2D(d));
        c.setTransform(1, 0, 0, 1, 0, 0);
        for (const [selector, fill] of [['.op-intro__name', 'gradient'], ['.op-intro__slogan', ink]] as const) {
            const el = mark.querySelector<HTMLElement>(selector)!;
            const rect = el.getBoundingClientRect();
            const font = getComputedStyle(el);
            c.font = `${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
            c.textBaseline = 'middle';
            c.textAlign = 'center';
            if (fill === 'gradient') {
                const gradient = c.createLinearGradient(rect.left - box.left, 0, rect.right - box.left, 0);
                gradient.addColorStop(0, amber);
                gradient.addColorStop(1, violet);
                c.fillStyle = gradient;
            } else {
                c.fillStyle = fill;
            }
            c.fillText(el.textContent ?? '', rect.left - box.left + rect.width / 2, rect.top - box.top + rect.height / 2);
        }

        const { data } = c.getImageData(0, 0, canvas.width, canvas.height);
        // 取樣的間隔：點太多畫不動，太少散不開；大概一千顆
        const filled = data.reduce((sum, value, i) => (i % 4 === 3 && value > 128 ? sum + 1 : sum), 0);
        const step = Math.max(3, Math.round(Math.sqrt(filled / 1000)));
        const points: { x: number; y: number; color: string }[] = [];
        for (let y = 0; y < canvas.height; y += step) {
            for (let x = 0; x < canvas.width; x += step) {
                const i = (y * canvas.width + x) * 4;
                if (data[i + 3] < 128) continue;
                points.push({ x: box.left + x, y: box.top + y, color: `rgb(${data[i]} ${data[i + 1]} ${data[i + 2]})` });
            }
        }
        return points;
    }

    function burst() {
        const canvas = dustRef.value;
        const page = rootRef.value?.parentElement;
        const c = canvas?.getContext('2d');
        if (!canvas || !page || !c) return;
        const targets = [...page.querySelectorAll('[data-intro]')].map(el => el.getBoundingClientRect());
        const particles: Particle[] = scatter(sample(), targets);
        scattered.value = true;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(window.innerWidth * dpr);
        canvas.height = Math.round(window.innerHeight * dpr);
        const begin = performance.now();
        const step = (now: number) => {
            const elapsed = now - begin;
            c.setTransform(dpr, 0, 0, dpr, 0, 0);
            c.clearRect(0, 0, window.innerWidth, window.innerHeight);
            let alive = false;
            for (const particle of particles) {
                const t = (elapsed - particle.delay) / INTRO.flight;
                if (t >= 1) continue;
                alive = true;
                const p = particleAt(particle, Math.max(0, t));
                c.globalAlpha = t < 0.75 ? 1 : (1 - t) / 0.25;
                c.fillStyle = particle.color;
                const size = 2.2 - Math.max(0, t) * 1.2;
                c.fillRect(p.x - size / 2, p.y - size / 2, size, size);
            }
            frame = alive ? requestAnimationFrame(step) : 0;
            if (!alive) c.clearRect(0, 0, window.innerWidth, window.innerHeight);
        };
        frame = requestAnimationFrame(step);
    }

    function play() {
        clearTimeout(timer);
        timer = window.setTimeout(burst, INTRO.scatter);
    }
    onMounted(() => playing && play());
    watch(() => playing, on => on && play());
    onBeforeUnmount(() => {
        clearTimeout(timer);
        cancelAnimationFrame(frame);
    });
</script>

<template>
    <div ref="rootRef" class="op-intro" :class="{ 'is-playing': playing, 'is-scattered': scattered }" aria-hidden="true">
        <div ref="markRef" class="op-intro__mark">
            <svg class="op-intro__logo" :viewBox="`0 0 ${LOGO.size} ${LOGO.size}`" width="148" height="148">
                <path v-for="d in LOGO.body" :key="d" class="body" :d="d" pathLength="1" />
                <path v-for="(d, index) in LOGO.accent" :key="d" class="accent" :d="d" :style="{ '--i': index }" />
            </svg>
            <p class="op-intro__name">{{ BLOG_NAME }}</p>
            <p class="op-intro__slogan">
                <span v-for="(char, index) in slogan" :key="index" :style="{ '--i': index }">{{ char }}</span>
            </p>
        </div>
        <canvas ref="dustRef" class="op-intro__dust" />
    </div>
</template>

<style lang="scss">
    .op-intro {
        --op-intro-ink: #FFF;
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 100;
        @include setFlex(center, center, 0, column);

        // 底色另外一層：打散時只淡掉底色，光點還要繼續飛
        &::before {
            content: '';
            position: absolute;
            inset: 0;
            background: var(--vp-c-bg);
        }

        &__mark {
            position: relative;
            @include setFlex(center, center, 1.1rem, column);
            padding: 1rem 2rem;
            opacity: 0; // 開始播之前不露出來（JS 接手前只有底色）
        }
        &__logo {
            display: block;
            overflow: visible;

            .body {
                fill: var(--op-intro-ink);
                stroke: var(--op-intro-ink);
                stroke-width: 5;
            }
            .accent { fill: var(--pr-amber); }
        }
        &__name {
            background: var(--pr-brand-gradient);
            background-clip: text;
            margin: 0;
            color: transparent;
            font-size: clamp(2rem, 1.5rem + 2vw, 3rem);
            font-weight: 900;
            line-height: 1.1;
            letter-spacing: -.02em;
        }
        &__slogan {
            margin: 0;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-l);
            font-weight: 600;
            letter-spacing: .3em;

            span { display: inline-block; }
        }
        &__dust {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
        }

        // 沒有 JS（或 JS 太晚接手）：2 秒後自己淡掉，底下就是定格的首頁
        &:not(.is-playing) { animation: op-intro-out .4s 2s forwards; }

        // #region [P] 開場（時間照 intro.ts 的 INTRO）
        &.is-playing {
            // 底色在打散時淡掉，露出首頁；光點繼續飛
            &::before { animation: op-intro-out .6s 1.9s forwards; }

            .op-intro__mark { opacity: 1; }
            .op-intro__logo .body {
                stroke-dasharray: 1;
                animation: op-intro-stroke .7s var(--cubic-FiSo) both, op-intro-fill .35s .55s var(--cubic-FiSo) both;
            }
            .op-intro__logo .accent { animation: op-intro-slide .5s calc(.7s + var(--i) * .12s) var(--cubic-SiRo) both; }
            .op-intro__name { animation: op-intro-track .8s .55s var(--cubic-FiSo) both; }
            .op-intro__slogan span { animation: op-intro-rise .45s calc(1s + var(--i) * .08s) var(--cubic-FiSo) both; }

            // 打散前 LOGO 亮一下（光暈一閃）
            .op-intro__logo { animation: op-intro-glow .8s 1.3s var(--cubic-FiSo); }
        }

        // 打散：LOGO 與字換成畫布上的光點
        &.is-scattered .op-intro__mark { visibility: hidden; }

        // #endregion
        @media (prefers-reduced-motion: reduce) { display: none; }
    }

    html:not(.dark) .op-intro { --op-intro-ink: #111; }
    @keyframes op-intro-out {
        to {
            visibility: hidden;
            opacity: 0;
        }
    }
    @keyframes op-intro-stroke {
        from {
            fill-opacity: 0;
            stroke-dashoffset: 1;
        }
        to { fill-opacity: 0; }
    }

    // 要寫 to：前一個動畫（描邊）停在 fill-opacity 0，沒寫的話「原本的值」會是那個 0
    @keyframes op-intro-fill {
        from { fill-opacity: 0; }
        to { fill-opacity: 1; }
    }
    @keyframes op-intro-slide {
        from {
            transform: translateX(90px);
            opacity: 0;
        }
    }
    @keyframes op-intro-track {
        from {
            letter-spacing: .4em;
            filter: blur(6px);
            opacity: 0;
        }
    }
    @keyframes op-intro-rise {
        from {
            transform: translateY(.6em);
            opacity: 0;
        }
    }
    @keyframes op-intro-glow {
        40% { filter: drop-shadow(0 0 18px color-mix(in srgb, var(--pr-amber) 70%, transparent)); }
    }
</style>
