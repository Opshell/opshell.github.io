<script setup lang="ts">
import { ref, watch, onUnmounted, shallowRef, computed } from 'vue';
import { useLoop, useTresContext } from '@tresjs/core';
import { Html } from '@tresjs/cientos';
import * as THREE from 'three';
import {
    AdditiveBlending,
    Vector3,
    BufferGeometry,
    BufferAttribute
} from 'three';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force-3d';
import gsap from 'gsap';

// --- 常數定義 ---
const COLORS = {
    STAR: '#FDB813',
    PLANET: '#00f0ff',
    LINK: '#ffffff',
    HOVER: '#ffffff',
    DIMMED: '#333333' // 被過濾掉的顏色
};

const props = defineProps<{
    siteData: any;
    lockedId: string | null;
    relatedNodeIds: Set<string>; // 接收從父層算好的關聯 Set
}>();

const emit = defineEmits<{
    (e: 'node-click', node: any): void,
    (e: 'node-hover', node: any | null): void
}>();

const { camera, controls } = useTresContext();

// --- 響應式狀態 ---
const nodes = shallowRef<any[]>([]);
const links = shallowRef<any[]>([]);
const hoveredNodeId = ref<string | null>(null);

// --- Three.js 物件引用 ---
const galaxyGroupRef = ref<THREE.Group>();
const lineGeometryRef = ref<THREE.BufferGeometry>();
const nodeMeshes = new Map<string, THREE.Mesh>();
const starParticlesGeometry = ref<THREE.BufferGeometry>(); // [FX] 粒子幾何

let simulation: any = null;

// #region [P] 核心：視覺狀態計算 (Visual State Logic)
const isSystemLocked = computed(() => !!props.lockedId);

// 判斷節點是否應該「亮起來」
const isNodeActive = (nodeId: string) => {
    // 1. 如果系統沒鎖定，大家都是亮的
    if (!isSystemLocked.value) return true;
    // 2. 如果是鎖定目標，亮
    if (nodeId === props.lockedId) return true;
    // 3. 如果在關聯名單內，亮
    if (props.relatedNodeIds.has(nodeId)) return true;

    return false; // 其他都暗掉
};

const getNodeOpacity = (nodeId: string) => {
    return isNodeActive(nodeId) ? 1.0 : 0.1;
};

const getNodeColor = (node: any) => {
    // 如果被 Hover，優先反白
    if (hoveredNodeId.value === node.id) return COLORS.HOVER;

    if (node.type === 'star') return COLORS.STAR;
    return COLORS.PLANET;
};

const getNodeEmissiveIntensity = (node: any) => {
    if (hoveredNodeId.value === node.id) return 2.0;
    if (props.lockedId === node.id) return 1.5; // 鎖定目標特別亮
    if (!isNodeActive(node.id)) return 0; // 暗掉的沒自發光
    return 0.3;
};
// #endregion

// #region [P] 互動事件處理
const handlePointerEnter = (node: any) => {
    hoveredNodeId.value = node.id;
    emit('node-hover', node);
};

const handlePointerLeave = () => {
    hoveredNodeId.value = null;
    emit('node-hover', null);
};

const handleNodeClick = (event: any, node: any) => {
    event.stopPropagation();
    emit('node-click', node);
};
// #endregion

// #region [P] 模擬與渲染
const initGalaxy = () => {
    if (!props.siteData) return;
    cleanUpResources();

    const _nodes: any[] = [];
    const _links: any[] = [];
    const tagNodeMap = new Map();

    // 1. 恆星 (Tags)
    props.siteData.tags.forEach((tagData: any, tagName: string) => {
        const nodeId = `tag-${tagName}`;
        _nodes.push({
            id: nodeId, name: tagName, type: 'star',
            val: Math.max(Math.sqrt(tagData.count) * 2, 4),
            count: tagData.count, // 存起來做粒子特效用
            x: Math.random() * 100 - 50, y: Math.random() * 100 - 50, z: Math.random() * 100 - 50
        });
        tagNodeMap.set(tagName, nodeId);
    });

    // 2. 行星 (Posts)
    props.siteData.posts.forEach((post: any) => {
        _nodes.push({
            id: post.url, name: post.title, type: 'planet',
            val: 1.2, tags: post.tags,
            x: Math.random() * 100 - 50, y: Math.random() * 100 - 50, z: Math.random() * 100 - 50
        });
        post.tags.forEach(tag => {
            if (tagNodeMap.has(tag)) {
                _links.push({ source: post.url, target: tagNodeMap.get(tag) });
            }
        });
    });

    nodes.value = _nodes;
    links.value = _links;

    // 3. D3 Force
    simulation = forceSimulation(_nodes, 3)
        .force('charge', forceManyBody().strength(-60))
        .force('link', forceLink(_links).id((d: any) => d.id).distance(45))
        .force('collide', forceCollide().radius((d: any) => d.val + 8)) // 增加碰撞半徑避免重疊
        .force('center', forceCenter());

    for (let i = 0; i < 120; i++) simulation.tick();

    // [FX] 初始化恆星粒子氛圍
    initStarParticles(_nodes.filter(n => n.type === 'star'));
};

