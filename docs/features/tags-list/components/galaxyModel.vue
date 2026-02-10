<script setup lang="ts">
    import { ref, watch, onUnmounted, shallowRef } from 'vue';
    import { useLoop, useTresContext } from '@tresjs/core';
    import { Html } from '@tresjs/cientos';
    import * as THREE from 'three';
    import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force-3d';
    import gsap from 'gsap';

    const { camera, controls } = useTresContext();

    const props = defineProps<{ siteData: any }>();
    const emit = defineEmits<{
        (e: 'node-click', url: string): void,
        (e: 'node-hover', node: any | null): void // 新增 hover emit
    }>();

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

    // focus
    const focusOnNode = (node: any) => {
        // 安全性檢查
        if (!node || typeof node.x !== 'number') {
            console.warn('Invalid node for focus:', node);
            return;
        }

        // 確保 controls 和 camera 存在
        if (!controls.value || !camera) return;

        // 1. 暫時禁用控制器，避免用戶在飛行時拖曳導致錯亂
        controls.value.enabled = false;

        // 2. 計算目標位置 (保持一定距離)
        const offsetDistance = 20; // 距離星球多遠
        const targetPos = new THREE.Vector3(node.x, node.y, node.z);

        // 相機新位置：簡單起見，我們往 Z 軸方向退，或者基於目前相機向量逼近
        // 這裡使用固定偏移，你也可以計算 normalized vector
        const camEndPos = {
            x: node.x + 10,
            y: node.y + 5,
            z: node.z + 10
        };

        // 3. GSAP Timeline 同步動畫
        const tl = gsap.timeline({
            onUpdate: () => {
                // 重要：每一幀都要告訴 OrbitControls 更新，不然畫面會跳動
                controls.value?.update();
            },
            onComplete: () => {
                // 動畫結束，交還控制權
                if (controls.value) {
                    controls.value.enabled = true;
                    // 強制將 target 鎖定在星球中心
                    controls.value.target.copy(targetPos);
                }
            }
        });

        // 動畫：移動 Controls 的旋轉中心 (Target)
        tl.to(controls.value.target, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration: 1.5,
            ease: 'power3.inOut'
        }, 0); // 在時間軸 0 秒開始

        // 動畫：移動相機本身
        tl.to(camera.position, {
            x: camEndPos.x,
            y: camEndPos.y,
            z: camEndPos.z,
            duration: 1.5,
            ease: 'power3.inOut'
        }, 0);
    };

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
    const onNodeClick = (node: any) => {
        // console.log('Click detected on:', node.name); // 加個 log 確認是否有觸發
        // emit('node-click', node.url);

        // 傳回父層更新 HUD
        emit('node-hover', node);

        // 如果有 node 且 controls 已經準備好，就飛行
        if (node && controls.value) {
            focusOnNode(node);
        }
    }

    // 解決 Template 找不到 document 的問題：搬回 script 處理
    const setFocus = (node: any | null) => {
        const { id } = node || {};

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

    function resetView () {
        if (!controls.value || !camera.value) return;

        controls.value.enabled = false;

        gsap.to(controls.value.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: 'power3.inOut' });
        gsap.to(camera.value.position, {
            x: 100, y: 50, z: 100, duration: 1.5, ease: 'power3.inOut',
            onUpdate: () => controls.value.update(),
            onComplete: () => {
                if (controls.value) controls.value.enabled = true;
            }
        });
    }

    // 暴露給父層使用
    defineExpose({
        focusOnNode,
        resetView
    });
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
                @pointerenter="setFocus(node)"
                @pointerleave="setFocus(null)"
                @click="(e) => { e.stopPropagation(); onNodeClick(node); }"
            >
                <TresSphereGeometry :args="[node.val, 20, 20]" />

                <!-- 球體 -->
                <TresMeshBasicMaterial v-if="node.type === 'star'" :color="COLOR_STAR" :tone-mapped="false" />
                <TresMeshStandardMaterial
                    v-else
                    :color="hoveredNodeId === node.id ? '#ffffff' : COLOR_PLANET"
                    :metalness="0.8"
                    :emissive="COLOR_PLANET"
                    :emissive-intensity="hoveredNodeId === node.id ? 2 : 0.2"
                />

                <!-- HUD -->
                <Html
                    :position="[0, 0, 0]"
                    center
                    transform
                    sprite
                    :distance-factor="15"
                    :occlude="false"
                    :raycast="() => null"
                    wrapper-class="no-pointer-events"
                >
                    <div
                        class="hud-container"
                        :style="{ '--size': `${node.val * 25}px` }"
                        style="pointer-events: none;"
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