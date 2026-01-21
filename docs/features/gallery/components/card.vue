<script setup lang="ts">
    const { album } = defineProps<{
        album: {
            id: string;
            title: string;
            cover: string;
            aspectRatio: number;
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
    <div class="album-card waterfalls-flow-card">
        <div class="album-card__container">
            <img
                :src="`${R2_THUMB}/${encodePath(album.cover)}`"
                loading="lazy"
                alt="cover"
                :style="{ aspectRatio: `${album.aspectRatio || 4/3}` }"
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
        background: var(--vp-c-bg);
        border: 1px solid transparent;
        border-radius: 1rem;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 10%);
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;

        &__container {
            // [修正 5] 確保內容是 block 且能撐開
            display: block;
            width: 100%;
            border-radius: 1rem; // 圓角移到這裡或外層皆可
            // 防止 margin collapse 導致計算誤差
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
            border-color: var(--vp-c-brand);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 10%);
            transform: translateY(-5px);

            .album-card {
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