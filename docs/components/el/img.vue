<script setup lang="ts">
    import { file } from '@/hooks/utilityFunctions';
    import { getImage } from '@/hooks/useApi';

    interface iProps {
        src: string;
        origin?: 'public' | 'src' | 'token' // public: 靜態資源, src: 動態資源(會編譯), token: 動態資源(請求要加token)
        renderMethod?: 'blob' | 'base64' ;
    }
    const props = withDefaults(defineProps<iProps>(), {
        src: '',
        origin: 'public',
        renderMethod: 'blob'
    });

    const imgDom = ref<HTMLImageElement | null>(null);
    const imgSrc = ref<string>('');
    const isLoading = ref<boolean>(true);

    watch(props,
        async (newVal) => {
            isLoading.value = true;
            if (newVal.src !== '') {
                if(newVal.origin === 'public') {
                    imgSrc.value = newVal.src;
                    isLoading.value = false;
                } else if (newVal.origin === 'src') {
                    if (file.getAssetsImageUrl(newVal.src) !== file.getAssetsImageUrl('')) {
                        imgSrc.value = file.getAssetsImageUrl(newVal.src);
                        isLoading.value = false;
                    }
                } else if (newVal.origin === 'token') {
                    await getImage(newVal.src).then((response) => {
                        if (response?.status) {
                            if (props.renderMethod === 'base64') {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    imgSrc.value = e.target?.result as string;
                                };
                                reader.readAsDataURL(response.data);
                            } else if (props.renderMethod === 'blob') {
                                const blobUrl = URL.createObjectURL(response.data);
                                imgSrc.value = blobUrl;
                            }
                            isLoading.value = false;
                        }
                    }).catch((error) => {
                        console.error(error);
                        imgSrc.value = '/assets/images/No_Image.jpg';
                        isLoading.value = false;
                    });
                }
            } else {
                imgSrc.value = '/assets/images/No_Image.jpg';
                isLoading.value = false;
            }
        }, {
            immediate: true,
            deep: true
        }
    );
</script>

<template>
    <div class="el-img">
        <img ref="imgDom" :src="imgSrc"/>
        <transition name="fade">
            <div v-if="isLoading" class="loadingOverlay">
                <div class="spinner"></div>
            </div>
        </transition>
    </div>
</template>

<style lang="scss">
    .el-img {
        position: relative;
        overflow: hidden;
        .loadingOverlay {
            @include setFlex();
            position: absolute;
            inset: 0;
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            .spinner {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                animation: spin 1s linear infinite;
            }
        }
    }
</style>
