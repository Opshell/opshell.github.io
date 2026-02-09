<script setup lang="ts">
import { ref, watch, onUnmounted, shallowRef } from 'vue';
import { useLoop, useTresContext } from '@tresjs/core';
import { Html } from '@tresjs/cientos';
import * as THREE from 'three';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force-3d';

const props = defineProps<{ siteData: any }>();
const emit = defineEmits<{ (e: 'node-click', url: string): void }>();

// --- 顏色設定 ---
const COLOR_STAR = '#FDB813';
const COLOR_PLANET = '#00f0ff';
const COLOR_LINK = '#ffffff';

const nodes = shallowRef<any[]>([]);
const links = shallowRef<any[]>([]);
let simulation: any = null;

const nodeMeshes = new Map<string, THREE.Mesh>();
const lineGeometryRef = ref<THREE.BufferGeometry>();
const galaxyGroupRef = ref<THREE.Group>();

// --- 焦點控制 ---
const hoveredNodeId = ref<string | null>(null);
const focusedNodeId = ref<string | null>(null);

// --- 初始化與預熱 ---
const initGalaxy = () => {
    if (!props.siteData) return;
    const _nodes: any[] = [];
    const _links: any[] = [];
    const tagNodeMap = new Map();

    props.siteData.tags.forEach((tagData: any, tagName: string) => {
        const nodeId = `tag-${tagName}`;
        _nodes.push({
            id: nodeId, name: tagName, type: 'star',
            val: Math.max(Math.sqrt(tagData.count) * 2, 4),
            color: COLOR_STAR, x: Math.random() * 100 - 50, y: Math.random() * 100 - 50, z: Math.random() * 100 - 50
        });
        tagNodeMap.set(tagName, nodeId);
    });

    props.siteData.posts.forEach((post: any) => {
        const nodeId = post.url;
        _nodes.push({
            id: nodeId, name: post.title, type: 'planet',
            val: 1.2, color: COLOR_PLANET, url: post.url,
            x: Math.random() * 100 - 50, y: Math.random() * 100 - 50, z: Math.random() * 100 - 50
        });
        post.tags.forEach(tag => {
            if (tagNodeMap.has(tag)) _links.push({ source: nodeId, target: tagNodeMap.get(tag) });
        });
    });

    nodes.value = _nodes;
    links.value = _links;

    simulation = forceSimulation(_nodes, 3)
        .force('charge', forceManyBody().strength(-60))
        .force('link', forceLink(_links).id((d: any) => d.id).distance(45))
        .force('center', forceCenter())
        .force('collide', forceCollide().radius((d: any) => d.val + 4))
        .stop();

    // 預熱運算 (消除剛載入時的劇烈晃動)
    const preWarmTicks = 120;
    for (let i = 0; i < preWarmTicks; i++) {
        simulation.tick();
    }
    simulation.alpha(0.1).restart();
};

watch(() => props.siteData, (val) => val && initGalaxy(), { immediate: true });

// --- 渲染循環 ---
const { onBeforeRender } = useLoop();

onBeforeRender(() => {
    if (!simulation || nodes.value.length === 0) return;

    simulation.tick();

    // 自轉邏輯
    if (galaxyGroupRef.value) {
        if (!hoveredNodeId.value && !focusedNodeId.value) {
            galaxyGroupRef.value.rotation.y += 0.0005;
        }
    }

    // 更新 Mesh 位置
    nodes.value.forEach(node => {
        const mesh = nodeMeshes.get(node.id);
        if (mesh && typeof node.x === 'number') {
            mesh.position.set(node.x, node.y, node.z);
            if (node.type === 'planet') {
                mesh.rotation.y += 0.01;
                mesh.rotation.x += 0.005;
            }
        }
    });

    // 更新連線 Buffer
    if (lineGeometryRef.value && links.value.length > 0) {
        const linePositions = new Float32Array(links.value.length * 6);
        let hasValidData = false;
        links.value.forEach((link, i) => {
            if (link.source && link.target && typeof link.source.x === 'number') {
                linePositions[i * 6] = link.source.x;
                linePositions[i * 6 + 1] = link.source.y;
                linePositions[i * 6 + 2] = link.source.z;
                linePositions[i * 6 + 3] = link.target.x;
                linePositions[i * 6 + 4] = link.target.y;
                linePositions[i * 6 + 5] = link.target.z;
                hasValidData = true;
            }
        });
        if (hasValidData) {
            lineGeometryRef.value.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
            lineGeometryRef.value.attributes.position.needsUpdate = true;
            lineGeometryRef.value.computeBoundingSphere();
        }
    }
});

// --- 互動控制 ---
const onNodeClick = (node: any) => emit('node-click', node.url);

