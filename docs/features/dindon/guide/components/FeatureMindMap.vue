<script setup lang="ts">
    import type { BranchId } from '../featureMap';
    import type { Box } from '../mindMapGeometry';
    import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
    import { branches, features, featuresOf, findFeature, relatedOf, REVIEWED_APP_VERSION } from '../featureMap';
    import { branchPath, centerOf, edgeToward, linkPath } from '../mindMapGeometry';

    // 功能地圖的心智圖：中心是叮咚，右邊三支（記下來、整理、看懂），左邊四支（規劃、帳戶、養成、安心）。
    // 節點是 HTML 按鈕（能 tab、能讀），排好之後量位置，在底下的 SVG 畫線；
    // 寬度不夠時（容器 < 760px）CSS 改排成一棵直的樹，線用框線畫，SVG 不畫。
    interface Props {
        /** 選中的功能 id */
        selected?: string;
        /** 要標出來的功能；null 是不篩 */
        highlight?: readonly string[] | null;
    }
    const props = withDefaults(defineProps<Props>(), { selected: '', highlight: null });
    const emit = defineEmits<{ select: [id: string] }>();

    /** 跟 CSS 的 @container guide-map (width >= 760px) 同一個數字 */
    const RADIAL_MIN_WIDTH = 760;

    const rightBranches = branches.filter(branch => branch.side === 'right');
    const leftBranches = branches.filter(branch => branch.side === 'left');

    // #region [P] 量位置、畫線
    const rootRef = ref<HTMLElement>();
    const boxes = shallowRef(new Map<string, Box>());
    const size = ref({ width: 0, height: 0 });
    const radial = ref(false);

    function measure() {
        const root = rootRef.value;
        if (!root) return;
        const origin = root.getBoundingClientRect();
        radial.value = origin.width >= RADIAL_MIN_WIDTH;
        size.value = { width: origin.width, height: origin.height };
        if (!radial.value) return;
        const next = new Map<string, Box>();
        root.querySelectorAll<HTMLElement>('[data-node]').forEach((el) => {
            const rect = el.getBoundingClientRect();
            next.set(el.dataset.node!, { left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height });
        });
        boxes.value = next;
    }

    const selectedFeature = computed(() => findFeature(props.selected));
    const relatedIds = computed(() => new Set(relatedOf(props.selected).map(feature => feature.id)));

    /** 中心 → 分支 → 功能的樹枝；選中的那一條路徑加粗 */
    const wires = computed(() => {
        const all = boxes.value;
        const hub = all.get('hub');
        if (!radial.value || !hub) return [];
        const list: { key: string; d: string; branch: string; active: boolean }[] = [];
        for (const branch of branches) {
            const node = all.get(`b-${branch.id}`);
            if (!node) continue;
            const onPath = selectedFeature.value?.branch === branch.id;
            list.push({ key: `t-${branch.id}`, d: branchPath(edgeToward(hub, centerOf(node)), edgeToward(node, centerOf(hub))), branch: branch.id, active: onPath });
            for (const feature of featuresOf(branch.id)) {
                const leaf = all.get(`f-${feature.id}`);
                if (!leaf) continue;
                const d = branchPath(edgeToward(node, centerOf(leaf)), edgeToward(leaf, centerOf(node)));
                list.push({ key: `l-${feature.id}`, d, branch: branch.id, active: feature.id === props.selected });
            }
        }
        return list;
    });

    /** 選中的功能 → 其他分支裡有關聯的功能，線從核心附近繞過去。同一支的就在旁邊，框線標出來就夠，連線只會繞成一團 */
    const links = computed(() => {
        const all = boxes.value;
        const hub = all.get('hub');
        const from = all.get(`f-${props.selected}`);
        if (!radial.value || !hub || !from) return [];
        const hubPoint = centerOf(hub);
        const own = selectedFeature.value?.branch;
        return relatedOf(props.selected).filter(feature => feature.branch !== own).flatMap((feature) => {
            const to = all.get(`f-${feature.id}`);
            return to ? [{ key: feature.id, branch: feature.branch, d: linkPath(edgeToward(from, hubPoint), edgeToward(to, hubPoint), hubPoint) }] : [];
        });
    });

    let observer: ResizeObserver | undefined;
    let frame = 0;
    const scheduleMeasure = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(measure);
    };
    onMounted(() => {
        measure();
        observer = new ResizeObserver(scheduleMeasure);
        observer.observe(rootRef.value!);
        // 字型載入後字寬會變，節點的位置跟著變
        void document.fonts?.ready.then(scheduleMeasure);
    });
    onBeforeUnmount(() => {
        observer?.disconnect();
        cancelAnimationFrame(frame);
    });
    // #endregion

    // #region [P] 節點的狀態
    function leafState(id: string) {
        const highlighted = props.highlight ? props.highlight.includes(id) : null;
        return {
            'is-selected': id === props.selected,
            'is-related': relatedIds.value.has(id),
            'is-marked': highlighted === true,
            // 有篩選時沒被標到的淡掉；沒篩選但有選中時，跟它無關的淡掉
            'is-dimmed': highlighted === false || (highlighted === null && !!props.selected && id !== props.selected && !relatedIds.value.has(id))
        };
    }
    const branchDimmed = (id: BranchId) => !!props.highlight && !featuresOf(id).some(feature => props.highlight!.includes(feature.id));
    // #endregion
