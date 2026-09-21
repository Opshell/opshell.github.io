<script setup lang="ts">
    import { ref, computed, onMounted, onUnmounted } from 'vue';
    import { OrbitControls, Stars } from '@tresjs/cientos';
    import { TresCanvas } from '@tresjs/core';
    import { useRouter } from 'vitepress';
    import { EffectComposerPmndrs, BloomPmndrs } from '@tresjs/post-processing';

    // 引入子元件
    import GalaxyModel from './galaxyModel.vue'; // 負責 3D 場景、物理模擬、運鏡
    import SvgHudPanel from './svgHudPanel.vue';     // 負責 2D 介面顯示 (左側/右側面板)
    import HudPanel from './hudPanel.vue';     // 負責 2D 介面顯示 (左側/右側面板)
    import HudCursor from './hudCursor.vue';   // 負責 跟隨滑鼠的動態游標
    import { useSiteData } from '@shared/hooks/useSiteData'; // 資料來源 Hook

    // #region [P] 初始化與資料 Init
    const siteData = useSiteData(); // 取得部落格文章與標籤資料
    const router = useRouter();     // VitePress 路由，用於跳轉頁面

    // Template Ref: 用來取得 <GalaxyModel /> 元件的實例
    // 這樣我們才能呼叫它裡面 defineExpose 出來的 focusOnNode() 和 resetView() 方法
    const galaxyModelRef = ref<any>(null);

    // UI 控制狀態
    const isHudVisible = ref(true); // 控制 HUD 面板是否顯示
    const zoomSpeed = ref(1);       // 控制相機縮放速度 (按住 Ctrl 加速用)

    // 用來儲存從 3D 世界算出來的 2D 座標
    const cursorOverridePos = ref<{x: number, y: number} | null>(null);
    // #endregion

    // #region [P] 有限狀態機 (Finite State Machine) State Machine
    // ----------------------------------------------------------------
    // 定義系統的三種核心狀態：
    // 1. IDLE: 閒置，滑鼠沒指到東西，星系自由旋轉。
    // 2. HOVERING: 懸停，滑鼠指在某個星球上，顯示預覽資訊。
    // 3. LOCKED: 鎖定，點擊了某個星球，相機已運鏡過去，顯示詳細資訊。
    type SystemStatus = 'IDLE' | 'HOVERING' | 'LOCKED';

    const currentStatus = ref<SystemStatus>('IDLE');
    const hoverTarget = ref<any>(null);  // 當前滑鼠指著誰
    const lockedTarget = ref<any>(null); // 當前鎖定著誰
    // #endregion

    // #region [P] 計算邏輯 Computed Logic

    /**
     * [HUD 資料轉換層]
     * 根據當前狀態 (Locked > Hover > Idle)，決定左側 HUD 面板要顯示什麼內容。
     * 這是 Single Source of Truth 的呈現轉換。
     */
    const displayNodeInfo = computed(() => {
        const target = lockedTarget.value || hoverTarget.value;

        if (!target) {
            return {
                id: null,
                title: 'SYSTEM_IDLE',
                type: 'WAITING_FOR_INPUT',
                tags: [], url: '', val: 0,
                image: null, excerpt: null, date: null, category: null, coords: null,
                isLocked: false
            };
        }

        // 格式化 3D 座標，讓它看起來像真實的遙測數據
        const coords = target.x !== undefined
            ? `[X: ${target.x.toFixed(1)} Y: ${target.y.toFixed(1)} Z: ${target.z.toFixed(1)}]`
            : '[CALCULATING...]';

        return {
            id: target.id,
            title: target.name,
            type: target.type === 'star' ? '恆星系統 (TAG_CLUSTER)' : '文章行星 (DATA_NODE)',
            tags: target.tags || [],
            url: target.id || '',
            val: target.val || 1,
            // 以下為新增的實體資料
            image: target.image || null,
            excerpt: target.excerpt || (target.type === 'star' ? `檢測到高密度標籤聚合體。質量等級：${target.val}` : 'No data.'),
            date: target.date || 'UNKNOWN_ERA',
            category: target.category ? target.category.join(' / ') : 'UNCLASSIFIED',
            coords: coords,
            isLocked: currentStatus.value === 'LOCKED'
        };
    });

    /**
     * [關聯計算]
     * 計算出哪些節點與當前鎖定目標「有關聯」。
     * GalaxyModel 會拿這個 Set 去決定哪些星球要保持亮著，哪些要變暗。
     */
    const relatedNodeIds = computed(() => {
        const ids = new Set<string>();
        const target = lockedTarget.value;

        // 如果沒鎖定，回傳空集合 (代表全部都亮，或者由 Model 決定預設行為)
        if (!target || !siteData) return ids;

        // 1. 自己一定相關
        ids.add(target.id);

        // 2. 如果鎖定的是「行星 (文章)」，找出它所屬的「恆星 (Tags)」
        if (target.type === 'planet' && target.tags) {
            target.tags.forEach((tagName: string) => ids.add(`tag-${tagName}`));
        }

        // 3. 如果鎖定的是「恆星 (Tag)」，找出繞著它轉的「行星 (文章)」
        if (target.type === 'star' && siteData.posts) {
            siteData.posts.forEach((post: any) => {
                if (post.tags && post.tags.includes(target.name)) ids.add(post.url);
            });
        }
        return ids;
    });

    /**
     * [右側面板數據]
     * 如果鎖定的是「恆星 (Tag)」，顯示該 Tag 下有多少文章的統計數據。
     */
    const relatedTagsInfo = computed(() => {
        if (!lockedTarget.value || lockedTarget.value.type !== 'planet' || !siteData || !siteData.tags) return [];

        return lockedTarget.value.tags.map((tagName: string) => {
            const tagData = siteData.tags.get(tagName);
            return { name: tagName, count: tagData ? tagData.count : 0 };
        });
    });

    /**
     * [游標狀態對映]
     * 將系統的複雜狀態簡化為游標的三種視覺狀態：
     * - LOCKED: 游標變為紅色瞄準框
     * - HOVER: 游標變為白色十字
     * - IDLE: 游標變為青色旋轉圈
     */
    const cursorStatus = computed(() => {
        if (currentStatus.value === 'LOCKED') return 'LOCKED';
        if (currentStatus.value === 'HOVERING') return 'HOVER';
        return 'IDLE';
    });

    /**
     * [游標大小]
     * 讓游標根據目標物體的大小 (val) 自動縮放，產生「包覆感」。
     */
    const cursorScaleTarget = computed(() => displayNodeInfo.value.val);
    // #endregion

    // #region [P] 事件處理 Event Handlers

    /**
     * 處理來自 GalaxyModel 的 Hover 事件
     * @param node - 被 Hover 的節點，如果是 null 代表離開
     */
    const handleNodeHover = (node: any | null) => {
        // 如果已經鎖定目標，忽略所有 Hover 行為 (專注模式)
        if (currentStatus.value === 'LOCKED') return;

        if (node) {
            currentStatus.value = 'HOVERING';
            hoverTarget.value = node;
        } else {
            currentStatus.value = 'IDLE';
            hoverTarget.value = null;
        }
    };

    /**
     * 處理來自 GalaxyModel 的點擊事件
     * 這是觸發運鏡與鎖定的核心入口
     */
    const handleNodeClick = (node: any) => {
        if (!node) return;

        // [Optional Logic] 如果點擊的是當前已經鎖定的目標，是否要解除鎖定？
        // 目前邏輯：不做事，或者可以觸發 "Re-focus"
        if (lockedTarget.value && lockedTarget.value.id === node.id) {
            // resetSystem(); // 如果想點兩下解除鎖定，可以開這行
            return;
        }

        // 1. 更新狀態機
        currentStatus.value = 'LOCKED';
        lockedTarget.value = node;
        hoverTarget.value = null; // 鎖定時清空 hover

        // 2. 指揮 3D 視圖進行運鏡 (呼叫子元件暴露的方法)
        galaxyModelRef.value?.focusOnNode(node);
    };

    /**
     * 點擊背景 (宇宙虛空) 時觸發
     * 用於解除鎖定，退回全景
     */
    const handleBackgroundClick = () => {
        // 只有在鎖定狀態下點背景才有用，避免誤觸
        if (currentStatus.value === 'LOCKED') {
            resetSystem();
        }
    };

    /**
     * 系統重置
     * 清空所有鎖定狀態，並指揮相機飛回原點
     */
    const resetSystem = () => {
        currentStatus.value = 'IDLE';
        lockedTarget.value = null;
        hoverTarget.value = null;
        cursorOverridePos.value = null; // [新增] 釋放游標
        galaxyModelRef.value?.resetView(); // 呼叫子元件飛回原點
    };

    // 處理頁面跳轉 (點擊 HUD 上的 "JUMP TO ORIGIN" 按鈕)
    const navigateHandler = (url: string) => {
        if (!url) return;

        window.open(url, '_blank');
        // router.go(url);
    };

    const copyUrlHandler = async (path: string) => {
        try {
            const fullUrl = `${window.location.origin}${path}`;
            await navigator.clipboard.writeText(fullUrl);
            // 這裡可以觸發一個 Toast 或改變按鈕文字提示「COPIED!」
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    const toggleHud = () => isHudVisible.value = !isHudVisible.value;

    // 手動觸發重新聚焦 (用於 HUD 按鈕)
    const zoomToActive = () => {
        if (lockedTarget.value) galaxyModelRef.value?.focusOnNode(lockedTarget.value);
    };

    // [新增] 處理來自 GalaxyModel 的座標更新
    const handleTargetPosUpdate = (pos: {x: number, y: number} | null) => {
        // 只有在 LOCKED 狀態下才接收座標更新
        // 這樣可以避免在切換狀態瞬間的閃爍
        if (currentStatus.value === 'LOCKED') {
            cursorOverridePos.value = pos;
        } else {
            cursorOverridePos.value = null;
        }
    };

    // #endregion

    // #region [P] 右側面板邏輯 (Right HUD Logic)

    // 1. 當前右側面板選中的 Tab (Tag 名稱)
    const activeRightTab = ref<string | null>(null);

    // 2. 監聽目標改變，自動切換 Tab
    // 如果鎖定了一顆行星，自動預設選中它的第一個 Tag
    watch(lockedTarget, (newTarget) => {
        if (!newTarget) {
            activeRightTab.value = null;
            return;
        }
        if (newTarget.type === 'planet' && newTarget.tags && newTarget.tags.length > 0) {
            activeRightTab.value = newTarget.tags[0];
        } else if (newTarget.type === 'star') {
            activeRightTab.value = newTarget.name;
        }
    }, { immediate: true });

    // 3. 計算當前 Tab 下的最新 5 篇文章 (Orbiting Planets)
    const activeTabPosts = computed(() => {
        if (!activeRightTab.value || !siteData || !siteData.tags || !siteData.posts) return [];

        const tagData = siteData.tags.get(activeRightTab.value);
        if (!tagData) return [];

        // 從 postUrls 抓取真實的文章資料
        const posts = tagData.postUrls
            .map(url => siteData.posts.get(url))
            .filter(Boolean) as any[]; // 過濾掉 undefined

        // 按照日期排序 (最新到最舊)
        posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 取前 5 筆
        return posts.slice(0, 5);
    });

    // 4. 計算全宇宙能量矩陣 (Top 6 標籤)
    const energyMatrixData = computed(() => {
        if (!siteData || !siteData.tags) return [];

        // 將 Map 轉為 Array，並依照文章數量 (count) 降冪排序
        const tagsArray = Array.from(siteData.tags.entries()).map(([name, data]) => ({
            name,
            count: data.count
        }));

        tagsArray.sort((a, b) => b.count - a.count);
        return tagsArray.slice(0, 6); // 顯示前 6 大星系
    });

    // 能量磚顏色計算函數
    const getEnergyColorClass = (count: number) => {
        if (count >= 100) return 'energy-danger'; // 紅色
        if (count >= 10) return 'energy-warning'; // 黃色
        return 'energy-normal';                   // 青藍色
    };

    // 計算需要幾個能量磚 (每 1 磚 = 1 篇，超過 10 篇進位為 Warning，超過 100 篇進位為 Danger)
    // 這裡我們視覺上最多顯示 10 塊磚，純視覺表示
    const getEnergyBlocks = (count: number) => {
        if (count === 0) return 0;
        if (count >= 100) return Math.min(Math.ceil(count / 20), 10); // 假設每 20 篇一塊紅磚
        if (count >= 10) return Math.min(Math.ceil(count / 5), 10);   // 假設每 5 篇一塊黃磚
        return Math.min(count, 10);                                   // 1 篇 1 塊藍磚
    };
    // #endregion

    // #region [P] 鍵盤監聽 Keyboard Events
    // 按住 Ctrl/Meta 鍵時，加快 OrbitControls 的縮放速度
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) zoomSpeed.value = 4;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (!e.ctrlKey && !e.metaKey) zoomSpeed.value = 1;
    };

    /** 自訂游標只在這一頁，離開就要把系統游標還回去（不然整站都看不到滑鼠） */
    const HIDE_CURSOR_CLASS = 'galaxy-hide-cursor';

    onMounted(() => {
        document.body.classList.add(HIDE_CURSOR_CLASS);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    });
    onUnmounted(() => {
        document.body.classList.remove(HIDE_CURSOR_CLASS);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    });
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
                <OrbitControls make-default :zoom-speed="zoomSpeed" :enable-damping="true" :damping-factor="0.05" :min-distance="10" :max-distance="500" />
                <TresAmbientLight :intensity="1" />
                <TresPointLight :position="[50, 50, 50]" :intensity="2" color="#ffffff" />
                <Stars :radius="250" :depth="50" :count="3000" :size="0.5" />

                <GalaxyModel
                    ref="galaxyModelRef"
                    v-if="siteData"
                    v-memo="[siteData, lockedTarget?.id, relatedNodeIds]"
                    :siteData="siteData"
                    :lockedId="lockedTarget?.id || null"
                    :relatedNodeIds="relatedNodeIds"
                    @node-click="handleNodeClick"
                    @node-hover="handleNodeHover"
                    @bg-click="handleBackgroundClick"
                    @update-target-pos="handleTargetPosUpdate"
                />

                <Suspense>
                    <EffectComposerPmndrs>
                        <BloomPmndrs
                            :luminance-threshold="0.1"
                            :luminance-smoothing="0.3"
                            :intensity="1.5"
                            :radius="0.6"
                            mipmap-blur
                        />
                    </EffectComposerPmndrs>
                </Suspense>
            </TresCanvas>
        </div>

        <Transition name="hud-fade">
            <div v-if="isHudVisible" class="hud-overlay">
                <aside class="aside left">
                    <SvgHudPanel title="TARGET IDENTIFIED" icon="radar" side="left">
                        <div class="panel-content" :class="{ 'status-locked': displayNodeInfo.isLocked }">
                            <h3 class="text-glow" style="margin-bottom: 8px;">
                                <span v-if="displayNodeInfo.isLocked">🔒</span>
                                {{ displayNodeInfo.title }}
                            </h3>

                            <div class="info-row">
                                <span class="label">CLASSIFICATION:</span>
                                <span class="value">{{ displayNodeInfo.type }}</span>
                            </div>

                            <div v-if="displayNodeInfo.image" class="target-thumbnail">
                                <img :src="displayNodeInfo.image" alt="target image" />
                                <div class="scan-overlay"></div>
                            </div>

                            <div class="target-excerpt">
                                <p>> {{ displayNodeInfo.excerpt }}</p>
                            </div>

                            <div class="tag-cloud">
                                <span v-for="tag in displayNodeInfo.tags" :key="tag" class="tag-chip">
                                    # {{ tag }}
                                </span>
                            </div>
                        </div>
                    </SvgHudPanel>

                    <HudPanel title="COMMAND TERMINAL" icon="terminal" side="left">
                        <div class="btn-box">
                            <button
                                v-if="displayNodeInfo.url"
                                @click="navigateHandler(displayNodeInfo.url)"
                                class="btn-primary"
                            >
                                [INITIATE_JUMP] 前往節點
                            </button>
                            <button
                                v-if="displayNodeInfo.url"
                                @click="copyUrlHandler(displayNodeInfo.url)"
                                class="hud-btn"
                            >
                                COPY COORDINATES
                            </button>
                            <button @click="resetSystem" class="hud-btn alert-btn">
                                ABORT / RELEASE TARGET
                            </button>
                        </div>
                    </HudPanel>

                    <HudPanel title="TELEMETRY METADATA" icon="memory" side="left">
                        <div class="panel-content" style="gap: 8px; padding-top: 5px;">
                            <div class="info-row">
                                <span class="label">SECTOR (CATEGORY):</span>
                                <span class="value">{{ displayNodeInfo.category }}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">DISCOVERED_AT:</span>
                                <span class="value">{{ displayNodeInfo.date }}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">SPATIAL_COORDS:</span>
                                <span class="value tech-font">{{ displayNodeInfo.coords }}</span>
                            </div>
                        </div>
                    </HudPanel>
                </aside>

                <aside class="aside right-panel">
                    <SvgHudPanel
                        v-if="displayNodeInfo.isLocked"
                        title="ORBITAL NETWORK"
                        icon="hub"
                        side="right"
                    >
                        <div class="panel-content orbital-network">
                            <div v-if="displayNodeInfo.type === '文章行星'" class="hud-tabs">
                                <button
                                    v-for="tag in displayNodeInfo.tags"
                                    :key="tag"
                                    class="tab-btn"
                                    :class="{ 'is-active': activeRightTab === tag }"
                                    @click="activeRightTab = tag"
                                >
                                    {{ tag }}
                                </button>
                            </div>

                            <p class="text-tiny text-glow mt-2">LATEST ORBITING NODES:</p>

                            <ul class="post-list">
                                <li
                                    v-for="post in activeTabPosts"
                                    :key="post.url"
                                    class="post-item"
                                    @click="handleNodeClick({ id: post.url })"
                                >
                                    <div class="post-date">{{ post.date.slice(0, 10) }}</div>
                                    <div class="post-title">{{ post.title }}</div>
                                </li>
                            </ul>
                        </div>
                    </SvgHudPanel>

                    <SvgHudPanel title="GALAXY ENERGY MATRIX" icon="bar_chart" side="right">
                        <div class="panel-content energy-matrix">
                            <div v-for="tag in energyMatrixData" :key="tag.name" class="energy-row">
                                <div class="energy-label">
                                    <span>{{ tag.name }}</span>
                                    <span class="energy-count">{{ tag.count }}</span>
                                </div>
                                <div class="energy-blocks" :class="getEnergyColorClass(tag.count)">
                                    <div
                                        v-for="i in 10"
                                        :key="i"
                                        class="block"
                                        :class="{ 'is-active': i <= getEnergyBlocks(tag.count) }"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </SvgHudPanel>

                    <HudPanel title="GALAXY ENERGY MATRIX" icon="bar_chart" side="right">
                        <div class="panel-content energy-matrix">
                            <div v-for="tag in energyMatrixData" :key="tag.name" class="energy-row">
                                <div class="energy-label">
                                    <span>{{ tag.name }}</span>
                                    <span class="energy-count">{{ tag.count }}</span>
                                </div>
                                <div class="energy-blocks" :class="getEnergyColorClass(tag.count)">
                                    <div
                                        v-for="i in 10"
                                        :key="i"
                                        class="block"
                                        :class="{ 'is-active': i <= getEnergyBlocks(tag.count) }"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </HudPanel>
                </aside>
            </div>
        </Transition>

        <div class="hud-toggle-btn-box">
             <button class="hud-toggle-btn" :class="{ 'is-active': isHudVisible }" @click="toggleHud">
                <div class="scanner-line"></div>{{ isHudVisible ? 'TERMINAL ON' : 'TERMINAL OFF' }}
            </button>
            <button class="hud-toggle-btn" @click="resetSystem"><div class="scanner-line"></div>[ RESET_VIEW ]</button>
            <button class="hud-toggle-btn" :disabled="!lockedTarget" @click="zoomToActive"><div class="scanner-line"></div> [ RE-FOCUS ]</button>
        </div>

        <HudCursor :status="cursorStatus" :targetVal="cursorScaleTarget" :overridePosition="cursorOverridePos" />
    </div>
