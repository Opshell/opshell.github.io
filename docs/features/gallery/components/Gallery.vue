<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import galleryData from '@photos/data.json';

import Card from './card.vue';
import WaterfallsFlow from './waterfallsFlow.vue';
import Lightbox from './lightbox.vue'; // 引入新組件

// --- 設定區 ---
const R2_DOMAIN = 'https://images.opshell.me';
const R2_THUMB = `${R2_DOMAIN}/thumbs`;
const R2_RAW = `${R2_DOMAIN}/raw`;

// --- 路由與狀態 ---
const currentAlbumId = ref<string | null>(null);
const lightboxIndex = ref<number | null>(null); // 控制 Lightbox 開關與索引

// --- 瀑布流相關 Refs ---
const gridRef = ref<HTMLElement | null>(null);
const itemRefs = ref<HTMLElement[]>([]);

// --- 瀑布流核心邏輯 ---
const resizeGridItem = (item: HTMLElement) => {
    const grid = gridRef.value;
    if (!grid) return;

    const rowHeight = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-auto-rows'));
    const rowGap = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-row-gap'));

    const content = item.querySelector('.photo-content');
    if (!content) return;

    const rowSpan = Math.ceil((content.getBoundingClientRect().height + rowGap) / (rowHeight + rowGap));
    item.style.gridRowEnd = `span ${rowSpan}`;
};

const resizeAllGridItems = () => {
    nextTick(() => {
        itemRefs.value.forEach((item) => {
            resizeGridItem(item);
        });
    });
};

const onImageLoad = (event: Event) => {
    const img = event.target as HTMLElement;
    const card = img.closest('.photo-item') as HTMLElement;
    if (card) resizeGridItem(card);
};

// --- ResizeObserver ---
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    // 注意：keydown 監聽現在移到 lightbox.vue 內部了，這裡不需要了

    resizeObserver = new ResizeObserver(() => {
        resizeAllGridItems();
    });
    if (gridRef.value) {
        resizeObserver.observe(gridRef.value);
    }
});

onUnmounted(() => {
    window.removeEventListener('hashchange', handleHashChange);
    if (resizeObserver) resizeObserver.disconnect();
});

// --- 路由邏輯 ---
const handleHashChange = () => {
    const hash = window.location.hash.replace('#', '');
    const exists = galleryData.some(a => a.id === hash);
    currentAlbumId.value = exists ? hash : null;
    lightboxIndex.value = null; // 切換相簿時關閉 lightbox
};

watch(currentAlbumId, () => {
    setTimeout(() => {
        resizeAllGridItems();
    }, 100);
});

const currentAlbum = computed(() => {
    return galleryData.find(a => a.id === currentAlbumId.value);
});

const openAlbum = (id: string) => {
    window.location.hash = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const backToList = () => {
    history.pushState(null, '', ' ');
    currentAlbumId.value = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const openLightbox = (index: number) => {
    lightboxIndex.value = index;
};
</script>

<template>
    <div class="gallery-page">
        <WaterfallsFlow v-if="!currentAlbum">
            <Card
                v-for="album in galleryData"
                :key="album.id"
                :album="album"
                @click="openAlbum(album.id)"
            />
        </WaterfallsFlow>

        <div v-else class="album-detail">
            <div class="detail-header">
                <button class="back-btn" @click="backToList"><span class="icon">←</span> Back</button>
                <div class="header-info">
                    <h2>{{ currentAlbum.title }}</h2>
                    <span class="subtitle">{{ currentAlbum.count }} Photos</span>
                </div>
            </div>

            <div class="masonry-grid" ref="gridRef">
                <div
                    v-for="(photo, index) in currentAlbum.photos"
                    :key="photo.filename"
                    class="photo-item"
                    ref="itemRefs"
                    @click="openLightbox(index)"
                >
                    <div class="photo-content">
                        <img
                            :src="`${R2_THUMB}/${photo.thumb}`"
                            loading="lazy"
                            :alt="photo.filename"
                            @load="onImageLoad"
                            :style="{ aspectRatio: `${photo.width} / ${photo.height}` }"
                        />
                        <div class="photo-overlay"><span class="zoom-icon">🔍</span></div>
                    </div>
                </div>
            </div>
        </div>

        <Lightbox
            v-if="currentAlbum"
            v-model="lightboxIndex"
            :photos="currentAlbum.photos"
            :r2-raw="R2_RAW"
        />
    </div>
</template>

<style lang="scss" scoped>
/* 共用變數 */
$shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 5%);
$shadow-md: 0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%);
$radius-lg: 1rem;
$brand-color: var(--vp-c-brand);
$bg-color: var(--vp-c-bg);

.gallery-page {
    max-width: 1440px;
    padding: 2rem 1rem;
    margin: 0 auto;
}

/* 內頁樣式 */
.detail-header {
    display: flex; align-items: center; justify-content: space-between; padding-bottom: 1rem; border-bottom: 1px solid var(--vp-c-divider); margin-bottom: 2rem;
    .back-btn { display: flex; gap: 5px; align-items: center;
        background: none; padding: 8px 16px; border: none; border-radius: 8px; color: var(--vp-c-text-2); font-size: 1rem; cursor: pointer; transition: background 0.2s;
        &:hover { background: var(--vp-c-bg-soft); color: $brand-color; }
    }
    .header-info { text-align: right; h2 { margin: 0; font-size: 1.5rem; } .subtitle { color: var(--vp-c-text-2); font-size: 0.9rem; } }
}

.masonry-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    grid-auto-rows: 10px;
    gap: 20px;
}

.photo-item {
    position: relative;
    background: var(--vp-c-bg-soft);
    border-radius: 8px;
    cursor: zoom-in;
    overflow: hidden;
}

.photo-content { display: block; }

.photo-item img {
    display: block;
    width: 100%;
    height: auto;
    transition: opacity 0.3s;
}

.photo-overlay {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / 30%); transition: opacity 0.2s; opacity: 0;
    .zoom-icon { color: white; font-size: 2rem; transform: scale(0.8); transition: transform 0.2s; }
}
.photo-item:hover {
    .photo-overlay { opacity: 1; }
    .zoom-icon { transform: scale(1); }
}
</style>