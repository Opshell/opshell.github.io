<script setup lang="ts">
    import galleryData from '@photos/data.json';
    import Card from './card.vue';

    // --- 設定區 ---
    // 根據你的 R2 設定調整
    const R2_DOMAIN = 'https://image.opshell.me';
    const R2_THUMB = `${R2_DOMAIN}/thumbs`;
    const R2_RAW = `${R2_DOMAIN}/raw`;

    // --- 路由與狀態 ---
    const currentAlbumId = ref<string | null>(null);
    const lightboxIndex = ref<number | null>(null); // Lightbox 當前顯示的圖片索引

    // --- 路由邏輯 (Hash Mode) ---
    const handleHashChange = () => {
        const hash = window.location.hash.replace('#', '');
        const exists = galleryData.some(a => a.id === hash);
        currentAlbumId.value = exists ? hash : null;
        lightboxIndex.value = null; // 切換相簿時關閉 Lightbox
    };

    onMounted(() => {
        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('keydown', handleKeydown); // 監聽鍵盤
    });

    onUnmounted(() => {
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('keydown', handleKeydown);
    });

    // 計算當前相簿
    const currentAlbum = computed(() => {
        return galleryData.find(a => a.id === currentAlbumId.value);
    });

    // 切換相簿
    const openAlbum = (id: string) => {
        window.location.hash = id;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const backToList = () => {
        history.pushState(null, '', ' '); // 清除 Hash
        currentAlbumId.value = null;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- Lightbox 邏輯 ---
    const openLightbox = (index: number) => {
        lightboxIndex.value = index;
        document.body.style.overflow = 'hidden'; // 鎖定背景捲動
    };

    const closeLightbox = () => {
        lightboxIndex.value = null;
        document.body.style.overflow = ''; // 恢復背景捲動
    };

    const nextPhoto = (e?: Event) => {
        e?.stopPropagation();
        if (currentAlbum.value && lightboxIndex.value !== null) {
            if (lightboxIndex.value < currentAlbum.value.photos.length - 1) {
                lightboxIndex.value++;
            } else {
                lightboxIndex.value = 0; // 循環播放
            }
        }
    };

    const prevPhoto = (e?: Event) => {
        e?.stopPropagation();
        if (currentAlbum.value && lightboxIndex.value !== null) {
            if (lightboxIndex.value > 0) {
                lightboxIndex.value--;
            } else {
                lightboxIndex.value = currentAlbum.value.photos.length - 1; // 循環播放
            }
        }
    };

    // 鍵盤控制
    const handleKeydown = (e: KeyboardEvent) => {
        if (lightboxIndex.value === null) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextPhoto();
        if (e.key === 'ArrowLeft') prevPhoto();
    };
</script>

<template>
    <div class="gallery-page">

        <div v-if="!currentAlbum" class="album-list">
            <Card v-for="album in galleryData"
                :key="album.id"
                @click="openAlbum(album.id)"
                :album
            />
        </div>

        <div v-else class="album-detail">
            <div class="detail-header">
                <button class="back-btn" @click="backToList">
                    <span class="icon">←</span> Back
                </button>
                <div class="header-info">
                    <h2>{{ currentAlbum.title }}</h2>
                    <span class="subtitle">{{ currentAlbum.count }} Photos</span>
                </div>
            </div>

            <div class="masonry-grid">
                <div
                    v-for="(photo, index) in currentAlbum.photos"
                    :key="photo.filename"
                    class="photo-item"
                    @click="openLightbox(index)"
                >
                    <img
                        :src="`${R2_THUMB}/${photo.thumb}`"
                        loading="lazy"
                        :alt="photo.filename"
                        :style="{ aspectRatio: `${photo.width} / ${photo.height}` }"
                    />
                    <div class="photo-overlay">
                        <span class="zoom-icon">🔍</span>
                    </div>
                </div>
            </div>
        </div>

        <Transition name="fade">
            <div v-if="lightboxIndex !== null && currentAlbum" class="lightbox" @click="closeLightbox">
                <button class="lb-close" @click="closeLightbox">✕</button>

                <div class="lb-content" @click.stop>
                    <button class="lb-nav lb-prev" @click="prevPhoto">‹</button>

                    <div class="lb-image-wrapper">
                        <img
                            :src="`${R2_RAW}/${currentAlbum.photos[lightboxIndex].src}`"
                            class="lb-img"
                        />
                        <div class="lb-info">
                            <p>{{ currentAlbum.photos[lightboxIndex].exif.camera }} {{ currentAlbum.photos[lightboxIndex].exif.lens }}</p>
                            <p class="exif-detail">
                                {{ currentAlbum.photos[lightboxIndex].exif.iso }} |
                                {{ currentAlbum.photos[lightboxIndex].exif.aperture }} |
                                {{ currentAlbum.photos[lightboxIndex].exif.shutter }}
                            </p>
                        </div>
                    </div>

                    <button class="lb-nav lb-next" @click="nextPhoto">›</button>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style lang="scss" scoped>
    // 模擬你的 SCSS 變數 (如果你有 global scss 可以移除這些)
    $shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 5%);
    $shadow-md: 0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%);
    $radius-lg: 1rem;
    $brand-color: var(--vp-c-brand); // VitePress 變數
    $bg-color: var(--vp-c-bg);

    .gallery-page {
        max-width: 1200px;
        padding: 2rem 1rem;
        margin: 0 auto;
    }

    /* --- 1. 相簿列表卡片 (仿照你的 Design System) --- */
    .album-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 2rem;
    }

    .album-card {
        background: $bg-color;
        border: 1px solid transparent;
        border-radius: $radius-lg;
        box-shadow: $shadow-md; // 使用類似你的卡片陰影
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        overflow: hidden;
    }

    /* --- 2. 瀑布流 Masonry --- */
    .detail-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--vp-c-divider);
        margin-bottom: 2rem;

        .back-btn {
            display: flex;
            gap: 5px;
            align-items: center;
            background: none;
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            color: var(--vp-c-text-2);
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.2s;

            &:hover {
                background: var(--vp-c-bg-soft);
                color: $brand-color;
            }
        }

        .header-info {
            text-align: right;
            h2 { margin: 0; font-size: 1.5rem; }
            .subtitle { color: var(--vp-c-text-2); font-size: 0.9rem; }
        }
    }

    .masonry-grid {
        // 關鍵：使用 column-count 實現真正的瀑布流
        column-count: 1; // 手機版
        column-gap: 1.5rem;
        @media (width >= 640px) { column-count: 2; }
        @media (width >= 1024px) { column-count: 3; }

        .photo-item {
            position: relative;
            background: var(--vp-c-bg-soft);
            border-radius: 8px;
            margin-bottom: 1.5rem;
            cursor: zoom-in;
            overflow: hidden;
            break-inside: avoid; // 防止圖片被切斷

            img {
                display: block;
                width: 100%;
                height: auto;
                transition: opacity 0.3s;
            }

            .photo-overlay {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgb(0,0,0,30%);
                transition: opacity 0.2s;
                opacity: 0;

                .zoom-icon {
                    color: white;
                    font-size: 2rem;
                    transform: scale(0.8);
                    transition: transform 0.2s;
                }
            }

            &:hover {
                .photo-overlay { opacity: 1; }
                .zoom-icon { transform: scale(1); }
            }
        }
    }

    /* --- 3. Lightbox --- */
    .lightbox {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgb(0, 0, 0, 95%);
        backdrop-filter: blur(5px);
        z-index: 200; // 確保在最上層

        .lb-close {
            position: absolute;
            top: 20px;
            right: 20px;
            background: none;
            border: none;
            color: white;
            font-size: 2rem;
            cursor: pointer;
            opacity: 0.7;
            z-index: 210;
            &:hover { opacity: 1; }
        }

        .lb-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            height: 100%;
            padding: 0 20px;
        }

        .lb-nav {
            background: none;
            padding: 20px;
            border: none;
            color: white;
            font-size: 4rem;
            cursor: pointer;
            transition: opacity 0.2s;
            opacity: 0.5;
            &:hover { transform: scale(1.1); opacity: 1; }

            // 手機版隱藏箭頭，改用滑動 (這裡先做簡單隱藏)
            @media (width <= 768px) { display: none; }
        }

        .lb-image-wrapper {
            position: relative;
            display: flex;
            flex: 1;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 90%;

            .lb-img {
                max-width: 100%;
                max-height: 90vh;
                object-fit: contain;
                box-shadow: 0 0 20px rgb(0,0,0,50%);
            }

            .lb-info {
                margin-top: 15px;
                color: #ddd;
                font-family: monospace;
                text-align: center;

                p { margin: 4px 0; }
                .exif-detail {
                    display: inline-block;
                    background: rgb(255,255,255,10%);
                    padding: 4px 10px;
                    border-radius: 4px;
                    color: #999;
                    font-size: 0.85rem;
                }
            }
        }
    }

    // Vue Transition
    .fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
    .fade-enter-from, .fade-leave-to { opacity: 0; }
</style>