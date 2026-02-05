<script setup lang="ts">
    import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
    import galleryData from '@photos/data.json';

    import Card from './card.vue';
    import MasonryLayout from './masonryLayout.vue';
    import Lightbox from './lightbox.vue';
    import PolaroidCard from './polaroidCard.vue';

    // --- 設定區 ---
    const R2_DOMAIN = 'https://image.opshell.me';
    const R2_THUMB = `${R2_DOMAIN}/thumbs`;
    const R2_RAW = `${R2_DOMAIN}/raw`;

    // --- 路由與狀態 ---
    const currentAlbumId = ref<string | null>(null);
    const lightboxIndex = ref<number | null>(null); // 控制 Lightbox 開關與索引


    onMounted(() => {
        hashChangeＨandler();
        window.addEventListener('hashchange', hashChangeＨandler);
    });

    onUnmounted(() => {
        window.removeEventListener('hashchange', hashChangeＨandler);
    });

    // 路由邏輯
    const hashChangeＨandler = () => {
        const hash = decodeURIComponent(window.location.hash.replace('#', ''));

        const exists = galleryData.find(a => a.id === hash);

        currentAlbumId.value = exists ? hash : null;

        lightboxIndex.value = null; // 每次切換相簿時關閉 Lightbox

        if (!exists) { return; }

    };

    const currentAlbum = computed(() => {
        return galleryData.find(a => a.id === currentAlbumId.value);
    });

    const clickOrigin = reactive({ x: 0, y: 0 });
    const openAlbumHandler = (id: string, event: MouseEvent) => {
        // 紀錄點擊座標 (相對於視窗)
        clickOrigin.x = event.clientX;
        clickOrigin.y = event.clientY;

        window.location.hash = id;
    };

    const backToListHandler = () => {
        window.location.hash = ''; // 清空 hash
    };

    const openLightbox = (index: number) => {
        lightboxIndex.value = index;
    };

    const getEncodedPath = (path: string) => {
        return path.split('/').map(part => encodeURIComponent(part)).join('/');
    };
</script>

<template>
    <div class="gallery-page">
        <Transition name="gallery-switch">
            <MasonryLayout v-if="!currentAlbum">
                <Card
                    v-for="album in galleryData"
                    :key="album.id"
                    class="masonry-brick"
                    :album="album"
                    @click="openAlbumHandler(album.id, $event)"
                />
            </MasonryLayout>

            <div v-else
                class="album-detail"
                :style="{
                    '--origin-x': `${clickOrigin.x}px`,
                    '--origin-y': `${clickOrigin.y}px`
                }"
            >
                <div class="album-detail__header">
                    <button class="album-detail__header-btn" @click="backToListHandler"><span class="icon">←</span> Back</button>
                    <div class="album-detail__header-info">
                        <h2 class="title">{{ currentAlbum.title }}</h2>
                        <span class="subtitle">{{ currentAlbum.count }} Photos</span>
                    </div>
                </div>

                <MasonryLayout>
                    <div
                        v-for="(photo, index) in currentAlbum.photos"
                        :key="photo.filename"
                        class="masonry-brick photo-entry"
                        :style="{ '--i': index }"
                        @click="openLightbox(index)"
                    >
                        <PolaroidCard
                            :photo="photo"
                            :r2-thumb="R2_THUMB"
                        />
                    </div>
                </MasonryLayout>
            </div>
        </Transition>

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

    // [-] 內頁樣式
    .album-detail {
        &__header {
            position: sticky;
            top: 65px;
            @include setFlex(space-between);
            background: var(--vp-nav-bg-color);
            padding-bottom: .625rem;
            border-bottom: 1px solid var(--vp-c-divider);
            z-index: 10;
            &-btn {
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

            &-info {
                text-align: right;
                .title {
                    margin: 0;
                    font-size: 1.5rem;
                }
                .subtitle {
                    color: var(--vp-c-text-2);
                    font-size: 0.9rem;
                }
            }
        }
    }

    // 定義動畫關鍵影格
    @keyframes explode-in {
        0% {
            // 这是一个視覺魔術：
            // 透過計算 viewport 中心點與點擊原點的差距，模擬從原點飛出的效果。
            // scale(0.2) 讓它看起來是從遠方/小點開始
            transform:
                translate(
                    calc(var(--origin-x) - 50vw),
                    calc(var(--origin-y) - 50vh + 100px) // +100px 稍微增加一點垂直拋物線感
                )
                scale(0.2);
            opacity: 0;
        }
        15% {
            opacity: 1;
        }
        60% {
            // 動畫中段稍微放大一點，增加彈性與衝擊感
            transform: translate(0, 0) scale(1.05);
            opacity: 1;
        }
        100% {
            // 回到正常的 Grid 位置
            transform: translate(0, 0) scale(1);
            opacity: 1;
        }
    }

    // 設定 Vue Transition 的容器行為
    .gallery-switch-enter-active {
        position: relative;
        transition: opacity 0.25s var(--cubic-FiSo);
        z-index: 1; // 新頁面在上
    }

    .gallery-switch-leave-active {
        position: absolute;
        top: 2rem; // 對應 .gallery-page 的 padding
        right: 0;
        left: 0;
        width: 100%;
        max-width: 1440px; // 對應 .gallery-page 的寬度
        margin: 0 auto;
        transition: opacity .25s var(--cubic-FiSo), transform .25s var(--cubic-FiSo);
        z-index: 0; // 舊頁面在下
    }

    .gallery-switch-enter-from {
        opacity: 0;
    }

    .gallery-switch-leave-to {
        transform: scale(1.1); // 舊列表稍微放大淡出，製造穿梭感
        // transform: scale(0.95) translateY(20px);
        opacity: 0;
    }

    .photo-entry {
        // 動畫：0.5s 快速炸開
        // animation: explode-in 0.5s cubic-bezier(0.15, 1, 0.3, 1) forwards;
        animation: explode-in 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)  forwards;
        animation-delay: calc(.05s + (var(--i) * 0.03s));
        opacity: 0;
        will-change: transform, opacity;
    }
</style>