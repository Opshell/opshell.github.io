<script setup lang="ts">
    import type { AlbumMeta } from '@data/albums.data';
    import { data as albumMeta } from '@data/albums.data';
    import galleryData from '@photos/data.json';
    import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
    import Card from './Card.vue';
    import Lightbox from './Lightbox.vue';
    import MasonryLayout from './MasonryLayout.vue';
    import PolaroidCard from './PolaroidCard.vue';

    // 相簿：列表（一本一張封面）→ 內頁（拍立得牆）→ 燈箱。
    // 照片與 EXIF 來自 photos/data.json（腳本產生）；標題、副標、介紹、圖說來自 photos/albums/*.md（人寫的），這裡合併。
    const R2_DOMAIN = 'https://image.opshell.me';
    const R2_THUMB = `${R2_DOMAIN}/thumbs`;
    const R2_RAW = `${R2_DOMAIN}/raw`;

    type RawAlbum = (typeof galleryData)[number];
    interface iAlbum extends RawAlbum {
        subtitle?: string;
        descriptionHtml: string;
        captions: Record<string, string>;
    }

    const albums = computed<iAlbum[]>(() => galleryData.map((album) => {
        const meta: AlbumMeta | undefined = albumMeta[album.id];
        const coverPhoto = meta?.cover ? album.photos.find(p => p.filename === meta.cover) : undefined;
        return {
            ...album,
            title: meta?.title ?? album.title,
            subtitle: meta?.subtitle,
            cover: coverPhoto?.thumb ?? album.cover,
            width: coverPhoto?.width ?? album.width,
            height: coverPhoto?.height ?? album.height,
            descriptionHtml: meta?.descriptionHtml ?? '',
            captions: meta?.captions ?? {}
        };
    }));
    const totalPhotos = computed(() => albums.value.reduce((n, a) => n + a.count, 0));

    // #region [P] 網址：#相簿名 = 開那本
    const currentAlbumId = ref<string | null>(null);
    const lightboxIndex = ref<number | null>(null);

    const hashChangeHandler = () => {
        const hash = decodeURIComponent(window.location.hash.replace('#', ''));
        currentAlbumId.value = albums.value.some(a => a.id === hash) ? hash : null;
        lightboxIndex.value = null; // 換相簿就關燈箱
    };
    onMounted(() => {
        hashChangeHandler();
        window.addEventListener('hashchange', hashChangeHandler);
    });
    onUnmounted(() => window.removeEventListener('hashchange', hashChangeHandler));

    const currentAlbum = computed(() => albums.value.find(a => a.id === currentAlbumId.value));

    // 從封面的位置「炸開」成照片牆：記下點擊座標給動畫用
    const clickOrigin = reactive({ x: 0, y: 0 });
    const openAlbumHandler = (id: string, event: MouseEvent) => {
        clickOrigin.x = event.clientX;
        clickOrigin.y = event.clientY;
        window.location.hash = id;
    };
    const backToListHandler = () => { window.location.hash = ''; };
    // #endregion
</script>

<template>
    <div class="gallery-page">
        <header v-if="!currentAlbum" class="gallery-page__hero">
            <h1 class="title">Photography</h1>
            <p class="subtitle">{{ albums.length }} 本相簿，{{ totalPhotos }} 張照片。點一本進去看。</p>
        </header>

        <Transition name="gallery-switch">
            <MasonryLayout v-if="!currentAlbum">
                <Card
                    v-for="album in albums"
                    :key="album.id"
                    class="masonry-brick"
                    :album
                    @click="openAlbumHandler(album.id, $event)"
                />
            </MasonryLayout>

            <div
                v-else
                class="album-detail"
                :style="{ '--origin-x': `${clickOrigin.x}px`, '--origin-y': `${clickOrigin.y}px` }"
            >
                <div class="album-detail__header">
                    <button type="button" class="album-detail__back" @click="backToListHandler">
                        <span aria-hidden="true">←</span> 全部相簿
                    </button>
                    <div class="album-detail__info">
                        <h2 class="title">{{ currentAlbum.title }}</h2>
                        <p class="meta">
                            <span v-if="currentAlbum.subtitle" class="subtitle">{{ currentAlbum.subtitle }}</span>
                            <span class="count">{{ currentAlbum.count }} photos</span>
                        </p>
                    </div>
                </div>

                <!-- 相簿介紹：photos/albums/<相簿>.md 的內文 -->
                <div v-if="currentAlbum.descriptionHtml" class="album-detail__description vp-doc" v-html="currentAlbum.descriptionHtml" />

                <MasonryLayout>
                    <div
                        v-for="(photo, index) in currentAlbum.photos"
                        :key="photo.filename"
                        class="masonry-brick photo-entry"
                        :style="{ '--i': index }"
                        @click="lightboxIndex = index"
                    >
                        <PolaroidCard
                            :photo
                            :caption="currentAlbum.captions[photo.filename]"
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
            :captions="currentAlbum.captions"
            :r2-raw="R2_RAW"
        />
    </div>
