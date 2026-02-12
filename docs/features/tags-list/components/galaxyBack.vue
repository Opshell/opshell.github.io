<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { OrbitControls, Stars } from '@tresjs/cientos';
import { TresCanvas } from '@tresjs/core';
import { useRouter } from 'vitepress';
import { EffectComposerPmndrs, BloomPmndrs } from '@tresjs/post-processing';

import GalaxyModel from './galaxyModel.vue';
import HudPanel from './hudPanel.vue';
import HudCursor from './hudCursor.vue';
import { useSiteData } from '@shared/hooks/useSiteData';

// --- 外部 Hook 與 路由 ---
const siteData = useSiteData();
const router = useRouter();

// --- Refs ---
const galaxyModelRef = ref<any>(null);
const isHudVisible = ref(true);
const zoomSpeed = ref(1);

// #region [P] 狀態機管控 (State Machine)
type SystemStatus = 'IDLE' | 'HOVERING' | 'LOCKED';

const currentStatus = ref<SystemStatus>('IDLE');
const hoverTarget = ref<any>(null);  // 暫時性的預覽目標
const lockedTarget = ref<any>(null); // 點擊鎖定的目標

/**
 * 計算屬性：HUD 面板最終要顯示什麼
 */
const displayNodeInfo = computed(() => {
    const target = lockedTarget.value || hoverTarget.value;

    if (!target) {
        return {
            id: null,
            title: 'SYSTEM_IDLE',
            type: 'WAITING_FOR_INPUT',
            tags: [],
            url: '',
            val: 0,
            isLocked: false
        };
    }

    return {
        id: target.id,
        title: target.name,
        type: target.type === 'star' ? '恆星系統' : '文章行星',
        tags: target.tags || [],
        url: target.url || '',
        val: target.val || 1,
        isLocked: currentStatus.value === 'LOCKED'
    };
});

// Cursor 狀態
const isCursorHovering = computed(() => !!hoverTarget.value || !!lockedTarget.value);
const cursorScaleTarget = computed(() => displayNodeInfo.value.val);

// --- [關鍵新增] 計算關聯節點 ID 集合 (用於視覺過濾) ---
const relatedNodeIds = computed(() => {
    const ids = new Set<string>();
    const target = lockedTarget.value;

    if (!target) return ids;

    // 1. 加入自己
    ids.add(target.id);

    // 2. 如果選中的是行星 (文章)，加入它的 Tags (恆星)
    if (target.type === 'planet' && target.tags) {
        target.tags.forEach((tagName: string) => {
            ids.add(`tag-${tagName}`);
        });
    }

    // 3. 如果選中的是恆星 (Tag)，加入屬於它的文章 (行星)
    // 這邊需要遍歷 siteData.posts，這在大型數據下可能需要優化 (例如預先建立 Map)
    if (target.type === 'star' && siteData.posts) {
        siteData.posts.forEach((post: any) => {
            if (post.tags && post.tags.includes(target.name)) {
                ids.add(post.url);
            }
        });
    }

    return ids;
});

// --- [關鍵新增] 右側面板顯示的關聯恆星資料 ---
const relatedTagsInfo = computed(() => {
    if (!lockedTarget.value || lockedTarget.value.type !== 'planet') return [];

    // 找出這篇文章相關的所有 Tag 詳細數據
    return lockedTarget.value.tags.map((tagName: string) => {
        const tagData = siteData.tags.get(tagName);
        return {
            name: tagName,
            count: tagData ? tagData.count : 0
        };
    });
});
// #endregion

// #region [P] 互動事件處理 (Interaction)
const handleNodeHover = (node: any | null) => {
    if (currentStatus.value === 'LOCKED') return; // 鎖定時，不被 Hover 干擾

    if (node) {
        currentStatus.value = 'HOVERING';
        hoverTarget.value = node;
    } else {
        currentStatus.value = 'IDLE';
        hoverTarget.value = null;
    }
};

