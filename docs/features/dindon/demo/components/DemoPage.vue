<script setup lang="ts">
    import type { Component } from 'vue';
    import type { iDemoItem, iDemoStep } from '../types';
    import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
    import { ACCOUNT_PATH, CONTACT_EMAIL, PRIVACY_PATH } from '../../constants';
    import { countByStatus, demoIndex, findItem, isOpenable, MEDIA_BASE, openableItems } from '../catalog';
    import DemoPlayer from './DemoPlayer.vue';

    /**
     * diagram 那幾項由網頁自己畫，編號對到 App 倉庫的功能巧思清單。
     *
     * 一定要非同步載入：VitePress 第一次載入頁面用的是「精簡版」的頁面程式，會把元件裡的靜態 HTML 拿掉
     * （假設伺服器已經渲染過了）。圖解要等打開對話框才渲染，伺服器的 HTML 裡沒有它，直接 import 的話打開是空的。
     * 拆成自己的檔案就不會被精簡，也順便變成要看才下載。
     */
    const diagrams: Record<number, Component> = {
        4: defineAsyncComponent(() => import('./diagrams/RedactDiagram.vue')),
        10: defineAsyncComponent(() => import('./diagrams/InvoiceTimeDiagram.vue')),
        39: defineAsyncComponent(() => import('./diagrams/BackupDiagram.vue'))
    };

    const sectionOf = (item: iDemoItem) => demoIndex.sections.find(section => section.items.includes(item))!;
    const clock = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
    const thumbOf = (item: iDemoItem) => `${MEDIA_BASE}${item.poster!.replace(/\.\w+$/, '.thumb.webp')}`;

    const stats = {
        ready: countByStatus('ready'),
        diagram: countByStatus('diagram'),
        pending: countByStatus('phone') + countByStatus('todo')
    };

    // #region [P] 對話框：點目錄的卡片打開，網址帶 #編號-名稱 可以直接分享某一支
    const dialogRef = ref<HTMLDialogElement>();
    const playerRef = ref<InstanceType<typeof DemoPlayer>>();
    const current = shallowRef<iDemoItem>();
    const time = ref(0);
    const autoplay = ref(true);

    const currentIndex = computed(() => (current.value ? openableItems.indexOf(current.value) : -1));
    const prevItem = computed(() => openableItems[currentIndex.value - 1]);
    const nextItem = computed(() => openableItems[currentIndex.value + 1]);

    /** 步驟清單只列有說明的；沒有說明的點擊只畫手指 */
    const listedSteps = computed(() => (current.value?.steps ?? [])
        .filter(step => step.label || step.type === 'back'));
    const activeStep = computed(() => listedSteps.value.findLastIndex(step => step.t - 0.1 <= time.value));
    const stepText = (step: iDemoStep) => {
        if (step.type === 'type') return `輸入「${step.label}」`;
        if (step.type === 'back') return step.label ?? '按返回鍵';
        return step.label!;
    };

    function open(item: iDemoItem) {
        current.value = item;
        time.value = 0;
        history.replaceState(history.state, '', `#${item.id}`);
        if (!dialogRef.value?.open) {
            dialogRef.value?.showModal();
            document.documentElement.style.overflow = 'hidden'; // 對話框開著的時候後面的頁面不要跟著捲
        }
        nextTick(() => dialogRef.value?.querySelector('.demo-dialog__side')?.scrollTo({ top: 0 }));
    }
    function close() {
        dialogRef.value?.close();
    }
    function onClose() {
        document.documentElement.style.overflow = '';
        history.replaceState(history.state, '', location.pathname + location.search);
        // 回到目錄時停在剛剛那張卡片上
        if (current.value) document.getElementById(current.value.id)?.focus({ preventScroll: false });
        current.value = undefined;
    }
    function onBackdrop(event: MouseEvent) {
        if (event.target === dialogRef.value) close();
    }
    function seekTo(step: iDemoStep) {
        // 早一點點開始，看得到手指移過去
        playerRef.value?.seek(step.t - 0.6);
        playerRef.value?.play();
    }
    function onKeydown(event: KeyboardEvent) {
        const target = event.target as HTMLElement;
        if (event.key === 'ArrowLeft' && prevItem.value) open(prevItem.value);
        else if (event.key === 'ArrowRight' && nextItem.value) open(nextItem.value);
        else if (event.key === ' ' && !target.closest('button, a') && playerRef.value) playerRef.value.toggle();
        else return;
        event.preventDefault();
    }

    /** 網址帶著某一支的錨點就直接打開；還沒錄好的就只捲到那張卡片（瀏覽器自己會做） */
    function openFromHash() {
        const item = findItem(decodeURIComponent(location.hash.slice(1)));
        if (item) open(item);
    }

    // #endregion

    onMounted(() => {
        autoplay.value = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        openFromHash();
        window.addEventListener('hashchange', openFromHash);
    });
    onBeforeUnmount(() => {
        window.removeEventListener('hashchange', openFromHash);
        document.documentElement.style.overflow = '';
    });
