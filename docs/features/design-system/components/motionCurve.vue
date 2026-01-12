<script setup lang="ts">
import { ref } from 'vue';

// 動畫持續時間 (秒)
const duration = ref(0.5);

const animations = [
    {
        name: 'Fast In, Slow Out',
        var: '--cubic-FiSo',
        desc: '適合進場動畫，快速出現後緩慢定位 (類 iOS)。',
        bezier: 'cubic-bezier(.37, .99, .92, .96)'
    },
    {
        name: 'Fast In, Fast Out',
        var: '--cubic-FiFo',
        desc: '適合過場或背景變換，節奏明快不拖泥帶水。',
        bezier: 'cubic-bezier(.25, .65, .85, .45)'
    },
    {
        name: 'Single Recoil (回彈)',
        var: '--cubic-SiRo',
        desc: '帶有誇張的回彈效果，適合強調性互動 (如錯誤搖晃)。',
        bezier: 'cubic-bezier(.31, 1.26, .19, 1.11)'
    },
    {
        name: 'Smooth Motion',
        var: '--cubic-SiMo',
        desc: '緩進微彈，適合一般 UI 互動，如 Hover 放大。',
        bezier: 'cubic-bezier(.3, 1, .94, 1.1)'
    },
];
</script>

<template>
  <div class="motion-container">

    <div class="control-panel">
        <label class="control-label">
            <span>Duration:</span>
            <input
                type="range"
                v-model.number="duration"
                min="0.05"
                max="2"
                step="0.1"
                class="duration-slider"
            >
            <input
                type="number"
                v-model.number="duration"
                class="duration-input"
                min="0.1"
                step="0.1"
            >
            <span>s</span>
        </label>
        <p class="hint">Hover over cards to play animation</p>
    </div>

    <div class="motion-grid">
        <div v-for="anim in animations" :key="anim.var" class="motion-card">

            <div class="motion-header">
                <span class="motion-name">{{ anim.name }}</span>
                <code class="motion-var">{{ anim.var }}</code>
            </div>

            <p class="motion-desc">{{ anim.desc }}</p>

            <div class="motion-track">
                <div
                    class="motion-ball main"
                    :style="{
                        transitionTimingFunction: `var(${anim.var})`,
                        transitionDuration: `${duration}s`
                    }"
                ></div>

                <div
                    class="motion-ball ghost"
                    :style="{ transitionDuration: `${duration}s` }"
                ></div>
            </div>

            <div class="motion-code">
                {{ anim.bezier }}
            </div>
        </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.motion-container {
    width: 100%;
}

// --- Control Panel ---
.control-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    background: var(--vp-c-bg-soft);
    padding: 1rem;
    border: 1px dashed var(--vp-c-divider);
    border-radius: 8px;
    margin-bottom: 2rem;

    .control-label {
        display: flex;
        gap: 0.8rem;
        align-items: center;
        color: var(--vp-c-text-1);
        font-weight: 600;
    }

    .duration-slider {
        min-width: 120px;
        cursor: pointer;
        accent-color: var(--vp-c-brand);
    }

    .duration-input {
        background: var(--vp-c-bg);
        width: 60px;
        padding: 4px 8px;
        border: 1px solid var(--vp-c-divider);
        border-radius: 4px;
        color: var(--vp-c-text-1);
        font-family: var(--font-monospace);

        &:focus {
            border-color: var(--vp-c-brand);
            outline: none;
        }
    }

    .hint {
        margin: 0;
        color: var(--vp-c-text-3);
        font-size: 0.85rem;
    }
}

.motion-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
}

.motion-card {
    background: var(--vp-c-bg-soft);
    padding: 1.5rem;
    border: 1px solid var(--vp-c-divider);
    border-radius: 12px;
    cursor: default;
    transition: border-color 0.3s, box-shadow 0.3s;

    &:hover {
        border-color: var(--vp-c-brand);
        box-shadow: 0 4px 12px rgb(0,0,0,5%);

        // --- Hover 時觸發動畫 ---
        .motion-ball {
            // [Bug 修復]
            // 只要設定 left 就好，不要再加 transform，否則會跑過頭
            // 計算：100% 寬度 - 32px(球寬) - 4px(右邊 padding)
            left: calc(100% - 32px - 4px);
        }

        .motion-ball.ghost {
            opacity: 0.5;
        }
    }

    .motion-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 0.5rem;

        .motion-name {
            color: var(--vp-c-text-1);
            font-size: 1rem;
            font-weight: 700;
        }
        .motion-var {
            background: var(--vp-c-bg);
            padding: 2px 6px;
            border-radius: 4px;
            color: var(--vp-c-brand);
            font-family: var(--font-monospace);
            font-size: 0.75rem;
        }
    }

    .motion-desc {
        min-height: 2.5em;
        margin-bottom: 1.5rem;
        color: var(--vp-c-text-2);
        font-size: 0.85rem;
        line-height: 1.5;
    }

    .motion-track {
        position: relative;
        display: flex;
        align-items: center;
        background: var(--vp-c-bg);
        height: 48px;
        padding: 0 4px;
        border: 1px solid var(--vp-c-divider);
        border-radius: 24px;
        margin-bottom: 1rem;
        box-shadow: inset 0 2px 4px rgb(0,0,0,2%);
    }

    .motion-ball {
        position: absolute;
        left: 4px; // 初始位置 (左邊 padding)
        width: 32px;
        height: 32px;
        border-radius: 50%;

        // [重點] 這裡只設定要過渡的屬性
        // duration 交給 inline style 控制
        transition-property: left;

        &.main {
            background: var(--color-primary-1);
            box-shadow: 0 2px 6px rgb(0,0,0,20%);
            z-index: 2;
        }

        &.ghost { // liner 軌跡球
            background: var(--color-adorn); // var(--vp-c-text-3);
            transform: scale(0.8);
            transition-delay: 0s;
            transition-timing-function: linear !important; // Ghost 永遠是線性
            opacity: 0;
            z-index: 1;
        }
    }

    .motion-code {
        color: var(--vp-c-text-3);
        font-family: var(--font-monospace);
        font-size: 0.75rem;
        text-align: right;
        opacity: 0.8;
    }
}
</style>