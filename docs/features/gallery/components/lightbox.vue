<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';

// 定義 Props
const props = defineProps<{
    modelValue: number | null; // 當前索引 (v-model綁定)
    photos: any[];             // 照片列表
    r2Raw: string;             // Raw 圖網域
}>();

// 定義 Emits
const emit = defineEmits<{
    (e: 'update:modelValue', value: number | null): void;
}>();

// 計算當前顯示的照片
const currentPhoto = computed(() => {
    if (props.modelValue === null || !props.photos) return null;
    return props.photos[props.modelValue];
});

// --- 核心邏輯 ---

const close = () => {
    emit('update:modelValue', null);
};

const next = (e?: Event) => {
    e?.stopPropagation();
    if (props.modelValue !== null) {
        // 循環播放：(當前 + 1) % 總數
        const newIndex = (props.modelValue + 1) % props.photos.length;
        emit('update:modelValue', newIndex);
    }
};

const prev = (e?: Event) => {
    e?.stopPropagation();
    if (props.modelValue !== null) {
        // 循環播放：(當前 - 1 + 總數) % 總數 (防止負數)
        const newIndex = (props.modelValue - 1 + props.photos.length) % props.photos.length;
        emit('update:modelValue', newIndex);
    }
};

// --- 鍵盤與滾動控制 ---

const handleKeydown = (e: KeyboardEvent) => {
    if (props.modelValue === null) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
};

// 監聽 modelValue 變化來鎖定/解鎖滾動
watch(() => props.modelValue, (newVal) => {
    if (newVal !== null) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
});

// 生命週期
onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
    // 確保組件銷毀時恢復滾動
    document.body.style.overflow = '';
});
</script>

<template>
    <Transition name="fade">
        <div v-if="modelValue !== null && currentPhoto" class="lightbox" @click="close">
            <button class="lb-close" @click="close">✕</button>

            <div class="lb-content" @click.stop>
                <button class="lb-nav lb-prev" @click="prev">‹</button>

                <div class="lb-image-wrapper">
                    <img
                        :src="`${r2Raw}/${currentPhoto.src}`"
                        class="lb-img"
                        alt="lightbox-image"
                    />

                    <div class="lb-info">
                        <p>{{ currentPhoto.exif.camera }} {{ currentPhoto.exif.lens }}</p>
                        <p class="exif-detail">
                            {{ currentPhoto.exif.iso }} |
                            {{ currentPhoto.exif.aperture }} |
                            {{ currentPhoto.exif.shutter }}
                        </p>
                    </div>
                </div>

                <button class="lb-nav lb-next" @click="next">›</button>
            </div>
        </div>
    </Transition>
</template>

<style lang="scss" scoped>
.lightbox {
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
        &:hover { transform: scale(1.1); opacity: 1; }
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
</style>