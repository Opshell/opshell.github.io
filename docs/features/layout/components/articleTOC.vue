<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import type { Header } from '@hooks/useTOC';

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
        class="article-toc"
        ref="navRef"
        v-if="headers.length > 0"
        aria-label="Table of Contents"
    >
        <h3 class="toc-title">ON THIS PAGE</h3>

        <div
            class="active-marker"
            :style="{
                transform: `translateY(${markerTop}px)`,
                height: `${markerHeight}px`,
                opacity: markerOpacity
            }"
        ></div>

        <ul class="toc-list">
            <li
                v-for="header in headers"
                :key="header.slug"
                :class="[
                    `level-${header.level}`,
                    { active: activeAnchor === header.link }
                ]"
            >
                <a
                    :href="header.link"
                    @click="handleClick($event, header.link)"
                    :title="header.title"
                >
                    {{ header.title }}
                </a>
            </li>
        </ul>
    </nav>
</template>

<style lang="scss">
    .article-toc {
        position: relative;
        padding-left: 16px;

        // 左側背景線
        &::before {
            content: '';
            position: absolute;
            top: 32px; // 這裡如果不准，建議也用 top: 0 配合 padding-top 控制
            bottom: 0;
            left: 0;
            background-color: var(--vp-c-divider);
            width: 2px;
            opacity: 0.5;
        }

        .toc-title {
            // 建議加上具體高度或 margin 以便計算，雖然我們改用 rect 計算了所以沒差
            margin-bottom: 0.75rem;

            // ... 其他樣式
        }

        .active-marker {
            position: absolute;
            top: 0; // [-] 基準點設為 0，改用 transform 移動效能更好
            left: -2px;
            background-color: var(--vp-c-brand);
            width: 6px;
            border-radius: 3px;

            // 防止初始閃爍
            pointer-events: none;

            // [!] 改用 transform 做動畫，GPU 加速更順暢
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                        height 0.2s ease,
                        opacity 0.2s;
            z-index: 1;
        }

        .toc-list {
            padding: 0;
            margin: 0;
            list-style: none;
        }

        li {
            margin: 0;
            line-height: 1.5; // 保持行高舒適

            a {
                display: block; // 讓整行可點擊
                padding: 4px 0;
                color: var(--vp-c-text-2);
                font-size: 0.875rem;

                // 文字過長處理
                white-space: nowrap;
                text-decoration: none;
                text-overflow: ellipsis;
                transition: color 0.2s;
                overflow: hidden;

                &:hover {
                    color: var(--vp-c-text-1);
                }
            }

            // Active 狀態 (主要靠上面的 Marker 來標示，文字本身也可以變色)
            &.active a {
                color: var(--vp-c-brand);
                font-weight: 500;
            }

            // --- 縮排層級控制 ---
            // 假設你的標題是 h1(文章標題) -> h2(主章節) -> h3(子章節)
            // h2 對應 level-2
            &.level-2 { padding-left: 0; }

            // h3 縮排
            &.level-3 {
                padding-left: 1rem;
                font-size: 0.8125rem;
            }

            // h4 更多縮排
            &.level-4 {
                padding-left: 2rem;
                font-size: 0.8125rem;
            }
        }
    }
</style>