const handleNodeClick = (node: any) => {
    if (!node) return;

    // 如果點擊同一個，視為解除鎖定 (Optional)
    if (lockedTarget.value && lockedTarget.value.id === node.id) {
        // resetSystem(); // 看你的 UX 決定要不要這行
        return;
    }

    currentStatus.value = 'LOCKED';
    lockedTarget.value = node;
    hoverTarget.value = null;

    // 觸發 GalaxyModel 的相機跟隨
    galaxyModelRef.value?.focusOnNode(node);
};

const navigateHandler = (url: string) => {
    if (!url) return;
    console.log('Navigating to:', url);
    router.go(url);
};

const resetSystem = () => {
    currentStatus.value = 'IDLE';
    lockedTarget.value = null;
    hoverTarget.value = null;
    galaxyModelRef.value?.resetView();
};

const zoomToActive = () => {
    if (lockedTarget.value) {
        galaxyModelRef.value?.focusOnNode(lockedTarget.value);
    }
};

const toggleHud = () => isHudVisible.value = !isHudVisible.value;
// #endregion

// #region [P] 鍵盤監聽
const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) zoomSpeed.value = 4;
};
const handleKeyUp = (e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) zoomSpeed.value = 1;
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
});
onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
});
// #endregion
</script>

<template>
    <div class="galaxy-wrapper">
        <div class="galaxy-canvas-wrapper">
            <TresCanvas window-size preset="realistic" alpha>
                <TresPerspectiveCamera make-default :position="[100, 50, 100]" :look-at="[0, 0, 0]" :fov="45" />
                <OrbitControls
                    make-default
                    :zoom-speed="zoomSpeed"
                    :enable-damping="true"
                    :damping-factor="0.05"
                    :min-distance="10"
                    :max-distance="500"
                />

                <TresAmbientLight :intensity="1" />
                <TresPointLight :position="[50, 50, 50]" :intensity="2" color="#ffffff" />
                <Stars :radius="150" :depth="50" :count="3000" :size="0.5" />

                <GalaxyModel
                    ref="galaxyModelRef"
                    v-if="siteData"
                    :siteData="siteData"
                    :lockedId="lockedTarget?.id || null"
                    :relatedNodeIds="relatedNodeIds"
                    @node-click="handleNodeClick"
                    @node-hover="handleNodeHover"
                />

                <Suspense>
                    <EffectComposerPmndrs>
                        <BloomPmndrs :luminance-threshold="0.1" :luminance-smoothing="0.3" :intensity="1.5" :radius="0.6" mipmap-blur />
                    </EffectComposerPmndrs>
                </Suspense>
            </TresCanvas>
        </div>

        <Transition name="hud-fade">
            <div v-if="isHudVisible" class="hud-overlay">
                <aside class="aside left">
                    <HudPanel :title="`SYSTEM STATUS: ${currentStatus}`" icon="radar" side="left">
                        <div class="panel-content" :class="{ 'status-locked': displayNodeInfo.isLocked }">
                            <h3 class="text-glow">
                                <span v-if="displayNodeInfo.isLocked">🔒</span>
                                {{ displayNodeInfo.title }}
                            </h3>
                            <div class="info-row">
                                <span class="label">CLASSIFICATION:</span>
                                <span class="value">{{ displayNodeInfo.type }}</span>
                            </div>
                            <div class="tag-cloud">
                                <span v-for="tag in displayNodeInfo.tags" :key="tag" class="tag-chip">
                                    # {{ tag }}
                                </span>
                            </div>
                        </div>
                    </HudPanel>

                    <HudPanel v-if="displayNodeInfo.isLocked" title="NAVIGATION" icon="ads_click" side="left">
                        <div class="btn-box">
                             <button @click="navigateHandler(displayNodeInfo.url)" class="btn-primary">
                                JUMP TO ORIGIN
                            </button>
                            <button @click="resetSystem" class="hud-btn">
                                RELEASE TARGET
                            </button>
                        </div>
                    </HudPanel>
                </aside>

                <aside class="aside right-panel">

                    <HudPanel
                        v-if="displayNodeInfo.isLocked && displayNodeInfo.type === '文章行星'"
                        title="RELATED SYSTEMS"
                        icon="hub"
                        side="right"
                    >
                        <div class="panel-content">
                            <p class="text-tiny">DETECTED GRAVITATIONAL LINKS:</p>
                            <div v-for="tag in relatedTagsInfo" :key="tag.name" class="status-item">
                                <div class="label">{{ tag.name }}</div>
                                <div class="value">{{ tag.count }} NODES</div>
                                <div class="bar-container">
                                    <div class="bar" :style="{ width: Math.min(tag.count * 10, 100) + '%' }"></div>
                                </div>
                            </div>
                        </div>
                    </HudPanel>

                    <HudPanel title="SITEMAP ANALYTICS" icon="leaderboard" side="right">
                        <div class="panel-content">
                            <div class="status-item">
                                <div class="label">VISIBILITY PRIORITY</div>
                                <div class="bar-container">
                                    <div class="bar" :style="{ width: displayNodeInfo.isLocked ? '95%' : '20%' }"></div>
                                </div>
                            </div>
                        </div>
                    </HudPanel>
                </aside>
            </div>
        </Transition>

        <div class="hud-toggle-btn-box">
            <button class="hud-toggle-btn" :class="{ 'is-active': isHudVisible }" @click="toggleHud">
                <div class="scanner-line"></div>
                {{ isHudVisible ? 'TERMINAL ON' : 'TERMINAL OFF' }}
            </button>
            <button class="hud-toggle-btn" @click="resetSystem">
                <div class="scanner-line"></div>[ RESET_VIEW ]
            </button>
            <button class="hud-toggle-btn" :disabled="!lockedTarget" @click="zoomToActive">
                <div class="scanner-line"></div> [ RE-FOCUS ]
            </button>
        </div>

        <HudCursor :isHovering="isCursorHovering" :targetVal="cursorScaleTarget" />
    </div>
