<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import gsap from 'gsap';

const props = defineProps<{
    isHovering: boolean;
    targetVal: number;
}>();

// ... Refs 定義保持不變 ...
const cursorRef = ref<HTMLElement | null>(null);
const innerGroupRef = ref<SVGElement | null>(null);
const outerGroupRef = ref<SVGElement | null>(null);
const linesGroupRef = ref<SVGElement | null>(null);

let xSet: (value: number) => void;
let ySet: (value: number) => void;

// 儲存當前正在運行的 timeline，避免疊加
let currentTl: gsap.core.Timeline | null = null;

const targetScale = computed(() => {
    if (!props.targetVal) return 1;
    return Math.max(0.8, Math.min(props.targetVal * 0.25, 3.0));
});

// ... moveCursor, startIdleAnimation 保持不變 ...
const moveCursor = (e: MouseEvent) => {
    if (xSet && ySet) {
        xSet(e.clientX);
        ySet(e.clientY);
    }
};
// 啟動閒置旋轉 (Idle Spin)
const startIdleAnimation = () => {
    if (!innerGroupRef.value || !outerGroupRef.value) return;

    // 內圈：順時針慢轉
    gsap.to(innerGroupRef.value, {
        rotation: "+=360",
        duration: 10,
        repeat: -1,
        ease: 'none',
        overwrite: 'auto' // 確保不被之前的動畫卡住
    });

    // 外圈：逆時針更慢轉
    gsap.to(outerGroupRef.value, {
        rotation: "-=360",
        duration: 15,
        repeat: -1,
        ease: 'none',
        overwrite: 'auto'
    });

    // 刻度線：隱藏
    gsap.to(linesGroupRef.value, { scale: 0.5, opacity: 0, duration: 0.5 });
};

onMounted(() => {
    // ... 初始化 ...
     // 1. 初始化跟隨
    xSet = gsap.quickTo(cursorRef.value, 'x', { duration: 0.15, ease: 'power2.out' });
    ySet = gsap.quickTo(cursorRef.value, 'y', { duration: 0.15, ease: 'power2.out' });

    // 2. 啟動閒置動畫
    startIdleAnimation();

    window.addEventListener('mousemove', moveCursor);
});

onUnmounted(() => window.removeEventListener('mousemove', moveCursor));

watch([() => props.isHovering, targetScale], ([isHover, newScale]) => {
    // 🔥 重要修正：先殺死之前的 timeline
    if (currentTl) currentTl.kill();

    const lockColor = '#ff0055';
    const idleColor = '#00f0ff';

    if (isHover) {
        // [ >>> 鎖定模式 <<< ]
        currentTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        // 使用 overwrite: true 確保殺死 idle 旋轉
        currentTl.to([innerGroupRef.value, outerGroupRef.value], {
            rotation: (i, target) => {
                const current = gsap.getProperty(target, "rotation") as number;
                return Math.round(current / 90) * 90;
            },
            duration: 0.4,
            ease: 'back.out(1.7)',
            overwrite: true
        })
        .to(outerGroupRef.value, {
            scale: newScale * 1.3,
            stroke: lockColor,
            strokeWidth: 3,
            duration: 0.4
        }, "<")
        .to(innerGroupRef.value, {
            scale: newScale,
            stroke: lockColor,
            strokeWidth: 4,
            duration: 0.4
        }, "<0.1")
        .to(linesGroupRef.value, {
            scale: newScale * 1.5,
            opacity: 1,
            stroke: lockColor,
            duration: 0.3,
            overwrite: true
        }, "<");

    } else {
        // [ >>> 解除模式 <<< ]
        // 使用 simple tween 復原，然後重啟 idle
        gsap.to([innerGroupRef.value, outerGroupRef.value], {
            scale: 1,
            stroke: idleColor,
            strokeWidth: 2,
            duration: 0.5,
            ease: 'elastic.out(1, 0.5)',
            overwrite: true,
            onComplete: startIdleAnimation // 動畫做完後才開始轉，比較順
        });
    }
});
</script>

<template>
    <div ref="cursorRef" class="custom-cursor">
        <svg viewBox="-100 -100 200 200" class="cursor-svg">

            <circle cx="0" cy="0" r="2" fill="#fff" />

            <g ref="innerGroupRef" class="rotator">
                <path v-for="i in 4" :key="`in-${i}`"
                    d="M -10 -30 A 30 30 0 0 1 10 -30"
                    fill="none" stroke="#00f0ffaa" stroke-width="2" stroke-linecap="round"
                    :transform="`rotate(${(i-1) * 90})`"
                />
            </g>

            <g ref="outerGroupRef" class="rotator out">
                <path v-for="i in 4" :key="`out-${i}`"
                    d="M -20 -45 A 45 45 0 0 1 20 -45"
                    fill="none" stroke="#00f0ff88" stroke-width="2" stroke-linecap="round"
                    :transform="`rotate(${(i-1) * 90})`"
                />
            </g>

            <g ref="linesGroupRef" class="rotator line" style="opacity: 0;">
                <line v-for="i in 4" :key="`line-${i}`"
                    x1="0" y1="-55" x2="0" y2="-70"
                    stroke="#00f0ff" stroke-width="2"
                    :transform="`rotate(${(i-1) * 90})`"
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

    /* 讓 SVG 中心對齊滑鼠 */
    top: -100px;
    left: -100px;
    width: 200px;
    height: 200px;
    overflow: visible;
    filter: drop-shadow(0 0 2px rgb(0, 240, 255, 50%));

    .rotator {
        transform-origin: 50% 50% !important;
        transform-box: fill-box;

        &.out {

        }

        &.line {

        }
    }
}
</style>