</script>

<template>
    <div class="dd-mindmap">
        <div ref="rootRef" class="dd-mindmap__canvas" :class="{ 'is-focused': !!selected || !!highlight }">
            <svg
                v-if="radial"
                class="dd-mindmap__wires"
                :width="size.width"
                :height="size.height"
                :viewBox="`0 0 ${size.width} ${size.height}`"
                aria-hidden="true"
            >
                <path
                    v-for="wire in wires"
                    :key="wire.key"
                    class="wire"
                    :class="{ 'is-active': wire.active }"
                    :style="{ '--wire': `var(--g-${wire.branch})` }"
                    :d="wire.d"
                />
                <path
                    v-for="link in links"
                    :key="`${selected}-${link.key}`"
                    class="link"
                    :style="{ '--wire': `var(--g-${link.branch})` }"
                    :d="link.d"
                    pathLength="1"
                />
            </svg>

            <div class="dd-mindmap__hub" data-node="hub">
                <strong>叮咚記帳</strong>
                <span>App {{ REVIEWED_APP_VERSION }}</span>
                <span>{{ features.length }} 個功能</span>
            </div>

            <div v-for="side in [rightBranches, leftBranches]" :key="side[0].side" class="dd-mindmap__side" :class="`dd-mindmap__side--${side[0].side}`">
                <section
                    v-for="branch in side"
                    :key="branch.id"
                    class="dd-mindmap__branch"
                    :class="{ 'is-dimmed': branchDimmed(branch.id) }"
                    :style="{ '--branch': `var(--g-${branch.id})`, '--branch-tint': `var(--g-${branch.id}-tint)` }"
                    :aria-labelledby="`branch-${branch.id}`"
                >
                    <div class="dd-mindmap__branch-node" :data-node="`b-${branch.id}`">
                        <h3 :id="`branch-${branch.id}`">{{ branch.title }}</h3>
                        <p>{{ branch.purpose }}</p>
                    </div>
                    <ul class="dd-mindmap__leaves">
                        <li v-for="feature in featuresOf(branch.id)" :key="feature.id">
                            <button
                                type="button"
                                class="dd-mindmap__leaf"
                                :class="leafState(feature.id)"
                                :data-node="`f-${feature.id}`"
                                :aria-pressed="feature.id === selected"
                                @click="emit('select', feature.id)"
                            >
                                <span class="name">{{ feature.name }}</span>
                                <span v-if="feature.demo" class="mark" title="有演示影片" aria-label="有演示影片">▶</span>
                            </button>
                        </li>
                    </ul>
                </section>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    .dd-mindmap {
        container: guide-map / inline-size;

        &__canvas {
            position: relative;
            display: grid;
            grid-template-areas: 'hub' 'right' 'left';
            gap: 20px;
        }

        // #region [P] 線
        &__wires {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: visible;

            .wire {
                transition: opacity .25s var(--cubic-FiSo), stroke-width .25s var(--cubic-FiSo);
                opacity: .45;
                fill: none;
                stroke: var(--wire);
                stroke-width: 1.5;

                &.is-active {
                    stroke-width: 3;
                    opacity: 1;
                }
            }
            .link {
                fill: none;
                stroke: var(--wire);
                stroke-dasharray: 1;
                stroke-dashoffset: 1;
                stroke-linecap: round;
                stroke-width: 2;
                animation: dd-mindmap-draw .6s var(--cubic-FiSo) forwards;
            }
        }
        &__canvas.is-focused .wire:not(.is-active) { opacity: .18; }

        // #endregion

        // #region [P] 中心
        &__hub {
            grid-area: hub;
            @include setFlex(center, center, 2px, column);
            justify-self: center;
            background: var(--dd-accent);
            padding: 16px 22px;
            border-radius: 999px;
            color: #1B1815;
            text-align: center;
            z-index: 1;

            strong {
                font-size: var(--font-size-l);
                font-weight: 800;
                line-height: 1.3;
            }
            span {
                color: rgb(27 24 21 / 70%);
                font-size: var(--font-size-xs);
                white-space: nowrap;
            }
        }

        // #endregion

        // #region [P] 分支（窄的時候：一棵直的樹）
        &__side {
            @include setFlex(flex-start, stretch, 20px, column);

            &--right { grid-area: right; }
            &--left { grid-area: left; }
        }
        &__branch {
            @include setFlex(flex-start, stretch, 10px, column);
            transition: opacity .25s var(--cubic-FiSo);

            &.is-dimmed { opacity: .4; }
        }
        &__branch-node {
            position: relative;
            background: var(--branch-tint);
            padding: 8px 14px;
            border-left: 4px solid var(--branch);
            border-radius: 12px;
            z-index: 1;

            h3 {
                color: var(--dd-text);
                font-size: var(--font-size-m);
                font-weight: 800;
                line-height: 1.4;
            }
            p {
                color: var(--dd-muted);
                font-size: var(--font-size-xs);
                line-height: 1.5;
            }
        }
        &__leaves {
            @include setFlex(flex-start, flex-start, 8px);
            flex-wrap: wrap;
            padding: 2px 0 2px 12px;
            border-left: 2px solid var(--branch);
            margin: 0 0 0 12px;
            list-style: none;
        }
        &__leaf {
            position: relative;
            background: var(--dd-surface);
            padding: 6px 12px;
            border: 1.5px solid var(--dd-border);
            border-radius: 999px;
            color: var(--dd-text);
            font: inherit;
            font-size: var(--font-size-s);
            line-height: 1.4;
            text-align: left;
            cursor: pointer;
            transition: opacity .25s var(--cubic-FiSo), border-color .2s, background-color .2s, transform .2s var(--cubic-FiSo);
            z-index: 1;
            @include setFlex(flex-start, center, 6px);

            .mark {
                flex-shrink: 0;
                color: var(--branch);
                font-size: 9px;
            }
            @media (hover: hover) {
                &:hover {
                    border-color: var(--branch);
                    transform: translateY(-1px);
                }
            }
            &:focus-visible { outline: 3px solid var(--dd-primary); }
            &.is-related {
                background: var(--branch-tint);
                border-style: dashed;
                border-color: var(--branch);
            }
            &.is-marked {
                background: var(--branch-tint);
                border-color: var(--branch);
                font-weight: 700;
            }
            &.is-selected {
                background: var(--dd-accent);
                border-color: #1B1815;
                color: #1B1815;
                font-weight: 800;

                .mark { color: #1B1815; }
            }
            &.is-dimmed { opacity: .35; }
        }

        // #endregion

        // #region [P] 夠寬的時候：左右展開的心智圖
        @container guide-map (width >= 760px) {
            &__canvas {
                grid-template-areas: 'left hub right';
                grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
                gap: 0 28px;
                align-items: center;
            }

            &__side { gap: 26px; }
            &__branch {
                flex-direction: row;
                gap: 22px;
                align-items: center;
            }
            &__side--left &__branch { flex-direction: row-reverse; }
            &__branch-node {
                flex-shrink: 0;
                width: 116px;
                border-top: 4px solid var(--branch);
                border-left: 0;
            }
            &__leaves {
                flex-flow: column nowrap;
                gap: 6px;
                padding: 0;
                border-left: 0;
                margin: 0;
            }
            &__side--left &__leaves { align-items: flex-end; }
            &__leaf {
                max-width: 15em;
                padding: 5px 12px;
            }
            &__side--left &__leaf { text-align: right; }
        }

        // #endregion
        @media (prefers-reduced-motion: reduce) {
            &__wires .link {
                stroke-dashoffset: 0;
                animation: none;
            }
            &__leaf, &__branch, &__wires .wire { transition: none; }
        }
    }
    @keyframes dd-mindmap-draw {
        to { stroke-dashoffset: 0; }
    }
</style>
