<script setup lang="ts">
    import { OrbitControls, Stars } from '@tresjs/cientos';
    import GalaxyModel from './galaxyModel.vue';
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { TresCanvas } from '@tresjs/core'
    import { useRouter } from 'vitepress';
    import { EffectComposerPmndrs , BloomPmndrs } from '@tresjs/post-processing';

    // 在這裡獲取數據 (父層 Context 是正常的)
    const siteData = useSiteData();
    const router = useRouter(); // ✅ 初始化 Router

    const navigateHandler = (url: string) => {
        console.log('Navigating to:', url);
        router.go(url);
    };

    const galaxyModelRef = ref<any>(null);
    const lastActiveNode = ref<any>(null); // 紀錄最後一個被點擊的 node


    // #region [P] HUD
    const isHudVisible = ref(true); // HUD 開關
    const selectedNodeInfo = reactive({
        title: '未選取天體',
        type: 'N/A',
        tags: [] as string[],
        url: ''
    });

    // 當 GalaxyModel 觸發 hover 或點擊時，更新資訊
    const handleNodeHover = (node: any) => {
        if (!node) return;

        lastActiveNode.value = node;

        selectedNodeInfo.title = node.name;
        selectedNodeInfo.type = node.type === 'star' ? '恆星系統' : '文章行星';
        selectedNodeInfo.tags = node.tags || [];
        selectedNodeInfo.url = node.url || '';
    };

    const toggleHud = () => {
        isHudVisible.value = !isHudVisible.value;
    };


    // [-] zoom 控制
    const resetCamera = () => {
        galaxyModelRef.value?.resetView();

        // lastActiveNode.value = null;
        // selectedNodeInfo.title = 'SYSTEM_IDLE';
        // selectedNodeInfo.type = 'WAITING_FOR_INPUT';
        // selectedNodeInfo.tags = [];
        // selectedNodeInfo.url = '';
    };

    const zoomToActive = () => {
        if (lastActiveNode.value) {
            galaxyModelRef.value?.focusOnNode(lastActiveNode.value);
        }
    };
    // #endregion

    // #region [P] 滾輪控制
    const zoomSpeed = ref(1); // 預設縮放速度

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            zoomSpeed.value = 4; // 按住 Ctrl 時速度變 4 倍
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (!e.ctrlKey && !e.metaKey) {
            zoomSpeed.value = 1; // 放開時恢復
        }
    };

    // #endregion

    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    });
</script>

<template>
    <div class="galaxy-wrapper">
        <div class="galaxy-canvas-wrapper">
            <TresCanvas window-size preset="realistic" alpha>
                <TresPerspectiveCamera
                    make-default
                    :position="[100, 50, 100]"
                    :look-at="[0, 0, 0]"
                    :fov="45"
                />

                <!-- 軌道控制器 -->
                <OrbitControls
                    make-default
                    :zoom-speed="zoomSpeed"
                    :enable-damping="true"
                    :damping-factor="0.05"
                    :min-distance="10"
                    :max-distance="500"
                />

                <!-- 光源 -->
                <TresAmbientLight :intensity="1" />
                <TresPointLight :position="[50, 50, 50]" :intensity="2" color="#ffffff" />

                <!-- 星星背景 -->
                <Stars :radius="150" :depth="50" :count="3000" :size="0.5" />

                <!-- 主要星球 -->
                <GalaxyModel
                    v-if="siteData"
                    :siteData="siteData"
                    @node-click="navigateHandler"
                    @node-hover="handleNodeHover"
                />

                <Suspense>
                    <EffectComposerPmndrs >
                    <BloomPmndrs
                        :luminance-threshold="0.1"
                        :luminance-smoothing="0.3"
                        :intensity="1.5"
                        :radius="0.6"
                        mipmap-blur
                    />
                    </EffectComposerPmndrs >
                </Suspense>
            </TresCanvas>
        </div>

        <Transition name="hud-fade">
            <div v-if="isHudVisible" class="hud-overlay">
                <aside class="hud-panel left-panel">
                    <div class="panel-header">OBJECT DATA</div>
                    <div class="panel-content">
                        <h2 class="text-glow">{{ selectedNodeInfo.title }}</h2>
                        <div class="info-row">
                            <span class="label">CLASSIFICATION:</span>
                            <span class="value">{{ selectedNodeInfo.type }}</span>
                        </div>
                        <div class="tag-cloud">
                            <span v-for="tag in selectedNodeInfo.tags" :key="tag" class="tag-chip">
                                # {{ tag }}
                            </span>
                        </div>
                    </div>
                </aside>

                <aside class="hud-panel right-panel">
                    <div class="panel-header">SYSTEM STATUS</div>
                    <div class="panel-content">
                        <div class="status-item">
                            <div class="label">SITEMAP PRIORITY</div>
                            <div class="bar-container"><div class="bar" style="width: 80%"></div></div>
                        </div>
                        <div class="action-list">
                            <button @click="navigateHandler(selectedNodeInfo.url)" class="btn-primary">
                                JUMP TO ORIGIN
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </Transition>

        <div class="hud-toggle-btn-box">
            <button class="hud-toggle-btn" :class="{ 'is-active': isHudVisible }" @click="toggleHud">
                <div class="scanner-line"></div>
                {{ isHudVisible ? 'TERMINAL ON' : 'TERMINAL OFF' }}
            </button>

            <button class="hud-toggle-btn" @click="resetCamera"> <div class="scanner-line"></div>[ RESET_VIEW ] </button>
            <button class="hud-toggle-btn" :disabled="!lastActiveNode" @click="zoomToActive" ><div class="scanner-line"></div> [ RE-FOCUS ] </button>
        </div>
    </div>
</template>

<style lang="scss">

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
    @include setFlex();
    right: 2rem;
    bottom: 2rem;
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