// 解決 Template 找不到 document 的問題：搬回 script 處理
const setFocus = (id: string | null) => {
    console.log('hover', id);

    hoveredNodeId.value = id;
    if (typeof document !== 'undefined') {
        document.body.style.cursor = id ? 'pointer' : 'auto';
    }
};

const onKeyFocus = (id: string) => {
    focusedNodeId.value = id;

    setFocus(id);
};

const onKeyBlur = () => {
    focusedNodeId.value = null;
    setFocus(null);
};

onUnmounted(() => simulation?.stop());
</script>

<template>
  <TresGroup ref="galaxyGroupRef">
    <TresLineSegments v-if="links.length > 0">
      <TresBufferGeometry ref="lineGeometryRef" />
      <TresLineBasicMaterial :color="COLOR_LINK" :transparent="true" :opacity="0.08" />
    </TresLineSegments>

    <template v-for="node in nodes" :key="node.id">
        <TresMesh
            :ref="(el: any) => { if(el) nodeMeshes.set(node.id, el) }"
            @pointer-enter="setFocus(node.id)"
            @pointer-leave="setFocus(null)"
            @click="(e) => { e.stopPropagation(); onNodeClick(node); }"
        >
            <TresSphereGeometry :args="[node.val, 16, 16]" />
            <TresMeshBasicMaterial v-if="node.type === 'star'" :color="COLOR_STAR" :tone-mapped="false" />
            <TresMeshStandardMaterial
                v-else
                :color="hoveredNodeId === node.id ? '#ffffff' : COLOR_PLANET"
                :metalness="0.8"
                :emissive="COLOR_PLANET"
                :emissive-intensity="hoveredNodeId === node.id ? 2 : 0.2"
            />

            <Html
                :position="[0, 0, 0]"
                center
                transform
                sprite
                :distance-factor="15"
                :style="{ pointerEvents: 'none' }"
                :occlude="false"
                :raycast="() => null"
            >
                <div
                    class="hud-container"
                    :style="{ '--size': `${node.val * 25}px` }"
                    :class="{
                        'is-hovered': hoveredNodeId === node.id || focusedNodeId === node.id,
                        'is-star': node.type === 'star'
                    }"
                >
                    <div class="sci-fi-box">
                        <div class="corner top-left"></div>
                        <div class="corner top-right"></div>
                        <div class="corner bottom-left"></div>
                        <div class="corner bottom-right"></div>
                    </div>

                    <div class="label-text">
                        {{ node.name }}
                    </div>
                </div>
            </Html>
        </TresMesh>
    </template>

    <Html
        :position="[0,0,0]"
        :style="{ opacity: 0, pointerEvents: 'none', width: '0px', height: '0px', overflow: 'hidden' }"
    >
        <ul class="a11y-list">
            <li v-for="node in nodes" :key="'a11y-'+node.id">
                <button
                    @focus="onKeyFocus(node.id)"
                    @blur="onKeyBlur()"
                    @click="onNodeClick(node)"
                    @keydown.enter="onNodeClick(node)"
                >
                    {{ node.name }}
                </button>
            </li>
        </ul>
    </Html>
  </TresGroup>
</template>

<style scoped lang="scss">
    /* --- HUD 儀表板容器 --- */
    .hud-container {
        position: relative;

        /* 置中對齊內容 */
        display: flex;
        align-items: center;
        justify-content: center;

        /* 使用變數控制大小，讓它剛好包住球 */
        width: var(--size);
        height: var(--size);

        /* 🔥 核心修正：
        pointer-events: none !important
        確保滑鼠像幽靈一樣穿透這個框，
        直接點到後面的 3D 星球，這樣 hover 才會生效！
        */
        // pointer-events: none !important;
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
    }

/* --- 文字標籤 (位於上方) --- */
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

/* --- 科幻框框 (四個角) --- */
.sci-fi-box {
    position: absolute;
    top: 0; left: 0;
    width: 120%; height: 120%;
    transform: scale(1.2); /* 進場動畫用 */
    transition: all 0.2s ease-out;
    opacity: 0; /* 預設隱藏 */

    .corner {
        position: absolute;
        width: 10px;
        height: 10px; /* 角落大小 */
        border-style: solid;
        border-color: #00f0ff; /* 科幻藍 */
        box-shadow: 0 0 8px #00f0ff; /* 發光效果 */
    }

    /* 定位四個角 */
    .top-left {
        top: -20px; left: -20px;
        border-width: 2px 0 0 2px;
    }
    .top-right {
        top: -20px; right: -20px;
        border-width: 2px 2px 0 0;
    }
    .bottom-left {
        bottom: -20px; left: -20px;
        border-width: 0 0 2px 2px;
    }
    .bottom-right { right: -20px;
        bottom: -20px;
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