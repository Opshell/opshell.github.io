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
        selectedNodeInfo.title = node.name;
        selectedNodeInfo.type = node.type === 'star' ? '恆星系統' : '文章行星';
        selectedNodeInfo.tags = node.tags || [];
        selectedNodeInfo.url = node.url || '';
    };

    const toggleHud = () => {
        isHudVisible.value = !isHudVisible.value;
    };
    // #endregion
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

        <button class="hud-toggle-btn" :class="{ 'is-active': isHudVisible }" @click="toggleHud">
            <div class="scanner-line"></div>
            {{ isHudVisible ? 'TERMINAL ON' : 'TERMINAL OFF' }}
        </button>
    </div>
</template>

<style lang="scss">
    /* galaxyBack.vue */
.galaxy-canvas-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
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
.hud-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    justify-content: space-between;
    padding: 2rem;
    font-family: 'Courier New', Courier, monospace;
    pointer-events: none; // 讓中間區域可以穿透點擊 3D
    z-index: 10;

    .hud-panel {
        background: rgb(0, 20, 40, 70%);
        backdrop-filter: blur(8px);

        // 削角設計
        clip-path: polygon(
            0 0, 100% 0,
            100% calc(100% - 20px),
            calc(100% - 20px) 100%,
            0 100%
        );
        width: 300px;
        height: fit-content;
        border: 1px solid #00f0ff;
        box-shadow: 0 0 15px rgb(0, 240, 255, 30%);
        color: #fff;
        pointer-events: auto; // 面板本身要能擋住滑鼠

        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgb(0, 240, 255, 20%);
            padding: 10px;
            border-bottom: 1px solid #00f0ff;
            font-weight: bold;

            &::before {
                content: '▶';
                color: #00f0ff;
                font-size: 0.8rem;
            }
        }

        .panel-content {
            padding: 1.5rem;

            h2 { margin: 0 0 1rem; color: #00f0ff; font-size: 1.4rem; }
            .info-row {
                margin-bottom: 0.8rem;
                .label { display: block; color: #aaa; font-size: 0.7rem; }
                .value { color: #fff; font-size: 0.9rem; }
            }
        }
    }
}

// HUD 開關按鈕
.hud-toggle-btn {
    position: fixed;
    right: 2rem;
    bottom: 2rem;
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