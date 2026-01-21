<script setup lang="ts">


    const {album} = defineProps<{
        album: {
            id: string;
            title: string;
            cover: string;
            count: number;
            photos: { date: string }[];
        };
    }>();

    // 根據你的 R2 設定調整
    const R2_DOMAIN = 'https://image.opshell.me';
    const R2_THUMB = `${R2_DOMAIN}/thumbs`;
    const R2_RAW = `${R2_DOMAIN}/raw`;
</script>

<template>
    <div
        class="album-card"
    >
        <div class="album-card__container">
            <img
                :src="`${R2_THUMB}/${album.cover}`"
                loading="lazy"
                alt="cover"
            />

            <!-- <div class="album-card__badge date">
                <span class="date">{{ new Date(album.photos[0]?.date).toLocaleDateString() }}</span>
            </div> -->

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
        background: var(--vp-c-bg);
        border: 1px solid transparent;
        border-radius: 1rem;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%);; // 使用類似你的卡片陰影
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        overflow: hidden;

        &:hover {
            border-color: var(--vp-c-brand);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 10%);
            transform: translateY(-5px);

            .view-btn {
                color: var(--vp-c-brand);
                transform: translateX(5px);
            }

            img {
                transform: scale(1.05);
            }
        }

        &__container {
            position: relative;

            // aspect-ratio: 16/10;
            overflow: hidden;

            img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                transition: transform 0.5s ease;
            }
        }

        &__badge {
            position: absolute;
            right: 10px;
            bottom: 10px;
            background: rgb(0, 0, 0, 60%);
            backdrop-filter: blur(4px);
            padding: 4px 10px;
            border-radius: 20px;
            color: white;
            font-size: 0.8rem;

            &.title {
                right: auto;
                left: 10px;
                font-weight: bold;
            }
            &.count {
                right: 10px;
                bottom: 10px;
            }
        }
    }
</style>