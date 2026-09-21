<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Html } from '@tresjs/cientos';

const { activeLabelNode = {
    name: 'title',
    type: 'star', // 或 'star'
}} = defineProps<{
    activeLabelNode: {
        name: string;
        type: 'planet' | 'star';
    } | null;
}>();


// 1. 宣告一個內部 ref 用來抓取真實的 Tres 3D 物件
const labelGroupRef = ref(null);

// 標題文字，用於打字機效果
const displayText = ref('');
const fullText = computed(() => activeLabelNode?.name || '');
let typingInterval: ReturnType<typeof setInterval> | null = null;

// 啟動打字機效果
const startTyping = () => {
    if (typingInterval) clearInterval(typingInterval);
    displayText.value = '';
    let i = 0;
    typingInterval = setInterval(() => {
        if (i < fullText.value.length) {
            displayText.value += fullText.value.charAt(i);
            i++;
        } else {
            if (typingInterval) clearInterval(typingInterval);
        }
    }, 50); // 打字速度，可自行調整
};

// 當標題內容改變時，重新啟動打字機
watch(fullText, (newText) => {
    if (newText) {
        startTyping();
    }
}, { immediate: true });

// 2. 關鍵：把這個 3D 物件暴露給父元件
defineExpose({
    tresObject: labelGroupRef
});
</script>

<template>
    <TresGroup ref="labelGroupRef" v-if="activeLabelNode">
        <Html
            center transform sprite
            :distance-factor="15"
            wrapper-class="no-pointer-events"
        >
            <div
                v-if="activeLabelNode"
                class="hud-container is-active"
                :class="{ 'is-star': activeLabelNode.type === 'star' }"
            >
                <div class="sci-fi-box">
                    <div class="corner top-left"></div>
                    <div class="corner top-right"></div>
                    <div class="corner bottom-left"></div>
                    <div class="corner bottom-right"></div>
                </div>
                <div class="label-container">
                    <Transition name="typing">
                        <div class="label-text" v-show="displayText.length > 0">
                            {{ displayText }}<span class="cursor">_</span>
                        </div>
                    </Transition>
                </div>
            </div>
        </Html>
    </TresGroup>
</template>

<style lang="scss" scoped>
    // 混入 (Mixin) 定義 (假設這是在你的全域樣式檔案中)
    @mixin setFlex($justify: center, $align: center) {
        display: flex;
        align-items: $align;
        justify-content: $justify;
    }

    // 變數定義 (假設這是在你的全域樣式檔案中)
    $font-size-xl: 14px;
    $hud-primary: #00f0ff;
    $hud-secondary: #FDB813;

    .hud-container {
        position: relative;

        // 將容器視為 3D 座標的絕對中心點 0x0
        width: 0;
        height: 0;
        pointer-events: none !important;
        @include setFlex(center, center); // 確保內容預設置中

        .sci-fi-box {
            position: absolute;

            // 關鍵 1：利用 50% 與 translate 達成真正的物理置中
            top: 50%;
            left: 50%;

            // 這裡設定瞄準框的實際大小，你可以綁定 var(--box-size) 讓 Vue 動態控制
            width: 80px;
            height: 80px;
            transform: translate(-50%, -50%);

            // 鎖定動畫
            animation: lock-on 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;

            .corner {
                position: absolute;
                background: transparent;
                width: 16px;
                height: 16px;
                border-style: solid;
                border-color: #f05;

                // 建議改用 drop-shadow 效能更好，光暈也更均勻
                filter: drop-shadow(0 0 4px #f05);
            }

            // 關鍵 2：貼齊外框的四個角，不使用負數外推
            .top-left { top: -4px; left: -4px; border-width: 3px 0 0 3px; }
            .top-right { top: -4px; right: -4px; border-width: 3px 3px 0 0; }
            .bottom-left { bottom: -4px; left: -4px; border-width: 0 0 3px 3px; }
            .bottom-right { right: -4px; bottom: -4px; border-width: 0 3px 3px 0; }
        }

        // 標題容器，用於定位
        .label-container {
            position: absolute;
            top: -50px;

            // 將標題移到瞄準框的右側
            left: calc(50% + 50px + 20px); // 50px 是瞄準框寬度的一半加上間距
            display: flex;
            align-items: center;
            width: 200px;
            max-width: 250px; // 限制最大寬度以強制換行
        }

        .label-text {
            background: rgb(0, 0, 0, 80%);
            padding: 6px 12px;
            border: 1px solid rgb(0, 240, 255, 30%); // 加個微弱的邊框更有科技感
            border-radius: 4px;
            color: #fff;
            font-family: 'Courier New', monospace;
            font-size: var(--font-size-xl);
            line-height: 1.35;
            white-space: pre-wrap; // 允許自動換行
            text-shadow: 0 0 8px rgb(0, 240, 255, 80%);

            // 打字機遊標
            .cursor {
                margin-left: 2px;
                color: $hud-primary;
                animation: blink 1s step-end infinite;
            }
        }

        &.is-star {
            .label-text {
                border-color: rgb(253, 184, 19, 30%);
                color: $hud-secondary;
                text-shadow: 0 0 5px rgb(253, 184, 19, 50%);
                .cursor { color: $hud-secondary; }
            }
            .sci-fi-box .corner {
                border-color: $hud-secondary;
                filter: drop-shadow(0 0 4px $hud-secondary);
            }
        }
    }

    // 鎖定動畫 keyframes
    @keyframes lock-on {
        0% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
        }
        60% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
    }

    // 打字機遊標閃爍動畫
    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
    }

    // 打字機 Transition (淡入效果)
    .typing-enter-active {
        transition: opacity 0.5s ease;
    }
    .typing-enter-from {
        opacity: 0;
    }
</style>