</template>

<style lang="scss">
/* 保持你的 SCSS 設定，增加 locked 樣式 */
.status-locked {
    background: linear-gradient(90deg, rgb(0, 240, 255, 10%) 0%, transparent 100%);
    padding-left: 10px;
    border-left: 2px solid #00f0ff;
}
.text-tiny {
    margin-bottom: 5px;
    font-size: 0.7rem;
    opacity: 0.6;
}
</style>

<style lang="scss">
    /* 全局隱藏滑鼠，因為我們要用自訂的 */
    body {
        background-color: #000; // 確保背景黑，Screen 混合模式才好看
        cursor: none;
    }

    // /* 確保連結或其他元素 hover 時也不會跑出系統滑鼠 */
    a, button, canvas {
        cursor: none !important;
    }

    .galaxy-wrapper {
        position: fixed;
        top: var(--vp-nav-height);
        left: 0;
        @include setSize(100vw, calc(100vh - var(--vp-nav-height)));
        z-index: 100;
    }

    /* galaxyBack.vue */
.galaxy-canvas-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0; /* 確保它在背景 */

    canvas {
        pointer-events: auto !important;
    }
}

/* 這一行可以留著，雙重保險 */
:deep(.tres-canvas) {
    pointer-events: auto;
}

/* galaxyBack.vue */
// 變數定義
$hud-primary: #00f0ff;
$hud-bg: rgb(0, 10, 20, 75%);
$hud-border: rgb(0, 240, 255, 50%);
$font-tech: 'Courier New', monospace; // 建議換成 Rajdhani 或 Orbitron 等 Google Fonts

.hud-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    justify-content: space-between;
    padding: 2rem;
    font-family: $font-tech;
    pointer-events: none; // 穿透
    z-index: 10;

    // 全局掃描線背景效果 (Optional)
    &::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(rgb(18, 16, 16, 0%) 50%, rgb(0, 0, 0, 25%) 50%), linear-gradient(90deg, rgb(255, 0, 0, 6%), rgb(0, 255, 0, 2%), rgb(0, 0, 255, 6%));
        background-size: 100% 2px, 3px 100%;
        pointer-events: none;
        z-index: -1;
    }
}

