<script setup lang="ts">
    import type { Spot } from '../showcase';
    import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
    import DinDonBell from '../../components/DinDonBell.vue';
    import { branches, DAY_STORY, features, isUpcoming, SHOWCASE, SHOWCASE_COPY } from '../featureMap';
    import { dayLayout, dayStep, gridLayout, isNarrow, orbitLayout, SHOWCASE_LAND_MS, SHOWCASE_NARROW_H, SHOWCASE_VIEW_MS, SHOWCASE_WIDE_H } from '../showcase';

    // 功能地圖開頭的介紹（2026-10-08，排法與時間在 showcase.ts）。蓋在心智圖上面的一層：
    // 一天的帳（時間軸）→ 最懶的六招（大卡）→ 全部接在一起（星座）→ 每顆晶片飛回心智圖上自己的位置，地圖接手。
    // 每一個功能只有一顆晶片，換排法就是同一顆移動過去（transform 的 transition），看起來是功能自己在走，不是換投影片。
    // - 捲到看得見才開始；每幕 5 秒；上面的進度就是章節，可以點；「直接看地圖」隨時跳過
    // - 只動 transform、opacity；播完這層整個拿掉，什麼都不留著跑
    // - 飛回去的目標是量心智圖上 data-node="f-<id>" 的位置（這層的父元素裡）
    const emit = defineEmits<{ landing: []; done: [] }>();

    type View = 'day' | 'six' | 'orbit' | 'map';
    const VIEWS: { id: Exclude<View, 'map'>; title: string; sub: string }[] = [
        { id: 'day', title: '一天的帳，會用到這些', sub: '從早餐到睡前，大部分不用你動手' },
        { id: 'six', title: '最懶的六招', sub: '第一次用的人，最常說「原來可以這樣」的' },
        { id: 'orbit', title: `${features.length} 個功能，全部接在一起`, sub: `${branches.length} 個分支，記下來、整理、看懂、規劃…` }
    ];

    const view = ref<View>('day');
    const playing = ref(false);
    const landing = ref(false);
    const stageRef = ref<HTMLElement>();
    const width = ref(960);
    const height = ref(560);
    const narrow = computed(() => isNarrow(width.value));

    // #region [P] 每一幕每顆晶片要去哪
    interface Target extends Spot { scale: number; opacity: number }
    const branchOrder = branches.map(branch => branch.id);
    const ordered = [...features].sort((a, b) => branchOrder.indexOf(a.branch) - branchOrder.indexOf(b.branch));
    const daySpots = computed(() => dayLayout(DAY_STORY.length, width.value, height.value));
    const sixCells = computed(() => gridLayout(SHOWCASE.length, width.value, height.value));
    const orbit = computed(() => orbitLayout(branches.map(branch => features.filter(f => f.branch === branch.id).length), width.value, height.value));
    /** 飛回地圖時量到的位置 */
    const mapSpots = ref<Record<string, Spot>>({});

    const center = computed(() => ({ x: width.value / 2, y: height.value / 2 }));
    function targetOf(id: string): Target {
        const hidden = { ...center.value, scale: 0.4, opacity: 0 };
        if (view.value === 'day') {
            const index = DAY_STORY.findIndex(step => step.feature === id);
            return index < 0 ? hidden : { ...daySpots.value[index], scale: 1, opacity: 1 };
        }
        if (view.value === 'six') {
            const index = SHOWCASE.indexOf(id);
            if (index < 0) return hidden;
            const cell = sixCells.value[index];
            return { x: cell.x, y: cell.y - cell.h / 2 + 26, scale: 1, opacity: 1 };
        }
        if (view.value === 'orbit') {
            const index = ordered.findIndex(f => f.id === id);
            const spot = orbit.value.spots[index];
            // 六招照常大小，其他縮小、淡一點：像星座，主角一眼看得到
            const star = SHOWCASE.includes(id);
            return { ...spot, scale: star ? (narrow.value ? 0.82 : 1) : (narrow.value ? 0.48 : 0.62), opacity: star ? 1 : 0.8 };
        }
        const spot = mapSpots.value[id];
        return spot ? { ...spot, scale: 1, opacity: 1 } : hidden;
    }
    const chips = computed(() => ordered.map((feature, index) => {
        const target = targetOf(feature.id);
        return {
            feature,
            style: {
                '--branch': `var(--g-${feature.branch})`,
                'transform': `translate(${target.x}px, ${target.y}px) translate(-50%, -50%) scale(${target.scale})`,
                'opacity': target.opacity,
                // 一顆一顆錯開出發，像一群東西在移動；最多差 0.35 秒
                'transitionDelay': `${Math.min(index * 9, 350)}ms`
            }
        };
    }));
    // #endregion

    // #region [P] 時間軸
    let timer = 0;
    function show(next: View) {
        clearTimeout(timer);
        view.value = next;
        if (next === 'map') return land();
        if (!playing.value) return;
        const index = VIEWS.findIndex(v => v.id === next);
        timer = window.setTimeout(show, SHOWCASE_VIEW_MS, index + 1 < VIEWS.length ? VIEWS[index + 1].id : 'map');
    }
    /** 量心智圖上每個功能的位置，晶片飛過去；飛完通知外面把這層拿掉 */
    async function land() {
        playing.value = false;
        landing.value = true;
        emit('landing'); // 外面把地圖的高度放開，才量得到下面每片葉子的位置
        await nextTick();
        const stage = stageRef.value!.getBoundingClientRect();
        const map = stageRef.value!.parentElement!;
        const spots: Record<string, Spot> = {};
        for (const el of map.querySelectorAll<HTMLElement>('[data-node^="f-"]')) {
            const rect = el.getBoundingClientRect();
            spots[el.dataset.node!.slice(2)] = { x: rect.left - stage.left + rect.width / 2, y: rect.top - stage.top + rect.height / 2 };
        }
        mapSpots.value = spots;
        timer = window.setTimeout(emit, SHOWCASE_LAND_MS, 'done');
    }
    function jump(id: View) {
        playing.value = id !== 'map';
        show(id);
    }
    // #endregion

    let observer: IntersectionObserver | undefined;
    let resizer: ResizeObserver | undefined;
    onMounted(() => {
        const stage = stageRef.value!;
        const measure = () => {
            width.value = stage.clientWidth;
            height.value = isNarrow(stage.clientWidth) ? SHOWCASE_NARROW_H : SHOWCASE_WIDE_H;
        };
        measure();
        resizer = new ResizeObserver(measure);
        resizer.observe(stage);
        // 捲到看得見一半才開始，第一幕先靜靜擺著
        observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting || playing.value || landing.value) return;
            observer?.disconnect();
            playing.value = true;
            show('day');
        }, { threshold: 0.5 });
        observer.observe(stage);
    });
    onBeforeUnmount(() => {
        clearTimeout(timer);
        observer?.disconnect();
        resizer?.disconnect();
    });

    const upcoming = (id: string) => {
        const feature = features.find(f => f.id === id);
        return !!feature && isUpcoming(feature);
    };
    const nameOf = (id: string) => features.find(f => f.id === id)?.name ?? id;
    const branchOf = (id: string) => features.find(f => f.id === id)?.branch ?? 'capture';
    const viewIndex = computed(() => VIEWS.findIndex(v => v.id === view.value));
