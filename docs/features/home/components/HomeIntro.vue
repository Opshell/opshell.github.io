<script setup lang="ts">
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { BLOG_MOTTO, BLOG_NAME } from '../constants';
    import { INTRO, LOGO } from '../intro';

    // 首頁開場的前半段（2026-10-06，故事見 intro.ts）：蓋住整個畫面的一層。
    // LOGO 描邊、填色、黃色兩槓滑進來 → 名字字距收攏 → Slogan 一個字一個字 → LOGO 亮一下 →
    // 名字與 Slogan 被吸回 LOGO、LOGO 收成一個白色光點 → 光點飛到首頁上玻璃 O 的位置、綻開（後半段在 HomeContents 與 LightStage）。
    // 全部是 CSS 動畫（只動 transform、opacity，LOGO 亮一下用一次 drop-shadow）；JS 只在收攏前量一次「往哪裡飛」。
    // 還沒開始播（SSR 剛畫出來、JS 還沒接手）時只有底色，不會先閃一下 LOGO；沒有 JS 時這層 2 秒後自己淡掉。
    const { playing = false } = defineProps<{ playing?: boolean }>();

    const rootRef = ref<HTMLElement>();
    const logoRef = ref<HTMLElement>();
    const slogan = [...BLOG_MOTTO];
    let timer = 0;

    /** 量位置：名字與 Slogan 要被吸到 LOGO 中心多遠；光點要飛到 O 的中心多遠、綻開成多大 */
    function aim() {
        const root = rootRef.value;
        const logo = logoRef.value?.getBoundingClientRect();
        const orb = root?.parentElement?.querySelector('.op-home__orb')?.getBoundingClientRect();
        if (!root || !logo) return;
        const cx = logo.left + logo.width / 2;
        const cy = logo.top + logo.height / 2;
        for (const el of root.querySelectorAll<HTMLElement>('[data-gather]')) {
            const rect = el.getBoundingClientRect();
            el.style.setProperty('--gx', `${cx - (rect.left + rect.width / 2)}px`);
            el.style.setProperty('--gy', `${cy - (rect.top + rect.height / 2)}px`);
        }
        if (!orb) return;
        root.style.setProperty('--fx', `${orb.left + orb.width / 2 - cx}px`);
        root.style.setProperty('--fy', `${orb.top + orb.height / 2 - cy}px`);
        root.style.setProperty('--fs', `${orb.width / 16}`); // 光點 16px
    }

    function play() {
        clearTimeout(timer);
        timer = window.setTimeout(aim, INTRO.gather - 100);
    }
    onMounted(() => playing && play());
    watch(() => playing, on => on && play());
    onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
    <div ref="rootRef" class="op-intro" :class="{ 'is-playing': playing }" aria-hidden="true">
        <div class="op-intro__mark">
            <span ref="logoRef" class="op-intro__logo">
                <svg :viewBox="`0 0 ${LOGO.size} ${LOGO.size}`" width="148" height="148">
                    <path v-for="d in LOGO.body" :key="d" class="body" :d="d" pathLength="1" />
                    <path v-for="(d, index) in LOGO.accent" :key="d" class="accent" :d="d" :style="{ '--i': index }" />
                </svg>
                <!-- 奇點：LOGO 收成它，它再飛去變成 O -->
                <span class="op-intro__core" />
            </span>
            <p class="op-intro__name" data-gather>{{ BLOG_NAME }}</p>
            <p class="op-intro__slogan" data-gather>
                <span v-for="(char, index) in slogan" :key="index" :style="{ '--i': index }">{{ char }}</span>
            </p>
        </div>
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

        // 底色另外一層：光點飛走時只淡掉底色，光點還看得到
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
            position: relative;
            display: block;

            svg {
                display: block;
                overflow: visible;
            }
            .body {
                fill: var(--op-intro-ink);
                stroke: var(--op-intro-ink);
                stroke-width: 5;
            }
            .accent { fill: var(--pr-amber); }
        }
        &__core {
            position: absolute;
            top: 50%;
            left: 50%;
            background: #FFF;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            margin: -8px 0 0 -8px;
            box-shadow: 0 0 18px 6px rgb(255 248 231 / 85%), 0 0 60px 18px color-mix(in srgb, var(--pr-magenta) 45%, transparent);
            opacity: 0;
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

        // 沒有 JS（或 JS 太晚接手）：2 秒後自己淡掉，底下就是定格的首頁
        &:not(.is-playing) { animation: op-intro-out .4s 2s forwards; }

        // #region [P] 開場（時間照 intro.ts 的 INTRO：gather 2.7s、fly 3.4s、bloom 4.0s）
        &.is-playing {
            &::before { animation: op-intro-out .7s 3.4s forwards; }

            .op-intro__mark { opacity: 1; }
            .op-intro__logo .body {
                stroke-dasharray: 1;
                animation: op-intro-stroke .8s var(--cubic-FiSo) both, op-intro-fill .4s .65s var(--cubic-FiSo) both;
            }
            .op-intro__logo .accent { animation: op-intro-slide .55s calc(.8s + var(--i) * .14s) var(--cubic-SiRo) both; }
            .op-intro__logo svg {
                animation:
                    op-intro-glow 1s 1.8s var(--cubic-FiSo),
                    op-intro-implode .6s 2.95s cubic-bezier(.6, 0, .9, .4) forwards;
            }
            .op-intro__name {
                animation:
                    op-intro-track .9s .6s var(--cubic-FiSo) both,
                    op-intro-gather .55s 2.7s cubic-bezier(.6, 0, .9, .4) forwards;
            }
            .op-intro__slogan {
                animation: op-intro-gather .55s 2.6s cubic-bezier(.6, 0, .9, .4) forwards;

                span { animation: op-intro-rise .5s calc(1.05s + var(--i) * .1s) var(--cubic-FiSo) both; }
            }
            .op-intro__core {
                animation:
                    op-intro-core .45s 3.05s var(--cubic-FiSo) forwards,
                    op-intro-fly .65s 3.4s cubic-bezier(.45, 0, .2, 1) forwards,
                    op-intro-bloom .45s 4s var(--cubic-FiSo) forwards;
            }
        }

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

    // 被吸回 LOGO 中心：越來越快（ease-in），縮小、淡掉
    @keyframes op-intro-gather {
        to {
            transform: translate(var(--gx, 0), var(--gy, 0)) scale(.05);
            opacity: 0;
        }
    }
    @keyframes op-intro-implode {
        to {
            transform: scale(.04) rotate(-25deg);
            opacity: 0;
        }
    }
    @keyframes op-intro-core {
        0% { transform: scale(0); }
        60% { transform: scale(1.6); }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }
    @keyframes op-intro-fly {
        from {
            transform: none;
            opacity: 1;
        }
        to {
            transform: translate(var(--fx, 0), var(--fy, 0));
            opacity: 1;
        }
    }
    @keyframes op-intro-bloom {
        from {
            transform: translate(var(--fx, 0), var(--fy, 0));
            opacity: 1;
        }
        to {
            transform: translate(var(--fx, 0), var(--fy, 0)) scale(var(--fs, 10));
            opacity: 0;
        }
    }
</style>