// [FX] 簡單的粒子氛圍幾何生成
const initStarParticles = (stars: any[]) => {
    const particleCount = stars.length * 20; // 每個恆星配 20 個粒子
    const positions = new Float32Array(particleCount * 3);

    // 這裡只初始化 Buffer，位置會在 Render Loop 根據恆星位置更新
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starParticlesGeometry.value = geometry;
};

const cleanUpResources = () => {
    simulation?.stop();
    nodeMeshes.clear();
    lineGeometryRef.value?.dispose();
    starParticlesGeometry.value?.dispose();
};

const { onBeforeRender } = useLoop();

onBeforeRender(({ elapsed }) => {
    if (!simulation) return;
    simulation.tick();

    // 背景自轉
    if (galaxyGroupRef.value && !props.lockedId) {
        galaxyGroupRef.value.rotation.y += 0.0003;
    }

    // 更新 Mesh 位置
    nodes.value.forEach(node => {
        const mesh = nodeMeshes.get(node.id);
        if (mesh) {
            mesh.position.set(node.x, node.y, node.z);

            // [FX] 行星自轉
            if (node.type === 'planet') {
                mesh.rotation.y += 0.02;
                mesh.rotation.x += 0.01;
            } else {
                // [FX] 恆星光環緩慢旋轉
                mesh.rotation.z -= 0.005;
                mesh.rotation.x += 0.002;
            }
        }
    });

    // [FX] 更新粒子氛圍 (跟隨恆星)
    // 這裡做一個簡單的視覺效果：粒子在恆星周圍飄浮
    if (starParticlesGeometry.value) {
        const positions = starParticlesGeometry.value.attributes.position.array as Float32Array;
        let pIndex = 0;
        nodes.value.filter(n => n.type === 'star').forEach((star, sIndex) => {
            const mesh = nodeMeshes.get(star.id);
            if (!mesh) return;

            // 每個恆星分配 20 顆粒子
            for(let i=0; i<20; i++) {
                const time = elapsed + sIndex + i;
                const radius = star.val * 1.5 + Math.sin(time * 2) * 2;
                const angle = i * 0.5 + time * 0.5;

                positions[pIndex++] = mesh.position.x + Math.cos(angle) * radius;
                positions[pIndex++] = mesh.position.y + Math.sin(angle * Math.cos(time)) * radius; // 增加一些 3D 擾動
                positions[pIndex++] = mesh.position.z + Math.sin(angle) * radius;
            }
        });
        starParticlesGeometry.value.attributes.position.needsUpdate = true;
    }

    // 更新連線 Buffer
    if (lineGeometryRef.value && simulation.alpha() > 0.01) {
        const linePositions = new Float32Array(links.value.length * 6);
        let idx = 0;
        links.value.forEach((link) => {
            linePositions[idx++] = link.source.x;
            linePositions[idx++] = link.source.y;
            linePositions[idx++] = link.source.z;
            linePositions[idx++] = link.target.x;
            linePositions[idx++] = link.target.y;
            linePositions[idx++] = link.target.z;
        });
        lineGeometryRef.value.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        lineGeometryRef.value.attributes.position.needsUpdate = true;
    }
});
// #endregion

