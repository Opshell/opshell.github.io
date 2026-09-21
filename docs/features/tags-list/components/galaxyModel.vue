<script setup lang="ts">
    import { ref, watch, onUnmounted, shallowRef, computed } from 'vue';
    import { useLoop, useTres } from '@tresjs/core';
    import { Html } from '@tresjs/cientos';
    import * as THREE from 'three';
    import { AdditiveBlending, Vector3, BackSide } from 'three';
    import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force-3d';
    import gsap from 'gsap';

    import GalaxyLabel from './galaxyLabel.vue';

    // #region [P] 設定
    // 顏色
    const COLORS = {
        STAR: '#FDB813',
        PLANET: '#00f0ff',
        LINK: '#ffffff',
        HOVER_GLOW: '#00f0ff',
        DIMMED: '#333333'
    };

    // 亮度強度配置
    const INTENSITY = {
        BASE: 0.45,      // 平常的基礎亮度
        HOVER: 2.5,      // 滑鼠懸停時的亮度 (高光)
        LOCKED: 1.8,     // 被鎖定(Focus)時的亮度 (保持微亮)
        DIMMED: 0.0      // 被忽略/非活躍時的亮度 (變暗)
    };
    // #endregion

    // #region [P] Props & Emits
    const props = defineProps<{
        siteData: any;
        lockedId: string | null;
        relatedNodeIds: Set<string>;
    }>();

    const emit = defineEmits<{
        (e: 'node-click', node: any): void,
        (e: 'node-hover', node: any | null): void,
        (e: 'bg-click'): void,
        // [新增] 每一幀回傳目標的 2D 螢幕座標
        (e: 'update-target-pos', pos: { x: number, y: number } | null): void
    }>();
    // #endregion

    // [-] 相機，控制器，螢幕尺寸
    const { camera, controls, sizes } = useTres();

    // #region [P] 狀態與資料結構管理

    // nodes 和 links 陣列內部是龐大的 D3 物件結構 (包含 x, y, z, vx, vy 等物理屬性)。
    // Vue 的深度響應 (Deep Reactivity) 會對這些屬性建立 Proxy，消耗大量效能。
    // 只需要監聽陣列本身的替換 (Array replacement)，不需要監聽內部屬性變化，因此用 shallowRef。
    const nodes = shallowRef<any[]>([]);
    const links = shallowRef<any[]>([]);

    // [-] 互動狀態
    // currentHoverId: 用來做「防抖 (Debounce)」，避免 TresJS 在物體邊緣頻繁觸發 Enter/Leave。
    const currentHoverId = ref<string | null>(null);
    const hoveredNodeData = shallowRef<any | null>(null); // 用於傳遞給 HUD 顯示的資料

    // [-] 運鏡鎖 (Animation Lock)
    // 當相機正在進行 focusOnNode 或 resetView 的自動運鏡時，設為 true。
    // 此時會強制忽略所有滑鼠互動 (Hover/Click)，防止「掃描效應」導致的狀態錯亂與效能崩潰。
    const isCameraMoving = ref(false);

    // [-] Three.js Object References
    const galaxyGroupRef = ref<THREE.Group>();
    const labelGroupRef = ref<InstanceType<typeof GalaxyLabel> | null>(null);

    // [-] 線條幾何體：因為線條端點會隨物理模擬移動，需要每一幀手動更新 BufferAttribute。
    const lineGeometryRef = ref<THREE.BufferGeometry>();

    // [-] Mesh Cache
    // 使用 Map<ID, Mesh> 結構。
    // 在 Render Loop 或 Event Handler 中，我們需要頻繁地根據 Node ID 找到對應的 3D Mesh。
    // Map 提供 O(1) 的查找速度，比遍歷 Array (O(n)) 快得多。
    const nodeMeshes = new Map<string, THREE.Mesh>();

    // [-] Camera & Controls
    // 儲存當前活躍的相機與控制器實例，用於運鏡動畫。
    const activeCamera = shallowRef<THREE.Camera | null>(null);
    const activeControls = shallowRef<any>(null);

    // [-] 監聽 TresJS Context 初始化 Watcher
    // TresJS 的初始化是非同步的，需要監聽變數變化來確保抓到實例。
    watch(() => camera.value, (cam) => {
        if (cam) {
            activeCamera.value = cam;
        }
    }, { immediate: true });

    watch(controls, (ctrl) => {
        if (ctrl) {
            activeControls.value = ctrl;

            // [-] 備援機制 (Fallback)
            // 有時候 context.camera 可能為空，但 controls 內部通常會持有相機的參照。
            // 為了雙重保險，如果 activeCamera 沒抓到，嘗試從 controls.object 抓取。
            if (!activeCamera.value && ctrl.object) {
                activeCamera.value = ctrl.object as THREE.Camera;
            }
        }
    }, { immediate: true });
    // #endregion

    // D3 物理模擬實例 (不需要響應式，故用普通變數)
    let simulation: any = null;

    // #region [P] 視覺邏輯計算 Computed Logic

    // 系統是否處於「鎖定模式」 (是否有選中特定的星球)
    const isSystemLocked = computed(() => !!props.lockedId);

    // [-] 判斷某顆星球是否應該「保持活躍 (亮起)」 視覺過濾器
    // 規則：
    // 1. 沒鎖定時 -> 全部活躍
    // 2. 有鎖定時 -> 只有「被鎖定的星球」和「相關聯的星球 (relatedNodeIds)」活躍
    const isNodeActive = (nodeId: string) => {
        if (!isSystemLocked.value) return true;
        if (nodeId === props.lockedId) return true;
        if (props.relatedNodeIds.has(nodeId)) return true;
        return false;
    };

    // 用於 Template 的透明度控制
    const isNodeVisible = (nodeId: string) => isNodeActive(nodeId);

    // 根據節點類型 (恆星/行星) 決定顏色
    const getNodeColor = (node: any) => node.type === 'star' ? COLORS.STAR : COLORS.PLANET;

    // [-] HUD 資料源
    // 決定 GalaxyLabel 要顯示哪顆星球的資訊。
    // 規則：運鏡中不顯示 -> 有鎖定顯示鎖定者 -> 沒鎖定顯示 Hover 者。
    const activeLabelNode = computed(() => {
        if (isCameraMoving.value) return null; // 運鏡時隱藏 UI，減少干擾
        if (props.lockedId) return nodes.value.find(n => n.id === props.lockedId) || null;
        return hoveredNodeData.value;
    });
    // #endregion

    // #region [P] 互動事件處理 (核心邏輯) Event Handlers

    /** [-] 滑鼠移入星球 Pointer Enter
     * 觸發條件：滑鼠射線 (Raycaster) 碰到 Mesh
     */
    const pointerEnterHandler = (event: any, node: any) => {
        // [絕對防禦 - 運鏡鎖]
        // 如果相機正在飛，完全忽略滑鼠事件。這是防止「掃描效應」崩潰的關鍵。
        if (isCameraMoving.value) return;

        // [絕對防禦 - 專注模式]
        // 如果已經鎖定了某顆星球，就不允許 Hover 其他星球，避免 HUD 在旁邊亂跳。
        if (props.lockedId) return;

        // [事件阻擋] 防止事件穿透到後面的物體或背景
        if (event && event.stopPropagation) event.stopPropagation();

        // [狀態防抖] 如果已經是當前這顆，就不重複執行邏輯
        if (currentHoverId.value === node.id) return;

        // 更新狀態
        currentHoverId.value = node.id;
        hoveredNodeData.value = node;
        emit('node-hover', node); // 通知父層更新 UI

        // [視覺反饋] 使用 GSAP 製作「呼吸感」的發光動畫
        const mesh = nodeMeshes.get(node.id);
        if (mesh && mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;

            // 務必先 Kill 舊動畫，防止快速來回滑動時動畫衝突 (Fighting)
            gsap.killTweensOf(mat);
            gsap.killTweensOf(mesh.scale);

            // 亮度飆高 (配合 Bloom 產生發光感)
            gsap.to(mat, {
                emissiveIntensity: INTENSITY.HOVER,
                duration: 0.3,
                ease: 'power2.out'
            });
            // 體積放大
            gsap.to(mesh.scale, {
                x: 1.5, y: 1.5, z: 1.5,
                duration: 0.4,
                ease: 'back.out(1.7)' // back.out 會有一個可愛的「回彈」效果
            });
        }
    };

    // [-] 滑鼠離開星球
    const pointerLeaveHandler = (event: any, node: any) => {
        // 同樣受運鏡鎖保護
        if (isCameraMoving.value) return;
        if (event && event.stopPropagation) event.stopPropagation();

        // [狀態清理]
        // 只有當離開的是「當前正在 Hover」的那顆時，才清空狀態。
        // 這防止了快速滑動時，Leave A 比 Enter B 晚觸發導致的狀態誤刪。
        if (currentHoverId.value === node.id) {
            currentHoverId.value = null;
            hoveredNodeData.value = null;
            emit('node-hover', null);
        }

        // [視覺復原]
        const mesh = nodeMeshes.get(node.id);
        const isLocked = props.lockedId === node.id; // 檢查這顆星球是否被「鎖定」中

        if (mesh && mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;

            // [亮度邏輯修復]
            // 如果是被鎖定的星球 -> 保持 LOCKED 亮度 (微亮)。
            // 如果沒被鎖定 -> 回復 BASE 亮度 (正常亮度)，而非變全暗。
            // (如果有鎖定其他星球，isNodeVisible 會透過 CSS opacity 讓它變暗，這裡只管自發光)
            const targetIntensity = isLocked ? INTENSITY.LOCKED : INTENSITY.BASE;

            gsap.to(mat, {
                emissiveIntensity: targetIntensity,
                duration: 0.5,
                ease: 'power2.out'
            });

            // 縮放歸位
            gsap.to(mesh.scale, {
                x: 1, y: 1, z: 1,
                duration: 0.5,
                ease: 'power2.out'
            });
        }
    };

    // [-] 點擊星球
    const nodeClickHandler = (event: any, node: any) => {
        if (isCameraMoving.value) return;
        if (event && event.stopPropagation) event.stopPropagation();

        // 向上發送事件，由父元件 (galaxyBack) 決定是否切換到 LOCKED 狀態
        emit('node-click', node);
    };

    /** [-] 點擊背景
     * 用於「解除鎖定」或「重置視角」
     */
    const bgClickHandler = (event: any) => {
        if (isCameraMoving.value) return;

        // 確保點到的是背景球體 (SphereGeometry)，而不是其他的線條或輔助物件
        if (
            event && event.object &&
            event.object.geometry &&
            event.object.geometry.type === 'SphereGeometry'
        ) {
            emit('bg-click');
        }
    };
    // #endregion

    // #region [P] Camera Animation
    /** [-] Core 運鏡至指定節點
     * 鎖定互動 -> 計算座標 -> GSAP 動畫 -> 到達後亮燈 -> 解鎖互動
     */
    /**
     * [Core] 運鏡至指定節點 (優化版：自然飛行路徑)
     */
    /**
     * [Core] 運鏡至指定節點 (修復版：支援旋轉後的座標校正)
     */
    const focusOnNode = (node: any) => {
        // 1. [前置檢查]
        const cameraInstance = activeCamera.value;
        const controlsInstance = activeControls.value;
        // 必須從 Map 找到對應的 3D Mesh，因為我們需要它的真實位置
        const targetMesh = nodeMeshes.get(node.id);

        if (!cameraInstance || !controlsInstance || !targetMesh) {
            isCameraMoving.value = false;
            return;
        }

        // 2. [鎖定互動]
        controlsInstance.enabled = false;
        isCameraMoving.value = true;
        currentHoverId.value = null;
        emit('node-hover', null);

        // ------------------------------------------------------------
        // 3. [關鍵修正] 獲取「世界座標 (World Position)」
        // ------------------------------------------------------------
        // 我們不再使用 node.x, node.y (這是局部座標)
        // 而是問 Mesh：你現在在宇宙的哪裡？(包含父層旋轉後的結果)
        const targetWorldPos = new Vector3();
        targetMesh.getWorldPosition(targetWorldPos); // 把結果存入 targetWorldPos

        // ------------------------------------------------------------
        // 4. [幾何計算]
        // ------------------------------------------------------------
        const startPos = cameraInstance.position.clone();
        const startTarget = controlsInstance.target.clone();

        // 計算方向：從「真實目標位置」往「相機」拉線
        const direction = new Vector3().subVectors(startPos, targetWorldPos).normalize();

        // 距離保持
        const distance = Math.max(50, node.val * 12);

        // 終點 = 真實目標位置 + (方向 * 距離)
        const endPos = targetWorldPos.clone().add(direction.multiplyScalar(distance));

        // ------------------------------------------------------------
        // 5. [動畫執行]
        // ------------------------------------------------------------
        const tweenObj = { t: 0 };

        gsap.to(tweenObj, {
            t: 1,
            duration: 1.5,
            ease: "power2.inOut",

            onUpdate: () => {
                const t = tweenObj.t;

                // 位置與視角都使用「世界座標」進行插值
                cameraInstance.position.lerpVectors(startPos, endPos, t);
                controlsInstance.target.lerpVectors(startTarget, targetWorldPos, t);

                controlsInstance.update();
            },

            onComplete: () => {
                controlsInstance.enabled = true;
                // 最後確保鎖定的是「世界座標」
                controlsInstance.target.copy(targetWorldPos);
                controlsInstance.update();

                // 亮燈邏輯 (保持原樣)
                if (targetMesh.material) {
                    (targetMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = INTENSITY.LOCKED;
                }

                setTimeout(() => {
                    isCameraMoving.value = false;
                }, 100);
            }
        });
    };

    /** [-] 重置視角與狀態
     * 流程：鎖定 -> 暴力清理所有視覺效果 -> 相機歸位 -> 解鎖
     */
    const resetView = () => {
        // ------------------------------------------------------------
        // 1. [狀態鎖定] Animation Lock
        // ------------------------------------------------------------
        isCameraMoving.value = true;
        currentHoverId.value = null;
        emit('node-hover', null);

        // ------------------------------------------------------------
        // 2. [暴力清理] Brute Force Cleanup
        // ------------------------------------------------------------
        // 遍歷整個 Map，不管原本亮著的是誰，現在全部熄滅。
        // 這是解決 "解除 Focus 後全體發光" Bug 的關鍵。
        nodeMeshes.forEach((mesh) => {
            if (mesh && mesh.material) {
                // [-] 立刻停止該物件上所有正在跑的 GSAP 動畫 (例如正在變大或變亮) Kill Tweens
                gsap.killTweensOf(mesh.material);
                gsap.killTweensOf(mesh.scale);

                // [-] 強制歸零 Reset State
                (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = INTENSITY.BASE;

                // [-] 平滑地縮放回原始大小 (1.0) Reset Scale
                gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
            }
        });

        const cameraInstance = activeCamera.value;
        const controlsInstance = activeControls.value;

        if (!cameraInstance) {
            isCameraMoving.value = false;
            return;
        }

        // ------------------------------------------------------------
        // 3. [相機歸位] Camera Reset Animation
        // ------------------------------------------------------------

        // 平滑地將控制器的旋轉軸心 (Target) 移回宇宙原點 (0,0,0)
        if (controlsInstance) {
            gsap.to(controlsInstance.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.inOut" });
        }

        // 將相機移動回預設的鳥瞰位置 (100, 50, 100)
        // 這裡我們直接對 position 屬性做 Tween，因為這次不需要精確同步 LookAt (Controls 會幫忙處理)
        gsap.to(cameraInstance.position, {
            x: 100, y: 50, z: 100,
            duration: 1.5,
            ease: "power2.inOut",

            onUpdate: () => {
                // 必須每幀更新 controls，否則相機移動時畫面會卡住，直到動畫結束才跳轉
                if (controlsInstance) controlsInstance.update();
            },

            onComplete: () => {
                // [關鍵修復: 非同步解鎖]
                // 同樣使用 setTimeout 避免遞迴更新錯誤
                setTimeout(() => {
                    isCameraMoving.value = false;
                }, 100);
            }
        });
    };
    // #endregion

    // #region [P] D3 物理模擬初始化 Init & Simulation
    /** [-] 初始化星系模擬
     * 負責將原始資料 (siteData) 轉換為 D3 的節點 (Nodes) 與連結 (Links)
     * 並設定物理參數 (引力、斥力、碰撞)
     */
    const initGalaxy = () => {
        // 1. [安全性檢查] 如果沒有資料，什麼都不做
        if (!props.siteData) return;

        // 2. [資源清理]
        // 如果已經有模擬在跑，先停止它，避免多個計時器衝突
        if (simulation) simulation.stop();
        // 清空 Map 參照，防止記憶體洩漏
        nodeMeshes.clear();
        // 釋放舊的幾何體記憶體，這是 WebGL 效能優化的關鍵
        lineGeometryRef.value?.dispose();

        const _nodes: any[] = [];
        const _links: any[] = [];
        const tagNodeMap = new Map();

        // 3. [資料轉換] Tags -> 恆星 (Stars)
        // Tags 是分類中心，作為引力熱點
        props.siteData.tags.forEach((tagData: any, tagName: string) => {
            const nodeId = `tag-${tagName}`;
            _nodes.push({
                id: nodeId,
                name: tagName,
                type: 'star',
                // 根據文章數量決定恆星大小 (視覺權重)
                val: Math.max(Math.sqrt(tagData.count) * 2, 4),
                count: tagData.count,
                // 給予隨機初始位置，避免所有點都在 (0,0,0) 導致物理爆炸
                x: Math.random() * 100 - 50,
                y: Math.random() * 100 - 50,
                z: Math.random() * 100 - 50
            });
            tagNodeMap.set(tagName, nodeId);
        });

        // 4. [資料轉換] Posts -> 行星 (Planets)
        props.siteData.posts.forEach((post: any) => {
            _nodes.push({
                id: post.url,
                name: post.title,
                type: 'planet',
                val: 1.2, // 行星固定大小
                tags: post.tags,
                x: Math.random() * 100 - 50,
                y: Math.random() * 100 - 50,
                z: Math.random() * 100 - 50
            });

            // 5. [建立連結] 建立引力關係
            // 將文章 (Planet) 與它所屬的標籤 (Star) 連接起來
            post.tags.forEach(tag => {
                if (tagNodeMap.has(tag)) {
                    _links.push({
                        source: post.url, // 起點：文章
                        target: tagNodeMap.get(tag) // 終點：標籤
                    });
                }
            });
        });

        // 更新 Reactive State
        nodes.value = _nodes;
        links.value = _links;

        // 6. [D3 Force Simulation] 設定物理引擎
        // 這是讓星系形狀自然生成的關鍵
        simulation = forceSimulation(_nodes, 3) // 3 代表 3D 空間 (d3-force-3d)
            .force('charge', forceManyBody().strength(-50)) // 萬有斥力：讓星星彼此保持距離，不要擠成一團
            .force('link', forceLink(_links).id((d: any) => d.id).distance(45)) // 連結力：像彈簧一樣拉住相關文章
            .force('collide', forceCollide().radius((d: any) => d.val + 8)) // 碰撞檢測：防止球體重疊
            .force('center', forceCenter()); // 向心力：確保整個星系維持在畫面中心

        // 7. [預熱計算] Pre-warming
        // 在畫面渲染前先跑 120 次運算，讓星系直接呈現「展開後」的穩定狀態
        // 避免使用者看到星系從中心「爆炸」開來的過程
        for (let i = 0; i < 120; i++) simulation.tick();
    };
    // #endregion

    // #region [P] 渲染循環 Render Loop
    const { onBeforeRender } = useLoop();

    /** 每一幀 (約 16ms) 執行的邏輯
     * 負責將 D3 計算出的物理座標 (x, y, z) 同步到 Three.js 的 Mesh 上
     */
    onBeforeRender(({ elapsed }) => {
        if (!simulation) return;

        // 1. [物理推進] 讓 D3 繼續計算下一幀的力學狀態
        simulation.tick();

        // 條件：沒有正在移動相機、沒有鎖定星球、且滑鼠沒有在任何星球上
        const shouldRotate = !isCameraMoving.value && !props.lockedId && !currentHoverId.value;

        if (galaxyGroupRef.value && shouldRotate) {
            galaxyGroupRef.value.rotation.y += 0.0003;
        }

        // 3. [節點位置同步] 核心邏輯
        // 遍歷所有節點資料，更新對應 Mesh 的位置
        const currentNodes = nodes.value;
        for (let i = 0; i < currentNodes.length; i++) {
            const node = currentNodes[i];
            // 從 Map 中 O(1) 快速取出對應的 Mesh
            const mesh = nodeMeshes.get(node.id);

            if (mesh) {
                // 同步位置 D3 -> Three.js
                mesh.position.set(node.x, node.y, node.z);

                // 節點自轉特效
                if (node.type === 'planet') {
                    mesh.rotation.y += 0.02; // 行星轉快一點
                    mesh.rotation.x += 0.01;
                } else {
                    mesh.rotation.z -= 0.005; // 恆星轉慢一點
                    mesh.rotation.x += 0.002;
                }
            }
        }

        // 4. [HUD 位置同步]
        // 單例模式：只有一個 Label DOM，我們把它移動到當前活躍目標的頭上
        if (labelGroupRef.value?.tresObject && activeLabelNode.value) {
            const targetNode = activeLabelNode.value;
            const label3DGroup = labelGroupRef.value.tresObject; // 拿出 Object3D

            label3DGroup.position.set(targetNode.x, targetNode.y, targetNode.z);
        }

        // 5. [連結線更新] 高效能渲染
        // 線條兩端連接著運動中的球體，所以每幀都要更新頂點座標
        if (lineGeometryRef.value && simulation.alpha() > 0.01) {
            // Float32Array 是 WebGL 處理二進制數據最快的格式
            const linePositions = new Float32Array(links.value.length * 6); // 每條線 2 個點，每個點 (x,y,z) 共 6 個數值
            let idx = 0;
            const currentLinks = links.value;

            for (let i = 0; i < currentLinks.length; i++) {
                const link = currentLinks[i];
                // 起點 (Source)
                linePositions[idx++] = link.source.x;
                linePositions[idx++] = link.source.y;
                linePositions[idx++] = link.source.z;
                // 終點 (Target)
                linePositions[idx++] = link.target.x;
                linePositions[idx++] = link.target.y;
                linePositions[idx++] = link.target.z;
            }

            // 直接操作 BufferAttribute，這是 Three.js 修改幾何體效能最高的方式
            lineGeometryRef.value.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
            lineGeometryRef.value.attributes.position.needsUpdate = true; // 告訴 GPU 需要重繪
        }

        // ------------------------------------------------------------
        // [新增] 鎖定目標的螢幕座標投影 (3D -> 2D)
        // ------------------------------------------------------------
        if (props.lockedId) {
            const targetMesh = nodeMeshes.get(props.lockedId);

            // 確保相機和目標都存在
            if (targetMesh && activeCamera.value) {
                // 1. 複製目標的世界座標 (避免修改到原始物件)
                //    注意：一定要用 worldPosition，因為星球可能被包在 Group 裡跟著轉
                const targetPos = new Vector3();
                targetMesh.getWorldPosition(targetPos);

                // 2. 投影 (Project) - 這是 Three.js 的魔法方法
                //    這會把座標轉換成 "標準設備座標 (NDC)"，範圍是 -1 到 1
                targetPos.project(activeCamera.value);

                // 3. NDC 轉 螢幕像素座標 (Pixel Coordinates)
                //    sizes.width.value 是畫布寬度
                const x = (targetPos.x * 0.5 + 0.5) * sizes.width.value;
                const y = -(targetPos.y * 0.5 - 0.5) * sizes.height.value;

                // 4. 發送給父層
                emit('update-target-pos', { x, y });
            }
        } else {
            // 如果沒有鎖定，告訴父層不用強制定位
            // (這裡可以用一個 flag 避免每一幀都 emit null，節省一點效能，但簡單寫先這樣)
            emit('update-target-pos', null);
        }
    });
    // #endregion

    // 監聽資料變化，重新初始化
    watch(() => props.siteData, initGalaxy, { immediate: true });

    // 組件卸載時，清理物理模擬與幾何體，防止記憶體洩漏 (Memory Leak)
    onUnmounted(() => {
        simulation?.stop();
        nodeMeshes.clear();
        lineGeometryRef.value?.dispose();
    });

    // 暴露方法給父層使用
    defineExpose({ focusOnNode, resetView });
</script>

<template>
    <TresGroup ref="galaxyGroupRef">
        <TresMesh :scale="500" @click="bgClickHandler">
            <TresSphereGeometry :args="[1, 10, 10]" />
            <TresMeshBasicMaterial
                color="#000000"
                :side="BackSide"
                transparent
                :opacity="0"
                :depth-write="false"
            />
        </TresMesh>

        <TresLineSegments v-if="links.length > 0">
            <TresBufferGeometry ref="lineGeometryRef" />
            <TresLineBasicMaterial
                :color="COLORS.LINK"
                transparent
                :opacity="isSystemLocked ? 0.05 : 0.15"
                :depth-write="false"
            />
        </TresLineSegments>

        <template v-for="node in nodes" :key="node.id">
            <TresMesh
                :ref="(el: any) => { if(el) nodeMeshes.set(node.id, el) }"
                @pointerenter="(e) => pointerEnterHandler(e, node)"
                @pointerleave="(e) => pointerLeaveHandler(e, node)"
                @click="(e) => nodeClickHandler(e, node)"
            >
                <TresSphereGeometry :args="[node.val, 32, 32]" />
                <TresMeshStandardMaterial
                    :color="getNodeColor(node)"
                    transparent
                    :opacity="isNodeVisible(node.id) ? 1.0 : 0.35"
                    :emissive="getNodeColor(node)"
                    :emissive-intensity="INTENSITY.BASE"
                    :roughness="0.4"
                    :metalness="0.8"
                />
            </TresMesh>
        </template>

        <GalaxyLabel ref="labelGroupRef" :activeLabelNode />

        <!-- <TresGroup ref="labelGroupRef" v-if="activeLabelNode">
            <Html
                center transform sprite
                :distance-factor="15"
                wrapper-class="no-pointer-events"
            >
                <Transition name="hud-pop">
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
                        <div class="label-text">{{ activeLabelNode.name }}</div>
                    </div>
                </Transition>
            </Html>
        </TresGroup> -->
    </TresGroup>
</template>

<style lang="scss" scoped>
    // 你的過渡動畫保持不變
    .hud-pop-enter-active, .hud-pop-leave-active {
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .hud-pop-enter-from, .hud-pop-leave-to {
        transform: scale(0.5);
        opacity: 0;
    }

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

            .corner {
                position: absolute;
                background: transparent;
                width: 16px;
                height: 16px;
                border-style: solid;
                border-color: #00f0ff;

                // 建議改用 drop-shadow 效能更好，光暈也更均勻
                filter: drop-shadow(0 0 4px #00f0ff);
            }

            // 關鍵 2：貼齊外框的四個角，不使用負數外推
            .top-left { top: 0; left: 0; border-width: 2px 0 0 2px; }
            .top-right { top: 0; right: 0; border-width: 2px 2px 0 0; }
            .bottom-left { bottom: 0; left: 0; border-width: 0 0 2px 2px; }
            .bottom-right { right: 0; bottom: 0; border-width: 0 2px 2px 0; }
        }

        .label-text {
            position: absolute;

            // 關鍵 3：因為父層高度是 0，改用像素或 rem 向上推移
            bottom: 50px; // 視你的星球大小與 sci-fi-box 大小調整
            left: 50%;
            background: rgb(0, 0, 0, 80%);
            max-width: 400px;
            padding: 4px 10px;
            border: 1px solid rgb(0, 240, 255, 30%); // 加個微弱的邊框更有科技感
            border-radius: 4px;
            color: #fff;
            font-family: 'Courier New', monospace;
            font-size: var(--font-size-xl, 14px);
            white-space: nowrap;
            text-shadow: 0 0 8px rgb(0, 240, 255, 80%);
            transform: translateX(-50%); // 確保文字水平置中
        }

        &.is-star {
            .label-text {
                border-color: rgb(253, 184, 19, 30%);
                color: #FDB813;
                text-shadow: 0 0 5px rgb(253, 184, 19, 50%);
            }
            .sci-fi-box .corner {
                border-color: #FDB813;
                filter: drop-shadow(0 0 4px #FDB813);
            }
        }
    }
</style>