</template>

<style lang="scss">
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

    /* Target Thumbnail Styles */
.target-thumbnail {
    position: relative;
    background: #000;
    width: 100%;
    height: 120px;
    border: 1px solid rgb(0, 240, 255, 30%);
    margin: 10px 0;
    overflow: hidden;

    img {
        width: 100%;
        height: 100%;
        transition: all 0.3s ease;
        filter: grayscale(80%) sepia(20%) hue-rotate(140deg); // 轉成科幻青藍色調
        opacity: 0.7;
        object-fit: cover;
    }

    .scan-overlay {
        position: absolute;
        top: 0; left: 0;
        background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgb(0, 240, 255, 10%) 3px,
            rgb(0, 240, 255, 10%) 3px
        ); width: 100%; height: 100%;
        pointer-events: none;
    }

    &:hover img {
        transform: scale(1.05);
        filter: grayscale(0%) sepia(0%);
        opacity: 1;
    }
}

/* Excerpt Styles */
.target-excerpt {
    background: rgb(0, 240, 255, 5%);
    padding: 8px 12px;
    border-left: 2px solid var(--hud-color);
    margin-bottom: 12px;

    p {
        margin: 0;
        color: rgb(255, 255, 255, 85%);
        font-family: 'Courier New', monospace;
        font-size: 0.8rem;
        line-height: 1.4;
    }
}