// #region [P] 二階貝茲曲線相機飛行 (Quadratic Bezier Camera)
const focusOnNode = (node: any) => {
    if (!controls.value || !camera) return;

    // 1. 計算起點、終點
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(node.x + 15, node.y + 10, node.z + 15);
    const targetLookAt = new THREE.Vector3(node.x, node.y, node.z);

    // 2. 計算貝茲控制點 (Control Point)：取中點並往上(Y軸)拉高，形成弧度
    // 使用 lerp 取得中點
    const midPoint = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
    // 根據距離決定拉高多少，距離越遠飛越高
    const dist = startPos.distanceTo(endPos);
    const controlPoint = midPoint.add(new THREE.Vector3(0, dist * 0.5, 0));

    controls.value.enabled = false;

    // 3. GSAP 自定義 Tween
    const tweenObj = { t: 0 };

    gsap.to(tweenObj, {
        t: 1,
        duration: 2.0, // 飛慢一點比較有感
        ease: "power2.inOut",
        onUpdate: () => {
            const t = tweenObj.t;
            const oneMinusT = 1 - t;

            // Quadratic Bezier Formula: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
            camera.position.x = (oneMinusT * oneMinusT * startPos.x) + (2 * oneMinusT * t * controlPoint.x) + (t * t * endPos.x);
            camera.position.y = (oneMinusT * oneMinusT * startPos.y) + (2 * oneMinusT * t * controlPoint.y) + (t * t * endPos.y);
            camera.position.z = (oneMinusT * oneMinusT * startPos.z) + (2 * oneMinusT * t * controlPoint.z) + (t * t * endPos.z);

            // 讓視角中心 (Target) 平滑移動到目標星球
            controls.value.target.lerp(targetLookAt, 0.1);
            controls.value.update();
        },
        onComplete: () => {
            if (controls.value) {
                controls.value.enabled = true;
                // 確保最後精準對齊
                controls.value.target.copy(targetLookAt);
            }
        }
    });
};

const resetView = () => {
    if (!controls.value || !camera) return;
    gsap.to(controls.value.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.inOut" });
    gsap.to(camera.position, {
        x: 100, y: 50, z: 100,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: () => controls.value.update()
    });
};
// #endregion

watch(() => props.siteData, initGalaxy, { immediate: true });
onUnmounted(cleanUpResources);
defineExpose({ focusOnNode, resetView });
</script>

<template>
    <TresGroup ref="galaxyGroupRef">
        <TresLineSegments v-if="links.length > 0">
            <TresBufferGeometry ref="lineGeometryRef" />
            <TresLineBasicMaterial
                :color="COLORS.LINK"
                :transparent="true"
                :opacity="isSystemLocked ? 0.05 : 0.15"
                :depth-write="false"
            />
        </TresLineSegments>

        <TresPoints
            v-if="starParticlesGeometry"
            :geometry="starParticlesGeometry"
        >
            <TresPointsMaterial
                :size="0.5"
                :color="COLORS.STAR"
                :transparent="true"
                :opacity="isSystemLocked ? 0.2 : 0.6"
                :size-attenuation="true"
                :depth-write="false"
                :blending="AdditiveBlending"
            />
        </TresPoints>

        <template v-for="node in nodes" :key="node.id">
            <TresMesh
                :ref="(el: any) => { if(el) nodeMeshes.set(node.id, el) }"
                @pointer-enter="handlePointerEnter(node)"
                @pointer-leave="handlePointerLeave"
                @click="(e) => handleNodeClick(e, node)"
            >
                <TresSphereGeometry :args="[node.val, 32, 32]" />

                <TresMeshStandardMaterial
                    :color="getNodeColor(node)"
                    :transparent="true"
                    :opacity="getNodeOpacity(node.id)"
                    :emissive="getNodeColor(node)"
                    :emissive-intensity="getNodeEmissiveIntensity(node)"
                    :roughness="0.4"
                    :metalness="0.8"
                />

                <TresMesh v-if="node.type === 'star' || (node.type === 'planet' && isNodeActive(node.id))">
                    <TresRingGeometry :args="[node.val * 1.4, node.val * 1.5, 32]" />
                    <TresMeshBasicMaterial
                        :color="node.type === 'star' ? COLORS.STAR : COLORS.PLANET"
                        side="DoubleSide"
                        :transparent="true"
                        :opacity="isNodeActive(node.id) ? 0.5 : 0.05"
                        :blending="AdditiveBlending"
                    />
                </TresMesh>

                <Html
                    v-if="getNodeOpacity(node.id) > 0.5"
                    center
                    transform
                    sprite
                    :distance-factor="15"
                    wrapper-class="no-pointer-events"
                >
                    <div
                        class="hud-container"
                        :class="{
                            'is-hovered': hoveredNodeId === node.id || props.lockedId === node.id,
                            'is-star': node.type === 'star'
                        }"
                    >
                        <div class="sci-fi-box">
                            <div class="corner top-left"></div>
                            <div class="corner top-right"></div>
                            <div class="corner bottom-left"></div>
                            <div class="corner bottom-right"></div>
                        </div>
                        <div class="label-text">{{ node.name }}</div>
                    </div>
                </Html>
            </TresMesh>
        </template>
    </TresGroup>