</script>

<template>
    <div
        ref="stageRef"
        class="dd-showcase"
        :class="[`is-${view}`, { 'is-landing': landing, 'is-narrow': narrow }]"
        :style="{ '--stage-h': `${height}px`, '--sun-run': `${width * 0.88}px`, '--stop-w': `${Math.max(90, dayStep(DAY_STORY.length, width) - 12)}px` }"
        role="region"
        aria-label="功能地圖的介紹"
    >
        <!-- #region [P] 標題與章節 -->
        <div class="dd-showcase__head">
            <Transition name="dd-showcase-fade" mode="out-in">
                <div v-if="view !== 'map'" :key="view" class="dd-showcase__title">
                    <strong>{{ VIEWS[viewIndex]?.title }}</strong>
                    <span>{{ VIEWS[viewIndex]?.sub }}</span>
                </div>
            </Transition>
            <div class="dd-showcase__controls">
                <ol class="dd-showcase__chapters" aria-label="介紹的章節">
                    <li v-for="(item, index) in VIEWS" :key="item.id">
                        <button
                            type="button"
                            :class="{ 'is-done': index < viewIndex || view === 'map', 'is-now': item.id === view }"
                            :aria-current="item.id === view ? 'step' : undefined"
                            @click="jump(item.id)"
                        >
                            <span :key="`${item.id}-${view}`" class="fill" :class="{ 'is-running': item.id === view && playing }" />
                            <span class="label">{{ item.title.replace(/，.*/, '') }}</span>
                        </button>
                    </li>
                </ol>
                <button type="button" class="dd-showcase__skip" @click="jump('map')">直接看地圖</button>
            </div>
        </div>
        <!-- #endregion -->

        <!-- #region [P] 一天的帳：時間軸、會走的太陽、每一站的時間與說明 -->
        <div class="dd-showcase__layer dd-showcase__layer--day" aria-hidden="true">
            <span class="line" />
            <span class="sun" />
            <div
                v-for="(step, index) in DAY_STORY"
                :key="step.time"
                class="dd-showcase__stop"
                :style="{ '--x': `${daySpots[index]?.x}px`, '--y': `${daySpots[index]?.y}px`, '--i': index }"
            >
                <span class="when"><b>{{ step.time }}</b>{{ step.scene }}</span>
                <span class="result">{{ step.result }}</span>
            </div>
        </div>
        <!-- #endregion -->

        <!-- #region [P] 最懶的六招：大卡 -->
        <div class="dd-showcase__layer dd-showcase__layer--six" aria-hidden="true">
            <div
                v-for="(id, index) in SHOWCASE"
                :key="id"
                class="dd-showcase__card"
                :style="{
                    '--x': `${sixCells[index]?.x}px`,
                    '--y': `${sixCells[index]?.y}px`,
                    '--w': `${sixCells[index]?.w}px`,
                    '--h': `${sixCells[index]?.h}px`,
                    '--i': index,
                    '--branch': `var(--g-${branchOf(id)})`,
                }"
            >
                <strong>{{ SHOWCASE_COPY[id]?.hook }}</strong>
                <span>{{ SHOWCASE_COPY[id]?.line }}</span>
                <em v-if="upcoming(id)">下一版</em>
            </div>
        </div>
        <!-- #endregion -->

        <!-- #region [P] 全部接在一起：中間是叮咚，分支名稱圍著 -->
        <div class="dd-showcase__layer dd-showcase__layer--orbit" aria-hidden="true">
            <DinDonBell :size="64" class="hub" :style="{ '--x': `${orbit.center.x}px`, '--y': `${orbit.center.y}px` }" />
            <span
                v-for="(branch, index) in branches"
                :key="branch.id"
                class="branch"
                :style="{ '--x': `${orbit.labels[index]?.x}px`, '--y': `${orbit.labels[index]?.y}px`, '--branch': `var(--g-${branch.id})` }"
            >{{ branch.title }}</span>
        </div>
        <!-- #endregion -->

        <!-- 每個功能一顆晶片，所有幕共用 -->
        <ul class="dd-showcase__chips" aria-hidden="true">
            <li
                v-for="chip in chips"
                :key="chip.feature.id"
                class="dd-showcase__chip"
                :class="{ 'is-star': SHOWCASE.includes(chip.feature.id) }"
                :style="chip.style"
            >
                {{ nameOf(chip.feature.id) }}
            </li>
        </ul>

        <!-- 螢幕閱讀器：直接說這段在介紹什麼，不用看動畫 -->
        <p class="dd-showcase__sr">
            最懶的六招：<template v-for="id in SHOWCASE" :key="id">{{ nameOf(id) }}——{{ SHOWCASE_COPY[id]?.line }}。</template>
        </p>
    </div>
