<script setup lang="ts">
    const { album } = defineProps<{
        album: {
            id: string;
            title: string;
            cover: string;
            width: number;
            height: number;
            count: number;
            photos: { date: string }[];
        };
    }>();

    const R2_DOMAIN = 'https://image.opshell.me';
    const R2_THUMB = `${R2_DOMAIN}/thumbs`;

    const encodePath = (path: string) => {
        return path.split('/').map(part => encodeURIComponent(part)).join('/');
    };
</script>

<template>
    <div class="album-card">
        <div class="album-card__container">
            <img
                :src="`${R2_THUMB}/${encodePath(album.cover)}`"
                loading="lazy"
                alt="cover"
                :style="{ aspectRatio: `${album.width / album.height || 4/3}` }"
            />

            <div class="album-card__badge title">
                {{ album.title }}
            </div>

            <div class="album-card__badge count">
                {{ album.count }} Photos
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    .album-card {
        position: relative;
        cursor: pointer;

        &__container {
            // 確保內容是 block 才能撐開高度進行計算
            display: block;
            background: var(--vp-c-bg);
            width: 100%;
            border: 1px solid transparent;
            border-radius: .5rem; // 圓角移到這裡或外層皆可
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 10%);
            transition: transform 0.25s var(--cubic-FiSo), box-shadow 0.25s var(--cubic-FiSo);
            overflow: hidden;

            img {
                display: block; // 消除圖片底部的空白間隙
                background-color: var(--vp-c-bg-soft);
                width: 100%;
                height: auto; // 讓高度自動隨寬度變化
                transition: transform 0.5s ease;
                object-fit: cover;
            }
        }

        &__badge {
            position: absolute;
            background: rgb(0, 0, 0, 60%);
            backdrop-filter: blur(4px);
            padding: 4px 10px;
            border-radius: 20px;
            color: white;
            font-size: 0.8rem;
            opacity: 0;
            z-index: 2;

            &.title {
                bottom: 10px;
                left: 10px;

                // 防止標題太長跑版
                max-width: 70%;
                font-weight: bold;
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }
            &.count {
                right: 10px;
                bottom: 10px;
            }
        }

        &:hover {
            .album-card {
                &__container {
                    border-color: var(--vp-c-brand);
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 10%);
                    transform: translateY(-5px);
                }

                &__badge {
                    opacity: 1;
                }
            }

            img {
                transform: scale(1.05);
            }
        }
    }
</style>