/* Button override for Alert */
.alert-btn {
    border-color: rgb(255, 0, 85, 30%);
    color: #f05;
    &:hover:not(:disabled) {
        background: rgb(255, 0, 85, 20%);
        border-color: #f05;
        box-shadow: 0 0 10px rgb(255, 0, 85, 30%);
        color: #fff;
    }
}

.tech-font {
    font-family: 'Courier New', monospace;
    letter-spacing: -0.5px;
}
</style>

<style lang="scss">
    /* 隱藏滑鼠，因為星系頁要用自訂的。
       這個 style 區塊沒有 scoped，寫成 body{} 的話整個站都會套用——
       這支元件一載入，所有頁面（文章、後台）都看不到系統游標。
       所以掛在一個 class 上，只有這一頁在的時候才加上去（見 onMounted） */
    body.galaxy-hide-cursor {
        background-color: #000; // 確保背景黑，Screen 混合模式才好看
        cursor: none;

        /* 連結或其他元素 hover 時也不要跑出系統滑鼠 */
        a, button, canvas {
            cursor: none !important;
        }
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
        position: fixed;
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

            // padding: 1.5rem;
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

<style lang="scss">
    /* 右側面板共用 Utilities */
    .mt-2 { margin-top: 10px; }

    /* 科幻 Tabs 樣式 */
    .hud-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgb(0, 240, 255, 30%);
        margin-bottom: 10px;

        .tab-btn {
            background: transparent;
            clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%); // 傾斜切角
            padding: 4px 12px;
            border: 1px solid rgb(0, 240, 255, 30%);
            color: rgb(255, 255, 255, 60%);
            font-family: Orbitron, 'Courier New', monospace;
            font-size: 0.75rem;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.3s;

            &:hover {
                background: rgb(0, 240, 255, 10%);
                color: #00f0ff;
            }

            &.is-active {
                background: rgb(0, 240, 255, 20%);
                border-color: #00f0ff;
                box-shadow: inset 0 0 8px rgb(0, 240, 255, 50%);
                color: #00f0ff;
                text-shadow: 0 0 5px #00f0ff;
            }
        }
    }

    /* 關聯文章列表 (可點擊跳躍) */
    .post-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 0;
        margin: 0;
        list-style: none;

        .post-item {
            background: rgb(0, 0, 0, 40%);
            padding: 6px 10px;
            border-left: 2px solid transparent;
            cursor: pointer;
            transition: all 0.2s ease;

            .post-date {
                margin-bottom: 2px;
                color: #00f0ff;
                font-family: 'Courier New', monospace;
                font-size: 0.65rem;
                opacity: 0.7;
            }

            .post-title {
                color: #fff;
                font-size: 0.85rem;
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }

            &:hover {
                background: rgb(0, 240, 255, 15%);
                border-left-color: #00f0ff;
                transform: translateX(5px); // Hover 時往右推，有選單感

                .post-title {
                    color: #00f0ff;
                    text-shadow: 0 0 5px rgb(0, 240, 255, 50%);
                }
            }
        }
    }

    /* 能量矩陣 (Energy Matrix) */
    .energy-matrix {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .energy-row {
            display: flex;
            flex-direction: column;
            gap: 4px;

            .energy-label {
                display: flex;
                justify-content: space-between;
                color: rgb(255, 255, 255, 80%);
                font-family: 'Courier New', monospace;
                font-size: 0.75rem;
                text-transform: uppercase;

                .energy-count {
                    color: #fff;
                    font-weight: bold;
                }
            }

            .energy-blocks {
                display: flex;
                gap: 2px;
                height: 12px;

                .block {
                    flex: 1;
                    background: rgb(255, 255, 255, 10%); // 未啟用的暗色槽
                    border-radius: 1px;
                    transition: all 0.5s ease;
                }

                // 根據層級套用不同顏色與發光
                &.energy-normal .block.is-active {
                    background: #00f0ff;
                    box-shadow: 0 0 5px rgb(0, 240, 255, 60%);
                }
                &.energy-warning .block.is-active {
                    background: #FDB813;
                    box-shadow: 0 0 5px rgb(253, 184, 19, 60%);
                }
                &.energy-danger .block.is-active {
                    background: #f05;
                    box-shadow: 0 0 5px rgb(255, 0, 85, 60%);
                }
            }
        }
    }
</style>