</script>

<template>
    <div class="dindon-landing dindon-demo">
        <!-- #region [P] 開頭 -->
        <header class="dindon-demo__hero">
            <div class="dindon-landing__container">
                <a class="dindon-demo__back" href="/dindon/">← 叮咚記帳</a>
                <h1 class="dindon-demo__headline">功能演示</h1>
                <!-- 中文寫在同一行：換行會在句號後面多出一個空格 -->
                <p class="dindon-demo__lead">
                    叮咚記帳的巧思多半藏在手感裡，用講的不如直接看。這裡的畫面都是 App 的真實錄影，手指和說明是另外疊上去的。
                </p>
                <p class="dindon-demo__meta">
                    App {{ demoIndex.appVersion }} · {{ stats.ready }} 支演示 · {{ stats.diagram }} 張圖解<template v-if="stats.pending"> · {{ stats.pending }} 項準備中</template>
                </p>

                <nav class="dindon-demo__toc" aria-label="功能分類">
                    <a v-for="section in demoIndex.sections" :key="section.id" :href="`#section-${section.id}`">
                        {{ section.title }}<span class="count">{{ section.items.length }}</span>
                    </a>
                </nav>
            </div>
        </header>
        <!-- #endregion -->

        <!-- #region [P] 目錄：8 類，全部列出來；還沒錄好的也列，寫「準備中」 -->
        <main class="dindon-landing__container dindon-demo__catalog">
            <section v-for="section in demoIndex.sections" :id="`section-${section.id}`" :key="section.id" class="dindon-demo__section">
                <h2 class="dindon-demo__section-title">{{ section.title }}</h2>

                <ul class="dindon-demo__grid">
                    <li v-for="item in section.items" :key="item.id">
                        <component
                            :is="isOpenable(item) ? 'button' : 'div'"
                            :id="item.id"
                            :type="isOpenable(item) ? 'button' : undefined"
                            class="dindon-demo__card"
                            :class="`is-${item.status}`"
                            :tabindex="isOpenable(item) ? undefined : -1"
                            @click="isOpenable(item) && open(item)"
                        >
                            <span class="thumb" aria-hidden="true">
                                <img v-if="item.status === 'ready'" :src="thumbOf(item)" alt="" loading="lazy" width="120" height="267" />
                                <span v-else-if="item.status === 'diagram'" class="thumb-icon">圖解</span>
                                <span v-else class="thumb-icon is-muted">準備中</span>
                                <span v-if="item.status === 'ready'" class="thumb-play">▶</span>
                            </span>
                            <span class="body">
                                <span class="head">
                                    <span class="no">#{{ item.no }}</span>
                                    <span v-if="item.stars === 3" class="must">必看</span>
                                </span>
                                <span class="title">{{ item.title }}</span>
                                <span v-if="item.summary" class="summary">{{ item.summary }}</span>
                                <span class="meta">
                                    <template v-if="item.status === 'ready'">{{ clock(item.duration) }}</template>
                                    <template v-else-if="item.status === 'diagram'">看圖解</template>
                                    <template v-else-if="item.status === 'phone'">演示準備中：要用真的手機錄</template>
                                    <template v-else>演示準備中</template>
                                </span>
                            </span>
                        </component>
                    </li>
                </ul>
            </section>

            <p class="dindon-demo__outro">
                想自己玩玩看？<a href="/dindon/#beta">加入封閉測試</a>
            </p>
        </main>
        <!-- #endregion -->

        <footer class="dindon-landing__footer">
            <div class="dindon-landing__container">
                <a href="/dindon/">叮咚記帳</a>
                <span aria-hidden="true">·</span>
                <a :href="PRIVACY_PATH">隱私權政策</a>
                <span aria-hidden="true">·</span>
                <a :href="ACCOUNT_PATH">刪除資料與帳號</a>
                <span aria-hidden="true">·</span>
                <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>
            </div>
        </footer>

        <!-- #region [P] 播放對話框：左邊手機、右邊說明與步驟 -->
        <dialog ref="dialogRef" class="demo-dialog" :aria-label="current?.title" @close="onClose" @click="onBackdrop" @keydown="onKeydown">
            <div v-if="current" class="demo-dialog__inner">
                <button type="button" class="demo-dialog__close" aria-label="關閉" @click="close">✕</button>

                <div class="demo-dialog__stage">
                    <DemoPlayer v-if="current.status === 'ready'" ref="playerRef" v-model:time="time" :item="current" :autoplay="autoplay" />
                    <div v-else class="demo-diagram">
                        <component :is="diagrams[current.no]" />
                    </div>
                </div>

                <div class="demo-dialog__side">
                    <p class="demo-dialog__eyebrow">{{ sectionOf(current).title }} · #{{ current.no }}</p>
                    <h2 class="demo-dialog__title">{{ current.title }}</h2>
                    <p v-if="current.summary" class="demo-dialog__summary">{{ current.summary }}</p>

                    <ol v-if="listedSteps.length" class="demo-dialog__steps">
                        <li v-for="(step, index) in listedSteps" :key="index" :class="{ 'is-active': index === activeStep, 'is-done': index < activeStep }">
                            <button type="button" @click="seekTo(step)">
                                <span class="step-time">{{ clock(step.t) }}</span>
                                <span>{{ stepText(step) }}</span>
                            </button>
                        </li>
                    </ol>

                    <nav class="demo-dialog__nav" aria-label="上一個、下一個演示">
                        <button v-if="prevItem" type="button" @click="open(prevItem)">
                            <span class="dir">← 上一個</span>
                            <span class="name">{{ prevItem.title }}</span>
                        </button>
                        <button v-if="nextItem" type="button" class="is-next" @click="open(nextItem)">
                            <span class="dir">下一個 →</span>
                            <span class="name">{{ nextItem.title }}</span>
                        </button>
                    </nav>
                    <p class="demo-dialog__hint">鍵盤：← → 換一支、空白鍵暫停、Esc 關閉</p>
                </div>
            </div>
        </dialog>
        <!-- #endregion -->
    </div>
