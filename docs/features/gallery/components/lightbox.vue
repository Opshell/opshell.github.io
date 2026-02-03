<script setup lang="ts">
    import { computed, onMounted, onUnmounted, watch } from 'vue';

    import { vZoomImg } from '@directives/zoomImg';

    // 定義 Props
    const { photos = [], r2Raw = '' } = defineProps<{
        photos: any[];             // 照片列表
        r2Raw: string;             // Raw 圖網域
    }>();

    const lightboxIndex = defineModel<number | null>({ required: true });

    // 計算當前顯示的照片
    const currentPhoto = computed(() => {
        if (lightboxIndex.value === null || !photos) return null;
        return photos[lightboxIndex.value];
    });

    const closeHandler = () => {
        lightboxIndex.value = null;
    };

    const nextHandler = (e?: Event) => {
        e?.stopPropagation();
        if (lightboxIndex.value !== null) {
            // 循環播放：(當前 + 1) % 總數
            const newIndex = (lightboxIndex.value + 1) % photos.length;

            lightboxIndex.value = newIndex;
        }
    };

    const prevHandler = (e?: Event) => {
        e?.stopPropagation();
        if (lightboxIndex.value !== null) {
            // 循環播放：(當前 - 1 + 總數) % 總數 (防止負數)
            const newIndex = (lightboxIndex.value - 1 + photos.length) % photos.length;

            lightboxIndex.value = newIndex;
        }
    };

    // #region [P] 大圖載入
    const isLoaded = ref(false);

    // 當切換照片時，重置載入狀態
    watch(() => lightboxIndex, () => {
        isLoaded.value = false;
    });

    const onRawLoad = () => {
        isLoaded.value = true;
    };

    const getEncodedPath = (path: string) => {
        return path.split('/').map(part => encodeURIComponent(part)).join('/');
    };
    // #endregion

    // --- 鍵盤與滾動控制 ---

    const keydownHandler = (e: KeyboardEvent) => {
        if (lightboxIndex.value === null) return;
        if (e.key === 'Escape') closeHandler();
        if (e.key === 'ArrowRight') nextHandler();
        if (e.key === 'ArrowLeft') prevHandler();
    };

    // 監聽 lightboxIndex.value 變化來鎖定/解鎖滾動
    watch(() => lightboxIndex.value, (newVal) => {
        if (newVal !== null) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });

    // 生命週期
    onMounted(() => {
        window.addEventListener('keydown', keydownHandler);
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', keydownHandler);
        // 確保組件銷毀時恢復滾動
        document.body.style.overflow = '';
    });
</script>

<template>
    <Transition name="fade">
        <div
            v-if="lightboxIndex !== null && currentPhoto"
            class="gallery-lightbox" @click="closeHandler"
        >
            <button class="lb-close" @click="closeHandler">✕</button>

            <div class="lb-content" @click.stop>
                <button class="lb-nav lb-prev" @click="prevHandler">‹</button>

                <div class="lb-image-wrapper">
                    <img
                        v-if="currentPhoto"
                        :src="`${r2Raw.replace('/raw', '/thumbs')}/${getEncodedPath(currentPhoto.thumb)}`"
                        class="lb-img placeholder"
                        :class="{ 'hidden': isLoaded }"
                        alt="placeholder"
                    />

                    <img
                        v-show="isLoaded"
                        v-zoom-img="3"
                        :src="`${r2Raw}/${getEncodedPath(currentPhoto.src)}`"
                        class="lb-img raw"
                        :class="{ 'visible': isLoaded }"
                        alt="lightbox-image"
                        @load="onRawLoad"
                    />

                    <div v-if="!isLoaded" class="loading-spinner" />
                    <div class="lb-info">
                        <p>{{ currentPhoto.exif.camera }} {{ currentPhoto.exif.lens }}</p>
                        <p class="exif-detail">
                            {{ currentPhoto.exif.iso }} |
                            {{ currentPhoto.exif.aperture }} |
                            {{ currentPhoto.exif.shutter }}
                        </p>
                    </div>
                </div>

                <button class="lb-nav lb-next" @click="nextHandler">›</button>
            </div>
        </div>
    </Transition>
</template>

<style lang="scss" scoped>
    .gallery-lightbox {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgb(0 0 0 / 95%);
        backdrop-filter: blur(5px);
        z-index: 200;

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
            &:hover {
                transform: scale(1.1);
                opacity: 1;
            }
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
                box-shadow: 0 0 20px rgb(0 0 0 / 50%);
            }

            .lb-info {
                margin-top: 15px;
                color: #ddd;
                font-family: monospace;
                text-align: center;
                p { margin: 4px 0; }
                .exif-detail {
                    display: inline-block;
                    background: rgb(255 255 255 / 10%);
                    padding: 4px 10px;
                    border-radius: 4px;
                    color: #999;
                    font-size: 0.85rem;
                }
            }
        }
    }

    .fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
    .fade-enter-from, .fade-leave-to { opacity: 0; }

    .lb-img {
        max-width: 100%;
        max-height: 90vh;
        object-fit: contain;
        transition: opacity 0.5s ease; // 淡入效果

        // 讓兩張圖絕對定位重疊
        &.placeholder {
            position: absolute; // 關鍵：疊在同一位置
            filter: blur(10px); // 模糊處理，讓馬賽克不那麼明顯
            opacity: 1;
            z-index: 1;
        }

        &.raw {
            position: relative; // 撐開空間
            z-index: 2;

            // 如果想做淡入效果，可以預設 opacity: 0
            // opacity: 0;
            // &.visible { opacity: 1; }
        }

        // 當大圖載入後，隱藏模糊圖
        &.placeholder.hidden {
            opacity: 0;
        }
    }
</style>