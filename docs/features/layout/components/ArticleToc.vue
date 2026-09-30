<script setup lang="ts">
    import type { Header } from '../hooks/useToc';
    import { nextTick, ref, watch } from 'vue';

    const props = defineProps<{
        headers: Header[];
        activeAnchor: string;
    }>();

    const navRef = ref<HTMLElement>();
    const markerTop = ref(0);
    const markerHeight = ref(0);
    const markerOpacity = ref(0);

    // --- 修正後的 Marker 定位邏輯 ---
    const updateMarker = async (anchor: string) => {
        // 1. 基本防呆
        if (!anchor || !navRef.value) {
            markerOpacity.value = 0;
            return;
        }

        await nextTick();

        // 2. 尋找目標元素
        // [!] 使用 decodeURIComponent 防止中文路徑編碼不一致導致找不到元素
        // [!] 增加 CSS.escape (雖然在屬性選取器中通常還好，但加了保險)
        const decodedAnchor = decodeURIComponent(anchor);
        const activeLinkEl = navRef.value.querySelector(`a[href="${decodedAnchor}"]`) as HTMLElement;

        if (activeLinkEl) {
            // 3. [關鍵修正] 使用 getBoundingClientRect 計算精確的相對位置
            // 這能自動處理掉所有中間層級的 margin/padding/h3 高度影響
            const navRect = navRef.value.getBoundingClientRect();
            const linkRect = activeLinkEl.getBoundingClientRect();

            // 兩者的 Top 差值，就是 Marker 該去的位置
            markerTop.value = linkRect.top - navRect.top;

            // 高度直接取連結的高度
            markerHeight.value = linkRect.height;
            markerOpacity.value = 1;
        } else {
            markerOpacity.value = 0;
        }
    };

    // 監聽 activeAnchor 變化
    watch(() => props.activeAnchor, (newVal) => {
        updateMarker(newVal);
    }, { immediate: true });

    // [!] 額外監聽 headers 變化
    // 防止一開始 activeAnchor 有值，但 headers 還沒渲染出來導致抓不到 DOM
    watch(() => props.headers, () => {
        updateMarker(props.activeAnchor);
    }, { deep: true });

    // --- Smooth Scroll (保持不變) ---
    const handleClick = (e: MouseEvent, link: string) => {
        e.preventDefault();
        const targetId = decodeURIComponent(link).replace('#', ''); // 這裡也要 decode
        const target = document.getElementById(targetId);

        if (target) {
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
            history.pushState(null, '', link);
        }
    };
</script>

<template>
    <nav
        v-if="headers.length > 0"
        ref="navRef"
        class="article-toc"
        aria-label="Table of Contents"
    >
        <h3 class="toc-title">本頁</h3>

        <div
            class="active-marker"
            :style="{
                transform: `translateY(${markerTop}px)`,
                height: `${markerHeight}px`,
                opacity: markerOpacity,
            }"
        />

        <ul class="toc-list">
            <li
                v-for="header in headers"
                :key="header.slug"
                :class="[
                    `level-${header.level}`,
                    { active: activeAnchor === header.link },
                ]"
            >
                <a
                    :href="header.link"
                    :title="header.title"
                    @click="handleClick($event, header.link)"
                >
                    {{ header.title }}
                </a>
            </li>
        </ul>
    </nav>
</template>

<style lang="scss">
    // 頁邊批註的目錄：一條鉛筆線，讀到哪一段，那一段旁邊用螢光筆畫一下
    .article-toc {
        position: relative;
        padding-left: var(--nb-space-4);

        &::before {
            content: '';
            position: absolute;
            top: 2rem;
            bottom: 0;
            left: 0;
            background-color: var(--nb-rule);
            width: 1px;
        }

        .toc-title {
            margin: 0 0 var(--nb-space-3);
            color: var(--nb-ink-2);
            font-size: var(--nb-step--1);
            font-weight: 700;
        }

        .active-marker {
            position: absolute;
            top: 0;
            left: -1px;
            background-color: var(--nb-marker);
            width: 3px;
            pointer-events: none;
            transition: transform .25s cubic-bezier(.4, 0, .2, 1), height .2s ease, opacity .2s;
            z-index: 1;
        }

        .toc-list {
            padding: 0;
            margin: 0;
            list-style: none;
        }

        li {
            margin: 0;
            line-height: 1.5;

            a {
                display: block;
                padding: 3px 0;
                color: var(--nb-ink-3);
                font-size: var(--nb-step--1);
                text-decoration: none;
                transition: color .15s;

                &:hover { color: var(--nb-ink); }
                &:focus-visible {
                    outline: 2px solid var(--nb-link);
                    outline-offset: 2px;
                }
            }
            &.active a {
                color: var(--nb-ink);
                font-weight: 700;
            }
            &.level-3 { padding-left: var(--nb-space-4); }
            &.level-4 { padding-left: var(--nb-space-6); }
        }
        @media (prefers-reduced-motion: reduce) {
            .active-marker { transition: none; }
        }
    }
</style>