</template>

<style lang="scss">
    // 配色、外框、footer 沿用宣傳頁（根元素同時掛 .dindon-landing，吃同一組 --dd-* 與深色模式）
    .dindon-demo {
        // #region [P] 開頭
        &__hero {
            background: var(--dd-accent);
            padding: 48px 0 28px;
            color: #1B1815;
            @include setRWD(768px) { padding-top: 32px; }
        }
        &__back {
            display: inline-block;
            margin-bottom: 12px;
            color: #1B1815;
            font-size: var(--font-size-s);
            font-weight: 700;
            text-decoration: none;
            &:hover { text-decoration: underline; }
        }
        &__headline {
            font-size: clamp(2rem, 4.5vw, 3rem);
            font-weight: 800;
            line-height: 1.25;
        }
        &__lead {
            max-width: 40em;
            margin-top: 12px !important;
            font-size: var(--font-size-m);
        }
        &__meta {
            margin-top: 8px !important;
            color: rgb(27, 24, 21, 72%);
            font-size: var(--font-size-s);
        }
        &__toc {
            @include setFlex(flex-start, center, 8px);
            flex-wrap: wrap;
            margin-top: 24px;

            a {
                @include setFlex(center, center, 6px);
                background: rgb(255, 253, 248, 55%);
                padding: 4px 12px;
                border-radius: 999px;
                color: #1B1815;
                font-size: var(--font-size-s);
                font-weight: 700;
                text-decoration: none;
                @media (hover: hover) {
                    &:hover { background: #FFFDF8; }
                }
            }
            .count {
                color: rgb(27, 24, 21, 55%);
                font-size: var(--font-size-xs);
            }
        }

        // #endregion

        // #region [P] 目錄
        &__catalog { padding-bottom: 72px; }
        &__section {
            padding-top: 48px;
            scroll-margin-top: calc(var(--vp-nav-height) + 16px);
        }
        &__section-title {
            margin-bottom: 16px !important;
            font-size: var(--font-size-xl);
            font-weight: 800;
        }
        &__grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 14px;
            list-style: none;
            @include setRWD(500px) { grid-template-columns: 1fr; }
        }
        &__card {
            display: flex;
            gap: 14px;
            background: var(--dd-surface);
            @include setSize(100%, 100%);
            padding: 12px;
            border: 1px solid var(--dd-border);
            border-radius: var(--dd-radius);
            color: var(--dd-text);
            font: inherit;
            text-align: left;
            transition: transform .2s var(--dd-ease-out), border-color .2s;
            scroll-margin-top: calc(var(--vp-nav-height) + 24px);

            &:is(button) { cursor: pointer; }
            @media (hover: hover) {
                &:is(button):hover {
                    border-color: var(--dd-primary);
                    transform: translateY(-2px);
                }
            }
            &:focus-visible { outline: 3px solid var(--dd-primary); }
            &.is-phone, &.is-todo {
                background: transparent;
                border-style: dashed;

                .title { color: var(--dd-muted); }
            }
            .thumb {
                position: relative;
                flex-shrink: 0;
                @include setFlex(center, center);
                background: var(--dd-frame);
                @include setSize(72px, 160px);
                border: 4px solid var(--dd-frame);
                border-radius: 14px;
                overflow: hidden;

                img {
                    display: block;
                    @include setSize(100%, 100%);
                    border-radius: 10px;
                    object-fit: cover;
                }
            }
            &.is-diagram .thumb, &.is-phone .thumb, &.is-todo .thumb {
                background: var(--dd-sunken);
                border-color: var(--dd-sunken);
            }
            &.is-phone .thumb, &.is-todo .thumb { background: transparent; }
            .thumb-icon {
                color: var(--dd-accent-border);
                font-size: var(--font-size-s);
                font-weight: 800;
                writing-mode: vertical-rl;
                letter-spacing: .3em;

                &.is-muted { color: var(--dd-muted); }
            }
            .thumb-play {
                position: absolute;
                right: 6px;
                bottom: 6px;
                @include setFlex(center, center);
                background: rgb(27, 24, 21, 70%);
                @include setSize(24px, 24px);
                border-radius: 50%;
                color: #FEFDFC;
                font-size: 10px;
            }
            .body {
                @include setFlex(flex-start, flex-start, 4px, column);
                min-width: 0;
                padding-top: 2px;
            }
            .head {
                @include setFlex(flex-start, center, 8px);
            }
            .no {
                color: var(--dd-muted);
                font-size: var(--font-size-xs);
                font-variant-numeric: tabular-nums;
            }
            .must {
                background: var(--dd-accent);
                padding: 0 8px;
                border-radius: 999px;
                color: #1B1815;
                font-size: var(--font-size-xs);
                font-weight: 700;
            }
            .title {
                font-size: var(--font-size-m);
                font-weight: 800;
                line-height: 1.45;
            }
            .summary {
                color: var(--dd-muted);
                font-size: var(--font-size-s);
                line-height: 1.6;
            }
            .meta {
                margin-top: auto;
                color: var(--dd-accent-border);
                font-size: var(--font-size-xs);
                font-weight: 700;
            }
        }
        &__outro {
            margin-top: 56px !important;
            font-size: var(--font-size-m);
            text-align: center;

            a {
                color: var(--dd-primary);
                font-weight: 700;
                text-decoration: underline;
                text-underline-offset: 3px;
            }
        }

        // #endregion

        // 圖解共用的外框與註解（三張圖在 diagrams/ 底下）
        .demo-diagram {
            background: var(--dd-surface);

            // 固定寬度：對話框左欄是 auto 寬，用百分比的話會被註解裡的長句子撐開
            width: 380px;
            max-width: 100%;
            padding: 18px;
            border: 1px solid var(--dd-border);
            border-radius: var(--dd-radius);

            .notes {
                @include setFlex(flex-start, stretch, 6px, column);
                padding: 14px 0 0 1.2em;
                border-top: 1px solid var(--dd-border);
                margin-top: 16px;
                color: var(--dd-muted);
                font-size: var(--font-size-xs);
                line-height: 1.7;

                strong { color: var(--dd-text); }
            }
        }
    }

    // #region [P] 播放對話框
    .demo-dialog {
        // 手機的寬度跟著視窗高度走，整支手機一定看得完整
        --demo-phone-width: min(300px, calc((100dvh - 150px) * .45 + 20px));
        background: var(--dd-bg);
        width: min(880px, calc(100vw - 32px));
        max-width: none;
        max-height: calc(100dvh - 32px);
        padding: 0;
        border: 1px solid var(--dd-border); // 深色模式下對話框和遮罩幾乎同色，靠這條線分開
        border-radius: 24px;
        color: var(--dd-text);
        overflow: hidden;

        &::backdrop {
            background: rgb(19, 17, 9, 72%);
            backdrop-filter: blur(4px);
        }
        &__inner {
            position: relative;
            display: grid;
            grid-template-columns: auto 1fr;
            max-height: calc(100dvh - 32px);
        }
        &__stage {
            @include setFlex(center, center);
            background: var(--dd-sunken);
            padding: 24px 28px;
        }
        &__side {
            @include setFlex(flex-start, stretch, 12px, column);
            padding: 28px 28px 20px;
            overflow-y: auto;
        }
        &__close {
            position: absolute;
            top: 12px;
            right: 12px;
            background: var(--dd-surface);
            @include setSize(36px, 36px);
            border: 1px solid var(--dd-border);
            border-radius: 50%;
            color: var(--dd-text);
            cursor: pointer;
            z-index: 1;
            &:focus-visible { outline: 3px solid var(--dd-primary); }
        }
        &__eyebrow {
            color: var(--dd-accent-border);
            font-size: var(--font-size-s);
            font-weight: 700;
        }
        &__title {
            padding-right: 36px;
            font-size: var(--font-size-xl);
            font-weight: 800;
            line-height: 1.4;
        }
        &__summary { color: var(--dd-muted); }
        &__steps {
            @include setFlex(flex-start, stretch, 4px, column);
            list-style: none;

            button {
                display: flex;
                gap: 10px;
                background: transparent;
                width: 100%;
                padding: 6px 10px;
                border: 0;
                border-radius: 10px;
                color: var(--dd-muted);
                font: inherit;
                font-size: var(--font-size-s);
                line-height: 1.6;
                text-align: left;
                cursor: pointer;
                transition: background .2s, color .2s;
                @media (hover: hover) {
                    &:hover { background: var(--dd-surface); }
                }
                &:focus-visible { outline: 3px solid var(--dd-primary); }
            }
            .step-time {
                flex-shrink: 0;
                color: var(--dd-muted);
                font-size: var(--font-size-xs);
                font-variant-numeric: tabular-nums;
                line-height: 1.6rem;
            }
            .is-done button { color: var(--dd-text); }
            .is-active button {
                background: var(--dd-accent-tint);
                color: #1B1815;
                font-weight: 700;

                .step-time { color: #A87400; }
            }
        }
        &__note {
            background: var(--dd-surface);
            padding: 10px 12px;
            border-radius: 12px;
            color: var(--dd-muted);
            font-size: var(--font-size-xs);
        }
        &__nav {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            padding-top: 16px;
            margin-top: auto;

            button {
                @include setFlex(flex-start, flex-start, 2px, column);
                background: var(--dd-surface);
                padding: 10px 12px;
                border: 1px solid var(--dd-border);
                border-radius: 14px;
                color: var(--dd-text);
                font: inherit;
                text-align: left;
                cursor: pointer;
                @media (hover: hover) {
                    &:hover { border-color: var(--dd-primary); }
                }
                &:focus-visible { outline: 3px solid var(--dd-primary); }
            }
            .is-next {
                grid-column: 2;
                align-items: flex-end;
                text-align: right;
            }
            .dir {
                color: var(--dd-primary);
                font-size: var(--font-size-xs);
                font-weight: 700;
            }
            .name {
                font-size: var(--font-size-s);
                font-weight: 700;
                line-height: 1.5;
            }
        }
        &__hint {
            color: var(--dd-muted);
            font-size: var(--font-size-xs);
            text-align: center;
            @media (hover: none) { display: none; }
        }

        // 手機：整個畫面都是對話框，手機在上、說明在下，一起捲
        @include setRWD(720px) {
            --demo-phone-width: min(280px, calc((100dvh - 140px) * .45 + 12px));
            width: 100vw;
            height: 100dvh;
            max-height: 100dvh;
            border-radius: 0;
            overflow-y: auto;

            &__inner {
                grid-template-columns: 1fr;
                max-height: none;
            }
            &__stage { padding: 56px 16px 20px; }
            &__side {
                padding: 20px 16px 28px;
                overflow: visible;
            }
        }
    }

    // #endregion
</style>