</template>

<style lang="scss">
    .gallery-page {
        max-width: var(--vp-layout-max-width);
        padding: 2rem 1.5rem 4rem;
        margin: 0 auto;

        &__hero {
            .title {
                display: inline-block;
                background: var(--vp-home-hero-name-background);
                -webkit-background-clip: text;
                background-clip: text;
                margin: 0;
                font-size: 2.5rem;
                font-weight: 800;
                line-height: 1.4;
                -webkit-text-fill-color: transparent;
            }
            .subtitle {
                margin: .25rem 0 0;
                color: var(--vp-c-text-2);
            }
        }

        // #region [P] 內頁
        .album-detail {
            &__header {
                position: sticky;
                top: var(--vp-nav-height);
                @include setFlex(space-between, flex-end, 1rem);
                background: var(--vp-nav-bg-color);
                padding: 1rem 0 .75rem;
                border-bottom: 1px solid var(--vp-c-divider);
                z-index: 10;
            }
            &__back {
                @include setFlex(flex-start, center, 6px);
                background: var(--vp-c-bg-soft);
                padding: 8px 14px;
                border: 1px solid var(--vp-c-divider);
                border-radius: 10px;
                color: var(--vp-c-text-2);
                font-size: var(--font-size-s);
                cursor: pointer;
                transition: .2s var(--cubic-FiSo);

                &:hover {
                    border-color: var(--vp-c-brand);
                    color: var(--vp-c-brand);
                }
            }
            &__info {
                text-align: right;

                .title {
                    padding: 0;
                    border: 0;
                    margin: 0;
                    font-size: var(--font-size-xl);
                    font-weight: 800;
                    line-height: 1.3;
                }
                .meta {
                    @include setFlex(flex-end, baseline, 10px);
                    margin: 0;
                    color: var(--vp-c-text-2);
                    font-size: var(--font-size-s);
                }
                .count {
                    color: var(--vp-c-text-3);
                    font-family: var(--vp-font-family-mono);
                    font-size: var(--font-size-xs);
                }
            }
            &__description {
                max-width: 720px;
                padding: 1.5rem 0 0;
                color: var(--vp-c-text-2);
                line-height: 1.8;

                p { margin: 0 0 .75em; }
            }
        }

        // #endregion

        // #region [P] 列表 ↔ 內頁的切換與照片炸開的進場（保留原本的感覺）
        @keyframes explode-in {
            0% {
                transform: translate(calc(var(--origin-x) - 50vw), calc(var(--origin-y) - 50vh + 100px)) scale(.2);
                opacity: 0;
            }
            15% { opacity: 1; }
            60% {
                transform: translate(0, 0) scale(1.05);
                opacity: 1;
            }
            100% {
                transform: translate(0, 0) scale(1);
                opacity: 1;
            }
        }

        .gallery-switch-enter-active {
            position: relative;
            transition: opacity .25s var(--cubic-FiSo);
            z-index: 1;
        }
        .gallery-switch-leave-active {
            position: absolute;
            top: 2rem;
            right: 0;
            left: 0;
            width: 100%;
            max-width: var(--vp-layout-max-width);
            margin: 0 auto;
            transition: opacity .25s var(--cubic-FiSo), transform .25s var(--cubic-FiSo);
            z-index: 0;
        }
        .gallery-switch-enter-from { opacity: 0; }
        .gallery-switch-leave-to {
            transform: scale(1.1);
            opacity: 0;
        }

        .photo-entry {
            animation: explode-in .4s cubic-bezier(.25, .46, .45, .94) forwards;
            animation-delay: calc(.05s + var(--i) * .03s);
            opacity: 0;
            will-change: transform, opacity;
        }

        // #endregion
        @include setRWD(640px) {
            padding: 1.5rem 1rem 3rem;

            .album-detail__header {
                flex-direction: column;
                align-items: flex-start;
            }
            .album-detail__info {
                text-align: left;

                .meta { justify-content: flex-start; }
            }
        }
    }
</style>
