<script setup lang="ts">
    import gsap from 'gsap';
    import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

    const props = defineProps<{
        status: 'IDLE' | 'HOVER' | 'LOCKED';
        targetVal: number;
        // [新增] 接收強制座標，格式為 { x: 100, y: 200 } 或 null
        overridePosition?: { x: number; y: number } | null;
    }>();

    const cursorRef = ref<HTMLElement | null>(null);
    const innerGroupRef = ref<SVGElement | null>(null);
    const outerGroupRef = ref<SVGElement | null>(null);
    const linesGroupRef = ref<SVGElement | null>(null);

    let xSet: (value: number) => void;
    let ySet: (value: number) => void;
    let currentTl: gsap.core.Timeline | null = null;

    const COLORS = {
        IDLE: '#00f0ff',
        HOVER: '#FDB813',
        LOCKED: '#ff0055'
    };

    const targetScale = computed(() => {
        if (!props.targetVal) return 1;
        const multiplier = props.status === 'LOCKED' ? 0.35 : 0.25;
        return Math.max(0.8, Math.min(props.targetVal * multiplier, 3.0));
    });

    const moveCursor = (e: MouseEvent) => {
        // 只有在 "沒有" 強制定位的時候，才跟隨滑鼠
        if (!props.overridePosition && xSet && ySet) {
            xSet(e.clientX);
            ySet(e.clientY);
        }
    };

    const startIdleAnimation = () => {
        if (!innerGroupRef.value || !outerGroupRef.value) return;

        // 確保之前的動畫都被清空
        gsap.killTweensOf([innerGroupRef.value, outerGroupRef.value, linesGroupRef.value]);

        // 內圈：順時針慢轉
        gsap.to(innerGroupRef.value, {
            rotation: '+=360',
            duration: 5,
            repeat: -1,
            ease: 'none'
        });
        // 外圈：逆時針慢轉
        gsap.to(outerGroupRef.value, {
            rotation: '-=360',
            duration: 10,
            repeat: -1,
            ease: 'none'
        });

        // 確保狀態還原 (顏色、粗細)
        gsap.set([innerGroupRef.value, outerGroupRef.value], {
            stroke: COLORS.IDLE,
            strokeWidth: 2
        });
        gsap.to(linesGroupRef.value, { scale: 0.5, opacity: 0, duration: 0.5 });
    };

    onMounted(() => {
        xSet = gsap.quickTo(cursorRef.value, 'x', { duration: 0.15, ease: 'power2.out' });
        ySet = gsap.quickTo(cursorRef.value, 'y', { duration: 0.15, ease: 'power2.out' });
        startIdleAnimation();
        window.addEventListener('mousemove', moveCursor);
    });

    onUnmounted(() => window.removeEventListener('mousemove', moveCursor));

    watch([() => props.status, targetScale], ([newStatus, newScale]) => {
        // 1. [暴力殺]：殺死所有正在進行的動畫，包含 Idle 的無限迴圈
        // 這樣才能保證 LOCKED 時外圈絕對不會動
        gsap.killTweensOf([innerGroupRef.value, outerGroupRef.value, linesGroupRef.value]);
        if (currentTl) currentTl.kill();

        currentTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        if (newStatus === 'HOVER') {
            // [HOVER]
            currentTl.to(innerGroupRef.value, {
                rotation: 45,
                scale: newScale,
                stroke: COLORS.HOVER,
                strokeWidth: 2,
                duration: 0.4
            })
                // "<0.1" 代表：比上一段動畫 (內圈) 晚 0.1 秒開始
                // 這會產生一種「內圈先動，外圈隨後跟上」的層次感
                .to(outerGroupRef.value, {
                    rotation: 45,
                    scale: newScale * 1.3,
                    stroke: COLORS.HOVER,
                    strokeWidth: 2,
                    duration: 0.4
                }, '<0.15')
                .to(linesGroupRef.value, {
                    rotation: 0,
                    scale: newScale * 1.3,
                    opacity: 1,
                    stroke: COLORS.HOVER,
                    duration: 0.3
                }, '<'); // 線條跟著外圈一起出現
        } else if (newStatus === 'LOCKED') {
            // [LOCKED]
            currentTl.to(innerGroupRef.value, {
                rotation: 1350, // 直接轉到180度，製造一個「翻轉」的感覺
                scale: newScale * 0.8,
                stroke: COLORS.LOCKED,
                strokeWidth: 3,
                duration: 0.6
            })
                .to(outerGroupRef.value, {
                    rotation: 45, // 強制歸零，並且因為上面 killTweensOf 了，它不會再轉
                    scale: newScale * 1,
                    stroke: COLORS.LOCKED,
                    strokeWidth: 3,
                    duration: 0.3
                }, '<0.2') // 同樣 Delay 0.1 秒，增加機械感
                .to(linesGroupRef.value, {
                    rotation: 45,
                    scale: newScale * 0.7,
                    opacity: 1,
                    stroke: COLORS.LOCKED,
                    strokeWidth: 4,
                    duration: 0.3
                }, '<1.4'); // 線條跟著外圈一起出現
        } else {
            // [IDLE]
            gsap.to([innerGroupRef.value, outerGroupRef.value], {
                scale: 1,
                stroke: COLORS.IDLE,
                strokeWidth: 2,
                rotation: 0, // 歸位
                duration: 0.5,
                ease: 'elastic.out(1, 0.5)',
                onComplete: startIdleAnimation // 動畫做完才開始轉
            });
        }
    });

    // [新增] 監聽強制座標的變化 (這是鎖定時游標會動的關鍵)
    watch(() => props.overridePosition, (pos) => {
        if (pos && xSet && ySet) {
            xSet(pos.x);
            ySet(pos.y);
        }
    });
