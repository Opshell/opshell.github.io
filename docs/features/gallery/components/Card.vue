<script setup lang="ts">
    import { computed } from 'vue';

    // 相簿列表上的一本相簿：封面照片 + 底下一列資訊（標題、張數、最近拍攝的年月、副標）
    const { album } = defineProps<{
        album: {
            id: string;
            title: string;
            subtitle?: string;
            cover: string;
            width: number;
            height: number;
            count: number;
            photos: { date?: string }[];
        };
    }>();

    const R2_THUMB = 'https://image.opshell.me/thumbs';
    const encodePath = (path: string) => path.split('/').map(part => encodeURIComponent(part)).join('/');

    /** 相簿裡最新一張的年月 */
    const latest = computed(() => {
        const times = album.photos.map(p => new Date(p.date ?? '').getTime()).filter(t => !Number.isNaN(t));
        if (!times.length) return '';
        const d = new Date(Math.max(...times));
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
</script>

<template>
    <div class="album-card">
        <div class="album-card__container">
            <div class="album-card__cover">
                <img
                    :src="`${R2_THUMB}/${encodePath(album.cover)}`"
                    loading="lazy"
                    :alt="`${album.title} 的封面`"
                    :style="{ aspectRatio: `${album.width / album.height || 4 / 3}` }"
                />
            </div>

            <div class="album-card__info">
                <div class="album-card__row">
                    <h3 class="album-card__title">{{ album.title }}</h3>
                    <span class="album-card__meta">{{ album.count }} photos<template v-if="latest"> · {{ latest }}</template></span>
                </div>
                <p v-if="album.subtitle" class="album-card__subtitle">{{ album.subtitle }}</p>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    .album-card {
        position: relative;
        cursor: pointer;

        &__container {
            display: block;
            background: var(--vp-c-bg-soft);
            width: 100%;
            border: 1px solid var(--vp-c-divider);
            border-radius: 1rem;
            transition: transform .25s var(--cubic-FiSo), box-shadow .25s var(--cubic-FiSo), border-color .25s var(--cubic-FiSo);
            overflow: hidden;
        }

        &__cover {
            overflow: hidden;

            img {
                display: block;
                background: var(--vp-c-bg-soft);
                width: 100%;
                height: auto;
                transition: transform .5s var(--cubic-FiSo);
                object-fit: cover;
            }
        }

        &__info {
            @include setFlex(flex-start, stretch, 4px, column);
            padding: 12px 14px 14px;
        }
        &__row {
            @include setFlex(space-between, baseline, 8px);
        }
        &__title {
            min-width: 0;
            padding: 0;
            border: 0;
            margin: 0;
            color: var(--vp-c-text-1);
            font-size: var(--font-size-m);
            font-weight: 700;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
        }
        &__meta {
            flex-shrink: 0;
            color: var(--vp-c-text-3);
            font-family: var(--vp-font-family-mono);
            font-size: var(--font-size-xs);
        }
        &__subtitle {
            margin: 0;
            color: var(--vp-c-text-2);
            font-size: var(--font-size-s);
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
        }

        &:hover {
            .album-card__container {
                border-color: var(--vp-c-brand);
                box-shadow: var(--card-shadow);
                transform: translateY(-5px);
            }
            img { transform: scale(1.05); }
            .album-card__title { color: var(--vp-c-brand); }
        }
    }
</style>