</template>

<style>
    /* 放在全域或不加 scoped 的 style 區塊，確保能打中ientos生成的元素 */
    .no-pointer-events,
    .no-pointer-events * {
        pointer-events: none !important;
    }
</style>

<style scoped lang="scss">
    // HUD 儀表板容器
    .hud-container {
        position: relative;
        @include setFlex();
        @include setSize(var(--size), var(--size));
        pointer-events: none !important; //  確保滑鼠穿透這個UI
        transform: scale(1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        /* 預設隱藏 (透明) */
        opacity: 0;
        z-index: 1;

        /* 恆星常駐顯示 */
        &.is-star {
            opacity: 0.8;
            .label-text {
                color: #FDB813;
                text-shadow: 0 0 5px rgb(253, 184, 19, 50%);
            }

            /* 恆星平時不顯示框框，只顯示字，比較乾淨 */
            .sci-fi-box { opacity: 1; }
        }

        /* Hover / Focus 狀態 (優先權最高) */
        &.is-hovered {
            transform: scale(1.1);
            opacity: 1 !important;
            z-index: 100;

            .sci-fi-box {
                transform: scale(1);
                opacity: 1; /* 顯示框框 */
            }

            .label-text {
                background: rgb(0, 0, 0, 80%);

                /* Hover 時字體變亮 */
                color: #fff;
                text-shadow: 0 0 8px rgb(0, 240, 255, 80%);
                transform: translateY(-5px); /* 再往上浮一點 */
            }
        }

        &:hover {
            opacity: 1;
            .sci-fi-box {
                transform: scale(1.5);
                opacity: 1;
            }
            .label-text {
                background: rgb(0, 0, 0, 80%);
                color: var(--color-gray-000);
                text-shadow: 0 0 8px rgb(0, 240, 255, 80%);
                transform: translateY(-5px);
            }
        }
    }

    // 文字標籤 (位於上方)
    .label-text {
        position: absolute;

        /* 將文字推到盒子上方 */
        bottom: 200%;

        /* 讓文字置中 */
        left: 50%;
        max-width: 400px;
        padding: 4px 8px;
        border-radius: 4px;

        /* 加上一點距離 */
        margin-bottom: 8px;
        font-family: 'Courier New', monospace;
        font-size: var(--font-size-xl); /* 字體稍微加大 */
        line-height: 1.25;
        letter-spacing: 1px;
        transform: translateX(-50%);
        transition: all 0.3s;
    }

    // 科幻框框 (四個角)
    .sci-fi-box {
        position: absolute;
        top: 0; left: 0;
        width: 120%; height: 120%;
        transform: scale(3);
        transition: all 0.25s var(--cubic-FiSo);
        opacity: 0;

        .corner {
            position: absolute;
            background: transparent;
            @include setSize(10px, 10px);
            border-style: solid;
            border-color: #00f0ff; /* 科幻藍 */
            box-shadow: 0 0 8px #00f0ff; /* 發光效果 */
        }

        /* 定位四個角 */
        .top-left {
            top: -24px;
            left: -24px;
            border-width: 2px 0 0 2px;
        }
        .top-right {
            top: -24px;
            right: -19px;
            border-width: 2px 2px 0 0;
        }
        .bottom-left {
            bottom: -18px;
            left: -24px;
            border-width: 0 0 2px 2px;
        }
        .bottom-right {
            right: -19px;
            bottom: -18px;
            border-width: 0 2px 2px 0;
        }
    }

    .a11y-list {
        position: fixed;
        top: 0; left: 0;
        pointer-events: none; opacity: 0;
        button { pointer-events: auto; }
    }
</style>