.hud-panel {
    display: flex;
    flex-direction: column;
    background: $hud-bg;
    backdrop-filter: blur(10px); // 磨砂質感

    // 科幻切角 (Clip-path)
    clip-path: polygon(
        0 0,
        100% 0,
        100% calc(100% - 20px),
        calc(100% - 20px) 100%,
        0 100%
    );
    width: 320px;
    border: 1px solid $hud-border;

    // 內發光邊框效果
    box-shadow: inset 0 0 20px rgb(0, 240, 255, 10%);
    color: #fff;
    pointer-events: auto;

    .panel-header {
        display: flex;
        gap: 10px;
        align-items: center;
        background: rgb(0, 240, 255, 10%);
        padding: 12px 16px;
        border-bottom: 1px solid $hud-border;
        color: $hud-primary;
        font-size: 0.9rem;
        font-weight: bold;
        letter-spacing: 2px;
    }

    .panel-content {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem;
    }
}

// 文字發光
.text-glow {
    margin: 0;
    color: #fff;
    font-size: 1.5rem;
    line-height: 1.2;
    text-shadow: 0 0 8px $hud-primary, 0 0 15px $hud-primary;
}

// 標籤與數值
.info-row {
    display: flex;
    justify-content: space-between;
    padding-bottom: 5px;
    border-bottom: 1px dashed rgb(255,255,255,20%);

    .label { color: rgb(255,255,255,60%); font-size: 0.8rem; }
    .value { color: $hud-primary; font-weight: bold; }
}

// Tag Cloud
.tag-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 5px;

    .tag-chip {
        background: rgb(0, 240, 255, 10%);
        padding: 2px 6px;
        border: 1px solid rgb(0, 240, 255, 30%);
        border-radius: 2px;
        color: $hud-primary;
        font-size: 0.7rem;
    }
}

// 閃爍點
.blinking-dot {
    background: #f05; // 警示紅
    width: 8px;
    height: 8px;
    border-radius: 50%;
    box-shadow: 0 0 5px #f05;
    animation: blink 1s infinite;
}
@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

// 按鈕樣式
.hud-btn {
    background: transparent;
    width: 100%;
    padding: 5px 10px;
    border: 1px solid rgb(255,255,255,30%);
    margin-bottom: 5px;
    color: rgb(255,255,255,80%);
    font-family: inherit;
    font-size: 0.75rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
        background: rgb(0, 240, 255, 20%);
        border-color: $hud-primary;
        box-shadow: 0 0 10px rgb(0, 240, 255, 30%);
        color: #fff;
    }

    &:disabled {
        border-color: transparent;
        cursor: not-allowed;
        opacity: 0.3;
    }
}

.btn-primary {
    @extend .hud-btn;
    background: rgb(0, 240, 255, 10%);
    padding: 10px;
    border: 1px solid $hud-primary;
    color: $hud-primary;
    font-size: 0.9rem;
    font-weight: bold;

    &:hover {
        background: $hud-primary;
        box-shadow: 0 0 20px $hud-primary;
        color: #000;
    }
}

// 進度條容器
.bar-container {
    position: relative;
    background: rgb(255,255,255,10%);
    height: 4px;
    margin-top: 5px;

    .bar {
        background: $hud-primary;
        height: 100%;
        box-shadow: 0 0 5px $hud-primary;
        transition: width 0.5s ease;
    }
}

// HUD 開關按鈕
.hud-toggle-btn-box {
    position: fixed;
    right: 2rem;
    bottom: 2rem;
    gap: 8px;
    @include setFlex();
}
.hud-toggle-btn {
    background: transparent;
    padding: 10px 20px;
    border: 1px solid #00f0ff;
    color: #00f0ff;
    cursor: pointer;
    transition: all 0.3s;
    z-index: 100;

    &:hover { background: rgb(0, 240, 255, 20%); }
    &.is-active { background: #00f0ff; color: #000; }
}
.text-glow {
    color: #fff;
    text-shadow: 0 0 10px rgb(0, 240, 255, 80%);
}



/* 動畫：HUD 登場 */
.hud-fade-enter-active, .hud-fade-leave-active {
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.hud-fade-enter-from, .hud-fade-leave-to {
    transform: translateY(20px) scale(0.98);
    opacity: 0;
}
</style>