</template>

<style lang="scss">
    .dd-showcase {
        position: absolute;
        inset: 0 0 auto;
        height: var(--stage-h);
        color: var(--dd-text);
        pointer-events: none;
        transition: height .9s var(--dd-ease-out);
        z-index: 5;

        // 飛回地圖時，這層要跟地圖一樣高（晶片會飛到下面的葉子），點擊讓給地圖
        &.is-landing { height: 100%; }
        &__head {
            position: relative;
            @include setFlex(space-between, flex-start, 12px);
            flex-wrap: wrap;
            pointer-events: auto;
            z-index: 2;
        }
        &.is-landing &__head {
            transition: opacity .3s;
            opacity: 0;
        }
        &__title {
            @include setFlex(flex-start, flex-start, 2px, column);

            strong {
                font-size: clamp(1.25rem, 1.05rem + .9vw, 1.75rem);
                font-weight: 900;
            }
            span {
                color: var(--dd-muted);
                font-size: var(--font-size-s);
            }
        }
        &__controls {
            @include setFlex(flex-end, center, 12px);
        }
        &__chapters {
            display: flex;
            gap: 6px;
            padding: 0;
            margin: 0;
            list-style: none;

            button {
                @include setFlex(flex-start, flex-start, 4px, column);
                position: relative;
                background: none;
                width: 88px;
                padding: 0;
                border: 0;
                color: var(--dd-muted);
                font: inherit;
                font-size: 11px;
                cursor: pointer;

                &::before {
                    content: '';
                    display: block;
                    background: var(--dd-border);
                    width: 100%;
                    height: 4px;
                    border-radius: 2px;
                }
                &.is-now { color: var(--dd-text); }
            }
            .fill {
                position: absolute;
                top: 0;
                left: 0;
                background: var(--dd-text);
                width: 100%;
                height: 4px;
                border-radius: 2px;
                transform: scaleX(0);
                transform-origin: left;
            }
            .is-done .fill { transform: none; }
            .fill.is-running { animation: dd-showcase-fill 5s linear forwards; }
        }
        &__skip {
            background: var(--dd-text);
            padding: 6px 14px;
            border: 0;
            border-radius: 999px;
            color: var(--dd-bg);
            font: inherit;
            font-size: var(--font-size-xs);
            font-weight: 700;
            white-space: nowrap;
            cursor: pointer;
        }

        // #region [P] 各幕的底圖（字、線、卡）：不是這一幕就淡掉
        &__layer {
            position: absolute;
            inset: 0;
            transition: opacity .5s var(--dd-ease-out);
            opacity: 0;
        }
        &.is-day &__layer--day,
        &.is-six &__layer--six,
        &.is-orbit &__layer--orbit { opacity: 1; }
        &__layer--day {
            .line {
                position: absolute;
                top: calc(var(--stage-h) * .56);
                right: 6%;
                left: 6%;
                background: var(--dd-border);
                height: 3px;
                border-radius: 2px;
            }

            // 太陽從早走到晚（5 秒走完）
            .sun {
                position: absolute;
                top: calc(var(--stage-h) * .56 - 9px);
                left: 6%;
                background: var(--dd-accent);
                width: 20px;
                height: 20px;
                border-radius: 50%;
                transform: translateX(-50%);
                transition: transform 4.6s linear;
            }
        }
        &.is-day &__layer--day .sun { transform: translateX(calc(var(--sun-run, 1000px) - 50%)); }
        &__stop {
            position: absolute;
            top: var(--y);
            left: var(--x);
            @include setFlex(flex-start, center, 0, column);
            width: var(--stop-w);
            margin-left: calc(var(--stop-w) / -2);
            text-align: center;

            .when {
                position: absolute;
                bottom: 26px;
                @include setFlex(center, center, 2px, column);
                color: var(--dd-muted);
                font-size: 12px;

                b {
                    color: var(--dd-text);
                    font-size: 18px;
                    font-variant-numeric: tabular-nums;
                }
            }
            .result {
                position: absolute;
                top: 26px;
                width: 100%;
                color: var(--dd-text);
                font-size: 12px;
                font-weight: 600;
                line-height: 1.5;
            }
        }
        &.is-narrow &__layer--day .line {
            inset: 100px auto 30px 72%;
            width: 3px;
            height: auto;
        }
        &.is-narrow &__layer--day .sun { display: none; }
        &.is-narrow &__stop {
            left: 4%;
            align-items: flex-start;
            width: 58%;
            margin-left: 0;
            text-align: left;
            transform: translateY(-50%);

            .when {
                position: static;
                flex-direction: row;
                gap: 6px;
                margin-top: -10px;
            }
            .result { position: static; }
        }
        &__card {
            position: absolute;
            top: calc(var(--y) - var(--h) / 2);
            left: calc(var(--x) - var(--w) / 2);
            @include setFlex(flex-start, center, 6px, column);
            background: color-mix(in srgb, var(--branch) 10%, var(--dd-surface));
            width: var(--w);
            height: var(--h);
            padding: 52px 16px 14px;
            border-radius: 18px;
            text-align: center;
            transform: translateY(16px);
            transition: transform .6s var(--dd-ease-out) calc(var(--i) * 60ms);

            strong {
                color: var(--branch);
                font-size: clamp(1rem, .9rem + .5vw, 1.25rem);
                font-weight: 900;
            }
            span {
                color: var(--dd-muted);
                font-size: 13px;
                line-height: 1.5;
            }
            em {
                position: absolute;
                top: 10px;
                right: 12px;
                background: var(--dd-accent);
                padding: 1px 8px;
                border-radius: 999px;
                color: #1B1815;
                font-size: 11px;
                font-weight: 800;
                font-style: normal;
            }
        }
        &.is-six &__card { transform: none; }
        &.is-narrow &__card {
            padding: 46px 10px 10px;

            // 卡片窄，右上角的「下一版」會蓋到晶片：放到右下角
            em {
                top: auto;
                bottom: 8px;
            }

            span { font-size: 12px; }
        }
        &__layer--orbit {
            .hub {
                position: absolute;
                top: var(--y);
                left: var(--x);
                transform: translate(-50%, -50%);
            }
            .branch {
                position: absolute;
                top: var(--y);
                left: var(--x);
                color: var(--branch);
                font-size: 13px;
                font-weight: 900;
                transform: translate(-50%, -50%);
            }
        }

        // #endregion

        // #region [P] 晶片：所有幕共用，位置由 style 的 transform 決定
        &__chips {
            padding: 0;
            margin: 0;
            list-style: none;
        }
        &__chip {
            position: absolute;
            top: 0;
            left: 0;
            background: var(--dd-surface);
            padding: 6px 12px;
            border-left: 4px solid var(--branch);
            border-radius: 10px;
            box-shadow: 0 4px 14px rgb(27 24 21 / 8%);
            color: var(--dd-text);
            font-size: 13px;
            font-weight: 700;
            white-space: nowrap;
            transition: transform .9s var(--dd-ease-out), opacity .5s var(--dd-ease-out);

            // 六招疊在其他功能上面：星座裡擠到的時候，主角不會被蓋住
            &.is-star {
                background: color-mix(in srgb, var(--branch) 14%, var(--dd-surface));
                z-index: 1;
            }
        }
        &.is-landing &__chip { transition-duration: 1.2s, .5s; }

        // #endregion
        &__sr {
            position: absolute;
            clip-path: inset(50%);
            width: 1px;
            height: 1px;
            overflow: hidden;
        }

        // 換幕標題
        .dd-showcase-fade-enter-active { transition: transform .4s var(--dd-ease-out), opacity .4s; }
        .dd-showcase-fade-leave-active { transition: opacity .2s; }
        .dd-showcase-fade-enter-from {
            transform: translateY(8px);
            opacity: 0;
        }
        .dd-showcase-fade-leave-to { opacity: 0; }
    }
    @keyframes dd-showcase-fill {
        from { transform: scaleX(0); }
        to { transform: none; }
    }
</style>
