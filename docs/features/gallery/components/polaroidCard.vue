<script setup lang="ts">
    // 定義 Props
    const props = defineProps<{
        photo: {
            filename: string;
            thumb: string; // 縮圖路徑
            width: number;
            height: number;
            exif?: {
                camera?: string;
                lens?: string;
                iso?: string;
                aperture?: string;
                shutter?: string;
                focalLength?: string; // 修正拼寫
            };
        };
        r2Thumb: string; // 縮圖網域
    }>();

    // 路徑編碼工具
    const encodePath = (path: string) => {
        return path.split('/').map(part => encodeURIComponent(part)).join('/');
    };

    // 格式化 EXIF 字串
    const exifString = computed(() => {
        const { iso, aperture, shutter } = props.photo.exif || {};
        if (!iso && !aperture && !shutter) return '';
        // 用中點 (·) 分隔，看起來比較優雅
        return [iso, aperture, shutter].filter(Boolean).join(' · ');
    });

    const lensString = computed(() => {
        const { lens, focalLength,  } = props.photo.exif || {};
        // 如果鏡頭名字太長，可以考慮只顯示焦段
        return  lens || focalLength || '';
    });
</script>

<template>
    <div class="polaroid-card">
        <div class="polaroid-card__container" >
            <img
                :src="`${r2Thumb}/${encodePath(photo.thumb)}`"
                loading="lazy"
                :alt="photo.filename"
                class="polaroid-card__photo"
                :style="{ aspectRatio: `${photo.width} / ${photo.height}` }"
            />

            <div class="polaroid-card__exif">
                <div class="polaroid-card__exif-info">
                    {{ exifString }}
                </div>
                <!-- <div class="polaroid-card__exif-camera">
                    <span class="camera-icon">📷</span>
                    {{ photo.exif?.lens }}
                </div> -->
                <div class="polaroid-card__exif-camera">
                    <span class="camera-icon">📷</span> {{ photo.exif?.camera || 'Unknown' }}
                    <span v-if="lensString" class="divider">|</span>
                    {{ photo.exif?.focalLength }}
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    .polaroid-card {
        position: relative;
        background: #fff;
        padding: 12px 12px 0;
        border-radius: 2px;
        box-shadow:
            0 4px 6px -1px rgb(0 0 0 / 10%),
            0 2px 4px -1px rgb(0 0 0 / 6%);
        cursor: pointer;
        transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
                    box-shadow 0.3s ease;
        overflow: hidden;
        &:hover {
            box-shadow:
                0 10px 15px -3px rgb(0 0 0 / 15%),
                0 4px 6px -2px rgb(0 0 0 / 10%);
            transform: translateY(-5px) rotate(1deg); // 懸停時微微浮起並傾斜
            z-index: 10;
        }

        &__container {
            position: relative;
            display: block;
            background: #fff; // 載入前的底色
            width: 100%;
            overflow: hidden;
        }

        &__photo {
            display: block;
            width: 100%;
            height: auto;
            border: 1px solid rgb(0,0,0,5%); // 照片邊緣加上極細的框線增加真實感
            transition: .5s ease;
            object-fit: cover;
        }

        &__exif {
            flex-grow: 1; // 確保填滿
            @include setFlex(center, center, 0, column);
            padding: 12px 4px 16px; // 上 左右 下
            color: #4a4a4a;
            text-align: center;

            &-info {
                color: #2c3e50;

                // 像是 ISO 400 · f/2.8 · 1/500
                font-family: 'Courier New', Courier, monospace; // 等寬字體更有「數據感」
                font-size: 0.85rem;
                font-weight: 600;
                letter-spacing: -0.5px;
            }

            &-camera {
                max-width: 100%;
                color: #888;
                font-family: sans-serif; // 與數據區分開
                // 相機型號
                font-size: 0.75rem;
                white-space: nowrap;
                text-overflow: ellipsis; // 防止鏡頭名稱太長爆版
                overflow: hidden;

                .divider {
                    margin: 0 4px;
                    opacity: 0.5;
                }
                .camera-icon {
                    margin-right: 2px;
                    font-size: 0.8rem;
                }
            }
        }
    }
</style>