</script>

<template>
    <div ref="cursorRef" class="custom-cursor">
        <svg viewBox="-100 -100 200 200" class="cursor-svg">
            <circle cx="0" cy="0" r="2" fill="#fff" />

            <g ref="innerGroupRef" class="rotator" :stroke="COLORS.IDLE" stroke-width="2">
                <path
                    v-for="i in 4" :key="`in-${i}`"
                    d="M -10 -30 A 30 30 0 0 1 10 -30"
                    fill="none" stroke-linecap="round"
                    :transform="`rotate(${(i - 1) * 90})`"
                />
            </g>

            <g ref="outerGroupRef" class="rotator out" :stroke="COLORS.IDLE" stroke-width="2">
                <path
                    v-for="i in 4" :key="`out-${i}`"
                    d="M 15 -50 A 55 55 0 0 1 50 -15"
                    fill="none" stroke-linecap="round"
                    :transform="`rotate(${(i - 1) * 90})`"
                />
            </g>

            <g ref="linesGroupRef" class="rotator line" :stroke="COLORS.IDLE" stroke-width="2" style="opacity: 0;">
                <line
                    v-for="i in 4" :key="`line-${i}`"
                    x1="0" y1="-60" x2="0" y2="-80"
                    stroke-linecap="round"
                    :transform="`rotate(${(i - 1) * 90})`"
                />
            </g>
        </svg>
    </div>
</template>

<style scoped lang="scss">
    .custom-cursor {
        position: fixed;
        top: 0; left: 0;
        width: 0; height: 0;
        pointer-events: none;
        z-index: 9999;
        mix-blend-mode: screen;
    }
    .cursor-svg {
        position: absolute;
        top: -100px; left: -100px;
        width: 200px; height: 200px;
        overflow: visible;
        filter: drop-shadow(0 0 2px rgb(0, 240, 255, 50%));

        .rotator {
            transform-origin: 50% 50% !important;
            transform-box: fill-box;

            /* 確保 CSS transition 不會跟 GSAP 打架
            這裡不需要寫 transition，全權交給 GSAP 控制
            */
        }
    }
</style>
