<script setup lang="ts">
    import { OrbitControls, Stars } from '@tresjs/cientos';
    import GalaxyModel from './galaxyModel.vue';
    import { useSiteData } from '@shared/hooks/useSiteData';
    import { TresCanvas } from '@tresjs/core'
    import { useRouter } from 'vitepress';
    import { EffectComposerPmndrs , BloomPmndrs } from '@tresjs/post-processing';

    // 在這裡獲取數據 (父層 Context 是正常的)
    const siteData = useSiteData();
    const router = useRouter(); // ✅ 初始化 Router

    const navigateHandler = (url: string) => {
        console.log('Navigating to:', url);
        router.go(url);
    };
</script>

<template>
    <div class="galaxy-canvas-wrapper">
        <TresCanvas window-size preset="realistic" alpha>
            <TresPerspectiveCamera :position="[100, 50, 100]" :look-at="[0, 0, 0]" :fov="45" />

            <OrbitControls
                :enable-damping="true"
                :damping-factor="0.05"
                :min-distance="10"
                :max-distance="500"
            />

            <TresAmbientLight :intensity="1" />
            <TresPointLight :position="[50, 50, 50]" :intensity="2" color="#ffffff" />

            <Stars :radius="150" :depth="50" :count="3000" :size="0.5" />

            <GalaxyModel
                v-if="siteData"
                :siteData="siteData"
                @node-click="navigateHandler"
            />

            <Suspense>
                <EffectComposerPmndrs >
                <BloomPmndrs
                    :luminance-threshold="0.1"
                    :luminance-smoothing="0.3"
                    :intensity="1.5"
                    :radius="0.6"
                    mipmap-blur
                />
                </EffectComposerPmndrs >
            </Suspense>

        </TresCanvas>
    </div>
</template>

<style lang="scss">
    /* galaxyBack.vue */
.galaxy-canvas-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1; /* 確保它在背景 */

    /* 🔥 修正：這裡改成 auto，或者乾脆不要寫 pointer-events */

    /* pointer-events: none;  <-- 這行刪掉或註解掉 */
}

/* 這一行可以留著，雙重保險 */
:deep(.tres-canvas) {
    pointer-events: auto;
}
</style>