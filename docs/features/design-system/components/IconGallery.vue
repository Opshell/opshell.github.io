<script setup lang="ts">
    import { useClipboard } from '@vueuse/core';

    const iconList = ref<string[]>([]);
    const copiedIcon = ref<string | null>(null);

    const copyIconName = (icon: string) => {
        navigator.clipboard.writeText(icon).then(() => {
            copiedIcon.value = icon;
            setTimeout(() => {
                copiedIcon.value = null;
            }, 1500);
        });
    };

    onMounted(() => {
        iconList.value = [];

        const spriteSvg = document.getElementById('__svg__icons__dom__');
        if (spriteSvg !== null) {
            const svgList = Array.from(spriteSvg.children);

            svgList.forEach((svgDom) => {
                // The id is usually 'icon-filename' or just 'filename' depending on config.
                // Config says symbolId: '[name]', so it should be just the filename.
                // However, let's check what the actual IDs are.
                // If the ID is 'icon-foo', we might want to strip 'icon-'.
                // But based on config `symbolId: '[name]'`, it should be exact.
                iconList.value.push(svgDom.id);
            });
        }
    });
</script>

<template>
    <div class="icon-gallery">
        <div
            v-for="icon in iconList"
            :key="icon"
            class="icon-item"
            @click="copyIconName(icon)"
        >
            <div class="icon-preview">
                <ElSvgIcon :name="icon" class="icon-svg" />

                <div class="copy-overlay" :class="{ 'show': copiedIcon === icon }">
                    <span>Copied!</span>
                </div>
            </div>
            <span class="icon-name">{{ icon }}</span>
        </div>
    </div>
</template>

<style scoped lang="scss">
.icon-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1.5rem;
    margin: 1.5rem 0;
}

.icon-item {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
    padding: 1rem;
    border: 1px solid var(--vp-c-bg-soft);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background-color: var(--vp-c-bg-soft);
        color: var(--vp-c-brand);
        transform: translateY(-2px);
    }
}

.icon-preview {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
}

.copy-overlay {
    position: absolute;
    top: -50%;
    left: 50%;
    background: rgb(0, 0, 0, 80%);
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: none;
    transform: translateX(-50%);
    transition: opacity 0.2s;
    opacity: 0;
    z-index: 10;

    span {
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
    }

    &.show {
        opacity: 1;
    }
}

.icon-name {
    color: var(--vp-c-text-2);
    font-size: 0.875rem;
    text-align: center;
    word-break: break-all;
}
</style>
