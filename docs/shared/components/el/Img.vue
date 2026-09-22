<script setup lang="ts">
    import { ref, watch } from 'vue';

    // 圖片：載入中有轉圈、失敗換成 no_image、可以指定比例。就這樣，不接任何後端
    const { src = '', alt = '', ratio = '', fit = 'cover' } = defineProps<{
        src?: string;
        alt?: string;
        /** 例如 '4 / 3'、'1 / 1'；不給就跟著圖片 */
        ratio?: string;
        fit?: 'cover' | 'contain';
    }>();

    const FALLBACK = '/images/no_image.svg';
    const loading = ref(true);
    const failed = ref(false);

    watch(() => src, () => {
        loading.value = true;
        failed.value = false;
    });
</script>

<template>
    <div class="el-img" :class="{ 'is-loading': loading, 'is-failed': failed }" :style="ratio ? { aspectRatio: ratio } : undefined">
        <img
            :src="failed || !src ? FALLBACK : src"
            :alt
            loading="lazy"
            :style="{ objectFit: fit }"
            @load="loading = false"
            @error="failed = true; loading = false"
        />
        <Transition name="fade">
            <span v-if="loading" class="el-img__spinner" aria-hidden="true" />
        </Transition>
    </div>
</template>

<style lang="scss">
    .el-img {
        position: relative;
        display: block;
        background: var(--vp-c-bg-soft);
        border-radius: 10px;
        overflow: hidden;

        img {
            display: block;
            @include setSize(100%, 100%);
            transition: opacity .3s var(--cubic-FiSo);
        }
        &.is-loading img { opacity: 0; }
        &.is-failed img {
            padding: 20%;
            opacity: .5;
        }

        &__spinner {
            position: absolute;
            top: 50%;
            left: 50%;
            @include setSize(24px, 24px);
            border: 2px solid var(--vp-c-divider);
            border-top-color: var(--vp-c-brand);
            border-radius: 50%;
            margin: -12px 0 0 -12px;
            animation: el-img-spin .8s linear infinite;
        }
    }
    @keyframes el-img-spin {
        to { transform: rotate(360deg); }
    }
</style>
